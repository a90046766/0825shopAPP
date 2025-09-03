import { useEffect, useState } from 'react'
import { siteCMS } from '../../adapters/supabase/site_cms'

type UserLite = { role?: 'admin'|'support'|'technician'|'sales'|'member'; email?: string; name?: string }

function useCurrentUser(): UserLite | null {
  try {
    const raw = localStorage.getItem('supabase-auth-user')
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

export default function PublicFooter(){
  const [settings, setSettings] = useState<any|null>(null)
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState<any>({})
  const user = useCurrentUser()
  const canEdit = user?.role==='admin' || user?.role==='support'

  useEffect(()=>{ (async()=>{ try{ const s = await siteCMS.getSettings(); setSettings(s); setDraft(s||{}) }catch{} })() },[])

  return (
    <footer className="mt-6 rounded-2xl border bg-white p-4 text-sm text-gray-700 shadow-card">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div>電話：{settings?.phone ? <a className="text-brand-600" href={`tel:${settings.phone}`}>{settings.phone}</a> : '—'}</div>
          <div>Email：{settings?.email ? <a className="text-brand-600" href={`mailto:${settings.email}`}>{settings.email}</a> : '—'}</div>
          <div>LINE：{settings?.lineUrl ? <a className="text-brand-600" target="_blank" rel="noreferrer" href={settings.lineUrl}>{settings.lineUrl}</a> : '—'}</div>
        </div>
        {canEdit && (
          <button onClick={()=>{ setEdit(v=>!v); setDraft(settings||{}) }} className="rounded bg-gray-100 px-3 py-1 text-xs">{edit?'關閉編輯':'編輯聯絡方式'}</button>
        )}
      </div>

      {canEdit && edit && (
        <div className="mx-auto mt-3 max-w-5xl rounded-lg border p-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <input className="rounded border px-2 py-1" placeholder="電話" value={draft.phone||''} onChange={e=>setDraft({...draft, phone:e.target.value})} />
            <input className="rounded border px-2 py-1" placeholder="Email" value={draft.email||''} onChange={e=>setDraft({...draft, email:e.target.value})} />
            <input className="rounded border px-2 py-1" placeholder="LINE 連結" value={draft.lineUrl||''} onChange={e=>setDraft({...draft, lineUrl:e.target.value})} />
          </div>
          <div className="mt-2 text-right">
            <button onClick={async()=>{ try{ const saved = await siteCMS.updateSettings(draft); setSettings(saved); setEdit(false) } catch(e:any){ alert(e?.message||'儲存失敗') } }} className="rounded bg-brand-500 px-3 py-1 text-sm text-white">儲存</button>
          </div>
        </div>
      )}
    </footer>
  )}


