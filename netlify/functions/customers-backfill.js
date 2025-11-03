const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  try {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    if (!url || !key) {
      return { statusCode: 200, body: JSON.stringify({ success: false, error: 'NO_SERVICE_KEY' }) }
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    const params = event.queryStringParameters || {}
    const since = params.since || '1970-01-01'
    const limit = Math.min(Number(params.limit || 1000), 5000)

    // 讀取 orders（分頁可選，但此處先單頁足夠；需更多可再迭代）
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id,order_number,customer_name,customer_phone,customer_email,customer_address,created_at')
      .gte('created_at', new Date(since).toISOString())
      .limit(limit)
      .order('created_at', { ascending: true })

    if (error) {
      return { statusCode: 200, body: JSON.stringify({ success: false, error: error.message }) }
    }

    let processed = 0
    let created = 0
    let updated = 0

    const ensureOne = async (o) => {
      const name = String(o.customer_name || '').trim()
      const rawPhone = String(o.customer_phone || '').trim()
      const email = String((o.customer_email || '').toLowerCase()).trim()
      const phone = rawPhone.replace(/\D/g, '')
      const address = String(o.customer_address || '').trim()
      if (!name || (!phone && !email)) return false

      const mergeAddresses = (oldList, newAddr) => {
        try {
          const list = []
          for (const it of (oldList||[])) {
            if (!it) continue
            if (typeof it === 'string') list.push(it)
            else if (typeof it === 'object' && typeof it.address === 'string') list.push(it.address)
          }
          if (newAddr) list.push(newAddr)
          const uniq = Array.from(new Set(list.filter(Boolean)))
          return uniq.map(a => ({ id: `ADDR-${Math.random().toString(36).slice(2,8)}`, address: a }))
        } catch { return newAddr ? [{ id: `ADDR-${Math.random().toString(36).slice(2,8)}`, address: newAddr }] : [] }
      }

      let existing = null
      if (phone) {
        const { data } = await supabase.from('customers').select('*').eq('phone', phone).maybeSingle()
        if (data) existing = data
      }
      if (!existing && email) {
        const { data } = await supabase.from('customers').select('*').eq('email', email).maybeSingle()
        if (data) existing = data
      }

      if (existing) {
        const row = {
          id: existing.id,
          name: name || existing.name || '',
          phone: phone || existing.phone || '',
          email: email || existing.email || null,
          addresses: mergeAddresses(existing.addresses, address),
          notes: existing.notes,
          blacklisted: !!existing.blacklisted,
          updated_at: new Date().toISOString()
        }
        const { error: e2 } = await supabase.from('customers').upsert(row).select('id').single()
        if (!e2) { updated++; return true }
        return false
      } else {
        const row = {
          name,
          phone: phone || '',
          email: email || null,
          addresses: address ? [{ id: `ADDR-${Math.random().toString(36).slice(2,8)}`, address }] : [],
          notes: 'backfill from orders',
          blacklisted: false,
          updated_at: new Date().toISOString()
        }
        const { error: e3 } = await supabase.from('customers').upsert(row).select('id').single()
        if (!e3) { created++; return true }
        return false
      }
    }

    for (const o of (orders || [])) {
      const ok = await ensureOne(o)
      if (ok) processed++
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, processed, created, updated, scanned: (orders||[]).length, since }) }
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ success: false, error: e?.message || 'UNKNOWN' }) }
  }
}
