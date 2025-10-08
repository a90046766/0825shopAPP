// Netlify Function: points-apply-by-order
// POST/GET /api/points/apply-by-order?orderNumber=ODxxxx

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })
  try {
    const method = (event.httpMethod||'GET').toUpperCase()
    if (!['GET','POST'].includes(method)) return json(405, { success:false, error:'method_not_allowed' })

    const u = new URL(event.rawUrl || ('https://dummy' + (event.path||'')))
    const orderNumber = (method==='GET') ? (u.searchParams.get('orderNumber') || '') : ''
    let body = {}
    try { body = JSON.parse(event.body||'{}') } catch {}
    const num = String(body.orderNumber || orderNumber || '').trim()
    if (!num) return json(400, { success:false, error:'missing_orderNumber' })

    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json(500, { success:false, error:'missing_service_role' })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    // 1) 讀取訂單（以 order_number 或 id）
    const { data: o, error: oe } = await supabase
      .from('orders')
      .select('*')
      .or(`order_number.eq.${num},id.eq.${num}`)
      .maybeSingle()
    if (oe) return json(500, { success:false, error: oe.message })
    if (!o) return json(404, { success:false, error:'order_not_found' })

    // 2) 找會員（以 member_id 或 email），若無則建立一筆會員並給代碼
    let memberId = o.member_id || ''
    let memberEmail = (o.customer_email || '').toLowerCase()
    let memberRow = null
    if (memberId) {
      const { data: m } = await supabase.from('members').select('*').eq('id', memberId).maybeSingle()
      memberRow = m
    }
    if (!memberRow && memberEmail) {
      const { data: m } = await supabase.from('members').select('*').eq('email', memberEmail).maybeSingle()
      memberRow = m
    }
    if (!memberRow) {
      // 產生 MO+4 碼（不連號、查重）
      const prefixes = ['MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ']
      const gen4 = () => String(Math.floor(Math.random()*10000)).padStart(4,'0')
      let newCode = ''
      for (const pf of prefixes) {
        let tried = 0
        while (tried < 50) {
          const candidate = pf + gen4()
          const { data: exists } = await supabase.from('members').select('email').eq('code', candidate).maybeSingle()
          if (!exists) { newCode = candidate; break }
          tried++
        }
        if (newCode) break
      }
      const email = memberEmail || `${o.id}@example.local`
      const up = await supabase.from('members').upsert({ email, name: o.customer_name||'', phone: o.customer_phone||'', addresses: [o.customer_address||''], code: newCode }, { onConflict: 'email' }).select('*').maybeSingle()
      memberRow = up.data || null
      memberId = memberRow?.id || email
    } else {
      memberId = memberRow.id || memberRow.email || memberEmail
    }

    // 3) 計算結案金額
    const items = Array.isArray(o.service_items) ? o.service_items : []
    const gross = items.reduce((s,it)=> s + (Number(it.unitPrice)||0)*(Number(it.quantity)||0), 0)
    const net = Math.max(0, gross - Number(o.points_deduct_amount||0))
    const points = Math.floor(net / 100)
    if (!(points > 0)) return json(200, { success:true, message:'no_points', net, points: 0 })

    // 4) 防重：以 ref_key 不重複
    const refKey = `order_reward_${o.id}`
    const { data: existed } = await supabase.from('member_points_ledger').select('id').eq('ref_key', refKey).maybeSingle()
    if (existed) return json(200, { success:true, message:'already_awarded', net, points: 0 })

    // 5) 發入台帳與累加餘額
    const row = { member_id: memberId, delta: points, reason: '訂單回饋', order_id: o.id, ref_key: refKey, created_at: new Date().toISOString() }
    const { error: ie } = await supabase.from('member_points_ledger').insert(row)
    if (ie) return json(500, { success:false, error: ie.message })
    try { await supabase.rpc('add_points_to_member', { p_member_id: memberId, p_delta: points }) } catch {}

    return json(200, { success:true, net, points, memberId })
  } catch (e) {
    return json(500, { success:false, error:'internal_error', message:String(e?.message||e) })
  }
}



