import type { TechnicianRepo, Technician, TechnicianApplicationRepo, TechnicianApplication } from '../../core/repository'
import { supabase } from '../../utils/supabase'

function fromDb(row: any): Technician {
  const r = row || {}
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    shortName: r.short_name || r.shortName,
    email: r.email,
    phone: r.phone || undefined,
    region: r.region,
    status: r.status,
    points: r.points ?? 0,
    revenueShareScheme: r.revenue_share_scheme || r.revenueShareScheme,
    customCommission: typeof r.custom_commission === 'number' ? r.custom_commission : undefined,
    customCalcNote: r.custom_calc_note || undefined,
    rating_override: typeof r.rating_override === 'number' ? r.rating_override : undefined,
    skills: r.skills || {},
    // @ts-ignore
    tempContact: r.temp_contact || undefined,
    updatedAt: r.updated_at || new Date().toISOString(),
  }
}

function toDb(patch: Partial<Technician>): any {
  const r: any = { ...patch }
  if ('shortName' in r) { r.short_name = (r as any).shortName; delete (r as any).shortName }
  if ('revenueShareScheme' in r) { r.revenue_share_scheme = (r as any).revenueShareScheme; delete (r as any).revenueShareScheme }
  if ('customCommission' in r) { r.custom_commission = (r as any).customCommission; delete (r as any).customCommission }
  if ('customCalcNote' in r) { r.custom_calc_note = (r as any).customCalcNote; delete (r as any).customCalcNote }
  if ('tempContact' in r) { r.temp_contact = (r as any).tempContact; delete (r as any).tempContact }
  if ('updatedAt' in r) delete (r as any).updatedAt
  return r
}

function randomJump(start = 100, maxJump = 37): number {
  const base = Math.max(start, 100)
  const jump = Math.floor(Math.random() * maxJump) + 1
  return base + jump + Math.floor(Math.random() * 50)
}

async function generateNextCode(): Promise<string> {
  const { data } = await supabase.from('technicians').select('code')
  const nums = (data || [])
    .map((x: any) => String(x.code || ''))
    .map((c: string) => (c.startsWith('SR') ? parseInt(c.slice(2), 10) : NaN))
    .filter((n: number) => !isNaN(n))
  const seed = nums.length ? Math.max(...nums) : 100
  const next = randomJump(seed, 53)
  return `SR${next}`
}

const TECH_COLUMNS = 'id,code,name,short_name,email,phone,region,status,points,revenue_share_scheme,custom_commission,custom_calc_note,rating_override,skills,temp_contact,updated_at'

class SupabaseTechnicianRepo implements TechnicianRepo {
  async list(): Promise<Technician[]> {
    try {
      const { data, error } = await supabase
        .from('technicians')
        .select(TECH_COLUMNS)
        .order('updated_at', { ascending: false })
      if (error) throw error
      const rows = (data || []).map(fromDb)
      try { sessionStorage.setItem('cache-techs', JSON.stringify({ t: Date.now(), rows })) } catch {}
      return rows
    } catch (e) {
      // 快取備援（1 分鐘）
      try {
        const raw = sessionStorage.getItem('cache-techs')
        if (raw) {
          const { t, rows } = JSON.parse(raw)
          if (Date.now() - t < 60_000) return rows
        }
      } catch {}
      throw e
    }
  }

  async upsert(tech: Omit<Technician, 'id' | 'updatedAt'> & { id?: string }): Promise<Technician> {
    const now = new Date().toISOString()
    if (tech.id) {
      // 保持 code 不變（不可變）
      const { data: old, error: ge } = await supabase.from('technicians').select('code').eq('id', tech.id).single()
      if (ge) throw ge
      const keepCode = old?.code
      const payload = { ...toDb(tech), code: keepCode, updated_at: now }
      const { data, error } = await supabase.from('technicians').update(payload).eq('id', tech.id).select(TECH_COLUMNS).single()
      if (error) throw error
      return fromDb(data)
    }
    const code = (tech as any).code || await generateNextCode()
    // 重要：不要明傳 id，讓資料庫使用 default gen_random_uuid()
    const payload = { ...toDb(tech), code, updated_at: now } as any
    const { data, error } = await supabase.from('technicians').insert(payload).select(TECH_COLUMNS).single()
    if (error) throw error
    return fromDb(data)
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('technicians').delete().eq('id', id)
    if (error) throw error
  }
}

export const technicianRepo = new SupabaseTechnicianRepo()

function fromTechAppRow(r: any): TechnicianApplication {
  return { id: r.id, name: r.name, shortName: r.short_name || undefined, email: r.email, phone: r.phone, region: r.region, status: r.status, appliedAt: r.applied_at }
}

class SupabaseTechnicianApplicationRepo implements TechnicianApplicationRepo {
  async listPending(): Promise<TechnicianApplication[]> {
    const { data, error } = await supabase.from('technician_applications').select('*').eq('status','pending').order('applied_at',{ ascending: false })
    if (error) throw error
    return (data || []).map(fromTechAppRow)
  }
  async submit(app: Omit<TechnicianApplication, 'id' | 'status' | 'appliedAt'>): Promise<void> {
    const now = new Date().toISOString()
    const { error } = await supabase.from('technician_applications').insert({ name: app.name, short_name: app.shortName, email: app.email, phone: app.phone, region: app.region, status: 'pending', applied_at: now })
    if (error) throw error
    // 小鈴鐺：技師申請待審核
    try {
      await supabase.from('notifications').insert({
        title: '技師申請（待審核）',
        body: `申請人：${app.name}（${app.email}）` ,
        level: 'info',
        target: 'support',
        channel: 'approvals',
        created_at: new Date().toISOString(),
        sent_at: new Date().toISOString()
      } as any)
    } catch {}
  }
  async approve(id: string): Promise<void> {
    // 1) 讀取申請資料
    const { data: app, error: ge } = await supabase.from('technician_applications').select('*').eq('id', id).maybeSingle()
    if (ge) throw ge
    if (!app) throw new Error('找不到申請資料')

    // 2) 先查是否已存在相同 Email 技師，存在則更新啟用；否則建立新技師
    const { data: existing, error: fe } = await supabase
      .from('technicians')
      .select('id, code')
      .eq('email', app.email)
      .maybeSingle()
    if (fe) throw fe

    const repo = new SupabaseTechnicianRepo()
    if (existing) {
      await repo.upsert({
        id: existing.id,
        code: existing.code,
        name: app.name,
        shortName: app.short_name || undefined,
        email: app.email,
        phone: app.phone || undefined,
        region: app.region || 'all',
        status: 'active',
        skills: {},
        revenueShareScheme: undefined as any
      } as any)
    } else {
      await repo.upsert({
        name: app.name,
        shortName: app.short_name || undefined,
        email: app.email,
        phone: app.phone || undefined,
        region: app.region || 'all',
        status: 'active',
        skills: {},
        revenueShareScheme: undefined as any
      } as any)
    }

    // 3) 標記通過
    const { error } = await supabase.from('technician_applications').update({ status: 'approved' }).eq('id', id)
    if (error) throw error
  }
  async reject(id: string): Promise<void> {
    const { error } = await supabase.from('technician_applications').update({ status: 'rejected' }).eq('id', id)
    if (error) throw error
  }
}

export const technicianApplicationRepo: TechnicianApplicationRepo = new SupabaseTechnicianApplicationRepo()


