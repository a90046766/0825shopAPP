// Netlify Function: staff-notifications-read-all
// 目的：標記後台員工所有通知為已讀

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })
  try {
    const method = (event.httpMethod || '').toUpperCase()
    if (method !== 'POST' && method !== 'PUT') return json(405, { success: false, error: 'method_not_allowed' })

    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json(200, { success: false, error: 'missing_service_role' })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    const raw = event.rawUrl || (`http://local${event.path||''}${event.rawQuery?`?${event.rawQuery}`:''}`)
    const u = new URL(raw)
    const qEmail = (u.searchParams.get('email') || '').trim().toLowerCase()
    let body = {}
    try { body = JSON.parse(event.body||'{}') } catch {}
    const emailLc = String(body.email || qEmail || '').toLowerCase()
    if (!emailLc) return json(400, { success: false, error: 'missing_email' })

    try {
      const { data } = await supabase
        .from('notifications')
        .select('id, target, target_user_email')
        .order('created_at', { ascending: false })
        .limit(200)
      const ids = (data||[]).filter((n)=>{
        const t = String(n.target||'')
        if (t==='all') return true
        if (t==='support' || t==='staff' || t==='admin' || t==='tech' || t==='technician' || t==='technicians') return true
        if (t==='subset') return true // 以讀取到的 ID 為準
        if (t==='user') return String(n.target_user_email||'').toLowerCase()===emailLc
        return false
      }).map((n)=>n.id)
      for (const id of ids) {
        try { await supabase.from('notifications_read').upsert({ notification_id: id, user_email: emailLc, read_at: new Date().toISOString() }) } catch {}
      }
    } catch (e) { return json(200, { success: false, error: String(e?.message||e) }) }
    return json(200, { success: true })
  } catch (e) {
    return json(200, { success: false, error: 'internal_error', message: String(e?.message||e) })
  }
}


