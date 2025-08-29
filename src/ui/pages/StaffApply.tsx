import { useState } from 'react'
import { loadAdapters } from '../../adapters'

export default function StaffApplyPage(){
  const [form, setForm] = useState({ name:'', shortName:'', email:'', phone:'', role:'support' as 'support'|'sales' })
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e: React.FormEvent)=>{
    e.preventDefault(); setErr('')
    try { const a = await loadAdapters(); await (a as any).staffApplicationRepo.submit({ name: form.name, shortName: form.shortName||undefined, email: form.email, phone: form.phone||undefined, role: form.role }); setOk(true) }
    catch(e:any){ setErr(e?.message||'送出失敗') }
  }
  if (ok) return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-card"><div className="text-5xl">✅</div><div className="mt-3 text-lg font-semibold">已送出申請</div><div className="text-gray-600">待管理員審核</div></div></div>
  )
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card">
        <div className="mb-4 text-center text-xl font-bold">員工申請</div>
        {err && <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div>}
        <div className="space-y-3">
          <input className="w-full rounded-xl border px-4 py-3" placeholder="姓名" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
          <input className="w-full rounded-xl border px-4 py-3" placeholder="簡稱（選填）" value={form.shortName} onChange={e=>setForm({...form,shortName:e.target.value})} />
          <input className="w-full rounded-xl border px-4 py-3" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required />
          <input className="w-full rounded-xl border px-4 py-3" placeholder="手機（選填）" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
          <select className="w-full rounded-xl border px-4 py-3" value={form.role} onChange={e=>setForm({...form,role:e.target.value as any})}>
            <option value="support">客服</option>
            <option value="sales">業務</option>
          </select>
          <button className="w-full rounded-xl bg-brand-500 py-3 text-white">送出</button>
        </div>
      </form>
    </div>
  )
}


