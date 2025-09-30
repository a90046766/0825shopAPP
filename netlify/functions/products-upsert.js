/* Netlify Function: /api/products-upsert
   以 Service Role 寫入/更新商品，避免前端 RLS 受阻。*/
const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  // CORS 預檢
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: false, error: 'method_not_allowed' }) }
  }
  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    if (!url || !key) {
      return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ ok: false, error: 'missing_service_role' }) }
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } })
    const payload = JSON.parse(event.body || '{}')
    const allowed = [
      'id','name','unit_price','group_price','group_min_qty','description','detail_html','content',
      'features','image_urls','head_images','category','mode_code','published','show_ac_advisor','updated_at'
    ]
    const row = {}
    for (const k of allowed) if (k in payload) row[k] = payload[k]
    if (!row.id) {
      row.id = (Date.now().toString(36) + Math.random().toString(36).slice(2))
    }
    const { data, error } = await supabase.from('products').upsert(row, { onConflict: 'id' }).select('id').single()
    if (error) throw error
    return { statusCode: 200, headers: successHeaders(), body: JSON.stringify({ ok: true, id: data.id }) }
  } catch (e) {
    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ ok: false, error: String(e?.message || e) }) }
  }
}

function corsHeaders() {
  return { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
}
function successHeaders() {
  return { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=120' }
}
