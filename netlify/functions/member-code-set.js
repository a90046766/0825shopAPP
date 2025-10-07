// Netlify Function: member-code-set
// POST /.netlify/functions/member-code-set { email, code }

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })
  try {
    const method = (event.httpMethod||'').toUpperCase()
    let body = {}
    if (method === 'POST') {
      try { body = JSON.parse(event.body||'{}') } catch {}
    }
    const raw = event.rawUrl || (`http://local${event.path||''}${event.rawQuery?`?${event.rawQuery}`:''}`)
    let email = String(body.email||'').toLowerCase().trim()
    let codeVal = String(body.code||'').toUpperCase().trim()
    if (!email || !codeVal) {
      try {
        const u = new URL(raw)
        email = email || String(u.searchParams.get('email')||'').toLowerCase().trim()
        codeVal = codeVal || String(u.searchParams.get('code')||'').toUpperCase().trim()
      } catch {}
    }
    if (!email || !codeVal) return json(400, { success:false, error:'missing_fields' })

    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json(500, { success:false, error:'missing_service_role' })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    // 驗證格式（可放寬到 MO/MP/MQ 等 + 4位數字）
    if (!/^[M][OPQRSTUVWXYZ][0-9]{4}$/.test(codeVal)) {
      return json(400, { success:false, error:'invalid_code_format' })
    }

    // 檢查是否重複被他人占用
    const { data: exists } = await supabase.from('members').select('email').eq('code', codeVal).maybeSingle()
    if (exists && String(exists.email||'').toLowerCase() !== email) {
      return json(409, { success:false, error:'code_already_used' })
    }

    const { error } = await supabase.from('members').upsert({ email, code: codeVal }, { onConflict: 'email' })
    if (error) return json(500, { success:false, error: error.message })
    return json(200, { success:true })
  } catch (e) {
    return json(500, { success:false, error:'internal_error', message:String(e?.message||e) })
  }
}


