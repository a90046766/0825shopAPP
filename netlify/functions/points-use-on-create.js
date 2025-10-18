// Netlify Function: points-use-on-create
// 目的：訂單建立後，立即扣除使用的點數，寫入 ledger 與更新餘額（含 members.points）

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })
  try {
    if ((event.httpMethod||'').toUpperCase() !== 'POST') return json(405, { success:false, error:'method_not_allowed' })
    let body = {}
    try { body = JSON.parse(event.body||'{}') } catch {}
    let memberId = String(body.memberId||'')
    const memberEmail = String(body.memberEmail||'').toLowerCase()
    const memberCode = String(body.memberCode||'').toUpperCase()
    const phone = String(body.phone||'')
    const orderId = String(body.orderId||'')
    const points = Math.max(0, Number(body.points||0))
    if ((!memberId && !memberEmail) || !orderId || !(points>0)) return json(400, { success:false, error:'invalid_params' })

    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json(500, { success:false, error:'missing_service_role' })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    // 解析 members.id（支援 id/code/phone/email）
    if (!memberId) {
      try { if (memberCode) { const { data: m } = await supabase.from('members').select('id').eq('code', memberCode).maybeSingle(); if (m?.id) memberId = String(m.id) } } catch {}
      try { if (!memberId && phone) { const { data: m } = await supabase.from('members').select('id').eq('phone', phone).maybeSingle(); if (m?.id) memberId = String(m.id) } } catch {}
      try { if (!memberId && memberEmail) { const { data: m } = await supabase.from('members').select('id').eq('email', memberEmail).maybeSingle(); if (m?.id) memberId = String(m.id) } } catch {}
    }
    if (!memberId) return json(400, { success:false, error:'member_not_found' })

    const refKey = `order_points_used_${orderId}`
    const { data: existed } = await supabase.from('member_points_ledger').select('id').eq('ref_key', refKey).maybeSingle()
    if (existed) return json(200, { success:true, message:'already_used' })

    // 新增負數明細
    const row = { member_id: memberId, delta: -points, reason: '訂單折抵', order_id: orderId, ref_key: refKey, created_at: new Date().toISOString() }
    const { error: ie } = await supabase.from('member_points_ledger').insert(row)
    if (ie) return json(500, { success:false, error: ie.message })

    // 更新餘額（RPC→回退）
    try {
      await supabase.rpc('add_points_to_member', { p_member_id: memberId, p_delta: -points })
    } catch {
      try {
        const { data: mp } = await supabase.from('member_points').select('balance').eq('member_id', memberId).maybeSingle()
        const balance = Math.max(0, Number(mp?.balance||0) - points)
        await supabase.from('member_points').upsert({ member_id: memberId, balance })
      } catch {}
    }

    // 同步 members.points
    try {
      const { data: m } = await supabase.from('members').select('points').eq('id', memberId).maybeSingle()
      const next = Math.max(0, Number(m?.points||0) - points)
      await supabase.from('members').update({ points: next }).eq('id', memberId)
    } catch {}

    return json(200, { success:true })
  } catch (e) {
    return json(500, { success:false, error:'internal_error', message: String(e?.message||e) })
  }
}



