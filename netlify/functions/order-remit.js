// Netlify Function: order-remit
// 用途：會員回報匯款資訊（金額與末五碼），供後台對帳
// POST /.netlify/functions/order-remit { orderId, memberId, amount, last5 }

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })
  try {
    if ((event.httpMethod||'').toUpperCase() !== 'POST') return json(405, { success:false, error:'method_not_allowed' })
    let body = {}
    try { body = JSON.parse(event.body||'{}') } catch {}
    const orderId = String(body.orderId||'').trim()
    const memberId = String(body.memberId||'').trim()
    const amount = Number(body.amount||0)
    const last5 = String(body.last5||'').replace(/\D/g,'').slice(-5)
    if (!orderId || !memberId || !(amount>0) || last5.length!==5) return json(400, { success:false, error:'invalid_params' })

    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json(500, { success:false, error:'missing_service_role' })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    // 以 order_number 優先尋找
    const fetchOrder = async () => {
      let { data, error } = await supabase.from('orders').select('id, order_number, signatures').eq('order_number', orderId).maybeSingle()
      if (error && error.code !== 'PGRST116') throw error
      if (!data) {
        const r = await supabase.from('orders').select('id, order_number, signatures').eq('id', orderId).maybeSingle()
        if (r.error && r.error.code !== 'PGRST116') throw r.error
        data = r.data || null
      }
      return data
    }
    const order = await fetchOrder()
    if (!order) return json(404, { success:false, error:'order_not_found' })

    const now = new Date().toISOString()
    const nextSig = Object.assign({}, order.signatures||{}, { transfer_report: { amount, last5, memberId, at: now } })

    const doUpdate = async () => {
      if (order.order_number) {
        const { error } = await supabase.from('orders').update({ signatures: nextSig, updated_at: now }).eq('order_number', order.order_number)
        if (!error) return true
      }
      const { error: e2 } = await supabase.from('orders').update({ signatures: nextSig, updated_at: now }).eq('id', order.id)
      if (e2) throw e2
      return true
    }
    await doUpdate()

    // 可選：推播通知到後台
    try {
      await supabase.from('notifications').insert({
        title: '會員已回報匯款資訊',
        body: JSON.stringify({ orderId: order.order_number || order.id, amount, last5, memberId }),
        level: 'info',
        target: 'staff',
        sent_at: now,
        created_at: now
      })
    } catch {}

    return json(200, { success:true })
  } catch (e) {
    return json(500, { success:false, error:'internal_error', message: String(e?.message||e) })
  }
}



