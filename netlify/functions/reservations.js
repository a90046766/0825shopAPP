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

    const rows = (data || []).map((o) => {
      const items = Array.isArray(o.service_items) ? o.service_items : []
      return {
        id: o.id,
        orderNumber: o.order_number || o.id,
        customerName: o.customer_name || '',
        customerPhone: o.customer_phone || '',
        customerEmail: o.customer_email || '',
        customerAddress: o.customer_address || '',
        reservationDate: o.preferred_date || '',
        reservationTime: (o.preferred_time_start && o.preferred_time_end) ? `${String(o.preferred_time_start).slice(0,5)}-${String(o.preferred_time_end).slice(0,5)}` : (String(o.preferred_time_start||'').slice(0,5) || ''),
        status: o.status || 'pending',
        items: items.map((it) => ({ name: it.name, quantity: it.quantity, unitPrice: it.unitPrice }))
      }
    })

    return { statusCode: 200, body: JSON.stringify({ success: true, data: rows }) }
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ success: true, data: [] }) }
  }
}


