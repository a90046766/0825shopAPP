import type { ReportsRepo, ReportThread, ReportMessage } from '../../core/repository'
import { supabase } from '../../utils/supabase'

function fromThreadRow(r: any): ReportThread {
  return {
    id: r.id,
    subject: r.subject || undefined,
    body: r.body || undefined,
    category: r.category,
    level: r.level,
    target: r.target || 'all',
    targetEmails: r.target_emails || [],
    status: r.status || 'open',
    orderId: r.order_id || undefined,
    attachments: r.attachments || [],
    readByEmails: r.read_by_emails || [],
    messages: [],
    createdAt: r.created_at || new Date().toISOString(),
    closedAt: r.closed_at || undefined,
  }
}

function toThreadRow(p: Partial<ReportThread>): any {
  const r: any = { ...p }
  if ('targetEmails' in r) r.target_emails = (r as any).targetEmails
  if ('orderId' in r) r.order_id = (r as any).orderId
  if ('readByEmails' in r) r.read_by_emails = (r as any).readByEmails
  if ('createdAt' in r) delete (r as any).createdAt
  if ('closedAt' in r) r.closed_at = (r as any).closedAt
  return r
}

function fromMsgRow(r: any): ReportMessage {
  return {
    id: r.id,
    authorEmail: r.author_email,
    body: r.body,
    createdAt: r.created_at || new Date().toISOString(),
  }
}

class SupabaseReportsRepo implements ReportsRepo {
  async list(): Promise<ReportThread[]> {
    const { data: threads, error } = await supabase
      .from('report_threads')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    const ids = (threads || []).map((t: any) => t.id)
    if (ids.length === 0) return []
    const { data: msgs, error: e2 } = await supabase
      .from('report_messages')
      .select('*')
      .in('thread_id', ids)
      .order('created_at', { ascending: true })
    if (e2) throw e2
    const map: Record<string, ReportMessage[]> = {}
    for (const m of msgs || []) {
      const one = fromMsgRow(m)
      const tid = m.thread_id
      if (!map[tid]) map[tid] = []
      map[tid].push(one)
    }
    return (threads || []).map((t: any) => {
      const base = fromThreadRow(t)
      base.messages = map[t.id] || []
      return base
    })
  }

  async get(id: string): Promise<ReportThread | null> {
    const { data: t, error } = await supabase
      .from('report_threads')
      .select('*')
      .eq('id', id)
      .single()
    if (error) {
      if ((error as any).code === 'PGRST116') return null
      throw error
    }
    const base = fromThreadRow(t)
    const { data: msgs, error: e2 } = await supabase
      .from('report_messages')
      .select('*')
      .eq('thread_id', id)
      .order('created_at', { ascending: true })
    if (e2) throw e2
    base.messages = (msgs || []).map(fromMsgRow)
    return base
  }

  async create(thread: Omit<ReportThread, 'id' | 'createdAt' | 'messages' | 'status'> & { messages?: ReportMessage[] }): Promise<ReportThread> {
    const now = new Date().toISOString()
    const payload = { ...toThreadRow(thread), status: 'open', created_at: now }
    const { data, error } = await supabase
      .from('report_threads')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    const created = fromThreadRow(data)
    const messages = thread.messages || []
    if (messages.length > 0) {
      const rows = messages.map(m => ({ thread_id: created.id, author_email: m.authorEmail, body: m.body }))
      const { error: e2 } = await supabase.from('report_messages').insert(rows)
      if (e2) throw e2
    }
    return this.get(created.id) as Promise<ReportThread>
  }

  async appendMessage(id: string, msg: Omit<ReportMessage, 'id' | 'createdAt'>): Promise<void> {
    const { error } = await supabase
      .from('report_messages')
      .insert({ thread_id: id, author_email: msg.authorEmail, body: msg.body })
    if (error) throw error
  }

  async close(id: string): Promise<void> {
    const { error } = await supabase
      .from('report_threads')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }

  async removeThread(id: string): Promise<void> {
    const { error } = await supabase.from('report_threads').delete().eq('id', id)
    if (error) throw error
  }

  async removeMessage(threadId: string, messageId: string): Promise<void> {
    const { error } = await supabase.from('report_messages').delete().eq('id', messageId).eq('thread_id', threadId)
    if (error) throw error
  }

  async update(id: string, patch: Partial<ReportThread>): Promise<void> {
    const row = toThreadRow(patch)
    const { error } = await supabase.from('report_threads').update(row).eq('id', id)
    if (error) throw error
  }

  async markRead(id: string, email: string): Promise<void> {
    const { data, error } = await supabase.from('report_threads').select('read_by_emails').eq('id', id).single()
    if (error) throw error
    const list: string[] = Array.isArray((data as any)?.read_by_emails) ? (data as any).read_by_emails : []
    const norm = (email || '').toLowerCase()
    if (!list.includes(norm)) list.push(norm)
    const { error: e2 } = await supabase.from('report_threads').update({ read_by_emails: list }).eq('id', id)
    if (e2) throw e2
  }

  async bulkClose(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return
    const { error } = await supabase.from('report_threads').update({ status: 'closed', closed_at: new Date().toISOString() }).in('id', ids)
    if (error) throw error
  }

  async bulkMarkRead(ids: string[], email: string): Promise<void> {
    if (!ids || ids.length === 0) return
    const { data, error } = await supabase.from('report_threads').select('id, read_by_emails').in('id', ids)
    if (error) throw error
    const norm = (email || '').toLowerCase()
    for (const row of data || []) {
      const list: string[] = Array.isArray(row.read_by_emails) ? row.read_by_emails : []
      if (!list.includes(norm)) list.push(norm)
      const { error: e2 } = await supabase.from('report_threads').update({ read_by_emails: list }).eq('id', row.id)
      if (e2) throw e2
    }
  }
}

export const reportsRepo: ReportsRepo = new SupabaseReportsRepo()


