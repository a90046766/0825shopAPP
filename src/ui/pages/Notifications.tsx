import { useEffect, useState } from 'react'
import { loadAdapters } from '../../adapters'
import { authRepo } from '../../adapters/local/auth'
import { can } from '../../utils/permissions'

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([])
  const [unread, setUnread] = useState<Record<string, boolean>>({})
  const [compose, setCompose] = useState<any>({ title:'', body:'', target:'member', targetUserEmail:'', subset:'' })

  const [repos, setRepos] = useState<any>(null)
  const load = async () => {
    const user = authRepo.getCurrentUser()
    if (!user || !repos) return
    const { items, unreadIds } = await (repos as any).notificationRepo.listForUser(user)
    setItems(items)
    setUnread(unreadIds)
  }

  useEffect(() => { (async()=>{ const a = await loadAdapters(); setRepos(a) })() }, [])
  useEffect(() => { load() }, [repos])

  const markRead = async (id: string) => {
    const user = authRepo.getCurrentUser()
    if (!user) return
    await (repos as any).notificationRepo.markRead(user, id)
    await load()
  }

  return (
    <div className="space-y-3">
      {(() => { const u = authRepo.getCurrentUser(); return can(u,'notifications.send') })() && (
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <div className="mb-2 text-base font-semibold flex items-center gap-2">
          📢 發送通知
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <input className="rounded border px-2 py-1" placeholder="標題" value={compose.title} onChange={e=>setCompose({...compose,title:e.target.value})} />
          <textarea className="rounded border px-2 py-1" placeholder="內容（選填）" value={compose.body} onChange={e=>setCompose({...compose,body:e.target.value})} />
          <select className="rounded border px-2 py-1" value={compose.target} onChange={e=>setCompose({...compose,target:e.target.value})}>
            <option value="member">會員</option>
            <option value="user">指定使用者</option>
            <option value="subset">部分名單</option>
          </select>
          {compose.target==='user' && (
            <input className="rounded border px-2 py-1" placeholder="目標 Email" value={compose.targetUserEmail} onChange={e=>setCompose({...compose,targetUserEmail:e.target.value})} />
          )}
          {compose.target==='subset' && (
            <textarea className="rounded border px-2 py-1" placeholder="多位 Email，逗號或換行分隔" value={compose.subset} onChange={e=>setCompose({...compose,subset:e.target.value})} />
          )}
          <div className="text-right">
            <button onClick={async()=>{ const user=authRepo.getCurrentUser(); if(!user || !repos) return; if(compose.target==='subset'){ const emails=(compose.subset||'').split(/[,\n]/).map((s:string)=>s.trim()).filter(Boolean); for (const em of emails){ await (repos as any).notificationRepo.push({ title:compose.title, body:compose.body, level:'info', target:'user', targetUserEmail: em }); } } else { const payload:any = { title:compose.title, body:compose.body, level:'info', target:compose.target }; if(compose.target==='user') payload.targetUserEmail = compose.targetUserEmail; await (repos as any).notificationRepo.push(payload); } setCompose({ title:'', body:'', target:'member', targetUserEmail:'', subset:'' }); const { items, unreadIds } = await (repos as any).notificationRepo.listForUser(user); setItems(items); setUnread(unreadIds) }} className="rounded-lg bg-brand-500 px-3 py-1 text-white flex items-center gap-1">
              📤 發送
            </button>
          </div>
        </div>
      </div>
      )}
      {items.map(it => (
        <div key={it.id} className={`rounded-xl border bg-white p-4 shadow-card ${unread[it.id] ? 'border-brand-300' : 'border-gray-200'}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-base font-semibold flex items-center gap-2">
                {unread[it.id] ? '🔔' : '📢'} {it.title}
              </div>
              {it.body && <div className="mt-1 text-sm text-gray-600">{it.body}</div>}
            </div>
            {unread[it.id] && (
              <button onClick={() => markRead(it.id)} className="rounded-lg bg-brand-500 px-3 py-1 text-xs text-white">標示已讀</button>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-400">{new Date(it.sentAt || it.createdAt).toLocaleString('zh-TW')}</div>
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-center text-gray-500">目前沒有通知</div>
      )}
    </div>
  )
}


