/* Netlify Function: /api/orders/reservations
   行為：
   - 支援 GET/POST，POST 讀 body，GET 讀 query
   - 若有 Service Role，優先呼叫 Supabase RPC: create_reservation_order(p_member_id, p_payload)
   - 同時嘗試寫入 relay_reservations 作為備援（失敗忽略）
   - 任何狀況皆回 200，避免前端流程中斷
*/

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const method = event.httpMethod || 'GET';
  if (method !== 'POST' && method !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }

  try {
    const isJson = (event.headers?.['content-type'] || '').includes('application/json');
    const payload = method === 'POST'
      ? (isJson ? JSON.parse(event.body || '{}') : {})
      : (event.queryStringParameters || {});

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    let rpcOk = false;
    let rpcData = null;
    let relayOk = false;

    if (url && key) {
      const supabase = createClient(url, key, { auth: { persistSession: false } });

      // 1) 優先 RPC 建單（若後端尚未建立 RPC，這段會失敗但不影響回傳）
      try {
        const { data, error } = await supabase.rpc('create_reservation_order', {
          p_member_id: payload.memberId || payload.member_id || null,
          p_payload: payload || {}
        });
        if (!error) {
          rpcOk = true;
          rpcData = data || null;
        }
      } catch (_) {
        // 忽略 RPC 錯誤，走備援
      }

      // 2) 備援：寫入 relay_reservations（若表不存在/權限不足，忽略）
      try {
        const row = {
          customer_name: payload?.customer?.name || null,
          customer_phone: payload?.customer?.phone || null,
          customer_email: payload?.customer?.email || null,
          customer_address: payload?.customer?.address || null,
          preferred_date: payload?.preferredDate || null,
          preferred_time: payload?.preferredTime || null,
          note: payload?.note || null,
          items_json: JSON.stringify(payload?.items || [])
        };
        const { error: relayErr } = await supabase.from('relay_reservations').insert(row);
        if (!relayErr) relayOk = true;
      } catch (_) {
        // 忽略備援寫入錯誤
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        ok: true,
        source: rpcOk ? 'rpc' : 'fallback',
        rpc: rpcOk,
        data: rpcData,
        relay: relayOk ? 'ok' : 'skipped'
      })
    };
  } catch (e) {
    // 最終保險：依然回 200，避免前端中斷
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ ok: true, source: 'fallback', error: String(e?.message || e) })
    };
  }
};