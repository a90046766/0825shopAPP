/* Netlify Function: /api/notifications/*
   Supported:
   - GET /api/notifications/member/:memberId -> list member notifications (best-effort via Supabase)
*/
const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  try {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    const supabase = (url && key) ? createClient(url, key) : null

    const path = event.path || ''
    const parts = path.split('/').filter(Boolean)
    // expect: ['.netlify','functions','notifications','member',':id'] OR ['api','notifications','member',':id']
    const idx = parts.lastIndexOf('notifications')
    const seg1 = parts[idx+1]
    const seg2 = parts[idx+2]

    if (event.httpMethod === 'GET' && seg1 === 'member' && seg2) {
      const memberId = decodeURIComponent(seg2)
      let list = []
      if (supabase) {
        // Try member_notifications (preferred)
        try {
          const { data, error } = await supabase
            .from('member_notifications')
            .select('*')
            .eq('customer_id', memberId)
            .order('created_at', { ascending: false })
          if (!error && Array.isArray(data)) {
            list = data.map((r) => ({
              id: r.id,
              title: r.title || '',
              body: r.message || r.body || '',
              isRead: !!r.is_read,
              createdAt: r.created_at
            }))
          }
        } catch {}
        // Fallback: notifications (member_id column)
        if (list.length === 0) {
          try {
            const { data, error } = await supabase
              .from('notifications')
              .select('*')
              .eq('member_id', memberId)
              .order('created_at', { ascending: false })
            if (!error && Array.isArray(data)) {
              list = data.map((r) => ({
                id: r.id,
                title: r.title || '',
                body: r.message || r.body || '',
                isRead: !!r.is_read,
                createdAt: r.created_at
              }))
            }
          } catch {}
        }
      }
      return { statusCode: 200, body: JSON.stringify({ success: true, data: list }) }
    }

    return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) }
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ success: true, data: [] }) }
  }
}


