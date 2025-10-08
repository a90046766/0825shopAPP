// Netlify Function: member-feedback-list
// GET /.netlify/functions/member-feedback-list 或 /api/member-feedback-list

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })
  try {
    if ((event.httpMethod || '').toUpperCase() !== 'GET') {
      return json(405, { success: false, error: 'method_not_allowed' })
    }

    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json(500, { success: false, error: 'missing_service_role' })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    const { data, error } = await supabase
      .from('member_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) return json(500, { success: false, error: error.message })

    return json(200, { success: true, data: data || [] })
  } catch (e) {
    return json(500, { success: false, error: 'internal_error', message: String(e?.message || e) })
  }
}



