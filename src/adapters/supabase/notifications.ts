import type { NotificationRepo, Notification, User } from '../../core/repository'
import { supabase } from '../../utils/supabase'

function fromRow(r: any): Notification {
  return {
    id: r.id,
    title: r.title,
    body: r.body || undefined,
    level: r.level || 'info',
    target: r.target,
    targetUserEmail: r.target_user_email || undefined,
    scheduledAt: r.scheduled_at || undefined,
    expiresAt: r.expires_at || undefined,
    sentAt: r.sent_at || undefined,
    createdAt: r.created_at || new Date().toISOString(),
  }
}

class SupabaseNotificationRepo implements NotificationRepo {
  async listForUser(user: User): Promise<{ items: Notification[]; unreadIds: Record<string, boolean> }>{
    const emailLc = (user.email||'').toLowerCase()
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false })
    if (error) throw error
    const items = (data || []).map(fromRow).filter(n => {
      if (n.target === 'all') return true
      if (n.target === 'user') return (n.targetUserEmail||'').toLowerCase() === emailLc
      if (n.target === 'tech') return user.role === 'technician'
      if (n.target === 'support') return user.role === 'support'
      if (n.target === 'sales') return user.role === 'sales'
      if (n.target === 'member') return user.role === 'member'
      return false
    })
    const unreadIds: Record<string, boolean> = {}
    for (const it of items) unreadIds[it.id] = true
    return { items, unreadIds }
  }
  async markRead(user: User, id: string): Promise<void> {
    const emailLc = (user.email||'').toLowerCase()
    const { error } = await supabase.from('notifications_read').upsert({ notification_id: id, user_email: emailLc, read_at: new Date().toISOString() })
    if (error) throw error
  }
  async push(payload: Omit<Notification, 'id' | 'createdAt' | 'sentAt'> & { sentAt?: string }): Promise<Notification> {
    const now = new Date().toISOString()
    const row: any = { title: payload.title, body: payload.body, level: payload.level, target: payload.target, target_user_email: payload.targetUserEmail, scheduled_at: payload.scheduledAt, expires_at: payload.expiresAt, sent_at: payload.sentAt, created_at: now }
    const { data, error } = await supabase.from('notifications').insert(row).select().single()
    if (error) throw error
    return fromRow(data)
  }

  async create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const now = new Date().toISOString()
    const row: any = { 
      title: notification.title, 
      body: notification.body, 
      level: notification.level, 
      target: notification.target, 
      target_user_email: notification.targetUserEmail, 
      scheduled_at: notification.scheduledAt, 
      expires_at: notification.expiresAt, 
      sent_at: now, 
      created_at: now 
    }
    const { data, error } = await supabase.from('notifications').insert(row).select().single()
    if (error) throw error
    return fromRow(data)
  }
}

export const notificationRepo: NotificationRepo = new SupabaseNotificationRepo()


