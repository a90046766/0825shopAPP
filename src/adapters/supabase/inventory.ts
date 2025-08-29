import type { InventoryRepo, InventoryItem, PurchaseRequest } from '../../core/repository'
import { supabase } from '../../utils/supabase'

function toDbRow(item: Partial<InventoryItem>): any {
  const r: any = { ...item }
  const map: Record<string, string> = {
    productId: 'product_id',
    imageUrls: 'image_urls',
    safeStock: 'safe_stock',
  }
  for (const [camel, snake] of Object.entries(map)) {
    if (camel in r) r[snake] = (r as any)[camel]
  }
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
    if (camel in r) r[snake] = (r as any)[camel]
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
    const { data, error } = await supabase.from('inventory').select('*').order('updated_at', { ascending: false })
    if (error) throw error
    return (data || []).map(fromDbRow)
  }

  async upsert(item: Omit<InventoryItem, 'updatedAt'>): Promise<InventoryItem> {
    const now = new Date().toISOString()
    const row: any = { ...toDbRow(item), updated_at: now }
    if (!row.id || row.id === '') {
      row.id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}`
    }
    const { data, error } = await supabase.from('inventory').upsert(row).select().single()
    if (error) throw error
    return fromDbRow(data)
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


