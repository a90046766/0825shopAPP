import { useState } from 'react'
import { loadAdapters } from '../../adapters'

export default function MemberApplyPage(){
  const [form, setForm] = useState({ name:'', email:'', phone:'', referrerCode:'' })
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e: React.FormEvent)=>{
    e.preventDefault(); setErr('')
    try { const a = await loadAdapters(); await (a as any).memberApplicationRepo.submit({ name: form.name, email: form.email||undefined, phone: form.phone||undefined, referrerCode: form.referrerCode||undefined }); setOk(true) }
    catch(e:any){ setErr(e?.message||'送出失敗') }
  }
  if (ok) return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-card"><div className="text-5xl">✅</div><div className="mt-3 text-lg font-semibold">已送出申請</div><div className="text-gray-600">待客服審核後建立會員編號</div></div></div>
  )
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card">
        <div className="mb-4 text-center text-xl font-bold">會員申請</div>
        {err && <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div>}
        <div className="space-y-3">
          <input className="w-full rounded-xl border px-4 py-3" placeholder="姓名" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
          <input className="w-full rounded-xl border px-4 py-3" placeholder="Email（選填）" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
          <input className="w-full rounded-xl border px-4 py-3" placeholder="手機（選填）" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
          <input className="w-full rounded-xl border px-4 py-3" placeholder="介紹碼（MO/SR/SE）" value={form.referrerCode} onChange={e=>setForm({...form,referrerCode:e.target.value})} />
          <button className="w-full rounded-xl bg-brand-500 py-3 text-white">送出</button>
        </div>
      </form>
    </div>
  )
}


