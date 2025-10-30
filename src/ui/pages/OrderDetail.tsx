import { SectionTitle, StatusChip, PhotoGrid } from '../kit'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { authRepo } from '../../adapters/local/auth'
import { can } from '../../utils/permissions'
import { useEffect, useState } from 'react'
import { loadAdapters } from '../../adapters'
import { supabase } from '../../utils/supabase'
import { compressImageToDataUrl } from '../../utils/image'
import { applyGroupPricingToServiceItems } from '../../utils/groupPricing'
import SignatureModal from '../components/SignatureModal'
import { 
  TAIWAN_CITIES, 
  extractLocationFromAddress, 
  formatAddressDisplay, 
  generateGoogleMapsLink
} from '../../utils/location'

export default function PageOrderDetail() {
  const { id } = useParams()
  const [order, setOrder] = useState<any>(null)
  const [signOpen, setSignOpen] = useState(false)
  const [promiseOpen, setPromiseOpen] = useState(false)
  const [editItems, setEditItems] = useState(false)
  const [itemsDraft, setItemsDraft] = useState<any[]>([])
  // 技師專用：品項增減（僅新增調整，不直接異動原始）
  const [adjOpen, setAdjOpen] = useState(false)
  const [adjDraft, setAdjDraft] = useState<any[]>([])
  const [memberCode, setMemberCode] = useState<string>('')
  const [memberName, setMemberName] = useState<string>('')
  const [memberPoints, setMemberPoints] = useState<number>(0)
  const [timeLeftSec, setTimeLeftSec] = useState<number>(0)
  const [createdAtEdit, setCreatedAtEdit] = useState<string>('')
  const [dateEdit, setDateEdit] = useState<string>('')
  const [startEdit, setStartEdit] = useState<string>('')
  const [endEdit, setEndEdit] = useState<string>('')
  const [payMethod, setPayMethod] = useState<'cash'|'transfer'|'card'|'applepay'|'other'|''>('')
  const [payStatus, setPayStatus] = useState<'unpaid'|'paid'|'partial'|'pending'|'nopay'|''>('')
  const [signAs, setSignAs] = useState<'customer'|'technician'>('technician')
  const [paySignOpen, setPaySignOpen] = useState(false)
  const [transferInputOpen, setTransferInputOpen] = useState(false)
  const [transferAmount, setTransferAmount] = useState<string>('')
  const [transferLast5, setTransferLast5] = useState<string>('')
  const transferQrUrlPrimary: string = 'https://dekopbnpsvqlztabblxg.supabase.co/storage/v1/object/sign/QRCODEPAY/QRCODEPAY.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iMjVhZWJmZi1kMGFjLTRkN2YtODM1YS1lYThmNzE4YTNlZDEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJRUkNPREVQQVkvUVJDT0RFUEFZLnBuZyIsImlhdCI6MTc2MTExNTY4MiwiZXhwIjoyMDc2NDc1NjgyfQ.Y2ZGPDNeCtX3z2KjHdTK6XbPKMWcanTZJXor1zGZ9xo'
  const transferQrUrlBackup: string = 'https://dekopbnpsvqlztabblxg.supabase.co/storage/v1/object/public/QRCODEPAY/QRCODEPAY.png'
  const bankCode = '822'
  const bankAccount = '369540475328'
  const bankAccountName = '日式洗濯有限公司'
  const [note, setNote] = useState<string>(order?.note || '')
  const [supportNote, setSupportNote] = useState<string>((order as any)?.supportNote || '')
  const [unserviceOpen, setUnserviceOpen] = useState(false)
  const [unserviceFare, setUnserviceFare] = useState<'none'|'fare400'>('none')
  const [unserviceReason, setUnserviceReason] = useState('')
  const [unserviceConfirmPending, setUnserviceConfirmPending] = useState(false)
  // 電子發票編輯
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [invoiceBuyerName, setInvoiceBuyerName] = useState('')
  const [invoiceEmail, setInvoiceEmail] = useState('')
  const [invoiceCompanyTitle, setInvoiceCompanyTitle] = useState('')
  const [invoiceTaxId, setInvoiceTaxId] = useState('')
  const [invoiceCarrierPhone, setInvoiceCarrierPhone] = useState('')
  const [invoiceOrderCode, setInvoiceOrderCode] = useState('')
  const [invoiceDonation, setInvoiceDonation] = useState(false)
  const [invoiceTaxState, setInvoiceTaxState] = useState<'0'|'1'>('0') // 0:含稅 1:未稅
  const getCurrentUser = () => { try{ const s=localStorage.getItem('supabase-auth-user'); if(s) return JSON.parse(s) }catch{}; try{ const l=localStorage.getItem('local-auth-user'); if(l) return JSON.parse(l) }catch{}; return null }
  const user = getCurrentUser()
  const [repos, setRepos] = useState<any>(null)
  const [techs, setTechs] = useState<any[]>([])
  const [uploadingBefore, setUploadingBefore] = useState(false)
  const [uploadingAfter, setUploadingAfter] = useState(false)
  const navigate = useNavigate()
  useEffect(()=>{ (async()=>{ const a = await loadAdapters(); setRepos(a) })() },[])
  useEffect(() => { if (!repos || !id) return; repos.orderRepo.get(id).then(setOrder) }, [id, repos])
  useEffect(()=>{ (async()=>{ try{ if(!repos) return; if(repos.technicianRepo?.list){ const rows = await repos.technicianRepo.list(); setTechs(rows||[]) } }catch{} })() },[repos])
  useEffect(() => { if (order) setItemsDraft(order.serviceItems || []) }, [order])
  useEffect(()=>{ (async()=>{ try { if (!repos) return; if (order?.memberId) { const m = await repos.memberRepo.get(order.memberId); setMemberCode(m?.code||''); setMemberName(m?.name||'');
       // 先確保會員建檔/對應
       try {
         const qp = new URLSearchParams()
         qp.set('memberId', String(order.memberId))
         if (m?.email) qp.set('memberEmail', String(m.email).toLowerCase())
         if (m?.code) qp.set('memberCode', String(m.code))
         if (m?.phone) qp.set('phone', String(m.phone))
         else if (order.customerPhone) qp.set('phone', String(order.customerPhone))
         await fetch(`/_api/member/profile?${qp.toString()}`).catch(()=>{})
       } catch {}
       // 單一真相：以多鍵查詢餘額
       try {
         const q = new URLSearchParams()
         q.set('memberId', String(order.memberId))
         if (m?.email) q.set('memberEmail', String(m.email).toLowerCase())
         if (m?.code) q.set('memberCode', String(m.code))
         if (m?.phone) q.set('phone', String(m.phone))
         else if (order.customerPhone) q.set('phone', String(order.customerPhone))
         const r = await fetch(`/_api/points/balance?${q.toString()}`)
         const j = await r.json(); setMemberPoints(Number(j?.balance||0))
       } catch { setMemberPoints(0) }
     } else {
       setMemberCode(''); setMemberName('');
       // 舊訂單未綁會員：以客戶資訊建檔並多鍵讀取
       const email = String(order?.customerEmail||'').toLowerCase()
       const phone = String(order?.customerPhone||'')
       if (email || phone) {
         try {
           const qp = new URLSearchParams()
           if (email) qp.set('memberEmail', email)
           if (phone) qp.set('phone', phone)
           await fetch(`/_api/member/profile?${qp.toString()}`).catch(()=>{})
         } catch {}
         try {
           const q = new URLSearchParams()
           if (email) q.set('memberEmail', email)
           if (phone) q.set('phone', phone)
           const r = await fetch(`/_api/points/balance?${q.toString()}`)
           const j = await r.json(); setMemberPoints(Number(j?.balance||0))
         } catch { setMemberPoints(0) }
       } else {
         setMemberPoints(0)
       }
     } } catch {} })() },[order?.memberId, order?.customerEmail, repos])
  useEffect(()=>{
    if (!order) return
    const formatTaipeiInput = (iso:string) => {
      try {
        const d = new Date(iso)
        const parts = new Intl.DateTimeFormat('zh-TW', {
          timeZone: 'Asia/Taipei', hour12: false,
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit'
        }).formatToParts(d)
        const obj: Record<string,string> = {}
        for (const p of parts) obj[p.type] = p.value
        return `${obj.year}-${obj.month}-${obj.day}T${obj.hour}:${obj.minute}`
      } catch {
        try { return (iso||'').slice(0,16) } catch { return '' }
      }
    }
    const created = (order as any).createdAt || (order as any).created_at || new Date().toISOString()
    setCreatedAtEdit(formatTaipeiInput(created))
    setDateEdit(order.preferredDate||'')
    setStartEdit(order.preferredTimeStart||'09:00')
    setEndEdit(order.preferredTimeEnd||'12:00')
    setPayMethod((order.paymentMethod as any) || '')
    setPayStatus((order.paymentStatus as any) || '')
  },[order])
  const [products, setProducts] = useState<any[]>([])
  useEffect(()=>{ (async()=>{ if(!repos) return; setProducts(await repos.productRepo.list()) })() },[repos])
  // 產品清單排序（供下拉選單使用）：清洗→家電→二手→居家；類內非加購依單價由低到高，加購固定置底
  const sortProductsForSelect = (list: any[]) => {
    const categoryOrder: Record<string, number> = { cleaning: 0, new: 1, used: 2, home: 3, other: 4 }
    const labelMap: Record<string, string> = { cleaning: '清洗類', new: '家電類', used: '二手類', home: '居家清潔/消毒類', other: '其他' }
    const isAddon = (name: string) => /加購|加價購|addon/i.test(String(name||''))
    const items = (Array.isArray(list)? list: []).map((p:any, idx:number)=> ({
      p,
      idx,
      cat: (p?.category || 'other') as string,
      add: isAddon(p?.name),
      price: Number(p?.unitPrice||0)
    }))
    items.sort((a,b)=>{
      const ca = categoryOrder[a.cat] ?? categoryOrder.other
      const cb = categoryOrder[b.cat] ?? categoryOrder.other
      if (ca !== cb) return ca - cb
      if (a.add !== b.add) return a.add ? 1 : -1
      if (!a.add && !b.add && a.price !== b.price) return a.price - b.price
      return a.idx - b.idx
    })
    // 分組輸出（optgroup）
    const groups: Record<string, any[]> = {}
    for (const it of items) {
      const k = it.cat in categoryOrder ? it.cat : 'other'
      if (!groups[k]) groups[k] = []
      groups[k].push(it.p)
    }
    const orderedCats = Object.keys(categoryOrder).sort((a,b)=> (categoryOrder[a]-categoryOrder[b]))
    return orderedCats.filter(k=> Array.isArray(groups[k]) && groups[k].length>0).map(k=> ({ key: k, label: labelMap[k]||k, items: groups[k] }))
  }
  // 服務內容顯示排序：清洗→家電→二手→居家；類內非加購按單價由低到高，加購（名稱含「加購/加價購」）固定置底且不做價序
  const sortServiceItemsForDisplay = (items: Array<{ name?: string; quantity?: number; unitPrice?: number; productId?: string; category?: string }>) => {
    const categoryOrder: Record<string, number> = { cleaning: 0, new: 1, used: 2, home: 3, other: 4 }
    const findProd = (it: any) => {
      try { if (it?.productId) { const p = products.find((x: any) => x.id === it.productId); if (p) return p } } catch {}
      try { const n = String(it?.name || '').trim(); return products.find((x: any) => String(x?.name || '').trim() === n) } catch {}
      return null
    }
    const getCat = (it: any) => {
      const c = it?.category || (findProd(it)?.category) || 'other'
      return c
    }
    const isAddon = (it: any) => {
      const n = String(it?.name || '')
      return /加購|加價購|addon/i.test(n)
    }
    return (items || [])
      .map((it, idx) => ({
        it,
        idx,
        cat: getCat(it),
        add: isAddon(it),
        price: Number(it?.unitPrice || 0)
      }))
      .sort((a, b) => {
        const ca = categoryOrder[a.cat] ?? categoryOrder.other
        const cb = categoryOrder[b.cat] ?? categoryOrder.other
        if (ca !== cb) return ca - cb
        if (a.add !== b.add) return a.add ? 1 : -1
        if (!a.add && !b.add && a.price !== b.price) return a.price - b.price
        return a.idx - b.idx // 穩定排序
      })
      .map(x => x.it)
  }
  // 新增：客戶欄位本地編輯狀態
  const [customerNameEdit, setCustomerNameEdit] = useState('')
  const [customerPhoneEdit, setCustomerPhoneEdit] = useState('')
  const [customerEmailEdit, setCustomerEmailEdit] = useState('')
  const [customerTitleEdit, setCustomerTitleEdit] = useState('')
  const [customerTaxIdEdit, setCustomerTaxIdEdit] = useState('')
  const [customerAddressEdit, setCustomerAddressEdit] = useState('')
  const [customerCityEdit, setCustomerCityEdit] = useState('')
  const [customerDistrictEdit, setCustomerDistrictEdit] = useState('')
  const [customerDetailAddressEdit, setCustomerDetailAddressEdit] = useState('')
  const [savingAddress, setSavingAddress] = useState(false)
  const [addressSavedAt, setAddressSavedAt] = useState('')
  useEffect(()=>{
    if (!order) return
    setCustomerNameEdit(order.customerName||'')
    setCustomerPhoneEdit(order.customerPhone||'')
    setCustomerEmailEdit(order.customerEmail||'')
    setCustomerTitleEdit(order.customerTitle||'')
    setCustomerTaxIdEdit(order.customerTaxId||'')
    setCustomerAddressEdit(order.customerAddress||'')
    
    // 解析地址
    const location = extractLocationFromAddress(order.customerAddress||'')
    setCustomerCityEdit(location.city)
    setCustomerDistrictEdit(location.district)
    setCustomerDetailAddressEdit(location.address)
  },[order])

  // 監看「縣市/區域/詳細」選單：僅組合顯示於完整地址欄（實際儲存改由 onBlur/按鈕）
  useEffect(() => {
    if (!order) return
    const combined = formatAddressDisplay(customerCityEdit, customerDistrictEdit, customerDetailAddressEdit)
    if (!combined) return
    setCustomerAddressEdit(combined)
  }, [customerCityEdit, customerDistrictEdit, customerDetailAddressEdit, order?.id])
  // 指派技師顯示：若訂單內沒有 names，嘗試從排班 work 反推
  const [derivedAssigned, setDerivedAssigned] = useState<string[]>([])
  useEffect(()=>{ (async()=>{
    try{
      if (!repos || !order?.id) return
      if (Array.isArray(order.assignedTechnicians) && order.assignedTechnicians.length>0) { setDerivedAssigned([]); return }
      const d = (order.preferredDate || (order.createdAt||'').slice(0,10) || new Date().toISOString().slice(0,10))
      const ws = await repos.scheduleRepo.listWork({ start: d, end: d })
      const mine = (ws||[]).filter((w:any)=>w.orderId===order.id)
      if (mine.length===0) { setDerivedAssigned([]); return }
      const techMap: Record<string,string> = {}
      ;(techs||[]).forEach((t:any)=>{ techMap[(t.email||'').toLowerCase()] = t.name })
      const names = Array.from(new Set(mine.map((w:any)=> (techMap[(w.technicianEmail||'').toLowerCase()] || w.technicianEmail) as string).filter(Boolean))) as string[]
      setDerivedAssigned(names as string[])
    }catch{}
  })() }, [repos, order?.id, order?.preferredDate, order?.createdAt, techs])
  // 倒數計時（開始服務後 N 分鐘內不可按「服務完成」；由設定決定）
  useEffect(()=>{
    if (!order?.workStartedAt || order?.status==='completed' || order?.status==='canceled' || (order as any)?.status==='unservice') { setTimeLeftSec(0); return }
    const parseTs = (s:string) => {
      if (!s) return 0
      if (s.includes('T')) return Date.parse(s)
      const d = new Date(s); return isNaN(d.getTime()) ? 0 : d.getTime()
    }
    let h: any
    ;(async()=>{
      try {
        const { settingsRepo } = await import('../../adapters/local/settings')
        const s = await settingsRepo.get().catch(()=>({ countdownEnabled:false, countdownMinutes:0 } as any))
        const COOLDOWN_MS = ((s?.countdownEnabled ? s.countdownMinutes : 0) || 0) * 60 * 1000
        if (!COOLDOWN_MS) { setTimeLeftSec(0); return }
        const started = parseTs(order.workStartedAt)
        const endAt = started + COOLDOWN_MS
        const tick = () => { const now = Date.now(); const left = Math.max(0, Math.floor((endAt - now)/1000)); setTimeLeftSec(left) }
        tick(); h = setInterval(tick, 1000)
      } catch { setTimeLeftSec(0) }
    })()
    return () => { if (h) clearInterval(h) }
  }, [order?.workStartedAt, order?.status])
  useEffect(()=>{ setNote((order as any)?.note || '') }, [order?.note])
  useEffect(()=>{ setSupportNote((order as any)?.supportNote || '') }, [order?.supportNote])
  // 簽名技師：改為在已指派名單旁的勾選框設定
  // 僅一位已指派時自動套用為簽名技師（避免還要選）
  const [autoSigTried, setAutoSigTried] = useState(false)
  useEffect(()=>{ (async()=>{
    try{
      if (autoSigTried) return
      if (!repos || !order) return
      const assigned = Array.isArray(order.assignedTechnicians) ? order.assignedTechnicians : []
      if (assigned.length === 1 && !order.signatureTechnician) {
        await repos.orderRepo.update(order.id, { signatureTechnician: assigned[0] })
        const o = await repos.orderRepo.get(order.id); setOrder(o)
      }
      setAutoSigTried(true)
    }catch{}
  })() }, [repos, order?.id, order?.signatureTechnician, order?.assignedTechnicians, autoSigTried])
  if (!order) return <div>載入中...</div>
  const isAdminOrSupport = user?.role==='admin' || user?.role==='support'
  const isAssignedTech = user?.role==='technician' && Array.isArray(order.assignedTechnicians) && order.assignedTechnicians.includes(user?.name || '')
  const isTechnician = user?.role === 'technician'
  const isClosed = order?.status === 'closed'
  const isPaid = (payStatus === 'paid')
  const statusText = (s: string) => s==='draft' ? '待確認' : s==='confirmed' ? '已確認' : s==='in_progress' ? '服務中' : s==='completed' ? '已完成' : s==='closed' ? '已結案' : s==='canceled' ? '已取消' : s==='unservice' ? '無法服務' : s
  const fmt = (n: number) => new Intl.NumberFormat('zh-TW').format(n || 0)
  const subTotal = (order.serviceItems||[]).reduce((s:number,it:any)=>s+it.unitPrice*it.quantity,0)
  const amountDue = Math.max(0, subTotal - (order.pointsDeductAmount||0))
  const hasTechSignature = Boolean(order?.signatures && (order as any).signatures?.technician)
  const hasCustomerSignature = Boolean(order?.signatures && (order as any).signatures?.customer)
  const hasSignature = hasTechSignature && hasCustomerSignature
  const hasBefore = (order.photosBefore?.length||0) > 0
  const hasAfter = (order.photosAfter?.length||0) > 0
  const requirePhotosOk = hasBefore && hasAfter
  const started = !!order?.workStartedAt
  const finished = !!order?.workCompletedAt || order?.status==='completed' || order?.status==='closed'
  // 簽名候選名單：優先用訂單內的 assignedTechnicians，否則回退使用從排程推導的 derivedAssigned
  const signCandidates: string[] = (Array.isArray(order.assignedTechnicians) && order.assignedTechnicians.length>0)
    ? order.assignedTechnicians
    : (derivedAssigned || [])
  const canClose = (
    started &&
    finished &&
    timeLeftSec===0 &&
    hasSignature &&
    requirePhotosOk &&
    (payStatus==='paid')
  )
  const closeDisabledReason = (()=>{
    if (!started) return '需先「開始服務」'
    if (!finished) return '需先「服務完成」'
    if (timeLeftSec>0) return `冷卻中，剩餘 ${String(Math.floor(timeLeftSec/60)).padStart(2,'0')}:${String(timeLeftSec%60).padStart(2,'0')}`
    if (!hasTechSignature || !hasCustomerSignature) return '需完成技師與客戶雙簽名'
    if (!hasBefore || !hasAfter) return '需上傳洗前與洗後照片'
    if (payStatus!=='paid') return '需完成收款（付款狀態：已收款）'
    return ''
  })()
  return (
    <div className="space-y-6">
      {/* 移除上方黃色區塊，直接顯示訂單狀態 */}
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <div className="flex items-center justify-between">
          <SectionTitle>客戶資料</SectionTitle>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px]">{order.id}</span>
            {/* 來源平台：僅客服/管理員顯示（技師/客戶不顯示） */}
            {isAdminOrSupport && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${order.platform==='日'?'bg-blue-100 text-blue-700':order.platform==='同'?'bg-purple-100 text-purple-700':order.platform==='黃'?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700'}`}>{order.platform||'日'}</span>
            )}
            {(() => { const kind: 'done'|'paid'|'pending' = (order.status==='completed' ? 'done' : 'pending'); return <StatusChip kind={kind} text={statusText(order.status)} /> })()}
          </div>
        </div>
        
        
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>姓名：<input disabled={isTechnician || isClosed} className="w-full rounded border px-2 py-1" value={customerNameEdit} onChange={e=>setCustomerNameEdit(e.target.value)} onBlur={async()=>{ if (isTechnician || isClosed) return; if (customerNameEdit===order.customerName) return; await repos.orderRepo.update(order.id, { customerName: customerNameEdit }); const o=await repos.orderRepo.get(order.id); setOrder(o) }} /></div>
          <div>手機：<div className="flex gap-2"><input disabled={isTechnician || isClosed} className="w-full rounded border px-2 py-1" value={customerPhoneEdit} onChange={e=>setCustomerPhoneEdit(e.target.value)} onBlur={async()=>{ if (isTechnician || isClosed) return; if (customerPhoneEdit===order.customerPhone) return; await repos.orderRepo.update(order.id, { customerPhone: customerPhoneEdit }); const o=await repos.orderRepo.get(order.id); setOrder(o) }} /><a href={`tel:${order.customerPhone}`} className="rounded bg-brand-500 px-3 py-1 text-white">撥打</a></div></div>
          <div>信箱：<input disabled={isTechnician || isClosed} className="w-full rounded border px-2 py-1" value={customerEmailEdit} onChange={e=>setCustomerEmailEdit(e.target.value)} onBlur={async()=>{ if (isTechnician || isClosed) return; if (customerEmailEdit===(order.customerEmail||'')) return; await repos.orderRepo.update(order.id, { customerEmail: customerEmailEdit }); const o=await repos.orderRepo.get(order.id); setOrder(o) }} /></div>
          <div>抬頭：<input disabled={isTechnician || isClosed} className="w-full rounded border px-2 py-1" value={customerTitleEdit} onChange={e=>setCustomerTitleEdit(e.target.value)} onBlur={async()=>{ if (isTechnician || isClosed) return; if (customerTitleEdit===(order.customerTitle||'')) return; await repos.orderRepo.update(order.id, { customerTitle: customerTitleEdit }); const o=await repos.orderRepo.get(order.id); setOrder(o) }} /></div>
          <div>統編：<input disabled={isTechnician || isClosed} className="w-full rounded border px-2 py-1" value={customerTaxIdEdit} onChange={e=>setCustomerTaxIdEdit(e.target.value)} onBlur={async()=>{ if (isTechnician || isClosed) return; if (customerTaxIdEdit===(order.customerTaxId||'')) return; await repos.orderRepo.update(order.id, { customerTaxId: customerTaxIdEdit }); const o=await repos.orderRepo.get(order.id); setOrder(o) }} /></div>
          <div className="flex items-center gap-2">
            <span>已寄送：</span>
            <input type="checkbox" checked={order.invoiceSent||false} onChange={async e=>{ await repos.orderRepo.update(order.id, { invoiceSent:e.target.checked }); const o=await repos.orderRepo.get(order.id); setOrder(o) }} />
          </div>
                        <div className="col-span-2">
                <div className="mb-2">地址：</div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <select 
                    className="rounded border px-2 py-1" 
                    value={customerCityEdit} 
                    onChange={e=>{
                      const city = e.target.value
                      setCustomerCityEdit(city)
                      setCustomerDistrictEdit('')
                      const newAddress = formatAddressDisplay(city, '', customerDetailAddressEdit)
                      setCustomerAddressEdit(newAddress)
                    }}
                  >
                    <option value="">選擇縣市</option>
                    {Object.keys(TAIWAN_CITIES).map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  
                  <select 
                    className="rounded border px-2 py-1" 
                    value={customerDistrictEdit} 
                    onChange={e=>{
                      const district = e.target.value
                      setCustomerDistrictEdit(district)
                      const newAddress = formatAddressDisplay(customerCityEdit, district, customerDetailAddressEdit)
                      setCustomerAddressEdit(newAddress)
                    }}
                    disabled={!customerCityEdit}
                  >
                    <option value="">選擇區域</option>
                    {customerCityEdit && TAIWAN_CITIES[customerCityEdit as keyof typeof TAIWAN_CITIES]?.map(district => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                  
                  <input 
                    className="rounded border px-2 py-1" 
                    placeholder="詳細地址" 
                    value={customerDetailAddressEdit} 
                    onChange={e=>{
                      const detailAddress = e.target.value
                      setCustomerDetailAddressEdit(detailAddress)
                      const newAddress = formatAddressDisplay(customerCityEdit, customerDistrictEdit, detailAddress)
                      setCustomerAddressEdit(newAddress)
                    }} 
                  />
                </div>
                
                <div className="flex gap-2">
                  <input 
                    disabled={isTechnician || isClosed}
                    className="flex-1 rounded border px-2 py-1" 
                    value={customerAddressEdit} 
                    onChange={e=>setCustomerAddressEdit(e.target.value)} 
                    onBlur={async()=>{ 
                      if (isTechnician || isClosed) return
                      if (customerAddressEdit===(order.customerAddress||'')) return; 
                      await repos.orderRepo.update(order.id, { customerAddress: customerAddressEdit }); 
                      const o=await repos.orderRepo.get(order.id); 
                      setOrder(o)
                      try { setAddressSavedAt(new Date().toISOString()) } catch {}
                    }} 
                  />
                  <a 
                    className="rounded bg-gray-100 px-3 py-1" 
                    target="_blank" 
                    href={generateGoogleMapsLink(customerCityEdit, customerDistrictEdit, customerDetailAddressEdit)}
                  >
                    地圖
                  </a>
                  <button
                    onClick={async()=>{
                      try {
                        if (isTechnician || isClosed) return
                        setSavingAddress(true)
                        await repos.orderRepo.update(order.id, { customerAddress: customerAddressEdit })
                        const o = await repos.orderRepo.get(order.id)
                        setOrder(o)
                        try { setAddressSavedAt(new Date().toISOString()) } catch {}
                      } finally {
                        setSavingAddress(false)
                      }
                    }}
                    className={`rounded px-3 py-1 ${savingAddress? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-brand-500 text-white'}`}
                    disabled={savingAddress}
                  >{savingAddress ? '儲存中…' : '儲存地址'}</button>
                </div>
                {addressSavedAt && (
                  <div className="mt-1 text-[11px] text-gray-500">已儲存於 {new Date(addressSavedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                )}
              </div>
          <div>會員編號：<span className="text-gray-700">{memberCode||'—'}</span></div>
        </div>
      </div>
      {/* 電子發票操作：僅管理員/客服、且訂單完成或結案時顯示 */}
      {isAdminOrSupport && (order.status==='completed' || order.status==='closed') && (
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-white p-4 shadow-card">
          <div className="text-sm text-gray-700">電子發票：{order.invoiceCode ? <span className="text-emerald-700">已開立（{order.invoiceCode}）</span> : <span className="text-rose-700">未開立</span>}</div>
          <div className="flex items-center gap-2">
            {!order.invoiceCode && (
              <button
                onClick={()=>{
                  try {
                    setInvoiceBuyerName(order.customerName||'')
                    setInvoiceEmail((order as any).customerEmail||'')
                    setInvoiceCompanyTitle((order as any).customerTitle||'')
                    setInvoiceTaxId((order as any).customerTaxId||'')
                    setInvoiceCarrierPhone('')
                    setInvoiceOrderCode(order.id||'')
                    setInvoiceDonation(false)
                    setInvoiceTaxState('0')
                  } catch {}
                  setInvoiceOpen(true)
                }}
                className="rounded bg-gray-900 px-3 py-1 text-white"
              >開立發票</button>
            )}
            {order.invoiceCode && (
              <>
                <button
                  onClick={async()=>{
                    try{
                      const svc = await import('../../services/eInvoice')
                      const res: any = await (svc as any).EInvoice.print(order.invoiceCode)
                      const url = res?.url
                      if (url) {
                        try { window.open(url, '_blank', 'noopener,noreferrer') } catch {}
                      } else {
                        alert('已送出列印請求')
                      }
                    }catch{ alert('列印請求已送出') }
                  }}
                  className="rounded bg-gray-100 px-3 py-1"
                >列印</button>
                <button
                  onClick={async()=>{
                    if (!confirm('確定作廢此發票？')) return
                    try{
                      const svc = await import('../../services/eInvoice')
                      await (svc as any).EInvoice.cancel(order.invoiceCode)
                      await repos.orderRepo.update(order.id, { invoiceStatus: 'cancelled' as any })
                      const o = await repos.orderRepo.get(order.id); setOrder(o)
                      alert('已申請作廢')
                    }catch(err:any){ alert('作廢失敗：' + (err?.message||'未知錯誤')) }
                  }}
                  className="rounded bg-rose-600 px-3 py-1 text-white"
                >作廢</button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-card">
        <SectionTitle>服務內容</SectionTitle>
        <div className="mt-3 text-sm">
          {!editItems ? (
            <div className="rounded border">
              <div className="grid grid-cols-4 bg-gray-50 px-2 py-1 text-xs text-gray-600"><div>項目</div><div>數量</div><div>單價</div><div className="text-right">小計</div></div>
              {sortServiceItemsForDisplay(order.serviceItems||[]).map((it:any,i:number)=>{
                const sub = it.quantity*it.unitPrice
                return <div key={i} className="grid grid-cols-4 items-center px-2 py-1 text-sm"><div>{it.name}</div><div>{it.quantity}</div><div>{it.unitPrice}</div><div className="text-right">{sub}</div></div>
              })}
              <div className="border-t px-2 py-1 text-right text-gray-900">小計：<span className="text-base font-semibold">{fmt(subTotal)}</span></div>
            </div>
          ) : (
            <div className="mt-2 space-y-2 text-sm">
              {itemsDraft.map((it:any, i:number)=>{
                const sub = (Number(it.unitPrice)||0) * (Number(it.quantity)||0)
                return (
                  <div key={i} className="grid grid-cols-6 items-center gap-2">
                    <select className="col-span-2 rounded border px-2 py-1" value={it.productId||''} onChange={async (e)=>{ const val=e.target.value; const arr=[...itemsDraft]; if(val){ const p = products.find((x:any)=>x.id===val); arr[i]={...arr[i], productId:val, name:p?.name||it.name, unitPrice:p?.unitPrice||it.unitPrice, category:p?.category||it.category}; } else { arr[i]={...arr[i], productId:undefined}; } setItemsDraft(arr) }}>
                      <option value="">自訂</option>
                      {sortProductsForSelect(products).map(g => (
                        <optgroup key={g.key} label={g.label}>
                          {g.items.map((p:any)=> (<option key={p.id} value={p.id}>{p.name}（{p.unitPrice}）</option>))}
                        </optgroup>
                      ))}
                    </select>
                    <input className="col-span-2 rounded border px-2 py-1" value={it.name} onChange={e=>{ const arr=[...itemsDraft]; arr[i]={...arr[i], name:e.target.value}; setItemsDraft(arr) }} />
                    <div className="flex items-center gap-2">
                      <button onClick={()=>{ const arr=[...itemsDraft]; const q=(Number(arr[i].quantity)||0)-1; arr[i]={...arr[i], quantity:q}; setItemsDraft(arr) }} className="rounded bg-gray-100 px-2 py-1">-</button>
                      <input type="number" className="w-16 rounded border px-2 py-1 text-right" value={it.quantity} onChange={e=>{ const arr=[...itemsDraft]; let q = Number(e.target.value); if (Number.isNaN(q)) q = 0; arr[i]={...arr[i], quantity:q}; setItemsDraft(arr) }} />
                      <button onClick={()=>{ const arr=[...itemsDraft]; const q=(Number(arr[i].quantity)||0)+1; arr[i]={...arr[i], quantity:q}; setItemsDraft(arr) }} className="rounded bg-gray-100 px-2 py-1">+</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" className="w-24 rounded border px-2 py-1 text-right" value={it.unitPrice} onChange={e=>{ const arr=[...itemsDraft]; arr[i]={...arr[i], unitPrice:Number(e.target.value)||0}; setItemsDraft(arr) }} />
                      <span className="text-xs text-gray-500">小計 {fmt(sub)}</span>
                    </div>
                    <button onClick={()=>{ if(!confirm('確定要移除此項目？')) return; const arr=[...itemsDraft]; arr.splice(i,1); setItemsDraft(arr) }} className="rounded bg-gray-100 px-2 py-1">刪</button>
                  </div>
                )
              })}
              <div><button onClick={()=>setItemsDraft([...itemsDraft, { name:'', quantity:1, unitPrice:0 }])} className="rounded bg-gray-100 px-2 py-1">新增項目</button></div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>{
                    try {
                      const list = Array.isArray(itemsDraft) ? itemsDraft : []
                      const findProd = (it:any) => {
                        let p:any = null
                        try { if (it?.productId) p = products.find((x:any)=> x.id === it.productId) } catch {}
                        if (!p) {
                          const nIt = String(it?.name||'').trim()
                          p = products.find((x:any)=> String(x?.name||'').trim() === nIt)
                        }
                        return p
                      }
                      const matched = list.map(it=> ({ it, p: findProd(it) })).filter(x=> x.p && x.p.category === 'cleaning' && Number(x.p.groupPrice)>0)
                      const totalQty = matched.reduce((s, x)=> s + Math.max(0, Number(x.it?.quantity||0)), 0)
                      const thresholds = matched.map(x=> Number(x.p?.groupMinQty||3)).filter(n=> Number.isFinite(n) && n>0)
                      const minThreshold = thresholds.length ? Math.min(...thresholds) : 3
                      const active = totalQty >= minThreshold
                      const applied = active ? list.map((it:any)=>{ const p = findProd(it); if (p && p.category==='cleaning' && Number(p.groupPrice)>0) { return { ...it, unitPrice: Number(p.groupPrice) } } return it }) : list
                      setItemsDraft(applied as any)
                      alert(active ? '已套用團購價於清洗類品項' : `未達團購門檻（需滿 ${minThreshold} 件清洗類），維持原價`)
                    } catch {}
                  }}
                  className="rounded bg-orange-100 px-3 py-1 text-orange-700"
                >套用團購價</button>
                <button onClick={async()=>{ await repos.orderRepo.update(order.id, { serviceItems: itemsDraft }); const o=await repos.orderRepo.get(order.id); setOrder(o); setEditItems(false) }} className="rounded bg-brand-500 px-3 py-1 text-white">儲存</button>
              </div>
            </div>
          )}
          {user?.role!=='technician' && !isClosed && <div className="mt-2 text-right"><button onClick={()=>setEditItems(e=>!e)} className="rounded bg-gray-100 px-2 py-1 text-xs">{editItems?'取消':'編輯項目'}</button></div>}

          {isTechnician && !isClosed && !isPaid && (
            <div className="mt-3 rounded border p-2">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700">品項增減（僅新增調整，原始不變）</div>
                <button onClick={()=>setAdjOpen(v=>!v)} className="rounded bg-gray-100 px-2 py-1 text-xs">{adjOpen? '收合':'展開'}</button>
              </div>
              {adjOpen && (
                <div className="space-y-2 text-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-gray-500">
                          <th className="px-2 py-1 text-left">品項</th>
                          <th className="px-2 py-1 text-left">名稱/自訂</th>
                          <th className="px-2 py-1 text-right">數量(±)</th>
                          <th className="px-2 py-1 text-right">單價</th>
                          <th className="px-2 py-1 text-right">小計</th>
                          <th className="px-2 py-1">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adjDraft.length===0 && (
                          <tr><td colSpan={6} className="px-2 py-3 text-center text-gray-400">尚無調整，請點「新增一列」</td></tr>
                        )}
                        {adjDraft.map((it:any, i:number)=>{
                          const sub = (Number(it.unitPrice)||0) * (Number(it.quantity)||0)
                          return (
                            <tr key={i} className="border-b last:border-0">
                              <td className="px-2 py-1">
                                <select className="max-w-[12rem] truncate rounded border px-2 py-1" value={it.productId||''} onChange={(e)=>{ const val=e.target.value; const arr=[...adjDraft]; if(val){ const p = products.find((x:any)=>x.id===val); arr[i]={...arr[i], productId:val, name:p?.name||it.name, unitPrice:p?.unitPrice||it.unitPrice}; } else { arr[i]={...arr[i], productId:undefined}; } setAdjDraft(arr) }}>
                                  <option value="">自訂</option>
                                  {products.map((p:any)=>(<option key={p.id} value={p.id}>{p.name}（{p.unitPrice}）</option>))}
                                </select>
                              </td>
                              <td className="px-2 py-1">
                                <input className="w-full min-w-[14rem] rounded border px-2 py-1" placeholder="例如：濾網" value={it.name||''} onChange={e=>{ const arr=[...adjDraft]; arr[i]={...arr[i], name:e.target.value}; setAdjDraft(arr) }} />
                              </td>
                              <td className="px-2 py-1 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button type="button" onClick={()=>{ const arr=[...adjDraft]; arr[i]={...arr[i], quantity:(Number(arr[i].quantity)||0)-1}; setAdjDraft(arr) }} className="rounded bg-gray-100 px-2 py-1">-1</button>
                                  <span className="inline-block min-w-[2.5rem] text-right">{Number(it.quantity)||0}</span>
                                  <button type="button" onClick={()=>{ const arr=[...adjDraft]; arr[i]={...arr[i], quantity:(Number(arr[i].quantity)||0)+1}; setAdjDraft(arr) }} className="rounded bg-gray-100 px-2 py-1">+1</button>
                                </div>
                              </td>
                              <td className="px-2 py-1 text-right">
                                <input type="number" className="w-24 rounded border px-2 py-1 text-right" value={it.unitPrice} onChange={e=>{ const arr=[...adjDraft]; arr[i]={...arr[i], unitPrice:Number(e.target.value)||0}; setAdjDraft(arr) }} />
                              </td>
                              <td className="px-2 py-1 text-right text-gray-700">{fmt(sub)}</td>
                              <td className="px-2 py-1 text-center">
                                <button type="button" onClick={()=>{ const arr=[...adjDraft]; arr.splice(i,1); setAdjDraft(arr) }} className="rounded bg-gray-100 px-2 py-1">刪</button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={4} className="px-2 py-2 text-right text-gray-500">調整合計</td>
                          <td className="px-2 py-2 text-right font-semibold">{fmt((adjDraft||[]).reduce((s:number,x:any)=> s + (Number(x.unitPrice)||0)*(Number(x.quantity)||0), 0))}</td>
                          <td className="px-2 py-2"></td>
                        </tr>
                        <tr>
                          <td colSpan={4} className="px-2 py-1 text-right text-gray-500">套用後預估金額</td>
                          <td className="px-2 py-1 text-right font-semibold">{fmt(((order.serviceItems||[]).reduce((s:number,it:any)=> s + (Number(it.unitPrice)||0)*(Number(it.quantity)||0), 0)) + (adjDraft||[]).reduce((s:number,x:any)=> s + (Number(x.unitPrice)||0)*(Number(x.quantity)||0), 0))}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={()=>setAdjDraft([...adjDraft, { name:'', quantity:-1, unitPrice:0 }])} className="rounded bg-gray-100 px-2 py-1">新增一列</button>
                      <button onClick={()=>setAdjDraft([])} className="rounded bg-gray-100 px-2 py-1">清空</button>
                    </div>
                    <div className="text-right">
                      <button
                        type="button"
                        disabled={!Array.isArray(adjDraft) || !adjDraft.some((x:any)=> Number(x.quantity)!==0)}
                        onClick={async()=>{
                          try {
                            if (!Array.isArray(adjDraft) || !adjDraft.some((x:any)=> Number(x.quantity)!==0)) { alert('請先輸入調整（數量可為負數）'); return }
                            const normalized = adjDraft.map((x:any)=> ({ name: String(x.name||'調整'), quantity: Number(x.quantity)||0, unitPrice: Number(x.unitPrice)||0, productId: x.productId }))
                            const next = [ ...(order.serviceItems||[]), ...normalized ]
                            await repos.orderRepo.update(order.id, { serviceItems: next })
                            const o = await repos.orderRepo.get(order.id)
                            setOrder(o)
                            setAdjDraft([])
                            setAdjOpen(false)
                            alert('已套用增減調整')
                          } catch (e:any) { alert('套用失敗：' + (e?.message||'請稍後再試')) }
                        }}
                        className={`rounded px-3 py-1 text-white ${(!Array.isArray(adjDraft) || !adjDraft.some((x:any)=> Number(x.quantity)!==0))?'bg-gray-300 cursor-not-allowed':'bg-brand-500'}`}
                      >套用調整</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 積分抵扣 */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">積分抵扣</div>
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span>可用積分：</span>
                <span className="font-semibold text-brand-600">{memberPoints}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm">使用積分：</span>
                <input
                  type="number"
                  min="0"
                  max={memberPoints}
                  value={order.pointsUsed || 0}
                  onChange={async (e) => {
                    const value = Math.min(Number(e.target.value), memberPoints)
                    await repos.orderRepo.update(order.id, { pointsUsed: value, pointsDeductAmount: value })
                    const o = await repos.orderRepo.get(order.id)
                    setOrder(o)
                  }}
                  className="w-20 rounded border px-2 py-1 text-sm"
                />
              </div>
              <div className="mt-1">
                <button
                  onClick={async () => {
                    const maxPoints = memberPoints
                    await repos.orderRepo.update(order.id, { pointsUsed: maxPoints, pointsDeductAmount: maxPoints })
                    const o = await repos.orderRepo.get(order.id)
                    setOrder(o)
                  }}
                  className="rounded bg-brand-100 px-2 py-1 text-xs text-brand-700 hover:bg-brand-200"
                >
                  全部使用
                </button>
                {order.memberId && (
                  <button
                    onClick={async()=>{
                      try {
                        // 先確保會員建檔/對應
                        try {
                          const qp = new URLSearchParams()
                          qp.set('memberId', String(order.memberId))
                          if (memberCode) qp.set('memberCode', String(memberCode))
                          if (order.customerEmail) qp.set('memberEmail', String(order.customerEmail).toLowerCase())
                          if (order.customerPhone) qp.set('phone', String(order.customerPhone))
                          await fetch(`/_api/member/profile?${qp.toString()}`).catch(()=>{})
                        } catch {}
                        // 扣點：多鍵傳遞
                        const payload:any = { orderId: String(order.id), points: Number(order.pointsUsed||0) }
                        payload.memberId = String(order.memberId)
                        if (memberCode) payload.memberCode = String(memberCode)
                        if (order.customerEmail) payload.memberEmail = String(order.customerEmail).toLowerCase()
                        if (order.customerPhone) payload.phone = String(order.customerPhone)
                        await fetch('/_api/points/use-on-create', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
                        // 立即刷新可用積分顯示（多鍵）
                        try {
                          const q = new URLSearchParams()
                          q.set('memberId', String(order.memberId))
                          if (memberCode) q.set('memberCode', String(memberCode))
                          if (order.customerEmail) q.set('memberEmail', String(order.customerEmail).toLowerCase())
                          if (order.customerPhone) q.set('phone', String(order.customerPhone))
                          const r = await fetch(`/_api/points/balance?${q.toString()}`)
                          const j = await r.json(); setMemberPoints(Number(j?.balance||0))
                        } catch {}
                        alert('已扣點，餘額已更新')
                      } catch {}
                    }}
                    className="ml-2 rounded bg-gray-900 px-2 py-1 text-xs text-white hover:bg-gray-800"
                  >
                    立即扣點
                  </button>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span>折抵金額：</span>
                <span className="font-semibold text-rose-600">-${order.pointsDeductAmount || 0}</span>
              </div>
            </div>
          </div>

          {/* 付款區塊（互動流程） */}
          <div className="mt-3 rounded-xl border p-3 text-xs">
            <div className="mb-2 text-sm font-semibold">付款</div>
            <div className="grid grid-cols-2 gap-2">
              <div>付款方式：
                <select className="rounded border px-2 py-1" value={payMethod} disabled={isClosed || (payMethod==='cash' && payStatus==='paid')} onChange={async e=>{ const v = e.target.value as any; setPayMethod(v); setTransferInputOpen(false); await repos.orderRepo.update(order.id, { paymentMethod: v }); const o=await repos.orderRepo.get(order.id); setOrder(o) }}>
                  <option value="">—</option>
                  <option value="cash">現金付款</option>
                  <option value="transfer">銀行轉帳</option>
                  <option value="online">信用卡/APPLY PAY</option>
                  <option value="card" hidden>信用卡（舊）</option>
                  <option value="applepay" hidden>Apple Pay（舊）</option>
                </select>
              </div>
              <div>付款狀態：
                <select className="rounded border px-2 py-1" value={payStatus} disabled={isClosed || (payMethod==='cash' && payStatus==='paid')} onChange={async e=>{ const v=e.target.value as any; setPayStatus(v); await repos.orderRepo.update(order.id, { paymentStatus: v }); const o=await repos.orderRepo.get(order.id); setOrder(o) }}>
                  <option value="">—</option>
                  <option value="unpaid">未收款</option>
                  <option value="pending">待確認</option>
                  <option value="nopay">不用付款</option>
                  <option value="paid">已收款</option>
                </select>
              </div>
            </div>

            {/* 現金付款：收款簽名全螢幕 */}
            {payMethod==='cash' && (
              <div className="mt-3 rounded-lg bg-gray-50 p-2">
                <div className="mb-1">現金收款：{fmt(amountDue)} 元</div>
                <div className="text-[12px] text-gray-600">點擊下方「簽名確認收款」，開啟全螢幕畫板。確認後不可更改。</div>
                <div className="mt-2">
                  {payStatus === 'paid' ? (
                    <span className="rounded bg-emerald-100 px-3 py-1 text-emerald-700">已確認收款</span>
                  ) : (
                    <button type="button" onClick={()=>{ setSignAs('technician'); setPaySignOpen(true) }} className="rounded bg-gray-900 px-3 py-1 text-white">簽名確認收款</button>
                  )}
                </div>
              </div>
            )}

            {/* 銀行轉帳：QR Code + 輸入金額/後五碼 */}
            {payMethod==='transfer' && (
              <div className="mt-3 rounded-lg bg-gray-50 p-2">
                <div className="mb-2 flex items-center gap-3">
                  <span className="text-sm">銀行轉帳 QR</span>
                  <a href={transferQrUrlPrimary} target="_blank" rel="noopener noreferrer" className="inline-block">
                    <img src={transferQrUrlPrimary} onError={(e)=>{ const t=e.currentTarget as HTMLImageElement; t.onerror=null as any; t.src=transferQrUrlBackup }} alt="銀行轉帳 QR" className="w-32 h-32 rounded border border-gray-200 bg-white object-contain" />
                  </a>
                </div>
                <div className="text-[12px] text-gray-700 mt-1">
                  銀行代碼：<span className="font-mono font-semibold">{bankCode}</span> ｜ 帳號：<span className="font-mono font-semibold">{bankAccount}</span> ｜ 戶名：<span className="font-mono">{bankAccountName}</span>
                </div>
                <div className="text-[12px] text-gray-600">請客戶完成轉帳後，輸入轉帳金額與後五碼。</div>
                {!transferInputOpen ? (
                  <div className="mt-2">
                    <button onClick={()=>setTransferInputOpen(true)} className="rounded bg-gray-900 px-3 py-1 text-white">完成轉帳</button>
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" placeholder="轉帳金額" className="rounded border px-2 py-1" value={transferAmount} onChange={e=>setTransferAmount(e.target.value)} />
                      <input type="text" placeholder="後五碼" className="rounded border px-2 py-1" value={transferLast5} onChange={e=>setTransferLast5(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>setTransferInputOpen(false)} className="rounded bg-gray-100 px-3 py-1">取消</button>
                      <button onClick={async()=>{
                        if(!transferAmount || !transferLast5) { alert('請輸入轉帳金額與後五碼'); return }
                        await repos.orderRepo.update(order.id, { paymentStatus: 'pending' })
                        const o=await repos.orderRepo.get(order.id); setOrder(o)
                        setTransferInputOpen(false)
                        alert('已標記為待確認')
                      }} className="rounded bg-gray-900 px-3 py-1 text-white">確認</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 線上刷卡 QR（信用卡 / APPLY PAY） */}
            {(payMethod==='online' || payMethod==='card' || payMethod==='applepay') && (
              <div className="mt-3 rounded-lg bg-gray-50 p-2">
                {(() => {
                  try {
                    const email = String(order.customerEmail||'').toLowerCase()
                    const base = `${location.origin}/.netlify/functions/newebpay-start`
                    const q = new URLSearchParams({ orderId: String(order.id), amount: String(Math.round(amountDue)), email, desc: `訂單#${order.id}` })
                    const link = `${base}?${q.toString()}`
                    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`
                    return (
                      <div className="flex items-start gap-3">
                        <div>
                          <div className="mb-1 text-sm">線上刷卡 QR（信用卡 / APPLY PAY）</div>
                          <img src={qr} alt="線上刷卡 QR" className="w-32 h-32 rounded border bg-white object-contain" />
                        </div>
                        <div className="text-[12px] text-gray-700">
                          <div className="mb-1">請客戶掃描 QR 前往藍新付款頁</div>
                          <div className="break-all"><a href={link} target="_blank" rel="noreferrer" className="text-blue-600 underline">{link}</a></div>
                        </div>
                      </div>
                    )
                  } catch { return <div className="text-[12px] text-rose-600">產生 QR 失敗</div> }
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 預約資訊 */}
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <SectionTitle>預約資訊</SectionTitle>
        <div className="mt-3 space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>下單時間：<input type="datetime-local" className="w-full rounded border px-2 py-1" value={createdAtEdit} readOnly /></div>
            <div>建單人：<input className="w-full rounded border px-2 py-1 bg-gray-50" value={order.createdBy || '—'} readOnly /></div>
          </div>
          
          {/* 來源平台和訂單狀態編輯 - 僅管理員和客服可見 */}
          {isAdminOrSupport && (
            <div className="grid grid-cols-2 gap-2">
              <div>來源平台：
                <select className="ml-1 rounded border px-2 py-0.5" value={order.platform||'日'} onChange={async e=>{ await repos.orderRepo.update(order.id, { platform: e.target.value as any }); const o=await repos.orderRepo.get(order.id); setOrder(o) }}>
                  {['日','同','黃','今'].map(p=> <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>訂單狀態：
                <select
                  className="ml-1 rounded border px-2 py-0.5"
                  value={order.status}
                  onChange={async (e)=>{
                    const v = e.target.value as any
                    const patch: any = { status: v }
                    
                    // 建單人：若尚未有建單人且切換到「已確認」，鎖定為當前使用者
                    if (v==='confirmed' && !order.createdBy) patch.createdBy = user?.name || user?.email || '系統'
                    
                    // 自動設定完成時間
                    if (v === 'completed' && !order.workCompletedAt) {
                      patch.workCompletedAt = new Date().toISOString()
                    }
                    // 已結案時設定結案時間
                    if (v === 'closed' && !order.closedAt) {
                      patch.closedAt = new Date().toISOString()
                    }
                    // 防呆：未開始不能直接完工/結案；未完工不能結案
                    if (v==='completed' && order.status!=='in_progress') { alert('需先「開始服務」才可標記完工'); return }
                    if (v==='closed' && order.status!=='completed') { alert('需先標記完工，並完成雙簽名、照片與付款，才可結案'); return }
                    await repos.orderRepo.update(order.id, patch)
                    const o = await repos.orderRepo.get(order.id)
                    setOrder(o)
                    // 取消訂單時：自動退回已扣積分（冪等）
                    if (v==='canceled') {
                      try {
                        const payload: any = { orderId: String(order.id) }
                        if (order.memberId) payload.memberId = String(order.memberId)
                        if (memberCode) payload.memberCode = String(memberCode)
                        if (order.customerEmail) payload.memberEmail = String(order.customerEmail).toLowerCase()
                        if (order.customerPhone) payload.phone = String(order.customerPhone)
                        await fetch('/_api/points/refund-order', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
                      } catch {}
                    }
                  }}
                >
                  <option value="draft">待確認</option>
                  <option value="confirmed">已確認</option>
                  <option value="in_progress">服務中</option>
                  <option value="unservice">無法服務</option>
                  <option value="completed">已完工</option>
                  <option value="closed">已結案</option>
                  <option value="canceled">已取消</option>
                </select>
              </div>
            </div>
          )}
          <div>服務日期：
            <div className="mt-1 grid grid-cols-3 gap-2">
              <input type="date" className="rounded border px-2 py-1" value={dateEdit} disabled={isTechnician || isClosed} onChange={e=>setDateEdit(e.target.value)} onBlur={async()=>{ if(isTechnician || isClosed) return; await repos.orderRepo.update(order.id, { preferredDate: dateEdit }); const o=await repos.orderRepo.get(order.id); setOrder(o) }} />
              <input type="time" className="rounded border px-2 py-1" value={startEdit} disabled={isTechnician || isClosed} onChange={e=>setStartEdit(e.target.value)} onBlur={async()=>{ if(isTechnician || isClosed) return; await repos.orderRepo.update(order.id, { preferredTimeStart: startEdit }); const o=await repos.orderRepo.get(order.id); setOrder(o) }} />
              <input type="time" className="rounded border px-2 py-1" value={endEdit} disabled={isTechnician || isClosed} onChange={e=>setEndEdit(e.target.value)} onBlur={async()=>{ if(isTechnician || isClosed) return; await repos.orderRepo.update(order.id, { preferredTimeEnd: endEdit }); const o=await repos.orderRepo.get(order.id); setOrder(o) }} />
            </div>
          </div>
          <div className="text-xs text-gray-700">
            會員：
            {(can(user,'orders.update') && (user?.role==='admin' || user?.role==='support')) ? (
              <span className="inline-flex items-center gap-2">
                <input className="rounded border px-2 py-1 text-sm" placeholder="輸入 MOxxxx" value={memberCode} onChange={e=>setMemberCode(e.target.value)} />
                <button className="rounded bg-gray-900 px-2 py-1 text-white" onClick={async()=>{
                  const code = (memberCode||'').trim().toUpperCase()
                  if (!code) {
                    await repos.orderRepo.update(order.id, { memberId: undefined })
                    const o=await repos.orderRepo.get(order.id); setOrder(o)
                    alert('已取消綁定')
                    return
                  }
                  if (!code.startsWith('MO')) { alert('請輸入有效的會員編號（MOxxxx）'); return }
                  try {
                    const m = await repos.memberRepo.findByCode(code)
                    if (!m) { alert('查無此會員編號'); return }
                    await repos.orderRepo.update(order.id, { memberId: m.id })
                    // 嘗試以統一 API 讀取會員資料並帶入客戶欄位
                    try {
                      const q = new URLSearchParams({ memberId: String(m.id) })
                      const r = await fetch(`/_api/member/profile?${q.toString()}`)
                      const j = await r.json()
                      if (j?.success && j.data) {
                        const name = String(j.data.name||'')
                        const phone = String(j.data.phone||'')
                        const email = String(j.data.email||'')
                        const address = `${j.data.city||''}${j.data.district||''}${j.data.address||''}`
                        const patch: any = {}
                        if (name) patch.customerName = name
                        if (phone) patch.customerPhone = phone
                        if (email) patch.customerEmail = email
                        if (address) patch.customerAddress = address
                        if (Object.keys(patch).length>0) {
                          await repos.orderRepo.update(order.id, patch)
                        }
                      }
                    } catch {}
                    const o=await repos.orderRepo.get(order.id)
                    setOrder(o)
                    alert('已綁定會員並帶入個人資料')
                  } catch {
                    alert('綁定失敗')
                  }
                }}>儲存</button>
                {memberCode && <button className="rounded bg-gray-100 px-2 py-1" onClick={()=>navigator.clipboard?.writeText(memberCode)}>複製MO</button>}
              </span>
            ) : (
              <span>{memberCode || '—'}{memberName ? `（${memberName}）` : ''}</span>
            )}
          </div>
          {/* 指派技師 */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">指派技師</div>
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span>已指派：</span>
                <button 
                  onClick={() => {
                    try {
                      const params = new URLSearchParams({
                        orderId: String(order.id||''),
                        date: String(order.preferredDate||''),
                        start: String(order.preferredTimeStart||''),
                        end: String(order.preferredTimeEnd||'')
                      }).toString()
                      navigate(`/schedule?${params}`)
                    } catch {
                      navigate(`/schedule?orderId=${order.id}`)
                    }
                  }}
                  className="rounded bg-brand-500 px-3 py-1 text-white text-xs"
                >
                  選擇技師
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {order.assignedTechnicians?.length > 0 ? (
                  order.assignedTechnicians.map((tech: string, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded bg-white p-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={order.signatureTechnician === tech}
                          onChange={async (e)=>{
                            try{
                              const val = e.target.checked ? tech : ''
                              await repos.orderRepo.update(order.id, { signatureTechnician: val as any })
                              const o = await repos.orderRepo.get(order.id)
                              setOrder(o)
                            }catch{ alert('更新簽名技師失敗') }
                          }}
                        />
                        <span>{tech}</span>
                      </label>
                      <button 
                        onClick={async () => {
                          const newTechs = [...(order.assignedTechnicians || [])]
                          newTechs.splice(i, 1)
                          const patch: any = { assignedTechnicians: newTechs }
                          if (order.signatureTechnician === tech) patch.signatureTechnician = ''
                          await repos.orderRepo.update(order.id, patch)
                          const o = await repos.orderRepo.get(order.id)
                          setOrder(o)
                        }}
                        className="rounded bg-red-100 px-2 py-1 text-xs text-red-600"
                      >
                        移除
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">尚未指派技師</div>
                )}
              </div>
            </div>
          </div>

          {/* 簽名技師選擇已整合到上方指派清單（勾選） */}
          {order.status==='draft' && can(user,'orders.update') && (
            <div className="mt-3 text-right">
              <button
                onClick={async()=>{
                  if(!order.customerName || !order.customerPhone){ alert('請填寫客戶姓名與手機'); return }
                  if(!order.serviceItems || order.serviceItems.length===0){ alert('請新增至少一個服務項目'); return }
                  if(!order.preferredDate || !order.preferredTimeStart || !order.preferredTimeEnd){ alert('請填寫服務日期與時段'); return }
                  const { confirmTwice } = await import('../kit');
                  if (!(await confirmTwice('確認建單完成？','確認後訂單進入待服務（僅能取消）。是否繼續？'))) return
                  if ((repos.orderRepo as any).confirmWithMemberNotify) {
                    await (repos.orderRepo as any).confirmWithMemberNotify(order.id)
                  } else {
                    await repos.orderRepo.confirm(order.id)
                  }
                  const o=await repos.orderRepo.get(order.id); setOrder(o); alert('已確認，已發送通知')
                }}
                className="inline-block rounded-xl bg-blue-600 px-4 py-2 text-white"
              >確認（建單完成）</button>
            </div>
          )}
        </div>
      </div>

      {/* 簽名 */}
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <SectionTitle>簽名</SectionTitle>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {/* 技師簽名 */}
          <div className="rounded border p-2">
            <div className="text-xs text-gray-600">技師簽名</div>
            <div className="mt-1 flex items-center gap-2">
              {Array.isArray(signCandidates) && signCandidates.length>0 ? (
                <>
                  <select
                    className="rounded-lg border px-2 py-1 text-sm"
                    value={order.signatureTechnician || ''}
                    onChange={async (e) => { try { const val=e.target.value; if(val===(order.signatureTechnician||'')) return; await repos.orderRepo.update(order.id, { signatureTechnician: val }); const o=await repos.orderRepo.get(order.id); setOrder(o) } catch { alert('更新簽名技師失敗') } }}
                    disabled={hasTechSignature}
                  >
                    <option value="">請選擇</option>
                    {signCandidates.map((n: string, i: number) => (<option key={i} value={n}>{n}</option>))}
                  </select>
                  <div className={`h-16 w-32 cursor-pointer rounded border ${hasTechSignature?'bg-white':'bg-gray-50'}`} onClick={async()=>{ if(hasTechSignature) return; if(!order.signatureTechnician){ const c = signCandidates||[]; if (c.length===1){ try{ await repos.orderRepo.update(order.id, { signatureTechnician: c[0] }); const o=await repos.orderRepo.get(order.id); setOrder(o); setSignAs('technician'); setSignOpen(true) }catch{ alert('自動設定簽名技師失敗') } return } alert('請先在「已指派」列表的勾選框選擇簽名技師'); return } setSignAs('technician'); setSignOpen(true) }}>
                    {hasTechSignature && (order as any)?.signatures?.technician ? (
                      <img src={(order as any).signatures.technician} className="h-full w-full object-contain" />
                    ) : (
                      <div className="grid h-full place-items-center text-[11px] text-gray-500">點擊簽名</div>
                    )}
                  </div>
                  {hasTechSignature ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700">已簽名</span> : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">未簽名</span>}
                </>
              ) : (
                <span className="text-xs text-amber-700">尚未指派技師</span>
              )}
            </div>
          </div>
          {/* 客戶簽名 */}
          <div className="rounded border p-2">
            <div className="text-xs text-gray-600">客戶簽名</div>
            <div className="mt-1 flex items-center gap-2">
            <div className={`h-16 w-32 cursor-pointer rounded border ${hasCustomerSignature?'bg-white':'bg-gray-50'}`} onClick={()=>{ if(hasCustomerSignature) return; if(order.status!=='completed'){ alert('需於服務完成後由客戶簽名'); return } setSignAs('customer'); setPromiseOpen(true) }}>
                {hasCustomerSignature && (order as any)?.signatures?.customer ? (
                  <img src={(order as any).signatures.customer} className="h-full w-full object-contain" />
                ) : (
                  <div className="grid h-full place-items-center text-[11px] text-gray-500">點擊簽名</div>
                )}
              </div>
              {hasCustomerSignature ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700">已簽名</span> : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">未簽名</span>}
            </div>
          </div>
        </div>
      </div>

      {/* 電子發票編輯與一鍵送出 */}
      {invoiceOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-card">
            <div className="mb-2 text-lg font-semibold">電子發票</div>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-gray-600 mb-1">買受人姓名/公司</div>
                  <input className="w-full rounded border px-2 py-1" value={invoiceBuyerName} onChange={e=>setInvoiceBuyerName(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Email</div>
                  <input className="w-full rounded border px-2 py-1" value={invoiceEmail} onChange={e=>setInvoiceEmail(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-gray-600 mb-1">抬頭</div>
                  <input className="w-full rounded border px-2 py-1" value={invoiceCompanyTitle} onChange={e=>setInvoiceCompanyTitle(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">統一編號</div>
                  <input className="w-full rounded border px-2 py-1" value={invoiceTaxId} onChange={e=>setInvoiceTaxId(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-gray-600 mb-1">手機載具（/開頭8碼）</div>
                  <input className="w-full rounded border px-2 py-1" placeholder="/1234ABCD" value={invoiceCarrierPhone} onChange={e=>setInvoiceCarrierPhone(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">會員/訂單編號載具</div>
                  <input className="w-full rounded border px-2 py-1" value={invoiceOrderCode} onChange={e=>setInvoiceOrderCode(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-700">
                <label className="inline-flex items-center gap-1">
                  <input type="checkbox" checked={invoiceDonation} onChange={e=>setInvoiceDonation(e.target.checked)} />捐贈發票
                </label>
                <label className="inline-flex items-center gap-1">
                  單價含稅
                  <select className="rounded border px-2 py-0.5" value={invoiceTaxState} onChange={e=>setInvoiceTaxState(e.target.value as any)}>
                    <option value="0">含稅</option>
                    <option value="1">未稅</option>
                  </select>
                </label>
              </div>

              {/* 預覽金額與品項（可編輯） */}
              <div>
                <div className="text-xs text-gray-600 mb-1">品項</div>
                <div className="space-y-1">
                  {(order.serviceItems||[]).map((it:any, i:number)=>{
                    return (
                      <div key={i} className="grid grid-cols-5 items-center gap-2">
                        <input className="col-span-2 rounded border px-2 py-1" value={it.name} onChange={e=>{ const arr=[...(order.serviceItems||[])]; arr[i] = { ...arr[i], name: e.target.value }; setOrder({ ...order, serviceItems: arr }); }} />
                        <input type="number" className="rounded border px-2 py-1" value={it.quantity} onChange={e=>{ const arr=[...(order.serviceItems||[])]; arr[i] = { ...arr[i], quantity: Number(e.target.value)||1 }; setOrder({ ...order, serviceItems: arr }); }} />
                        <input type="number" className="rounded border px-2 py-1" value={it.unitPrice} onChange={e=>{ const arr=[...(order.serviceItems||[])]; arr[i] = { ...arr[i], unitPrice: Number(e.target.value)||0 }; setOrder({ ...order, serviceItems: arr }); }} />
                        <div className="text-right text-xs text-gray-600">{(it.quantity||0)*(it.unitPrice||0)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="text-right text-sm font-semibold">結案金額：{(order.serviceItems||[]).reduce((s:number,it:any)=> s + it.unitPrice*it.quantity, 0) - (order.pointsDeductAmount||0)}</div>
            </div>
            <div className="mt-3 flex justify-between gap-2">
              <button onClick={()=>setInvoiceOpen(false)} className="rounded bg-gray-100 px-3 py-1">取消</button>
              <button
                onClick={async()=>{
                  try{
                    const svc = await import('../../services/eInvoice')
                    const amount = (order.serviceItems||[]).reduce((s:number,it:any)=> s + it.unitPrice*it.quantity, 0) - (order.pointsDeductAmount||0)
                    const payload = {
                      orderId: order.id,
                      buyer: { name: invoiceBuyerName, email: invoiceEmail, phone: order.customerPhone||'' },
                      items: (order.serviceItems||[]).map((it:any)=>({ name: it.name, quantity: it.quantity, unitPrice: it.unitPrice })),
                      amount,
                      donation: invoiceDonation,
                      phoneCarrier: invoiceCarrierPhone,
                      orderCode: invoiceOrderCode,
                      note: (order as any).note || ''
                    }
                    let res: any
                    if (invoiceTaxId) {
                      // B2B
                      res = await (svc as any).EInvoice.createB2B({
                        buyer: { companyName: invoiceCompanyTitle||invoiceBuyerName, taxId: invoiceTaxId, email: invoiceEmail },
                        items: payload.items,
                        totalFee: amount,
                        amount: Math.round(amount - amount/1.05),
                        sales: Math.round(amount/1.05),
                        taxState: invoiceTaxState
                      })
                    } else {
                      // B2C
                      res = await (svc as any).EInvoice.createB2C(payload)
                    }
                    const code = res?.invoiceNumber || res?.code
                    if (!code) { throw new Error(res?.error || '開立失敗（供應商未回傳發票號）') }
                    // 先本地即時反映，再落盤並嘗試讀回
                    try { setOrder((prev:any)=> prev ? { ...prev, invoiceCode: code, invoiceStatus: 'issued' } : prev) } catch {}
                    await repos.orderRepo.update(order.id, { invoiceCode: code, invoiceStatus: 'issued' as any })
                    try { const o = await repos.orderRepo.get(order.id); if (o) setOrder(o) } catch {}
                    setInvoiceOpen(false)
                    alert('已開立電子發票：' + code)
                  }catch(err:any){ alert('開立失敗：' + (err?.message||'未知錯誤')) }
                }}
                className="rounded bg-gray-900 px-3 py-1 text-white"
              >一鍵送出</button>
            </div>
          </div>
        </div>
      )}

      {/* 簽名畫布：技師/客戶通用 */}
      <SignatureModal
        open={signOpen}
        onClose={()=>setSignOpen(false)}
        onSave={async (dataUrl)=>{
          try {
            const signatures = { ...(order.signatures||{}), [signAs]: dataUrl }
            await repos.orderRepo.update(order.id, { signatures })
            // 若為「無法服務」流程的簽名，落盤：狀態=unservice、備註加入原因、加入車馬費與服務費減項
            try {
              if (unserviceConfirmPending && signAs === 'customer') {
                const addFare = unserviceFare === 'fare400'
                const items = Array.isArray(order.serviceItems) ? [...order.serviceItems] : []
                // 產生減項：針對現有正向服務品項（排除車馬費與既有減項）建立負數數量
                const hasExistingDeductions = items.some((x:any)=> typeof x?.name==='string' && x.name.startsWith('減項：'))
                if (!hasExistingDeductions) {
                  const deductions = items
                    .filter((x:any)=> {
                      const n = String(x?.name||'')
                      const isFare = n.includes('車馬費')
                      const isDed = n.startsWith('減項：')
                      const qty = Number(x?.quantity||0)
                      const price = Number(x?.unitPrice||0)
                      return !isFare && !isDed && qty>0 && price>=0
                    })
                    .map((x:any)=> ({ name: `減項：${String(x.name)}`, quantity: -Math.abs(Number(x.quantity)||1), unitPrice: Number(x.unitPrice)||0 } as any))
                  if (deductions.length>0) items.push(...deductions)
                }
                // 加入車馬費
                if (addFare) { items.push({ name: '車馬費$400', quantity: 1, unitPrice: 400 } as any) }
                else { items.push({ name: '車馬費$0', quantity: 1, unitPrice: 0 } as any) }
                const prevNote = (order as any).note || ''
                const tag = addFare ? '（含車馬費$400）' : ''
                const merged = `${prevNote ? prevNote + '\n' : ''}[無法服務] ${unserviceReason}${tag}`.trim()
                await repos.orderRepo.update(order.id, { status: 'unservice' as any, note: merged, serviceItems: items, closedAt: new Date().toISOString() })
                try {
                  // 同步以 Functions 依淨額入點（避免前端計算偏差）
                  await fetch('/_api/points/apply-order', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ memberId: order.memberId, orderId: order.id, items, pointsDeductAmount: Number(order.pointsDeductAmount||0) })
                  })
                } catch {}
                setUnserviceOpen(false)
                setUnserviceConfirmPending(false)
              }
            } catch {}
            const o = await repos.orderRepo.get(order.id)
            setOrder(o)
          } finally {
            setSignOpen(false)
          }
        }}
      />

      {/* 已移除簽名技師快速選擇彈窗，改為在已指派列表勾選 */}

      {/* 現金收款簽名：簽完即標記已收款 */}
      <SignatureModal
        open={paySignOpen}
        onClose={()=>setPaySignOpen(false)}
        onSave={async (dataUrl)=>{
          try {
            const signatures = { ...(order.signatures||{}), technician: dataUrl }
            await repos.orderRepo.update(order.id, { signatures, paymentStatus: 'paid' as any })
            const o = await repos.orderRepo.get(order.id)
            setOrder(o)
            alert('已簽名並標記為已收款')
          } finally {
            setPaySignOpen(false)
          }
        }}
      />

      {/* 服務進度 */
      }
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <SectionTitle>服務進度</SectionTitle>
        <div className="mt-3 flex flex-col gap-3">
          {/* 時間顯示 */}
          <div className="grid grid-cols-1 gap-2 text-sm text-gray-700 md:grid-cols-2">
            <div>開始時間：<span className="font-mono">{order.workStartedAt ? new Date(order.workStartedAt).toLocaleString() : '—'}</span></div>
            <div>完成時間：<span className="font-mono">{order.workCompletedAt ? new Date(order.workCompletedAt).toLocaleString() : '—'}</span></div>
          </div>
          {order.status==='in_progress' && timeLeftSec>0 && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700">
              已開始服務；完成前冷卻倒數：
              <span className="ml-2 rounded bg-white px-2 py-0.5 font-mono">
                {String(Math.floor(timeLeftSec/60)).padStart(2,'0')}:{String(timeLeftSec%60).padStart(2,'0')}
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button 
              disabled={order.status!=='confirmed'}
              onClick={async()=>{
                if (order.status!=='confirmed') return
                if (!confirm('是否確認開始服務？')) return
                const now = new Date().toISOString()
                try {
                  if ((repos.orderRepo as any).startWork) {
                    await (repos.orderRepo as any).startWork(order.id, now)
                  } else {
                    await repos.orderRepo.update(order.id, { status: 'in_progress', workStartedAt: now })
                  }
                } catch(e:any) {
                  alert('開始服務失敗：' + (e?.message||'請稍後再試'))
                  return
                }
                const o=await repos.orderRepo.get(order.id); setOrder(o)
              // 已移除：避免通知過於頻繁
              }}
              className={`rounded px-3 py-1 text-white ${order.status==='confirmed' ? 'bg-brand-500' : 'bg-gray-300 cursor-not-allowed'}`}
            >
              開始服務
              {order.workStartedAt && (
                <span className="ml-2 text-xs">
                  {new Date(order.workStartedAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}號 {new Date(order.workStartedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </button>
            <button
              disabled={order.status!=='in_progress' || timeLeftSec>0}
              title={order.status!=='in_progress' ? '尚未開始服務' : (timeLeftSec>0 ? `冷卻中，剩餘 ${String(Math.floor(timeLeftSec/60)).padStart(2,'0')}:${String(timeLeftSec%60).padStart(2,'0')}` : '')}
              onClick={async()=>{
                if (order.status!=='in_progress' || timeLeftSec>0) return
                if (!confirm('是否確認服務完成？')) return
                const now = new Date().toISOString()
                await repos.orderRepo.update(order.id, { 
                  status: 'completed', 
                  workCompletedAt: now
                })
                const o=await repos.orderRepo.get(order.id); setOrder(o)
                // 已移除：避免通知過於頻繁
              }}
              className={`rounded px-3 py-1 text-white ${(order.status==='in_progress' && timeLeftSec===0)?'bg-green-600':'bg-green-400/60 cursor-not-allowed'}`}
            >
              服務完成
              {order.workCompletedAt && (
                <span className="ml-2 text-xs">
                  {new Date(order.workCompletedAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}號 {new Date(order.workCompletedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </button>
            <button
              disabled={!canClose}
              title={canClose ? '' : closeDisabledReason}
              onClick={async()=>{
                if (!hasSignature) { alert('請先完成客戶與技師雙簽名'); return }
                if (!confirm('是否確認服務完成並結案？')) return
                // 直接設定為已結案狀態，並觸發積分計算
                const now = new Date().toISOString()
                await repos.orderRepo.update(order.id, { 
                  status: 'closed', 
                  workCompletedAt: order.workCompletedAt || now,
                  closedAt: now
                })
                try {
                  // 確保會員存在（自動建立 MO+4）
                  try {
                    const qp = new URLSearchParams()
                    if (order.memberId) qp.set('memberId', String(order.memberId))
                    if (memberCode) qp.set('memberCode', String(memberCode))
                    if (order.customerEmail) qp.set('memberEmail', String(order.customerEmail).toLowerCase())
                    if (order.customerPhone) qp.set('phone', String(order.customerPhone))
                    await fetch(`/_api/member/profile?${qp.toString()}`)
                  } catch {}
                  // 先扣除本單使用的積分（若有）
                  try {
                    const used = Number(order.pointsUsed||0)
                    if (used > 0) {
                      const payload:any = { orderId: String(order.id), points: used }
                      if (order.memberId) payload.memberId = String(order.memberId)
                      if (memberCode) payload.memberCode = String(memberCode)
                      if (order.customerEmail) payload.memberEmail = String(order.customerEmail).toLowerCase()
                      if (order.customerPhone) payload.phone = String(order.customerPhone)
                      await fetch('/_api/points/use-on-create', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
                    }
                  } catch {}
                  // 再建立結案回饋（待入點）
                  const fresh = await repos.orderRepo.get(order.id)
                  const items = (fresh?.serviceItems || order.serviceItems || []).map((it:any)=> ({ name: it.name, quantity: Number(it.quantity)||0, unitPrice: Number(it.unitPrice)||0 }))
                  const payload:any = {
                    orderId: String(order.id),
                    items,
                    pointsDeductAmount: Number(order.pointsDeductAmount||0)
                  }
                  if (fresh?.memberId || order.memberId) payload.memberId = String(fresh?.memberId || order.memberId)
                  if (memberCode) payload.memberCode = String(memberCode)
                  if (fresh?.customerEmail || order.customerEmail) payload.memberEmail = String((fresh?.customerEmail || order.customerEmail)||'').toLowerCase()
                  if (fresh?.customerPhone || order.customerPhone) payload.phone = String((fresh?.customerPhone || order.customerPhone)||'')
                  await fetch('/_api/points/apply-order', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) }).catch(()=>{})
                } catch (e) { console.warn('apply points (pending) failed', e) }
                const o=await repos.orderRepo.get(order.id); setOrder(o)
                // 已移除：避免通知過於頻繁
              }}
              className={`rounded px-3 py-1 text-white ${canClose? 'bg-gray-900' : 'bg-gray-400 cursor-not-allowed'}`}
            >結案</button>
          </div>
          {!canClose && (
            <div className="mt-2 text-xs text-rose-600">
              無法結案原因：{closeDisabledReason || '條件不足'}
            </div>
          )}
        </div>
      </div>

      {/* 服務照片 */}
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <SectionTitle>服務照片</SectionTitle>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 font-semibold">清洗前 <span className="text-xs text-gray-500">({(order.photosBefore||[]).length}/24)</span></div>
            <PhotoGrid
              urls={order.photosBefore || []}
              deletable={!isClosed && (user?.role==='admin' || user?.role==='support' || user?.role==='technician')}
              onDelete={async (idx:number)=>{
                try{
                  if (isClosed) return
                  if (!confirm('確認刪除這張照片？')) return
                  if (!confirm('再確認一次，是否確定刪除？')) return
                  const arr = Array.isArray(order.photosBefore) ? [...order.photosBefore] : []
                  arr.splice(idx,1)
                  await repos.orderRepo.update(order.id, { photosBefore: arr })
                  const o = await repos.orderRepo.get(order.id); setOrder(o)
                }catch{ alert('刪除失敗，請重試') }
              }}
            />
            <div className="mt-2 text-sm">
              <input type="file" accept="image/*" multiple disabled={uploadingBefore} onChange={async (e)=>{
                const files = Array.from(e.target.files || [])
                const exist = order.photosBefore?.length || 0
                const room = Math.max(0, 24 - exist)
                if (files.length > room) { alert(`清洗前照片上限 24 張，尚可新增 ${room} 張。`); return }
                const imgs: string[] = []
                try{
                  setUploadingBefore(true)
                  for (const f of files) imgs.push(await compressImageToDataUrl(f, 200))
                  await repos.orderRepo.update(order.id, { photosBefore: [ ...(order.photosBefore||[]), ...imgs ] })
                  const o = await repos.orderRepo.get(order.id); setOrder(o)
                } finally { setUploadingBefore(false) }
              }} />
              <div className="mt-1 text-xs text-gray-500">{uploadingBefore?'上傳中… ':''}最多 24 張，單張壓縮後 ≦ 200KB</div>
            </div>
          </div>
          <div>
            <div className="mb-1 font-semibold">清洗後 <span className="text-xs text-gray-500">({(order.photosAfter||[]).length}/24)</span></div>
            <PhotoGrid
              urls={order.photosAfter || []}
              deletable={!isClosed && (user?.role==='admin' || user?.role==='support' || user?.role==='technician')}
              onDelete={async (idx:number)=>{
                try{
                  if (isClosed) return
                  if (!confirm('確認刪除這張照片？')) return
                  if (!confirm('再確認一次，是否確定刪除？')) return
                  const arr = Array.isArray(order.photosAfter) ? [...order.photosAfter] : []
                  arr.splice(idx,1)
                  await repos.orderRepo.update(order.id, { photosAfter: arr })
                  const o = await repos.orderRepo.get(order.id); setOrder(o)
                }catch{ alert('刪除失敗，請重試') }
              }}
            />
            <div className="mt-2 text-sm">
              <input type="file" accept="image/*" multiple disabled={uploadingAfter} onChange={async (e)=>{
                const files = Array.from(e.target.files || [])
                const exist = order.photosAfter?.length || 0
                const room = Math.max(0, 24 - exist)
                if (files.length > room) { alert(`清洗後照片上限 24 張，尚可新增 ${room} 張。`); return }
                const imgs: string[] = []
                try{
                  setUploadingAfter(true)
                  for (const f of files) imgs.push(await compressImageToDataUrl(f, 200))
                  await repos.orderRepo.update(order.id, { photosAfter: [ ...(order.photosAfter||[]), ...imgs ] })
                  const o = await repos.orderRepo.get(order.id); setOrder(o)
                } finally { setUploadingAfter(false) }
              }} />
              <div className="mt-1 text-xs text-gray-500">{uploadingAfter?'上傳中… ':''}最多 24 張，單張壓縮後 ≦ 200KB</div>
            </div>
          </div>
        </div>

      </div>

      {/* 備註欄位 */}
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <SectionTitle>備註</SectionTitle>
        <div className="mt-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={async () => { if ((order.note||'')===note) return; await repos.orderRepo.update(order.id, { note }); const o=await repos.orderRepo.get(order.id); setOrder(o) }}
            placeholder="請輸入備註內容..."
            className="w-full rounded-lg border px-3 py-2 text-sm"
            rows={4}
          />
        </div>
        {isAdminOrSupport && (
          <div className="mt-4">
            <div className="mb-1 text-sm font-medium text-gray-700">客服備註（僅客服/管理員可見）</div>
            <textarea
              value={supportNote}
              onChange={(e)=> setSupportNote(e.target.value)}
              onBlur={async()=>{ if (((order as any).supportNote||'')===supportNote) return; await repos.orderRepo.update(order.id, { supportNote: supportNote as any }); const o=await repos.orderRepo.get(order.id); setOrder(o) }}
              placeholder="內部客服備註，客戶與技師不會看到"
              className="w-full rounded-lg border px-3 py-2 text-sm bg-amber-50"
              rows={3}
            />
          </div>
        )}
        
        {/* 無法服務按鈕 */}
        {user?.role !== 'technician' && (
          <div className="mt-3 text-right">
            <button 
              onClick={() => setUnserviceOpen(true)} 
              className="rounded bg-amber-600 px-3 py-1 text-white"
            >
              無法服務
            </button>
          </div>
        )}
      </div>

      {promiseOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-card">
            <div className="mb-2 text-lg font-semibold">{signAs === 'customer' ? '客戶簽名前：我們的承諾' : '開始服務前：我們的承諾'}</div>
            <div className="text-center">
              <img
                alt="我們的承諾 QR"
                className="mx-auto h-40 w-40 rounded bg-white p-2"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent('https://www.942clean.com.tw/%E5%86%B7%E6%B0%A3%E6%B8%85%E6%B4%97')}`}
              />
              <a
                href="https://www.942clean.com.tw/%E5%86%B7%E6%B0%A3%E6%B8%85%E6%B4%97"
                target="_blank" rel="noreferrer"
                className="mt-2 inline-block text-xs text-brand-600 underline"
              >前往查看我們的承諾</a>
            </div>
            <div className="mt-3 max-h-56 space-y-2 overflow-auto text-left text-sm text-gray-700">
              <p>一、10年(不含第10年)內機器。保固三個月，保固後三個月內有問題免費前往查看檢測。</p>
              <p>二、13年(不含第13年)內機器。保固三個月，保固期內若已無法維修提供換機購物金。</p>
              <p>三、13年以上機器，無法提供保固及購物金，請見諒。</p>
              <p>免責1：現場技師判斷機況較差，可能會婉拒施作，避免後續爭議。</p>
              <p>免責2：10年以上機器，部分塑料配件可能脆化導致斷裂，在可正常運作下不在保固範圍。</p>
              <p>免責3：家電機齡以製造年月起算，無法查看者可能以13年以上計。</p>
              <p>免責4：排水管高壓沖洗疏通，如因堵塞導致滴水，不在保固範圍。</p>
            </div>
            <div className="mt-3 flex justify-between gap-2">
              <button onClick={()=>setPromiseOpen(false)} className="rounded bg-gray-100 px-3 py-1">取消</button>
              <button onClick={async()=>{ 
                setPromiseOpen(false); 
                if (signAs === 'customer') {
                  // 客戶簽名流程：先看承諾，再開啟簽名畫布
                  setSignOpen(true);
                } else {
                  // 技師開始服務流程
                  const nowIso=new Date().toISOString(); 
                  await repos.orderRepo.startWork(order.id, nowIso); 
                  const o=await repos.orderRepo.get(order.id); 
                  setOrder(o); 
                  try{ alert('已開始服務：'+ new Date(nowIso).toLocaleString()) }catch{} 
                }
              }} className="rounded bg-brand-500 px-3 py-1 text-white">{signAs === 'customer' ? '我知道了，開始簽名' : '我知道了，開始'}</button>
            </div>
          </div>
        </div>
      )}
      {unserviceOpen && !signOpen && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-card">
            <div className="text-lg font-semibold">無法服務</div>
            <div className="mt-2 text-sm text-gray-700">請選擇車馬費：</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <button onClick={()=>setUnserviceFare('none')} className={`rounded px-3 py-2 ${unserviceFare==='none'?'bg-amber-600 text-white':'bg-gray-100'}`}>不收取（$0）</button>
              <button onClick={()=>setUnserviceFare('fare400')} className={`rounded px-3 py-2 ${unserviceFare==='fare400'?'bg-amber-600 text-white':'bg-gray-100'}`}>收取（$400）</button>
            </div>
            <div className="mt-3 text-sm text-gray-700">請填寫原因：</div>
            <textarea value={unserviceReason} onChange={e=>setUnserviceReason(e.target.value)} rows={3} className="mt-1 w-full rounded border px-2 py-1 text-sm" placeholder="例如：現場設備故障/客戶臨時不在等" />
            <div className="mt-3 flex justify-between gap-2">
              <button onClick={()=>setUnserviceOpen(false)} className="rounded bg-gray-100 px-3 py-1">取消</button>
              <button onClick={async()=>{ if(!unserviceReason.trim()){ alert('請填寫原因'); return } setUnserviceConfirmPending(true); setSignAs('customer'); setUnserviceOpen(false); setTimeout(()=> setSignOpen(true), 50) }} className="rounded bg-amber-600 px-3 py-1 text-white">客戶簽名確認</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


