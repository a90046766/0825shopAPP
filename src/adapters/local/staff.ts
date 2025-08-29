import type { StaffRepo, Staff, StaffApplicationRepo, StaffApplication } from '../../core/repository'

class LocalStaffRepo implements StaffRepo {
  private readonly storageKey = 'local-staff-data'

  private loadData(): Staff[] {
    try {
      const saved = localStorage.getItem(this.storageKey)
      return saved ? JSON.parse(saved) : this.getInitialData()
    } catch {
      return this.getInitialData()
    }
  }

  private saveData(data: Staff[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(data))
  }

  private getInitialData(): Staff[] {
    return [
      {
        id: 'STF-001',
        name: '洗小濯',
        shortName: '小濯',
        email: 'xiaofu888@yahoo.com.tw',
        phone: '0986985725',
        role: 'support',
        status: 'active',
        updatedAt: new Date().toISOString()
      }
    ]
  }

  async list(): Promise<Staff[]> {
    return this.loadData()
  }

  async upsert(staff: Omit<Staff, 'id' | 'updatedAt'>): Promise<Staff> {
    const data = this.loadData()
    const existing = data.find(s => s.email.toLowerCase() === staff.email.toLowerCase())
    
    if (existing) {
      // 更新現有
      const updated = {
        ...existing,
        ...staff,
        // 保留既有 refCode 與 points，除非外部有提供新值
        refCode: existing.refCode || this.nextSalesCode(data, staff.role),
        points: staff.points !== undefined ? staff.points : existing.points,
        updatedAt: new Date().toISOString()
      }
      const newData = data.map(s => s.id === existing.id ? updated : s)
      this.saveData(newData)
      return updated
    } else {
      // 新增
      const newStaff: Staff = {
        id: `STF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        ...staff,
        refCode: this.nextSalesCode(data, staff.role),
        updatedAt: new Date().toISOString()
      }
      this.saveData([...data, newStaff])
      return newStaff
    }
  }

  private nextSalesCode(rows: Staff[], role: Staff['role']): string | undefined {
    if (role !== 'sales') return undefined
    const used = new Set(rows.filter(r => r.refCode).map(r => r.refCode as string))
    let num = 100
    while (used.has(`SE${num}`)) num++
    return `SE${num}`
  }

  async remove(id: string): Promise<void> {
    const data = this.loadData()
    this.saveData(data.filter(s => s.id !== id))
  }

  async resetPassword(id: string): Promise<void> {
    // 本機模式：模擬重設密碼（實際上不做任何事）
    console.log(`模擬重設密碼：${id}`)
  }
}

export const staffRepo = new LocalStaffRepo()

class LocalStaffApplicationRepo implements StaffApplicationRepo {
  private readonly key = 'local-staff-apps'
  private load(): StaffApplication[] { try { const s = localStorage.getItem(this.key); return s ? JSON.parse(s) : [] } catch { return [] } }
  private save(rows: StaffApplication[]) { localStorage.setItem(this.key, JSON.stringify(rows)) }
  async listPending(): Promise<StaffApplication[]> { return this.load().filter(a=>a.status==='pending') }
  async submit(app: Omit<StaffApplication, 'id' | 'status' | 'appliedAt'>): Promise<void> {
    const rows = this.load(); const now = new Date().toISOString()
    const obj: StaffApplication = { id:`SAP-${Math.random().toString(36).slice(2,9).toUpperCase()}`, status:'pending', appliedAt: now, ...app }
    this.save([obj, ...rows])
  }
  async approve(id: string): Promise<void> { const rows=this.load(); const idx=rows.findIndex(r=>r.id===id); if(idx<0) return; rows[idx].status='approved'; this.save(rows) }
  async reject(id: string): Promise<void> { const rows=this.load(); const idx=rows.findIndex(r=>r.id===id); if(idx<0) return; rows[idx].status='rejected'; this.save(rows) }
}

export const staffApplicationRepo = new LocalStaffApplicationRepo()
