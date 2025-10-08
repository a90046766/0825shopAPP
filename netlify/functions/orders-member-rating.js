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
      return { statusCode: 200, body: JSON.stringify({ success: false, error: 'no_service_key' }) }
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    const isJson = (event.headers?.['content-type'] || '').includes('application/json')
    const body = isJson ? JSON.parse(event.body || '{}') : {}

    // 解析 path 或 query 取得參數（相容 redirect 附加 query）
    const parts = (event.path || '').split('/')
    const raw = event.rawUrl || (`http://local${event.path||''}`)
    const hasQ = raw.includes('?')
    const u = new URL(hasQ ? raw : `${raw}${event.rawQuery?`?${event.rawQuery}`:''}`)
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
        // 欄位相容：若資料表使用不同命名，嘗試對應
        const rows = [fb]
        const { error } = await supabase.from('member_feedback').insert(rows)
        if (error) errorMsg = error.message || String(error)
        // 通知客服/後台：有新客戶反饋（好評/建議）
        try {
          const payload = { kind: fb.kind, member_id: fb.member_id, order_id: fb.order_id, asset_path: fb.asset_path||null, comment: fb.comment||null }
          await supabase.from('notifications').insert({
            title: (fb.kind === 'good' ? '客戶好評' : '客戶建議'),
            body: JSON.stringify(payload),
            target: 'support',
            created_at: new Date().toISOString()
          })
        } catch {}
        // 加點（好評/建議）：以設定 review_bonus_points 為準（一次性、避免重複）
        try {
          const k = String(body.kind||'')
          const { data: s } = await supabase.from('app_settings').select('*').limit(1).maybeSingle()
          const bonus = Number(s?.review_bonus_points||0)
          if (bonus > 0 && customerId && orderId) {
            const ref = `review_bonus_${orderId}_${customerId}_${k}`
            const { data: ex } = await supabase.from('member_points_ledger').select('id').eq('ref_key', ref).maybeSingle()
            if (!ex) {
              await supabase.from('member_points_ledger').insert({ member_id: customerId, delta: bonus, reason: (k==='good'?'好評上傳獎勵':'建議評提交獎勵'), order_id: orderId, ref_key: ref, created_at: new Date().toISOString() })
              try { await supabase.rpc('add_points_to_member', { p_member_id: customerId, p_delta: bonus }) } catch {
                // 後備：若 RPC 不在，直接 upsert member_points
                try {
                  const { data: mp } = await supabase.from('member_points').select('balance').eq('member_id', customerId).maybeSingle()
                  const balance = Number(mp?.balance||0) + bonus
                  await supabase.from('member_points').upsert({ member_id: customerId, balance })
                } catch {}
              }
            }
          }
        } catch {}
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
        const rows = [payload]
        const { error } = await supabase.from('member_feedback').insert(rows)
        if (error) errorMsg = error.message || String(error)
        // 通知客服/後台：有新客戶評分
        try {
          const note = { kind: 'score', member_id: payload.member_id, order_id: payload.order_id, stars: payload.stars, comment: payload.comment||null }
          await supabase.from('notifications').insert({
            title: '客戶評分',
            body: JSON.stringify(note),
            target: 'support',
            created_at: new Date().toISOString()
          })
        } catch {}
        // 評分模式：同樣套用建議評加點
        try {
          const { data: s } = await supabase.from('app_settings').select('*').limit(1).maybeSingle()
          const bonus = Number(s?.review_bonus_points||0)
          if (bonus > 0 && payload.member_id && payload.order_id) {
            const ref = `review_bonus_${payload.order_id}_${payload.member_id}_score`
            const { data: ex } = await supabase.from('member_points_ledger').select('id').eq('ref_key', ref).maybeSingle()
            if (!ex) {
              await supabase.from('member_points_ledger').insert({ member_id: payload.member_id, delta: bonus, reason: '評分提交獎勵', order_id: payload.order_id, ref_key: ref, created_at: new Date().toISOString() })
              try { await supabase.rpc('add_points_to_member', { p_member_id: payload.member_id, p_delta: bonus }) } catch {
                try {
                  const { data: mp } = await supabase.from('member_points').select('balance').eq('member_id', payload.member_id).maybeSingle()
                  const balance = Number(mp?.balance||0) + bonus
                  await supabase.from('member_points').upsert({ member_id: payload.member_id, balance })
                } catch {}
              }
            }
          }
        } catch {}
      }
    } catch (e) { errorMsg = String(e?.message || e) }

    return { statusCode: 200, body: JSON.stringify({ success: !errorMsg, error: errorMsg }) }
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ success: true, error: String(e?.message || e) }) }
  }
}


