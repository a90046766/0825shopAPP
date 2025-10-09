// Netlify Function: points-pending
// 功能：
// - POST /_api/points/pending/create  body:{ memberId|memberEmail, orderId, points, reason }
// - GET  /_api/points/pending/list?memberId=... | memberEmail=...
// - POST /_api/points/pending/claim  body:{ id }

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })
  try {
    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json(500, { success:false, error:'missing_service_role' })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    const path = event.path || ''
    const method = (event.httpMethod||'GET').toUpperCase()

    // 建立 pending
    if (method==='POST' && path.endsWith('/create')) {
      let body = {}
      try { body = JSON.parse(event.body||'{}') } catch {}
      let memberId = String(body.memberId||'')
      const memberEmail = String(body.memberEmail||'').toLowerCase()
      const orderId = String(body.orderId||'')
      const points = Math.max(0, Number(body.points||0))
      const reason = String(body.reason||'消費回饋')
      if ((!memberId && !memberEmail) || !orderId || !(points>0)) return json(400, { success:false, error:'invalid_params' })
      if (!memberId && memberEmail) {
        const { data: m } = await supabase.from('members').select('id').eq('email', memberEmail).maybeSingle()
        if (m?.id) memberId = String(m.id)
      }
      if (!memberId) return json(400, { success:false, error:'member_not_found' })
      const row = { member_id: memberId, order_id: orderId, points, reason, status: 'pending', created_at: new Date().toISOString() }
      // 表不存在時提前回報，避免 schema cache 錯誤誤導
      try {
        const { error: existsErr } = await supabase.from('pending_points').select('id').limit(1)
        if (existsErr && (existsErr.message||'').includes('schema')) {
          return json(500, { success:false, error:'pending_points_table_missing' })
        }
      } catch {}
      const { error } = await supabase.from('pending_points').insert(row)
      if (error) return json(500, { success:false, error: error.message })
      return json(200, { success:true })
    }

    // 列表
    if (method==='GET' && path.endsWith('/list')) {
      const u = new URL(event.rawUrl || ('http://local'+path))
      let memberId = String(u.searchParams.get('memberId')||'')
      const memberEmail = String(u.searchParams.get('memberEmail')||'').toLowerCase()
      if (!memberId && memberEmail) {
        const { data: m } = await supabase.from('members').select('id').eq('email', memberEmail).maybeSingle()
        if (m?.id) memberId = String(m.id)
      }
      if (!memberId) return json(400, { success:false, error:'member_not_found' })
      try {
        const { data, error } = await supabase
          .from('pending_points')
          .select('id,order_id,points,reason,status,created_at')
          .eq('member_id', memberId)
          .order('created_at', { ascending: false })
        if (error) return json(500, { success:false, error: error.message })
        return json(200, { success:true, data: data||[] })
      } catch (e) {
        // 若表不存在或 schema cache 問題，回特定錯誤碼
        return json(500, { success:false, error:'pending_points_table_missing' })
      }
    }

    // 領取
    if (method==='POST' && path.endsWith('/claim')) {
      let body = {}
      try { body = JSON.parse(event.body||'{}') } catch {}
      const id = String(body.id||'')
      let row = null
      if (id) {
        const r = await supabase.from('pending_points').select('*').eq('id', id).maybeSingle()
        row = r.data || null
      } else {
        // 支援以 memberId/memberEmail + orderId 兌換（方便結案流程呼叫）
        let memberId = String(body.memberId||'')
        const memberEmail = String(body.memberEmail||'').toLowerCase()
        const orderId = String(body.orderId||'')
        if (!memberId && memberEmail) {
          const { data: m } = await supabase.from('members').select('id').eq('email', memberEmail).maybeSingle()
          if (m?.id) memberId = String(m.id)
        }
        if (!memberId || !orderId) return json(400, { success:false, error:'invalid_params' })
        const r = await supabase.from('pending_points').select('*').eq('member_id', memberId).eq('order_id', orderId).eq('status','pending').order('created_at', { ascending: false }).limit(1)
        row = Array.isArray(r.data) && r.data.length>0 ? r.data[0] : null
      }
      if (!row) return json(404, { success:false, error:'not_found' })
      if (row.status === 'claimed') return json(200, { success:true, message:'already_claimed' })
      // 入帳
      try {
        await supabase.from('member_points_ledger').insert({ member_id: row.member_id, delta: row.points, reason: row.reason, order_id: row.order_id, ref_key: `pending_claim_${row.id}`, created_at: new Date().toISOString() })
        try { await supabase.rpc('add_points_to_member', { p_member_id: row.member_id, p_delta: row.points }) } catch {
          try { const { data: mp } = await supabase.from('member_points').select('balance').eq('member_id', row.member_id).maybeSingle(); const balance = Number(mp?.balance||0) + Number(row.points||0); await supabase.from('member_points').upsert({ member_id: row.member_id, balance }) } catch {}
        }
        try { const { data: m } = await supabase.from('members').select('points').eq('id', row.member_id).maybeSingle(); const next = Number(m?.points||0) + Number(row.points||0); await supabase.from('members').update({ points: next }).eq('id', row.member_id) } catch {}
      } catch (e) { return json(500, { success:false, error: 'claim_failed' }) }
      // 標記已領取
      await supabase.from('pending_points').update({ status: 'claimed', claimed_at: new Date().toISOString() }).eq('id', id)
      return json(200, { success:true })
    }

    return json(405, { success:false, error:'method_not_allowed' })
  } catch (e) {
    return json(500, { success:false, error:'internal_error', message: String(e?.message||e) })
  }
}
