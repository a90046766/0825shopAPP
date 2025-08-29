import type { ProductRepo, Product } from '../../core/repository'
import { supabase } from '../../utils/supabase'

function toDbRow(input: Partial<Product>): any {
  const r: any = { ...input }
  const map: Record<string, string> = {
    unitPrice: 'unit_price',
    groupPrice: 'group_price',
    groupMinQty: 'group_min_qty',
    imageUrls: 'image_urls',
    safeStock: 'safe_stock',
    category: 'category',
    modeCode: 'mode_code',
    categoryId: 'category_id',
    defaultQuantity: 'defaultquantity',
    soldCount: 'sold_count',
  }
  for (const [camel, snake] of Object.entries(map)) {
    if (camel in r) r[snake] = (r as any)[camel]
  }
  return r
}

function fromDbRow(row: any): Product {
  const r = row || {}
  return {
    id: r.id,
    name: r.name || '',
    unitPrice: r.unit_price ?? r.unitPrice ?? 0,
    groupPrice: r.group_price ?? r.groupPrice,
    groupMinQty: r.group_min_qty ?? r.groupMinQty ?? 0,
    description: r.description || '',
    content: r.content || '',
    region: r.region || '',
    imageUrls: r.image_urls ?? r.imageUrls ?? [],
    safeStock: r.safe_stock ?? r.safeStock,
    // @ts-ignore
    category: r.category,
    // @ts-ignore
    modeCode: r.mode_code,
    // @ts-ignore
    categoryId: r.category_id,
    // @ts-ignore
    defaultQuantity: r.defaultquantity ?? 1,
    // @ts-ignore
    soldCount: r.sold_count ?? 0,
    updatedAt: r.updated_at ?? new Date().toISOString(),
  }
}

class SupabaseProductRepo implements ProductRepo {
  async list(): Promise<Product[]> {
    const { data, error } = await supabase.from('products').select('*').order('updated_at', { ascending: false })
    if (error) throw error
    return (data || []).map(fromDbRow)
  }

  async upsert(product: Omit<Product, 'updatedAt'>): Promise<Product> {
    const now = new Date().toISOString()
    const row: any = { ...toDbRow(product), updated_at: now }
    if (!row.id || row.id === '') {
      row.id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}`
    }
    const { data, error } = await supabase.from('products').upsert(row).select().single()
    if (error) throw error
    return fromDbRow(data)
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
  }
}

export const productRepo: ProductRepo = new SupabaseProductRepo()


