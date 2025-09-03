import { supabase } from '../../utils/supabase'

export type NavItem = { id: string; label: string; path: string; sortOrder: number; active: boolean }
export type BannerItem = { id: string; slot: string; title?: string; subtitle?: string; imageUrl?: string; href?: string; sortOrder: number; active: boolean }
export type SectionItem = { id: string; page: string; kind: string; title?: string; content?: string; imageUrl?: string; sortOrder: number; active: boolean }
export type SiteSettings = { id: string; brandColor?: string; phone?: string; email?: string; lineUrl?: string }

function mapNav(r: any): NavItem {
  return { id: r.id, label: r.label, path: r.path, sortOrder: r.sort_order ?? 0, active: !!r.active }
}
function mapBanner(r: any): BannerItem {
  return { id: r.id, slot: r.slot, title: r.title || undefined, subtitle: r.subtitle || undefined, imageUrl: r.image_url || undefined, href: r.href || undefined, sortOrder: r.sort_order ?? 0, active: !!r.active }
}
function mapSection(r: any): SectionItem {
  return { id: r.id, page: r.page, kind: r.kind || 'content', title: r.title || undefined, content: r.content || undefined, imageUrl: r.image_url || undefined, sortOrder: r.sort_order ?? 0, active: !!r.active }
}
function mapSettings(r: any): SiteSettings { return { id: r.id, brandColor: r.brand_color || undefined, phone: r.phone || undefined, email: r.email || undefined, lineUrl: r.line_url || undefined } }

export const siteCMS = {
  async listNav(): Promise<NavItem[]> {
    const { data, error } = await supabase.from('site_nav').select('id,label,path,sort_order,active')
    if (error) throw error
    return (data || []).map(mapNav).filter(n => n.active).sort((a,b)=> (a.sortOrder-b.sortOrder) || a.label.localeCompare(b.label,'zh-Hant'))
  },
  async listBanners(slot: string): Promise<BannerItem[]> {
    const { data, error } = await supabase.from('site_banners').select('id,slot,title,subtitle,image_url,href,sort_order,active').eq('slot', slot)
    if (error) throw error
    return (data || []).map(mapBanner).filter(b=>b.active).sort((a,b)=> (a.sortOrder-b.sortOrder) || (a.title||'').localeCompare(b.title||'', 'zh-Hant'))
  },
  async getHero(slot: string): Promise<BannerItem | null> {
    const list = await this.listBanners(slot)
    return list[0] || null
  },
  async listSections(page: string): Promise<SectionItem[]> {
    const { data, error } = await supabase.from('site_sections').select('id,page,kind,title,content,image_url,sort_order,active').eq('page', page)
    if (error) throw error
    return (data || []).map(mapSection).filter(s=>s.active).sort((a,b)=> (a.sortOrder-b.sortOrder) || (a.title||'').localeCompare(b.title||'', 'zh-Hant'))
  },
  async getSettings(): Promise<SiteSettings | null> {
    const { data, error } = await supabase.from('site_settings').select('*').eq('id','default').maybeSingle()
    if (error) throw error
    return data ? mapSettings(data) : null
  },
  async upsertNav(item: Partial<NavItem> & { id?: string }): Promise<NavItem> {
    const row: any = { id: item.id, label: item.label, path: item.path, sort_order: item.sortOrder ?? 0, active: item.active ?? true }
    const { data, error } = await supabase.from('site_nav').upsert(row).select('id,label,path,sort_order,active').single()
    if (error) throw error
    return mapNav(data)
  },
  async removeNav(id: string): Promise<void> {
    const { error } = await supabase.from('site_nav').delete().eq('id', id)
    if (error) throw error
  },
  async upsertBanner(item: Partial<BannerItem> & { id?: string }): Promise<BannerItem> {
    const row: any = { id: item.id, slot: item.slot, title: item.title, subtitle: item.subtitle, image_url: item.imageUrl, href: item.href, sort_order: item.sortOrder ?? 0, active: item.active ?? true }
    const { data, error } = await supabase.from('site_banners').upsert(row).select('id,slot,title,subtitle,image_url,href,sort_order,active').single()
    if (error) throw error
    return mapBanner(data)
  },
  async upsertSection(item: Partial<SectionItem> & { id?: string }): Promise<SectionItem> {
    const row: any = { id: item.id, page: item.page, kind: item.kind ?? 'content', title: item.title, content: item.content, image_url: item.imageUrl, sort_order: item.sortOrder ?? 0, active: item.active ?? true }
    const { data, error } = await supabase.from('site_sections').upsert(row).select('id,page,kind,title,content,image_url,sort_order,active').single()
    if (error) throw error
    return mapSection(data)
  },
  async updateSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
    const row: any = { id: 'default', brand_color: patch.brandColor, phone: patch.phone, email: patch.email, line_url: patch.lineUrl }
    const { data, error } = await supabase.from('site_settings').upsert(row).select('*').single()
    if (error) throw error
    return mapSettings(data)
  }
}


