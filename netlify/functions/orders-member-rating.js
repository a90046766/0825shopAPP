/* Netlify Function: /api/orders/member/:customerId/orders/:orderId/rating
   目的：以 Service Role 寫入評分與好評截圖，避免 RLS 擋下（member_feedback）
*/

const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) }
  }
  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      return { statusCode: 200, body: JSON.stringify({ success: true, data: { note: 'no_service_key' } }) }
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    const isJson = (event.headers?.['content-type'] || '').includes('application/json')
    const body = isJson ? JSON.parse(event.body || '{}') : {}

    // 解析 path 取得參數
    const parts = (event.path || '').split('/')
    const orderId = decodeURIComponent(parts[parts.length - 2] || '') // .../orders/:orderId/rating
    const customerId = decodeURIComponent(parts[parts.length - 4] || '') // .../member/:customerId/orders/...

    const payload = {
      member_id: customerId || body.memberId || null,
      order_id: orderId || body.orderId || null,
      stars: Number(body.stars || 5),
      score: Number(body.score || 100),
      comment: body.comment || '',
      highlights: JSON.stringify(body.highlights || []),
      issues: JSON.stringify(body.issues || []),
      recommend: Boolean(body.recommend !== false),
      photos: JSON.stringify(body.photos || body.images || []),
      created_at: new Date().toISOString()
    }

    // 嘗試插入，失敗不丟出（回傳成功避免前端中斷），但帶錯誤訊息以便除錯
    let errorMsg = null
    try {
      const { error } = await supabase.from('member_feedback').insert(payload)
      if (error) errorMsg = error.message || String(error)
    } catch (e) { errorMsg = String(e?.message || e) }

    return { statusCode: 200, body: JSON.stringify({ success: true, error: errorMsg }) }
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ success: true, error: String(e?.message || e) }) }
  }
}


