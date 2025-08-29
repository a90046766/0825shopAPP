import type { PayrollRepo, PayrollRecord, User } from '../../core/repository'

class LocalPayrollRepo implements PayrollRepo {
  private readonly key = 'local-payroll'
  private load(): PayrollRecord[] { try { const s = localStorage.getItem(this.key); return s ? JSON.parse(s) : [] } catch { return [] } }
  private save(rows: PayrollRecord[]) { localStorage.setItem(this.key, JSON.stringify(rows)) }

  async list(user?: User): Promise<PayrollRecord[]> {
    const rows = this.load()
    if (!user) return rows
    return rows.filter(r => r.userEmail.toLowerCase() === user.email.toLowerCase())
  }
  
  async get(id: string): Promise<PayrollRecord | null> {
    const rows = this.load()
    return rows.find(r => r.id === id) || null
  }
  
  async getByUserAndMonth(userEmail: string, month: string): Promise<PayrollRecord | null> {
    const rows = this.load()
    return rows.find(r => r.userEmail === userEmail && r.month === month) || null
  }
  
  async upsert(record: Omit<PayrollRecord, 'id' | 'updatedAt'> & { id?: string }): Promise<PayrollRecord> {
    const rows = this.load()
    const id = record.id || `PYR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const next: PayrollRecord = { ...record, id, updatedAt: new Date().toISOString() }
    const idx = rows.findIndex(r => r.id === id)
    if (idx >= 0) rows[idx] = next
    else rows.unshift(next)
    this.save(rows)
    return next
  }
  
  async remove(id: string): Promise<void> { 
    this.save(this.load().filter(r => r.id !== id)) 
  }
  
  async bulkUpdate(records: Array<{ id: string; patch: Partial<PayrollRecord> }>): Promise<void> {
    const rows = this.load()
    records.forEach(({ id, patch }) => {
      const idx = rows.findIndex(r => r.id === id)
      if (idx >= 0) {
        rows[idx] = { ...rows[idx], ...patch, updatedAt: new Date().toISOString() }
      }
    })
    this.save(rows)
  }
  
  async calculatePayroll(userEmail: string, month: string): Promise<PayrollRecord> {
    // 簡單的薪資計算邏輯
    const existing = await this.getByUserAndMonth(userEmail, month)
    if (existing) return existing
    
    const newRecord: PayrollRecord = {
      id: `PYR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      userEmail,
      userName: '',
      employeeId: '',
      month,
      baseSalary: 0,
      bonus: 0,
      points: 0,
      pointsMode: 'accumulate',
      allowances: { fuel: 0, overtime: 0, holiday: 0, duty: 0 },
      deductions: { leave: 0, tardiness: 0, complaints: 0, repairCost: 0 },
      bonusRate: 10,
      platform: '同',
      status: 'pending',
      updatedAt: new Date().toISOString()
    }
    
    return await this.upsert(newRecord)
  }
}

export const payrollRepo = new LocalPayrollRepo()


