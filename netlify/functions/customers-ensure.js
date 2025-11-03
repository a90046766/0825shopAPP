const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  const method = event.httpMethod || 'GET'
  if (method !== 'POST') {
    return { statusCode: 200, body: JSON.stringify({ success: true, probe: true }) }
  }
  try {
    const isJson = (event.headers?.['content-type'] || '').includes('application/json')
    const body = isJson ? (JSON.parse(event.body || '{}') || {}) : {}

    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    if (!url || !key) {
      return { statusCode: 200, body: JSON.stringify({ success: false, error: 'NO_SERVICE_KEY' }) }
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    const name = String(body.name || '').trim()
    const rawPhone = String(body.phone || '').trim()
    const email = String((body.email || '').toLowerCase()).trim()
    const phone = rawPhone.replace(/\D/g, '')
    const addrArray = Array.isArray(body.addresses) ? body.addresses : (body.address ? [body.address] : [])
    const addresses = Array.from(new Set(addrArray.filter(Boolean))).map(a => ({ id: `ADDR-${Math.random().toString(36).slice(2,8)}`, address: a }))

    if (!name || (!phone && !email)) {
      return { statusCode: 200, body: JSON.stringify({ success: false, error: 'MISSING_NAME_OR_CONTACT' }) }
    }

    // 先以 phone 或 email 查詢既有
    let existing = null
    if (phone) {
      const { data } = await supabase.from('customers').select('*').eq('phone', phone).maybeSingle()
      if (data) existing = data
    }
    if (!existing && email) {
      const { data } = await supabase.from('customers').select('*').eq('email', email).maybeSingle()
      if (data) existing = data
    }

    const mergeAddresses = (oldList) => {
      try {
        const list = []
        for (const it of (oldList||[])) {
          if (!it) continue
          if (typeof it === 'string') list.push(it)
          else if (typeof it === 'object' && typeof it.address === 'string') list.push(it.address)
        }
        const all = Array.from(new Set([...list, ...addresses.map(x=>x.address)]))
        return all.map(a => ({ id: `ADDR-${Math.random().toString(36).slice(2,8)}`, address: a }))
      } catch { return addresses }
    }

    const row = existing ? {
      id: existing.id,
      name: name || existing.name || '',
      phone: phone || existing.phone || '',
      email: email || existing.email || null,
      addresses: mergeAddresses(existing.addresses),
      notes: existing.notes,
      blacklisted: !!existing.blacklisted,
      updated_at: new Date().toISOString()
    } : {
      name,
      phone: phone || '',
      email: email || null,
      addresses,
      notes: body.notes || null,
      blacklisted: false,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase.from('customers').upsert(row).select('id').single()
    if (error) {
      return { statusCode: 200, body: JSON.stringify({ success: false, error: error.message }) }
    }
    return { statusCode: 200, body: JSON.stringify({ success: true, id: data?.id }) }
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ success: false, error: e?.message || 'UNKNOWN' }) }
  }
}
