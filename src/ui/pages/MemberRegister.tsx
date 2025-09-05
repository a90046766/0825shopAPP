import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadAdapters } from '../../adapters'
import { supabase } from '../../utils/supabase'

export default function MemberRegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', refCode: '' })
  const [ok, setOk] = useState<boolean>(false)
  const [err, setErr] = useState('')
  const navigate = useNavigate()
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    try {
      const a = await loadAdapters()
      // 所有三個欄位皆為必填
      if (!form.name || !form.email || !form.phone) { setErr('請完整填寫姓名、Email、手機'); return }
      // 預設密碼規則：手機後六碼
      const digits = (form.phone || '').replace(/\D/g, '')
      const defaultPassword = digits.length >= 6 ? digits.slice(-6) : 'a123123'

      // 建立 Supabase Auth 帳號（若已存在則忽略錯誤）
      try {
        const { error: signErr } = await supabase.auth.signUp({
          email: form.email.toLowerCase(),
          password: defaultPassword,
          options: { data: { user_type: 'member', name: form.name } }
        })
        if (signErr && !String(signErr.message || '').toLowerCase().includes('already registered')) {
          throw signErr
        }
        try { localStorage.setItem('member-pw-reset-required', '1') } catch {}
      } catch (e:any) {
        console.warn('建立會員 Auth 帳號失敗（可能已存在）：', e?.message || e)
      }
      // 走審核流程：送進 member_applications（避免直接寫 members 觸發 RLS）
      await (a as any).memberApplicationRepo.submit({ name: form.name, email: form.email, phone: form.phone, referrerCode: form.refCode || undefined })
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
        <div className="mt-3 text-lg font-semibold">申請已送出</div>
        <div className="mt-2 text-gray-600">我們已收到您的會員申請，待客服/管理員審核通過後，會以站內通知歡迎您加入。</div>
        <button
          onClick={() => navigate('/login/member')}
          className="mt-6 w-full rounded-xl bg-brand-500 py-3 text-white hover:bg-brand-600"
        >
          返回登入
        </button>
      </div>
    </div>
  )
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card">
        <div className="mb-4 text-center text-xl font-bold">會員註冊</div>
        {err && <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div>}
        <div className="space-y-3">
          <input className="w-full rounded-xl border px-4 py-3" placeholder="姓名（必填）" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
          <input className="w-full rounded-xl border px-4 py-3" placeholder="Email（必填）" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required />
          <input className="w-full rounded-xl border px-4 py-3" placeholder="手機（必填）" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} required />
          <input className="w-full rounded-xl border px-4 py-3" placeholder="介紹人（選填）" value={form.refCode} onChange={e=>setForm({...form,refCode:e.target.value})} />
          <button className="w-full rounded-xl bg-brand-500 py-3 text-white">送出</button>
        </div>
      </form>
    </div>
  )
}


