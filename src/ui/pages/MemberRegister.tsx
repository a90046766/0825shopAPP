import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { loadAdapters } from '../../adapters'
import { supabase } from '../../utils/supabase'

export default function MemberRegisterPage() {
  const loc = useLocation()
  const params = new URLSearchParams(loc.search)
  const refFromUrl = params.get('ref') || ''
  const [mode, setMode] = useState<'email'|'phone'>('email')
  const [form, setForm] = useState({ name: '', email: '', phone: '', refCode: refFromUrl })
  const [ok, setOk] = useState<boolean>(false)
  const [err, setErr] = useState('')
  const navigate = useNavigate()
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    try {
      const a = await loadAdapters()
      // 驗證（雙模式）
      const digits = (form.phone || '').replace(/\D/g, '')
      if (!form.name) { setErr('請填寫姓名'); return }
      if (mode === 'email') {
        if (!form.email) { setErr('請填寫 Email'); return }
      } else {
        if (!digits) { setErr('請填寫手機'); return }
      }
      // 預設密碼：email 模式 000000；phone 模式 手機後六碼
      const defaultPassword = (mode === 'email') ? '000000' : (digits.length >= 6 ? digits.slice(-6) : 'a123123')

      // 建立 Supabase Auth 帳號（若已存在則忽略錯誤）
      try {
        const regEmail = (mode === 'email')
          ? (form.email || '').toLowerCase()
          : ((form.email || '').toLowerCase() || `m-${digits}@member.local`)
        const { error: signErr } = await supabase.auth.signUp({
          email: regEmail,
          password: defaultPassword,
          options: { data: { user_type: 'member', name: form.name, phone: digits } }
        })
        if (signErr && !String(signErr.message || '').toLowerCase().includes('already registered')) {
          throw signErr
        }
        try { localStorage.setItem('member-pw-reset-required', '1') } catch {}
      } catch (e:any) {
        console.warn('建立會員 Auth 帳號失敗（可能已存在）：', e?.message || e)
      }
      // 直接寫入 members（改為即時生效會員，取消待審）
      try {
        await (a as any).memberRepo.create({
          name: form.name,
          email: (form.email||'').toLowerCase(),
          phone: form.phone,
          addresses: [],
          referrerCode: form.refCode || undefined,
          referrerType: undefined,
        })
      } catch (writeMemberErr) {
        console.warn('寫入 members 失敗：', writeMemberErr)
      }
      // 記錄推薦事件（非阻斷）
      try {
        const role = form.refCode?.startsWith('MO') ? 'member' : form.refCode?.startsWith('SR') ? 'technician' : form.refCode?.startsWith('SE') ? 'sales' : 'unknown'
        const mod = await import('../../adapters/supabase/referrals')
        await mod.referralRepo.log({ refCode: form.refCode || '', refRole: role as any, referredEmail: (form.email||'').toLowerCase() || undefined, referredPhone: form.phone || undefined, channel: refFromUrl ? 'qr' : 'link' })
      } catch {}
      // 同步建立派工系統的客戶資料（最小變更：失敗不阻斷流程）
      try {
        await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            phone: form.phone,
            email: form.email,
            address: ''
          })
        })
      } catch {}
      setOk(true)
    } catch (e: any) {
      setErr(e?.message || '註冊失敗')
    }
  }
  if (ok) return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card text-center">
        <div className="text-5xl">📝</div>
        <div className="mt-3 text-lg font-semibold">註冊成功</div>
        <div className="mt-2 text-gray-600">您的會員已啟用，現在即可前往購物。</div>
        <button
          onClick={() => navigate('/shop/cart')}
          className="mt-6 w-full rounded-xl bg-brand-500 py-3 text-white hover:bg-brand-600"
        >
          前往購物車
        </button>
      </div>
    </div>
  )
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card">
        <div className="mb-2 text-center text-xl font-bold">會員註冊</div>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={()=>setMode('email')} className={`rounded-lg px-3 py-2 text-sm ${mode==='email'?'bg-blue-600 text-white':'bg-gray-100'}`}>使用 Email 註冊</button>
          <button type="button" onClick={()=>setMode('phone')} className={`rounded-lg px-3 py-2 text-sm ${mode==='phone'?'bg-emerald-600 text-white':'bg-gray-100'}`}>使用手機註冊</button>
        </div>
        {err && <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div>}
        <div className="space-y-3">
          <input className="w-full rounded-xl border px-4 py-3" placeholder="姓名（必填）" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
          {mode==='email' ? (
            <>
              <input className="w-full rounded-xl border px-4 py-3" placeholder="Email（必填）" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required />
              <input className="w-full rounded-xl border px-4 py-3" placeholder="手機（選填）" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
              <div className="text-xs text-gray-500">預設密碼：000000（首次登入會引導變更）</div>
            </>
          ) : (
            <>
              <input className="w-full rounded-xl border px-4 py-3" placeholder="手機（必填）" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} required />
              <input className="w-full rounded-xl border px-4 py-3" placeholder="Email（選填）" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
              <div className="text-xs text-gray-500">預設密碼：手機後六碼（首次登入會引導變更）</div>
            </>
          )}
          <input className="w-full rounded-xl border px-4 py-3" placeholder="介紹人（自動帶入，可修改）" value={form.refCode} onChange={e=>setForm({...form,refCode:e.target.value})} />
          <button className="w-full rounded-xl bg-brand-500 py-3 text-white">送出</button>
        </div>
      </form>
    </div>
  )
}


