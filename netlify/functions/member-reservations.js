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

    // 讀取 pending 的預約訂單（對應會員）
    let query = supabase
      .from('orders')
      .select('id, order_number, customer_id, customer_email, customer_address, preferred_date, preferred_time_start, preferred_time_end, status, service_items, created_at')
      .eq('status', 'pending')
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

    const rows = []
    for (const o of (data || [])) {
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
        })
      }
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, data: rows }) }
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ success: true, data: [] }) }
  }
}


