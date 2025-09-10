/* Netlify Function: /api/products-upsert
   用 Service Role 直寫 public.products，避免前端 RLS/CORS 受阻。
*/
const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }
  try {
    const payload = JSON.parse(event.body || '{}')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    if (!url || !key) {
      return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'missing_service_role' }) }
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    const p = payload || {}
    const row = {
      name: p.name ?? '',
      unit_price: Number(p.price ?? 0),
      group_price: p.groupPrice ?? null,
      group_min_qty: p.groupMinQty ?? null,
      description: p.description ?? '',
      features: Array.isArray(p.features) ? p.features : [],
      image_urls: Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image ? [p.image] : []),
      category: p.category ?? 'cleaning',
      mode_code: p.category ?? 'cleaning',
      published: !!p.published,
      store_sort: p.store_sort ?? null,
      updated_at: new Date().toISOString()
    }

    let result = null
    if (p.id) {
      const { data, error } = await supabase.from('products').update(row).eq('id', p.id).select('id').maybeSingle()
      if (error) throw error
      result = data
    } else {
      if (!row.store_sort) {
        // 以最大 store_sort + 1 作為新排序，避免 RPC 依賴
        const { data: top } = await supabase
          .from('products')
          .select('store_sort')
          .order('store_sort', { ascending: false })
          .limit(1)
        const currentMax = Array.isArray(top) && top[0]?.store_sort ? Number(top[0].store_sort) : 0
        row.store_sort = currentMax + 1
      }
      const { data, error } = await supabase.from('products').insert(row).select('id').maybeSingle()
      if (error) throw error
      result = data
    }

    return { statusCode: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({ ok: true, id: result?.id || null }) }
  } catch (e) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({ ok: false, error: String(e?.message || e) }) }
  }
}


