import { supabase } from '../../utils/supabase'

export interface ProductMode {
  code: string
  name: string
  hasInventory: boolean
  usesUsedItems: boolean
  forceQtyOne: boolean
  deductInventory: boolean
  visibleInCart: boolean
  updatedAt?: string
}

export interface ProductCategory {
  id: string
  name: string
  sortOrder: number
  active: boolean
  updatedAt?: string
}

function fromModeRow(r: any): ProductMode {
  return {
    code: r.code,
    name: r.name,
    hasInventory: !!(r.has_inventory),
    usesUsedItems: !!(r.uses_used_items),
    forceQtyOne: !!(r.force_qty_one),
    deductInventory: !!(r.deduct_inventory),
    visibleInCart: !!(r.visible_in_cart),
    updatedAt: r.updated_at || undefined,
  }
}

function fromCategoryRow(r: any): ProductCategory {
  return {
    id: r.id,
    name: r.name,
    sortOrder: r.sort_order ?? 0,
    active: !!r.active,
    updatedAt: r.updated_at || undefined,
  }
}

export const productMeta = {
  async listModes(): Promise<ProductMode[]> {
    const { data, error } = await supabase.from('product_modes').select('*').order('name', { ascending: true })
    if (error) throw error
    return (data || []).map(fromModeRow)
  },
  async listCategories(activeOnly = true): Promise<ProductCategory[]> {
    let q = supabase.from('product_categories').select('*')
    if (activeOnly) q = q.eq('active', true)
    const { data, error } = await q.order('sort_order', { ascending: true }).order('name', { ascending: true })
    if (error) throw error
    return (data || []).map(fromCategoryRow)
  },
  async upsertCategory(cat: Omit<ProductCategory, 'id' | 'updatedAt'> & { id?: string }): Promise<ProductCategory> {
    const now = new Date().toISOString()
    const row: any = { id: cat.id, name: cat.name, sort_order: cat.sortOrder ?? 0, active: cat.active ?? true, updated_at: now }
    const { data, error } = await supabase.from('product_categories').upsert(row).select().single()
    if (error) throw error
    return fromCategoryRow(data)
  },
  async deactivateCategory(id: string): Promise<void> {
    const { error } = await supabase.from('product_categories').update({ active: false, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
  },
}


