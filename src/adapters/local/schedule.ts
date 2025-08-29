import type { ScheduleRepo, SupportShift, TechnicianLeave, TechnicianWork } from '../../core/repository'

class LocalScheduleRepo implements ScheduleRepo {
  private readonly supportKey = 'local-support-shifts'
  private readonly techLeaveKey = 'local-technician-leaves'
  private readonly workKey = 'local-technician-work'

  private load<T>(key: string, fallback: T): T {
    try {
      const saved = localStorage.getItem(key)
      return saved ? (JSON.parse(saved) as T) : fallback
    } catch {
      return fallback
    }
  }

  private save<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value))
  }

  async listSupport(range?: { start: string; end: string }): Promise<SupportShift[]> {
    const rows = this.load<SupportShift[]>(this.supportKey, [])
    if (!range) return rows
    return rows.filter(r => r.date >= range.start && r.date <= range.end)
  }

  async saveSupportShift(shift: Omit<SupportShift, 'id' | 'updatedAt'> & { id?: string }): Promise<SupportShift> {
    const rows = this.load<SupportShift[]>(this.supportKey, [])
    const now = new Date().toISOString()
    // 禁改過去日期
    try {
      const today = new Date(); const d = new Date(shift.date + 'T00:00:00')
      if (d.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
        throw new Error('不可異動過去日期')
      }
    } catch {}
    const id = shift.id || `SS-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
    const next: SupportShift = { ...shift, id, updatedAt: now }
    const idx = rows.findIndex(r => r.id === id)
    if (idx >= 0) rows[idx] = next
    else rows.push(next)
    this.save(this.supportKey, rows)
    return next
  }

  async listTechnicianLeaves(range?: { start: string; end: string }): Promise<TechnicianLeave[]> {
    const rows = this.load<TechnicianLeave[]>(this.techLeaveKey, [])
    if (!range) return rows
    return rows.filter(r => r.date >= range.start && r.date <= range.end)
  }

  async saveTechnicianLeave(leave: Omit<TechnicianLeave, 'id' | 'updatedAt'> & { id?: string }): Promise<TechnicianLeave> {
    const rows = this.load<TechnicianLeave[]>(this.techLeaveKey, [])
    const now = new Date().toISOString()
    // 禁改過去日期
    try {
      const today = new Date(); const d = new Date(leave.date + 'T00:00:00')
      if (d.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
        throw new Error('不可異動過去日期')
      }
    } catch {}
    const id = leave.id || `TL-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
    const next: TechnicianLeave = { ...leave, id, updatedAt: now }
    const idx = rows.findIndex(r => r.id === id)
    if (idx >= 0) rows[idx] = next
    else rows.push(next)
    this.save(this.techLeaveKey, rows)
    return next
  }

  async listWork(range?: { start: string; end: string }, technicianEmail?: string): Promise<TechnicianWork[]> {
    const rows = this.load<TechnicianWork[]>(this.workKey, [])
    let filtered = rows
    if (range) filtered = filtered.filter(r => r.date >= range.start && r.date <= range.end)
    if (technicianEmail) filtered = filtered.filter(r => r.technicianEmail.toLowerCase() === technicianEmail.toLowerCase())
    return filtered
  }

  async saveWork(work: Omit<TechnicianWork, 'id' | 'updatedAt'> & { id?: string }): Promise<TechnicianWork> {
    const rows = this.load<TechnicianWork[]>(this.workKey, [])
    const now = new Date().toISOString()
    const id = work.id || `TW-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
    const next: TechnicianWork = { ...work, id, updatedAt: now }
    const idx = rows.findIndex(r => r.id === id)
    if (idx >= 0) rows[idx] = next
    else rows.push(next)
    this.save(this.workKey, rows)
    return next
  }

  async removeWork(id: string): Promise<void> {
    const rows = this.load<TechnicianWork[]>(this.workKey, [])
    this.save(this.workKey, rows.filter(r => r.id !== id))
  }
}

export const scheduleRepo = new LocalScheduleRepo()


