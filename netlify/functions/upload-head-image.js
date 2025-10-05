/* Netlify Function: /api/upload-head-image
   以 Service Role 將前端上傳（壓縮後）的圖片存入 Supabase Storage，回傳公開 URL。
*/
const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  // CORS 預檢
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: 'method_not_allowed' })
    }
  }

  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    if (!url || !key) {
      return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ ok: false, error: 'missing_service_role' }) }
    }

    const supabase = createClient(url, key, { auth: { persistSession: false } })
    const { productId, filename, contentType, dataBase64 } = JSON.parse(event.body || '{}')
    if (!dataBase64 || !contentType) {
      return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ ok: false, error: 'invalid_payload' }) }
    }

    const bucket = 'product-head-images'
    // 嘗試建立公開 bucket（若已存在會失敗，忽略）
    try {
      await supabase.storage.createBucket(bucket, { public: true })
    } catch (e) {
      // ignore when exists
    }

    const safeExt = (filename || 'image.jpg').split('?')[0].split('#')[0]
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeExt}`
    const path = `product/${productId || 'misc'}/${name}`
    const buffer = Buffer.from(dataBase64, 'base64')

    const { error: upErr } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType: contentType || 'image/jpeg',
      upsert: false
    })
    if (upErr) throw upErr

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    const publicUrl = data?.publicUrl
    if (!publicUrl) throw new Error('no_public_url')

    return { statusCode: 200, headers: successHeaders(), body: JSON.stringify({ ok: true, url: publicUrl }) }
  } catch (e) {
    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ ok: false, error: String(e?.message || e) }) }
  }
}

function corsHeaders() {
  return { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
}
function successHeaders() {
  return { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300' }
}


