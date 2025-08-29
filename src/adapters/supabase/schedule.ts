import type { ScheduleRepo, SupportShift, TechnicianLeave, TechnicianWork } from '../../core/repository'
import { supabase } from '../../utils/supabase'

function fromSupportRow(r: any): SupportShift {
  return {
    id: r.id,
    supportEmail: r.support_email || r.supportEmail,
    date: (r.date || '').slice(0, 10),
    slot: r.slot,
    reason: r.reason || undefined,
    color: r.color || undefined,
    updatedAt: r.updated_at || new Date().toISOString(),
  }
}

function toSupportRow(p: Partial<SupportShift>): any {
  const r: any = { ...p }
  const out: any = {}
  if ('id' in r) out.id = r.id
  if ('supportEmail' in r) out.support_email = (r as any).supportEmail
  if ('date' in r) out.date = r.date
  if ('slot' in r) out.slot = r.slot
  if ('reason' in r) out.reason = r.reason
  if ('color' in r) out.color = r.color
  return out
}

function fromLeaveRow(r: any): TechnicianLeave {
  return {
    id: r.id,
    technicianEmail: r.technician_email || r.technicianEmail,
    date: (r.date || '').slice(0, 10),
    fullDay: !!(r.full_day ?? r.fullDay ?? true),
    startTime: r.start_time || r.startTime,
    endTime: r.end_time || r.endTime,
    reason: r.reason || undefined,
    color: r.color || undefined,
    updatedAt: r.updated_at || new Date().toISOString(),
  }
}

function toLeaveRow(p: Partial<TechnicianLeave>): any {
  const r: any = { ...p }
  const out: any = {}
  if ('id' in r) out.id = r.id
  if ('technicianEmail' in r) out.technician_email = (r as any).technicianEmail
  if ('date' in r) out.date = r.date
  if ('fullDay' in r) out.full_day = (r as any).fullDay
  if ('startTime' in r) out.start_time = (r as any).startTime
  if ('endTime' in r) out.end_time = (r as any).endTime
  if ('reason' in r) out.reason = r.reason
  if ('color' in r) out.color = r.color
  return out
}

function fromWorkRow(r: any): TechnicianWork {
  return {
    id: r.id,
    technicianEmail: r.technician_email || r.technicianEmail,
    date: (r.date || '').slice(0, 10),
    startTime: r.start_time || r.startTime,
    endTime: r.end_time || r.endTime,
    orderId: r.order_id || r.orderId,
    quantityLabel: r.quantity_label || r.quantityLabel,
    color: r.color || undefined,
    updatedAt: r.updated_at || new Date().toISOString(),
  }
}

function toWorkRow(p: Partial<TechnicianWork>): any {
  const r: any = { ...p }
  const out: any = {}
  if ('id' in r) out.id = r.id
  if ('technicianEmail' in r) out.technician_email = (r as any).technicianEmail
  if ('date' in r) out.date = r.date
  if ('startTime' in r) out.start_time = (r as any).startTime
  if ('endTime' in r) out.end_time = (r as any).endTime
  if ('orderId' in r) out.order_id = (r as any).orderId
  if ('quantityLabel' in r) out.quantity_label = (r as any).quantityLabel
  if ('color' in r) out.color = r.color
  return out
}

class SupabaseScheduleRepo implements ScheduleRepo {
  async listSupport(range?: { start: string; end: string }): Promise<SupportShift[]> {
    let query = supabase.from('support_shifts').select('*')
    if (range) query = query.gte('date', range.start).lte('date', range.end)
    const { data, error } = await query.order('date', { ascending: true })
    if (error) throw error
    return (data || []).map(fromSupportRow)
  }

  async saveSupportShift(shift: Omit<SupportShift, 'id' | 'updatedAt'> & { id?: string }): Promise<SupportShift> {
    const now = new Date().toISOString()
    if (shift.id) {
      const { data, error } = await supabase
        .from('support_shifts')
        .update({ ...toSupportRow(shift), updated_at: now })
        .eq('id', shift.id)
        .select()
        .single()
      if (error) throw error
      return fromSupportRow(data)
    }
    const genId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : `SS-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
    const { data, error } = await supabase
      .from('support_shifts')
      .insert({ id: genId, ...toSupportRow(shift), updated_at: now })
      .select()
      .single()
    if (error) throw error
    return fromSupportRow(data)
  }

  async listTechnicianLeaves(range?: { start: string; end: string }): Promise<TechnicianLeave[]> {
    let query = supabase.from('technician_leaves').select('*')
    if (range) query = query.gte('date', range.start).lte('date', range.end)
    const { data, error } = await query.order('date', { ascending: true })
    if (error) throw error
    return (data || []).map(fromLeaveRow)
  }

  async saveTechnicianLeave(leave: Omit<TechnicianLeave, 'id' | 'updatedAt'> & { id?: string }): Promise<TechnicianLeave> {
    const now = new Date().toISOString()
    if (leave.id) {
      const { data, error } = await supabase
        .from('technician_leaves')
        .update({ ...toLeaveRow(leave), updated_at: now })
        .eq('id', leave.id)
        .select()
        .single()
      if (error) throw error
      return fromLeaveRow(data)
    }
    const genId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : `TL-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
    const { data, error } = await supabase
      .from('technician_leaves')
      .insert({ id: genId, ...toLeaveRow(leave), updated_at: now })
      .select()
      .single()
    if (error) throw error
    return fromLeaveRow(data)
  }

  async listWork(range?: { start: string; end: string }, technicianEmail?: string): Promise<TechnicianWork[]> {
    let query = supabase.from('technician_work').select('*')
    if (range) query = query.gte('date', range.start).lte('date', range.end)
    if (technicianEmail) query = query.eq('technician_email', technicianEmail)
    const { data, error } = await query.order('date', { ascending: true })
    if (error) throw error
    return (data || []).map(fromWorkRow)
  }

  async saveWork(work: Omit<TechnicianWork, 'id' | 'updatedAt'> & { id?: string }): Promise<TechnicianWork> {
    const now = new Date().toISOString()
    if (work.id) {
      const { data, error } = await supabase
        .from('technician_work')
        .update({ ...toWorkRow(work), updated_at: now })
        .eq('id', work.id)
        .select()
        .single()
      if (error) throw error
      return fromWorkRow(data)
    }
    const genId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : `TW-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
    const { data, error } = await supabase
      .from('technician_work')
      .insert({ id: genId, ...toWorkRow(work), updated_at: now })
      .select()
      .single()
    if (error) throw error
    return fromWorkRow(data)
  }

  async removeWork(id: string): Promise<void> {
    const { error } = await supabase.from('technician_work').delete().eq('id', id)
    if (error) throw error
  }
}

export const scheduleRepo = new SupabaseScheduleRepo()


