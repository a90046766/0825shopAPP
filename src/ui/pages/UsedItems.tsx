import { useEffect, useState } from 'react'
import { loadAdapters } from '../../adapters'

export default function UsedItemsPage(){
  const [rows, setRows] = useState<any[]>([])
  const [edit, setEdit] = useState<any|null>(null)
  const [repos, setRepos] = useState<any>(null)

  useEffect(()=>{ (async()=>{ const a = await loadAdapters(); setRepos(a); try { const list = await (a as any).usedItemsRepo?.list?.(); setRows(list||[]) } catch {} })() },[])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">二手清單</div>
        <button onClick={()=>setEdit({ id:'', title:'', price:0, imageUrls:[], status:'available' })} className="rounded-lg bg-brand-500 px-3 py-1 text-white">上架</button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {rows.map((it:any)=> (
          <div key={it.id} className="rounded-xl border bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{it.title}</div>
                <div className="text-xs text-gray-500">{it.status}｜${it.price}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setEdit(it)} className="rounded bg-gray-900 px-3 py-1 text-white">編輯</button>
                <button onClick={async()=>{ const { confirmTwice } = await import('../kit'); if(await confirmTwice('確認刪除？','刪除後無法復原，仍要刪除？')){ await (repos as any).usedItemsRepo.remove(it.id); setRows(await (repos as any).usedItemsRepo.list()) } }} className="rounded bg-rose-500 px-3 py-1 text-white">刪除</button>
              </div>
            </div>
          </div>
        ))}
        {rows.length===0 && <div className="text-gray-500">尚無二手品</div>}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-card">
            <div className="mb-2 text-lg font-semibold">{edit.id? '編輯':'上架'}二手品</div>
            <div className="space-y-2 text-sm">
              <div>名稱：<input className="w-full rounded border px-2 py-1" value={edit.title} onChange={e=>setEdit({...edit,title:e.target.value})} /></div>
              <div>售價：<input type="number" className="w-full rounded border px-2 py-1" value={edit.price} onChange={e=>setEdit({...edit,price:Number(e.target.value)||0})} /></div>
              <div>狀態：
                <select className="w-full rounded border px-2 py-1" value={edit.status} onChange={e=>setEdit({...edit,status:e.target.value})}>
                  <option value="available">available</option>
                  <option value="reserved">reserved</option>
                  <option value="sold">sold</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={()=>setEdit(null)} className="rounded bg-gray-100 px-3 py-1">取消</button>
              <button onClick={async()=>{
                await (repos as any).usedItemsRepo.upsert({ id: edit.id||undefined, title: edit.title, price: edit.price, imageUrls: edit.imageUrls||[], status: edit.status })
                setEdit(null); setRows(await (repos as any).usedItemsRepo.list())
              }} className="rounded bg-brand-500 px-3 py-1 text-white">儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


