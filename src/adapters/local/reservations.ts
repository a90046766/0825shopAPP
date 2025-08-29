import type { ReservationsRepo, ReservationOrder } from '../../core/repository'

class LocalReservationsRepo implements ReservationsRepo {
  private readonly key = 'local-reservations'
  private load(): ReservationOrder[] { try { const s = localStorage.getItem(this.key); return s ? JSON.parse(s) : [] } catch { return [] } }
  private save(rows: ReservationOrder[]) { localStorage.setItem(this.key, JSON.stringify(rows)) }

  async list(): Promise<ReservationOrder[]> { return this.load() }
  async get(id: string): Promise<ReservationOrder | null> { return this.load().find(r => r.id === id) || null }
  async create(draft: Omit<ReservationOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReservationOrder> {
    const rows = this.load()
    const obj: ReservationOrder = { id: `RSV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...draft }
    rows.unshift(obj)
    this.save(rows)
    return obj
  }
  async update(id: string, patch: Partial<ReservationOrder>): Promise<void> {
    const rows = this.load()
    const idx = rows.findIndex(r => r.id === id)
    if (idx < 0) return
    rows[idx] = { ...rows[idx], ...patch, updatedAt: new Date().toISOString() }
    this.save(rows)
  }
}

export const reservationsRepo = new LocalReservationsRepo()


