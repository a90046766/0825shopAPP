/* Netlify Function: /api/customers
   行為：
   - 支援 GET/POST；GET 用於不阻斷流程的探測，POST 嘗試建立/補齊 customers
   - 任何狀況皆回 200
*/
const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  const method = event.httpMethod || 'GET'
  try {
    const isJson = (event.headers?.['content-type'] || '').includes('application/json')
    const payload = method === 'POST'
      ? (isJson ? JSON.parse(event.body || '{}') : {})
      : (event.queryStringParameters || {})

    // GET 模式：立即回 200，避免 405
    if (method !== 'POST') {
      return { statusCode: 200, body: JSON.stringify({ success: true, probe: true }) }
    }

    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    if (url && key) {
      const supabase = createClient(url, key, { auth: { persistSession: false } })
      try {
        const email = (payload?.email || '').toLowerCase()
        if (email) {
          const { data: existing } = await supabase.from('customers').select('id').eq('email', email).maybeSingle()
          if (!existing) {
            await supabase.from('customers').insert({
              name: payload?.name || '',
              phone: payload?.phone || '',
              email,
              address: payload?.address || ''
            })
          }
        }
      } catch (e) {
        console.warn('customers ensure ignored:', e?.message || e)
      }
    }
    return { statusCode: 200, body: JSON.stringify({ success: true }) }
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ success: true }) }
  }
}

