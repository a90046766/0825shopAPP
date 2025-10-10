// Netlify Function: points-referral-award
// 目的：介紹會員即時 +100（ref_key 去重）。
// 用法：POST /.netlify/functions/points-referral-award  body:{ refCode: 'MOxxxx'|'SRxxxx', memberId }

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })
  try {
    if ((event.httpMethod||'').toUpperCase() !== 'POST') return json(405, { success:false, error:'method_not_allowed' })
    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json(500, { success:false, error:'missing_service_role' })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    let body = {}
    try { body = JSON.parse(event.body||'{}') } catch {}
    const refCode = String(body.refCode||'').toUpperCase()
    const memberId = String(body.memberId||'')
    if (!refCode || !memberId) return json(400, { success:false, error:'invalid_params' })

    const refKey = `referral_${refCode}_${memberId}`
    const { data: existed } = await supabase.from('member_points_ledger').select('id').eq('ref_key', refKey).maybeSingle()
    if (existed) return json(200, { success:true, message:'already_awarded' })

    const delta = 100
    const row = { member_id: memberId, delta, reason: `介紹碼 ${refCode} +100`, order_id: null, ref_key: refKey, created_at: new Date().toISOString() }
    const { error: ie } = await supabase.from('member_points_ledger').insert(row)
    if (ie) return json(500, { success:false, error: ie.message })
    try { await supabase.rpc('add_points_to_member', { p_member_id: memberId, p_delta: delta }) } catch {}
    return json(200, { success:true })
  } catch (e) {
    return json(500, { success:false, error:'internal_error', message: String(e?.message||e) })
  }
}


