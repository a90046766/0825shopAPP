// Netlify Function: points-apply-order
// POST /.netlify/functions/points-apply-order
// Body: { orderId, memberId, items: [{name, quantity, unitPrice}], pointsDeductAmount }

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })
  try {
    if ((event.httpMethod||'').toUpperCase() !== 'POST') return json(405, { success:false, error:'method_not_allowed' })
    let body = {}
    try { body = JSON.parse(event.body||'{}') } catch {}
    const orderId = String(body.orderId||'')
    const memberId = String(body.memberId||'')
    const items = Array.isArray(body.items) ? body.items : []
    const pointsDeductAmount = Number(body.pointsDeductAmount||0)
    if (!orderId || !memberId) return json(400, { success:false, error:'missing_params' })

    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json(500, { success:false, error:'missing_service_role' })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    // 計算結案金額（含負數調整；扣除積分折抵）
    const gross = (items||[]).reduce((s,it)=> s + (Number(it.unitPrice)||0)*(Number(it.quantity)||0), 0)
    const amount = Math.max(0, gross - (pointsDeductAmount||0))

    // 規則：$100 = 1 點，向下取整
    let points = Math.floor(amount / 100)
    if (!(points > 0)) return json(200, { success:true, points: 0 })

    // 避免重複加點：以 orderId 建立唯一 ref_key
    const refKey = `order_reward_${orderId}`
    const { data: existed } = await supabase.from('member_points_ledger').select('id').eq('ref_key', refKey).maybeSingle()
    if (existed) return json(200, { success:true, message:'already_awarded', points: 0 })

    // 寫入點數明細並累加餘額
    const row = { member_id: memberId, delta: points, reason: '訂單回饋', order_id: orderId, ref_key: refKey, created_at: new Date().toISOString() }
    const { error: ie } = await supabase.from('member_points_ledger').insert(row)
    if (ie) return json(500, { success:false, error: ie.message })
    try { await supabase.rpc('add_points_to_member', { p_member_id: memberId, p_delta: points }) } catch {}
    return json(200, { success:true, points })
  } catch (e) {
    return json(500, { success:false, error:'internal_error', message: String(e?.message||e) })
  }
}



