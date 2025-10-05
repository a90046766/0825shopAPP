// Netlify Function: schedule-upsert-leave
// POST /.netlify/functions/schedule-upsert-leave
// Body: { technicianEmail, date, fullDay, startTime?, endTime?, reason?, color? }

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })

  try {
    if ((event.httpMethod || '').toUpperCase() !== 'POST') {
      return json(405, { success: false, error: 'method_not_allowed' })
    }

    let body = {}
    try { body = JSON.parse(event.body || '{}') } catch {}
    const technicianEmail = String(body.technicianEmail || '').toLowerCase()
    const date = String(body.date || '')
    const fullDay = !!body.fullDay
    const startTime = body.startTime ? String(body.startTime) : null
    const endTime = body.endTime ? String(body.endTime) : null
    const reason = body.reason ? String(body.reason) : null
    const color = body.color ? String(body.color) : null

    if (!technicianEmail || !date) {
      return json(400, { success: false, error: 'missing_fields' })
    }

    const { createClient } = require('@supabase/supabase-js')
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { success: false, error: 'missing_service_role' })
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    const payload = {
      technician_email: technicianEmail,
      date,
      full_day: fullDay,
      start_time: startTime,
      end_time: endTime,
      reason,
      color,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('technician_leaves')
      .insert(payload)
      .select('*')
      .single()

    if (error) return json(500, { success: false, error: error.message })

    return json(200, { success: true, data })
  } catch (e) {
    return json(500, { success: false, error: 'internal_error', message: String(e?.message || e) })
  }
}
