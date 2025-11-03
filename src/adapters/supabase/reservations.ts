import type { ReservationsRepo, ReservationOrder } from '../../core/repository'
import { supabase } from '../../utils/supabase'

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let last: any
  for (let i = 0; i <= retries; i++) {
    try { return await fn() } catch (e: any) { last = e; await new Promise(r=>setTimeout(r, 300 + i*400)) }
  }
  throw last
}

function fromOrderRow(r: any): ReservationOrder {
  return {
    id: r.id,
    orderNumber: r.order_number || undefined,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    items: [],
    status: r.status,
    createdAt: r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
  }
}

class SupabaseReservationsRepo implements ReservationsRepo {
  async list(): Promise<ReservationOrder[]> {
    const { data: orders, error } = await withRetry(() => (
      supabase
        .from('reservation_orders')
        .select('id,order_number,customer_name,customer_phone,status,created_at,updated_at')
        .order('created_at', { ascending: false })
        .limit(200)
    ))
    if (error) throw error
    if (!orders || orders.length === 0) return []
    const ids = orders.map((o: any) => o.id)
    const { data: items, error: e2 } = await withRetry(() => (
      supabase
        .from('reservation_items')
        .select('id,reservation_id,product_id,name,unit_price,quantity,updated_at')
        .in('reservation_id', ids)
        .order('updated_at', { ascending: true })
    ))
    if (e2) throw e2
    const map: Record<string, any[]> = {}
    for (const it of items || []) {
      const one = { id: it.id, productId: it.product_id, name: it.name, unitPrice: it.unit_price, quantity: it.quantity }
      const rid = it.reservation_id
      if (!map[rid]) map[rid] = []
      map[rid].push(one)
    }
    return orders.map((o: any) => ({ ...fromOrderRow(o), items: map[o.id] || [] }))
  }

  async get(id: string): Promise<ReservationOrder | null> {
    const { data: o, error } = await supabase.from('reservation_orders').select('*').eq('id', id).single()
    if (error) {
      if ((error as any).code === 'PGRST116') return null
      throw error
    }
    const base = fromOrderRow(o)
    const { data: items, error: e2 } = await supabase.from('reservation_items').select('id,reservation_id,product_id,name,unit_price,quantity,updated_at').eq('reservation_id', id)
    if (e2) throw e2
    base.items = (items || []).map(it => ({ id: it.id, productId: it.product_id, name: it.name, unitPrice: it.unit_price, quantity: it.quantity })) as any
    return base
  }

  async create(draft: Omit<ReservationOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReservationOrder> {
    const now = new Date().toISOString()
    const { items, ...rest } = draft as any
    const { data: o, error } = await supabase
      .from('reservation_orders')
      .insert({ customer_name: rest.customerName, customer_phone: rest.customerPhone, status: rest.status || 'pending', created_at: now, updated_at: now })
      .select()
      .single()
    if (error) throw error
    if (Array.isArray(items) && items.length > 0) {
      const rows = items.map(it => ({ reservation_id: o.id, product_id: it.productId, name: it.name, unit_price: it.unitPrice, quantity: it.quantity, updated_at: now }))
      const { error: e2 } = await supabase.from('reservation_items').insert(rows)
      if (e2) throw e2
    }
    return (await this.get(o.id)) as ReservationOrder
  }

  async update(id: string, patch: Partial<ReservationOrder>): Promise<void> {
    const { items, ...rest } = (patch || {}) as any
    if (Object.keys(rest).length > 0) {
      const row: any = {}
      if ('customerName' in rest) row.customer_name = rest.customerName
      if ('customerPhone' in rest) row.customer_phone = rest.customerPhone
      if ('status' in rest) row.status = rest.status
      row.updated_at = new Date().toISOString()
      const { error } = await supabase.from('reservation_orders').update(row).eq('id', id)
      if (error) throw error
    }
    if (Array.isArray(items)) {
      // 簡化：先刪再寫（適合小數量）
      const { error: e1 } = await supabase.from('reservation_items').delete().eq('reservation_id', id)
      if (e1) throw e1
      if (items.length > 0) {
        const rows = items.map((it: any) => ({ reservation_id: id, product_id: it.productId, name: it.name, unit_price: it.unitPrice, quantity: it.quantity, updated_at: new Date().toISOString() }))
        const { error: e2 } = await supabase.from('reservation_items').insert(rows)
        if (e2) throw e2
      }
    }
  }
}

export const reservationsRepo: ReservationsRepo = new SupabaseReservationsRepo()


