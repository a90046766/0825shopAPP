/* Netlify Function: /api/customers
   Purpose: Ensure a customer record exists in Supabase (best-effort)
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


