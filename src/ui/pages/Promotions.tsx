import { useEffect, useState } from 'react'
import { loadAdapters } from '../../adapters'
import { authRepo } from '../../adapters/local/auth'
import { Navigate } from 'react-router-dom'
import { compressImageToDataUrl } from '../../utils/image'

export default function PromotionsPage() {
  const u = authRepo.getCurrentUser()
  if (u && u.role==='technician') return <Navigate to="/dispatch" replace />
  const [rows, setRows] = useState<any[]>([])
  const [edit, setEdit] = useState<any | null>(null)
  const [repos, setRepos] = useState<any>(null)
  useEffect(() => { (async()=>{ const a = await loadAdapters(); setRepos(a); setRows(await (a as any).promotionsRepo.list()) })() }, [])
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">活動管理</div>
        <button onClick={()=>setEdit({ title:'', active:true })} className="rounded-lg bg-brand-500 px-3 py-1 text-white">新增</button>
      </div>
      {rows.map(p => (
        <div key={p.id} className="rounded-xl border p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{p.title}</div>
              <div className="text-xs text-gray-500">{p.active?'啟用':'停用'}｜{p.startAt||'-'} ~ {p.endAt||'-'}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setEdit(p)} className="rounded-lg bg-gray-900 px-3 py-1 text-white">編輯</button>
              <button onClick={async()=>{ const { confirmTwice } = await import('../kit'); if(await confirmTwice('確認刪除？','刪除後無法復原，仍要刪除？')) { await (repos as any).promotionsRepo.remove(p.id); setRows(await (repos as any).promotionsRepo.list()) } }} className="rounded-lg bg-rose-500 px-3 py-1 text-white">刪除</button>
            </div>
          </div>
        </div>
      ))}
      {rows.length===0 && <div className="text-gray-500">尚無活動</div>}
      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-card">
            <div className="mb-2 text-lg font-semibold">{edit.id?'編輯':'新增'}活動</div>
            <div className="space-y-2 text-sm">
              <div>標題：<input className="w-full rounded border px-2 py-1" value={edit.title} onChange={e=>setEdit({...edit,title:e.target.value})} /></div>
              <div>啟用：<input type="checkbox" checked={!!edit.active} onChange={e=>setEdit({...edit,active:e.target.checked})} /></div>
              <div className="flex gap-2">
                <input type="date" className="w-full rounded border px-2 py-1" value={edit.startAt||''} onChange={e=>setEdit({...edit,startAt:e.target.value})} />
                <input type="date" className="w-full rounded border px-2 py-1" value={edit.endAt||''} onChange={e=>setEdit({...edit,endAt:e.target.value})} />
              </div>
              <div>
                <label className="mb-1 block">封面（自動壓縮 ≤200KB）</label>
                <input type="file" accept="image/*" onChange={async (e)=>{
                  const f = e.target.files?.[0]; if(!f) return
                  const dataUrl = await compressImageToDataUrl(f, 200)
                  setEdit((prev:any)=>({ ...prev, coverUrl: dataUrl }))
                }} />
                {edit.coverUrl && <img src={edit.coverUrl} className="mt-2 h-24 w-24 rounded object-cover" />}
              </div>
              <div>
                <label className="mb-1 block">百分比折扣（%）</label>
                <input type="number" className="w-32 rounded border px-2 py-1" value={(edit.rules?.percent)||0} onChange={e=>setEdit({...edit,rules:{...(edit.rules||{}),percent:Number(e.target.value)}})} />
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={()=>setEdit(null)} className="rounded-lg bg-gray-100 px-3 py-1">取消</button>
              <button onClick={async()=>{ await (repos as any).promotionsRepo.upsert(edit); setEdit(null); setRows(await (repos as any).promotionsRepo.list()) }} className="rounded-lg bg-brand-500 px-3 py-1 text-white">儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


