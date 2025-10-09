// Netlify Function: member-profile
// GET  /_api/member/profile?memberId=... | memberEmail=... | phone=...
// PUT  /_api/member/profile  body:{ memberId|memberEmail, name?, phone?, city?, district?, address? }

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })
  try {
    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json(500, { success:false, error:'missing_service_role' })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    const method = (event.httpMethod||'GET').toUpperCase()
    const raw = event.rawUrl || ('http://local' + (event.path||''))
    const u = new URL(raw)

    if (method === 'GET') {
      let memberId = String(u.searchParams.get('memberId')||'')
      const memberEmail = String(u.searchParams.get('memberEmail')||'').toLowerCase()
      const phone = String(u.searchParams.get('phone')||'')
      if (!memberId && !memberEmail && !phone) return json(400, { success:false, error:'missing_params' })
      if (!memberId && memberEmail) {
        const { data: m } = await supabase.from('members').select('id').eq('email', memberEmail).maybeSingle()
        if (m?.id) memberId = String(m.id)
      }
      const base = supabase
        .from('members')
        .select('id,code,name,email,phone,addresses')
      let qry
      if (memberId) qry = base.eq('id', memberId)
      else if (memberEmail) qry = base.eq('email', memberEmail)
      else qry = base.eq('phone', phone)
      const { data, error } = await qry.maybeSingle()
      if (error) return json(500, { success:false, error: error.message })
      if (!data) return json(404, { success:false, error:'not_found' })
      const addr = Array.isArray(data.addresses) && data.addresses[0] ? String(data.addresses[0]) : ''
      const city = addr ? addr.slice(0,3) : ''
      const district = addr ? addr.slice(3,6) : ''
      const address = addr ? addr.slice(6) : ''
      return json(200, { success:true, data: { id: data.id, code: data.code, name: data.name, email: data.email, phone: data.phone||'', city, district, address } })
    }

    if (method === 'PUT') {
      let body = {}
      try { body = JSON.parse(event.body||'{}') } catch {}
      let memberId = String(body.memberId||'')
      const memberEmail = String(body.memberEmail||'').toLowerCase()
      if (!memberId && !memberEmail) return json(400, { success:false, error:'missing_params' })
      if (!memberId && memberEmail) {
        const { data: m } = await supabase.from('members').select('id').eq('email', memberEmail).maybeSingle()
        if (m?.id) memberId = String(m.id)
      }
      if (!memberId) return json(400, { success:false, error:'member_not_found' })
      const addressStr = `${String(body.city||'')}${String(body.district||'')}${String(body.address||'')}`.trim()
      const patch = {
        name: body.name === undefined ? undefined : String(body.name||''),
        phone: body.phone === undefined ? undefined : String(body.phone||''),
        addresses: body.city===undefined && body.district===undefined && body.address===undefined ? undefined : (addressStr ? [addressStr] : [])
      }
      // 移除 undefined 欄位
      Object.keys(patch).forEach(k => { if (patch[k] === undefined) delete patch[k] })
      const { error } = await supabase.from('members').update(patch).eq('id', memberId)
      if (error) return json(500, { success:false, error: error.message })
      return json(200, { success:true })
    }

    return json(405, { success:false, error:'method_not_allowed' })
  } catch (e) {
    return json(500, { success:false, error:'internal_error', message: String(e?.message||e) })
  }
}


