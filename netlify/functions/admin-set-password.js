exports.handler = async (event) => {
  const json = (code, body) => ({
    statusCode: code,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  })

  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed' })
  }

  try {
    const { createClient } = require('@supabase/supabase-js')

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://dekopbnpsvqlztabblxg.supabase.co'
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
      || process.env.SUPABASE_SERVICE_KEY
      || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      || process.env.SUPABASE_SERVICE_API_KEY

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return json(500, { ok: false, error: 'missing_service_role', hint: 'Set SUPABASE_SERVICE_ROLE_KEY in Netlify env' })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    let body = {}
    try { body = JSON.parse(event.body || '{}') } catch {}
    const email = String(body.email || '').trim().toLowerCase()
    const newPassword = String(body.newPassword || body.password || 'a123123')
    const userType = String(body.userType || 'technician')
    const name = body.name ? String(body.name) : undefined
    const phone = body.phone ? String(body.phone) : undefined

    if (!email) return json(400, { ok: false, error: 'email_required' })

    // 取使用者
    const { data: existing, error: ge } = await supabase.auth.admin.getUserByEmail(email)
    if (ge && String(ge.message||'').includes('not found') === false) {
      // 其他錯誤
      return json(500, { ok: false, error: 'get_user_failed', message: ge.message })
    }

    if (existing && existing.user) {
      const payload = {
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          ...(existing.user.user_metadata || {}),
          user_type: userType || (existing.user.user_metadata || {}).user_type || 'technician',
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {})
        }
      }
      const { error: ue } = await supabase.auth.admin.updateUserById(existing.user.id, payload)
      if (ue) return json(500, { ok: false, error: 'update_failed', message: ue.message })
    } else {
      const { data: created, error: ce } = await supabase.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true,
        user_metadata: { user_type: userType, ...(name ? { name } : {}), ...(phone ? { phone } : {}) }
      })
      if (ce) return json(500, { ok: false, error: 'create_failed', message: ce.message })
    }

    return json(200, { ok: true })
  } catch (e) {
    return json(500, { ok: false, error: 'internal_error', message: String(e?.message || e) })
  }
}
