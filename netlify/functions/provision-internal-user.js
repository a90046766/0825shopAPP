exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }
  try {
    const { createClient } = require('@supabase/supabase-js')
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return { statusCode: 500, body: 'Missing Supabase service role env' }
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    const req = JSON.parse(event.body || '{}')
    const email = String(req.email || '').toLowerCase()
    const role = String(req.role || 'support') // 'support' | 'sales' | 'technician'
    const name = String(req.name || '')
    const phone = String(req.phone || '')

    if (!email) return { statusCode: 400, body: 'email required' }

    // 1) Auth：建立或更新
    let user = null
    const { data: existing, error: getErr } = await supabase.auth.admin.getUserByEmail(email)
    if (getErr && String(getErr.message||'').includes('not found') === false) {
      // ignore not found; return other errors
    }
    if (existing && existing.user) {
      user = existing.user
      await supabase.auth.admin.updateUserById(user.id, {
        email: email,
        user_metadata: { user_type: role === 'technician' ? 'technician' : 'staff' }
      })
    } else {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { user_type: role === 'technician' ? 'technician' : 'staff' }
      })
      if (createErr) {
        return { statusCode: 500, body: `createUser failed: ${createErr.message}` }
      }
      user = created.user
    }

    // 2) Upsert 業務表
    if (role === 'technician') {
      await supabase.from('technicians').upsert({
        email,
        name: name || user?.email || '',
        phone: phone || '',
        status: 'active'
      }, { onConflict: 'email' })
    } else {
      await supabase.from('staff').upsert({
        email,
        name: name || user?.email || '',
        phone: phone || '',
        role: role === 'sales' ? 'sales' : 'support',
        status: 'active'
      }, { onConflict: 'email' })
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, userId: user?.id }) }
  } catch (e) {
    return { statusCode: 500, body: `Provision error: ${e?.message || e}` }
  }
}
