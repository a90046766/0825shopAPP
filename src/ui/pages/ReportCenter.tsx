import { useEffect, useState } from 'react'
import { reportsRepo } from '../../adapters/local/reports'
import { confirmTwice } from '../kit'
import { authRepo } from '../../adapters/local/auth'
import { loadAdapters } from '../../adapters'

export default function ReportCenterPage(){
  const [rows, setRows] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<any>({ category:'other', level:'normal', target:'all', body:'', orderId:'', attachments:[] as Array<{name:string;dataUrl:string}> })
  const [active, setActive] = useState<any|null>(null)
  const [msg, setMsg] = useState('')
  const [people, setPeople] = useState<any[]>([])
  const [selectedNames, setSelectedNames] = useState<Record<string, boolean>>({})
  const [filters, setFilters] = useState<{ category: string; level: string; status: string }>({ category:'', level:'', status:'' })
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const me = authRepo.getCurrentUser()

  useEffect(()=>{ (async()=>{ try{ const a: any = await loadAdapters(); const techRepo = a?.technicianRepo; const staffRepo = a?.staffRepo; const [techs, staffs] = await Promise.all([techRepo?.list?.()||[], staffRepo?.list?.()||[]]); const list = [...(techs||[]), ...(staffs||[])].map((p:any)=>({ id:p.id, name:p.name, email:p.email })) ; setPeople(list) }catch{} })() },[])
  const load = async()=> setRows(await reportsRepo.list())
  useEffect(()=>{ load() },[])
  const levelColor = (lvl:string) => lvl==='normal' ? 'bg-blue-100 text-blue-700' : (lvl==='urgent' ? 'bg-pink-100 text-pink-700' : 'bg-red-100 text-red-700')

  const visibleRows = rows.filter(t => {
    return (!filters.category || t.category===filters.category) && (!filters.level || t.level===filters.level) && (!filters.status || t.status===filters.status)
  })

  const toggleAll = (v:boolean) => {
    const next: Record<string, boolean> = {}
    for (const t of visibleRows) next[t.id] = v
    setChecked(next)
  }

  const onUpload = async (files: FileList | null, target: 'new'|'active') => {
    if (!files || files.length===0) return
    const arr: Array<{name:string; dataUrl:string}> = []
    for (const f of Array.from(files)) {
      const b = await f.arrayBuffer()
      const dataUrl = `data:${f.type};base64,${btoa(String.fromCharCode(...new Uint8Array(b)))}`
      arr.push({ name: f.name, dataUrl })
    }
    if (target==='new') setForm({ ...form, attachments: [...(form.attachments||[]), ...arr] })
    else if (active) { setActive({ ...active, attachments: [ ...(active.attachments||[]), ...arr ] }) }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">回報中心</div>
        <div className="flex items-center gap-2 text-sm">
          <select className="rounded border px-2 py-1" value={filters.category} onChange={e=>setFilters({...filters, category:e.target.value})}>
            <option value="">全部分類</option>
            <option value="complaint">客訴</option>
            <option value="announce">布達</option>
            <option value="reminder">提醒</option>
            <option value="other">其他</option>
          </select>
          <select className="rounded border px-2 py-1" value={filters.level} onChange={e=>setFilters({...filters, level:e.target.value})}>
            <option value="">全部等級</option>
            <option value="normal">普通</option>
            <option value="urgent">急件</option>
            <option value="critical">緊急</option>
          </select>
          <select className="rounded border px-2 py-1" value={filters.status} onChange={e=>setFilters({...filters, status:e.target.value})}>
            <option value="">全部狀態</option>
            <option value="open">未結案</option>
            <option value="closed">已結案</option>
          </select>
          <button onClick={()=>setOpen(true)} className="rounded-lg bg-brand-500 px-3 py-1 text-white">新增回報</button>
        </div>
      </div>

      {/* 批次操作 */}
      <div className="flex items-center justify-between rounded bg-white p-2 text-sm shadow-card">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1"><input type="checkbox" onChange={e=>toggleAll(e.target.checked)} />全選</label>
          <button onClick={async()=>{ const ids = Object.keys(checked).filter(id=>checked[id]); if(ids.length===0) return; await reportsRepo.bulkMarkRead(ids, me?.email||''); load() }} className="rounded bg-gray-100 px-2 py-1">標記已讀</button>
          <button onClick={async()=>{ const ids = Object.keys(checked).filter(id=>checked[id]); if(ids.length===0) return; if(!(await confirmTwice('批次結案選取的回報？'))) return; await reportsRepo.bulkClose(ids); load() }} className="rounded bg-rose-100 px-2 py-1 text-rose-700">批次結案</button>
        </div>
        <div className="text-xs text-gray-500">已選 {Object.values(checked).filter(Boolean).length} 筆</div>
      </div>

      {visibleRows.map(t=> (
        <div key={t.id} className="rounded-xl border bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={!!checked[t.id]} onChange={e=>setChecked(s=>({ ...s, [t.id]: e.target.checked }))} />
              <div>
                <div className="font-semibold">{t.body?.slice(0,20) || '（無內容）'}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className={`rounded px-2 py-0.5 ${levelColor(t.level)}`}>{t.level}</span>
                  <span>{t.category}</span>
                  <span>{t.status}</span>
                  {t.orderId && <a className="text-brand-600 underline" href={`#/orders/${t.orderId}`}>訂單 {t.orderId}</a>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={async()=>{ await reportsRepo.markRead(t.id, me?.email||''); load() }} className="rounded-lg bg-gray-100 px-3 py-1 text-gray-700">已讀</button>
              <button onClick={()=>setActive(t)} className="rounded-lg bg-gray-900 px-3 py-1 text-white">查看</button>
              {t.status==='open' && <button onClick={async()=>{ await reportsRepo.close(t.id); load() }} className="rounded-lg bg-rose-500 px-3 py-1 text-white">結案</button>}
              <button onClick={async()=>{ if(!(await confirmTwice('刪除此回報？','刪除後無法復原，仍要刪除？'))) return; await reportsRepo.removeThread(t.id); load() }} className="rounded-lg bg-gray-100 px-3 py-1 text-gray-700">刪除</button>
            </div>
          </div>
        </div>
      ))}
      {visibleRows.length===0 && <div className="text-gray-500">目前沒有回報紀錄</div>}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-card">
            <div className="mb-2 text-lg font-semibold">新增回報</div>
            <div className="space-y-2 text-sm">
              <textarea className="w-full rounded border px-2 py-1" placeholder="內容" value={form.body} onChange={e=>setForm({...form,body:e.target.value})} rows={4} />
              <input className="w-full rounded border px-2 py-1" placeholder="關聯訂單ID（可選）" value={form.orderId} onChange={e=>setForm({...form, orderId: e.target.value})} />
              <input type="file" multiple onChange={e=>onUpload(e.target.files,'new')} />
              <div className="text-xs text-gray-500">附件：{(form.attachments||[]).map((a:any)=>a.name).join(', ')||'—'}</div>
              <select className="w-full rounded border px-2 py-1" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                <option value="complaint">客訴</option>
                <option value="announce">布達</option>
                <option value="reminder">提醒</option>
                <option value="other">其他</option>
              </select>
              <select className="w-full rounded border px-2 py-1" value={form.level} onChange={e=>setForm({...form,level:e.target.value})}>
                <option value="normal">普通</option>
                <option value="urgent">急件</option>
                <option value="critical">緊急</option>
              </select>
              <div>
                <div className="mb-1 text-xs text-gray-600">名單（以姓名勾選）</div>
                <div className="max-h-40 space-y-1 overflow-auto rounded border p-2">
                  {people.map(p=> (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!selectedNames[p.id]} onChange={(e)=> setSelectedNames(s=>({ ...s, [p.id]: e.target.checked }))} />
                      <span>{p.name}</span>
                      <span className="text-xs text-gray-400">{p.email}</span>
                    </label>
                  ))}
                  {people.length===0 && <div className="text-xs text-gray-400">尚無名單</div>}
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={()=>setOpen(false)} className="rounded-lg bg-gray-100 px-3 py-1">取消</button>
              <button onClick={async()=>{
                const emails = people.filter(p=>selectedNames[p.id]).map(p=>p.email).filter(Boolean)
                const payload:any = { body: form.body, category: form.category, level: form.level, target: emails.length>0? 'subset':'all', targetEmails: emails, orderId: form.orderId, attachments: form.attachments }
                await reportsRepo.create(payload)
                setOpen(false); setForm({ category:'other', level:'normal', target:'all', body:'', orderId:'', attachments:[] } as any); setSelectedNames({}); load()
              }} className="rounded-lg bg-brand-500 px-3 py-1 text-white">建立</button>
          </div>
        </div>
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-card">
            <div className="mb-2 text-lg font-semibold">回報內容</div>
            <div className="space-y-2 text-sm">
              <div className="text-xs text-gray-500">等級：<span className={`ml-1 rounded px-2 py-0.5 ${levelColor(active.level)}`}>{active.level}</span></div>
              <textarea className="w-full rounded border px-2 py-1" value={active.body||''} onChange={e=>setActive({...active, body:e.target.value})} rows={6} />
              <input className="w-full rounded border px-2 py-1" placeholder="關聯訂單ID（可選）" value={active.orderId||''} onChange={e=>setActive({...active, orderId: e.target.value})} />
              <input type="file" multiple onChange={e=>onUpload(e.target.files,'active')} />
              <div className="text-xs text-gray-500">附件：{(active.attachments||[]).map((a:any)=>a.name).join(', ')||'—'}</div>
              <div className="text-right">
                <button onClick={async()=>{ await reportsRepo.update(active.id, { body: active.body, orderId: active.orderId, attachments: active.attachments }) }} className="rounded bg-gray-900 px-3 py-1 text-white">儲存內容</button>
              </div>
            </div>
            <div className="mt-3 text-right"><button onClick={()=>setActive(null)} className="rounded bg-gray-100 px-3 py-1">關閉</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
