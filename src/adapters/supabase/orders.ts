import type { OrderRepo, Order } from '../../core/repository'
import { supabase } from '../../utils/supabase'

// UUID 驗�??�數
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// ?��? UUID ?��???ID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function toDbRow(input: Partial<Order>): any {
  if (!input) return {}
  const map: Record<string, string> = {
    customerName: 'customer_name',
    customerPhone: 'customer_phone',
    customerEmail: 'customer_email',
    customerTitle: 'customer_title',
    customerTaxId: 'customer_tax_id',
    customerAddress: 'customer_address',
    preferredDate: 'preferred_date',
    preferredTimeStart: 'preferred_time_start',
    preferredTimeEnd: 'preferred_time_end',
    referrerCode: 'referrer_code',
    memberId: 'member_id',
    signatureTechnician: 'signature_technician',
    assignedTechnicians: 'assigned_technicians',
    serviceItems: 'service_items',
    signatures: 'signatures',
    photos: 'photos',
    photosBefore: 'photos_before',
    photosAfter: 'photos_after',
    paymentMethod: 'payment_method',
    paymentStatus: 'payment_status',
    pointsUsed: 'points_used',
    pointsDeductAmount: 'points_deduct_amount',
    invoiceSent: 'invoice_sent',
    note: 'note',
    workStartedAt: 'work_started_at',
    workCompletedAt: 'work_completed_at',
    serviceFinishedAt: 'service_finished_at',
    canceledReason: 'canceled_reason',
    createdBy: 'created_by',
  }
  const row: any = {}
  for (const [camel, snake] of Object.entries(map)) {
    if ((input as any)[camel] !== undefined) row[snake] = (input as any)[camel]
  }
  const passthrough = ['status', 'platform', 'category', 'channel', 'used_item_id', 'created_at', 'updated_at']
  for (const key of passthrough) {
    if ((input as any)[key] !== undefined) row[key] = (input as any)[key]
  }
  // 移除空�?串�??��?，避??Postgres date �???�誤
  if (row['preferred_date'] === '' || row['preferred_date'] === undefined) {
    delete row['preferred_date']
  }
  return row
}

function fromDbRow(row: any): Order {
  const r = row || {}
  const pick = (a: string, b: string) => (r[a] ?? r[b])
  return {
    // 使用 order_number 作為顯示 ID，�??��??��?使用 UUID
    id: r.order_number || r.id,
    memberId: pick('memberId', 'member_id'),
    customerName: pick('customerName', 'customer_name') || '',
    customerPhone: pick('customerPhone', 'customer_phone') || '',
    customerEmail: pick('customerEmail', 'customer_email') || '',
    customerTitle: pick('customerTitle', 'customer_title') || '',
    customerTaxId: pick('customerTaxId', 'customer_tax_id') || '',
    customerAddress: pick('customerAddress', 'customer_address') || '',
    preferredDate: pick('preferredDate', 'preferred_date') || '',
    preferredTimeStart: pick('preferredTimeStart', 'preferred_time_start') || '09:00',
    preferredTimeEnd: pick('preferredTimeEnd', 'preferred_time_end') || '12:00',
    referrerCode: pick('referrerCode', 'referrer_code') || '',
    paymentMethod: pick('paymentMethod', 'payment_method'),
    paymentStatus: pick('paymentStatus', 'payment_status'),
    pointsUsed: pick('pointsUsed', 'points_used') ?? 0,
    pointsDeductAmount: pick('pointsDeductAmount', 'points_deduct_amount') ?? 0,
    invoiceSent: (r.invoiceSent ?? r.invoice_sent) ?? false,
    note: pick('note', 'note') || '',
    serviceItems: pick('serviceItems', 'service_items') || [],
    assignedTechnicians: pick('assignedTechnicians', 'assigned_technicians') || [],
    signatureTechnician: r.signatureTechnician || r.signature_technician,
    status: r.status || 'draft',
    platform: r.platform || '日',
    photos: r.photos || [],
    photosBefore: pick('photosBefore', 'photos_before') || [],
    photosAfter: pick('photosAfter', 'photos_after') || [],
    signatures: r.signatures || {},
    workStartedAt: pick('workStartedAt', 'work_started_at'),
    workCompletedAt: pick('workCompletedAt', 'work_completed_at'),
    serviceFinishedAt: pick('serviceFinishedAt', 'service_finished_at'),
    canceledReason: pick('canceledReason', 'canceled_reason'),
    closedAt: pick('closedAt', 'closed_at'),
    createdBy: pick('createdBy', 'created_by'),
    createdAt: pick('createdAt', 'created_at') || new Date().toISOString(),
    updatedAt: pick('updatedAt', 'updated_at') || new Date().toISOString(),
  }
}

