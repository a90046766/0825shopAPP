// Netlify Function: 清除孤兒占用（technician_work）
// 使用方式：
// 1) GET /.netlify/functions/schedule-clean-orphan-work?orderId=OD84596
// 2) POST JSON { orderId: "OD84596" }
// 選用：?technicianCode=SR473&date=YYYY-MM-DD（會額外清除該技師當日占用）

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })

  try {
    const method = (event.httpMethod || 'GET').toUpperCase()
    const params = event.queryStringParameters || {}
    let body = {}
    if (method === 'POST') {
      try { body = JSON.parse(event.body || '{}') } catch {}
    }

    const orderId = String(params.orderId || body.orderId || '').trim()
    const technicianCode = String(params.technicianCode || body.technicianCode || '').trim()
    const date = String(params.date || body.date || '').trim() // YYYY-MM-DD

    if (!orderId && !(technicianCode && date)) {
      return json(400, { success: false, error: 'missing_params', hint: '提供 orderId，或同時提供 technicianCode 與 date' })
    }

    const { createClient } = require('@supabase/supabase-js')
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { success: false, error: 'missing_service_role' })
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    let deletedByOrder = 0
    if (orderId) {
      const { error: delErr, count } = await supabase
        .from('technician_work')
        .delete({ count: 'exact' })
        .eq('order_id', orderId)
      if (delErr) return json(500, { success: false, error: delErr.message })
      deletedByOrder = (count || 0)
    }

    let deletedByCodeDate = 0
    if (technicianCode && date) {
      // 以 code 反查 email，再清除該日占用
      const { data: tech, error: te } = await supabase
        .from('technicians')
        .select('email')
        .eq('code', technicianCode)
        .maybeSingle()
      if (te) return json(500, { success: false, error: te.message })
      const email = (tech?.email || '').toLowerCase()
      if (email) {
        const { error: del2, count: count2 } = await supabase
          .from('technician_work')
          .delete({ count: 'exact' })
          .eq('technician_email', email)
          .eq('date', date)
        if (del2) return json(500, { success: false, error: del2.message })
        deletedByCodeDate = (count2 || 0)
      }
    }

    return json(200, { success: true, deletedByOrder, deletedByCodeDate })
  } catch (e) {
    return json(500, { success: false, error: 'internal_error', message: String(e?.message || e) })
  }
}


