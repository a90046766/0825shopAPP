import type { InventoryRepo, InventoryItem, PurchaseRequest } from '../../core/repository'
import { supabase } from '../../utils/supabase'

function toDbRow(item: Partial<InventoryItem>): any {
  const r: any = { ...item }
  const map: Record<string, string> = {
    productId: 'product_id',
    unitPrice: 'unit_price',
    imageUrls: 'image_urls',
    safeStock: 'safe_stock',
  }
  for (const [camel, snake] of Object.entries(map)) {
    if (camel in r) {
      r[snake] = (r as any)[camel]
      delete r[camel] // 移除原始欄位
    }
  }
  // 清除不存在於資料庫的駝峰欄位，避免 PGRST204（schema cache 找不到欄位）
  delete (r as any).updatedAt
  delete (r as any).createdAt
  return r
}

function fromDbRow(row: any): InventoryItem {
  const r = row || {}
  return {
    id: r.id,
    name: r.name || '',
    productId: r.product_id ?? r.productId,
    quantity: r.quantity ?? 0,
    description: r.description || '',
    unitPrice: r.unit_price ?? r.unitPrice ?? 0,
    imageUrls: r.image_urls ?? r.imageUrls ?? [],
    safeStock: r.safe_stock ?? r.safeStock,
    updatedAt: r.updated_at ?? new Date().toISOString(),
  }
}

function toPurchaseRequestDbRow(request: Partial<PurchaseRequest>): any {
  const r: any = { ...request }
  const map: Record<string, string> = {
    itemId: 'item_id',
    itemName: 'item_name',
    requestedQuantity: 'requested_quantity',
    requesterId: 'requester_id',
    requesterName: 'requester_name',
    requesterRole: 'requester_role',
    approvedBy: 'approved_by',
    approvedDate: 'approved_date',
    requestDate: 'request_date',
  }
  for (const [camel, snake] of Object.entries(map)) {
    if (camel in r) {
      r[snake] = (r as any)[camel]
      delete (r as any)[camel]
    }
  }
  // 僅保留資料庫存在的欄位，其餘移除
  // 允許的直傳欄位（與資料表同名）
  const allowed = new Set(['status', 'notes', 'priority'])
  for (const key of Object.keys(r)) {
    if (!(key in Object.values(map).reduce((acc:any,k)=>{acc[k]=true;return acc}, {} as any)) && !allowed.has(key)) {
      delete (r as any)[key]
    }
  }
  return r
}

function fromPurchaseRequestDbRow(row: any): PurchaseRequest {
  const r = row || {}
  return {
    id: r.id,
    itemId: r.item_id,
    itemName: r.item_name,
    requestedQuantity: r.requested_quantity,
    requesterId: r.requester_id,
    requesterName: r.requester_name,
    requesterRole: r.requester_role,
    status: r.status || 'pending',
    requestDate: r.request_date,
    approvedBy: r.approved_by,
    approvedDate: r.approved_date,
    notes: r.notes,
    priority: r.priority || 'normal',
  }
}

class SupabaseInventoryRepo implements InventoryRepo {
  async list(): Promise<InventoryItem[]> {
    try {
      const { data, error } = await supabase.from('inventory').select('*').order('updated_at', { ascending: false })
      if (error) {
        console.warn('Inventory table error:', error)
        // 如果表不存在，返回空陣列
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return []
        }
        throw error
      }
      return (data || []).map(fromDbRow)
    } catch (error) {
      console.warn('Failed to load inventory:', error)
      return []
    }
  }

  async upsert(item: Omit<InventoryItem, 'updatedAt'>): Promise<InventoryItem> {
    try {
      const now = new Date().toISOString()
      const row: any = { ...toDbRow(item), updated_at: now }
      if (!row.id || row.id === '') {
        row.id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}`
      }
      
      // 確保必要欄位存在
      if (!row.name) row.name = ''
      if (row.quantity === undefined) row.quantity = 0
      if (row.safe_stock === undefined) row.safe_stock = 0
      if (!row.description) row.description = ''
      if (!row.category) row.category = ''
      if (row.unit_price === undefined) row.unit_price = 0
      if (!row.image_urls) row.image_urls = []
      
      const { data, error } = await supabase.from('inventory').upsert(row).select()
      if (error) {
        console.error('Inventory upsert error:', error)
        throw new Error(`儲存失敗: ${error.message}`)
      }
      // upsert 可能返回陣列，取第一筆
      const result = Array.isArray(data) ? data[0] : data
      return fromDbRow(result)
    } catch (error) {
      console.error('Failed to upsert inventory:', error)
      throw error
    }
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('inventory').delete().eq('id', id)
    if (error) throw error
  }
  
  // 購買申請相關方法
  async createPurchaseRequest(request: Omit<PurchaseRequest, 'id'>): Promise<PurchaseRequest> {
    const row = toPurchaseRequestDbRow(request)
    const { data, error } = await supabase.from('purchase_requests').insert(row).select().single()
    if (error) throw error
    // 小鈴鐺：庫存採購申請（客服/管理端）
    try {
      await supabase.from('notifications').insert({
        title: '庫存採購申請',
        body: `品項：${row.item_name || ''}，數量：${row.requested_quantity || 0}（申請人：${row.requester_name || ''}）`,
        level: 'info',
        target: 'support',
        channel: 'inventory',
        created_at: new Date().toISOString(),
        sent_at: new Date().toISOString()
      } as any)
    } catch {}
    return fromPurchaseRequestDbRow(data)
  }
  
  async getPurchaseRequest(id: string): Promise<PurchaseRequest | null> {
    const { data, error } = await supabase.from('purchase_requests').select('*').eq('id', id).single()
    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return fromPurchaseRequestDbRow(data)
  }
  
  async updatePurchaseRequest(id: string, patch: Partial<PurchaseRequest>): Promise<void> {
    const row = toPurchaseRequestDbRow(patch)
    const { error } = await supabase.from('purchase_requests').update(row).eq('id', id)
    if (error) throw error
  }
  
  async listPurchaseRequests(): Promise<PurchaseRequest[]> {
    const { data, error } = await supabase.from('purchase_requests').select('*').order('request_date', { ascending: false })
    if (error) throw error
    return (data || []).map(fromPurchaseRequestDbRow)
  }
}

export const inventoryRepo: InventoryRepo = new SupabaseInventoryRepo()


