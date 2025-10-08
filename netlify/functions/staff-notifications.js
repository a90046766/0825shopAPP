// Netlify Function: staff-notifications
// 目的：以 Service Role 聚合提供員工/客服小鈴鐺通知，補齊 JSON、member_code，並去重

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })
  try {
    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json(200, { success: false, error: 'missing_service_role' })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    const raw = event.rawUrl || (`http://local${event.path||''}${event.rawQuery?`?${event.rawQuery}`:''}`)
    const u = new URL(raw)
    const emailLc = (u.searchParams.get('email') || '').toLowerCase()

    // 讀取最新通知
    const { data, error } = await supabase
      .from('notifications')
      .select('id,title,body,message,target,target_user_email,targetEmails,created_at,expires_at,sent_at,scheduled_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) return json(200, { success: false, error: error.message })

    const now = new Date()
    let list = (data||[])
      .filter((n)=>{
        const t = String(n.target||'')
        if (t==='all') return true
        if (t==='support' || t==='staff' || t==='admin' || t==='tech' || t==='technician' || t==='technicians') return true
        if (t==='subset') {
          try {
            const arr = Array.isArray(n.targetEmails) ? n.targetEmails : JSON.parse(String(n.targetEmails||'[]'))
            const set = new Set((arr||[]).map((x)=> String(x||'').toLowerCase()))
            return emailLc ? set.has(emailLc) : false
          } catch { return false }
        }
        // 不接收 target='user'（會員個人通知）
        return false
      })
      .filter((n)=>{
        const notExpired = !n.expires_at || new Date(n.expires_at) > now
        const delivered = (n.sent_at && new Date(n.sent_at) <= now) || (n.scheduled_at && new Date(n.scheduled_at) <= now) || !n.sent_at
        return notExpired && delivered
      })
      .map((n)=>{
        let dataObj = null
        try { if (n.body && typeof n.body==='string' && n.body.trim().startsWith('{')) dataObj = JSON.parse(n.body) } catch {}
        if (!dataObj) {
          try {
            const text = String(n.body || n.message || '')
            const title = String(n.title || '')
            const uuid = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
            const od = text.match(/\bOD[0-9]+\b/i)
            const kind = title.includes('好評') ? 'good' : (title.includes('建議') ? 'suggest' : (title.includes('評分') ? 'score' : undefined))
            if (uuid || od || kind) {
              dataObj = {
                kind,
                member_id: uuid ? uuid[0] : undefined,
                order_id: od ? od[0] : undefined,
                comment: kind==='suggest' ? text : undefined
              }
            }
          } catch {}
        }
        return {
          id: n.id,
          title: n.title,
          message: dataObj ? '' : (n.body || n.message),
          data: dataObj,
          is_read: false,
          created_at: n.created_at
        }
      })

    // 去重（優先 JSON）
    try {
      const map = {}
      for (const it of list) {
        const key = (()=>{
          try { if (it.data && it.data.kind && it.data.order_id) return `${it.data.kind}:${it.data.order_id}:${it.data.member_id||''}` } catch {}
          return `${it.title}|${it.message||''}`
        })()
        if (!map[key]) map[key] = it
        else if (!!it.data && !map[key].data) map[key] = it
      }
      list = Object.values(map)
    } catch {}

    // 讀取已讀
    try {
      const ids = list.map((it)=> it.id).filter(Boolean)
      if (ids.length>0 && emailLc) {
        const { data: reads } = await supabase
          .from('notifications_read')
          .select('notification_id')
          .in('notification_id', ids)
          .eq('user_email', emailLc)
        const readSet = new Set((reads||[]).map((r)=> r.notification_id))
        list = list.map((it)=> ({ ...it, is_read: readSet.has(it.id) || !!it.is_read }))
      }
    } catch {}

    // 以 member_id 批次補 code
    try {
      const needIds = Array.from(new Set(list
        .map((it)=> String(it?.data?.member_id||'').trim())
        .filter((x)=> !!x)))
      if (needIds.length>0) {
        const { data: mems } = await supabase
          .from('members')
          .select('id,code')
          .in('id', needIds)
        const codeMap = new Map((mems||[]).map((m)=> [String(m.id), String(m.code||'')]))
        list = list.map((it)=> {
          if (it?.data?.member_id && !it?.data?.member_code) {
            const code = codeMap.get(String(it.data.member_id)) || ''
            return { ...it, data: { ...it.data, member_code: code||null } }
          }
          return it
        })
      }
    } catch {}

    // 若仍缺 code，透過 order -> orders(customer_email/phone) -> members 補碼
    try {
      const missing = list.filter((it)=> it?.data && !it?.data?.member_code && !!it?.data?.order_id)
      const orderIds = Array.from(new Set(missing.map((it)=> String(it.data.order_id))))
      if (orderIds.length>0) {
        let orders = []
        try {
          const { data: o1 } = await supabase
            .from('orders')
            .select('id, order_number, customer_email, customer_phone')
            .in('order_number', orderIds)
          orders = Array.isArray(o1) ? o1 : []
        } catch {}
        try {
          const foundNumbers = new Set(orders.map((o)=> String(o.order_number||'')))
          const rest = orderIds.filter(id => !foundNumbers.has(String(id)))
          if (rest.length>0) {
            const { data: o2 } = await supabase
              .from('orders')
              .select('id, order_number, customer_email, customer_phone')
              .in('id', rest)
            if (Array.isArray(o2)) orders = [...orders, ...o2]
          }
        } catch {}

        const emails = Array.from(new Set(orders.map((o)=> String(o.customer_email||'').toLowerCase()).filter(Boolean)))
        const phones = Array.from(new Set(orders.map((o)=> String(o.customer_phone||'')).filter(Boolean)))

        const emailMap = new Map()
        const phoneMap = new Map()
        try {
          if (emails.length>0) {
            const { data: ms } = await supabase
              .from('members')
              .select('email,code')
              .in('email', emails)
            for (const m of (ms||[])) emailMap.set(String(m.email||'').toLowerCase(), String(m.code||''))
          }
        } catch {}
        try {
          if (phones.length>0) {
            const { data: ms2 } = await supabase
              .from('members')
              .select('phone,code')
              .in('phone', phones)
            for (const m of (ms2||[])) phoneMap.set(String(m.phone||''), String(m.code||''))
          }
        } catch {}

        const orderToCode = new Map()
        for (const o of orders) {
          const codeByEmail = emailMap.get(String(o.customer_email||'').toLowerCase()) || ''
          const codeByPhone = phoneMap.get(String(o.customer_phone||'')) || ''
          const code = codeByEmail || codeByPhone || ''
          if (code) orderToCode.set(String(o.order_number||o.id), code)
        }

        list = list.map((it)=> {
          if (it?.data && !it?.data?.member_code && it?.data?.order_id) {
            const code = orderToCode.get(String(it.data.order_id)) || ''
            if (code) return { ...it, data: { ...it.data, member_code: code } }
          }
          return it
        })
      }
    } catch {}

    // 從 member_feedback 補齊 comment / asset_path
    try {
      const toFill = list.filter((it)=> it?.data && (!!it.data.member_id) && (!!it.data.order_id) && ((it.data.kind==='suggest' && !it.data.comment) || (it.data.kind==='good' && !it.data.asset_path)))
      const keys = Array.from(new Set(toFill.map((it)=> `${it.data.kind||''}|${it.data.member_id}|${it.data.order_id}`)))
      if (keys.length>0) {
        const kinds = Array.from(new Set(toFill.map((it)=> String(it.data.kind||''))))
        const memberIds = Array.from(new Set(toFill.map((it)=> String(it.data.member_id))))
        const orderIds2 = Array.from(new Set(toFill.map((it)=> String(it.data.order_id))))
        const { data: fbRows } = await supabase
          .from('member_feedback')
          .select('member_id,order_id,kind,comment,asset_path,created_at')
          .in('kind', kinds)
          .in('member_id', memberIds)
          .in('order_id', orderIds2)
        const map = new Map()
        for (const r of (fbRows||[])) {
          map.set(`${r.kind}|${r.member_id}|${r.order_id}`, { comment: r.comment||null, asset_path: r.asset_path||null })
        }
        list = list.map((it)=>{
          const k = `${it?.data?.kind||''}|${it?.data?.member_id||''}|${it?.data?.order_id||''}`
          const v = map.get(k)
          if (v) {
            return { ...it, data: { ...it.data, comment: it.data.comment || v.comment || null, asset_path: it.data.asset_path || v.asset_path || null } }
          }
          return it
        })
      }
    } catch {}

    return json(200, { success: true, data: list })
  } catch (e) {
    return json(200, { success: false, error: 'internal_error', message: String(e?.message || e) })
  }
}



