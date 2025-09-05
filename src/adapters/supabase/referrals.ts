import { supabase } from '../../utils/supabase'

export type ReferralEvent = {
  id?: string
  refCode: string
  refRole: 'member' | 'technician' | 'sales' | 'staff' | 'unknown'
  referredEmail?: string
  referredPhone?: string
  referredMemberId?: string
  channel?: 'qr' | 'link' | 'other'
  createdAt?: string
}

export const referralRepo = {
  async log(ev: ReferralEvent): Promise<void> {
    try {
      const row: any = {
        ref_code: ev.refCode,
        ref_role: ev.refRole,
        referred_email: ev.referredEmail || null,
        referred_phone: ev.referredPhone || null,
        referred_member_id: ev.referredMemberId || null,
        channel: ev.channel || 'qr'
      }
      const { error } = await supabase.from('referrals').insert(row)
      if (error) throw error
    } catch (e) {
      // 表不存在或權限問題時，先忽略不阻斷流程
      console.warn('referralRepo.log failed (non-blocking):', (e as any)?.message || e)
    }
  },

  async listAll(): Promise<ReferralEvent[]> {
    try {
      const { data, error } = await supabase.from('referrals').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return (data || []).map((r: any) => ({
        id: r.id,
        refCode: r.ref_code,
        refRole: r.ref_role,
        referredEmail: r.referred_email || undefined,
        referredPhone: r.referred_phone || undefined,
        referredMemberId: r.referred_member_id || undefined,
        channel: r.channel || 'qr',
        createdAt: r.created_at
      }))
    } catch {
      return []
    }
  },

  async listTop(): Promise<Array<{ refCode: string; refRole: string; count: number }>> {
    const all = await this.listAll()
    const map: Record<string, { code: string; role: string; count: number }> = {}
    for (const r of all) {
      const k = `${r.refRole}|${r.refCode}`
      if (!map[k]) map[k] = { code: r.refCode, role: r.refRole, count: 0 }
      map[k].count += 1
    }
    return Object.values(map).sort((a, b) => b.count - a.count)
  }
}


