import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { loadAdapters } from '../../adapters'
import { supabase } from '../../utils/supabase'
import { getMemberUser } from '../../utils/memberAuth'

export default function MemberOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<any>(null)
  const [techMap, setTechMap] = useState<Record<string,string>>({})
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

  useEffect(() => {
    (async()=>{
      if (!id) return
      setLoading(true)
      setError('')
      try {
        // 優先雲端
        try { const a = await loadAdapters(); const o = await a.orderRepo.get(id); if (o) { setOrder(o); try { if ((a as any).technicianRepo?.list){ const list = await (a as any).technicianRepo.list(); const map:Record<string,string>={}; (list||[]).forEach((t:any)=>{ if(t?.name) map[t.name]=t.phone||t.mobile||t.tel||'' }); setTechMap(map) } } catch {}; setLoading(false); return } } catch {}
        // 回退 localStorage（reservationOrders）
        try {
          const all = JSON.parse(localStorage.getItem('reservationOrders') || '[]')
          const found = all.find((o:any)=> String(o.id)===String(id))
          if (found) {
            const subTotal = (found.items||[]).reduce((s:number,it:any)=> s + (it.price||0)*(it.quantity||0), 0)
            setOrder({
              id: found.id,
              customerAddress: found.customerInfo?.address,
              preferredDate: found.customerInfo?.preferredDate,
              preferredTimeStart: found.customerInfo?.preferredTime,
              preferredTimeEnd: '',
              paymentMethod: found.paymentMethod,
              pointsDeductAmount: found.pointsDiscount,
              serviceItems: (found.items||[]).map((it:any)=> ({ name: it.name, quantity: it.quantity, unitPrice: it.price })),
              subTotal,
            })
            setLoading(false)
            return
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
  if (!order) return null

  const subTotal = Array.isArray(order.serviceItems) ? order.serviceItems.reduce((s:number,it:any)=> s + (it.unitPrice||0)*(it.quantity||0), 0) : (order.subTotal||0)
  const final = Math.max(0, subTotal - (order.pointsDeductAmount||0))
  const timeBand = (order.preferredTimeStart && order.preferredTimeEnd) ? `${order.preferredTimeStart}-${order.preferredTimeEnd}` : (order.preferredTimeStart||'')
  const techs = Array.isArray(order.assignedTechnicians) ? order.assignedTechnicians : []
  const photos = {
    before: Array.isArray(order.photosBefore) ? order.photosBefore : [],
    after: Array.isArray(order.photosAfter) ? order.photosAfter : []
  }

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
          <div>付款方式：<span className="font-medium">{order.paymentMethod||'-'}</span></div>
        </div>
      {(techs.length>0) && (
        <div className="mt-1 text-xs md:text-sm text-gray-700">
          服務技師：
          <span className="font-medium">
            {techs.map((n:string)=> techMap[n] ? `${n}（${techMap[n]}）` : n).join('、')}
          </span>
        </div>
      )}
        <div className="mt-3">
          <div className="font-medium text-gray-800 mb-1">品項明細</div>
          <div className="rounded border">
            <div className="grid grid-cols-4 bg-gray-50 px-2 py-1 text-xs text-gray-600"><div>項目</div><div>數量</div><div>單價</div><div className="text-right">小計</div></div>
            {order.serviceItems?.map((it:any,i:number)=>{
              const sub = (it.unitPrice||0)*(it.quantity||0)
              return <div key={i} className="grid grid-cols-4 items-center px-2 py-1 text-sm"><div>{it.name}</div><div>{it.quantity}</div><div>{it.unitPrice}</div><div className="text-right">{sub}</div></div>
            })}
            <div className="border-t px-2 py-1 text-right text-gray-900">小計：<span className="text-base font-semibold">{subTotal}</span></div>
            {order.pointsDeductAmount ? (
              <div className="px-2 py-1 text-right text-rose-600">積分折抵：- {order.pointsDeductAmount}</div>
            ) : null}
            <div className="border-t px-2 py-1 text-right text-gray-900">應付金額：<span className="text-base font-semibold">{final}</span></div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button disabled={adding} onClick={addToCartAgain} className="rounded bg-gray-900 px-3 py-2 text-white disabled:opacity-60">再次下單</button>
          <a href={buildGoogleCalLink()} target="_blank" rel="noreferrer" className="rounded bg-blue-600 px-3 py-2 text-white text-center">加入 Google 行事曆</a>
          <button onClick={buildICS} className="rounded bg-gray-100 px-3 py-2 text-gray-800">下載 iCal (ICS)</button>
        </div>

        {/* 回饋入口（結案或已完工後顯示） */}
        {(order.status==='closed' || order.status==='completed') && (
          <div className="mt-4 rounded border p-3">
            <div className="mb-2 text-sm font-medium text-gray-800">服務回饋</div>
            <div className="flex flex-wrap gap-2 text-sm">
              <button onClick={()=>setFbOpen('good')} className="rounded bg-emerald-600 px-3 py-2 text-white">上傳好評截圖（+50）</button>
              <button onClick={()=>setFbOpen('suggest')} className="rounded bg-brand-600 px-3 py-2 text-white">提交建議（+50）</button>
            </div>
            <div className="mt-2 text-xs text-gray-500">為保障權益，同一訂單每項類型限提交一次。</div>
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
                <div className="text-xs text-gray-500 mb-1">清洗前</div>
                <div className="grid grid-cols-3 gap-2">
                  {photos.before.map((u:string,i:number)=> (
                    <a key={i} href={u} target="_blank" rel="noreferrer" className="block rounded overflow-hidden border">
                      <img src={u} alt="before" className="h-24 w-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {photos.after.length>0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1">清洗後</div>
                <div className="grid grid-cols-3 gap-2">
                  {photos.after.map((u:string,i:number)=> (
                    <a key={i} href={u} target="_blank" rel="noreferrer" className="block rounded overflow-hidden border">
                      <img src={u} alt="after" className="h-24 w-full object-cover" />
                    </a>
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
                    const resp = await fetch(`/api/orders/member/${encodeURIComponent(member.id)}/orders/${encodeURIComponent(order.id)}/rating`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ kind: 'good', comment: goodNote||null, asset_path: path })
                    })
                    const jj = await resp.json().catch(()=>({ success:false }))
                    if (jj && jj.success) alert('已收到您的好評，謝謝！')
                    else if (jj && jj.error==='already_submitted') alert('已提交過好評，感謝您的支持！')
                    else alert('提交失敗，請稍後再試')
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
                    const resp = await fetch(`/api/orders/member/${encodeURIComponent(member.id)}/orders/${encodeURIComponent(order.id)}/rating`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ kind: 'suggest', comment: suggestText })
                    })
                    const jj = await resp.json().catch(()=>({ success:false }))
                    if (jj && jj.success) alert('已收到您的建議，謝謝！')
                    else if (jj && jj.error==='already_submitted') alert('此訂單已提交過建議，感謝您的回饋！')
                    else alert('提交失敗，請稍後再試')
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
    </div>
  )
}


