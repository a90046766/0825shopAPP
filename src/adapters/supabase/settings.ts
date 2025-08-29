import type { SettingsRepo, AppSettings } from '../../core/repository'
import { supabase } from '../../utils/supabase'

const ROW_ID = 'default'

function fromRow(r: any): AppSettings {
  return {
    bulletin: r.bulletin || undefined,
    bulletinUpdatedAt: r.bulletin_updated_at || undefined,
    bulletinUpdatedBy: r.bulletin_updated_by || undefined,
    countdownEnabled: typeof r.countdown_enabled === 'boolean' ? r.countdown_enabled : undefined,
    countdownMinutes: typeof r.countdown_minutes === 'number' ? r.countdown_minutes : undefined,
  }
}

class SupabaseSettingsRepo implements SettingsRepo {
  async get(): Promise<AppSettings> {
    const { data, error } = await supabase.from('app_settings').select('*').eq('id', ROW_ID).maybeSingle()
    if (error) throw error
    if (!data) {
      // 初始化一筆
      const init: any = { id: ROW_ID, bulletin: '', countdown_enabled: false, countdown_minutes: 20 }
      const { data: created, error: e2 } = await supabase.from('app_settings').insert(init).select().single()
      if (e2) throw e2
      return fromRow(created)
    }
    return fromRow(data)
  }

  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    const row: any = {}
    if ('bulletin' in patch) row.bulletin = patch.bulletin
    if ('bulletinUpdatedAt' in patch) row.bulletin_updated_at = (patch as any).bulletinUpdatedAt
    if ('bulletinUpdatedBy' in patch) row.bulletin_updated_by = (patch as any).bulletinUpdatedBy
    if ('countdownEnabled' in patch) row.countdown_enabled = (patch as any).countdownEnabled
    if ('countdownMinutes' in patch) row.countdown_minutes = (patch as any).countdownMinutes
    const { data, error } = await supabase.from('app_settings').upsert({ id: ROW_ID, ...row }).select().single()
    if (error) throw error
    return fromRow(data)
  }
}

export const settingsRepo: SettingsRepo = new SupabaseSettingsRepo()


