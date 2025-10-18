// Netlify Function: points-use-on-create
// 目的：訂單建立後，立即扣除使用的點數，寫入 ledger 與更新餘額（含 members.points）

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })
  try {
    const method = (event.httpMethod||'').toUpperCase()
    // GET 調試：查詢是否已有該訂單扣點紀錄與目前餘額
    if (method === 'GET') {
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
      const orderId = String(u.searchParams.get('orderId')||'')
      const refKey = orderId ? `order_points_used_${orderId}` : ''
      // 解析 members.id
      if (!memberId) {
        try { if (memberCode) { const { data: m } = await supabase.from('members').select('id').eq('code', memberCode).maybeSingle(); if (m?.id) memberId = String(m.id) } } catch {}
        try { if (!memberId && phone) { const { data: m } = await supabase.from('members').select('id').eq('phone', phone).maybeSingle(); if (m?.id) memberId = String(m.id) } } catch {}
        try { if (!memberId && memberEmail) { const { data: m } = await supabase.from('members').select('id').eq('email', memberEmail).maybeSingle(); if (m?.id) memberId = String(m.id) } } catch {}
      }
      // 查詢扣點紀錄
      let used = null
      try {
        if (refKey) {
          const { data } = await supabase.from('member_points_ledger').select('id,member_id,delta,order_id,ref_key,created_at').eq('ref_key', refKey).maybeSingle()
          if (data) used = data
        }
      } catch {}
      // 餘額重算（以 ledger 合計）
      let balance = null
      try {
        let sum = 0
        if (memberId) {
          const { data: logs1 } = await supabase.from('member_points_ledger').select('delta').eq('member_id', memberId)
          sum += (logs1||[]).reduce((s, r)=> s + Number(r.delta||0), 0)
        }
        if (memberEmail) {
          const { data: logs2 } = await supabase.from('member_points_ledger').select('delta').eq('member_email', memberEmail)
          sum += (logs2||[]).reduce((s, r)=> s + Number(r.delta||0), 0)
        }
        balance = sum
      } catch {}
      return json(200, { success:true, debug: { memberId, memberEmail, memberCode, phone, orderId, refKey, used, balance } })
    }
    if (method !== 'POST') return json(405, { success:false, error:'method_not_allowed' })
    let body = {}
    try { body = JSON.parse(event.body||'{}') } catch {}
    let memberId = String(body.memberId||'')
    let memberEmail = String(body.memberEmail||'').toLowerCase()
    let memberCode = String(body.memberCode||'').toUpperCase()
    let phone = String(body.phone||'')
    const orderId = String(body.orderId||'')
    let points = Math.max(0, Number(body.points||0))
    if (!orderId) return json(400, { success:false, error:'invalid_params' })

    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json(500, { success:false, error:'missing_service_role' })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    // 若缺 points 或身分，先嘗試從訂單讀取（order_number 優先，否則 id）
    let orderRow = null
    try {
      let { data: o } = await supabase
        .from('orders')
        .select('id, order_number, memberId, customerEmail, customerPhone, pointsUsed, pointsDeductAmount, points_used, points_deduct_amount, pointsDiscount, points_discount')
        .eq('order_number', orderId)
        .maybeSingle()
      if (!o) {
        const r2 = await supabase
          .from('orders')
          .select('id, order_number, memberId, customerEmail, customerPhone, pointsUsed, pointsDeductAmount, points_used, points_deduct_amount, pointsDiscount, points_discount')
          .eq('id', orderId)
          .maybeSingle()
        o = r2.data || null
      }
      orderRow = o
      if (orderRow) {
        const candidates = [
          Number(orderRow.pointsUsed||0),
          Number(orderRow.points_used||0),
          Number(orderRow.pointsDeductAmount||0),
          Number(orderRow.points_deduct_amount||0),
          Number(orderRow.pointsDiscount||0),
          Number(orderRow.points_discount||0)
        ]
        const maxUsed = Math.max(...candidates)
        if (!(points>0) && (maxUsed>0)) points = maxUsed
        // 優先從訂單補齊身分
        if (!memberId && orderRow.memberId) memberId = String(orderRow.memberId)
        if (!memberEmail && orderRow.customerEmail) memberEmail = String(orderRow.customerEmail||'').toLowerCase()
        if (!phone && orderRow.customerPhone) phone = String(orderRow.customerPhone||'')
      }
    } catch {}

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
    // 若訂單尚未綁定 memberId，嘗試回寫（不論是否扣點）
    try {
      if (orderRow && !orderRow.memberId && orderRow.id) {
        await supabase.from('orders').update({ memberId }).eq('id', orderRow.id)
      }
    } catch {}
    if (!(points>0)) return json(200, { success:false, error:'no_points_to_deduct' })

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



