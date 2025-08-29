import type { CustomerRepo, Customer } from '../../core/repository'

class LocalCustomerRepo implements CustomerRepo {
  private readonly key = 'local-customers'

  private load(): Customer[] {
    try {
      const saved = localStorage.getItem(this.key)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  }
  private save(rows: Customer[]) { localStorage.setItem(this.key, JSON.stringify(rows)) }

  async list(): Promise<Customer[]> { return this.load() }
  async get(id: string): Promise<Customer | null> { return this.load().find(c => c.id === id) || null }
  async upsert(customer: Omit<Customer, 'id' | 'updatedAt'> & { id?: string }): Promise<Customer> {
    const rows = this.load()
    const now = new Date().toISOString()
    const id = customer.id || `CUS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const next: Customer = { ...customer, id, updatedAt: now }
    const idx = rows.findIndex(r => r.id === id)
    if (idx >= 0) rows[idx] = next
    else rows.unshift(next)
    this.save(rows)
    return next
  }
  async remove(id: string): Promise<void> { this.save(this.load().filter(r => r.id !== id)) }
}

export const customerRepo = new LocalCustomerRepo()


