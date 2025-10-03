/* Netlify Function: /api/member-reservations/:customerId
   依會員 customerId 回傳預約訂單（pending），以「逐品項列」供前端聚合顯示
*/

const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) }
  }
  try {
    const parts = (event.path || '').split('/')
    const customerId = decodeURIComponent(parts[parts.length - 1] || '')
    const email = (event.queryStringParameters && event.queryStringParameters.email) || ''

    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      // 環境未設 Service Key 時回傳空集合，避免 500
      return { statusCode: 200, body: JSON.stringify({ success: true, data: [] }) }
    }

    const supabase = createClient(url, key)

    // 讀取 pending/draft 的預約訂單（對應會員）
    let query = supabase
      .from('orders')
      .select('id, order_number, customer_id, customer_email, customer_address, preferred_date, preferred_time_start, preferred_time_end, status, service_items, created_at')
      .in('status', ['pending','draft'])
      .order('created_at', { ascending: false })

    const emailLc = String(email || '').toLowerCase()
    if (customerId && emailLc) {
      // 同時具備 customerId 與 email 時，任一符合即可（避免單邊缺資料時查無）
      query = query.or(`customer_id.eq.${customerId},customer_email.eq.${emailLc}`)
    } else if (customerId) {
      query = query.eq('customer_id', customerId)
    } else if (emailLc) {
      query = query.eq('customer_email', emailLc)
    }

    const { data, error } = await query
    if (error) throw error

    let rows = []
    for (const o of (data || [])) {
      let items = Array.isArray(o.service_items) ? o.service_items : []
      // 若品項空，嘗試以 email 在時間窗內從 relay_reservations 回填（±2 小時）
      if (!items || items.length===0) {
        try {
          const emailFromOrder = String(o.customer_email||'').toLowerCase()
          const baseEmail = emailFromOrder || emailLc
          if (baseEmail) {
            const start = new Date(new Date(o.created_at).getTime() - 2*60*60*1000).toISOString()
            const end = new Date(new Date(o.created_at).getTime() + 2*60*60*1000).toISOString()
            const { data: rel } = await supabase
              .from('relay_reservations')
              .select('customer_email, customer_address, items_json, created_at')
              .eq('customer_email', baseEmail)
              .gte('created_at', start)
              .lte('created_at', end)
              .order('created_at', { ascending: false })
            if (Array.isArray(rel) && rel.length>0) {
              try { items = JSON.parse(rel[0].items_json||'[]') || [] } catch { items = [] }
            }
          }
        } catch {}
      }
      for (const it of (items||[])) {
        rows.push({
          reservation_number: o.order_number || o.id,
          status: o.status || 'pending',
          service_name: it.name,
          quantity: it.quantity,
          service_price: it.unitPrice || it.price,
          customer_address: o.customer_address || '',
          reservation_date: o.preferred_date || '',
          reservation_time: (o.preferred_time_start && o.preferred_time_end) ? `${o.preferred_time_start}-${o.preferred_time_end}` : (o.preferred_time_start || ''),
          source: 'orders'
        })
      }
    }

    // 備援：若 orders 無資料，改從 relay_reservations 撈近 7 天（以 email 比對）
    if (rows.length === 0 && emailLc) {
      try {
        const seven = new Date(Date.now() - 7*24*60*60*1000).toISOString()
        const { data: relays } = await supabase
          .from('relay_reservations')
          .select('customer_email, customer_address, preferred_date, preferred_time, items_json, created_at, id')
          .gte('created_at', seven)
          .order('created_at', { ascending: false })
        if (Array.isArray(relays)) {
          for (const r of relays) {
            if (String(r.customer_email||'').toLowerCase() !== emailLc) continue
            let items = []
            try { items = JSON.parse(r.items_json||'[]') } catch {}
            for (const it of (items||[])) {
              rows.push({
                reservation_number: String(r.id),
                status: 'pending',
                service_name: it.name,
                quantity: it.quantity,
                service_price: it.price || it.unitPrice,
                customer_address: r.customer_address || '',
                reservation_date: r.preferred_date || '',
                reservation_time: r.preferred_time || '',
                source: 'relay'
              })
            }
          }
        }
      } catch {}
    }
    
    // 新增：若使用 customerId 查不到，以 email 改查 orders 狀態 in (pending,draft)
    if (rows.length === 0 && emailLc) {
      try {
        const { data: pendings } = await supabase
          .from('orders')
          .select('id, order_number, customer_address, preferred_date, preferred_time_start, preferred_time_end, status, service_items, created_at, payment_method, points_used, points_deduct_amount')
          .in('status', ['pending','draft'])
          .eq('customer_email', emailLc)
          .order('created_at', { ascending: false })
        if (Array.isArray(pendings) && pendings.length>0) {
          for (const o of pendings) {
            const items = Array.isArray(o.service_items) ? o.service_items : []
            for (const it of items) {
              rows.push({
                reservation_number: o.order_number || o.id,
                status: o.status || 'pending',
                service_name: it.name,
                quantity: it.quantity,
                service_price: it.unitPrice,
                customer_address: o.customer_address || '',
                reservation_date: o.preferred_date || '',
                reservation_time: (o.preferred_time_start && o.preferred_time_end) ? `${o.preferred_time_start}-${o.preferred_time_end}` : (o.preferred_time_start || ''),
                source: 'orders'
              })
            }
          }
        }
      } catch {}
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, data: rows }) }
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ success: true, data: [] }) }
  }
}


