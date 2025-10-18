// Netlify Function: points-ledger
// GET /_api/points/ledger?memberId=... | memberEmail=...&limit=50

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })
  try {
    if ((event.httpMethod||'GET').toUpperCase() !== 'GET') return json(405, { success:false, error:'method_not_allowed' })

    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json(500, { success:false, error:'missing_service_role' })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    const u = new URL(event.rawUrl || ('http://local' + (event.path||'')))
    let memberId = String(u.searchParams.get('memberId')||'')
    const memberEmail = String(u.searchParams.get('memberEmail')||'').toLowerCase()
    const memberCode = String(u.searchParams.get('memberCode')||'').toUpperCase()
    const phone = String(u.searchParams.get('phone')||'')
    const limit = Math.max(1, Math.min(200, Number(u.searchParams.get('limit')||50)))

    // 解析 members.id（支援 id/code/phone/email）
    const resolveMemberId = async () => {
      if (memberId) return memberId
      try { if (memberCode) { const { data: m } = await supabase.from('members').select('id').eq('code', memberCode).maybeSingle(); if (m?.id) return String(m.id) } } catch {}
      try { if (phone) { const { data: m } = await supabase.from('members').select('id').eq('phone', phone).maybeSingle(); if (m?.id) return String(m.id) } } catch {}
      try { if (memberEmail) { const { data: m } = await supabase.from('members').select('id').eq('email', memberEmail).maybeSingle(); if (m?.id) return String(m.id) } } catch {}
      return ''
    }
    if (!memberId) memberId = await resolveMemberId()
    if (!memberId && !memberEmail && !memberCode && !phone) return json(400, { success:false, error:'missing_params' })

    // 盡量使用 member_id；若僅有 email，嘗試以 email 查詢（欄位不存在時忽略）
    const selectCols = 'created_at, delta, reason, order_id, ref_key, member_id'
    const rows = []
    try {
      if (memberId) {
        const { data } = await supabase
          .from('member_points_ledger')
          .select(selectCols)
          .eq('member_id', memberId)
          .order('created_at', { ascending: false })
          .limit(limit)
        if (Array.isArray(data)) rows.push(...data)
      }
    } catch {}
    try {
      if (!memberId && memberEmail) {
        const { data } = await supabase
          .from('member_points_ledger')
          .select(selectCols)
          .eq('member_email', memberEmail)
          .order('created_at', { ascending: false })
          .limit(limit)
        if (Array.isArray(data)) rows.push(...data)
      }
    } catch {}
    // 合併去重、限制筆數
    rows.sort((a,b)=> String(b.created_at||'').localeCompare(String(a.created_at||'')))
    const unique = []
    const seen = new Set()
    for (const r of rows) {
      const k = `${r.ref_key||''}|${r.order_id||''}|${r.created_at||''}`
      if (seen.has(k)) continue
      seen.add(k)
      unique.push(r)
      if (unique.length>=limit) break
    }
    return json(200, { success:true, data: unique })
  } catch (e) {
    return json(500, { success:false, error:'internal_error', message: String(e?.message||e) })
  }
}


