// Netlify Function: points-balance
// GET /_api/points/balance?memberId=... | memberEmail=...

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })
  try {
    if ((event.httpMethod||'GET').toUpperCase() !== 'GET') return json(405, { success:false, error:'method_not_allowed' })

    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json(500, { success:false, error:'missing_service_role' })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    const u = new URL(event.rawUrl || ('http://local' + (event.path||'')))
    let memberId = String(u.searchParams.get('memberId')||'')
    const memberEmail = String(u.searchParams.get('memberEmail')||'').toLowerCase()

    if (!memberId && memberEmail) {
      try {
        const { data: m } = await supabase
          .from('members')
          .select('id')
          .eq('email', memberEmail)
          .maybeSingle()
        if (m?.id) memberId = String(m.id)
      } catch {}
    }
    if (!memberId && !memberEmail) return json(400, { success:false, error:'missing_params' })

    // 以 member_points.balance 為單一真相；若不存在則用 ledger 重算後回寫
    const readBalance = async () => {
      try {
        if (memberId) {
          const { data: mp } = await supabase.from('member_points').select('balance').eq('member_id', memberId).maybeSingle()
          if (mp && typeof (mp as any).balance === 'number') return Number((mp as any).balance)
        }
      } catch {}
      try {
        if (memberEmail) {
          const { data: mp } = await supabase.from('member_points').select('balance').eq('member_email', memberEmail).maybeSingle()
          if (mp && typeof (mp as any).balance === 'number') return Number((mp as any).balance)
        }
      } catch {}
      return null
    }

    let balance = await readBalance()
    if (balance === null) {
      // 重算
      try {
        let sum = 0
        if (memberId) {
          const { data: logs1 } = await supabase.from('member_points_ledger').select('delta').eq('member_id', memberId)
          sum += (logs1||[]).reduce((s, r)=> s + Number(r.delta||0), 0)
        }
        if (memberEmail) {
          const { data: logs2 } = await supabase.from('member_points_ledger').select('delta').eq('member_email', memberEmail)
          sum += (logs2||[]).reduce((s, r)=> s + Number(r.delta||0), 0)
        }
        balance = sum
        try { await supabase.from('member_points').upsert(memberId ? { member_id: memberId, balance: sum } : { member_email: memberEmail, balance: sum }) } catch {}
      } catch {
        balance = 0
      }
    }

    return json(200, { success:true, balance: Number(balance||0) })
  } catch (e) {
    return json(500, { success:false, error:'internal_error', message: String(e?.message||e) })
  }
}


