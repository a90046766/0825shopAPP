/* Netlify Function: /api/order-backfill
   用途：針對歷史已建立但缺欄位的訂單（service_items/address/status），自動回填。
   規則：
   - 依 order_number 讀取 orders；若 service_items 為空，嘗試以 email 近2小時內的 relay_reservations.items_json 回填
   - 若 status=draft 改為 pending
   - 若 platform 空或非「商」，改為「商」
*/

const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  try {
    const isJson = (event.headers?.['content-type'] || '').includes('application/json')
    const body = event.httpMethod === 'POST' ? (isJson ? JSON.parse(event.body||'{}') : {}) : (event.queryStringParameters||{})
    const orderNum = (body.order || '').trim()
    if (!orderNum) return { statusCode: 400, body: JSON.stringify({ ok:false, error:'缺少 order 參數' }) }

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    if (!url || !key) return { statusCode: 200, body: JSON.stringify({ ok:true, changed:false, reason:'no_service_key' }) }
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    // 取訂單
    const { data: o, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_phone, customer_email, customer_address, created_at, status, platform, service_items, preferred_date, preferred_time_start, preferred_time_end')
      .eq('order_number', orderNum)
      .maybeSingle()
    if (error) throw error
    if (!o) return { statusCode: 404, body: JSON.stringify({ ok:false, error:'not_found' }) }

    let patch = {}
    let fromRelay = null
    // 回填 service_items
    if (!Array.isArray(o.service_items) || o.service_items.length===0) {
      try {
        const emailLc = String(o.customer_email||'').toLowerCase()
        if (emailLc) {
          const start = new Date(new Date(o.created_at).getTime() - 2*60*60*1000).toISOString()
          const end = new Date(new Date(o.created_at).getTime() + 2*60*60*1000).toISOString()
          const { data: relays } = await supabase
            .from('relay_reservations')
            .select('customer_name, customer_phone, customer_email, customer_address, preferred_date, preferred_time, items_json, created_at')
            .eq('customer_email', emailLc)
            .gte('created_at', start)
            .lte('created_at', end)
            .order('created_at', { ascending: false })
          if (Array.isArray(relays) && relays.length>0) {
            try {
              const items = JSON.parse(relays[0].items_json||'[]')
              if (Array.isArray(items) && items.length>0) {
                patch = { ...patch, service_items: items.map(it=> ({ name: it.name, quantity: it.quantity, unitPrice: it.price || it.unitPrice || 0 })) }
                fromRelay = relays[0]
              }
              if ((!o.customer_address || o.customer_address.trim()==='') && relays[0].customer_address) {
                patch = { ...patch, customer_address: relays[0].customer_address }
              }
              if ((!o.customer_name || o.customer_name.trim()==='') && relays[0].customer_name) {
                patch = { ...patch, customer_name: relays[0].customer_name }
              }
              if ((!o.customer_phone || o.customer_phone.trim()==='') && relays[0].customer_phone) {
                patch = { ...patch, customer_phone: relays[0].customer_phone }
              }
              if ((!o.preferred_date || String(o.preferred_date).trim()==='') && relays[0].preferred_date) {
                patch = { ...patch, preferred_date: relays[0].preferred_date }
              }
              if ((!o.preferred_time_start || !o.preferred_time_end) && relays[0].preferred_time) {
                const t = String(relays[0].preferred_time||'')
                const m = t.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/)
                if (m) {
                  patch = { ...patch, preferred_time_start: m[1], preferred_time_end: m[2] }
                }
              }
            } catch {}
          }
        }
      } catch {}
    }

    // 狀態與平台規範
    if ((o.status||'')==='draft') patch = { ...patch, status: 'pending' }
    if (!o.platform || o.platform==='日') patch = { ...patch, platform: '商' }

    if (Object.keys(patch).length===0) {
      return { statusCode: 200, body: JSON.stringify({ ok:true, changed:false, reason:'no_changes' }) }
    }

    const { error: upErr } = await supabase.from('orders').update(patch).eq('id', o.id)
    if (upErr) throw upErr

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ ok:true, changed:true, patch, fromRelay: !!fromRelay })
    }
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ ok:true, changed:false, error: String(e?.message||e) }) }
  }
}


