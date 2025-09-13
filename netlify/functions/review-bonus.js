// Netlify Function: review-bonus
// GET  -> 顯示表單（好評：上傳截圖；建議評：輸入評論）
// POST -> 驗證並加點數

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) })

  try {
    const method = (event.httpMethod || 'GET').toUpperCase()
    const { createClient } = require('@supabase/supabase-js')
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { success: false, error: 'missing_service_role' })
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    if (method === 'GET') {
      const u = new URL(event.rawUrl || ('https://dummy' + (event.path || '')))
      const orderId = u.searchParams.get('orderId') || ''
      const memberId = u.searchParams.get('memberId') || ''
      const kind = (u.searchParams.get('kind') || 'good').toLowerCase()
      if (!orderId || !memberId) return json(400, { success: false, error: 'missing_params' })

      const { data: settingsRow } = await supabase.from('app_settings').select('*').limit(1).maybeSingle()
      const bonus = Number(settingsRow?.review_bonus_points || 0)
      if (!(bonus > 0)) return json(400, { success: false, error: 'bonus_disabled' })

      const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${kind==='good'?'好評上傳':'建議評提交'} | 日式洗濯</title><style>body{font-family:system-ui;margin:16px;} .card{max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;padding:16px;box-shadow:0 4px 16px rgba(0,0,0,.06);} .btn{background:#2563eb;color:#fff;border:none;border-radius:8px;padding:10px 14px;cursor:pointer} .muted{color:#6b7280} textarea,input{width:100%;box-sizing:border-box}</style></head><body><div class="card"><h3>${kind==='good'?'上傳您的好評截圖':'留下您的建議評論'}</h3><p class="muted">完成後立即贈送 ${bonus} 點積分。</p>${kind==='good'?`<div style="margin:12px 0"><input id="file" type="file" accept="image/*" /></div>`:`<div style="margin:12px 0"><textarea id="comment" rows="5" placeholder="請填寫您的建議，謝謝。"></textarea></div>`}<button class="btn" id="submit">送出</button><div id="msg" class="muted" style="margin-top:10px"></div></div><script>const orderId=${JSON.stringify(orderId)};const memberId=${JSON.stringify(memberId)};const kind=${JSON.stringify(kind)};const el=(id)=>document.getElementById(id);async function toBase64(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);})}el('submit').onclick=async()=>{try{el('submit').disabled=true;el('msg').textContent='處理中...';const payload={orderId,memberId,kind};if(kind==='good'){const f=el('file').files[0];if(!f){el('msg').textContent='請選擇圖片';el('submit').disabled=false;return}payload.imageDataUrl=await toBase64(f);}else{const c=(el('comment').value||'').trim();if(!c){el('msg').textContent='請填寫建議';el('submit').disabled=false;return}payload.comment=c;}const r=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const j=await r.json();if(!j.success){throw new Error(j.error||'提交失敗')}el('msg').textContent='完成！本次加點：'+j.bonus+' 點，感謝您的回饋。';}catch(e){el('msg').textContent=e.message||String(e)}finally{el('submit').disabled=false}}</script></body></html>`
      return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html }
    }

    if (method === 'POST') {
      let body = {}
      try { body = JSON.parse(event.body || '{}') } catch {}
      const orderId = String(body.orderId||'')
      const memberId = String(body.memberId||'')
      const kind = String(body.kind||'').toLowerCase()
      if (!orderId || !memberId || !['good','suggest'].includes(kind)) return json(400, { success:false, error:'invalid_params' })

      const { data: settingsRow } = await supabase.from('app_settings').select('*').limit(1).maybeSingle()
      const bonus = Number(settingsRow?.review_bonus_points || 0)
      if (!(bonus > 0)) return json(400, { success:false, error:'bonus_disabled' })

      const stampKey = `review_bonus_${orderId}_${memberId}_${kind}`
      const { data: ex } = await supabase.from('member_points_ledger').select('id').eq('ref_key', stampKey).maybeSingle()
      if (ex) return json(200, { success:true, message:'already_claimed', bonus })

      if (kind==='good'){
        const dataUrl = String(body.imageDataUrl||'')
        if (!dataUrl.startsWith('data:image/')) return json(400, { success:false, error:'invalid_image' })
        const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.*)$/)
        if (!m) return json(400, { success:false, error:'invalid_image' })
        const mime = m[1]; const b64 = m[2]
        const buff = Buffer.from(b64, 'base64')
        const ext = mime.split('/')[1] || 'png'
        const path = `${memberId}/${orderId}/good-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('review-uploads').upload(path, buff, { contentType: mime, upsert: false })
        if (upErr) return json(500, { success:false, error: upErr.message })
        try { await supabase.from('member_feedback').insert({ member_id: memberId, order_id: orderId, kind: 'good', comment: null, asset_path: path, created_at: new Date().toISOString() }) } catch {}
      } else {
        const comment = (body.comment||'').toString().trim()
        if (!comment) return json(400, { success:false, error:'empty_comment' })
        try { await supabase.from('member_feedback').insert({ member_id: memberId, order_id: orderId, kind: 'suggest', comment, asset_path: null, created_at: new Date().toISOString() }) } catch {}
      }

      const desc = kind==='good' ? '好評上傳獎勵' : '建議評提交獎勵'
      const row = { member_id: memberId, delta: bonus, reason: desc, order_id: orderId, ref_key: stampKey, created_at: new Date().toISOString() }
      const { error: ie } = await supabase.from('member_points_ledger').insert(row)
      if (ie) return json(500, { success:false, error: ie.message })
      try { await supabase.rpc('add_points_to_member', { p_member_id: memberId, p_delta: bonus }) } catch {}
      return json(200, { success:true, bonus })
    }

    return json(405, { success:false, error:'method_not_allowed' })
  } catch (e) {
    return json(500, { success: false, error: 'internal_error', message: String(e?.message || e) })
  }
}


