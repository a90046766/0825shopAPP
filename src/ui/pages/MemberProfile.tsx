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
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!member) { setLoading(false); return }
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const email = String(member.email || '').toLowerCase()
        setForm((f) => ({ ...f, name: member.name || '', email, phone: '', address: '' }))

        // 讀取會員資料（members 表）
        try {
          const { data } = await supabase
            .from('members')
            .select('name,email,phone,addresses')
            .eq('email', email)
            .maybeSingle()
          if (data) {
            const addr = Array.isArray((data as any).addresses) && (data as any).addresses[0] ? (data as any).addresses[0] : ''
            setForm({ name: data.name || member.name || '', email: data.email || email, phone: data.phone || '', address: addr || '' })
          }
        } catch {}

        // 讀取積分（member_points 表 → fallback localStorage）
        let p = 0
        try {
          const { data: row } = await supabase
            .from('member_points')
            .select('balance')
            .eq('member_email', email)
            .maybeSingle()
          if (row && typeof row.balance === 'number') p = row.balance
        } catch {}
        if (!p) {
          try { p = parseInt(localStorage.getItem('customerPoints') || '0') || 0 } catch {}
        }
        setPoints(p)
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
      const row: any = { name: form.name || '', phone: form.phone || '', addresses: form.address ? [form.address] : [] }
      const { error } = await supabase
        .from('members')
        .upsert({ email, ...row }, { onConflict: 'email' })
      if (error) throw error
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
          <div className="text-lg md:text-xl font-bold">會員資料</div>
          <div className="flex items-center gap-2 text-sm">
            <Link to="/store/member/orders" className="rounded border px-3 py-1">我的訂單</Link>
            <Link to="/login/member/reset" className="rounded bg-blue-600 px-3 py-1 text-white">忘記/重設密碼</Link>
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
                <div>
                  <label className="block text-sm text-gray-700 mb-1">地址</label>
                  <input value={form.address} onChange={e=>setForm({...form, address: e.target.value})} className="w-full rounded border px-3 py-2" placeholder="城市區域與街道門牌" />
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


