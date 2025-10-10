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
    const raw = event.rawUrl || ('http://local' + (event.path||''))
    const u = new URL(raw)
    const debug = u.searchParams.get('debug') === '1'

    const { data, error } = await supabase
      .from('notifications')
      .select('id,title,body,created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) return json(200, { success: false, error: error.message })

    let rows = (data || [])
      .filter((n) => {
        const t = String(n.title || '')
        return t.includes('客戶好評') || t.includes('客戶建議') || t.includes('客戶評分')
      })
      .map((n) => {
        const title = String(n.title || '')
        const raw = String(n.body || '')
        const kind = title.includes('好評') ? 'good' : (title.includes('建議') ? 'suggest' : 'score')
        let payload = null
        try { if (raw.trim().startsWith('{')) payload = JSON.parse(raw) } catch {}
        if (payload) {
          return {
            id: n.id,
            kind: String(payload.kind||kind),
            member_id: String(payload.member_id||''),
            member_code: payload.member_code || null,
            order_id: String(payload.order_id||''),
            comment: String(payload.comment||'') || null,
            asset_path: payload.asset_path || null,
            created_at: n.created_at
          }
        }
        // 舊版純文字回退：試著從訊息中抽取 UUID 與訂單編號
        const mid = (() => { const m = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i); return m ? m[0] : '' })()
        const oid = (() => { const m = raw.match(/\bOD[0-9]+\b/i); return m ? m[0] : '' })()
        return { id: n.id, kind, member_id: mid, member_code: null, order_id: oid, comment: (kind==='suggest'? raw: ''), created_at: n.created_at }
      })

    // 針對清單中的訂單補上客戶名稱/電話，方便後台檢視
    try {
      const ids = Array.from(new Set(rows.map(r => String(r.order_id||'')).filter(Boolean)))
      if (ids.length > 0) {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, customer_name, customer_phone')
          .in('id', ids)
        const map = new Map((orders||[]).map(o => [String(o.id), { name: o.customer_name||'', phone: o.customer_phone||'' }]))
        rows = rows.map(r => ({ ...r, customer_name: (map.get(String(r.order_id))||{}).name || '', customer_phone: (map.get(String(r.order_id))||{}).phone || '' }))
      }
    } catch {}

    return json(200, { success: true, data: rows, ...(debug? { debug: { key_source: key ? 'service_role_present' : 'missing', rows: rows.length } } : {}) })
  } catch (e) {
    return json(200, { success: false, error: 'internal_error', message: String(e?.message || e) })
  }
}


