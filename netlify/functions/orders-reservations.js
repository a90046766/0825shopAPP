/* Netlify Function: /api/orders/reservations
   Purpose: Receive reservation payload from前端並作為保險存檔（不阻斷主流程）
   Behavior:
   - 若設有 SUPABASE_SERVICE_ROLE_KEY，則寫入 Supabase 表 relay_reservations
   - 否則僅回傳 success:true
*/

const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) }
  }
  try {
    const payload = JSON.parse(event.body || '{}')

    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

    if (url && key) {
      const supabase = createClient(url, key)
      // 確保表存在（若無權限/不存在則忽略錯誤）
      try {
        // 直接寫入一筆 relay（僅保留必要欄位）
        const row = {
          customer_name: payload?.customer?.name || null,
          customer_phone: payload?.customer?.phone || null,
          customer_email: payload?.customer?.email || null,
          customer_address: payload?.customer?.address || null,
          preferred_date: payload?.preferredDate || null,
          preferred_time: payload?.preferredTime || null,
          note: payload?.note || null,
          items_json: JSON.stringify(payload?.items || []),
        }
        await supabase.from('relay_reservations').insert(row)
      } catch (e) {
        console.warn('relay_reservations insert ignored:', e?.message || e)
      }
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) }
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ success: true }) }
  }
}


