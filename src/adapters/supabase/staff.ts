import type { StaffRepo, Staff, StaffApplicationRepo, StaffApplication } from '../../core/repository'
import { supabase } from '../../utils/supabase'

function fromStaffRow(r: any): Staff {
  return {
    id: r.id,
    name: r.name,
    shortName: r.short_name || undefined,
    email: r.email,
    phone: r.phone || undefined,
    role: r.role,
    status: r.status,
    points: r.points ?? 0,
    refCode: r.ref_code || undefined,
    updatedAt: r.updated_at || new Date().toISOString(),
  } as Staff
}

function toStaffRow(p: Partial<Staff>): any {
  const r: any = { ...p }
  if ('shortName' in r) r.short_name = (r as any).shortName
  if ('refCode' in r) r.ref_code = (r as any).refCode
  if ('updatedAt' in r) delete (r as any).updatedAt
  return r
}

class SupabaseStaffRepo implements StaffRepo {
  async list(): Promise<Staff[]> {
    const { data, error } = await supabase.from('staff').select('*').order('updated_at', { ascending: false })
    if (error) throw error
    return (data || []).map(fromStaffRow)
  }

  async upsert(staff: Omit<Staff, 'id' | 'updatedAt'>): Promise<Staff> {
    const now = new Date().toISOString()
    // 以 email 唯一化
    const email = (staff.email || '').toLowerCase()
    const { data: existed } = await supabase.from('staff').select('*').eq('email', email).maybeSingle()
    if (existed) {
      const { data, error } = await supabase
        .from('staff')
        .update({ ...toStaffRow(staff), updated_at: now })
        .eq('id', existed.id)
        .select()
        .single()
      if (error) throw error
      return fromStaffRow(data)
    }
    const { data, error } = await supabase
      .from('staff')
      .insert({ ...toStaffRow(staff), updated_at: now })
      .select()
      .single()
    if (error) throw error
    return fromStaffRow(data)
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('staff').delete().eq('id', id)
    if (error) throw error
  }

  async resetPassword(id: string): Promise<void> {
    // 尚未串接 Supabase Auth；保留空實作
    console.log('resetPassword placeholder', id)
  }
}

export const staffRepo: StaffRepo = new SupabaseStaffRepo()

// Applications
function fromStaffAppRow(r: any): StaffApplication {
  return { id: r.id, name: r.name, shortName: r.short_name || undefined, email: r.email, phone: r.phone || undefined, role: r.role, status: r.status, appliedAt: r.applied_at }
}

class SupabaseStaffApplicationRepo implements StaffApplicationRepo {
  async listPending(): Promise<StaffApplication[]> {
    const { data, error } = await supabase.from('staff_applications').select('*').eq('status', 'pending').order('applied_at', { ascending: false })
    if (error) throw error
    return (data || []).map(fromStaffAppRow)
  }
  async submit(app: Omit<StaffApplication, 'id' | 'status' | 'appliedAt'>): Promise<void> {
    const now = new Date().toISOString()
    const { error } = await supabase.from('staff_applications').insert({ name: app.name, short_name: app.shortName, email: app.email, phone: app.phone, role: app.role, status: 'pending', applied_at: now })
    if (error) throw error
  }
  async approve(id: string): Promise<void> {
    const { error } = await supabase.from('staff_applications').update({ status: 'approved' }).eq('id', id)
    if (error) throw error
  }
  async reject(id: string): Promise<void> {
    const { error } = await supabase.from('staff_applications').update({ status: 'rejected' }).eq('id', id)
    if (error) throw error
  }
}

export const staffApplicationRepo: StaffApplicationRepo = new SupabaseStaffApplicationRepo()


