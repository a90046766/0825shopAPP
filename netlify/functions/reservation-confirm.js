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
    // 標記為 confirmed
    const { data: updated, error } = await supabase
      .from('orders')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('order_number', orderNumber)
      .eq('status', 'pending')
      .select('id, order_number, customer_name, customer_email, preferred_date, preferred_time_start, preferred_time_end')
      .single()
    if (error) throw error

    // 會員通知（回傳到 APP）
    try {
      const ord = updated || {}
      const email = (ord.customer_email || '').toLowerCase()
      if (email) {
        await supabase.from('notifications').insert({
          title: '訂單成立通知',
          body: `親愛的${ord.customer_name||''}您好，感謝您的惠顧！您${ord.preferred_date||''}的服務已確認，訂單編號 ${ord.order_number}。技師將於 ${(ord.preferred_time_start||'')}-${(ord.preferred_time_end||'')} 抵達，請保持電話暢通。建議加入官方 LINE：@942clean，以利溝通與留存紀錄。`,
          level: 'info',
          target: 'user',
          target_user_email: email,
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
      }
    } catch {}

    return { statusCode: 200, body: JSON.stringify({ success: true }) }
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ success: false }) }
  }
}


