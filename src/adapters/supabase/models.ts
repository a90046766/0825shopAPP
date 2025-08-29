import type { ModelsRepo, ModelItem } from '../../core/repository'
import { supabase } from '../../utils/supabase'

function fromRow(r: any): ModelItem {
  return { id: r.id, category: r.category, brand: r.brand, model: r.model, notes: r.notes || undefined, blacklist: !!r.blacklist, attention: r.attention || undefined, updatedAt: r.updated_at || new Date().toISOString() }
}

class SupabaseModelsRepo implements ModelsRepo {
  async list(): Promise<ModelItem[]> {
    const { data, error } = await supabase.from('models').select('*').order('updated_at', { ascending: false })
    if (error) throw error
    return (data || []).map(fromRow)
  }
  async upsert(item: Omit<ModelItem, 'updatedAt'>): Promise<ModelItem> {
    const now = new Date().toISOString()
    const row: any = { id: (item as any).id, category: item.category, brand: item.brand, model: item.model, notes: item.notes, blacklist: item.blacklist, attention: item.attention, updated_at: now }
    const { data, error } = await supabase.from('models').upsert(row).select().single()
    if (error) throw error
    return fromRow(data)
  }
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('models').delete().eq('id', id)
    if (error) throw error
  }
}

export const modelsRepo: ModelsRepo = new SupabaseModelsRepo()


