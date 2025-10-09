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
    const limit = Math.max(1, Math.min(200, Number(u.searchParams.get('limit')||50)))

    if (!memberId && memberEmail) {
      try {
        const { data: m } = await supabase
          .from('members')
          .select('id')
          .eq('email', memberEmail)
          .maybeSingle()
        if (m?.id) memberId = String(m.id)
      } catch {}
    }
    if (!memberId && !memberEmail) return json(400, { success:false, error:'missing_params' })

    const q = supabase
      .from('member_points_ledger')
      .select('created_at, delta, reason, order_id, ref_key')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (memberId) q.eq('member_id', memberId)
    else q.eq('member_id', memberEmail) // 兼容舊資料（不建議）

    const { data, error } = await q
    if (error) return json(500, { success:false, error: error.message })
    return json(200, { success:true, data: data||[] })
  } catch (e) {
    return json(500, { success:false, error:'internal_error', message: String(e?.message||e) })
  }
}


