import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../utils/supabase'

function getMemberFromStorage(): any | null {
  try { return JSON.parse(localStorage.getItem('member-auth-user') || 'null') } catch { return null }
}

export default function MemberProfilePage() {
  const member = getMemberFromStorage()
  // 允許以 URL 覆寫查詢對象：?memberEmail=... 或 ?memberId=...
  const searchParams = ((): URLSearchParams => {
    try { return new URLSearchParams(window.location.search||'') } catch { return new URLSearchParams('') }
  })()
  const overrideEmail = String(searchParams.get('memberEmail')||'').toLowerCase()
  const overrideId = String(searchParams.get('memberId')||'')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [points, setPoints] = useState<number>(0)
  const [ledger, setLedger] = useState<any[]>([])
  const [pending, setPending] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', district: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [memberCode, setMemberCode] = useState<string>('')
  const [shortUrl, setShortUrl] = useState<string>('')
  const [genning, setGenning] = useState<boolean>(false)
  const [claimingAll, setClaimingAll] = useState<boolean>(false)
  const [claimingMap, setClaimingMap] = useState<Record<string, boolean>>({})
  const [pendingError, setPendingError] = useState<string>('')
  const [resolvedMemberId, setResolvedMemberId] = useState<string>('')

  useEffect(() => {
    const syncLocalMemberCode = (code: string) => {
      try {
        const s = localStorage.getItem('member-auth-user')
        if (!s) return
        const obj = JSON.parse(s || '{}')
        if (obj && obj.code !== code) {
          obj.code = code
          localStorage.setItem('member-auth-user', JSON.stringify(obj))
          try { window.dispatchEvent(new Event('storage')) } catch {}
        }
      } catch {}
    }
    if (!member) { setLoading(false); return }
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const email = String(member.email || '').toLowerCase()
        setForm((f) => ({ ...f, name: member.name || '', email, phone: '', city: '', district: '', address: '' }))

        // 讀取/補齊會員資料（統一 API）
        try {
          const q = new URLSearchParams()
          if (overrideId) q.set('memberId', overrideId)
          if (email) q.set('memberEmail', email)
          if (member?.code) q.set('memberCode', String(member.code))
          if (member?.phone) q.set('phone', String(member.phone))
          const res = await fetch(`/_api/member/profile?${q.toString()}`)
          const j = await res.json()
          if (j?.success && j.data) {
            setForm({ name: j.data.name || member.name || '', email: j.data.email || email, phone: j.data.phone || '', city: j.data.city||'', district: j.data.district||'', address: j.data.address||'' })
            const currentCode = String(j.data.code || '')
            if (currentCode) { setMemberCode(currentCode); syncLocalMemberCode(currentCode) }
            try { setResolvedMemberId(String(j.data.id||'')) } catch {}
          }
        } catch {}

        // 讀取積分（單一真相 API，多鍵）
        try {
          const q = new URLSearchParams()
          if (resolvedMemberId) q.set('memberId', resolvedMemberId)
          else if (overrideId) q.set('memberId', overrideId)
          else if (member.id) q.set('memberId', member.id)
          if (overrideEmail) q.set('memberEmail', overrideEmail)
          else if (email) q.set('memberEmail', email)
          if (member?.code) q.set('memberCode', String(member.code))
          if (member?.phone) q.set('phone', String(member.phone))
          const [rb, rl, rp] = await Promise.all([
            fetch(`/_api/points/balance?${q.toString()}`),
            fetch(`/_api/points/ledger?${q.toString()}&limit=50`),
            fetch(`/_api/points/pending/list?${q.toString()}`)
          ])
          try { const jb = await rb.json(); if (jb?.success) setPoints(Number(jb.balance||0)) } catch {}
          try { const jl = await rl.json(); if (jl?.success && Array.isArray(jl.data)) setLedger(jl.data) } catch {}
          try { const jp = await rp.json(); if (jp?.success && Array.isArray(jp.data)) { setPending(jp.data); setPendingError('') } else { setPending([]); setPendingError(String(jp?.error||'pending_points_error')) } } catch { setPending([]); setPendingError('pending_points_error') }
        } catch { }
      } catch (e: any) {
        setError(e?.message || '載入失敗')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const refreshPointsBlocks = async () => {
    if (!member) return
    try {
      const email = String(member.email||'').toLowerCase()
      // 先確保會員建檔/對應並取得 id
      let mid = resolvedMemberId
      try {
        const qp = new URLSearchParams()
        if (overrideId) qp.set('memberId', overrideId)
        else if (member.id) qp.set('memberId', member.id)
        if (overrideEmail) qp.set('memberEmail', overrideEmail)
        else if (email) qp.set('memberEmail', email)
        if (member?.code) qp.set('memberCode', String(member.code))
        if (member?.phone) qp.set('phone', String(member.phone))
        const rp = await fetch(`/_api/member/profile?${qp.toString()}`)
        const jp = await rp.json().catch(()=>({}))
        if (jp?.success && jp.data?.id) { mid = String(jp.data.id); setResolvedMemberId(mid) }
      } catch {}
      // 多鍵查詢（優先使用解析出的 memberId）
      const q = new URLSearchParams()
      if (mid) q.set('memberId', mid)
      else if (overrideId) q.set('memberId', overrideId)
      else if (member.id) q.set('memberId', member.id)
      if (overrideEmail) q.set('memberEmail', overrideEmail)
      else if (email) q.set('memberEmail', email)
      if (member?.code) q.set('memberCode', String(member.code))
      if (member?.phone) q.set('phone', String(member.phone))
      const [rb1, rl1, rp1] = await Promise.all([
        fetch(`/_api/points/balance?${q.toString()}`),
        fetch(`/_api/points/ledger?${q.toString()}&limit=50`),
        fetch(`/_api/points/pending/list?${q.toString()}`)
      ])
      try { const jb = await rb1.json(); if (jb?.success) setPoints(Number(jb.balance||0)) } catch {}
      try { const jl = await rl1.json(); if (jl?.success && Array.isArray(jl.data)) setLedger(jl.data) } catch {}
      try { const jp = await rp1.json(); if (jp?.success && Array.isArray(jp.data)) { setPending(jp.data); setPendingError('') } else { setPending([]); setPendingError(String(jp?.error||'pending_points_error')) } } catch { setPending([]); setPendingError('pending_points_error') }
      const [rb2, rl2, rp2] = await Promise.all([
        fetch(`/_api/points/balance?${q.toString()}`),
        fetch(`/_api/points/ledger?${q.toString()}&limit=50`),
        fetch(`/_api/points/pending/list?${q.toString()}`)
      ])
      try { const jb = await rb2.json(); if (jb?.success) setPoints(Number(jb.balance||0)) } catch {}
      try { const jl = await rl2.json(); if (jl?.success && Array.isArray(jl.data)) setLedger(jl.data) } catch {}
      try { const jp = await rp2.json(); if (jp?.success && Array.isArray(jp.data)) { setPending(jp.data); setPendingError('') } else { setPending([]); setPendingError(String(jp?.error||'pending_points_error')) } } catch { setPending([]); setPendingError('pending_points_error') }
    } catch {}
  }

  const claimPendingOne = async (id: string) => {
    if (!member) return
    try {
      setClaimingMap(m=>({ ...m, [id]: true }))
      const email = String(member.email||'').toLowerCase()
      // 先確保會員建檔/對應
      try {
        const qp = new URLSearchParams()
        if (resolvedMemberId) qp.set('memberId', resolvedMemberId)
        else if (member.id) qp.set('memberId', member.id)
        if (member?.code) qp.set('memberCode', String(member.code))
        if (email) qp.set('memberEmail', email)
        if (member?.phone) qp.set('phone', String(member.phone))
        await fetch(`/_api/member/profile?${qp.toString()}`)
      } catch {}
      const payload: any = { id }
      if (resolvedMemberId) payload.memberId = resolvedMemberId
      else if (member.id) payload.memberId = member.id
      if (member?.code) payload.memberCode = String(member.code)
      if (email) payload.memberEmail = email
      if (member?.phone) payload.phone = String(member.phone)
      const resp = await fetch('/_api/points/pending/claim', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
      const jr = await resp.json()
      if (!jr?.success) throw new Error(jr?.error||'領取失敗')
      await refreshPointsBlocks()
      try { alert('已領取積分') } catch {}
    } catch (e:any) {
      try { alert(e?.message||'領取失敗') } catch {}
    } finally {
      setClaimingMap(m=>{ const n={...m}; delete n[id]; return n })
    }
  }

  const claimPendingAll = async () => {
    if (!member) return
    if (!Array.isArray(pending) || pending.length===0) return
    setClaimingAll(true)
    try {
      for (const p of pending) { try { await claimPendingOne(String(p.id||p.pk||p._id||p.uuid||'')) } catch {} }
      await refreshPointsBlocks()
    } finally {
      setClaimingAll(false)
    }
  }

  const handleSave = async () => {
    if (!member) return
    setSaving(true)
    setError('')
    try {
      const email = String(member.email || '').toLowerCase()
      const payload = { memberEmail: email, name: form.name||'', phone: form.phone||'', city: form.city||'', district: form.district||'', address: form.address||'' }
      const resp = await fetch('/_api/member/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const jr = await resp.json(); if (!jr?.success) throw new Error(jr?.error||'更新失敗')
      alert('已儲存')
    } catch (e: any) {
      setError(e?.message || '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  if (!member) {
    return (
      <div className="p-6 text-center">
        <div className="mb-2 text-gray-600">請先登入會員以查看資料</div>
        <Link to="/login/member" className="rounded bg-blue-600 px-4 py-2 text-white">會員登入</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/store/member/orders" className="rounded border px-2 py-1 text-sm">返回</Link>
            <div className="text-lg md:text-xl font-bold">會員資料</div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link to="/store/member/orders" className="rounded border px-3 py-1">我的訂單</Link>
          </div>
        </div>

        {error && <div className="mb-3 rounded bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
        {loading ? (
          <div className="rounded border p-3 text-sm text-gray-600">載入中…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 rounded-2xl bg-white p-4 shadow">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">姓名</label>
                  <input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full rounded border px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Email</label>
                  <input value={form.email} disabled className="w-full rounded border px-3 py-2 bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">電話</label>
                  <input value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} className="w-full rounded border px-3 py-2" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">縣市</label>
                    <input value={form.city} onChange={e=>setForm({...form, city: e.target.value})} className="w-full rounded border px-3 py-2" placeholder="例如：台北市" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">區域</label>
                    <input value={form.district} onChange={e=>setForm({...form, district: e.target.value})} className="w-full rounded border px-3 py-2" placeholder="例如：大安區" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">地址</label>
                    <input value={form.address} onChange={e=>setForm({...form, address: e.target.value})} className="w-full rounded border px-3 py-2" placeholder="例如：重慶南路一段100號6樓" />
                  </div>
                </div>
              </div>
              <div className="mt-4 text-right">
                <button disabled={saving} onClick={handleSave} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60">{saving?'儲存中…':'儲存'}</button>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">目前積分</div>
                  <div className="mt-1 text-3xl font-extrabold text-blue-700">{points.toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={refreshPointsBlocks} className="rounded border px-2 py-1 text-xs hover:bg-gray-50">刷新</button>
                  {pending.length>0 && (
                    <button disabled={claimingAll} onClick={claimPendingAll} className={`rounded px-2 py-1 text-xs text-white ${claimingAll? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{claimingAll?'領取中…':'全部領取'}</button>
                  )}
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">消費 $100 = 1 點，可全額折抵。數值以後台結算為準。</div>
              <div className="mt-4">
                <Link to="/store/products" className="inline-block rounded bg-blue-600 px-4 py-2 text-white">前往選購</Link>
              </div>
              {/* 已移除獨立「待入點」分區，僅於下方「積分明細」內合併顯示待領取並提供領取鍵 */}
              {(() => {
                // 將待入點與明細合併顯示於「積分明細」，待入點在前且可領取
                // 僅把「待入點(pending)」合併到明細頂端；領取後不再產生另一條重覆
                const combined: Array<any> = [
                  ...pending.map((p:any, i:number)=> ({
                    _kind: 'pending',
                    id: String(p.id||i),
                    created_at: p.created_at,
                    reason: p.reason || '消費回饋（待領取）',
                    order_id: p.order_id,
                    delta: Number(p.points||0)
                  })),
                  ...ledger.map((l:any, i:number)=> ({
                    _kind: 'ledger',
                    id: String(l.id||i),
                    created_at: l.created_at,
                    reason: l.reason || '回饋',
                    order_id: l.order_id,
                    delta: Number(l.delta||0),
                    ref_key: l.ref_key || ''
                  }))
                ].sort((a:any,b:any)=> String(b.created_at||'').localeCompare(String(a.created_at||'')))
                if (combined.length===0) return null
                return (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-800">積分明細</div>
                    {(!pendingError && pending.length>0) && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">尚有 {pending.length} 筆待入點</span>
                        <button disabled={claimingAll} onClick={claimPendingAll} className={`rounded px-2 py-1 text-xs text-white ${claimingAll? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{claimingAll?'領取中…':'全部領取'}</button>
                      </div>
                    )}
                  </div>
                  {pendingError && (
                    <div className="mt-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1">{pendingError==='pending_points_table_missing'?'待入點功能尚未啟用（缺少資料表），請通知管理員建立表格':'待入點資料暫時無法讀取'}</div>
                  )}
                  <div className="mt-2 divide-y text-xs">
                    {combined.map((row:any, i:number)=> (
                      <div key={row.id+':'+i} className="py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0 pr-2">
                          <div className="truncate text-gray-700">{row.reason}</div>
                          <div className="text-[11px] text-gray-500">{row.order_id? `訂單 ${row.order_id}` : ''} {row.order_id? '· ' : ''}{new Date(row.created_at).toLocaleString('zh-TW')}</div>
                        </div>
                        {row._kind==='pending' ? (
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-amber-700">+{row.delta}</div>
                            <button disabled={!!claimingMap[row.id]} onClick={()=>claimPendingOne(row.id)} className={`rounded px-2 py-1 text-xs ${claimingMap[row.id]? 'bg-gray-300 text-gray-600':'bg-emerald-600 text-white hover:bg-emerald-700'}`}>{claimingMap[row.id]? '領取中…':'領取'}</button>
                          </div>
                        ) : (
                          <div className={`font-semibold ${Number(row.delta||0)>=0? 'text-emerald-700':'text-rose-700'}`}>{Number(row.delta||0)>=0? '+':''}{row.delta}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                )
              })()}
            </div>
            <div className="rounded-2xl bg-white p-4 shadow md:col-span-1">
              <div className="text-sm text-gray-600">推薦分享</div>
              <div className="mt-2 text-sm text-gray-500">請至「分享推薦」頁使用功能（右上角選單）。此處僅顯示個人資料，避免與首頁代碼不同步。</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


