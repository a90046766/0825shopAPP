import { useEffect, useState } from 'react'
import { loadAdapters } from '../../adapters'

export default function MembersPage() {
  const [rows, setRows] = useState<any[]>([])
  const [repos, setRepos] = useState<any>(null)
  const [edit, setEdit] = useState<any | null>(null)
  const load = async () => { if(!repos) return; setRows(await repos.memberRepo.list()) }
  useEffect(()=>{ (async()=>{ const a = await loadAdapters(); setRepos(a) })() },[])
  useEffect(()=>{ if(repos) load() },[repos])
  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold">會員管理</div>
      <div className="rounded-2xl bg-white p-2 shadow-card">
        {rows.map(m => (
          <div key={m.id} className="flex items-center justify-between border-b p-3 text-sm">
            <div>
              <div className="font-semibold">{m.name} <span className="text-xs text-gray-500">{m.code}</span></div>
              <div className="text-xs text-gray-500">{m.email||'-'}｜{m.phone||'-'}｜積分 {m.points||0}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>navigator.clipboard.writeText(m.code)} className="rounded bg-gray-100 px-3 py-1">複製編號</button>
              <button onClick={()=>setEdit(m)} className="rounded bg-gray-900 px-3 py-1 text-white">編輯</button>
            </div>
          </div>
        ))}
        {rows.length===0 && <div className="p-4 text-center text-gray-500">尚無會員</div>}
      </div>
      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-card">
            <div className="mb-2 text-lg font-semibold">編輯會員</div>
            <div className="space-y-2 text-sm">
              <input className="w-full rounded border px-2 py-1" placeholder="姓名" value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})} />
              <input className="w-full rounded border px-2 py-1" placeholder="Email" value={edit.email||''} onChange={e=>setEdit({...edit,email:e.target.value})} />
              <input className="w-full rounded border px-2 py-1" placeholder="手機" value={edit.phone||''} onChange={e=>setEdit({...edit,phone:e.target.value})} />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={()=>setEdit(null)} className="rounded bg-gray-100 px-3 py-1">取消</button>
              <button onClick={async()=>{ if(!repos) return; await repos.memberRepo.upsert(edit); setEdit(null); load() }} className="rounded bg-brand-500 px-3 py-1 text-white">儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


