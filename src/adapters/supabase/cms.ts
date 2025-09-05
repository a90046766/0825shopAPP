import { supabase } from '../../utils/supabase'

export type HeroSlide = { id: string; title: string; subtitle?: string; image: string; sort_order?: number; enabled?: boolean }
export type ServiceCard = { id: string; name: string; description?: string; features?: string[]; icon?: string; link?: string; sort_order?: number; enabled?: boolean }
export type AdvantageItem = { id: string; title: string; description?: string; icon?: string; sort_order?: number; enabled?: boolean }
export type Promotion = { id: string; title: string; subtitle?: string; items?: { heading: string; subtext?: string }[]; cta_label?: string; cta_link?: string; enabled?: boolean }
export type Loyalty = { id: string; earn_per_amount: number; redeem_value_per_point: number; notes?: string[]; cta_label?: string; cta_link?: string; enabled?: boolean }
export type Contacts = { id: string; company?: string; tax_id?: string; phone?: string; line_id?: string; zones?: string; notes?: string; enabled?: boolean }
export type Policy = { id: string; type: string; content?: string; enabled?: boolean }
export type Faq = { id: string; question: string; answer: string; sort_order?: number; enabled?: boolean }

export async function fetchHeroSlides(): Promise<HeroSlide[]> {
  const { data, error } = await supabase.from('hero_slides').select('*').eq('enabled', true).order('sort_order', { ascending: true })
  if (error) throw error
  return (data || []) as any
}

export async function fetchServices(): Promise<ServiceCard[]> {
  const { data, error } = await supabase.from('services').select('*').eq('enabled', true).order('sort_order', { ascending: true })
  if (error) throw error
  return (data || []).map((r: any) => ({ ...r, features: Array.isArray(r.features) ? r.features : [] }))
}

export async function fetchAdvantages(): Promise<AdvantageItem[]> {
  const { data, error } = await supabase.from('advantages').select('*').eq('enabled', true).order('sort_order', { ascending: true })
  if (error) throw error
  return (data || []) as any
}

export async function fetchPromotions(): Promise<Promotion | null> {
  const { data, error } = await supabase.from('promotions').select('*').eq('enabled', true).limit(1).maybeSingle()
  if (error) return null
  const p: any = data || null
  if (!p) return null
  if (p && typeof p.items === 'string') {
    try { p.items = JSON.parse(p.items) } catch { p.items = [] }
  }
  return p
}

export async function fetchLoyalty(): Promise<Loyalty | null> {
  const { data, error } = await supabase.from('loyalty').select('*').eq('enabled', true).limit(1).maybeSingle()
  if (error) return null
  const l: any = data || null
  if (l && typeof l.notes === 'string') {
    try { l.notes = JSON.parse(l.notes) } catch { l.notes = [] }
  }
  return l
}

export async function fetchContacts(): Promise<Contacts | null> {
  const { data, error } = await supabase.from('contacts').select('*').eq('enabled', true).limit(1).maybeSingle()
  if (error) return null
  return (data || null) as any
}

// 承諾（policies.type = 'commitment'），若表不存在或查詢錯誤則回傳 null
export async function fetchCommitment(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('policies')
      .select('*')
      .eq('type', 'commitment')
      .eq('enabled', true)
      .limit(1)
      .maybeSingle()
    if (error) return null
    if (!data) return null
    const row: any = data
    if (row && typeof row.content === 'string' && row.content.trim()) return row.content
    return null
  } catch {
    return null
  }
}

// 常見問題（faqs），若表不存在或查詢錯誤則回傳空陣列
export async function fetchFaqs(): Promise<Faq[]> {
  try {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .eq('enabled', true)
      .order('sort_order', { ascending: true })
    if (error) return []
    return (data || []) as any
  } catch {
    return []
  }
}


