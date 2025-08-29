import type { MemberRepo, Member } from '../../core/repository'
import { supabase } from '../../utils/supabase'
import type { MemberApplicationRepo, MemberApplication } from '../../core/repository'

function fromRow(r: any): Member {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    email: r.email,
    phone: r.phone,
    addresses: r.addresses || [],
    referrerType: r.referrer_type,
    referrerCode: r.referrer_code,
    points: r.points || 0,
    updatedAt: r.updated_at || new Date().toISOString(),
  }
}

class SupabaseMemberRepo implements MemberRepo {
  async list(): Promise<Member[]> {
    const { data, error } = await supabase.from('members').select('*').order('updated_at', { ascending: false })
    if (error) throw error
    return (data || []).map(fromRow)
  }
  async get(id: string): Promise<Member | null> {
    const { data, error } = await supabase.from('members').select('*').eq('id', id).single()
    if (error) return null
    return data ? fromRow(data) : null
  }
  async findByCode(code: string): Promise<Member | null> {
    const { data, error } = await supabase.from('members').select('*').eq('code', code).single()
    if (error) return null
    return data ? fromRow(data) : null
  }
  async findByEmail(email: string): Promise<Member | null> {
    const { data, error } = await supabase.from('members').select('*').eq('email', email).single()
    if (error) return null
    return data ? fromRow(data) : null
  }
  async create(draft: Omit<Member, 'id' | 'updatedAt' | 'points' | 'code'>): Promise<Member> {
    const now = new Date().toISOString()
    const row: any = { ...draft, updated_at: now, points: 0 }
    // 生成 MOxxxx
    row.code = `MO${String(Math.floor(Math.random()*9000)+1000)}`
    const { data, error } = await supabase.from('members').insert(row).select().single()
    if (error) throw error
    return fromRow(data)
  }
  async upsert(member: Omit<Member, 'updatedAt'>): Promise<Member> {
    const now = new Date().toISOString()
    const row: any = { ...member, updated_at: now }
    const { data, error } = await supabase.from('members').upsert(row).select().single()
    if (error) throw error
    return fromRow(data)
  }
}

export const memberRepo: MemberRepo = new SupabaseMemberRepo()

// Member applications (for approvals)
function fromMemberAppRow(r: any): MemberApplication {
  return { id: r.id, name: r.name, email: r.email || undefined, phone: r.phone || undefined, referrerCode: r.referrer_code || undefined, status: r.status, appliedAt: r.applied_at }
}

class SupabaseMemberApplicationRepo implements MemberApplicationRepo {
  async listPending(): Promise<MemberApplication[]> {
    const { data, error } = await supabase.from('member_applications').select('*').eq('status','pending').order('applied_at',{ ascending: false })
    if (error) throw error
    return (data || []).map(fromMemberAppRow)
  }
  async submit(app: Omit<MemberApplication, 'id' | 'status' | 'appliedAt'>): Promise<void> {
    const { error } = await supabase.from('member_applications').insert({ name: app.name, email: app.email, phone: app.phone, referrer_code: app.referrerCode, status: 'pending' })
    if (error) throw error
  }
  async approve(id: string): Promise<void> {
    const { error } = await supabase.from('member_applications').update({ status: 'approved' }).eq('id', id)
    if (error) throw error
  }
  async reject(id: string): Promise<void> {
    const { error } = await supabase.from('member_applications').update({ status: 'rejected' }).eq('id', id)
    if (error) throw error
  }
}

export const memberApplicationRepo: MemberApplicationRepo = new SupabaseMemberApplicationRepo()


