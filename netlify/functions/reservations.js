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
      return {
        id: o.id,
        orderNumber: o.order_number || o.id,
        customerName: o.customer_name || '',
        customerPhone: o.customer_phone || '',
        customerEmail: o.customer_email || '',
        customerAddress: o.customer_address || '',
        reservationDate: o.preferred_date || '',
        reservationTime: (o.preferred_time_start && o.preferred_time_end) ? `${o.preferred_time_start}-${o.preferred_time_end}` : (o.preferred_time_start || ''),
        status: o.status || 'pending',
        items: items.map((it) => ({ name: it.name, quantity: it.quantity, unitPrice: it.unitPrice })),
        createdAt: o.created_at,
        source: 'orders'
      }
    })

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


