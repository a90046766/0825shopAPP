import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { loadAdapters } from '../../adapters'
import { supabase } from '../../utils/supabase'
import { getMemberUser } from '../../utils/memberAuth'

export default function MemberOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const member = getMemberUser()
  // 回饋提交狀態
  const [fbOpen, setFbOpen] = useState<''|'good'|'suggest'>('')
  const [goodFile, setGoodFile] = useState<File|null>(null)
  const [goodNote, setGoodNote] = useState('')
  const [suggestText, setSuggestText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [techPhones, setTechPhones] = useState<Record<string,string>>({})
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  // 轉帳回報欄位（必須置於所有條件 return 之前，避免 Hook 序不一致）
  const [remitAmount, setRemitAmount] = useState('')
  const [remitLast5, setRemitLast5] = useState('')
  const [remitSubmitting, setRemitSubmitting] = useState(false)

  useEffect(()=>{
    (async()=>{
      try{
        const names = Array.isArray(order?.assignedTechnicians) ? order.assignedTechnicians.filter(Boolean) : []
        if (names.length>0) {
          const { data } = await supabase.from('technicians').select('name,phone').in('name', names as any)
          const map:Record<string,string> = {}
          for (const t of (data||[])) { if (t?.name) map[String(t.name)] = String(t.phone||'') }
          setTechPhones(map)
        } else setTechPhones({})
      } catch { setTechPhones({}) }
    })()
  }, [order?.assignedTechnicians])

  useEffect(() => {
    (async()=>{
      if (!id) return
      setLoading(true)
      setError('')
      try {
        // 優先雲端
        try { const a = await loadAdapters(); const o = await a.orderRepo.get(id); if (o) { setOrder(o); setLoading(false); return } } catch {}
        // 回退：以 API 讀取預約單（以會員 ID / email 查詢），直接組合成可顯示結構，並嘗試補上會員代碼
        try {
          const cid = (member as any)?.customerId || '0'
          const emailLc = (member?.email||'').toLowerCase()
          const res = await fetch(`/api/member-reservations/${encodeURIComponent(cid)}?email=${encodeURIComponent(emailLc)}`)
          const j = await res.json()
          if (j?.success && Array.isArray(j.data)) {
            const found = j.data.find((r:any)=> String(r.reservation_number)===String(id))
            if (found) {
              const items = [{ service_name: found.service_name||'服務', quantity: Number(found.quantity||0), price: Number(found.service_price||0) }]
              const subTotal = items.reduce((s:number,it:any)=> s + (it.price||0)*(it.quantity||0), 0)
              setOrder({
                id: found.reservation_number,
                customerAddress: found.customer_address || '',
                preferredDate: found.reservation_date || '',
                preferredTimeStart: found.reservation_time || '',
                preferredTimeEnd: '',
                paymentMethod: '',
                pointsDeductAmount: 0,
                serviceItems: items.map((it:any)=> ({ name: it.service_name, quantity: it.quantity, unitPrice: it.price })),
                subTotal,
                status: found.status || 'pending',
                memberId: (member as any)?.id || '',
              })
              setLoading(false)
              return
            }
          }
        } catch {}
        setError('找不到這筆訂單')
      } catch (e:any) {
        setError(e?.message || '載入失敗')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) return <div className="p-4 text-sm text-gray-600">載入中...</div>
  if (error) return (
    <div className="p-4">
      <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      <div className="mt-3"><Link className="text-blue-600" to="/store/member/orders">返回我的訂單</Link></div>
    </div>
  )
  if (!order) return (
    <div className="p-4">
      <div className="rounded bg-yellow-50 p-3 text-sm text-yellow-800">暫時無法載入此訂單，請稍後再試或返回列表。</div>
      <div className="mt-3 flex gap-2">
        <button onClick={()=>{ try{ location.reload() }catch{} }} className="rounded bg-gray-900 px-3 py-1 text-white text-sm">重新整理</button>
        <Link className="text-blue-600 text-sm" to="/store/member/orders">返回我的訂單</Link>
      </div>
    </div>
  )

  const subTotal = Array.isArray(order.serviceItems) ? order.serviceItems.reduce((s:number,it:any)=> s + (it.unitPrice||0)*(it.quantity||0), 0) : (order.subTotal||0)
  const final = Math.max(0, subTotal - (order.pointsDeductAmount||0))
  const timeBand = (order.preferredTimeStart && order.preferredTimeEnd) ? `${order.preferredTimeStart}-${order.preferredTimeEnd}` : (order.preferredTimeStart||'')
  const photos = {
    before: Array.isArray(order.photosBefore) ? order.photosBefore : [],
    after: Array.isArray(order.photosAfter) ? order.photosAfter : []
  }
  const transferQrUrlPrimary: string = 'https://dekopbnpsvqlztabblxg.supabase.co/storage/v1/object/sign/QRCODEPAY/QRCODEPAY.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iMjVhZWJmZi1kMGFjLTRkN2YtODM1YS1lYThmNzE4YTNlZDEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJRUkNPREVQQVkvUVJDT0RFUEFZLnBuZyIsImlhdCI6MTc2MTExNTY4MiwiZXhwIjoyMDc2NDc1NjgyfQ.Y2ZGPDNeCtX3z2KjHdTK6XbPKMWcanTZJXor1zGZ9xo'
  const transferQrUrlBackup: string = 'https://dekopbnpsvqlztabblxg.supabase.co/storage/v1/object/public/QRCODEPAY/QRCODEPAY.png'
  const bankCode = '822'
  const bankAccount = '369540475328'
  const bankAccountName = '日式洗濯有限公司'
  const copyText = async (text: string) => { try { await navigator.clipboard.writeText(text) } catch {} }
  // 收斂各種可能的付款方式來源欄位
  const paymentTexts: string[] = (() => {
    try {
      const o:any = order || {}
      const sig:any = o.signatures || {}
      const cand:any[] = [
        o.paymentMethod, o.payment_method, o.payment, o.payMethod, o.pay_method,
        o.payType, o.pay_type, o.paymentType, o.payment_type, o.payment_option, o.paymentOption,
        sig.paymentMethod, sig.payment, sig?.payment?.method, sig?.payment?.name, sig?.checkout?.paymentMethod
      ]
      return cand
        .map((x:any)=> (x==null? '' : String(x)))
        .map(s=> s.trim())
        .filter(Boolean)
    } catch { return [] }
  })()
  const paymentMethodDisplay = (()=>{
    const joined = (paymentTexts||[]).join(' ').toLowerCase()
    if (/(apple\s*pay|apply\s*pay|信用卡|刷卡|線上)/.test(joined)) return '信用卡/APPLY PAY'
    const first = paymentTexts[0] || ''
    if (!first) return '-'
    return first.replace(/[（(]\s*示意\s*[）)]/g,'').replace(/\s{2,}/g,' ').trim()
  })()
  const isTransferPayment = (() => {
    try {
      const joined = paymentTexts.join(' ').toLowerCase()
      if (!joined) return false
      return (
        joined.includes('transfer') ||
        joined.includes('匯款') ||
        joined.includes('銀行轉帳') ||
        joined.includes('轉帳')
      )
    } catch { return false }
  })()

  // 從 signatures.customer_feedback 呈現回饋（若有）
  const feedback = (()=>{
    try {
      const sig:any = order.signatures || {}
      const f:any = sig.customer_feedback || null
      if (!f) return null
      return {
        kind: String(f.kind||''),
        comment: f.comment ? String(f.comment) : '',
        asset_path: f.asset_path ? String(f.asset_path) : ''
      }
    } catch { return null }
  })()

  const addToCartAgain = async () => {
    if (!order?.serviceItems || order.serviceItems.length===0) { alert('此訂單沒有可再次下單的品項'); return }
    setAdding(true)
    try {
      const a:any = await loadAdapters()
      let products:any[] = []
      try { products = await a.productRepo.list() || [] } catch {}
      const cart:any[] = []
      const unmatched:string[] = []
      for (const it of order.serviceItems) {
        const p = products.find((x:any)=> (x.name||'').trim() === (it.name||'').trim())
        if (p) {
          cart.push({ id: p.id, name: p.name, price: it.unitPrice||p.unitPrice||0, quantity: it.quantity||1, category: p.category||'cleaning' })
        } else {
          unmatched.push(it.name)
        }
      }
      if (cart.length===0) { alert('找不到對應的商品，無法再次下單'); return }
      // 合併到既有購物車
      try {
        const saved = JSON.parse(localStorage.getItem('shopCart') || '[]')
        const map:Record<string,any> = {}
        for (const s of saved) map[s.id] = s
        for (const c of cart) {
          if (map[c.id]) { map[c.id].quantity += c.quantity } else { map[c.id] = c }
        }
        const merged = Object.values(map)
        localStorage.setItem('shopCart', JSON.stringify(merged))
      } catch { localStorage.setItem('shopCart', JSON.stringify(cart)) }
      if (unmatched.length>0) alert(`以下品項未能匹配商品，未加入購物車：\n${unmatched.join('、')}`)
      navigate('/store/cart')
    } finally {
      setAdding(false)
    }
  }

  const buildGoogleCalLink = () => {
    try {
      const title = encodeURIComponent('日式洗濯-預約服務')
      const date = (order.preferredDate||'').replaceAll('-','')
      const start = (order.preferredTimeStart||'09:00').replace(':','') + '00'
      const end = (order.preferredTimeEnd||'12:00').replace(':','') + '00'
      const dates = `${date}T${start}/${date}T${end}`
      const details = encodeURIComponent(`訂單編號：${order.id}\n金額：${final}\n加入LINE：@942clean`)
      const location = encodeURIComponent(order.customerAddress||'')
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`
    } catch { return '#' }
  }

  const buildICS = () => {
    try {
      const uid = order.id
      const date = (order.preferredDate||'').replaceAll('-','')
      const start = (order.preferredTimeStart||'09:00').replace(':','') + '00'
      const end = (order.preferredTimeEnd||'12:00').replace(':','') + '00'
      const dtStart = `${date}T${start}`
      const dtEnd = `${date}T${end}`
      const summary = '日式洗濯-預約服務'
      const description = `訂單編號：${order.id}\n金額：${final}\n加入LINE：@942clean`
      const location = order.customerAddress||''
      const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//942clean//Order//TW\nBEGIN:VEVENT\nUID:${uid}\nDTSTART:${dtStart}\nDTEND:${dtEnd}\nSUMMARY:${summary}\nDESCRIPTION:${description}\nLOCATION:${location}\nEND:VEVENT\nEND:VCALENDAR`
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `order-${order.id}.ics`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {}
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-base md:text-lg font-bold">訂單詳情</div>
        <Link to="/store/member/orders" className="text-sm text-blue-600">返回我的訂單</Link>
      </div>

      <div className="rounded border p-3 md:p-4">
        <div className="flex items-center gap-2">
          <div className="font-medium text-sm md:text-base">訂單編號 {order.id}</div>
        </div>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs md:text-sm text-gray-700">
          <div>服務地址：<span className="font-medium break-words">{order.customerAddress||'-'}</span></div>
          <div>服務日期：<span className="font-medium">{order.preferredDate||'-'}</span></div>
          <div>服務時段：<span className="font-medium">{timeBand||'-'}</span></div>
          <div>付款方式：<span className="font-medium">{paymentMethodDisplay}</span></div>
        </div>
        {Array.isArray(order.assignedTechnicians) && order.assignedTechnicians.length>0 && (
          <div className="mt-1 text-xs md:text-sm text-gray-700">
            服務技師：
            <span className="font-medium">
              {order.assignedTechnicians.map((n:string)=> techPhones[n] ? `${n}（${techPhones[n]}）` : n).join('、')}
            </span>
          </div>
        )}
        <div className="mt-3">
          <div className="font-medium text-gray-800 mb-1">品項明細</div>
          <div className="rounded border">
            <div className="grid grid-cols-4 bg-gray-50 px-2 py-1 text-xs text-gray-600"><div>項目</div><div>數量</div><div>單價</div><div className="text-right">小計</div></div>
            {order.serviceItems?.map((it:any,i:number)=>{
              const qty = Number(it.quantity)||0
              const price = Number(it.unitPrice)||0
              const sub = price*qty
              return <div key={i} className="grid grid-cols-4 items-center px-2 py-1 text-sm"><div>{it.name}</div><div className={qty<0?"text-rose-600":""}>{qty}</div><div>{price}</div><div className="text-right">{sub}</div></div>
            })}
            <div className="border-t px-2 py-1 text-right text-gray-900">小計：<span className="text-base font-semibold">{subTotal}</span></div>
            {order.pointsDeductAmount ? (
              <div className="px-2 py-1 text-right text-rose-600">積分折抵：- {order.pointsDeductAmount}</div>
            ) : null}
            <div className="border-t px-2 py-1 text-right text-gray-900">應付金額：<span className="text-base font-semibold">{final}</span></div>
          </div>
        </div>
        {/* 線上付款（信用卡 / APPLY PAY） - 簡化為連結按鈕，避免潛在相依造成錯誤 */}
        {final > 0 && (
          <div className="mt-3">
            <div className="text-sm font-medium text-gray-800 mb-1">線上付款（信用卡 / APPLY PAY）</div>
            <a
              href={`/.netlify/functions/newebpay-start?${new URLSearchParams({ orderId: String(order.id), amount: String(Math.round(final)), email: String((member?.email || order.customerEmail || '')).toLowerCase(), desc: `訂單#${order.id}` }).toString()}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded bg-indigo-600 px-3 py-2 text-white text-sm"
            >前往付款頁</a>
            <div className="mt-1 text-[11px] text-gray-500">點擊後將在新視窗開啟藍新金流頁面完成付款。</div>
          </div>
        )}
        {/* 銀行轉帳資訊（若本訂單為匯款） */}
        {isTransferPayment && (
          <div className="mt-4 rounded border p-3 md:p-4 bg-emerald-50 border-emerald-200">
            <div className="mb-2 text-sm font-medium text-emerald-900">匯款說明</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              <div className="text-xs md:text-sm text-emerald-900">
                請於完成轉帳後回報金額與末五碼，以便我們儘速對帳。
                {transferQrUrlPrimary ? (
                  <div className="mt-2">
                    <div className="text-[11px] text-emerald-700 mb-1">銀行轉帳 QR</div>
                    <a href={transferQrUrlPrimary} target="_blank" rel="noopener noreferrer" className="inline-block">
                      <img src={transferQrUrlPrimary} onError={(e)=>{ const t=e.currentTarget as HTMLImageElement; t.onerror=null as any; t.src=transferQrUrlBackup }} alt="Bank Transfer QR" className="w-40 h-40 rounded border border-emerald-200 bg-white object-contain shadow-sm" />
                    </a>
                    <div className="mt-1 text-[11px] text-emerald-700">若無法顯示，<a href={transferQrUrlPrimary} target="_blank" rel="noopener noreferrer" className="underline">按此開新視窗查看</a></div>
                    <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-emerald-900">
                      <div>銀行代碼：<span className="font-mono font-semibold">{bankCode}</span> <button type="button" className="ml-2 rounded border px-1 text-[11px]" onClick={()=>copyText(bankCode)}>複製</button></div>
                      <div>帳號：<span className="font-mono font-semibold">{bankAccount}</span> <button type="button" className="ml-2 rounded border px-1 text-[11px]" onClick={()=>copyText(bankAccount)}>複製</button></div>
                      <div>戶名：<span className="font-mono">{bankAccountName}</span></div>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-700 mb-1">轉帳金額</label>
                  <input type="number" min="0" step="1" value={remitAmount} onChange={e=>setRemitAmount(e.target.value)} className="w-full rounded border px-2 py-1 text-sm" placeholder="請輸入金額（元）" />
                </div>
                <div>
                  <label className="block text-xs text-gray-700 mb-1">帳號後五碼</label>
                  <input type="text" maxLength={5} value={remitLast5} onChange={e=>setRemitLast5(e.target.value.replace(/\D/g,''))} className="w-full rounded border px-2 py-1 text-sm" placeholder="例如：12345" />
                </div>
                <div className="text-right">
                  <button type="button" disabled={remitSubmitting || !remitAmount || remitLast5.length!==5} onClick={async()=>{
                    if (!member) { alert('請先登入會員'); return }
                    if (!order?.id) { alert('訂單編號遺失'); return }
                    setRemitSubmitting(true)
                    try {
                      const payload = { amount: Number(remitAmount||0), last5: remitLast5 }
                      // 優先走 API 映射（若有）
                      let ok = false
                      try {
                        const r1 = await fetch(`/_api/orders/${encodeURIComponent(String(order.id))}/remit`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
                        const j1 = await r1.json().catch(()=>null)
                        ok = !!(j1 && j1.success)
                      } catch {}
                      if (!ok) {
                        const r2 = await fetch(`/.netlify/functions/order-remit`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ orderId: String(order.id), memberId: member.id, ...payload }) })
                        const j2 = await r2.json().catch(()=>null)
                        ok = !!(j2 && j2.success)
                      }
                      if (ok) { alert('已送出轉帳資訊，將於人工對帳後通知您'); setRemitAmount(''); setRemitLast5('') }
                      else { alert('送出失敗，請稍後重試') }
                    } finally { setRemitSubmitting(false) }
                  }} className={`rounded px-3 py-1 text-white ${remitSubmitting? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{remitSubmitting?'送出中…':'完成轉帳'}</button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button disabled={adding} onClick={addToCartAgain} className="rounded bg-gray-900 px-3 py-2 text-white disabled:opacity-60">再次下單</button>
          <a href={buildGoogleCalLink()} target="_blank" rel="noreferrer" className="rounded bg-blue-600 px-3 py-2 text-white text-center">加入 Google 行事曆</a>
          <button onClick={buildICS} className="rounded bg-gray-100 px-3 py-2 text-gray-800">下載 iCal (ICS)</button>
        </div>

        {/* 回饋入口（結案或已完工後顯示） */}
        {(order.status==='closed' || order.status==='completed') && (
          <div className="mt-4 rounded border p-3">
            <div className="mb-2 text-sm font-medium text-gray-800">服務回饋</div>
          {feedback ? (
            <div className="mb-3 rounded border p-2 bg-gray-50 text-sm">
              <div className="text-gray-700">
                {feedback.kind==='suggest' && feedback.comment && (
                  <div className="whitespace-pre-wrap">{feedback.comment}</div>
                )}
                {feedback.kind==='good' && feedback.asset_path && (
                  <div className="mt-1">
                    <img src={`${supabase.storage.from('review-uploads').getPublicUrl(feedback.asset_path).data.publicUrl}`} alt="upload" className="max-h-48 rounded border" />
                  </div>
                )}
              </div>
            </div>
          ) : null}
            <div className="flex flex-wrap gap-2 text-sm">
              {!feedback && (<>
                <button onClick={()=>setFbOpen('good')} className="rounded bg-emerald-600 px-3 py-2 text-white">上傳好評截圖（+50）</button>
                <button onClick={()=>setFbOpen('suggest')} className="rounded bg-brand-600 px-3 py-2 text-white">提交建議（+50）</button>
              </>)}
            </div>
            <div className="mt-2 text-xs text-gray-500">為保障權益，同一訂單好評/建議擇一提交（僅可提交一次）。</div>
          </div>
        )}
      </div>
      {/* 技師上傳照片：客戶可查看 */}
      {(photos.before.length>0 || photos.after.length>0) && (
        <div className="mt-4">
          <div className="font-medium text-gray-800 mb-1">服務照片</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {photos.before.length>0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1">清洗前（{photos.before.length}/24）</div>
                <div className="grid grid-cols-3 gap-2">
                  {photos.before.map((u:string,i:number)=> (
                    <button key={i} type="button" onClick={()=>setPreviewUrl(u)} className="block rounded overflow-hidden border focus:outline-none">
                      <img src={u} alt="before" className="h-24 w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {photos.after.length>0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1">清洗後（{photos.after.length}/24）</div>
                <div className="grid grid-cols-3 gap-2">
                  {photos.after.map((u:string,i:number)=> (
                    <button key={i} type="button" onClick={()=>setPreviewUrl(u)} className="block rounded overflow-hidden border focus:outline-none">
                      <img src={u} alt="after" className="h-24 w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 好評上傳視窗 */}
      {fbOpen==='good' && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-card">
            <div className="mb-2 text-lg font-semibold">上傳好評截圖（+50）</div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-gray-600 mb-1">截圖檔案（jpg/png）</div>
                <input type="file" accept="image/*" onChange={(e)=> setGoodFile((e.target.files&&e.target.files[0])||null)} />
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">備註（可選）</div>
                <textarea className="w-full rounded border px-2 py-1" rows={3} value={goodNote} onChange={e=>setGoodNote(e.target.value)} placeholder="可補充評價連結或說明" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={()=>{ setFbOpen(''); setGoodFile(null); setGoodNote('') }} className="rounded bg-gray-100 px-3 py-1">取消</button>
                <button disabled={submitting} onClick={async()=>{
                  if (!member) { alert('請先登入會員'); return }
                  if (!goodFile) { alert('請選擇截圖檔案'); return }
                  setSubmitting(true)
                  try {
                    // 去重：同會員+同訂單+kind=good 只能提交一次
                    const { data: existed } = await supabase
                      .from('member_feedback')
                      .select('id')
                      .eq('member_id', member.id)
                      .eq('order_id', String(order.id))
                      .eq('kind', 'good')
                      .limit(1)
                    if (Array.isArray(existed) && existed.length>0) { alert('已提交過好評，感謝您的支持！'); setSubmitting(false); return }
                    // 上傳檔案到 Storage
                    const ext = (goodFile.name.split('.').pop()||'jpg').toLowerCase()
                    const path = `${member.id}/${String(order.id)}/${Date.now()}.${ext}`
                    const { error: upErr } = await supabase.storage.from('review-uploads').upload(path, goodFile, { upsert: false, contentType: goodFile.type||'image/jpeg' })
                    if (upErr) throw upErr
                    // 改走後端 Function（Service Role 避免 RLS）
                    let ok = false
                    let serverErr: string | null = null
                    try {
                      const url1 = `/_api/orders/member/${encodeURIComponent(member.id)}/orders/${encodeURIComponent(String(order.id))}/rating`
                      const body1 = { kind: 'good', comment: goodNote||null, asset_path: path }
                      let jj:any = null
                      try {
                        const r1 = await fetch(url1, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body1) })
                        jj = await r1.json().catch(()=>null)
                      } catch {}
                      if (!jj || !jj.success) {
                        const url2 = `/.netlify/functions/orders-member-rating?customerId=${encodeURIComponent(member.id)}&orderId=${encodeURIComponent(String(order.id))}`
                        const r2 = await fetch(url2, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body1) })
                        jj = await r2.json().catch(()=>null)
                      }
                      ok = !!(jj && jj.success)
                      serverErr = (jj && jj.error) ? String(jj.error) : null
                      if (jj && (jj.error==='already_submitted' || jj.error==='already_submitted_any')) { alert('此訂單已提交過回饋，感謝您的支持！'); setFbOpen(''); setGoodFile(null); setGoodNote(''); setSubmitting(false); return }
                    } catch {}
                    // 伺服端為唯一真相：若未成功，僅提示錯誤，不做本地後備插入，以避免繞過擇一限制
                    if (!ok) { throw new Error(serverErr||'server_failed') }
                    alert(ok ? '已收到您的好評，謝謝！' : ('提交失敗：' + (serverErr || '請稍後再試')))
                    setFbOpen(''); setGoodFile(null); setGoodNote('')
                  } catch(e:any) {
                    alert('提交失敗：' + (e?.message||'未知錯誤'))
                  } finally { setSubmitting(false) }
                }} className={`rounded px-3 py-1 text-white ${submitting?'bg-gray-400':'bg-emerald-600 hover:bg-emerald-700'}`}>{submitting?'提交中…':'送出'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 建議填寫視窗 */}
      {fbOpen==='suggest' && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-card">
            <div className="mb-2 text-lg font-semibold">提交建議（+50）</div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-gray-600 mb-1">建議內容</div>
                <textarea className="w-full rounded border px-2 py-1" rows={5} value={suggestText} onChange={e=>setSuggestText(e.target.value)} placeholder="請描述您的建議或體驗感受…" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={()=>{ setFbOpen(''); setSuggestText('') }} className="rounded bg-gray-100 px-3 py-1">取消</button>
                <button disabled={submitting} onClick={async()=>{
                  if (!member) { alert('請先登入會員'); return }
                  if (!suggestText.trim()) { alert('請輸入建議內容'); return }
                  setSubmitting(true)
                  try {
                    // 去重：同會員+同訂單+kind=suggest 只能提交一次
                    const { data: existed } = await supabase
                      .from('member_feedback')
                      .select('id')
                      .eq('member_id', member.id)
                      .eq('order_id', String(order.id))
                      .eq('kind', 'suggest')
                      .limit(1)
                    if (Array.isArray(existed) && existed.length>0) { alert('已提交過建議，感謝您的回饋！'); setSubmitting(false); return }
                    // 改走後端 Function（Service Role 避免 RLS）
                    let ok = false
                    let serverErr: string | null = null
                    try {
                      const url1 = `/_api/orders/member/${encodeURIComponent(member.id)}/orders/${encodeURIComponent(String(order.id))}/rating`
                      const body1 = { kind: 'suggest', comment: suggestText }
                      let jj:any = null
                      try {
                        const r1 = await fetch(url1, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body1) })
                        jj = await r1.json().catch(()=>null)
                      } catch {}
                      if (!jj || !jj.success) {
                        const url2 = `/.netlify/functions/orders-member-rating?customerId=${encodeURIComponent(member.id)}&orderId=${encodeURIComponent(String(order.id))}`
                        const r2 = await fetch(url2, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body1) })
                        jj = await r2.json().catch(()=>null)
                      }
                      ok = !!(jj && jj.success)
                      serverErr = (jj && jj.error) ? String(jj.error) : null
                      if (jj && (jj.error==='already_submitted' || jj.error==='already_submitted_any')) { alert('此訂單已提交過回饋，感謝您的支持！'); setFbOpen(''); setSuggestText(''); setSubmitting(false); return }
                    } catch {}
                    // 伺服端為唯一真相：若未成功，僅提示錯誤，不做本地後備插入，以避免繞過擇一限制
                    if (!ok) { throw new Error(serverErr||'server_failed') }
                    alert(ok ? '已收到您的建議，謝謝！' : ('提交失敗：' + (serverErr || '請稍後再試')))
                    setFbOpen(''); setSuggestText('')
                  } catch(e:any) {
                    alert('提交失敗：' + (e?.message||'未知錯誤'))
                  } finally { setSubmitting(false) }
                }} className={`rounded px-3 py-1 text-white ${submitting?'bg-gray-400':'bg-brand-600 hover:bg-brand-700'}`}>{submitting?'提交中…':'送出'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 照片燈箱預覽 */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 p-4 grid place-items-center" onClick={()=>setPreviewUrl(null)}>
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e)=>e.stopPropagation()}>
            <img src={previewUrl} alt="preview" className="max-h-[90vh] max-w-[90vw] object-contain rounded" />
            <button type="button" onClick={()=>setPreviewUrl(null)} className="absolute -top-3 -right-3 rounded-full bg-white/90 px-2 py-1 text-sm shadow">關閉</button>
          </div>
        </div>
      )}
    </div>
  )
}


