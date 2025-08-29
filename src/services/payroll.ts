import { orderRepo } from '../adapters/local/orders'
import { technicianRepo } from '../adapters/local/technicians'
import type { Technician } from '../core/repository'

export interface TechnicianMonthlyPayroll {
  technician: Technician
  month: string // YYYY-MM
  serviceTotal: number
  perTechTotal: number
  scheme: Technician['revenueShareScheme']
  baseSalary: number
  bonus: number
  total: number
}

function getMonthFromString(s?: string): string | null {
  if (!s) return null
  try {
    // try ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 7)
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 7)
  } catch {}
  return null
}

export async function computeMonthlyPayroll(month: string): Promise<TechnicianMonthlyPayroll[]> {
  const allOrders = await orderRepo.list()
  const completedInMonth = allOrders.filter(o => {
    if (o.status !== 'completed') return false
    const m = getMonthFromString(o.workCompletedAt) || getMonthFromString(o.createdAt)
    return m === month
  })
  const technicians = await technicianRepo.list()
  const emailToTech: Record<string, Technician> = {}
  const nameToTech: Record<string, Technician> = {}
  const codeToTech: Record<string, Technician> = {}
  for (const t of technicians) {
    if (t.email) emailToTech[t.email.toLowerCase()] = t
    nameToTech[t.name] = t
    codeToTech[(t as any).code?.toUpperCase?.() || ''] = t
  }

  const perTechService: Record<string, number> = {}
  for (const o of completedInMonth) {
    const amount = o.serviceItems.reduce((s, it) => s + it.unitPrice * it.quantity, 0)
    const n = Math.max(1, (o.assignedTechnicians || []).length)
    const perHead = amount / n
    for (const who of (o.assignedTechnicians || ['未知'])) {
      const t = nameToTech[who]
      if (!t) continue
      perTechService[t.id] = (perTechService[t.id] || 0) + perHead
    }
  }

  const results: TechnicianMonthlyPayroll[] = []
  for (const t of technicians) {
    const perTechTotal = Math.round((perTechService[t.id] || 0))
    const scheme = t.revenueShareScheme || 'pure75'
    let baseSalary = 0
    let bonus = 0
    let total = 0
    if (scheme.startsWith('pure')) {
      const rate = Number(scheme.replace('pure', '')) / 100
      total = Math.round(perTechTotal * rate)
      baseSalary = 0
      bonus = total
    } else {
      const rateMap: Record<string, number> = { base1: 0.1, base2: 0.2, base3: 0.3 }
      const rate = rateMap[scheme] || 0.1
      baseSalary = 40000
      const over = Math.max(0, perTechTotal - baseSalary)
      bonus = Math.round(over * rate)
      total = baseSalary + bonus
    }
    results.push({ technician: t, month, serviceTotal: perTechTotal, perTechTotal, scheme, baseSalary, bonus, total })
  }
  return results
}

export function getPayoutDates(month: string): { salaryDate: string; bonusDate: string } {
  // month is YYYY-MM, payout next-month 10th/18th
  const [y, m] = month.split('-').map(Number)
  const dSalary = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 10))
  const dBonus = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 18))
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { salaryDate: fmt(dSalary), bonusDate: fmt(dBonus) }
}


