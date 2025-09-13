// Netlify Function: orders API
// Handles member rating submission: POST /api/orders/member/:cid/orders/:orderId/rating

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })

  try {
    const path = event.path || ''
    const method = (event.httpMethod || 'GET').toUpperCase()

    // Rating endpoint
    const m = path.match(/\/orders\/member\/([^/]+)\/orders\/([^/]+)\/rating$/)
    if (method === 'POST' && m) {
      const memberId = decodeURIComponent(m[1])
      const orderId = decodeURIComponent(m[2])

      let body = {}
      try { body = JSON.parse(event.body || '{}') } catch {}
      const stars = Number(body.stars)
      const score = Number(body.score)
      const comment = (body.comment || '').toString()
      const highlights = Array.isArray(body.highlights) ? body.highlights.map(String) : []
      const issues = Array.isArray(body.issues) ? body.issues.map(String) : []
      const recommend = !!body.recommend
      if (!(stars >= 1 && stars <= 5)) return json(400, { success: false, error: 'invalid_stars' })
      if (!(score >= 0 && score <= 100)) return json(400, { success: false, error: 'invalid_score' })

      const { createClient } = require('@supabase/supabase-js')
      const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
      const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { success: false, error: 'missing_service_role' })
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

      // Find order by order_number first, then by id
      const fetchOrder = async () => {
        let { data, error } = await supabase
          .from('orders')
          .select('id, order_number, signatures')
          .eq('order_number', orderId)
          .maybeSingle()
        if (error && error.code !== 'PGRST116') throw error
        if (!data) {
          const r = await supabase
            .from('orders')
            .select('id, order_number, signatures')
            .eq('id', orderId)
            .maybeSingle()
          if (r.error && r.error.code !== 'PGRST116') throw r.error
          data = r.data || null
        }
        return data
      }

      const order = await fetchOrder()
      if (!order) return json(404, { success: false, error: 'order_not_found' })

      const now = new Date().toISOString()
      const nextSignatures = Object.assign({}, order.signatures || {}, {
        rating: { stars, score, comment, highlights, issues, recommend, memberId, at: now }
      })

      // Update by order_number if possible, else by id
      const doUpdate = async () => {
        if (order.order_number) {
          const { error } = await supabase
            .from('orders')
            .update({ signatures: nextSignatures, updated_at: now })
            .eq('order_number', order.order_number)
          if (!error) return true
        }
        const { error: e2 } = await supabase
          .from('orders')
          .update({ signatures: nextSignatures, updated_at: now })
          .eq('id', order.id)
        if (e2) throw e2
        return true
      }

      await doUpdate()
      return json(200, { success: true })
    }

    return json(404, { success: false, error: 'not_found' })
  } catch (e) {
    return json(500, { success: false, error: 'internal_error', message: String(e?.message || e) })
  }
}


