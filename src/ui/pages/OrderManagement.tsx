import { useEffect, useState } from 'react'
import { getActivePercent } from '../../utils/promotions'
import { Link } from 'react-router-dom'
import { authRepo } from '../../adapters/local/auth'
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
  const [repos, setRepos] = useState<any>(null)
  const user = authRepo.getCurrentUser()
  const [q, setQ] = useState('')
  const [statusTab, setStatusTab] = useState<'all'|'pending'|'completed'|'closed'>('all')
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
  const [activePercent, setActivePercent] = useState<number>(0)
  const [products, setProducts] = useState<any[]>([])
  const load = async () => { if (!repos) return; setRows(await repos.orderRepo.list()) }
  useEffect(()=>{ (async()=>{ const a = await loadAdapters(); setRepos(a); })() },[])
  useEffect(()=>{ if (repos) load() },[repos])
  useEffect(()=>{ getActivePercent().then(setActivePercent) },[creating])
  useEffect(()=>{ (async()=>{ try { const a = repos || (await loadAdapters()); setProducts(await a.productRepo.list()) } catch {} })() },[creating, repos])
  const isTech = user?.role === 'technician'
  const isOwner = (o:any) => {
    if (!isTech) return true
    const names: string[] = Array.isArray(o.assignedTechnicians)? o.assignedTechnicians : []
    return names.includes(user?.name || '')
  }

  const filtered = rows.filter(o => {
    const hit = !q || o.id.includes(q) || (o.customerName||'').includes(q)
    const pfKeys = Object.keys(pf).filter(k=>pf[k])
    const byPf = pfKeys.length===0 || pfKeys.includes(o.platform)
    const byStatus = (()=>{
      if (statusTab==='all') return true
      if (statusTab==='pending') return ['draft','confirmed','in_progress'].includes(o.status)
      if (statusTab==='completed') return o.status==='completed'
      if (statusTab==='closed') return (o.status==='canceled' || (o as any).status==='unservice')
      return true
    })()
    return hit && byPf && byStatus && isOwner(o)
  })

  // 技師卡牌式統計
  const ownRows = rows.filter(isOwner)
  const counts = {
    all: ownRows.length,
    pending: ownRows.filter(o=> ['draft','confirmed','in_progress'].includes(o.status)).length,
    completed: ownRows.filter(o=> o.status==='completed').length,
    closed: ownRows.filter(o=> o.status==='canceled' || (o as any).status==='unservice').length,
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">訂單管理</div>
      <div className="flex items-center gap-2 text-xs">
        {([
          ['all','全部'],
          ['pending','待服務'],
          ['completed','已完成'],
          ['closed','已結案'],
        ] as any[]).map(([key,label])=> (
          <button key={key} onClick={()=>setStatusTab(key)} className={`rounded-full px-2.5 py-1 ${statusTab===key? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>{label}</button>
        ))}
      </div>
        <div className="flex items-center gap-2">
          <input placeholder="搜尋ID/客戶" className="rounded border px-2 py-1 text-sm" value={q} onChange={e=>setQ(e.target.value)} />
          {can(user,'orders.create') && <button onClick={()=>setCreating(true)} className="rounded-lg bg-brand-500 px-3 py-1 text-white">新建訂單</button>}
        </div>
      </div>

      {/* 技師卡牌式入口：顯示各分類數量，可點擊切換 */}
      {isTech && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {([
            ['all','全部', counts.all],
            ['pending','待服務', counts.pending],
            ['completed','已完成', counts.completed],
            ['closed','已結案', counts.closed],
          ] as any[]).map(([key,label,num])=> (
            <button key={key} onClick={()=>setStatusTab(key)} className={`rounded-2xl border p-4 text-left shadow-card ${statusTab===key? 'ring-2 ring-brand-400' : ''}`}>
              <div className="text-xs text-gray-500">{label}</div>
              <div className="mt-1 text-2xl font-extrabold tabular-nums">{num}</div>
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {['日','同','黃','今'].map(p=> (
          <button key={p} onClick={()=>setPf(s=>({ ...s, [p]: !s[p] }))} className={`rounded-full px-2.5 py-1 ${pf[p]? 'bg-brand-100 text-brand-700 ring-1 ring-brand-300' : 'bg-gray-100 text-gray-700'}`}>{p}</button>
        ))}
        <button onClick={()=>setPf({})} className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100">清除</button>
        {filtered.length>0 && (
          <>
            <button onClick={()=>{
              const header = ['項次','日期','平台','訂單編號','地區','數量','服務技師','結案金額']
              const lines = filtered.map((o:any, index: number)=>{
                // 提取地址資訊
                const location = extractLocationFromAddress(o.customerAddress)
                const region = location.city && location.district ? `${location.city}${location.district}` : o.customerAddress
                
                // 計算數量
                const quantity = calculateOrderQuantity(o.serviceItems || [])
                
                // 格式化技師顯示
                const technicians = formatTechniciansDisplay(o.assignedTechnicians || [])
                
                // 計算結案金額
                const finalAmount = calculateFinalAmount(o.serviceItems || [], o.status)
                
                return [
                  index + 1,
                  o.preferredDate || '',
                  o.platform || '',
                  o.id || '',
                  region,
                  quantity,
                  technicians,
                  finalAmount
                ].join(',')
              })
              const csv = [header.join(','),...lines].join('\n')
              const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'orders_report.csv'
              a.click(); URL.revokeObjectURL(url)
            }} className="ml-auto rounded bg-gray-900 px-2.5 py-1 text-white">匯出報表 CSV</button>
            <button onClick={()=>{
              const header = ['項次','日期','平台','訂單編號','地區','數量','服務技師','結案金額']
              const rowsHtml = filtered.map((o:any, index: number)=>{
                // 提取地址資訊
                const location = extractLocationFromAddress(o.customerAddress)
                const region = location.city && location.district ? `${location.city}${location.district}` : o.customerAddress
                
                // 計算數量
                const quantity = calculateOrderQuantity(o.serviceItems || [])
                
                // 格式化技師顯示
                const technicians = formatTechniciansDisplay(o.assignedTechnicians || [])
                
                // 計算結案金額
                const finalAmount = calculateFinalAmount(o.serviceItems || [], o.status)
                
                return `<tr><td>${index + 1}</td><td>${o.preferredDate || ''}</td><td>${o.platform || ''}</td><td>${o.id || ''}</td><td>${region}</td><td>${quantity}</td><td>${technicians}</td><td>${finalAmount}</td></tr>`
              }).join('')
              const html = `<!DOCTYPE html><html><head><meta charset=\"UTF-8\"></head><body><table><thead><tr>${header.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`
              const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'orders_report.xls'
              a.click(); URL.revokeObjectURL(url)
            }} className="rounded bg-brand-600 px-2.5 py-1 text-white">匯出報表 Excel</button>
          </>
        )}
      </div>
      <div className="rounded-2xl bg-white p-2 shadow-card">
        {filtered.map(o => (
          <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center justify-between border-b p-3 text-sm">
            <div>
              <div className="font-semibold">{o.id} <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${o.platform==='日'?'bg-blue-100 text-blue-700':o.platform==='同'?'bg-purple-100 text-purple-700':o.platform==='黃'?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700'}`}>{o.platform}</span></div>
              <div className="text-xs text-gray-500">{o.customerName}｜{o.preferredDate} {o.preferredTimeStart}~{o.preferredTimeEnd}｜推薦碼 {o.referrerCode||'-'} {o.referrerCode && <button onClick={(e)=>{e.preventDefault(); navigator.clipboard.writeText(o.referrerCode)}} className="ml-1 rounded bg-gray-100 px-2 py-0.5">複製</button>}</div>
              {Array.isArray(o.assignedTechnicians) && o.assignedTechnicians.length>0 && (
                <div className="mt-1 text-[11px] text-gray-500">技師：{o.assignedTechnicians.join('、')}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {o.status==='draft' && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">草稿</span>}
              {o.status==='confirmed' && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">已確認</span>}
              {o.status==='in_progress' && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700">服務中</span>}
              {o.status==='completed' && <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">完成</span>}
              {o.status==='canceled' && <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-700">取消</span>}
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
              <input className="w-full rounded border px-2 py-1" placeholder="客戶姓名" value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})} />
              <input className="w-full rounded border px-2 py-1" placeholder="手機" value={form.customerPhone} onChange={e=>setForm({...form,customerPhone:e.target.value})} />
              
              {/* 地址管理 */}
              <div className="grid grid-cols-3 gap-2">
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
                <input type="date" className="w-full rounded border px-2 py-1" value={form.preferredDate} onChange={e=>setForm({...form,preferredDate:e.target.value})} />
                <input type="time" className="w-full rounded border px-2 py-1" value={form.preferredTimeStart} onChange={e=>setForm({...form,preferredTimeStart:e.target.value})} />
                <input type="time" className="w-full rounded border px-2 py-1" value={form.preferredTimeEnd} onChange={e=>setForm({...form,preferredTimeEnd:e.target.value})} />
              </div>
              <input className="w-full rounded border px-2 py-1" placeholder="推薦碼（MOxxxx / SRxxx / SExxx）" value={form.referrerCode} onChange={e=>setForm({...form,referrerCode:e.target.value})} />
              <div className="grid gap-1 text-xs text-gray-500">
                <div>活動折扣：{activePercent > 0 ? `${activePercent}%` : '—'}</div>
                <input className="w-full rounded border px-2 py-1 text-sm" placeholder="會員編號（MOxxxx）可選" value={(form as any).memberCode||''} onChange={e=>setForm({...form, memberCode: e.target.value})} />
              </div>
              <div>
                <label className="mr-2 text-sm text-gray-600">平台</label>
                <select className="rounded border px-2 py-1 text-sm" value={form.platform||'日'} onChange={e=>setForm({...form, platform: e.target.value})}>
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
                      const p = products.find((x:any)=>x.id===val); arr[idx]={...arr[idx], productId: val, name: p?.name || it.name, unitPrice: p?.unitPrice || it.unitPrice}; setForm({...form, serviceItems: arr})
                    }}>
                      <option value="">自訂</option>
                      {products.map((p:any)=>(<option key={p.id} value={p.id}>{p.name}（{p.unitPrice}）</option>))}
                    </select>
                    <input className="col-span-2 rounded border px-2 py-1" placeholder="項目" value={it.name} onChange={e=>{ const arr=[...form.serviceItems]; arr[idx]={...arr[idx], name:e.target.value}; setForm({...form, serviceItems: arr}) }} />
                    <input type="number" className="rounded border px-2 py-1" placeholder="數量" value={it.quantity} onChange={e=>{ const arr=[...form.serviceItems]; arr[idx]={...arr[idx], quantity:Number(e.target.value)}; setForm({...form, serviceItems: arr}) }} />
                    <div className="flex items-center gap-2">
                      <input type="number" className="w-24 rounded border px-2 py-1" placeholder="單價" value={it.unitPrice} onChange={e=>{ const arr=[...form.serviceItems]; arr[idx]={...arr[idx], unitPrice:Number(e.target.value)}; setForm({...form, serviceItems: arr}) }} />
                      <button onClick={()=>{ const arr=[...form.serviceItems]; arr.splice(idx,1); setForm({...form, serviceItems: arr.length?arr:[{ name:'服務', quantity:1, unitPrice:0 }]}) }} className="rounded bg-gray-100 px-2 py-1 text-xs">刪</button>
                    </div>
                  </div>
                ))}
                <button onClick={()=>setForm({...form, serviceItems:[...form.serviceItems, { name:'', quantity:1, unitPrice:0 }]})} className="rounded bg-gray-100 px-2 py-1 text-xs">新增品項</button>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={()=>setCreating(false)} className="rounded-lg bg-gray-100 px-3 py-1">取消</button>
              <button onClick={async()=>{
                try {
                  if(!repos) return
                  
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
                      const existingCustomers = await repos.customerRepo.list()
                      const existingCustomer = existingCustomers.find((c: any) => c.phone === clean.customerPhone)
                      
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
                  await repos.orderRepo.create({ ...clean, status:'draft', platform: clean.platform||'日', memberId, serviceItems: items } as any)
                  setCreating(false)
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
                }
              }} className="rounded-lg bg-brand-500 px-3 py-1 text-white">建立</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


