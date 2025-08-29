import { supabase } from '../../utils/supabase'

export interface UsedItem {
  id: string
  title: string
  price: number
  imageUrls: string[]
  status: 'available' | 'reserved' | 'sold'
  reservedExpiresAt?: string
  updatedAt: string
}

export interface UsedItemsRepo {
  list(): Promise<UsedItem[]>
  upsert(item: Omit<UsedItem, 'updatedAt'>): Promise<UsedItem>
  remove(id: string): Promise<void>
  placeOrder(usedItemId: string, orderPayload: any): Promise<string>
}

function fromRow(r: any): UsedItem {
  return {
    id: r.id,
    title: r.title,
    price: Number(r.price || 0),
    imageUrls: r.image_urls || [],
    status: r.status,
    reservedExpiresAt: r.reserved_expires_at || undefined,
    updatedAt: r.updated_at || new Date().toISOString(),
  }
}

class SupabaseUsedItemsRepo implements UsedItemsRepo {
  async list(): Promise<UsedItem[]> {
    const { data, error } = await supabase.from('used_items').select('*').order('updated_at', { ascending: false })
    if (error) throw error
    return (data || []).map(fromRow)
  }

  async upsert(item: Omit<UsedItem, 'updatedAt'>): Promise<UsedItem> {
    const now = new Date().toISOString()
    const row: any = { id: item.id, title: item.title, price: item.price, image_urls: item.imageUrls || [], status: item.status, reserved_expires_at: item.reservedExpiresAt, updated_at: now }
    const { data, error } = await supabase.from('used_items').upsert(row).select().single()
    if (error) throw error
    return fromRow(data)
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('used_items').delete().eq('id', id)
    if (error) throw error
  }

  async placeOrder(usedItemId: string, orderPayload: any): Promise<string> {
    const { data, error } = await (supabase as any).rpc('place_used_order', { p_used_id: usedItemId, p_order: orderPayload })
    if (error) throw error
    return data as string
  }
}

export const usedItemsRepo: UsedItemsRepo = new SupabaseUsedItemsRepo()


