import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { memberRepo } from '../../adapters/local/members'

export default function MemberRegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', refCode: '' })
  const [ok, setOk] = useState<{ code: string } | null>(null)
  const [err, setErr] = useState('')
  const navigate = useNavigate()
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    try {
      const created = await memberRepo.create({ name: form.name, email: form.email || undefined, phone: form.phone || undefined, referrerCode: form.refCode || undefined })
      setOk({ code: created.code })
    } catch (e: any) {
      setErr(e?.message || '註冊失敗')
    }
  }
  if (ok) return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card text-center">
        <div className="text-5xl">🎉</div>
        <div className="mt-3 text-lg font-semibold">註冊成功</div>
        <div className="mt-2 text-gray-600">您的會員編號：<span className="font-bold">{ok.code}</span></div>
        <button
          onClick={() => navigate('/member-login')}
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
          <input className="w-full rounded-xl border px-4 py-3" placeholder="姓名" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
          <input className="w-full rounded-xl border px-4 py-3" placeholder="Email（選填）" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
          <input className="w-full rounded-xl border px-4 py-3" placeholder="手機（選填）" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
          <input className="w-full rounded-xl border px-4 py-3" placeholder="介紹人（MOxxxx / SRxxx / SExxx）" value={form.refCode} onChange={e=>setForm({...form,refCode:e.target.value})} />
          <button className="w-full rounded-xl bg-brand-500 py-3 text-white">送出</button>
        </div>
      </form>
    </div>
  )
}


