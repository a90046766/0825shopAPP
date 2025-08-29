import type { NotificationRepo, Notification, User } from '../../core/repository'

class LocalNotificationRepo implements NotificationRepo {
  private readonly itemsKey = 'local-notifications'
  private readonly readsKey = 'local-notification-reads'

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

  async listForUser(user: User): Promise<{ items: Notification[]; unreadIds: Record<string, boolean> }>{
    const all = this.load<Notification[]>(this.itemsKey, this.getInitial())
    const reads = this.load<Record<string, string[]>>(this.readsKey, {}) // id -> [emails]
    const filtered = all.filter(n =>
      n.target === 'all' ||
      (n.target === 'user' && n.targetUserEmail?.toLowerCase() === user.email.toLowerCase()) ||
      (n.target === user.role)
    )
    const unread: Record<string, boolean> = {}
    for (const it of filtered) unread[it.id] = !(reads[it.id] || []).includes(user.email)
    return { items: filtered, unreadIds: unread }
  }

  async markRead(user: User, id: string): Promise<void> {
    const reads = this.load<Record<string, string[]>>(this.readsKey, {})
    const arr = new Set(reads[id] || [])
    arr.add(user.email)
    reads[id] = Array.from(arr)
    this.save(this.readsKey, reads)
  }

  async push(payload: Omit<Notification, 'id' | 'createdAt' | 'sentAt'> & { sentAt?: string }): Promise<Notification> {
    const all = this.load<Notification[]>(this.itemsKey, this.getInitial())
    const now = new Date().toISOString()
    const item: Notification = {
      id: `NTF-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      createdAt: now,
      sentAt: payload.sentAt || now,
      ...payload,
    }
    this.save(this.itemsKey, [item, ...all])
    return item
  }

  async create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const all = this.load<Notification[]>(this.itemsKey, this.getInitial())
    const now = new Date().toISOString()
    const item: Notification = {
      id: `NTF-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      createdAt: now,
      sentAt: now,
      ...notification,
    }
    this.save(this.itemsKey, [item, ...all])
    return item
  }

  private getInitial(): Notification[] {
    const now = new Date().toISOString()
    return [
      {
        id: 'NTF-WELCOME',
        title: '歡迎使用洗濯派工系統',
        body: '這裡會顯示站內通知與未讀徽章。',
        level: 'info',
        target: 'all',
        createdAt: now,
        sentAt: now,
      },
    ]
  }
}

export const notificationRepo = new LocalNotificationRepo()


