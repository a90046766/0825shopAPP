exports.handler = async (event) => {
  const json = (code, body) => ({
    statusCode: code,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  })
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method Not Allowed' })
  }
  try {
    const { createClient } = require('@supabase/supabase-js')
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
      || 'https://dekopbnpsvqlztabblxg.supabase.co'
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
      || process.env.SUPABASE_SERVICE_KEY
      || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      || process.env.SUPABASE_SERVICE_API_KEY
    const DEFAULT_PASSWORD = process.env.DEFAULT_INTERNAL_PASSWORD || 'a123123'
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return json(500, { ok: false, error: 'missing_service_role', hint: 'Set SUPABASE_SERVICE_ROLE_KEY in Netlify env' })
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    let req = {}
    try { req = JSON.parse(event.body || '{}') } catch {}
    const email = String(req.email || '').toLowerCase()
    const role = String(req.role || 'support') // 'support' | 'sales' | 'technician'
    const name = String(req.name || '')
    const phone = String(req.phone || '')
    const resetPassword = !!req.resetPassword

    if (!email) return json(400, { ok: false, error: 'email_required' })

    // 1) Auth：建立或更新
    let user = null
    const { data: existing, error: getErr } = await supabase.auth.admin.getUserByEmail(email)
    if (getErr && String(getErr.message||'').includes('not found') === false) {
      // 其他錯誤記錄但不中斷（後續嘗試建立）
    }
    if (existing && existing.user) {
      user = existing.user
      const payload = {
        email: email,
        user_metadata: { user_type: role === 'technician' ? 'technician' : 'staff' }
      }
      if (resetPassword) {
        // 允許透過參數重設為預設密碼（僅限管理用途）
        payload.password = DEFAULT_PASSWORD
      }
      await supabase.auth.admin.updateUserById(user.id, payload)
    } else {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { user_type: role === 'technician' ? 'technician' : 'staff' }
      })
      if (createErr) {
        return json(500, { ok: false, error: 'create_user_failed', message: createErr.message })
      }
      user = created.user
    }

    // 2) Upsert 業務表
    if (role === 'technician') {
      const { error } = await supabase.from('technicians').upsert({
        email,
        name: name || user?.email || '',
        phone: phone || '',
        status: 'active'
      }, { onConflict: 'email' })
      if (error) return json(500, { ok: false, error: 'upsert_technician_failed', message: error.message })
    } else {
      const { error } = await supabase.from('staff').upsert({
        email,
        name: name || user?.email || '',
        phone: phone || '',
        role: role === 'sales' ? 'sales' : 'support',
        status: 'active'
      }, { onConflict: 'email' })
      if (error) return json(500, { ok: false, error: 'upsert_staff_failed', message: error.message })
    }

    return json(200, { ok: true, userId: user?.id || null })
  } catch (e) {
    return json(500, { ok: false, error: 'provision_error', message: String(e?.message || e) })
  }
}

