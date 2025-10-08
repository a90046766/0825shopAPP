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
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', district: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [memberCode, setMemberCode] = useState<string>('')
  const [shortUrl, setShortUrl] = useState<string>('')
  const [genning, setGenning] = useState<boolean>(false)

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

        // 讀取/補齊會員資料（members 表）
        try {
          const { data: mrow } = await supabase
            .from('members')
            .select('name,email,phone,addresses,code')
            .eq('email', email)
            .maybeSingle()
          if (mrow) {
            const addr = Array.isArray((mrow as any).addresses) && (mrow as any).addresses[0] ? String((mrow as any).addresses[0]) : ''
            // 嘗試切分為 縣市/區域/街道門牌（簡單切分，避免複雜規則）
            let city = '', district = '', address = ''
            try {
              if (addr) {
                city = addr.slice(0, 3)
                district = addr.slice(3, 6)
                address = addr.slice(6)
              }
            } catch {}
            setForm({ name: mrow.name || member.name || '', email: mrow.email || email, phone: mrow.phone || '', city, district, address })
            const currentCode = String((mrow as any).code || '')
            if (currentCode) { setMemberCode(currentCode); syncLocalMemberCode(currentCode) }
            try {
              const targetEmail = 'a13788051@gmail.com'
              if (String((mrow as any).email||'').toLowerCase() === targetEmail && currentCode !== 'MO7777') {
                const { data: ex } = await supabase.from('members').select('email').eq('email', email).maybeSingle()
                if (ex) await supabase.from('members').update({ code: 'MO7777' }).eq('email', email)
                else await supabase.from('members').insert({ email, code: 'MO7777' })
                setMemberCode('MO7777')
                syncLocalMemberCode('MO7777')
              }
            } catch {}
          }
        } catch {}

        // 讀取積分（以 member_id 優先；後備 email；最後 localStorage）
        let p = 0
        try {
          if (member.id) {
            const { data: rowById } = await supabase
              .from('member_points')
              .select('balance')
              .eq('member_id', member.id)
              .maybeSingle()
            if (rowById && typeof (rowById as any).balance === 'number') p = (rowById as any).balance
          }
          if (!p) {
            const { data: rowByEmail } = await supabase
              .from('member_points')
              .select('balance')
              .eq('member_email', email)
              .maybeSingle()
            if (rowByEmail && typeof (rowByEmail as any).balance === 'number') p = (rowByEmail as any).balance
          }
        } catch {}
        if (!p) {
          try { p = parseInt(localStorage.getItem('customerPoints') || '0') || 0 } catch {}
        }
        setPoints(p)

        // 讀取積分明細（近 50 筆）
        try {
          const { data: logs } = await supabase
            .from('member_points_ledger')
            .select('created_at, delta, reason, order_id, ref_key')
            .eq('member_id', (member as any).id || email)
            .order('created_at', { ascending: false })
            .limit(50)
          setLedger(Array.isArray(logs)? logs: [])
        } catch { setLedger([]) }
      } catch (e: any) {
        setError(e?.message || '載入失敗')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!member) return
    setSaving(true)
    setError('')
    try {
      const email = String(member.email || '').toLowerCase()
      const addressStr = `${(form.city||'')}${(form.district||'')}${(form.address||'')}`.trim()
      const row: any = { name: form.name || '', phone: form.phone || '', addresses: addressStr ? [addressStr] : [] }
      const { data: ex } = await supabase.from('members').select('email').eq('email', email).maybeSingle()
      if (ex) {
        const { error } = await supabase.from('members').update(row).eq('email', email)
        if (error) throw error
      } else {
        const { error } = await supabase.from('members').insert({ email, ...row })
        if (error) throw error
      }
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
              <div className="text-sm text-gray-600">目前積分</div>
              <div className="mt-1 text-3xl font-extrabold text-blue-700">{points.toLocaleString()}</div>
              <div className="mt-2 text-xs text-gray-500">消費 $100 = 1 點，可全額折抵。數值以後台結算為準。</div>
              <div className="mt-4">
                <Link to="/store/products" className="inline-block rounded bg-blue-600 px-4 py-2 text-white">前往選購</Link>
              </div>
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


