import type { PromotionsRepo, Promotion } from '../../core/repository'
import { supabase } from '../../utils/supabase'

function fromRow(r: any): Promotion {
  return { id: r.id, title: r.title, description: r.description || undefined, active: !!r.active, startAt: r.start_at || undefined, endAt: r.end_at || undefined, rules: r.rules || undefined, coverUrl: r.cover_url || undefined, updatedAt: r.updated_at || new Date().toISOString() }
}

class SupabasePromotionsRepo implements PromotionsRepo {
  async list(): Promise<Promotion[]> {
    const { data, error } = await supabase.from('promotions').select('*').order('updated_at', { ascending: false })
    if (error) throw error
    return (data || []).map(fromRow)
  }
  async upsert(item: Omit<Promotion, 'updatedAt'>): Promise<Promotion> {
    const now = new Date().toISOString()
    const row: any = { id: (item as any).id, title: item.title, description: item.description, active: item.active, start_at: item.startAt, end_at: item.endAt, rules: item.rules, cover_url: item.coverUrl, updated_at: now }
    const { data, error } = await supabase.from('promotions').upsert(row).select().single()
    if (error) throw error
    return fromRow(data)
  }
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('promotions').delete().eq('id', id)
    if (error) throw error
  }
}

export const promotionsRepo: PromotionsRepo = new SupabasePromotionsRepo()


