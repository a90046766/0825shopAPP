// Netlify Function: points-admin-adjust
// 目的：後台管理員/客服可調整會員積分（支援 setTo 或 delta 兩模式，具 ref_key 冪等）
// 用法：POST /.netlify/functions/points-admin-adjust  body:{ memberId|memberEmail|memberCode|phone, setTo?:number, delta?:number, reason?:string, ref?:string }

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
    let memberId = String(body.memberId||'')
    const memberEmail = String(body.memberEmail||'').toLowerCase()
    const memberCode = String(body.memberCode||'').toUpperCase()
    const phone = String(body.phone||'')
    const reason = String(body.reason || '後台調整')
    const ref = String(body.ref||'')
    const setTo = (body.setTo!==undefined && body.setTo!==null) ? Number(body.setTo) : null
    const deltaIn = (body.delta!==undefined && body.delta!==null) ? Number(body.delta) : null
    if (!memberId && !memberEmail && !memberCode && !phone) return json(400, { success:false, error:'missing_member' })
    if (setTo===null && deltaIn===null) return json(400, { success:false, error:'missing_setTo_or_delta' })

    // 解析/驗證 memberId（必要時自動建檔）
    const ensureMember = async () => {
      // 若傳入的 memberId 無效，清空以便改用其他鍵解析
      if (memberId) {
        try { const { data: ex } = await supabase.from('members').select('id').eq('id', memberId).maybeSingle(); if (!ex?.id) memberId = '' } catch { memberId = '' }
      }
      if (!memberId) {
        try { if (memberCode) { const { data: m } = await supabase.from('members').select('id').eq('code', memberCode).maybeSingle(); if (m?.id) memberId = String(m.id) } } catch {}
        try { if (!memberId && phone) { const { data: m } = await supabase.from('members').select('id').eq('phone', phone).maybeSingle(); if (m?.id) memberId = String(m.id) } } catch {}
        try { if (!memberId && memberEmail) { const { data: m } = await supabase.from('members').select('id').eq('email', memberEmail).maybeSingle(); if (m?.id) memberId = String(m.id) } } catch {}
      }
      if (!memberId && (memberEmail || phone)) {
        // 自動建立會員（MO+4）
        const genCode = async () => {
          const pad = (n) => String(n).padStart(4, '0')
          for (let i=0;i<10000;i++){
            const code = 'MO' + pad(Math.floor(Math.random()*10000))
            const { data: existed } = await supabase.from('members').select('id').eq('code', code).maybeSingle()
            if (!existed) return code
          }
          return 'MO9999'
        }
        try {
          const code = await genCode()
          const ins = await supabase.from('members').insert({ code, email: memberEmail||null, phone: phone||null, name: null, points: 0, addresses: [] }).select('id').maybeSingle()
          if (!ins.error && ins.data && ins.data.id) memberId = String(ins.data.id)
        } catch {}
      }
    }
    await ensureMember()
    if (!memberId) return json(400, { success:false, error:'member_not_found' })

    // 取得現有餘額
    let current = 0
    try { const { data: mp } = await supabase.from('member_points').select('balance').eq('member_id', memberId).maybeSingle(); current = Number(mp?.balance||0) } catch {}

    // 計算 delta 與 ref_key
    let delta = 0
    if (setTo!==null) delta = Number(setTo) - current
    else delta = Number(deltaIn||0)
    if (!Number.isFinite(delta) || delta===0) return json(200, { success:false, error:'no_change' })
    const refKey = ref ? `admin_adjust_${ref}` : `admin_adjust_${memberId}_${Date.now()}`

    // 冪等：若已存在相同 ref_key
    try { const { data: ex } = await supabase.from('member_points_ledger').select('id').eq('ref_key', refKey).maybeSingle(); if (ex) return json(200, { success:true, message:'already_applied' }) } catch {}

    // 寫入明細
    try {
      const row = { member_id: memberId, delta, reason, order_id: null, ref_key: refKey, created_at: new Date().toISOString() }
      const { error: le } = await supabase.from('member_points_ledger').insert(row)
      if (le) return json(500, { success:false, error: le.message })
    } catch { return json(500, { success:false, error:'insert_failed' }) }

    // 重算並回寫 SSOT
    try {
      const { data: logs } = await supabase.from('member_points_ledger').select('delta').eq('member_id', memberId)
      const sum = (logs||[]).reduce((s,r)=> s + Number(r.delta||0), 0)
      await supabase.from('member_points').upsert({ member_id: memberId, balance: sum })
      await supabase.from('members').update({ points: sum }).eq('id', memberId)
      return json(200, { success:true, balance: sum })
    } catch { return json(200, { success:true }) }
  } catch (e) {
    return json(500, { success:false, error:'internal_error', message: String(e?.message||e) })
  }
}


