// Netlify Function: review-bonus
// GET /.netlify/functions/review-bonus?orderId=...&memberId=...&kind=good|suggest

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })

  try {
    const method = (event.httpMethod || 'GET').toUpperCase()
    if (method !== 'GET') return json(405, { success: false, error: 'method_not_allowed' })
    const u = new URL(event.rawUrl || ('https://dummy' + (event.path || '')))
    const orderId = u.searchParams.get('orderId') || ''
    const memberId = u.searchParams.get('memberId') || ''
    const kind = (u.searchParams.get('kind') || 'good').toLowerCase()
    if (!orderId || !memberId) return json(400, { success: false, error: 'missing_params' })

    const { createClient } = require('@supabase/supabase-js')
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { success: false, error: 'missing_service_role' })
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 讀設定
    const { data: settingsRow } = await supabase.from('app_settings').select('*').limit(1).maybeSingle()
    const bonus = Number(settingsRow?.review_bonus_points || 0)
    if (!(bonus > 0)) return json(400, { success: false, error: 'bonus_disabled' })

    // 限制重複領取：同 orderId+memberId+kind 僅能一次
    const stampKey = `review_bonus_${orderId}_${memberId}_${kind}`
    const { data: ex } = await supabase.from('member_points_ledger').select('id').eq('ref_key', stampKey).maybeSingle()
    if (ex) return json(200, { success: true, message: 'already_claimed' })

    // 寫入點數帳本
    const desc = kind==='good' ? '好評上傳獎勵' : '建議評上傳獎勵'
    const row = { member_id: memberId, delta: bonus, reason: desc, order_id: orderId, ref_key: stampKey, created_at: new Date().toISOString() }
    const { error: ie } = await supabase.from('member_points_ledger').insert(row)
    if (ie) return json(500, { success: false, error: ie.message })

    // 同步 members.points 加總（若有此欄位）
    try {
      await supabase.rpc('add_points_to_member', { p_member_id: memberId, p_delta: bonus })
    } catch {}

    // 回傳一段簡單 HTML 供直接顯示（成功/失敗訊息）
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: `<html><body style="font-family:system-ui;padding:20px"><h3>已完成：${desc}</h3><p>本次加點：<b>${bonus}</b> 點。</p><p>感謝您的回饋！</p></body></html>`
    }
  } catch (e) {
    return json(500, { success: false, error: 'internal_error', message: String(e?.message || e) })
  }
}


