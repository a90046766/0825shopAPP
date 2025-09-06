/* Netlify Function: /api/reservation-confirm/:orderNumber
   Purpose: 將 Supabase 中 status=pending 的預約訂單標記為 confirmed
*/

const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) }
  }
  try {
    const orderNumber = (event.path || '').split('/').pop()
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key || !orderNumber) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Bad Request' }) }
    }
    const supabase = createClient(url, key)
    const { error } = await supabase.from('orders').update({ status: 'confirmed' }).eq('order_number', orderNumber).eq('status', 'pending')
    if (error) throw error
    return { statusCode: 200, body: JSON.stringify({ success: true }) }
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ success: false }) }
  }
}


