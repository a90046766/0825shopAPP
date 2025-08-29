import type { PayrollRepo, PayrollRecord, User } from '../../core/repository'
import { supabase } from '../../utils/supabase'

function fromRow(r: any): PayrollRecord {
  return {
    id: r.id,
    userEmail: r.user_email,
    userName: r.user_name || '',
    employeeId: r.employee_id || '',
    month: r.month,
    baseSalary: r.base_salary ?? undefined,
    bonus: r.bonus ?? undefined,
    revenueShareRate: r.revenue_share_rate ?? undefined,
    total: r.total ?? undefined,
    breakdown: r.breakdown ?? undefined,
    points: r.points ?? undefined,
    pointsMode: r.points_mode ?? 'accumulate',
    allowances: r.allowances ?? undefined,
    deductions: r.deductions ?? undefined,
    bonusRate: r.bonus_rate ?? undefined,
    platform: r.platform ?? '同',
    issuanceDate: r.issuance_date ?? undefined,
    status: r.status ?? 'pending',
    updatedAt: r.updated_at || new Date().toISOString(),
  }
}

function toRow(p: Partial<PayrollRecord>): any {
  const r: any = { ...p }
  if ('userEmail' in r) r.user_email = (r as any).userEmail
  if ('userName' in r) r.user_name = (r as any).userName
  if ('employeeId' in r) r.employee_id = (r as any).employeeId
  if ('baseSalary' in r) r.base_salary = (r as any).baseSalary
  if ('revenueShareRate' in r) r.revenue_share_rate = (r as any).revenueShareRate
  if ('pointsMode' in r) r.points_mode = (r as any).pointsMode
  if ('bonusRate' in r) r.bonus_rate = (r as any).bonusRate
  if ('issuanceDate' in r) r.issuance_date = (r as any).issuanceDate
  if ('updatedAt' in r) delete (r as any).updatedAt
  return r
}

class SupabasePayrollRepo implements PayrollRepo {
  async list(user?: User): Promise<PayrollRecord[]> {
    let query = supabase.from('payroll_records').select('*')
    if (user && user.role !== 'admin') query = query.eq('user_email', user.email)
    const { data, error } = await query.order('month', { ascending: false })
    if (error) throw error
    return (data || []).map(fromRow)
  }

  async get(id: string): Promise<PayrollRecord | null> {
    const { data, error } = await supabase
      .from('payroll_records')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return fromRow(data)
  }

  async getByUserAndMonth(userEmail: string, month: string): Promise<PayrollRecord | null> {
    const { data, error } = await supabase
      .from('payroll_records')
      .select('*')
      .eq('user_email', userEmail)
      .eq('month', month)
      .single()
    if (error) return null
    return fromRow(data)
  }

  async upsert(record: Omit<PayrollRecord, 'id' | 'updatedAt'> & { id?: string }): Promise<PayrollRecord> {
    const now = new Date().toISOString()
    if (record.id) {
      const { data, error } = await supabase
        .from('payroll_records')
        .update({ ...toRow(record), updated_at: now })
        .eq('id', record.id)
        .select()
        .single()
      if (error) throw error
      return fromRow(data)
    }
    const { data, error } = await supabase
      .from('payroll_records')
      .insert({ ...toRow(record), updated_at: now })
      .select()
      .single()
    if (error) throw error
    return fromRow(data)
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('payroll_records').delete().eq('id', id)
    if (error) throw error
  }

  async bulkUpdate(records: Array<{ id: string; patch: Partial<PayrollRecord> }>): Promise<void> {
    const updates = records.map(({ id, patch }) => ({
      id,
      ...toRow(patch),
      updated_at: new Date().toISOString()
    }))
    
    const { error } = await supabase
      .from('payroll_records')
      .upsert(updates)
    if (error) throw error
  }

  async calculatePayroll(userEmail: string, month: string): Promise<PayrollRecord> {
    const existing = await this.getByUserAndMonth(userEmail, month)
    if (existing) return existing
    
    const newRecord: PayrollRecord = {
      id: '',
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

export const payrollRepo: PayrollRepo = new SupabasePayrollRepo()


