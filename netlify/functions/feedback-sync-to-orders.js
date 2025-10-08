// Netlify Function: feedback-sync-to-orders
// 將 member_feedback 逐筆同步到對應的 orders.signatures.customer_feedback（管理用）

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })
  try {
    if ((event.httpMethod||'POST').toUpperCase() !== 'POST') return json(405, { success:false, error:'method_not_allowed' })
    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json(500, { success:false, error:'missing_service_role' })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    const { data: feeds, error } = await supabase
      .from('member_feedback')
      .select('member_id,order_id,kind,comment,asset_path,created_at')
      .order('created_at', { ascending: false })
      .limit(1000)
    if (error) return json(500, { success:false, error: error.message })

    let ok = 0, fail = 0
    for (const fb of (feeds||[])) {
      try {
        const { data: ord } = await supabase
          .from('orders')
          .select('id, order_number, signatures')
          .or(`order_number.eq.${fb.order_id},id.eq.${fb.order_id}`)
          .maybeSingle()
        if (!ord) { fail++; continue }
        const sig = (ord.signatures && typeof ord.signatures==='object') ? ord.signatures : {}
        const next = { ...sig, customer_feedback: { kind: fb.kind, comment: fb.comment||null, asset_path: fb.asset_path||null, at: fb.created_at, member_id: fb.member_id } }
        const { error: ue } = await supabase
          .from('orders')
          .update({ signatures: next, updated_at: new Date().toISOString() })
          .eq('id', ord.id)
        if (ue) { fail++; continue }
        ok++
      } catch { fail++ }
    }
    return json(200, { success:true, ok, fail })
  } catch (e) {
    return json(500, { success:false, error:'internal_error', message: String(e?.message||e) })
  }
}



