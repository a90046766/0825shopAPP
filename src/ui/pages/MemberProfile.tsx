import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../utils/supabase'

function getMemberFromStorage(): any | null {
  try { return JSON.parse(localStorage.getItem('member-auth-user') || 'null') } catch { return null }
}

export default function MemberProfilePage() {
  const member = getMemberFromStorage()
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
          const q = new URLSearchParams({ memberEmail: email })
          const res = await fetch(`/_api/member/profile?${q.toString()}`)
          const j = await res.json()
          if (j?.success && j.data) {
            setForm({ name: j.data.name || member.name || '', email: j.data.email || email, phone: j.data.phone || '', city: j.data.city||'', district: j.data.district||'', address: j.data.address||'' })
            const currentCode = String(j.data.code || '')
            if (currentCode) { setMemberCode(currentCode); syncLocalMemberCode(currentCode) }
          }
        } catch {}

        // 讀取積分（單一真相 API）
        try {
          const q = new URLSearchParams(member.id? { memberId: member.id }: { memberEmail: email })
          const [rb, rl, rp] = await Promise.all([
            fetch(`/_api/points/balance?${q.toString()}`),
            fetch(`/_api/points/ledger?${q.toString()}&limit=50`),
            fetch(`/_api/points/pending/list?${q.toString()}`)
          ])
          try { const jb = await rb.json(); if (jb?.success) setPoints(Number(jb.balance||0)) } catch {}
          try { const jl = await rl.json(); if (jl?.success && Array.isArray(jl.data)) setLedger(jl.data) } catch {}
          try { const jp = await rp.json(); if (jp?.success && Array.isArray(jp.data)) setPending(jp.data) } catch {}
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
      const q = new URLSearchParams(member.id? { memberId: member.id }: { memberEmail: email })
      const [rb, rl, rp] = await Promise.all([
        fetch(`/_api/points/balance?${q.toString()}`),
        fetch(`/_api/points/ledger?${q.toString()}&limit=50`),
        fetch(`/_api/points/pending/list?${q.toString()}`)
      ])
      try { const jb = await rb.json(); if (jb?.success) setPoints(Number(jb.balance||0)) } catch {}
      try { const jl = await rl.json(); if (jl?.success && Array.isArray(jl.data)) setLedger(jl.data) } catch {}
      try { const jp = await rp.json(); if (jp?.success && Array.isArray(jp.data)) setPending(jp.data) } catch {}
    } catch {}
  }

  const claimPendingOne = async (id: string) => {
    if (!member) return
    try {
      setClaimingMap(m=>({ ...m, [id]: true }))
      const email = String(member.email||'').toLowerCase()
      const payload = member.id ? { id, memberId: member.id } : { id, memberEmail: email }
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
              {pending.length>0 && (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-gray-800">待入點</div>
                  <div className="mt-2 divide-y text-xs">
                    {pending.map((p:any,i:number)=> {
                      const pid = String(p.id||p.pk||p._id||p.uuid||i)
                      const claiming = !!claimingMap[pid]
                      return (
                        <div key={pid} className="py-2 flex items-center justify-between gap-2">
                          <div className="min-w-0 pr-2">
                            <div className="truncate text-gray-700">{p.reason || '消費回饋'}</div>
                            <div className="text-[11px] text-gray-500">訂單 {p.order_id} · {new Date(p.created_at).toLocaleString('zh-TW')}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-amber-700">+{p.points}</div>
                            <button disabled={claiming} onClick={()=>claimPendingOne(pid)} className={`rounded px-2 py-1 text-xs ${claiming?'bg-gray-300 text-gray-600':'bg-emerald-600 text-white hover:bg-emerald-700'}`}>{claiming?'領取中…':'領取'}</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {ledger.length>0 && (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-gray-800">積分明細</div>
                  <div className="mt-2 divide-y text-xs">
                    {ledger.map((l:any, i:number)=> (
                      <div key={i} className="py-2 flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <div className="truncate text-gray-700">{l.reason || '回饋'}</div>
                          <div className="text-[11px] text-gray-500">{l.order_id? `訂單 ${l.order_id}` : (l.ref_key||'')} · {new Date(l.created_at).toLocaleString('zh-TW')}</div>
                        </div>
                        <div className={`font-semibold ${Number(l.delta||0)>=0? 'text-emerald-700':'text-rose-700'}`}>{Number(l.delta||0)>=0? '+':''}{l.delta}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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


