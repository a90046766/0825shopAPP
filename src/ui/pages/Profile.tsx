import { useEffect, useState } from 'react'
import { SectionTitle } from '../kit'
import { useNavigate } from 'react-router-dom'
import { loadAdapters } from '../../adapters'

export default function PageProfile() {
  const nav = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [record, setRecord] = useState<any>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [avatar, setAvatar] = useState<string>('')
  const [tempContact, setTempContact] = useState('')
  const roleZh = user?.role==='admin'? '管理員' : user?.role==='support'? '客服' : user?.role==='sales'? '業務' : user?.role==='technician'? '內部人員' : '會員'

  useEffect(() => {
    try { const s = localStorage.getItem('supabase-auth-user'); if (s) setUser(JSON.parse(s)) } catch {}
  }, [])

  useEffect(() => {
    (async()=>{
      if (!user) return
      const a: any = await loadAdapters()
      const emailLc = (user.email||'').toLowerCase()
      let rec: any = null
      if (user.role === 'technician') {
        const list = await a.technicianRepo.list()
        rec = (list||[]).find((t:any)=> (t.email||'').toLowerCase()===emailLc) || null
      } else {
        const list = await a.staffRepo.list()
        rec = (list||[]).find((s:any)=> (s.email||'').toLowerCase()===emailLc) || null
      }
      setRecord(rec)
      setName(rec?.name || user.name || '')
      setEmail(user.email || '')
      setPhone(rec?.phone || '')
      setTempContact(rec?.tempContact || '')
      try { const av = localStorage.getItem('avatar:'+emailLc); if (av) setAvatar(av) } catch {}
    })()
  }, [user])

  const memberCode = user?.role==='technician' ? (record?.code || '') : (record?.refCode || '')
  const staffLabel = (user?.role==='technician' || user?.role==='support' || user?.role==='sales' || user?.role==='admin')

  async function handleSave() {
    const a: any = await loadAdapters()
    if (user.role === 'technician') {
      await a.technicianRepo.upsert({ id: record?.id, name, shortName: record?.shortName, email, phone, region: record?.region||'all', status: record?.status||'active', skills: record?.skills||{}, revenueShareScheme: record?.revenueShareScheme, tempContact } as any)
    } else {
      await a.staffRepo.upsert({ name, shortName: record?.shortName, email, phone, role: record?.role||user.role, status: record?.status||'active', points: record?.points||0, refCode: record?.refCode, tempContact } as any)
    }
    setRecord({ ...(record||{}), name, phone, tempContact })
    alert('已儲存')
  }

  function onPickAvatar() {
    const input = document.createElement('input'); input.type='file'; input.accept='image/*';
    input.onchange = async (e:any)=>{
      const f = e.target.files?.[0]; if(!f) return; const reader = new FileReader(); reader.onload=()=>{ const url = String(reader.result||''); setAvatar(url); try { localStorage.setItem('avatar:'+String(email).toLowerCase(), url) } catch {} }; reader.readAsDataURL(f)
    };
    input.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-gray-200 overflow-hidden">
          {avatar ? <img src={avatar} alt="avatar" className="h-full w-full object-cover"/> : null}
        </div>
        <div>
          <div className="text-lg font-semibold">{roleZh}</div>
          <div className="text-sm text-gray-500">{name||'-'}｜{email||'-'}</div>
        </div>
        <button onClick={onPickAvatar} className="ml-auto rounded bg-gray-100 px-3 py-1 text-sm">上傳照片</button>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-card">
        <SectionTitle>{staffLabel ? '內部人員' : '個人設定'}</SectionTitle>
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm">
          <label className="block">姓名<input className="mt-1 w-full rounded border px-3 py-2" value={name} onChange={e=>setName(e.target.value)} /></label>
          <label className="block">手機<input className="mt-1 w-full rounded border px-3 py-2" value={phone} onChange={e=>setPhone(e.target.value)} /></label>
          <label className="block">信箱<input className="mt-1 w-full rounded border px-3 py-2 bg-gray-50" value={email} disabled /></label>
          {staffLabel && memberCode && (
            <label className="block">會員編號<input className="mt-1 w-full rounded border px-3 py-2 bg-gray-50" value={memberCode} disabled /></label>
          )}
          {/* 臨時聯絡人：目前暫存在本地，待資料表補欄位 */}
          {staffLabel && (
            <label className="block">臨時聯絡人<input className="mt-1 w-full rounded border px-3 py-2" placeholder="（選填）" value={tempContact} onChange={e=>setTempContact(e.target.value)} /></label>
          )}
          <div className="pt-2">
            <button onClick={handleSave} className="rounded-xl bg-brand-500 px-4 py-2 text-white">儲存</button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-card">
        <SectionTitle>安全性</SectionTitle>
        <div className="mt-3 space-y-3 text-sm">
          <button onClick={()=>nav('/reset-password')} className="w-full rounded-xl bg-gray-900 py-3 text-white">變更密碼</button>
        </div>
      </div>
    </div>
  )
}


