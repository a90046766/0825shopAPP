/* Netlify Function: /api/products-list
   以 Service Role 讀取商品清單，強化穩定性與效能（可被快取）。
*/
const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    const publishedOnly = String((event.queryStringParameters || {}).publishedOnly || '1') === '1'
    if (!url || !key) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
        body: JSON.stringify({ ok: false, error: 'missing_service_role' })
      }
    }

    const supabase = createClient(url, key, { auth: { persistSession: false } })

    // 嘗試使用完整排序，失敗則退回簡化排序
    let data = null
    {
      let q = supabase
        .from('products')
        .select('id,name,unit_price,group_price,group_min_qty,description,features,image_urls,head_images,category,mode_code,published,store_sort,updated_at')
        .order('store_sort', { ascending: true })
        .order('updated_at', { ascending: false })
      if (publishedOnly) q = q.eq('published', true)
      const { data: d, error } = await q
      if (!error) data = d
    }
    if (!data) {
      let q = supabase
        .from('products')
        .select('id,name,unit_price,group_price,group_min_qty,description,features,image_urls,head_images,category,mode_code,published,updated_at')
        .order('updated_at', { ascending: false })
      if (publishedOnly) q = q.eq('published', true)
      const { data: d, error } = await q
      if (error) throw error
      data = d
    }

    const mapped = (data || []).map((r) => ({
      id: String(r.id),
      name: r.name || '',
      description: r.description || '',
      price: Number(r.unit_price || 0),
      groupPrice: r.group_price ?? null,
      groupMinQty: r.group_min_qty ?? null,
      category: r.mode_code || r.category || 'cleaning',
      features: Array.isArray(r.features) ? r.features : [],
      image: Array.isArray(r.image_urls) && r.image_urls[0] ? r.image_urls[0] : '',
      images: Array.isArray(r.image_urls) ? r.image_urls : [],
      headImages: Array.isArray(r.head_images) ? r.head_images : [],
      published: !!r.published,
      updatedAt: r.updated_at || null,
    }))

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // 前端可被 CDN 短暫快取，並允許過期後背景刷新
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300'
      },
      body: JSON.stringify({ ok: true, data: mapped })
    }
  } catch (e) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ ok: false, error: String(e?.message || e) })
    }
  }
}














