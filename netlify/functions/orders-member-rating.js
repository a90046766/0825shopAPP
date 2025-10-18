// Netlify Function: orders-member-rating
// 目的：會員好評/建議提交 → 建立 pending +50（好評/建議擇一，且各訂單限一次），同時落盤 member_feedback 與通知
// 用法：POST /.netlify/functions/orders-member-rating?customerId=MEMBER_ID&orderId=ORDER_ID
// Body: { kind: 'good'|'suggest', comment?: string, asset_path?: string }

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })
  try {
    if ((event.httpMethod||'').toUpperCase() !== 'POST') return json(405, { success:false, error:'method_not_allowed' })
    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json(500, { success:false, error:'missing_service_role' })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    const rawUrl = event.rawUrl || (`http://local${event.path||''}${event.rawQuery?`?${event.rawQuery}`:''}`)
    const u = new URL(rawUrl)
    const memberId = String(u.searchParams.get('customerId')||'')
    const orderId = String(u.searchParams.get('orderId')||'')
    let body = {}
    try { body = JSON.parse(event.body||'{}') } catch {}
    const kind = String(body.kind||'').toLowerCase()
    const comment = body.comment ? String(body.comment) : null
    const assetPath = body.asset_path ? String(body.asset_path) : null
    if (!['good','suggest'].includes(kind)) return json(400, { success:false, error:'invalid_kind' })
    if (!memberId || !orderId) return json(400, { success:false, error:'invalid_params' })

    // 擇一限制：同一會員+同一訂單，good/suggest 二擇一
    try {
      const { data: anyExisted } = await supabase
        .from('member_feedback')
        .select('id, kind')
        .eq('member_id', memberId)
        .eq('order_id', orderId)
        .in('kind', ['good','suggest'])
        .limit(1)
      if (Array.isArray(anyExisted) && anyExisted.length > 0) {
        return json(200, { success:false, error:'already_submitted_any' })
      }
    } catch {}

    // 寫入回饋紀錄（若表不存在則忽略錯誤）
    try {
      const { error: fbErr } = await supabase.from('member_feedback').insert({
        member_id: memberId,
        order_id: orderId,
        kind,
        comment,
        asset_path: assetPath,
        created_at: new Date().toISOString()
      })
      if (fbErr && !String(fbErr.message||'').toLowerCase().includes('does not exist')) {
        // 其他錯誤僅記錄，不中斷流程
      }
    } catch {}

    // 建立 pending（領取後入帳）：+50（若已存在 pending/claimed 則不重複建立）
    try {
      const reasons = ['好評+50','建議+50']
      const { data: pendRows } = await supabase
        .from('pending_points')
        .select('id,status')
        .eq('member_id', memberId)
        .eq('order_id', orderId)
        .in('reason', reasons)
        .in('status', ['pending','claimed'])
        .limit(1)
      if (Array.isArray(pendRows) && pendRows.length > 0) {
        return json(200, { success:true, message:'already_pending_or_claimed' })
      }
    } catch {}
    const delta = 50
    const reason = kind==='good' ? '好評+50' : '建議+50'
    const prow = { member_id: memberId, order_id: orderId, points: delta, reason, status: 'pending', created_at: new Date().toISOString() }
    const { error: pe } = await supabase.from('pending_points').insert(prow)
    if (pe) return json(200, { success:false, error:'insert_pending_failed', message: String(pe.message||pe) })

    // 通知客服/後台
    try {
      let memberCode = ''
      try {
        const { data: mem } = await supabase.from('members').select('code').eq('id', memberId).maybeSingle()
        memberCode = String(mem?.code || '')
      } catch {}
      const payload = { kind, member_id: memberId, member_code: memberCode || null, order_id: orderId, asset_path: assetPath||null, comment: comment||null }
      await supabase.from('notifications').insert({
        title: (kind === 'good' ? '客戶好評' : '客戶建議'),
        body: JSON.stringify(payload),
        target: 'support',
        created_at: new Date().toISOString()
      })
    } catch {}

    // 將回饋同步寫入 orders.signatures.customer_feedback（供會員訂單詳情顯示）
    try {
      const fetchOrder = async () => {
        let { data } = await supabase
          .from('orders')
          .select('id, order_number, signatures')
          .eq('order_number', orderId)
          .maybeSingle()
        if (!data) {
          const r2 = await supabase
            .from('orders')
            .select('id, order_number, signatures')
            .eq('id', orderId)
            .maybeSingle()
          data = r2.data || null
        }
        return data
      }
      const ord = await fetchOrder()
      if (ord) {
        const nowIso = new Date().toISOString()
        const sig = (ord.signatures && typeof ord.signatures==='object') ? ord.signatures : {}
        const fb = { kind, comment: comment||null, asset_path: assetPath||null, at: nowIso, member_id: memberId }
        const nextSig = { ...sig, customer_feedback: fb }
        await supabase.from('orders').update({ signatures: nextSig, updated_at: nowIso }).eq('id', ord.id)
      }
    } catch {}

    const debug = u.searchParams.get('debug') === '1'
    return json(200, { success:true, ...(debug?{ debug: { memberId, orderId, kind, created_pending: true } }: {}) })
  } catch (e) {
    return json(500, { success:false, error:'internal_error', message: String(e?.message||e) })
  }
}

