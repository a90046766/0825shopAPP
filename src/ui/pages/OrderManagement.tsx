import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'
import { getActivePercent } from '../../utils/promotions'
import { Link } from 'react-router-dom'
import { can } from '../../utils/permissions'
import { loadAdapters } from '../../adapters'
import { 
  TAIWAN_CITIES, 
  extractLocationFromAddress, 
  formatAddressDisplay, 
  generateGoogleMapsLink,
  calculateOrderQuantity,
  formatTechniciansDisplay,
  calculateFinalAmount,
  validateServiceArea
} from '../../utils/location'

export default function OrderManagementPage() {
  const [rows, setRows] = useState<any[]>([])
  const [allRows, setAllRows] = useState<any[]>([])
  const [total, setTotal] = useState<number>(0)
  const [page, setPage] = useState<number>(0)
  const PAGE_SIZE = 200
  const [repos, setRepos] = useState<any>(null)
  const getCurrentUser = () => { try{ const s=localStorage.getItem('supabase-auth-user'); if(s) return JSON.parse(s) }catch{}; try{ const l=localStorage.getItem('local-auth-user'); if(l) return JSON.parse(l) }catch{}; return null }
  const user = getCurrentUser()
  const [q, setQ] = useState('')
  const [yy, setYy] = useState<string>(String(new Date().getFullYear()))
  const [mm, setMm] = useState(String(new Date().getMonth()+1).padStart(2,'0'))
  const [statusTab, setStatusTab] = useState<'pending'|'confirmed'|'completed'|'unservice'|'closed'|'canceled'|'all'>('confirmed')
  const [pf, setPf] = useState<Record<string, boolean>>({})
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<any>({ 
    customerName:'', 
    customerPhone:'', 
    customerAddress:'', 
    customerCity:'', 
    customerDistrict:'', 
    customerDetailAddress:'', 
    preferredDate:'', 
    preferredTimeStart:'09:00', 
    preferredTimeEnd:'12:00', 
    platform:'日', 
    referrerCode:'', 
    serviceItems:[{name:'服務',quantity:1,unitPrice:1000}], 
    assignedTechnicians:[], 
    photos:[], 
    signatures:{} 
  })
  const [draftId, setDraftId] = useState<string>('')
  const [formDirty, setFormDirty] = useState<boolean>(false)
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false)
  const [lastSavedAt, setLastSavedAt] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [draftCreating, setDraftCreating] = useState<boolean>(false)
  const [activePercent, setActivePercent] = useState<number>(0)
  const [products, setProducts] = useState<any[]>([])
  const [quickAddress, setQuickAddress] = useState<string>('')
  const [savedAddresses, setSavedAddresses] = useState<Array<{ id?: string; label?: string; address: string }>>([])
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({})
  // 技師視圖：若客服已從排班指派，但尚未寫入 orders.assignedTechnicians，也能顯示
  const [ownBySchedule, setOwnBySchedule] = useState<Record<string, boolean>>({})
  const load = async () => { 
    if (!repos) return
    try {
      if (repos.orderRepo.listByFilter) {
        const platforms = Object.keys(pf).filter(k=>pf[k])
        const summaryPromise = repos.orderRepo.listSummaryByFilter
          ? repos.orderRepo.listSummaryByFilter({ year: yy, month: mm, platforms, limit: 2000, offset: 0 } as any)
          : repos.orderRepo.listByFilter({ year: yy, month: mm, platforms, limit: 2000, offset: 0 } as any)
        const [resList, summaryResult] = await Promise.all([
          repos.orderRepo.listByFilter({ year: yy, month: mm, status: statusTab as any, q, platforms, limit: PAGE_SIZE, offset: page*PAGE_SIZE }),
          summaryPromise
        ])
        setRows(resList.rows||[])
        setTotal(resList.total|| (resList.rows||[]).length)
        if (Array.isArray(summaryResult)) {
          setAllRows(summaryResult)
        } else {
          setAllRows(summaryResult?.rows||[])
        }
      } else {
        const res = { rows: await repos.orderRepo.list(), total: 0 }
        setRows(res.rows||[])
        setTotal(res.total|| (res.rows||[]).length)
        setAllRows(res.rows||[])
      }
    } catch { }
  }
  useEffect(()=>{ (async()=>{ const a = await loadAdapters(); setRepos(a); })() },[])
  useEffect(()=>{ if (repos) load() },[repos])
  useEffect(()=>{ if (repos) load() },[yy, mm, statusTab, q, JSON.stringify(pf), page])
  useEffect(()=>{ getActivePercent().then(setActivePercent) },[creating])
  useEffect(()=>{ (async()=>{ try { const a = repos || (await loadAdapters()); setProducts(await a.productRepo.list()) } catch {} })() },[creating, repos])

  // 技師視圖：依目前年份/月份（或當月）抓取班表，將屬於自己的 orderId 做為後援過濾
  useEffect(()=>{
    if (!repos) return
    if (user?.role !== 'technician') { setOwnBySchedule({}); return }
    const now = new Date()
    const year = yy || String(now.getFullYear())
    const month = mm || String(now.getMonth()+1).padStart(2,'0')
    const start = `${year}-${month}-01`
    const lastDay = new Date(Number(year), Number(month), 0).getDate()
    const end = `${year}-${month}-${String(lastDay).padStart(2,'0')}`
    ;(async()=>{
      try{
        const ws = await repos.scheduleRepo.listWork({ start, end })
        const emailLc = String(user?.email||'').toLowerCase()
        const mine = (ws||[]).filter((w:any)=> String(w.technicianEmail||'').toLowerCase()===emailLc)
        const map: Record<string, boolean> = {}
        for (const w of mine) { if (w.orderId) map[w.orderId] = true }
        setOwnBySchedule(map)
      } catch {
        setOwnBySchedule({})
      }
    })()
  }, [repos, user?.role, user?.email, yy, mm])

  // 依手機載入常用地址（若已存在客戶）
  useEffect(()=>{
    if (!repos) return
    const phone = (form.customerPhone||'').trim()
    if (!phone) { setSavedAddresses([]); return }
    ;(async()=>{
      try {
        const c = await repos.customerRepo.findByPhone(phone)
        const addrs = (c?.addresses || []) as Array<{ id?: string; label?: string; address: string }>
        setSavedAddresses(addrs)
      } catch { setSavedAddresses([]) }
    })()
  }, [repos, form.customerPhone])

  // 當開啟新建視窗，且已填姓名與手機時，自動建立草稿
  useEffect(()=>{
    if (!creating) return
    if (!repos) return
    if (draftId) return
    if (!form.customerName || !form.customerPhone) return
    if (draftCreating) return
    let cancelled = false
    setDraftCreating(true)
    ;(async()=>{
      try {
        const draftPayload: any = {
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          customerEmail: form.customerEmail || '',
          customerAddress: form.customerAddress || '',
          preferredDate: form.preferredDate || undefined,
          preferredTimeStart: form.preferredTimeStart,
          preferredTimeEnd: form.preferredTimeEnd,
          platform: form.platform || '日',
          referrerCode: form.referrerCode || '',
          serviceItems: form.serviceItems || [],
          assignedTechnicians: [],
          signatures: {},
          status: 'draft',
          createdBy: (user?.name || user?.email || '系統')
        }
        const o = await repos.orderRepo.create(draftPayload)
        if (!cancelled && o?.id) {
          setDraftId(o.id as string)
          setFormDirty(false)
          setLastSavedAt(new Date().toISOString())
        }
      } catch {} finally { setDraftCreating(false) }
    })()
    return ()=>{ cancelled = true }
  }, [creating, repos, draftId, form.customerName, form.customerPhone, draftCreating])

  // 每 5 秒自動儲存草稿（僅在有變更時）
  useEffect(()=>{
    if (!creating) return
    if (!repos) return
    if (!draftId) return
    if (submitting || draftCreating) return
    const h = setInterval(async()=>{
      if (!formDirty) return
      setIsAutoSaving(true)
      try {
        const clean: any = { ...form }
        if (!clean.preferredDate) delete clean.preferredDate
        await repos.orderRepo.update(draftId, { ...clean, status: 'draft' } as any)
        setFormDirty(false)
        setLastSavedAt(new Date().toISOString())
      } catch {}
      setIsAutoSaving(false)
    }, 5000)
    return ()=>clearInterval(h)
  }, [creating, repos, draftId, formDirty, form, submitting, draftCreating])
  const isTech = user?.role === 'technician'
  const isSupportOrAdmin = user?.role === 'admin' || user?.role === 'support'
  const isOwner = (o:any) => {
    if (!isTech) return true
    const names: string[] = Array.isArray(o.assignedTechnicians)? o.assignedTechnicians : []
    const myName = user?.name || ''
    const sigTech = (o as any).signatureTechnician || ''
    const byAssigned = names.includes(myName)
    const bySignature = sigTech === myName
    const bySchedule = !!ownBySchedule[o.id]
    return byAssigned || bySignature || bySchedule
  }

  const hasEssential = (o:any) => Boolean((o.customerName||'').trim() && (o.customerPhone||'').trim())
  // 基礎集合（列表用）：依搜尋/平台/年月/權限
  const baseRows = rows.filter(o => {
    const hit = !q || o.id.includes(q) || (o.customerName||'').includes(q)
    const pfKeys = Object.keys(pf).filter(k=>pf[k])
    const byPf = pfKeys.length===0 || pfKeys.includes(o.platform)
    // 待服務（confirmed/in_progress）以服務日期 preferredDate 進行月份篩選
    const dateKey = (['confirmed','in_progress'].includes(o.status)
      ? (o.preferredDate || '')
      : (o.workCompletedAt || o.createdAt || '')
    ).slice(0,7)
    const y = dateKey.slice(0,4)
    const m = dateKey.slice(5,7)
    const byDate = (!yy || y===yy) && (!mm || m===mm)
    return hit && byPf && byDate && isOwner(o)
  })
  // 基礎集合（計數用）：不受搜尋 q 影響，僅依平台/年月/權限
  const baseAll = allRows.filter(o => {
    const pfKeys = Object.keys(pf).filter(k=>pf[k])
    const byPf = pfKeys.length===0 || pfKeys.includes(o.platform)
    const dateKey = (['confirmed','in_progress'].includes(o.status)
      ? (o.preferredDate || '')
      : (o.workCompletedAt || o.createdAt || '')
    ).slice(0,7)
    const y = dateKey.slice(0,4)
    const m = dateKey.slice(5,7)
    const byDate = (!yy || y===yy) && (!mm || m===mm)
    return byPf && byDate && isOwner(o)
  })
  // 依頁籤狀態再過濾（待確認需涵蓋 draft/pending，待服務含 confirmed/in_progress）
  const filtered = baseRows.filter(o => {
    if (statusTab==='all') return true
    if (statusTab==='pending') return (o.status==='draft' || o.status==='pending')
    if (statusTab==='confirmed') return ['confirmed','in_progress'].includes(o.status)
    if (statusTab==='completed') return o.status==='completed'
    if (statusTab==='unservice') return (o as any).status==='unservice'
    if (statusTab==='closed') return o.status==='closed'
    if (statusTab==='canceled') return o.status==='canceled'
    if (statusTab==='invoice') return (o.status==='completed' || o.status==='closed') && !o.invoiceCode
    return true
  })

  // 卡牌統計：以全量集合為準（年切齊、權限過濾），不需點擊即可顯示
  const counts = {
    all: baseAll.length,
    pending: baseAll.filter(o=> (o.status==='draft' || o.status==='pending')).length,
    confirmed: baseAll.filter(o=> ['confirmed','in_progress'].includes(o.status)).length,
    completed: baseAll.filter(o=> o.status==='completed').length,
    unservice: baseAll.filter(o=> (o as any).status==='unservice').length,
    closed: baseAll.filter(o=> o.status==='closed').length,
    canceled: baseAll.filter(o=> o.status==='canceled').length,
    invoice: baseAll.filter(o=> (o.status==='completed' || o.status==='closed') && !o.invoiceCode).length,
  } as any
  // 技師「新派」徽章：以目前待服務（confirmed/in_progress）中屬於自己的訂單，與本機已讀集合比較
  const myEmailLc = (user?.email||'').toLowerCase()
  const seenKey = `seen-assigned:${myEmailLc}`
  const getSeenIds = (): Set<string> => {
    try { const raw = localStorage.getItem(seenKey); return new Set(raw ? JSON.parse(raw) : []) } catch { return new Set() }
  }
  const markSeen = (ids: string[]) => { try { localStorage.setItem(seenKey, JSON.stringify(Array.from(new Set(ids)))) } catch {} }
  const ownConfirmedIds = (rows||[])
    .filter(isOwner)
    .filter((o:any)=> ['confirmed','in_progress'].includes(o.status))
    .map((o:any)=> String(o.id))
  const newAssignedCount = (()=>{ const seen = getSeenIds(); return ownConfirmedIds.filter(id=> !seen.has(id)).length })()
  const yearOptions = Array.from(new Set([ String(new Date().getFullYear()), ...((rows||[]).map((o:any)=> (o.workCompletedAt||o.createdAt||'').slice(0,4)).filter(Boolean)) ])).sort()
  const listed = filtered
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-lg font-semibold">訂單管理</div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {(
            isTech
              ? ([['confirmed','待服務'],['completed','已完成'],['unservice','無法服務'],['closed','已結案'],['all','全部']] as any[])
              : ([['pending','待確認'],['confirmed','待服務'],['completed','已完成'],['unservice','無法服務'],['closed','已結案'],['all','全部']] as any[])
          ).map(([key,label])=> (
            <button
              key={key}
              onClick={()=>setStatusTab(key)}
              className={`rounded-2xl px-4 py-3 font-medium shadow-card transition ${statusTab===key? 'ring-2 ring-gray-700' : ''} ${key==='pending' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : key==='confirmed' ? 'bg-blue-50 border border-blue-200 text-blue-800' : key==='completed' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : key==='unservice' ? 'bg-rose-50 border border-rose-200 text-rose-800' : key==='closed' ? 'bg-gray-50 border border-gray-200 text-gray-800' : 'bg-purple-50 border border-purple-200 text-purple-800'}`}
            >
              <span className="inline-flex items-baseline gap-2">
                <span>{label}</span>
                <span className="text-base font-bold">{counts[key]}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input placeholder="搜尋ID/客戶" className="rounded border px-2 py-1 text-sm" value={q} onChange={e=>setQ(e.target.value)} />
          <select className="rounded border px-2 py-1 text-sm" value={yy} onChange={e=>setYy(e.target.value)}>
            <option value="">全部年份</option>
            {yearOptions.map(y=> <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="rounded border px-2 py-1 text-sm" value={mm} onChange={e=>setMm(e.target.value)}>
            <option value="">全部月份</option>
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m=> <option key={m} value={m}>{m}</option>)}
          </select>
          <input type="month" className="rounded border px-2 py-1 text-sm" value={`${yy}-${mm}`} onChange={e=>{
            const ym = e.target.value
            if (!ym){ setYy(''); setMm(''); setPage(0); return }
            const [y,m] = ym.split('-')
            setYy(y||'')
            setMm((m||'').padStart(2,'0'))
            setPage(0)
          }} />
          {can(user,'orders.create') && <button onClick={async()=>{ 
            try {
              const a = repos || (await loadAdapters())
              // 先建立最小草稿（draft），取得正式單號/ID
          const payload: any = {
                customerName:'', customerPhone:'', customerAddress:'', preferredTimeStart:'09:00', preferredTimeEnd:'12:00', platform:'日', serviceItems:[{name:'服務',quantity:1,unitPrice:1000}], assignedTechnicians:[], signatures:{}, status:'draft'
              }
          payload.createdBy = (user?.name || user?.email || '系統')
              const o = await a.orderRepo.create(payload)
              // 導向正式訂單頁編輯
              location.assign(`/orders/${o.id}`)
            } catch (e:any) {
              alert('建立草稿失敗：' + (e?.message||'未知錯誤'))
            }
          }} className="rounded-lg bg-brand-500 px-3 py-1 text-white">新建訂單</button>}
          <button onClick={async()=>{
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.csv'
            input.onchange = async () => {
              const file = input.files?.[0]
              if (!file) return
              const text = await file.text()
              const lines = text.split(/\r?\n/).filter(Boolean)
              const headers = lines.shift()?.split(',')||[]
              const a = await import('../../adapters')
              const { orderRepo } = await a.loadAdapters()
              for (const line of lines) {
                const cols = line.split(',')
                const row: any = {}
                headers.forEach((h, i) => row[h.trim()] = cols[i])
                try {
                  await orderRepo.create({
                    id: '',
                    memberId: undefined,
                    customerName: row.customerName,
                    customerPhone: row.customerPhone,
                    customerAddress: row.customerAddress,
                    preferredDate: row.preferredDate,
                    preferredTimeStart: row.preferredTimeStart||'09:00',
                    preferredTimeEnd: row.preferredTimeEnd||'18:00',
                    referrerCode: row.referrerCode||'',
                    paymentMethod: 'cash',
                    paymentStatus: 'unpaid',
                    pointsUsed: 0,
                    pointsDeductAmount: 0,
                    serviceItems: [],
                    assignedTechnicians: [],
                    signatures: {},
                    status: 'confirmed',
                    platform: '日',
                    photos: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  } as any)
                } catch {}
              }
              alert('訂單匯入完成')
            }
            input.click()
          }} className="rounded-lg bg-emerald-600 px-3 py-1 text-white">匯入</button>
          {/* 多選刪除（僅管理員顯示） */}
          {can(user,'orders.delete') && (
            <div className="ml-2 flex items-center gap-2">
              <span className="text-gray-600">已選 {Object.keys(selectedMap).filter(id=>selectedMap[id]).length} 筆</span>
              <button
                onClick={()=>{
                  const map: Record<string, boolean> = {}
                  listed.forEach(o=>{ map[o.id] = true })
                  setSelectedMap(map)
                }}
                className="rounded bg-gray-100 px-2 py-1"
              >全選本列表</button>
              <button
                onClick={()=> setSelectedMap({})}
                className="rounded bg-gray-100 px-2 py-1"
              >清除選取</button>
              <button
                onClick={async()=>{
                  const ids = Object.keys(selectedMap).filter(id=> selectedMap[id])
                  if (ids.length===0) { alert('尚未選取任何訂單'); return }
                  if (!confirm(`將刪除已選取 ${ids.length} 筆訂單，且無法復原，是否繼續？`)) return
                  const reason = prompt('請輸入刪除原因', 'admin bulk delete') || 'admin bulk delete'
                  let ok = 0
                  for (const id of ids) {
                    try { await repos.orderRepo.delete(id, reason); ok++ } catch {}
                  }
                  setRows(prev => prev.filter(x => !ids.includes(x.id)))
                  setSelectedMap({})
                  alert(`已刪除 ${ok}/${ids.length} 筆`)
                }}
                className="rounded bg-rose-600 px-2 py-1 text-white"
              >刪除選取</button>
              <button
                onClick={async()=>{
                  try {
                    const y = new Date().getFullYear()
                    const defaultDate = `${y}-09-30`
                    const date = prompt('輸入要刪除的日期（YYYY-MM-DD）', defaultDate) || ''
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { alert('日期格式錯誤'); return }
                    const targets = (rows||[]).filter((o:any)=> String(o.createdAt||o.created_at||'').slice(0,10)===date)
                    if (targets.length===0) { alert('該日期無訂單'); return }
                    if (!confirm(`將刪除 ${date} 的 ${targets.length} 筆訂單，且無法復原，是否繼續？`)) return
                    let ok = 0
                    for (const o of targets) { try { await repos.orderRepo.delete(o.id, `admin date purge ${date}`); ok++ } catch {} }
                    setRows(prev => prev.filter((x:any)=> String(x.createdAt||x.created_at||'').slice(0,10)!==date))
                    alert(`已刪除 ${ok}/${targets.length} 筆（${date}）`)
                  } catch (e:any) { alert(e?.message||'刪除失敗') }
                }}
                className="rounded bg-rose-100 px-2 py-1 text-rose-700"
              >刪除指定日期</button>
            </div>
          )}
        </div>
      </div>
      {total>PAGE_SIZE && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <span>共 {total} 筆</span>
          <button disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))} className={`rounded px-2 py-1 ${page===0?'bg-gray-100 text-gray-400':'bg-gray-100 hover:bg-gray-200'}`}>上一頁</button>
          <span>{page+1} / {Math.max(1, Math.ceil(total/PAGE_SIZE))}</span>
          <button disabled={(page+1)>=Math.ceil(total/PAGE_SIZE)} onClick={()=>setPage(p=>p+1)} className={`rounded px-2 py-1 ${((page+1)>=Math.ceil(total/PAGE_SIZE))?'bg-gray-100 text-gray-400':'bg-gray-100 hover:bg-gray-200'}`}>下一頁</button>
        </div>
      )}
      <div className="rounded-2xl bg-white p-2 shadow-card">
        {listed.map(o => (
          <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center justify-between border-b p-3 text-sm">
            <div>
              <div className="font-semibold">{o.id} <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${o.platform==='日'?'bg-blue-100 text-blue-700':o.platform==='同'?'bg-purple-100 text-purple-700':o.platform==='黃'?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700'}`}>{o.platform}</span></div>
              <div className="text-xs text-gray-500">
                {o.customerName}｜{o.preferredDate} {o.preferredTimeStart}~{o.preferredTimeEnd}｜推薦碼 {o.referrerCode||'-'} 
                {o.referrerCode && <button onClick={(e)=>{e.preventDefault(); navigator.clipboard.writeText(o.referrerCode)}} className="ml-1 rounded bg-gray-100 px-2 py-0.5">複製</button>}
                <br />
                狀態：
                <span className={`ml-1 rounded px-1 py-0.5 text-[10px] ${
                  o.status==='draft' ? 'bg-yellow-100 text-yellow-700' :
                  o.status==='confirmed' ? 'bg-blue-100 text-blue-700' :
                  o.status==='in_progress' ? 'bg-purple-100 text-purple-700' :
                  o.status==='completed' ? 'bg-green-100 text-green-700' :
                  (o as any).status==='unservice' ? 'bg-rose-100 text-rose-700' :
                  o.status==='closed' ? 'bg-gray-100 text-gray-700' :
                  o.status==='canceled' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {o.status==='draft' ? '待確認' :
                   o.status==='confirmed' ? '已確認' :
                   o.status==='in_progress' ? '服務中' :
                   o.status==='completed' ? '已完工' :
                   (o as any).status==='unservice' ? '無法服務' :
                   o.status==='closed' ? '已結案' :
                   o.status==='canceled' ? '已取消' : (o as any).status}
                </span>
              </div>
              {Array.isArray(o.assignedTechnicians) && o.assignedTechnicians.length>0 && (
                <div className="mt-1 text-[11px] text-gray-500">技師：{o.assignedTechnicians.join('、')}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {can(user,'orders.delete') && (
                <input
                  type="checkbox"
                  checked={!!selectedMap[o.id]}
                  onChange={(e)=>{ e.preventDefault(); e.stopPropagation(); const checked = e.target.checked; setSelectedMap(s=> ({ ...s, [o.id]: checked })) }}
                  onClick={(e)=>{ e.preventDefault(); e.stopPropagation() }}
                  title="選取刪除"
                />
              )}
              {can(user,'orders.delete') && (
                <button
                  onClick={async (e)=>{
                    e.preventDefault(); e.stopPropagation()
                    if (!confirm(`確定刪除訂單 ${o.id}？此動作無法復原`)) return
                    const reason = prompt('請輸入刪除原因', 'admin manual delete') || 'admin manual delete'
                    try {
                      await repos.orderRepo.delete(o.id, reason)
                      setRows(prev => prev.filter(x => x.id !== o.id))
                    } catch {
                      alert('刪除失敗，請重試')
                    }
                  }}
                  className="rounded bg-rose-600 px-2 py-1 text-white"
                >刪除</button>
              )}
              <div className="text-gray-600">›</div>
            </div>
          </Link>
        ))}
        {filtered.length===0 && <div className="p-4 text-center text-gray-500">沒有資料</div>}
      </div>
      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-card">
            <div className="mb-2 text-lg font-semibold">新建訂單</div>
            <div className="space-y-2 text-sm">
              <input className="w-full rounded border px-2 py-1" placeholder="客戶姓名" value={form.customerName} onChange={e=>{ setForm({...form,customerName:e.target.value}); setFormDirty(true) }} />
              <input className="w-full rounded border px-2 py-1" placeholder="手機" value={form.customerPhone} onChange={e=>{ setForm({...form,customerPhone:e.target.value}); setFormDirty(true) }} />
              
              {/* 地址管理 */}
              <div className="grid grid-cols-3 gap-2">
                {/* 快速貼上完整地址 → 自動解析 */}
                <input 
                  className="col-span-3 rounded border px-2 py-1" 
                  placeholder="快速貼上完整地址（自動解析縣市/區域/詳細）" 
                  value={quickAddress}
                  onChange={e=>setQuickAddress(e.target.value)}
                  onBlur={()=>{
                    const raw = quickAddress.trim()
                    if (!raw) return
                    const loc = extractLocationFromAddress(raw)
                    const city = loc.city || form.customerCity
                    const district = loc.district || form.customerDistrict
                    const detail = loc.address || form.customerDetailAddress || raw
                    setForm({
                      ...form,
                      customerCity: city,
                      customerDistrict: district,
                      customerDetailAddress: detail,
                      customerAddress: formatAddressDisplay(city, district, detail)
                    })
                    setFormDirty(true)
                  }}
                />

                {/* 常用地址（依手機） */}
                {savedAddresses.length>0 && (
                  <div className="col-span-3 grid grid-cols-3 gap-2">
                    <select 
                      className="col-span-2 rounded border px-2 py-1"
                      onChange={e=>{
                        const addr = e.target.value
                        if (!addr) return
                        const loc = extractLocationFromAddress(addr)
                        const city = loc.city || ''
                        const district = loc.district || ''
                        const detail = loc.address || addr
                        setForm({
                          ...form,
                          customerCity: city,
                          customerDistrict: district,
                          customerDetailAddress: detail,
                          customerAddress: formatAddressDisplay(city, district, detail)
                        })
                        setFormDirty(true)
                      }}
                    >
                      <option value="">選擇常用地址</option>
                      {savedAddresses.map((a, i)=> (
                        <option key={(a.id||'')+i} value={a.address}>{a.label ? `${a.label}：${a.address}` : a.address}</option>
                      ))}
                    </select>
                    <button 
                      className="rounded bg-gray-100 px-2 py-1 text-xs"
                      onClick={()=>{
                        if (!form.customerAddress) return
                        alert('已套用常用地址')
                      }}
                    >套用</button>
                  </div>
                )}

                <select 
                  className="rounded border px-2 py-1" 
                  value={form.customerCity} 
                  onChange={e=>{
                    const city = e.target.value
                    setForm({
                      ...form,
                      customerCity: city,
                      customerDistrict: '',
                      customerAddress: formatAddressDisplay(city, form.customerDistrict, form.customerDetailAddress)
                    })
                    setFormDirty(true)
                  }}
                >
                  <option value="">選擇縣市</option>
                  {Object.keys(TAIWAN_CITIES).map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                
                <select 
                  className="rounded border px-2 py-1" 
                  value={form.customerDistrict} 
                  onChange={e=>{
                    const district = e.target.value
                    setForm({
                      ...form,
                      customerDistrict: district,
                      customerAddress: formatAddressDisplay(form.customerCity, district, form.customerDetailAddress)
                    })
                    setFormDirty(true)
                  }}
                  disabled={!form.customerCity}
                >
                  <option value="">選擇區域</option>
                  {form.customerCity && TAIWAN_CITIES[form.customerCity as keyof typeof TAIWAN_CITIES]?.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
                
                <input 
                  className="rounded border px-2 py-1" 
                  placeholder="詳細地址" 
                  value={form.customerDetailAddress} 
                  onChange={e=>{
                    const detailAddress = e.target.value
                    setForm({
                      ...form,
                      customerDetailAddress: detailAddress,
                      customerAddress: formatAddressDisplay(form.customerCity, form.customerDistrict, detailAddress)
                    })
                    setFormDirty(true)
                  }} 
                />
              </div>
              
              {/* 地圖連結和地址驗證 */}
              {form.customerAddress && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">地址：{form.customerAddress}</span>
                    <a 
                      href={generateGoogleMapsLink(form.customerCity, form.customerDistrict, form.customerDetailAddress)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      📍 地圖
                    </a>
                  </div>
                  
                  {/* 地址驗證提示 */}
                  {form.customerCity && form.customerDistrict && (
                    (() => {
                      const validation = validateServiceArea(form.customerCity, form.customerDistrict)
                      if (!validation.isValid) {
                        return (
                          <div className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-200">
                            ⚠️ {validation.message}
                          </div>
                        )
                      }
                      return null
                    })()
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <input type="date" className="w-full rounded border px-2 py-1" value={form.preferredDate} onChange={e=>{ setForm({...form,preferredDate:e.target.value}); setFormDirty(true) }} />
                <input type="time" className="w-full rounded border px-2 py-1" value={form.preferredTimeStart} onChange={e=>{ setForm({...form,preferredTimeStart:e.target.value}); setFormDirty(true) }} />
                <input type="time" className="w-full rounded border px-2 py-1" value={form.preferredTimeEnd} onChange={e=>{ setForm({...form,preferredTimeEnd:e.target.value}); setFormDirty(true) }} />
              </div>
              <input className="w-full rounded border px-2 py-1" placeholder="推薦碼（MOxxxx / SRxxx / SExxx）" value={form.referrerCode} onChange={e=>{ setForm({...form,referrerCode:e.target.value}); setFormDirty(true) }} />
              <div className="grid gap-1 text-xs text-gray-500">
                <div>活動折扣：{activePercent > 0 ? `${activePercent}%` : '—'}</div>
                <input className="w-full rounded border px-2 py-1 text-sm" placeholder="會員編號（MOxxxx）可選" value={(form as any).memberCode||''} onChange={e=>{ setForm({...form, memberCode: e.target.value}); setFormDirty(true) }} />
              </div>
              <div>
                <label className="mr-2 text-sm text-gray-600">平台</label>
                <select className="rounded border px-2 py-1 text-sm" value={form.platform||'日'} onChange={e=>{ setForm({...form, platform: e.target.value}); setFormDirty(true) }}>
                  <option value="日">日</option>
                  <option value="同">同</option>
                  <option value="黃">黃</option>
                  <option value="今">今</option>
                </select>
              </div>
              <div className="space-y-2">
                {form.serviceItems.map((it:any, idx:number) => (
                  <div key={idx} className="grid grid-cols-6 items-center gap-2">
                    <select className="col-span-2 rounded border px-2 py-1" value={it.productId||''} onChange={e=>{
                      const val=e.target.value; const arr=[...form.serviceItems]; if(!val){ arr[idx]={...arr[idx], productId:'', name: it.name}; setForm({...form, serviceItems: arr}); return }
                      const p = products.find((x:any)=>x.id===val); arr[idx]={...arr[idx], productId: val, name: p?.name || it.name, unitPrice: p?.unitPrice || it.unitPrice}; setForm({...form, serviceItems: arr}); setFormDirty(true)
                    }}>
                      <option value="">自訂</option>
                      {products.map((p:any)=>(<option key={p.id} value={p.id}>{p.name}（{p.unitPrice}）</option>))}
                    </select>
                    <input className="col-span-2 rounded border px-2 py-1" placeholder="項目" value={it.name} onChange={e=>{ const arr=[...form.serviceItems]; arr[idx]={...arr[idx], name:e.target.value}; setForm({...form, serviceItems: arr}); setFormDirty(true) }} />
                    <input type="number" className="rounded border px-2 py-1" placeholder="數量" value={it.quantity} onChange={e=>{ const arr=[...form.serviceItems]; arr[idx]={...arr[idx], quantity:Number(e.target.value)}; setForm({...form, serviceItems: arr}); setFormDirty(true) }} />
                    <div className="flex items-center gap-2">
                      <input type="number" className="w-24 rounded border px-2 py-1" placeholder="單價" value={it.unitPrice} onChange={e=>{ const arr=[...form.serviceItems]; arr[idx]={...arr[idx], unitPrice:Number(e.target.value)}; setForm({...form, serviceItems: arr}); setFormDirty(true) }} />
                      <button onClick={()=>{ const arr=[...form.serviceItems]; arr.splice(idx,1); setForm({...form, serviceItems: arr.length?arr:[{ name:'服務', quantity:1, unitPrice:0 }]}); setFormDirty(true) }} className="rounded bg-gray-100 px-2 py-1 text-xs">刪</button>
                    </div>
                  </div>
                ))}
                <button onClick={()=>{ setForm({...form, serviceItems:[...form.serviceItems, { name:'', quantity:1, unitPrice:0 }]}); setFormDirty(true) }} className="rounded bg-gray-100 px-2 py-1 text-xs">新增品項</button>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={async()=>{ try{ if(draftId && repos){ await repos.orderRepo.delete(draftId, 'cancel new order draft') } }catch{} setCreating(false); setDraftId(''); setFormDirty(false); setIsAutoSaving(false); setLastSavedAt('') }} className="rounded-lg bg-gray-100 px-3 py-1">取消</button>
              <button onClick={async()=>{
                try {
                  if(!repos) return
                  if (submitting) return
                  setSubmitting(true)
                  
                  // 地址驗證：檢查是否為非標準服務區
                  const addressValidation = validateServiceArea(form.customerCity, form.customerDistrict)
                  if (!addressValidation.isValid) {
                    alert(addressValidation.message)
                    return
                  }
                  
                  // 清洗資料：避免空日期傳到 DB
                  const clean = { ...form }
                  if (!clean.preferredDate) delete (clean as any).preferredDate
                  
                  // 自動新增客戶（如果不存在）
                  if (clean.customerPhone && clean.customerName) {
                    try {
                      const existingCustomer = await repos.customerRepo.findByPhone(clean.customerPhone)
                      
                      if (!existingCustomer) {
                        // 創建新客戶
                        const newCustomer = {
                          name: clean.customerName,
                          phone: clean.customerPhone,
                          email: clean.customerEmail || '',
                          addresses: [{
                            id: `ADDR-${Math.random().toString(36).slice(2,8)}`,
                            address: clean.customerAddress
                          }],
                          notes: '自動從訂單新增',
                          blacklisted: false
                        }
                        await repos.customerRepo.upsert(newCustomer)
                        console.log('已自動新增客戶:', clean.customerName)
                      } else {
                        // 若有新地址，補齊常用地址
                        const addr = (clean.customerAddress||'').trim()
                        if (addr) {
                          const exists = (existingCustomer.addresses||[]).some((a:any)=> a.address === addr)
                          if (!exists) {
                            const updated = { ...existingCustomer, addresses: [ ...(existingCustomer.addresses||[]), { id:`ADDR-${Math.random().toString(36).slice(2,8)}`, address: addr } ] }
                            await repos.customerRepo.upsert(updated)
                          }
                        }
                      }
                    } catch (error) {
                      console.log('自動新增客戶失敗:', error)
                      // 不阻擋訂單創建，只記錄錯誤
                    }
                  }
                  
                  // 折扣處理
                  const percent = await getActivePercent()
                  const items = clean.serviceItems.map((it:any)=> percent>0 ? ({ ...it, unitPrice: Math.round(it.unitPrice * (1 - percent/100)) }) : it)
                  // 會員綁定（可選）
                  let memberId: string|undefined = undefined
                  if ((clean as any).memberCode && String((clean as any).memberCode).toUpperCase().startsWith('MO')) {
                    try { const m = await repos.memberRepo.findByCode(String((clean as any).memberCode).toUpperCase()); if (m) memberId = m.id } catch {}
                  }
                  const createdBy = (user?.name || user?.email || '系統')
                  if (draftId) {
                    await repos.orderRepo.update(draftId, { ...clean, status:'confirmed', platform: clean.platform||'日', memberId, serviceItems: items, createdBy } as any)
                  } else {
                    await repos.orderRepo.create({ ...clean, status:'confirmed', platform: clean.platform||'日', memberId, serviceItems: items, createdBy } as any)
                  }
                  setCreating(false)
                  setDraftId('')
                  setFormDirty(false)
                  setIsAutoSaving(false)
                  setLastSavedAt('')
                  setForm({ 
                    customerName:'', 
                    customerPhone:'', 
                    customerAddress:'', 
                    customerCity:'', 
                    customerDistrict:'', 
                    customerDetailAddress:'', 
                    preferredDate:'', 
                    preferredTimeStart:'09:00', 
                    preferredTimeEnd:'12:00', 
                    platform:'日', 
                    referrerCode:'', 
                    memberCode:'', 
                    serviceItems:[{productId:'',name:'服務',quantity:1,unitPrice:1000}], 
                    assignedTechnicians:[], 
                    photos:[], 
                    signatures:{} 
                  })
                  load()
                } catch (e:any) {
                  alert('建立失敗：' + (e?.message || '未知錯誤'))
                } finally {
                  setSubmitting(false)
                }
              }} className={`rounded-lg px-3 py-1 text-white ${submitting?'bg-gray-400 cursor-not-allowed':'bg-brand-500'}`} disabled={submitting}>建立</button>
            </div>
            <div className="mt-2 text-right text-[11px] text-gray-500">
              {submitting ? '送出中…' : isAutoSaving ? '自動儲存中…' : (lastSavedAt ? `已自動儲存於 ${new Date(lastSavedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : '輸入姓名與手機後會自動建立草稿')}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


