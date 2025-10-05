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
    published: 'published',
    storeSort: 'store_sort',
  }
  for (const [camel, snake] of Object.entries(map)) {
    if (camel in r) {
      r[snake] = (r as any)[camel]
      delete r[camel]
    }
  }
  // 清除不存在於資料庫的駝峰欄位，避免 PGRST204
  delete (r as any).updatedAt
  delete (r as any).createdAt
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
    // @ts-ignore
    published: typeof r.published === 'boolean' ? r.published : (r.published === 1 ? true : (r.published === 0 ? false : undefined)),
    // @ts-ignore
    storeSort: r.store_sort ?? r.storeSort,
    updatedAt: r.updated_at ?? new Date().toISOString(),
  }
}

class SupabaseProductRepo implements ProductRepo {
  async list(): Promise<Product[]> {
    // 兼容不同資料表欄位：若某些欄位不存在（例如 store_sort / updated_at），自動回退排序
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('store_sort', { ascending: true, nullsFirst: false })
        .order('updated_at', { ascending: false })
      if (error) throw error
      return (data || []).map(fromDbRow)
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase()
      const code = (e?.code || '').toString()
      const isSchemaIssue = code === 'PGRST204' || code === '42703' || msg.includes('column') || msg.includes('schema')
      if (!isSchemaIssue) throw e
      // 回退：僅用 updated_at 排序
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('updated_at', { ascending: false })
        if (error) throw error
        return (data || []).map(fromDbRow)
      } catch (e2: any) {
        const msg2 = (e2?.message || '').toLowerCase()
        const code2 = (e2?.code || '').toString()
        const isSchemaIssue2 = code2 === 'PGRST204' || code2 === '42703' || msg2.includes('column') || msg2.includes('schema')
        if (!isSchemaIssue2) throw e2
        // 最後回退：不排序
        const { data, error } = await supabase.from('products').select('*')
        if (error) throw error
        return (data || []).map(fromDbRow)
      }
    }
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


