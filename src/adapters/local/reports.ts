import type { ReportsRepo, ReportThread, ReportMessage } from '../../core/repository'

class LocalReportsRepo implements ReportsRepo {
  private readonly key = 'local-reports'
  private load(): ReportThread[] {
    try { const s = localStorage.getItem(this.key); return s ? JSON.parse(s) : [] } catch { return [] }
  }
  private save(rows: ReportThread[]) { localStorage.setItem(this.key, JSON.stringify(rows)) }

  async list(): Promise<ReportThread[]> { return this.load() }
  async get(id: string): Promise<ReportThread | null> { return this.load().find(t => t.id === id) || null }
  async create(thread: Omit<ReportThread, 'id' | 'createdAt' | 'messages' | 'status'> & { messages?: ReportMessage[] }): Promise<ReportThread> {
    const rows = this.load()
    const now = new Date().toISOString()
    const obj: ReportThread = {
      id: `RPT-${Math.random().toString(36).slice(2,9).toUpperCase()}`,
      createdAt: now,
      status: 'open',
      messages: thread.messages || [],
      readByEmails: [],
      attachments: [],
      ...thread
    }
    rows.unshift(obj)
    this.save(rows)
    return obj
  }
  async appendMessage(id: string, msg: Omit<ReportMessage, 'id' | 'createdAt'>): Promise<void> {
    const rows = this.load()
    const idx = rows.findIndex(r => r.id === id)
    if (idx < 0) return
    const mm = rows[idx].messages || []
    mm.push({ id: `MSG-${Math.random().toString(36).slice(2,9)}`, createdAt: new Date().toISOString(), ...msg })
    rows[idx].messages = mm
    this.save(rows)
  }
  async close(id: string): Promise<void> {
    const rows = this.load()
    const idx = rows.findIndex(r => r.id === id)
    if (idx < 0) return
    rows[idx].status = 'closed'
    rows[idx].closedAt = new Date().toISOString()
    this.save(rows)
  }

  // 其他擴充：刪除回報串與刪除訊息
  async removeThread(id: string): Promise<void> {
    const rows = this.load()
    this.save(rows.filter(r => r.id !== id))
  }
  async removeMessage(threadId: string, messageId: string): Promise<void> {
    const rows = this.load()
    const idx = rows.findIndex(r => r.id === threadId)
    if (idx < 0) return
    const mm = rows[idx].messages || []
    rows[idx].messages = mm.filter(m => m.id !== messageId)
    this.save(rows)
  }

  async update(id: string, patch: Partial<ReportThread>): Promise<void> {
    const rows = this.load()
    const idx = rows.findIndex(r => r.id === id)
    if (idx < 0) return
    rows[idx] = { ...rows[idx], ...patch }
    this.save(rows)
  }

  async markRead(id: string, email: string): Promise<void> {
    const rows = this.load()
    const idx = rows.findIndex(r => r.id === id)
    if (idx < 0) return
    const list = new Set(rows[idx].readByEmails || [])
    list.add((email||'').toLowerCase())
    rows[idx].readByEmails = Array.from(list)
    this.save(rows)
  }

  async bulkClose(ids: string[]): Promise<void> {
    const rows = this.load()
    const now = new Date().toISOString()
    for (const id of ids) {
      const idx = rows.findIndex(r => r.id === id)
      if (idx >= 0) { rows[idx].status = 'closed'; rows[idx].closedAt = now }
    }
    this.save(rows)
  }

  async bulkMarkRead(ids: string[], email: string): Promise<void> {
    const rows = this.load()
    const emailLc = (email||'').toLowerCase()
    for (const id of ids) {
      const idx = rows.findIndex(r => r.id === id)
      if (idx >= 0) {
        const list = new Set(rows[idx].readByEmails || [])
        list.add(emailLc)
        rows[idx].readByEmails = Array.from(list)
      }
    }
    this.save(rows)
  }
}

export const reportsRepo = new LocalReportsRepo()


