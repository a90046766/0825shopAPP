// Netlify Function: points-refund-order
// 目的：訂單取消時退回先前扣除的積分（冪等，ref_key=order_points_refund_<orderId>）
// 用法：POST /.netlify/functions/points-refund-order  body:{ orderId, memberId|memberEmail|memberCode|phone }

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
    const orderId = String(body.orderId||'')
    let memberId = String(body.memberId||'')
    const memberEmail = String(body.memberEmail||'').toLowerCase()
    const memberCode = String(body.memberCode||'').toUpperCase()
    const phone = String(body.phone||'')
    if (!orderId) return json(400, { success:false, error:'invalid_params' })

    // 若未帶 points，後續將從負數扣點紀錄或訂單欄位推導

    // 解析 members.id（支援 id/code/phone/email）
    if (!memberId) {
      try { if (memberCode) { const { data: m } = await supabase.from('members').select('id').eq('code', memberCode).maybeSingle(); if (m?.id) memberId = String(m.id) } } catch {}
      try { if (!memberId && phone) { const { data: m } = await supabase.from('members').select('id').eq('phone', phone).maybeSingle(); if (m?.id) memberId = String(m.id) } } catch {}
      try { if (!memberId && memberEmail) { const { data: m } = await supabase.from('members').select('id').eq('email', memberEmail).maybeSingle(); if (m?.id) memberId = String(m.id) } } catch {}
    }

    // 從訂單補齊 memberId 與 pointsUsed（大小寫/命名相容）
    let orderRow = null
    try {
      let { data: o } = await supabase
        .from('orders')
        .select('id, order_number, memberId, customerEmail, customerPhone, pointsUsed, pointsDeductAmount, points_used, points_deduct_amount, pointsDiscount, points_discount, status')
        .eq('order_number', orderId).maybeSingle()
      if (!o) {
        const r2 = await supabase
          .from('orders')
          .select('id, order_number, memberId, customerEmail, customerPhone, pointsUsed, pointsDeductAmount, points_used, points_deduct_amount, pointsDiscount, points_discount, status')
          .eq('id', orderId).maybeSingle()
        o = r2.data || null
      }
      orderRow = o
      if (orderRow) {
        if (!memberId && orderRow.memberId) memberId = String(orderRow.memberId)
      }
    } catch {}

    if (!memberId) return json(400, { success:false, error:'member_not_found' })

    const usedRef = `order_points_used_${orderId}`
    const refundRef = `order_points_refund_${orderId}`

    // 冪等：若已退款紀錄存在，直接返回
    try {
      const { data: existedRefund } = await supabase.from('member_points_ledger').select('id,delta').eq('member_id', memberId).eq('ref_key', refundRef).maybeSingle()
      if (existedRefund) return json(200, { success:true, message:'already_refunded', refunded: Number(existedRefund.delta||0) })
    } catch {}

    // 取得先前扣點金額（優先讀負數明細 delta 絕對值，否則退回訂單推導）
    let used = 0
    try {
      const { data: usedRow } = await supabase.from('member_points_ledger').select('delta').eq('member_id', memberId).eq('ref_key', usedRef).maybeSingle()
      if (usedRow && typeof usedRow.delta === 'number' && usedRow.delta < 0) {
        used = Math.abs(Number(usedRow.delta||0))
      }
    } catch {}
    if (!(used>0) && orderRow) {
      const candidates = [
        Number(orderRow.pointsUsed||0),
        Number(orderRow.points_used||0),
        Number(orderRow.pointsDeductAmount||0),
        Number(orderRow.points_deduct_amount||0),
        Number(orderRow.pointsDiscount||0),
        Number(orderRow.points_discount||0)
      ]
      used = Math.max(...candidates)
    }
    if (!(used>0)) return json(200, { success:false, error:'no_used_points_found' })

    // 寫入退款正數明細
    try {
      const row = { member_id: memberId, delta: used, reason: '取消訂單退回', order_id: orderId, ref_key: refundRef, created_at: new Date().toISOString() }
      const { error: le } = await supabase.from('member_points_ledger').insert(row)
      if (le) return json(500, { success:false, error: le.message })
    } catch (e) { return json(500, { success:false, error: 'refund_insert_failed' }) }

    // 重算餘額（SSOT）
    try {
      const { data: logs } = await supabase.from('member_points_ledger').select('delta').eq('member_id', memberId)
      const sum = (logs||[]).reduce((s,r)=> s + Number(r.delta||0), 0)
      await supabase.from('member_points').upsert({ member_id: memberId, balance: sum })
      await supabase.from('members').update({ points: sum }).eq('id', memberId)
    } catch {}

    // 若有本單待入點，標記為取消（非關鍵）
    try {
      await supabase.from('pending_points').update({ status: 'cancelled' }).eq('member_id', memberId).eq('order_id', orderId).eq('status','pending')
    } catch {}

    return json(200, { success:true, refunded: used })
  } catch (e) {
    return json(500, { success:false, error:'internal_error', message: String(e?.message||e) })
  }
}






