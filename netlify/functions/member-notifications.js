// Netlify Function: member-notifications
// 目的：以 Service Role 聚合提供會員端站內通知，合併 target=all/member/user，並帶出已讀狀態

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

    const raw = event.rawUrl || (`http://local${event.path||''}${event.rawQuery?`?${event.rawQuery}`:''}`)
    const u = new URL(raw)
    let memberId = (u.searchParams.get('memberId') || '').trim()
    const memberEmail = (u.searchParams.get('memberEmail') || '').toLowerCase().trim()

    // 若只有 email，嘗試反查 id；若只有 id，仍以 email 作為已讀標記主鍵
    let emailLc = memberEmail
    if (!memberId && !emailLc) return json(400, { success: false, error: 'missing_params' })
    if (!emailLc && memberId) {
      try {
        const { data: m } = await supabase.from('members').select('email').eq('id', memberId).maybeSingle()
        emailLc = String(m?.email || '').toLowerCase().trim()
      } catch {}
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('id,title,body,message,target,target_user_email,created_at,expires_at,sent_at,scheduled_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) return json(200, { success: false, error: error.message })

    const now = new Date()
    let list = (data||[])
      .filter((n)=>{
        const t = String(n.target||'')
        if (t==='all') return true
        if (t==='member') return true
        if (t==='user') return emailLc ? (String(n.target_user_email||'').toLowerCase()===emailLc) : false
        return false
      })
      .filter((n)=>{
        const notExpired = !n.expires_at || new Date(n.expires_at) > now
        const delivered = (n.sent_at && new Date(n.sent_at) <= now) || (n.scheduled_at && new Date(n.scheduled_at) <= now) || !n.sent_at
        return notExpired && delivered
      })
      .map((n)=>{
        let dataObj = null
        try { if (n.body && typeof n.body==='string' && n.body.trim().startsWith('{')) dataObj = JSON.parse(n.body) } catch {}
        return {
          id: n.id,
          title: n.title,
          message: dataObj ? '' : (n.body || n.message),
          data: dataObj,
          is_read: false,
          created_at: n.created_at
        }
      })

    // 已讀狀態
    try {
      if (emailLc) {
        const ids = list.map((it)=> it.id).filter(Boolean)
        if (ids.length>0) {
          const { data: reads } = await supabase
            .from('notifications_read')
            .select('notification_id')
            .in('notification_id', ids)
            .eq('user_email', emailLc)
          const readSet = new Set((reads||[]).map((r)=> r.notification_id))
          list = list.map((it)=> ({ ...it, is_read: readSet.has(it.id) || !!it.is_read }))
        }
      }
    } catch {}

    return json(200, { success: true, data: list })
  } catch (e) {
    return json(200, { success: false, error: 'internal_error', message: String(e?.message || e) })
  }
}



