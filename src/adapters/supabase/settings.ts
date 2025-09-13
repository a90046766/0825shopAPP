import type { SettingsRepo, AppSettings } from '../../core/repository'
import { supabase } from '../../utils/supabase'

function fromRow(r: any): AppSettings {
  return {
    bulletin: r.bulletin || undefined,
    bulletinUpdatedAt: r.bulletin_updated_at || undefined,
    bulletinUpdatedBy: r.bulletin_updated_by || undefined,
    countdownEnabled: typeof r.countdown_enabled === 'boolean' ? r.countdown_enabled : undefined,
    countdownMinutes: typeof r.countdown_minutes === 'number' ? r.countdown_minutes : undefined,
    autoDispatchEnabled: typeof r.auto_dispatch_enabled === 'boolean' ? r.auto_dispatch_enabled : undefined,
    autoDispatchMinScore: typeof r.auto_dispatch_min_score === 'number' ? r.auto_dispatch_min_score : undefined,
    reviewBonusPoints: typeof r.review_bonus_points === 'number' ? r.review_bonus_points : undefined,
  }
}

class SupabaseSettingsRepo implements SettingsRepo {
  async get(): Promise<AppSettings> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!data) {
      // 初始化一筆（不假設 id 型別，先嘗試不帶 id）
      const initRow: any = { bulletin: '', countdown_enabled: false, countdown_minutes: 20 }
      let created: any = null
      try {
        const res = await supabase.from('app_settings').insert(initRow).select('*').maybeSingle()
        if (res.error) throw res.error
        created = res.data
      } catch (e1: any) {
        // 退而求其次：嘗試 id=1
        try {
          const res2 = await supabase.from('app_settings').insert({ id: 1, ...initRow }).select('*').maybeSingle()
          if (res2.error) throw res2.error
          created = res2.data
        } catch (e2: any) {
          // 再退一步：嘗試 id='default'
          const res3 = await supabase.from('app_settings').insert({ id: 'default', ...initRow }).select('*').maybeSingle()
          if (res3.error) throw res3.error
          created = res3.data
        }
      }
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
    if ('autoDispatchEnabled' in patch) row.auto_dispatch_enabled = (patch as any).autoDispatchEnabled
    if ('autoDispatchMinScore' in patch) row.auto_dispatch_min_score = (patch as any).autoDispatchMinScore
    if ('reviewBonusPoints' in patch) row.review_bonus_points = (patch as any).reviewBonusPoints

    // 先查是否已有設定列（不假設 id 型別）
    const { data: existing, error: readErr } = await supabase.from('app_settings').select('id').limit(1).maybeSingle()
    if (readErr) throw readErr

    if (existing && typeof existing.id !== 'undefined') {
      // 以現有 id 更新
      const { error: updErr } = await supabase.from('app_settings').update(row).eq('id', existing.id)
      if (updErr) throw updErr
    } else {
      // 新增：分三段嘗試，避免型別不符
      let insErr: any = null
      try {
        const r1 = await supabase.from('app_settings').insert(row)
        if (r1.error) throw r1.error
      } catch (e1: any) {
        insErr = e1
        try {
          const r2 = await supabase.from('app_settings').insert({ id: 1, ...row })
          if (r2.error) throw r2.error
          insErr = null
        } catch (e2: any) {
          insErr = e2
          const r3 = await supabase.from('app_settings').insert({ id: 'default', ...row })
          if (r3.error) throw r3.error
          insErr = null
        }
      }
      if (insErr) throw insErr
    }

    // 回讀最新一筆
    const { data, error } = await supabase.from('app_settings').select('*').limit(1).maybeSingle()
    if (error) throw error
    return fromRow(data)
  }
}

export const settingsRepo: SettingsRepo = new SupabaseSettingsRepo()


