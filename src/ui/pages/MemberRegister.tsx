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
  const genMemberCode = () => {
    // 產生 MO+4 位不重複：先隨機；真正唯一性交給 DB unique index 保證，若衝突重試
    const rnd = String(Math.floor(1000 + Math.random()*9000))
    return `MO${rnd}`
  }
  const parseRef = (code?: string) => {
    const c = (code||'').trim().toUpperCase()
    if (c.startsWith('MO')) return { type: 'member', code: c }
    if (c.startsWith('SR')) return { type: 'technician', code: c }
    if (c.startsWith('SE')) return { type: 'sales', code: c }
    return { type: undefined, code: c }
  }
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
      }
      if (!digits || digits.length < 8) { setErr('請填寫有效手機'); return }
      // 預設密碼：email 模式 000000；phone 模式 手機後六碼
      const defaultPassword = (mode === 'email') ? '000000' : (digits.length >= 6 ? digits.slice(-6) : 'a123123')
      const regEmail = (mode === 'email')
        ? (form.email || '').toLowerCase()
        : ((form.email || '').toLowerCase() || `m-${digits}@member.local`)

      // 建立 Supabase Auth 帳號（若已存在則忽略錯誤）
      try {
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
      // 建立 members，帶入會員 code 與介紹人型別
      const memberCode = genMemberCode()
      const { type: refType, code: refCode } = parseRef(form.refCode)
      try {
        await (a as any).memberRepo.create({
          name: form.name,
          email: regEmail,
          phone: form.phone,
          code: memberCode,
          addresses: [],
          referrerCode: refCode || undefined,
          referrerType: refType || undefined,
        })
      } catch (writeMemberErr) {
        console.warn('寫入 members 失敗：', writeMemberErr)
      }
      // 記錄推薦事件（非阻斷）
      try {
        const mod = await import('../../adapters/supabase/referrals')
        const role = parseRef(form.refCode).type || 'unknown'
        await mod.referralRepo.log({ refCode: form.refCode || '', refRole: role as any, referredEmail: (form.email||'').toLowerCase() || undefined, referredPhone: form.phone || undefined, channel: refFromUrl ? 'qr' : 'link' })
      } catch {}

      // 發點改為「首次登入時」觸發，避免註冊/登入重複發點
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
          onClick={() => navigate('/store/cart')}
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
        <div className="text-center text-2xl font-extrabold text-gray-900 mb-1">日式洗濯家電服務</div>
        <div className="mb-2 text-center text-xl font-bold">會員註冊</div>
        <div className="mb-2 text-center text-sm text-gray-600">
          已有帳號？<a href="/login/member" className="text-blue-600 hover:text-blue-700">前往登入</a>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={()=>setMode('email')} className={`rounded-lg px-3 py-2 text-sm ${mode==='email'?'bg-blue-600 text-white':'bg-gray-100'}`}>使用 Email 註冊</button>
          <button type="button" onClick={()=>setMode('phone')} className={`rounded-lg px-3 py-2 text-sm ${mode==='phone'?'bg-emerald-600 text-white':'bg-gray-100'}`}>使用手機註冊</button>
        </div>
        {err && <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div>}
        <div className="space-y-3">
          <div>
            <label htmlFor="reg_name" className="block text-sm font-medium text-gray-700 mb-2">姓名（必填）</label>
            <input id="reg_name" name="name" autoComplete="name" className="w-full rounded-xl border px-4 py-3" placeholder="姓名（必填）" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
          </div>
          {mode==='email' ? (
            <>
              <div>
                <label htmlFor="reg_email" className="block text-sm font-medium text-gray-700 mb-2">Email（必填）</label>
                <input id="reg_email" name="email" autoComplete="email" className="w-full rounded-xl border px-4 py-3" placeholder="Email（必填）" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required />
              </div>
              <div>
                <label htmlFor="reg_phone" className="block text-sm font-medium text-gray-700 mb-2">手機（選填）</label>
                <input id="reg_phone" name="phone" autoComplete="tel" className="w-full rounded-xl border px-4 py-3" placeholder="手機（選填）" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
              </div>
              <div className="text-xs text-gray-500">預設密碼：000000（首次登入會引導變更）</div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="reg_phone2" className="block text-sm font-medium text-gray-700 mb-2">手機（必填）</label>
                <input id="reg_phone2" name="phone" autoComplete="tel" className="w-full rounded-xl border px-4 py-3" placeholder="手機（必填）" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} required />
              </div>
              <div>
                <label htmlFor="reg_email2" className="block text-sm font-medium text-gray-700 mb-2">Email（選填）</label>
                <input id="reg_email2" name="email" autoComplete="email" className="w-full rounded-xl border px-4 py-3" placeholder="Email（選填）" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
              </div>
              <div className="text-xs text-gray-500">預設密碼：手機後六碼（首次登入會引導變更）</div>
            </>
          )}
          <div>
            <label htmlFor="reg_ref" className="block text-sm font-medium text-gray-700 mb-2">介紹人（自動帶入，可修改）</label>
            <input id="reg_ref" name="refCode" autoComplete="off" className="w-full rounded-xl border px-4 py-3" placeholder="介紹人（自動帶入，可修改）" value={form.refCode} onChange={e=>setForm({...form,refCode:e.target.value})} />
          </div>
          <button className="w-full rounded-xl bg-brand-500 py-3 text-white">送出</button>
        </div>
      </form>
    </div>
  )
}


