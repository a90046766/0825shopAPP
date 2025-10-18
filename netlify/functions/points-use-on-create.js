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

    // 解析/驗證 members.id（支援 id/code/phone/email）
    const ensureMemberId = async () => {
      // 若帶入的 memberId 不存在，改用多鍵解析
      if (memberId) {
        try {
          const { data: exist } = await supabase.from('members').select('id').eq('id', memberId).maybeSingle()
          if (!exist?.id) memberId = ''
        } catch { memberId = '' }
      }
      if (!memberId) {
        try { if (memberCode) { const { data: m } = await supabase.from('members').select('id').eq('code', memberCode).maybeSingle(); if (m?.id) memberId = String(m.id) } } catch {}
        try { if (!memberId && phone) { const { data: m } = await supabase.from('members').select('id').eq('phone', phone).maybeSingle(); if (m?.id) memberId = String(m.id) } } catch {}
        try { if (!memberId && memberEmail) { const { data: m } = await supabase.from('members').select('id').eq('email', memberEmail).maybeSingle(); if (m?.id) memberId = String(m.id) } } catch {}
      }
    }
    await ensureMemberId()
    if (!memberId) return json(400, { success:false, error:'member_not_found' })

    const refKey = `order_points_used_${orderId}`
    const { data: existedRow } = await supabase.from('member_points_ledger').select('id,member_id,delta').eq('ref_key', refKey).maybeSingle()
    if (existedRow) {
      // 若已存在但綁錯會員，嘗試搬移到正確的 memberId 並重算兩邊餘額（修正歷史誤扣）
      if (String(existedRow.member_id||'') !== String(memberId)) {
        try {
          const oldId = String(existedRow.member_id||'')
          await supabase.from('member_points_ledger').update({ member_id: memberId }).eq('id', existedRow.id)
          // 重算新舊兩邊餘額
          const recalc = async (mid) => {
            try {
              const { data: logs } = await supabase.from('member_points_ledger').select('delta').eq('member_id', mid)
              const sum = (logs||[]).reduce((s, r)=> s + Number(r.delta||0), 0)
              await supabase.from('member_points').upsert({ member_id: mid, balance: sum })
              await supabase.from('members').update({ points: sum }).eq('id', mid)
            } catch {}
          }
          await recalc(memberId)
          if (oldId) await recalc(oldId)
          return json(200, { success:true, message:'migrated_existing_ref_key' })
        } catch {}
      }
      return json(200, { success:true, message:'already_used' })
    }

    // 新增負數明細
    const row = { member_id: memberId, delta: -points, reason: '訂單折抵', order_id: orderId, ref_key: refKey, created_at: new Date().toISOString() }
    const { error: ie } = await supabase.from('member_points_ledger').insert(row)
    if (ie) return json(500, { success:false, error: ie.message })

    // 強制以 ledger 總和為單一真相：重算並回寫 member_points
    try {
      const { data: logs } = await supabase.from('member_points_ledger').select('delta').eq('member_id', memberId)
      const sum = (logs||[]).reduce((s, r)=> s + Number(r.delta||0), 0)
      await supabase.from('member_points').upsert({ member_id: memberId, balance: sum })
    } catch {
      // 回退：RPC（若有）
      try { await supabase.rpc('add_points_to_member', { p_member_id: memberId, p_delta: -points }) } catch {}
    }

    // 同步 members.points（非關鍵）：以 ledger 總和為準
    try {
      const { data: logs2 } = await supabase.from('member_points_ledger').select('delta').eq('member_id', memberId)
      const sum2 = (logs2||[]).reduce((s, r)=> s + Number(r.delta||0), 0)
      await supabase.from('members').update({ points: sum2 }).eq('id', memberId)
    } catch {}
    return json(200, { success:true })
  } catch (e) {
    return json(500, { success:false, error:'internal_error', message: String(e?.message||e) })
  }
}



