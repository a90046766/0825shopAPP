// Netlify Function: Award member points when order is closed/completed
// Usage:
//   GET  /.netlify/functions/order-close-award?orderId=OD123 or UUID
//   POST /.netlify/functions/order-close-award { orderId, finalAmount? }

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })

  try {
    const method = (event.httpMethod || 'GET').toUpperCase()
    let orderId = ''
    let overrideAmount = null
    if (method === 'GET') {
      const u = new URL(event.rawUrl || ('https://dummy' + (event.path || '')))
      orderId = u.searchParams.get('orderId') || ''
      const fa = u.searchParams.get('finalAmount')
      if (fa !== null) { const n = Number(fa); if (!isNaN(n)) overrideAmount = n }
    } else if (method === 'POST') {
      try { const b = JSON.parse(event.body || '{}'); orderId = String(b.orderId || ''); if (b.finalAmount !== undefined) { const n = Number(b.finalAmount); if (!isNaN(n)) overrideAmount = n } } catch {}
    } else {
      return json(405, { ok: false, error: 'method_not_allowed' })
    }

    if (!orderId) return json(400, { ok: false, error: 'missing_order_id' })

    const { createClient } = require('@supabase/supabase-js')
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { ok: false, error: 'missing_service_role' })
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Load order by order_number first, then by id
    const fetchOrder = async () => {
      let { data, error } = await supabase
        .from('orders')
        .select('id, order_number, member_id, service_items, points_deduct_amount, status')
        .eq('order_number', orderId)
        .maybeSingle()
      if (error && error.code !== 'PGRST116') throw error
      if (!data) {
        const r = await supabase
          .from('orders')
          .select('id, order_number, member_id, service_items, points_deduct_amount, status')
          .eq('id', orderId)
          .maybeSingle()
        if (r.error && r.error.code !== 'PGRST116') throw r.error
        data = r.data || null
      }
      return data
    }

    const order = await fetchOrder()
    if (!order) return json(404, { ok: false, error: 'order_not_found' })
    if (!order.member_id) return json(200, { ok: true, skipped: true, reason: 'no_member' })

    // Calculate final amount
    let finalAmount = 0
    if (overrideAmount !== null && !isNaN(overrideAmount)) {
      finalAmount = Math.max(0, Number(overrideAmount))
    } else {
      try {
        const items = Array.isArray(order.service_items) ? order.service_items : []
        const sum = items.reduce((acc, it) => {
          const q = Number(it?.quantity || 0)
          const p = Number(it?.unitPrice || it?.price || 0)
          if (isNaN(q) || isNaN(p)) return acc
          return acc + (q * p)
        }, 0)
        const pointsDeduct = Number(order.points_deduct_amount || 0)
        finalAmount = Math.max(0, sum - (isNaN(pointsDeduct) ? 0 : pointsDeduct))
      } catch {
        finalAmount = 0
      }
    }

    const points = Math.floor(finalAmount / 100)
    if (!(points > 0)) return json(200, { ok: true, points: 0, finalAmount })

    const refKey = `order_award_${order.order_number || order.id}`
    const { data: existed } = await supabase.from('member_points_ledger').select('id').eq('ref_key', refKey).maybeSingle()
    if (existed) return json(200, { ok: true, points: 0, duplicated: true })

    const now = new Date().toISOString()
    const row = { member_id: order.member_id, delta: points, reason: '消費回饋', order_id: order.id, ref_key: refKey, created_at: now }
    const { error: insErr } = await supabase.from('member_points_ledger').insert(row)
    if (insErr) return json(500, { ok: false, error: insErr.message })
    try { await supabase.rpc('add_points_to_member', { p_member_id: order.member_id, p_delta: points }) } catch {}

    return json(200, { ok: true, points, finalAmount })
  } catch (e) {
    return json(500, { ok: false, error: 'internal_error', message: String(e?.message || e) })
  }
}



















