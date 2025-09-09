/* Netlify Function: /api/products/sync-from-shop
   將購物站（ShopProductsPage）靜態清單作為來源，upsert 到 public.products。
   - 支援 GET/POST；任何狀況皆回 200
   - 使用 Service Role Key（僅供伺服端）
*/
const { createClient } = require('@supabase/supabase-js')

// 來源品項（精簡必要欄位；可後續擴充）
const catalog = [
  // cleaning
  { name: '分離式冷氣清洗', price: 1800, groupPrice: 1600, groupMinQty: 3, category: 'cleaning',
    description: '室內外機標準清洗，包含濾網、蒸發器、冷凝器清潔，延長冷氣壽命',
    features: ['專業技師','環保清潔劑','30天保固','免費檢測'],
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80' },
  { name: '窗型冷氣清洗', price: 1500, groupPrice: 1350, groupMinQty: 3, category: 'cleaning',
    description: '窗型冷氣深度清洗，除塵、除菌、除異味，恢復冷房效果',
    features: ['深度清洗','除菌除臭','30天保固','免費檢測'],
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80' },
  { name: '洗衣機清洗（滾筒）', price: 1999, groupPrice: 1799, groupMinQty: 3, category: 'cleaning',
    description: '滾筒式洗衣機拆洗保養，包含內筒、外筒、管路清潔，去除黴菌',
    features: ['拆洗保養','除黴除菌','30天保固','免費檢測'],
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80' },
  { name: '洗衣機清洗（直立）', price: 1799, groupPrice: 1619, groupMinQty: 3, category: 'cleaning',
    description: '直立式洗衣機深度清洗，去除洗衣槽污垢，恢復清潔效果',
    features: ['深度清洗','除垢除菌','30天保固','免費檢測'],
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80' },
  { name: '倒T型抽油煙機清洗', price: 2200, groupPrice: 2000, groupMinQty: 3, category: 'cleaning',
    description: '不鏽鋼倒T型抽油煙機，包含內部機械清洗，去除油垢',
    features: ['機械清洗','除油除垢','30天保固','免費檢測'],
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80' },
  { name: '傳統雙渦輪抽油煙機清洗', price: 1800, groupPrice: 1600, groupMinQty: 3, category: 'cleaning',
    description: '傳統型雙渦輪抽油煙機清洗保養，恢復吸油煙效果',
    features: ['渦輪清洗','除油除垢','30天保固','免費檢測'],
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80' },
  { name: '冰箱清洗除臭', price: 1600, groupPrice: 1440, groupMinQty: 3, category: 'cleaning',
    description: '冰箱內部深度清洗，去除異味，除菌消毒，延長使用壽命',
    features: ['深度清洗','除臭除菌','30天保固','免費檢測'],
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80' },
  { name: '熱水器除垢清洗', price: 1400, groupPrice: 1260, groupMinQty: 3, category: 'cleaning',
    description: '電熱水器除垢清洗，延長使用壽命，提高加熱效率',
    features: ['除垢清洗','延長壽命','30天保固','免費檢測'],
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80' },
  // new
  { name: '日立分離式冷氣', price: 25000, category: 'new',
    description: '變頻分離式冷氣，節能省電，靜音設計',
    features: ['變頻節能','靜音設計','原廠保固','免費安裝'],
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80' },
  { name: 'LG滾筒洗衣機', price: 32000, category: 'new',
    description: '大容量滾筒洗衣機，蒸汽除菌，智能控制',
    features: ['大容量','蒸汽除菌','原廠保固','免費安裝'],
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80' },
  { name: '櫻花抽油煙機', price: 15000, category: 'new',
    description: '強力抽油煙機，靜音設計，易清潔',
    features: ['強力抽風','靜音設計','原廠保固','免費安裝'],
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80' },
  // used
  { name: '二手分離式冷氣', price: 8000, category: 'used',
    description: '品質檢驗二手冷氣，功能正常，價格實惠',
    features: ['品質檢驗','功能正常','90天保固','環保選擇'],
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80' },
  { name: '二手洗衣機', price: 5000, category: 'used',
    description: '檢驗合格二手洗衣機，節省預算，環保選擇',
    features: ['檢驗合格','節省預算','90天保固','環保選擇'],
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80' },
  { name: '二手冰箱', price: 6000, category: 'used',
    description: '功能正常二手冰箱，大容量，適合小家庭',
    features: ['功能正常','大容量','90天保固','環保選擇'],
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80' },
  // home
  { name: '定期居家清潔', price: 2500, category: 'home',
    description: '每週/每月定期清潔服務，保持居家環境整潔',
    features: ['定期服務','專業清潔','滿意保證','環保清潔劑'],
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80' },
  { name: '深度居家清潔', price: 3500, category: 'home',
    description: '年度深度清潔，包含死角、高處、特殊區域',
    features: ['深度清潔','死角處理','滿意保證','環保清潔劑'],
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80' },
  { name: '搬家清潔服務', price: 4000, category: 'home',
    description: '搬家前後清潔服務，讓新家煥然一新',
    features: ['搬家清潔','全面清潔','滿意保證','環保清潔劑'],
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80' }
]

exports.handler = async (event) => {
  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    if (!url || !key) {
      return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'missing_service_role' }) }
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    let sort = 100
    const results = []
    for (const item of catalog) {
      try {
        // 先查是否存在（以 name 當 key）
        const { data: existing } = await supabase.from('products').select('id').eq('name', item.name).maybeSingle()
        const row = {
          name: item.name,
          unit_price: item.price,
          group_price: item.groupPrice ?? null,
          group_min_qty: item.groupMinQty ?? null,
          description: item.description ?? null,
          features: Array.isArray(item.features) ? item.features : [],
          category: item.category,
          mode_code: item.category, // 服務/新/二手/居家，與前台一致
          image_urls: [item.image],
          published: true,
          store_sort: sort++,
          updated_at: new Date().toISOString()
        }
        if (existing?.id) {
          const { error: upErr } = await supabase.from('products').update(row).eq('id', existing.id)
          if (upErr) throw upErr
          results.push({ name: item.name, action: 'update' })
        } else {
          const { error: inErr } = await supabase.from('products').insert(row)
          if (inErr) throw inErr
          results.push({ name: item.name, action: 'insert' })
        }
      } catch (e) {
        results.push({ name: item.name, action: 'error', message: String(e?.message || e) })
      }
    }

    return { statusCode: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({ ok: true, results }) }
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: String(e?.message || e) }) }
  }
}


