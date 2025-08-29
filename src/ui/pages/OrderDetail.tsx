import { SectionTitle, StatusChip, PhotoGrid } from '../kit'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { authRepo } from '../../adapters/local/auth'
import { can } from '../../utils/permissions'
import { useEffect, useState } from 'react'
import { loadAdapters } from '../../adapters'
import { compressImageToDataUrl } from '../../utils/image'
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
  const [note, setNote] = useState<string>(order?.note || '')
  const [unserviceOpen, setUnserviceOpen] = useState(false)
  const [unserviceFare, setUnserviceFare] = useState<'none'|'fare400'>('none')
  const [unserviceReason, setUnserviceReason] = useState('')
  const user = authRepo.getCurrentUser()
  const [repos, setRepos] = useState<any>(null)
  const [techs, setTechs] = useState<any[]>([])
  const [uploadingBefore, setUploadingBefore] = useState(false)
  const [uploadingAfter, setUploadingAfter] = useState(false)
  const navigate = useNavigate()
  useEffect(()=>{ (async()=>{ const a = await loadAdapters(); setRepos(a) })() },[])
  useEffect(() => { if (!repos || !id) return; repos.orderRepo.get(id).then(setOrder) }, [id, repos])
  useEffect(()=>{ (async()=>{ try{ if(!repos) return; if(repos.technicianRepo?.list){ const rows = await repos.technicianRepo.list(); setTechs(rows||[]) } }catch{} })() },[repos])
  useEffect(() => { if (order) setItemsDraft(order.serviceItems || []) }, [order])
  useEffect(()=>{ (async()=>{ try { if (!repos) return; if (order?.memberId) { const m = await repos.memberRepo.get(order.memberId); setMemberCode(m?.code||''); setMemberName(m?.name||''); setMemberPoints(m?.points||0) } else { setMemberCode(''); setMemberName(''); setMemberPoints(0) } } catch {} })() },[order?.memberId, repos])
  useEffect(()=>{
    if (!order) return
    const toLocal = (iso:string) => {
      try { return iso.slice(0,19) + (iso.includes('Z')?'':'') } catch { return '' }
    }
    setCreatedAtEdit(order.createdAt?.slice(0,16).replace('T','T') || new Date().toISOString().slice(0,16))
    setDateEdit(order.preferredDate||'')
    setStartEdit(order.preferredTimeStart||'09:00')
    setEndEdit(order.preferredTimeEnd||'12:00')
    setPayMethod((order.paymentMethod as any) || '')
    setPayStatus((order.paymentStatus as any) || '')
  },[order])
  const [products, setProducts] = useState<any[]>([])
  useEffect(()=>{ (async()=>{ if(!repos) return; setProducts(await repos.productRepo.list()) })() },[repos])
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
  if (!order) return <div>載入中...</div>
  const isAdminOrSupport = user?.role==='admin' || user?.role==='support'
  const isAssignedTech = user?.role==='technician' && Array.isArray(order.assignedTechnicians) && order.assignedTechnicians.includes(user?.name || '')
  const isTechnician = user?.role === 'technician'
  const statusText = (s: string) => s==='draft' ? '草稿' : s==='confirmed' ? '已確認' : s==='in_progress' ? '服務中' : s==='completed' ? '已完成' : s==='canceled' ? '已取消' : s
  const fmt = (n: number) => new Intl.NumberFormat('zh-TW').format(n || 0)
  const subTotal = (order.serviceItems||[]).reduce((s:number,it:any)=>s+it.unitPrice*it.quantity,0)
  const amountDue = Math.max(0, subTotal - (order.pointsDeductAmount||0))
  const hasTechSignature = Boolean(order?.signatures && (order as any).signatures?.technician)
  const hasCustomerSignature = Boolean(order?.signatures && (order as any).signatures?.customer)
  const hasSignature = hasTechSignature && hasCustomerSignature
  const requirePhotosOk = (order.photosBefore?.length||0) > 0 || (order.photosAfter?.length||0) > 0
  // 簽名候選名單：優先用訂單內的 assignedTechnicians，否則回退使用從排程推導的 derivedAssigned
  const signCandidates: string[] = (Array.isArray(order.assignedTechnicians) && order.assignedTechnicians.length>0)
    ? order.assignedTechnicians
    : (derivedAssigned || [])
  const canClose = (
    (order.status==='in_progress' || order.status==='unservice') &&
    timeLeftSec===0 &&
    hasSignature &&
    (!!payMethod || payStatus==='nopay') &&
    (payStatus==='paid' || payStatus==='nopay') &&
    requirePhotosOk
  )
  const closeDisabledReason = (()=>{
    if (!(order.status==='in_progress' || order.status==='unservice')) return '尚未開始/或已標記無法服務'
    if (timeLeftSec>0) return `剩餘 ${String(Math.floor(timeLeftSec/60)).padStart(2,'0')}:${String(timeLeftSec%60).padStart(2,'0')}`
    if (!hasTechSignature || !hasCustomerSignature) return '需完成雙簽名'
    if (!(payStatus==='paid' || payStatus==='nopay')) return '需完成付款或標記不用付款'
    if (!requirePhotosOk) return '需上傳至少一張服務照片'
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
        
        {/* 來源平台調整到上方（僅客服/管理員可修改） */}
        {isAdminOrSupport && (
          <div className="mt-2 text-xs text-gray-600">
            來源平台：
            <select className="ml-1 rounded border px-2 py-0.5" value={order.platform||'日'} onChange={async e=>{ await repos.orderRepo.update(order.id, { platform: e.target.value as any }); const o=await repos.orderRepo.get(order.id); setOrder(o) }}>
              {['日','同','黃','今'].map(p=> <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}
        
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>姓名：<input className="w-full rounded border px-2 py-1" value={customerNameEdit} onChange={e=>setCustomerNameEdit(e.target.value)} onBlur={async()=>{ if (customerNameEdit===order.customerName) return; await repos.orderRepo.update(order.id, { customerName: customerNameEdit }); const o=await repos.orderRepo.get(order.id); setOrder(o) }} /></div>
          <div>手機：<div className="flex gap-2"><input className="w-full rounded border px-2 py-1" value={customerPhoneEdit} onChange={e=>setCustomerPhoneEdit(e.target.value)} onBlur={async()=>{ if (customerPhoneEdit===order.customerPhone) return; await repos.orderRepo.update(order.id, { customerPhone: customerPhoneEdit }); const o=await repos.orderRepo.get(order.id); setOrder(o) }} /><a href={`tel:${order.customerPhone}`} className="rounded bg-brand-500 px-3 py-1 text-white">撥打</a></div></div>
          <div>信箱：<input className="w-full rounded border px-2 py-1" value={customerEmailEdit} onChange={e=>setCustomerEmailEdit(e.target.value)} onBlur={async()=>{ if (customerEmailEdit===(order.customerEmail||'')) return; await repos.orderRepo.update(order.id, { customerEmail: customerEmailEdit }); const o=await repos.orderRepo.get(order.id); setOrder(o) }} /></div>
          <div>抬頭：<input className="w-full rounded border px-2 py-1" value={customerTitleEdit} onChange={e=>setCustomerTitleEdit(e.target.value)} onBlur={async()=>{ if (customerTitleEdit===(order.customerTitle||'')) return; await repos.orderRepo.update(order.id, { customerTitle: customerTitleEdit }); const o=await repos.orderRepo.get(order.id); setOrder(o) }} /></div>
          <div>統編：<input className="w-full rounded border px-2 py-1" value={customerTaxIdEdit} onChange={e=>setCustomerTaxIdEdit(e.target.value)} onBlur={async()=>{ if (customerTaxIdEdit===(order.customerTaxId||'')) return; await repos.orderRepo.update(order.id, { customerTaxId: customerTaxIdEdit }); const o=await repos.orderRepo.get(order.id); setOrder(o) }} /></div>
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
                    className="flex-1 rounded border px-2 py-1" 
                    value={customerAddressEdit} 
                    onChange={e=>setCustomerAddressEdit(e.target.value)} 
                    onBlur={async()=>{ 
                      if (customerAddressEdit===(order.customerAddress||'')) return; 
                      await repos.orderRepo.update(order.id, { customerAddress: customerAddressEdit }); 
                      const o=await repos.orderRepo.get(order.id); 
                      setOrder(o) 
                    }} 
                  />
                  <a 
                    className="rounded bg-gray-100 px-3 py-1" 
                    target="_blank" 
                    href={generateGoogleMapsLink(customerCityEdit, customerDistrictEdit, customerDetailAddressEdit)}
                  >
                    地圖
                  </a>
                </div>
              </div>
          <div>會員編號：<span className="text-gray-700">{memberCode||'—'}</span></div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-card">
        <SectionTitle>服務內容</SectionTitle>
        <div className="mt-3 text-sm">
          {!editItems ? (
            <div className="rounded border">
              <div className="grid grid-cols-4 bg-gray-50 px-2 py-1 text-xs text-gray-600"><div>項目</div><div>數量</div><div>單價</div><div className="text-right">小計</div></div>
              {(order.serviceItems||[]).map((it:any,i:number)=>{
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
                    <select className="col-span-2 rounded border px-2 py-1" value={it.productId||''} onChange={async (e)=>{ const val=e.target.value; const arr=[...itemsDraft]; if(val){ const p = products.find((x:any)=>x.id===val); arr[i]={...arr[i], productId:val, name:p?.name||it.name, unitPrice:p?.unitPrice||it.unitPrice}; } else { arr[i]={...arr[i], productId:undefined}; } setItemsDraft(arr) }}>
                      <option value="">自訂</option>
                      {products.map((p:any)=>(<option key={p.id} value={p.id}>{p.name}（{p.unitPrice}）</option>))}
                    </select>
                    <input className="col-span-2 rounded border px-2 py-1" value={it.name} onChange={e=>{ const arr=[...itemsDraft]; arr[i]={...arr[i], name:e.target.value}; setItemsDraft(arr) }} />
                    <div className="flex items-center gap-2">
                      <button onClick={()=>{ const arr=[...itemsDraft]; const q=Math.max(1, (Number(arr[i].quantity)||1)-1); arr[i]={...arr[i], quantity:q}; setItemsDraft(arr) }} className="rounded bg-gray-100 px-2 py-1">-</button>
                      <input type="number" className="w-16 rounded border px-2 py-1 text-right" value={it.quantity} onChange={e=>{ const arr=[...itemsDraft]; const q = Math.max(1, Number(e.target.value)||1); arr[i]={...arr[i], quantity:q}; setItemsDraft(arr) }} />
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
              <div className="text-right">
                <button onClick={async()=>{ await repos.orderRepo.update(order.id, { serviceItems: itemsDraft }); const o=await repos.orderRepo.get(order.id); setOrder(o); setEditItems(false) }} className="rounded bg-brand-500 px-3 py-1 text-white">儲存</button>
              </div>
            </div>
          )}
          {user?.role!=='technician' && <div className="mt-2 text-right"><button onClick={()=>setEditItems(e=>!e)} className="rounded bg-gray-100 px-2 py-1 text-xs">{editItems?'取消':'編輯項目'}</button></div>}

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
                    await repos.orderRepo.update(order.id, { pointsUsed: value, pointsDeductAmount: value * 10 })
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
                    await repos.orderRepo.update(order.id, { pointsUsed: maxPoints, pointsDeductAmount: maxPoints * 10 })
                    const o = await repos.orderRepo.get(order.id)
                    setOrder(o)
                  }}
                  className="rounded bg-brand-100 px-2 py-1 text-xs text-brand-700 hover:bg-brand-200"
                >
                  全部使用
                </button>
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
                <select className="rounded border px-2 py-1" value={payMethod} onChange={async e=>{ const v = e.target.value as any; setPayMethod(v); setTransferInputOpen(false); await repos.orderRepo.update(order.id, { paymentMethod: v }); const o=await repos.orderRepo.get(order.id); setOrder(o) }}>
                  <option value="">—</option>
                  <option value="cash">現金付款</option>
                  <option value="transfer">銀行轉帳</option>
                  <option value="card">信用卡</option>
                  <option value="applepay">Apple Pay</option>
                </select>
              </div>
              <div>付款狀態：
                <select className="rounded border px-2 py-1" value={payStatus} onChange={async e=>{ const v=e.target.value as any; setPayStatus(v); await repos.orderRepo.update(order.id, { paymentStatus: v }); const o=await repos.orderRepo.get(order.id); setOrder(o) }}>
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
                    <button onClick={()=>{ setSignAs('technician'); setPaySignOpen(true) }} className="rounded bg-gray-900 px-3 py-1 text-white">簽名確認收款</button>
                  )}
                </div>
              </div>
            )}

            {/* 銀行轉帳：QR Code + 輸入金額/後五碼 */}
            {payMethod==='transfer' && (
              <div className="mt-3 rounded-lg bg-gray-50 p-2">
                <div className="mb-1">銀行轉帳：822 QR (示意)</div>
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

            {/* 信用卡/Apple Pay：QR Code */}
            {(payMethod==='card' || payMethod==='applepay') && (
              <div className="mt-3 rounded-lg bg-gray-50 p-2">
                <div className="mb-1">支付 QR (示意)</div>
                <div className="text-[12px] text-gray-600">請客戶掃描 QR Code 完成付款。</div>
                <div className="mt-2">
                  <button className="rounded bg-gray-900 px-3 py-1 text-white">顯示 QR</button>
                </div>
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
            <div />
          </div>
          <div>服務日期：
            <div className="mt-1 grid grid-cols-3 gap-2">
              <input type="date" className="rounded border px-2 py-1" value={dateEdit} disabled={isTechnician} onChange={e=>setDateEdit(e.target.value)} onBlur={async()=>{ if(isTechnician) return; await repos.orderRepo.update(order.id, { preferredDate: dateEdit }); const o=await repos.orderRepo.get(order.id); setOrder(o) }} />
              <input type="time" className="rounded border px-2 py-1" value={startEdit} disabled={isTechnician} onChange={e=>setStartEdit(e.target.value)} onBlur={async()=>{ if(isTechnician) return; await repos.orderRepo.update(order.id, { preferredTimeStart: startEdit }); const o=await repos.orderRepo.get(order.id); setOrder(o) }} />
              <input type="time" className="rounded border px-2 py-1" value={endEdit} disabled={isTechnician} onChange={e=>setEndEdit(e.target.value)} onBlur={async()=>{ if(isTechnician) return; await repos.orderRepo.update(order.id, { preferredTimeEnd: endEdit }); const o=await repos.orderRepo.get(order.id); setOrder(o) }} />
            </div>
          </div>
          <div className="text-xs text-gray-700">
            會員：
            {can(user,'orders.update') ? (
              <span className="inline-flex items-center gap-2">
                <input className="rounded border px-2 py-1 text-sm" placeholder="輸入 MOxxxx" value={memberCode} onChange={e=>setMemberCode(e.target.value)} />
                <button className="rounded bg-gray-900 px-2 py-1 text-white" onClick={async()=>{
                  const code = (memberCode||'').trim().toUpperCase()
                  if (!code) { await repos.orderRepo.update(order.id, { memberId: undefined }); const o=await repos.orderRepo.get(order.id); setOrder(o); alert('已取消綁定'); return }
                  if (!code.startsWith('MO')) { alert('請輸入有效的會員編號（MOxxxx）'); return }
                  try { const m = await repos.memberRepo.findByCode(code); if (!m) { alert('查無此會員編號'); return } await repos.orderRepo.update(order.id, { memberId: m.id }); const o=await repos.orderRepo.get(order.id); setOrder(o); alert('已綁定會員：'+(m.name||'')) } catch { alert('綁定失敗') }
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
                  onClick={() => navigate(`/schedule?orderId=${order.id}&date=${order.preferredDate}&start=${order.preferredTimeStart}&end=${order.preferredTimeEnd}`)}
                  className="rounded bg-brand-500 px-3 py-1 text-white text-xs"
                >
                  選擇技師
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {order.assignedTechnicians?.length > 0 ? (
                  order.assignedTechnicians.map((tech: string, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded bg-white p-2">
                      <span>{tech}</span>
                      <button 
                        onClick={async () => {
                          const newTechs = [...(order.assignedTechnicians || [])]
                          newTechs.splice(i, 1)
                          await repos.orderRepo.update(order.id, { assignedTechnicians: newTechs })
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

          {/* 簽名技師 */}
          {order.assignedTechnicians?.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">簽名技師</div>
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <select 
                  className="w-full rounded border px-2 py-1"
                  value={order.signatureTechnician || ''}
                  onChange={async (e) => {
                    await repos.orderRepo.update(order.id, { signatureTechnician: e.target.value })
                    const o = await repos.orderRepo.get(order.id)
                    setOrder(o)
                  }}
                >
                  <option value="">請選擇簽名技師</option>
                  {order.assignedTechnicians.map((tech: string) => (
                    <option key={tech} value={tech}>{tech}</option>
                  ))}
                </select>
                {order.signatureTechnician && (
                  <div className="mt-2 text-xs text-gray-600">
                    電話：{(() => {
                      const tech = techs.find((t: any) => t.name === order.signatureTechnician)
                      return tech?.phone || '未設定'
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
          {order.status==='draft' && can(user,'orders.update') && (
            <div className="mt-3 text-right">
              <button
                onClick={async()=>{
                  if(!order.customerName || !order.customerPhone){ alert('請填寫客戶姓名與手機'); return }
                  if(!order.serviceItems || order.serviceItems.length===0){ alert('請新增至少一個服務項目'); return }
                  if(!order.preferredDate || !order.preferredTimeStart || !order.preferredTimeEnd){ alert('請填寫服務日期與時段'); return }
                  const { confirmTwice } = await import('../kit');
                  if (!(await confirmTwice('確認建單完成？','確認後訂單進入待服務（僅能取消）。是否繼續？'))) return
                  await repos.orderRepo.confirm(order.id)
                  const o=await repos.orderRepo.get(order.id); setOrder(o); alert('已確認，待服務')
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
                    onChange={async (e) => { const val=e.target.value; await repos.orderRepo.update(order.id, { signatureTechnician: val }); const o=await repos.orderRepo.get(order.id); setOrder(o) }}
                    disabled={hasTechSignature}
                  >
                    <option value="">請選擇</option>
                    {signCandidates.map((n: string, i: number) => (<option key={i} value={n}>{n}</option>))}
                  </select>
                  <div className={`h-16 w-32 cursor-pointer rounded border ${hasTechSignature?'bg-white':'bg-gray-50'}`} onClick={()=>{ if(hasTechSignature) return; if(!order.signatureTechnician){ alert('請先選擇簽名技師'); return } setSignAs('technician'); setSignOpen(true) }}>
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
              <div className={`h-16 w-32 cursor-pointer rounded border ${hasCustomerSignature?'bg-white':'bg-gray-50'}`} onClick={()=>{ if(hasCustomerSignature) return; setSignAs('customer'); setSignOpen(true) }}>
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
          <div className="flex flex-wrap items-center gap-2">
            {order.status==='confirmed' && (
              <button onClick={()=>setPromiseOpen(true)} className="rounded bg-brand-500 px-3 py-1 text-white">開始服務</button>
            )}
            {(order.status==='confirmed' || order.status==='in_progress') && (
              <button onClick={()=>setUnserviceOpen(true)} className="rounded bg-amber-600 px-3 py-1 text-white">無法服務</button>
            )}
            {(order.status==='in_progress' || order.status==='unservice') && (
              <button
                disabled={!canClose}
                title={canClose ? '' : closeDisabledReason}
                onClick={async()=>{
                  if (!hasSignature) { alert('請先完成客戶與技師雙簽名'); return }
                  if (!confirm('是否確認服務完成並結案？')) return
                  await repos.orderRepo.finishWork(order.id, new Date().toISOString())
                  const o=await repos.orderRepo.get(order.id); setOrder(o)
                }}
                className={`rounded px-3 py-1 text-white ${canClose? 'bg-gray-900' : 'bg-gray-400'}`}
              >結案</button>
            )}
          </div>
        </div>
      </div>

      {/* 服務照片 */}
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <SectionTitle>服務照片</SectionTitle>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 font-semibold">清洗前 <span className="text-xs text-gray-500">({(order.photosBefore||[]).length}/8)</span></div>
            <PhotoGrid urls={order.photosBefore || []} />
            <div className="mt-2 text-sm">
              <input type="file" accept="image/*" multiple disabled={uploadingBefore} onChange={async (e)=>{
                const files = Array.from(e.target.files || [])
                const exist = order.photosBefore?.length || 0
                const room = Math.max(0, 8 - exist)
                if (files.length > room) { alert(`清洗前照片上限 8 張，尚可新增 ${room} 張。`); return }
                const imgs: string[] = []
                try{
                  setUploadingBefore(true)
                  for (const f of files) imgs.push(await compressImageToDataUrl(f, 200))
                  await repos.orderRepo.update(order.id, { photosBefore: [ ...(order.photosBefore||[]), ...imgs ] })
                  const o = await repos.orderRepo.get(order.id); setOrder(o)
                } finally { setUploadingBefore(false) }
              }} />
              <div className="mt-1 text-xs text-gray-500">{uploadingBefore?'上傳中… ':''}最多 8 張，單張壓縮後 ≦ 200KB</div>
            </div>
          </div>
          <div>
            <div className="mb-1 font-semibold">清洗後 <span className="text-xs text-gray-500">({(order.photosAfter||[]).length}/8)</span></div>
            <PhotoGrid urls={order.photosAfter || []} />
            <div className="mt-2 text-sm">
              <input type="file" accept="image/*" multiple disabled={uploadingAfter} onChange={async (e)=>{
                const files = Array.from(e.target.files || [])
                const exist = order.photosAfter?.length || 0
                const room = Math.max(0, 8 - exist)
                if (files.length > room) { alert(`清洗後照片上限 8 張，尚可新增 ${room} 張。`); return }
                const imgs: string[] = []
                try{
                  setUploadingAfter(true)
                  for (const f of files) imgs.push(await compressImageToDataUrl(f, 200))
                  await repos.orderRepo.update(order.id, { photosAfter: [ ...(order.photosAfter||[]), ...imgs ] })
                  const o = await repos.orderRepo.get(order.id); setOrder(o)
                } finally { setUploadingAfter(false) }
              }} />
              <div className="mt-1 text-xs text-gray-500">{uploadingAfter?'上傳中… ':''}最多 8 張，單張壓縮後 ≦ 200KB</div>
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
            <div className="mb-2 text-lg font-semibold">開始服務前：我們的承諾</div>
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
              <button onClick={async()=>{ setPromiseOpen(false); const nowIso=new Date().toISOString(); await repos.orderRepo.startWork(order.id, nowIso); const o=await repos.orderRepo.get(order.id); setOrder(o); try{ alert('已開始服務：'+ new Date(nowIso).toLocaleString()) }catch{} }} className="rounded bg-brand-500 px-3 py-1 text-white">我知道了，開始</button>
            </div>
          </div>
        </div>
      )}
      {unserviceOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
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
              <button onClick={async()=>{ if(!unserviceReason.trim()){ alert('請填寫原因'); return } setSignAs('customer'); setSignOpen(true) }} className="rounded bg-amber-600 px-3 py-1 text-white">客戶簽名確認</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


