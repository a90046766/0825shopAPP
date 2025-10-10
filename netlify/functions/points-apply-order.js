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
    let memberId = String(body.memberId||'')
    const memberEmail = String(body.memberEmail||'').toLowerCase()
    const items = Array.isArray(body.items) ? body.items : []
    const pointsDeductAmount = Number(body.pointsDeductAmount||0)
    if (!orderId) return json(400, { success:false, error:'missing_params' })

    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json(500, { success:false, error:'missing_service_role' })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    // 若缺 memberId 但有 email，反查 members.id
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
    if (!memberId) return json(400, { success:false, error:'member_not_found' })

    // 計算結案金額（含負數調整；扣除積分折抵）
    const gross = (items||[]).reduce((s,it)=> s + (Number(it.unitPrice)||0)*(Number(it.quantity)||0), 0)
    const amount = Math.max(0, gross - (pointsDeductAmount||0))

    // 規則：$100 = 1 點，向下取整；改為建立 pending，待會員「領取」後入帳
    let points = Math.floor(amount / 100)
    if (!(points > 0)) return json(200, { success:true, points: 0 })

    // 若已存在 pending 或已入帳（ref_key）則不重複建立
    try {
      const { data: existsPending } = await supabase
        .from('pending_points')
        .select('id')
        .eq('member_id', memberId)
        .eq('order_id', orderId)
        .eq('status', 'pending')
        .maybeSingle()
      if (existsPending) return json(200, { success:true, message:'already_pending', points })
    } catch {}
    try {
      const { data: existsLedger } = await supabase
        .from('member_points_ledger')
        .select('id')
        .eq('order_id', orderId)
        .eq('member_id', memberId)
        .maybeSingle()
      if (existsLedger) return json(200, { success:true, message:'already_awarded', points: 0 })
    } catch {}

    // 建立待入點
    try {
      // 表不存在或 schema cache 問題時，回傳特定錯誤碼讓前端顯示
      const { error: existsErr } = await supabase.from('pending_points').select('id').limit(1)
      if (existsErr && (String(existsErr.message||'').toLowerCase().includes('schema') || String(existsErr.message||'').toLowerCase().includes('exist'))) {
        return json(200, { success:false, error:'pending_points_table_missing' })
      }
    } catch {}
    const row = { member_id: memberId, order_id: orderId, points, reason: '訂單回饋', status: 'pending', created_at: new Date().toISOString() }
    const { error: pe } = await supabase.from('pending_points').insert(row)
    if (pe) return json(500, { success:false, error: pe.message })
    return json(200, { success:true, points })
  } catch (e) {
    return json(500, { success:false, error:'internal_error', message: String(e?.message||e) })
  }
}



