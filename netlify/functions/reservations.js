/* Netlify Function: /api/reservations
   Methods:
   - GET: 列出 Supabase orders.status = 'pending' 的預約訂單（以整單聚合）
*/

const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) }
  }
  try {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      return { statusCode: 200, body: JSON.stringify({ success: true, data: [] }) }
    }
    const supabase = createClient(url, key)
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_phone, customer_email, customer_address, preferred_date, preferred_time_start, preferred_time_end, status, service_items, created_at')
      .in('status', ['pending','draft'])
      .order('created_at', { ascending: false })
    if (error) throw error

    let rows = (data || []).map((o) => {
      const items = Array.isArray(o.service_items) ? o.service_items : []
      const st = (o.status||'')==='draft' ? 'pending' : (o.status||'pending')
      return {
        id: o.id,
        orderNumber: o.order_number || o.id,
        customerName: o.customer_name || '',
        customerPhone: o.customer_phone || '',
        customerEmail: o.customer_email || '',
        customerAddress: o.customer_address || '',
        reservationDate: o.preferred_date || '',
        reservationTime: (o.preferred_time_start && o.preferred_time_end) ? `${o.preferred_time_start}-${o.preferred_time_end}` : (o.preferred_time_start || ''),
        status: st,
        items: items.map((it) => ({ name: it.name, quantity: it.quantity, unitPrice: it.unitPrice })),
        createdAt: o.created_at,
        source: 'orders'
      }
    })

    // 針對缺少姓名/電話/日期時間的訂單，嘗試以備援資料回填（±2 小時）並寫回 DB
    for (const o of (data||[])) {
      const need = !o.customer_name || !o.customer_phone || !o.preferred_date || !(o.preferred_time_start && o.preferred_time_end)
      const emailLc = String(o.customer_email||'').toLowerCase()
      if (!need || !emailLc) continue
      try {
        const start = new Date(new Date(o.created_at).getTime() - 2*60*60*1000).toISOString()
        const end = new Date(new Date(o.created_at).getTime() + 2*60*60*1000).toISOString()
        const { data: rel } = await supabase
          .from('relay_reservations')
          .select('customer_name, customer_phone, customer_address, preferred_date, preferred_time, items_json, created_at')
          .eq('customer_email', emailLc)
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: false })
        if (Array.isArray(rel) && rel.length>0) {
          const patch = {}
          if (!o.customer_name && rel[0].customer_name) patch['customer_name'] = rel[0].customer_name
          if (!o.customer_phone && rel[0].customer_phone) patch['customer_phone'] = rel[0].customer_phone
          if (!o.customer_address && rel[0].customer_address) patch['customer_address'] = rel[0].customer_address
          if (!o.preferred_date && rel[0].preferred_date) patch['preferred_date'] = rel[0].preferred_date
          if (!(o.preferred_time_start && o.preferred_time_end) && rel[0].preferred_time) {
            const t = String(rel[0].preferred_time||'')
            const m = t.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/)
            if (m) { patch['preferred_time_start'] = m[1]; patch['preferred_time_end'] = m[2] }
          }
          if (Object.keys(patch).length>0) {
            await supabase.from('orders').update(patch).eq('id', o.id)
            // 同步更新到回傳 rows
            rows = rows.map(r => r.id===o.id ? {
              ...r,
              customerName: patch['customer_name'] || r.customerName,
              customerPhone: patch['customer_phone'] || r.customerPhone,
              customerAddress: patch['customer_address'] || r.customerAddress,
              reservationDate: patch['preferred_date'] || r.reservationDate,
              reservationTime: (patch['preferred_time_start'] && patch['preferred_time_end']) ? `${patch['preferred_time_start']}-${patch['preferred_time_end']}` : r.reservationTime,
            } : r)
          }
        }
      } catch {}
    }

    // 備援：若無資料，讀取近 7 天 relay_reservations
    if (!rows || rows.length === 0) {
      try {
        const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString()
        const { data: relayRows } = await supabase
          .from('relay_reservations')
          .select('id, customer_name, customer_phone, customer_email, customer_address, preferred_date, preferred_time, items_json, created_at')
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
        if (Array.isArray(relayRows) && relayRows.length>0) {
          rows = relayRows.map((r) => {
            let items = []
            try { items = JSON.parse(r.items_json||'[]') } catch {}
            return {
              id: String(r.id),
              orderNumber: String(r.id),
              customerName: r.customer_name || '',
              customerPhone: r.customer_phone || '',
              customerEmail: r.customer_email || '',
              customerAddress: r.customer_address || '',
              reservationDate: r.preferred_date || '',
              reservationTime: r.preferred_time || '',
              status: 'pending',
              items: (items||[]).map((it)=> ({ name: it.name, quantity: it.quantity, unitPrice: it.price || it.unitPrice })),
              createdAt: r.created_at,
              source: 'relay'
            }
          })
        }
      } catch {}
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, data: rows }) }
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ success: true, data: [] }) }
  }
}


