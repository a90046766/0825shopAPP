import { useEffect, useState } from 'react'
import { technicianRepo } from '../../adapters/local/technicians'
import { authRepo } from '../../adapters/local/auth'
import { Navigate } from 'react-router-dom'

export default function TechnicianManagementPage() {
  const user = authRepo.getCurrentUser()
  if (user && user.role==='technician') return <Navigate to="/dispatch" replace />
  const [rows, setRows] = useState<any[]>([])
  const [edit, setEdit] = useState<any | null>(null)
  const load = async () => setRows(await technicianRepo.list())
  useEffect(() => { load() }, [])
  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold">技師管理</div>
      {rows.map(t => (
        <div key={t.id} className="rounded-xl border p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{t.name} <span className="text-xs text-gray-500">{t.code}</span></div>
              <div className="text-xs text-gray-500">email {t.email}｜區域 {t.region}｜方案 {t.revenueShareScheme||'-'}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>{navigator.clipboard.writeText(t.code)}} className="rounded-lg bg-gray-100 px-3 py-1 text-sm">複製編號</button>
              <button onClick={()=>setEdit(t)} className="rounded-lg bg-gray-900 px-3 py-1 text-white">編輯</button>
              <button onClick={async()=>{ const { confirmTwice } = await import('../kit'); if(await confirmTwice('確認刪除此技師？','刪除後無法復原，仍要刪除？')){ await (await import('../../adapters/local/technicians')).technicianRepo.remove(t.id); load() } }} className="rounded-lg bg-rose-500 px-3 py-1 text-white">刪除</button>
            </div>
          </div>
        </div>
      ))}
      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-card">
            <div className="mb-2 text-lg font-semibold">編輯技師</div>
            <div className="space-y-2 text-sm">
              <div>姓名：<input className="w-full rounded border px-2 py-1" value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})} /></div>
              <div>方案：
                <select className="w-full rounded border px-2 py-1" value={edit.revenueShareScheme||''} onChange={e=>setEdit({...edit,revenueShareScheme:e.target.value})}>
                  <option value="">未指定</option>
                  <option value="pure70">純70</option>
                  <option value="pure72">純72</option>
                  <option value="pure73">純73</option>
                  <option value="pure75">純75</option>
                  <option value="pure80">純80</option>
                  <option value="base1">保1（40k+10%）</option>
                  <option value="base2">保2（40k+20%）</option>
                  <option value="base3">保3（40k+30%）</option>
                </select>
              </div>
            </div>
            <div className="mt-2 text-sm">
              <div className="mb-1 font-semibold">技能矩陣</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['acStandard','分離式冷氣'],
                  ['washerStandard','直立洗衣機'],
                  ['acSpecial','特殊分離式'],
                  ['hoodStandard','一般抽油煙機'],
                  ['hoodHidden','隱藏抽油煙機'],
                  ['stainlessTank','不鏽鋼水塔'],
                  ['concreteTank','水泥水塔'],
                  ['concealedAC','吊隱式冷氣'],
                  ['concealedACSpecial','吊隱特殊'],
                  ['pipe','管路施工'],
                  ['washerDrum','滾筒洗衣機'],
                ].map(([key,label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input type="checkbox" checked={!!(edit.skills?.[key])} onChange={e=>{ const skills = { ...(edit.skills||{}) }; skills[key] = e.target.checked; setEdit({ ...edit, skills }) }} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={()=>setEdit(null)} className="rounded-lg bg-gray-100 px-3 py-1">取消</button>
              <button onClick={async()=>{ await technicianRepo.upsert(edit); setEdit(null); load() }} className="rounded-lg bg-brand-500 px-3 py-1 text-white">儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


