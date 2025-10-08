// Netlify Function: notifications-feedback-list
// 目的：以 Service Role 讀取 notifications，把「客戶好評/客戶建議/客戶評分」轉為客戶反饋清單

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })
  try {
    if ((event.httpMethod || '').toUpperCase() !== 'GET') {
      return json(405, { success: false, error: 'method_not_allowed' })
    }
    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json(200, { success: false, error: 'missing_service_role' })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    const { data, error } = await supabase
      .from('notifications')
      .select('id,title,body,created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) return json(200, { success: false, error: error.message })

    const rows = (data || [])
      .filter((n) => {
        const t = String(n.title || '')
        return t.includes('客戶好評') || t.includes('客戶建議') || t.includes('客戶評分')
      })
      .map((n) => {
        const title = String(n.title || '')
        const msg = String(n.body || '')
        const kind = title.includes('好評') ? 'good' : (title.includes('建議') ? 'suggest' : 'score')
        const mid = (() => { const m = msg.match(/會員\s+([A-Za-z0-9\-]+)/); return m ? m[1] : '' })()
        const oid = (() => { const m = msg.match(/訂單\s+([A-Za-z0-9\-:_]+)/); return m ? m[1] : '' })()
        return { id: n.id, kind, member_id: mid, order_id: oid, comment: (kind==='suggest'? msg: ''), created_at: n.created_at }
      })

    return json(200, { success: true, data: rows })
  } catch (e) {
    return json(200, { success: false, error: 'internal_error', message: String(e?.message || e) })
  }
}


