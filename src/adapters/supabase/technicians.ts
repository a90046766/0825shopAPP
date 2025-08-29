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
    skills: r.skills || {},
    updatedAt: r.updated_at || new Date().toISOString(),
  }
}

function toDb(patch: Partial<Technician>): any {
  const r: any = { ...patch }
  if ('shortName' in r) r.short_name = (r as any).shortName
  if ('revenueShareScheme' in r) r.revenue_share_scheme = (r as any).revenueShareScheme
  if ('updatedAt' in r) delete (r as any).updatedAt
  return r
}

async function generateNextCode(): Promise<string> {
  const { data } = await supabase.from('technicians').select('code')
  const nums = (data || [])
    .map((x: any) => String(x.code || ''))
    .map((c: string) => (c.startsWith('SR') ? parseInt(c.slice(2), 10) : NaN))
    .filter((n: number) => !isNaN(n))
  const next = (nums.length ? Math.max(...nums) : 100) + 1
  return `SR${next}`
}

const TECH_COLUMNS = 'id,code,name,short_name,email,phone,region,status,points,revenue_share_scheme,skills,updated_at'

class SupabaseTechnicianRepo implements TechnicianRepo {
  async list(): Promise<Technician[]> {
    const { data, error } = await supabase
      .from('technicians')
      .select(TECH_COLUMNS)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return (data || []).map(fromDb)
  }

  async upsert(tech: Omit<Technician, 'id' | 'updatedAt' | 'code'> & { id?: string }): Promise<Technician> {
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
    const code = await generateNextCode()
    const genId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : undefined
    const payload = { id: genId, ...toDb(tech), code, updated_at: now }
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
  }
  async approve(id: string): Promise<void> {
    const { error } = await supabase.from('technician_applications').update({ status: 'approved' }).eq('id', id)
    if (error) throw error
  }
  async reject(id: string): Promise<void> {
    const { error } = await supabase.from('technician_applications').update({ status: 'rejected' }).eq('id', id)
    if (error) throw error
  }
}

export const technicianApplicationRepo: TechnicianApplicationRepo = new SupabaseTechnicianApplicationRepo()


