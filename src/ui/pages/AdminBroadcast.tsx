import React, { useState } from 'react'
import { loadAdapters } from '../../adapters'
import { can } from '../../utils/permissions'
import { TAIWAN_CITIES } from '../../utils/location'

function getCurrentUser(): any {
  try { const s = localStorage.getItem('supabase-auth-user'); if (s) return JSON.parse(s) } catch {}
  try { const l = localStorage.getItem('local-auth-user'); if (l) return JSON.parse(l) } catch {}
  return null
}

export default function AdminBroadcastPage() {
  const user = getCurrentUser()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [level, setLevel] = useState<'info'|'success'|'warning'|'error'>('info')
  const [target, setTarget] = useState<'all'|'member'|'support'|'tech'|'user'>('member')
  const [userEmail, setUserEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const TEMPLATES: { name: string; title: string; body: string }[] = [
    {
      name: '服務已確認（含LINE引導）',
      title: '服務已確認通知',
      body: '親愛的{姓名}您好，感謝您的惠顧！您{日期}{時間帶}的服務已確認，訂單編號{單號}。技師將於{時間帶}抵達，請保持電話暢通。為確保溝通順暢，建議加入官方 LINE：@942clean。'
    },
    {
      name: '活動促銷（預設）',
      title: '本月活動：清洗滿3件享團購價',
      body: '本月清洗服務滿3件享團購價，消費滿$100送1積分、1點可折$1（可全額折抵）。詳情請洽LINE：@942clean'
    },
    {
      name: '維運通知',
      title: '系統維護通知',
      body: '系統將於{日期}{時間}進行維護，期間將暫停服務，造成不便敬請見諒。即時客服請加 LINE：@942clean'
    }
  ]
  const [tpl, setTpl] = useState<string>('')
  const [cities, setCities] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewMsg, setPreviewMsg] = useState<string>('')
  const [scheduleAt, setScheduleAt] = useState<string>('')
  const [expireAt, setExpireAt] = useState<string>('')

  const send = async () => {
    if (!title.trim()) { alert('請輸入標題'); return }
    if (!body.trim()) { alert('請輸入內容'); return }
    if (target==='user' && !userEmail.trim()) { alert('請輸入單一用戶 Email'); return }
    // 權限限制：support 不得群發至 all
    if (target==='all' && !can(user, 'bulletin.send_all' as any)) { alert('您沒有群發全部用戶的權限'); return }
    setSending(true)
    try {
      const a:any = await loadAdapters()
      const { supabase } = await import('../../utils/supabase')

      const wantsSeg = (cities.length>0 || categories.length>0) || (target==='member' && !can(user,'bulletin.send_all' as any)) || (target==='user')

      if (wantsSeg && target!=='user') {
        // 以條件查詢訂單，計算收件人清單
        const { data, error } = await supabase.from('orders').select('customer_email,customer_address,service_items,created_at').order('created_at', { ascending: false })
        if (error) throw error
        const emailSet: Record<string, boolean> = {}
        ;(data||[]).forEach((o:any)=> {
          const email = String(o.customer_email||'').toLowerCase()
          if (!email) return
          let cityOk = true
          if (cities.length>0) {
            const match = cities.some(c=> String(o.customer_address||'').includes(c))
            cityOk = match
          }
          let catOk = true
          if (categories.length>0) {
            try {
              const items = Array.isArray(o.service_items) ? o.service_items : []
              const has = items.some((it:any)=> categories.includes(String(it.category||'').toLowerCase()))
              catOk = has
            } catch { catOk = false }
          }
          if (cityOk && catOk) emailSet[email] = true
        })
        const targets = Object.keys(emailSet)
        if (targets.length===0) { alert('找不到符合條件的收件人'); setSending(false); return }
        // 分批寫入
        const now = new Date().toISOString()
        const baseBody = `${body}\n\n建議加入官方 LINE：@942clean（https://line.me/R/ti/p/@942clean）`
        const chunks: string[][] = []
        for (let i=0;i<targets.length;i+=50) chunks.push(targets.slice(i,i+50))
        for (const chunk of chunks) {
          const rows = chunk.map(email=> ({
            title, body: baseBody, level, target: 'user', target_user_email: email,
            sent_at: scheduleAt ? null : now,
            scheduled_at: scheduleAt ? new Date(scheduleAt).toISOString() : null,
            expires_at: expireAt ? new Date(expireAt).toISOString() : null,
            created_at: now
          }))
          const { error: insErr } = await supabase.from('notifications').insert(rows as any)
          if (insErr) throw insErr
        }
      } else {
        // 單筆（全部/角色/指定用戶）
        const payload:any = {
          title,
          body: `${body}\n\n建議加入官方 LINE：@942clean（https://line.me/R/ti/p/@942clean）`,
          level,
          target,
          target_user_email: target==='user' ? userEmail.toLowerCase() : null,
          sent_at: scheduleAt ? null : new Date().toISOString(),
          scheduled_at: scheduleAt ? new Date(scheduleAt).toISOString() : null,
          expires_at: expireAt ? new Date(expireAt).toISOString() : null,
          created_at: new Date().toISOString()
        }
        const { error } = await supabase.from('notifications').insert(payload as any)
        if (error) throw error
      }
      setDone(true)
      alert('已送出站內廣播')
      setTitle(''); setBody('')
    } catch (e:any) {
      alert(e?.message || '送出失敗')
    } finally {
      setSending(false)
    }
  }

  const preview = async () => {
    setPreviewCount(null)
    setPreviewMsg('')
    try {
      const { supabase } = await import('../../utils/supabase')
      if (target==='user') { setPreviewCount(1); return }
      if (cities.length===0 && categories.length===0) { 
        setPreviewCount(null)
        setPreviewMsg('未選擇分群條件，將依目標直接發送')
        return 
      }
      const { data, error } = await supabase.from('orders').select('customer_email,customer_address,service_items')
      if (error) throw error
      const emailSet: Record<string, boolean> = {}
      ;(data||[]).forEach((o:any)=> {
        const email = String(o.customer_email||'').toLowerCase()
        if (!email) return
        let cityOk = true
        if (cities.length>0) cityOk = cities.some(c=> String(o.customer_address||'').includes(c))
        let catOk = true
        if (categories.length>0) {
          try {
            const items = Array.isArray(o.service_items) ? o.service_items : []
            catOk = items.some((it:any)=> categories.includes(String(it.category||'').toLowerCase()))
          } catch { catOk = false }
        }
        if (cityOk && catOk) emailSet[email] = true
      })
      const count = Object.keys(emailSet).length
      setPreviewCount(count)
      setPreviewMsg(`預估收件人：${count} 人`)
    } catch (e:any) {
      alert(e?.message || '預覽失敗')
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 text-lg font-bold">站內廣播</div>
      <div className="grid max-w-2xl gap-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-1">快速套用範本</label>
            <select value={tpl} onChange={e=>{
              const v=e.target.value; setTpl(v)
              const f = TEMPLATES.find(t=>t.name===v)
              if (f) { setTitle(f.title); setBody(f.body) }
            }} className="w-full rounded border px-3 py-2">
              <option value="">不使用範本</option>
              {TEMPLATES.map(t=> <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">等級</label>
            <select value={level} onChange={e=>setLevel(e.target.value as any)} className="w-full rounded border px-3 py-2">
              <option value="info">一般</option>
              <option value="success">成功</option>
              <option value="warning">警示</option>
              <option value="error">錯誤</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">標題</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">內容</label>
          <textarea value={body} onChange={e=>setBody(e.target.value)} rows={6} className="w-full rounded border px-3 py-2" placeholder="可在內文提醒加入官方 LINE：@942clean" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">目標</label>
            <select value={target} onChange={e=>setTarget(e.target.value as any)} className="w-full rounded border px-3 py-2">
              <option value="member">會員（預設）</option>
              <option value="all" disabled={!can(user,'bulletin.send_all' as any)}>全部</option>
              <option value="tech">技師</option>
              <option value="support">客服</option>
              <option value="user">指定用戶</option>
            </select>
          </div>
          {target==='user' && (
            <div>
              <label className="block text-sm text-gray-700 mb-1">用戶 Email</label>
              <input value={userEmail} onChange={e=>setUserEmail(e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
          )}
        </div>
        {/* 分群條件（選填）：城市與服務類別 */}
        <div className="rounded border p-3">
          <div className="text-xs text-gray-600 mb-2">分群條件（選填）— 未選擇時將依「目標」直接發送</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">城市（可多選）</label>
              <select multiple value={cities} onChange={e=>{ const opts=[...e.target.selectedOptions].map(o=>o.value); setCities(opts) }} className="h-28 w-full rounded border px-3 py-2">
                {Object.keys(TAIWAN_CITIES).map(c=> (<option key={c} value={c}>{c}</option>))}
              </select>
              <div className="mt-1 text-xs text-gray-500">已選城市：{cities.length} 個</div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">服務類別（可多選）</label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {['cleaning','home','new','used'].map(cat=> (
                  <label key={cat} className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={categories.includes(cat)} onChange={(e)=>{ if(e.target.checked) setCategories([...categories, cat]); else setCategories(categories.filter(x=>x!==cat)) }} />
                    {cat}
                  </label>
                ))}
              </div>
              <div className="mt-1 text-xs text-gray-500">已選類別：{categories.length} 項</div>
            </div>
          </div>
        </div>
        {/* 排程與到期時間（選填） */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">排程發送時間（選填）</label>
            <input type="datetime-local" value={scheduleAt} onChange={e=>setScheduleAt(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">到期時間（選填）</label>
            <input type="datetime-local" value={expireAt} onChange={e=>setExpireAt(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={preview} className="rounded bg-gray-100 px-3 py-2 text-gray-800">預覽收件人數</button>
          {previewMsg && <span className="text-sm text-gray-600">{previewMsg}</span>}
        </div>
        <div className="pt-2">
          <button disabled={sending} onClick={send} className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-60">{sending?'送出中...':'送出'}</button>
        </div>
        {done && <div className="text-sm text-emerald-700">已送出。會員通知鈴將可看到訊息。</div>}
      </div>
    </div>
  )
}