// 輕量欄位（避免巨大 JSON，例如 photos_* 造成解析失敗或資源不足）
const ORDERS_COLUMNS =
  'id,order_number,customer_name,customer_phone,customer_email,customer_title,customer_tax_id,customer_address,preferred_date,preferred_time_start,preferred_time_end,platform,referrer_code,member_id,service_items,assigned_technicians,signature_technician,signatures,payment_method,payment_status,points_used,points_deduct_amount,invoice_sent,note,category,channel,used_item_id,work_started_at,work_completed_at,service_finished_at,canceled_reason,status,created_by,created_at,updated_at'

// 詳細頁欄位（單筆讀取可接受較大欄位，需包含照片供結案檢核）
const ORDER_COLUMNS_DETAIL =
  ORDERS_COLUMNS + ',photos,photos_before,photos_after'

class SupabaseOrderRepo implements OrderRepo {
  async list(): Promise<Order[]> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(ORDERS_COLUMNS)
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Supabase orders list error:', error)
        throw new Error(`訂單清單載入失敗: ${error.message}`)
      }
      return (data || []).map(fromDbRow) as any
    } catch (error: any) {
      console.error('Supabase orders list exception:', error)
      // 備援：若因巨大 JSON 解析失敗，改以更精簡欄位再嘗試一次
      try {
        const MIN_COLS = 'id,order_number,customer_name,customer_phone,customer_email,preferred_date,preferred_time_start,preferred_time_end,platform,referrer_code,member_id,service_items,assigned_technicians,signature_technician,status,created_at,updated_at,work_started_at,work_completed_at,service_finished_at'
        const { data } = await supabase
          .from('orders')
          .select(MIN_COLS)
          .order('created_at', { ascending: false })
        return (data || []).map(fromDbRow) as any
      } catch (e2) {
        console.error('Supabase orders list fallback failed:', e2)
        throw new Error('訂單清單載入失敗')
      }
    }
  }

  async get(id: string): Promise<Order | null> {
    try {
      let query = supabase
        .from('orders')
        .select(ORDER_COLUMNS_DETAIL)
      
      // 以 UUID 為主，否則以 order_number 查詢（不再限定必須 OD 開頭）
      if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        query = query.eq('order_number', id)
      }
      
      const { data, error } = await query.single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          // ?��??��??��?返�? null
          return null
        }
        console.error('Supabase order get error:', error)
        throw new Error(`訂單載入失�?: ${error.message}`)
      }
      
      return fromDbRow(data)
    } catch (error) {
      console.error('Supabase order get exception:', error)
      throw new Error('訂單載入失�?')
    }
  }

  async create(draft: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    try {
      // 優先使用 RPC 將「產生單號 + 寫入 header/items」包成交易
      const payload: any = {
        customerName: (draft as any).customerName,
        customerPhone: (draft as any).customerPhone,
        customerEmail: (draft as any).customerEmail,
        customerAddress: (draft as any).customerAddress,
        preferredDate: (draft as any).preferredDate,
        preferredTimeStart: (draft as any).preferredTimeStart,
        preferredTimeEnd: (draft as any).preferredTimeEnd,
        paymentMethod: (draft as any).paymentMethod,
        pointsUsed: (draft as any).pointsUsed,
        pointsDeductAmount: (draft as any).pointsDeductAmount,
        note: (draft as any).note,
        platform: (draft as any).platform || '商城',
        status: (draft as any).status || 'pending',
        serviceItems: (draft as any).serviceItems || []
      }

      try {
        const { data: rpcRow, error: rpcErr } = await supabase.rpc('create_reservation_order', {
          p_member_id: (draft as any).memberId || null,
          p_payload: payload
        })
        if (rpcErr) throw rpcErr
        if (rpcRow) return fromDbRow(rpcRow)
      } catch (rpcError: any) {
        // RPC 不存在或失敗時，回退到舊流程（兩段式）
        console.warn('create_reservation_order RPC 不可用，回退兩段式建立：', rpcError?.message || rpcError)
      }

      // 回退流程（兩段式）：先產生單號再插入
      const row = toDbRow(draft)
      row.id = generateUUID()
      
      // 生成唯一的訂單編號
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      row.order_number = `OD${timestamp}${random}`
      
      // 檢查是否重複，如果重複則重新生成
      let attempts = 0
      while (attempts < 5) {
        const { data: existing } = await supabase
          .from('orders')
          .select('id')
          .eq('order_number', row.order_number)
          .single()
        
        if (!existing) break // 沒有重複，可以使用
        
        // 重複了，重新生成
        const newTimestamp = Date.now()
        const newRandom = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
        row.order_number = `OD${newTimestamp}${newRandom}`
        attempts++
      }

      const { data, error } = await supabase.from('orders').insert(row).select(ORDERS_COLUMNS).single()
      if (error) {
        console.error('Supabase order create error:', error)
        throw new Error(`訂單建立失敗: ${error.message}`)
      }
      return fromDbRow(data)
    } catch (error) {
      console.error('Supabase order create exception:', error)
      throw new Error('訂單建�?失�?')
    }
  }

  async update(id: string, patch: Partial<Order>): Promise<void> {
    try {
      let query = supabase
        .from('orders')
        .update(toDbRow(patch))
      
      // 以 UUID 為主，否則用 order_number 更新
      if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        query = query.eq('order_number', id)
      }
      
      const { error } = await query
      
      if (error) {
        console.error('Supabase order update error:', error)
        throw new Error(`訂單?�新失�?: ${error.message}`)
      }
    } catch (error) {
      console.error('Supabase order update exception:', error)
      throw new Error('訂單?�新失�?')
    }
  }

  async delete(id: string, reason: string): Promise<void> {
    try {
      let query = supabase
        .from('orders')
        .delete()
      
      // 以 UUID 為主，否則以 order_number
      if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        query = query.eq('order_number', id)
      }
      
      const { error } = await query
      
      if (error) {
        console.error('Supabase order delete error:', error)
        throw new Error(`訂單?�除失�?: ${error.message}`)
      }
    } catch (error) {
      console.error('Supabase order delete exception:', error)
      throw new Error('訂單?�除失�?')
    }
  }

  async cancel(id: string, reason: string): Promise<void> {
    try {
      let query = supabase
        .from('orders')
        .update({ 
          status: 'canceled', 
          canceled_reason: reason,
          updated_at: new Date().toISOString()
        })
      
      // 以 UUID 為主，否則以 order_number
      if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        query = query.eq('order_number', id)
      }
      
      const { error } = await query
      
      if (error) {
        console.error('Supabase order cancel error:', error)
        throw new Error(`訂單?��?失�?: ${error.message}`)
      }
    } catch (error) {
      console.error('Supabase order cancel exception:', error)
      throw new Error('訂單?��?失�?')
    }
  }

  async confirm(id: string): Promise<void> {
    try {
      let query = supabase
        .from('orders')
        .update({ 
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
      
      // 以 UUID 為主，否則以 order_number
      if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        query = query.eq('order_number', id)
      }
      
      const { error } = await query
      
      if (error) {
        console.error('Supabase order confirm error:', error)
        throw new Error(`訂單確�?失�?: ${error.message}`)
      }
    } catch (error) {
      console.error('Supabase order confirm exception:', error)
      throw new Error('訂單確�?失�?')
    }
  }

  async startWork(id: string, at: string): Promise<void> {
    try {
      let query = supabase
        .from('orders')
        .update({ 
          work_started_at: at,
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
      
      // 以 UUID 為主，否則以 order_number
      if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        query = query.eq('order_number', id)
      }
      
      const { error } = await query
      
      if (error) {
        console.error('Supabase order startWork error:', error)
        throw new Error(`?��?工�?失�?: ${error.message}`)
      }
    } catch (error) {
      console.error('Supabase order startWork exception:', error)
      throw new Error('?��?工�?失�?')
    }
  }

  async finishWork(id: string, at: string): Promise<void> {
    try {
      let query = supabase
        .from('orders')
        .update({ 
          work_completed_at: at,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
      
      // 以 UUID 為主，否則以 order_number
      if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        query = query.eq('order_number', id)
      }
      
      const { error } = await query
      
      if (error) {
        console.error('Supabase order finishWork error:', error)
        throw new Error(`完�?工�?失�?: ${error.message}`)
      }
    } catch (error) {
      console.error('Supabase order finishWork exception:', error)
      throw new Error('完�?工�?失�?')
    }
  }

  // 客服確認並推播會員（以顧客 Email 為目標）
  async confirmWithMemberNotify(id: string): Promise<void> {
    await this.confirm(id)
    try {
      // 取得訂單資料，用於組合通知內容
      const order = await this.get(id)
      if (!order) return
      const email = (order.customerEmail || '').toLowerCase()
      if (!email) return
      const timeBand = (order.preferredTimeStart && order.preferredTimeEnd)
        ? `${order.preferredTimeStart}-${order.preferredTimeEnd}`
        : ''
      const title = '服務已確認通知'
      const body = `親愛的${order.customerName||''}您好，感謝您的惠顧！您${order.preferredDate||''}的服務已確認，訂單編號 ${order.id}。技師將於 ${timeBand} 抵達，請保持電話暢通。建議加入官方 LINE：@942clean 以利溝通與留存紀錄。如需異動請於 LINE 留言或致電 (02)7756-2269。`
      // 直接寫入 notifications 表
      await supabase.from('notifications').insert({
        title,
        body,
        level: 'info',
        target: 'user',
        target_user_email: email,
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
    } catch (e) {
      console.warn('confirmWithMemberNotify 寫入通知失敗：', e)
    }
  }
}

export const orderRepo = new SupabaseOrderRepo()
