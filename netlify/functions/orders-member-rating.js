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

    // 解析 path 或 query 取得參數（相容 redirect 附加 query）
    const parts = (event.path || '').split('/')
    const u = new URL((event.rawUrl || 'http://local') + (event.rawQuery ? ('?'+event.rawQuery) : ''))
    const qOrderId = u.searchParams.get('orderId') || ''
    const qCustomerId = u.searchParams.get('customerId') || ''
    const orderId = decodeURIComponent(qOrderId || parts[parts.length - 2] || '')
    const customerId = decodeURIComponent(qCustomerId || parts[parts.length - 4] || '')

    let errorMsg = null
    try {
      if (body && (body.kind === 'good' || body.kind === 'suggest')) {
        // 好評/建議回饋：沿用現有表結構（避免 schema 變更）
        const fb = {
          member_id: customerId || body.memberId || null,
          order_id: orderId || body.orderId || null,
          kind: body.kind,
          comment: body.comment || null,
          asset_path: body.asset_path || null,
          created_at: new Date().toISOString()
        }
        // 先檢查是否已提交過
        try {
          const { data: existed } = await supabase
            .from('member_feedback')
            .select('id')
            .eq('member_id', fb.member_id)
            .eq('order_id', fb.order_id)
            .eq('kind', fb.kind)
            .limit(1)
          if (Array.isArray(existed) && existed.length>0) {
            return { statusCode: 200, body: JSON.stringify({ success: false, error: 'already_submitted' }) }
          }
        } catch {}
        const { error } = await supabase.from('member_feedback').insert(fb)
        if (error) errorMsg = error.message || String(error)
      } else {
        // 評分模式
        const payload = {
          member_id: customerId || body.memberId || null,
          order_id: orderId || body.orderId || null,
          stars: Number(body.stars || 5),
          score: Number(body.score || 100),
          comment: body.comment || '',
          highlights: JSON.stringify(body.highlights || []),
          issues: JSON.stringify(body.issues || []),
          recommend: Boolean(body.recommend !== false),
          created_at: new Date().toISOString()
        }
        try {
          const { data: existed } = await supabase
            .from('member_feedback')
            .select('id')
            .eq('member_id', payload.member_id)
            .eq('order_id', payload.order_id)
            .is('kind', null)
            .limit(1)
          if (Array.isArray(existed) && existed.length>0) {
            return { statusCode: 200, body: JSON.stringify({ success: false, error: 'already_submitted' }) }
          }
        } catch {}
        const { error } = await supabase.from('member_feedback').insert(payload)
        if (error) errorMsg = error.message || String(error)
      }
    } catch (e) { errorMsg = String(e?.message || e) }

    return { statusCode: 200, body: JSON.stringify({ success: !errorMsg, error: errorMsg }) }
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ success: true, error: String(e?.message || e) }) }
  }
}


