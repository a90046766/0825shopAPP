// Netlify Function: points-recalc-balance
// 目的：依 member_points_ledger 重算 member_points.balance 與 members.points（管理員用）

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })
  try {
    if ((event.httpMethod||'GET').toUpperCase() !== 'POST') return json(405, { success:false, error:'method_not_allowed' })
    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json(500, { success:false, error:'missing_service_role' })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    // 讀取所有會員 id
    const { data: members, error: me } = await supabase.from('members').select('id')
    if (me) return json(500, { success:false, error: me.message })
    const ids = (members||[]).map((m)=> m.id)

    // 逐一重算
    for (const id of ids) {
      try {
        const { data: logs } = await supabase
          .from('member_points_ledger')
          .select('delta')
          .eq('member_id', id)
        const sum = (logs||[]).reduce((s, r)=> s + Number(r.delta||0), 0)
        await supabase.from('member_points').upsert({ member_id: id, balance: sum })
        await supabase.from('members').update({ points: sum }).eq('id', id)
      } catch {}
    }

    return json(200, { success:true, members: ids.length })
  } catch (e) {
    return json(500, { success:false, error:'internal_error', message: String(e?.message||e) })
  }
}