/* Netlify Function: /api/orders/member/:customerId/orders/:orderId/rating
   目的：以 Service Role 寫入評分與好評截圖，避免 RLS 擋下（member_feedback）
*/

const { createClient } = require('@supabase/supabase-js')

exports.legacyHandlerDisabled = async (event) => {
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
        // 先檢查是否已提交過（同類型）
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
        // 擇一規則：同一會員+同訂單，good/suggest 只能擇一提交
        try {
          const { data: anyExisted } = await supabase
            .from('member_feedback')
            .select('id, kind')
            .eq('member_id', fb.member_id)
            .eq('order_id', fb.order_id)
            .in('kind', ['good','suggest'])
            .limit(1)
          if (Array.isArray(anyExisted) && anyExisted.length > 0) {
            return { statusCode: 200, body: JSON.stringify({ success: false, error: 'already_submitted_any' }) }
          }
        } catch {}
        // 欄位相容：若資料表使用不同命名，嘗試對應
        const rows = [fb]
        const { error } = await supabase.from('member_feedback').insert(rows)
        if (error) errorMsg = error.message || String(error)
        // 將回饋寫入 orders.signatures.customer_feedback（以 order_number 優先，否則以 id）
        try {
          const fetchOrder = async () => {
            let { data, error } = await supabase
              .from('orders')
              .select('id, order_number, signatures')
              .eq('order_number', fb.order_id)
              .maybeSingle()
            if (!data) {
              const r = await supabase
                .from('orders')
                .select('id, order_number, signatures')
                .eq('id', fb.order_id)
                .maybeSingle()
              data = r.data || null
            }
            return data
          }
          const ord = await fetchOrder()
          if (ord) {
            const nowIso = new Date().toISOString()
            const sig = (ord.signatures && typeof ord.signatures==='object') ? ord.signatures : {}
            const feedback = { kind: fb.kind, comment: fb.comment||null, asset_path: fb.asset_path||null, at: nowIso, member_id: fb.member_id }
            const nextSig = { ...sig, customer_feedback: feedback }
            await supabase.from('orders').update({ signatures: nextSig, updated_at: nowIso }).eq('id', ord.id)
          }
        } catch {}
        // 通知客服/後台：有新客戶反饋（好評/建議）
        try {
          // 取會員代碼以避免前端顯示 UUID
          let memberCode = ''
          try {
            const { data: mem } = await supabase.from('members').select('code').eq('id', fb.member_id).maybeSingle()
            memberCode = String(mem?.code || '')
          } catch {}
          const payload = { kind: fb.kind, member_id: fb.member_id, member_code: memberCode || null, order_id: fb.order_id, asset_path: fb.asset_path||null, comment: fb.comment||null }
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
              // 同步更新 members.points（供前台扣抵使用）
              try {
                const { data: m } = await supabase.from('members').select('points').eq('id', customerId).maybeSingle()
                const next = Number(m?.points || 0) + bonus
                await supabase.from('members').update({ points: next }).eq('id', customerId)
              } catch {}
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
          let memberCode = ''
          try {
            const { data: mem } = await supabase.from('members').select('code').eq('id', payload.member_id).maybeSingle()
            memberCode = String(mem?.code || '')
          } catch {}
          const note = { kind: 'score', member_id: payload.member_id, member_code: memberCode || null, order_id: payload.order_id, stars: payload.stars, comment: payload.comment||null }
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


