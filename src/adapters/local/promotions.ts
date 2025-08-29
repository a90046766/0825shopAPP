import type { PromotionsRepo, Promotion } from '../../core/repository'

class LocalPromotionsRepo implements PromotionsRepo {
  private readonly key = 'local-promotions'
  private load(): Promotion[] { try { const s = localStorage.getItem(this.key); return s ? JSON.parse(s) : [] } catch { return [] } }
  private save(rows: Promotion[]) { localStorage.setItem(this.key, JSON.stringify(rows)) }

  async list(): Promise<Promotion[]> { return this.load() }
  async upsert(item: Omit<Promotion, 'updatedAt'>): Promise<Promotion> {
    const rows = this.load()
    const now = new Date().toISOString()
    const idx = rows.findIndex(r => r.id === item.id)
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], ...item, updatedAt: now }
      this.save(rows)
      return rows[idx]
    }
    const id = (item as any).id || `PRM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const obj: Promotion = { ...(item as any), id, updatedAt: now }
    this.save([obj, ...rows])
    return obj
  }
  async remove(id: string): Promise<void> { this.save(this.load().filter(r => r.id !== id)) }
}

export const promotionsRepo = new LocalPromotionsRepo()


