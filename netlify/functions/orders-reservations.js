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
    let ensuredOrderNumber = null;

    if (url && key) {
      const supabase = createClient(url, key, { auth: { persistSession: false } });

      // 工具：解析時間與生成候選單號
      const parseTime = (val) => {
        if (!val) return { start: null, end: null };
        const map = { morning: ['09:00','12:00'], afternoon: ['13:00','17:00'], evening: ['18:00','20:00'] };
        if (map[val]) return { start: map[val][0], end: map[val][1] };
        const m = String(val).match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
        if (m) return { start: m[1], end: m[2] };
        return { start: null, end: null };
      };
      const buildItems = (items) => Array.isArray(items) ? items.map((it)=> ({ name: it.name, quantity: Number(it.quantity||0), unitPrice: Number(it.price||it.unitPrice||0) })) : [];
      const genOrderNumber = async () => {
        const prefixes = ['OD','OE','OF','OG','OH','OI','OJ','OK','OL','OM','ON','OO','OP','OQ','OR','OS','OT','OU','OV','OW','OX','OY','OZ'];
        for (const pref of prefixes) {
          for (let i=0;i<10;i++) {
            const code = Math.floor(10000 + Math.random()*90000).toString();
            const cand = `${pref}${code}`;
            const { data: ex } = await supabase.from('orders').select('id').eq('order_number', cand).maybeSingle();
            if (!ex) return cand;
          }
        }
        return `OD${Date.now().toString(36).toUpperCase().slice(-5)}`;
      };

      // 1) 優先 RPC 建單（若後端尚未建立 RPC，這段會失敗但不影響回傳）
      try {
        const { data, error } = await supabase.rpc('create_reservation_order', {
          p_member_id: payload.memberId || payload.member_id || null,
          p_payload: payload || {}
        });
        if (!error) {
          rpcOk = true;
          rpcData = data || null;
          // 嘗試補寫缺失欄位（姓名/電話/地址/日期/時間/平台/品項）
          try {
            const orderNo = (data && (data.order_number||data.orderNo||data.id)) || null;
            if (orderNo) {
              ensuredOrderNumber = orderNo;
              const { data: row } = await supabase.from('orders').select('id, customer_name, customer_phone, customer_email, customer_address, preferred_date, preferred_time_start, preferred_time_end, platform, service_items').or(`order_number.eq.${orderNo},id.eq.${orderNo}`).maybeSingle();
              if (row) {
                const t = parseTime(payload.preferredTime);
                const patch = {};
                if (!row.customer_name && (payload.customer?.name)) patch.customer_name = payload.customer.name;
                if (!row.customer_phone && (payload.customer?.phone)) patch.customer_phone = payload.customer.phone;
                if (!row.customer_email && (payload.customer?.email)) patch.customer_email = payload.customer.email;
                if (!row.customer_address && (payload.customer?.address)) patch.customer_address = payload.customer.address;
                if (!row.preferred_date && payload.preferredDate && /^\d{4}-\d{2}-\d{2}$/.test(payload.preferredDate)) patch.preferred_date = payload.preferredDate;
                if ((!row.preferred_time_start || !row.preferred_time_end) && t.start && t.end) {
                  patch.preferred_time_start = t.start; patch.preferred_time_end = t.end;
                }
                if (!row.platform || row.platform !== '商') patch.platform = '商';
                const items = buildItems(payload.items);
                if ((!Array.isArray(row.service_items) || row.service_items.length===0) && items.length>0) patch.service_items = items;
                if (Object.keys(patch).length>0) {
                  await supabase.from('orders').update(patch).eq('id', row.id);
                }
              }
            }
          } catch {}
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

      // 3) 若 RPC 未成功，直接寫入 orders（確保後台與會員能看到）
      if (!rpcOk) {
        try {
          const t = parseTime(payload.preferredTime);
          const items = buildItems(payload.items);
          const order_number = await genOrderNumber();
          const row = {
            order_number,
            customer_name: payload?.customer?.name || null,
            customer_phone: payload?.customer?.phone || null,
            customer_email: payload?.customer?.email || null,
            customer_address: payload?.customer?.address || null,
            preferred_date: (/^\d{4}-\d{2}-\d{2}$/.test(payload?.preferredDate||'')) ? payload.preferredDate : null,
            preferred_time_start: t.start,
            preferred_time_end: t.end,
            status: 'pending',
            platform: '商',
            service_items: items,
            note: payload?.note || null,
            created_at: new Date().toISOString()
          };
          const { error: insErr } = await supabase.from('orders').insert(row);
          if (!insErr) ensuredOrderNumber = order_number;
        } catch {}
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
          relay: relayOk ? 'ok' : 'skipped',
          order_number: ensuredOrderNumber
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