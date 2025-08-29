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
    customerAddress: 'customer_address',
    preferredDate: 'preferred_date',
    preferredTimeStart: 'preferred_time_start',
    preferredTimeEnd: 'preferred_time_end',
    referrerCode: 'referrer_code',
    memberId: 'member_id',
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
    workStartedAt: 'work_started_at',
    workCompletedAt: 'work_completed_at',
    serviceFinishedAt: 'service_finished_at',
    canceledReason: 'canceled_reason',
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
    customerAddress: pick('customerAddress', 'customer_address') || '',
    preferredDate: pick('preferredDate', 'preferred_date') || '',
    preferredTimeStart: pick('preferredTimeStart', 'preferred_time_start') || '09:00',
    preferredTimeEnd: pick('preferredTimeEnd', 'preferred_time_end') || '12:00',
    referrerCode: pick('referrerCode', 'referrer_code') || '',
    paymentMethod: pick('paymentMethod', 'payment_method'),
    paymentStatus: pick('paymentStatus', 'payment_status'),
    pointsUsed: pick('pointsUsed', 'points_used') ?? 0,
    pointsDeductAmount: pick('pointsDeductAmount', 'points_deduct_amount') ?? 0,
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
    createdAt: pick('createdAt', 'created_at') || new Date().toISOString(),
    updatedAt: pick('updatedAt', 'updated_at') || new Date().toISOString(),
  }
}

const ORDERS_COLUMNS =
  'id,order_number,customer_name,customer_phone,customer_address,preferred_date,preferred_time_start,preferred_time_end,platform,referrer_code,member_id,service_items,assigned_technicians,signature_technician,signatures,photos,photos_before,photos_after,payment_method,payment_status,points_used,points_deduct_amount,category,channel,used_item_id,work_started_at,work_completed_at,service_finished_at,canceled_reason,status,created_at,updated_at'

class SupabaseOrderRepo implements OrderRepo {
  async list(): Promise<Order[]> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(ORDERS_COLUMNS)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Supabase orders list error:', error)
        throw new Error(`訂單?�表載入失�?: ${error.message}`)
      }
      
      return (data || []).map(fromDbRow) as any
    } catch (error) {
      console.error('Supabase orders list exception:', error)
      throw new Error('訂單?�表載入失�?')
    }
  }

  async get(id: string): Promise<Order | null> {
    try {
      let query = supabase
        .from('orders')
        .select(ORDERS_COLUMNS)
      
      // 檢查?�否?��??�編?�格式�?OD?�頭�?
      if (id.startsWith('OD')) {
        query = query.eq('order_number', id)
      } else if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        console.warn(`?��??��???ID ?��?: ${id}`)
        return null
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
      const row = toDbRow(draft)
      // ?�新訂單?��? UUID
      row.id = generateUUID()
      
      // ?��?訂單編�?
      const { data: orderNumberData, error: orderNumberError } = await supabase
        .rpc('generate_order_number')
      
      if (orderNumberError) {
        console.error('?��?訂單編�?失�?:', orderNumberError)
        throw new Error('?��?訂單編�?失�?')
      }
      
      row.order_number = orderNumberData
      
      const { data, error } = await supabase
        .from('orders')
        .insert(row)
        .select(ORDERS_COLUMNS)
        .single()
      
      if (error) {
        console.error('Supabase order create error:', error)
        throw new Error(`訂單建�?失�?: ${error.message}`)
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
      
      // 檢查?�否?��??�編?�格式�?O?�頭�?
      if (id.startsWith('OD')) {
        query = query.eq('order_number', id)
      } else if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        console.error(`?��??��???ID ?��?: ${id}`)
        throw new Error('?��??��???ID ?��?')
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
      
      // 檢查?�否?��??�編?�格式�?O?�頭�?
      if (id.startsWith('OD')) {
        query = query.eq('order_number', id)
      } else if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        console.error(`?��??��???ID ?��?: ${id}`)
        throw new Error('?��??��???ID ?��?')
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
      
      // 檢查?�否?��??�編?�格式�?O?�頭�?
      if (id.startsWith('OD')) {
        query = query.eq('order_number', id)
      } else if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        console.error(`?��??��???ID ?��?: ${id}`)
        throw new Error('?��??��???ID ?��?')
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
      
      // 檢查?�否?��??�編?�格式�?O?�頭�?
      if (id.startsWith('OD')) {
        query = query.eq('order_number', id)
      } else if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        console.error(`?��??��???ID ?��?: ${id}`)
        throw new Error('?��??��???ID ?��?')
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
      
      // 檢查?�否?��??�編?�格式�?O?�頭�?
      if (id.startsWith('OD')) {
        query = query.eq('order_number', id)
      } else if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        console.error(`?��??��???ID ?��?: ${id}`)
        throw new Error('?��??��???ID ?��?')
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
      
      // 檢查?�否?��??�編?�格式�?O?�頭�?
      if (id.startsWith('OD')) {
        query = query.eq('order_number', id)
      } else if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        console.error(`?��??��???ID ?��?: ${id}`)
        throw new Error('?��??��???ID ?��?')
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
}

export const orderRepo = new SupabaseOrderRepo()
