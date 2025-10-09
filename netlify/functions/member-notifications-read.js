// Netlify Function: member-notifications-read
// 目的：標記會員端單一通知為已讀

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
    const qMemberId = (u.searchParams.get('memberId') || '').trim()
    const qMemberEmail = (u.searchParams.get('memberEmail') || '').trim().toLowerCase()
    const qId = (u.searchParams.get('id') || '').trim()
    let body = {}
    try { body = JSON.parse(event.body||'{}') } catch {}
    const id = String(body.id || qId || '')
    let emailLc = String(body.memberEmail || qMemberEmail || '').toLowerCase()
    let memberId = String(body.memberId || qMemberId || '')
    if (!id) return json(400, { success: false, error: 'missing_notification_id' })
    if (!emailLc && !memberId) return json(400, { success: false, error: 'missing_member' })
    if (!emailLc && memberId) {
      try { const { data: m } = await supabase.from('members').select('email').eq('id', memberId).maybeSingle(); emailLc = String(m?.email||'').toLowerCase() } catch {}
    }
    if (!emailLc) return json(400, { success: false, error: 'member_email_not_found' })

    try {
      await supabase.from('notifications_read').upsert({ notification_id: id, user_email: emailLc, read_at: new Date().toISOString() })
    } catch (e) { return json(200, { success: false, error: String(e?.message||e) }) }
    return json(200, { success: true })
  } catch (e) {
    return json(200, { success: false, error: 'internal_error', message: String(e?.message||e) })
  }
}


