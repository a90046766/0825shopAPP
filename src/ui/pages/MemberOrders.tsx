import React, { useEffect, useState } from 'react'
import { getMemberUser } from '../../utils/memberAuth'
import { Link } from 'react-router-dom'
import { supabase } from '../../utils/supabase'

export default function MemberOrdersPage() {
  const member = getMemberUser()
  const [tab, setTab] = useState<'reservations'|'orders'>('orders')
  const [reservations, setReservations] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    if (!member) return
    setLoading(true)
    setError('')
    try {
      const cid = (member as any)?.customerId || member?.id
      const [r1, r2] = await Promise.allSettled([
        fetch(`/api/orders/member/${cid}/reservations`).then(r=>r.json()),
        fetch(`/api/orders/member/${cid}/orders`).then(r=>r.json())
      ])

      let remoteReservations: any[] = []
      let remoteOrders: any[] = []
      if (r1.status === 'fulfilled' && r1.value?.success) remoteReservations = r1.value.data || []
      if (r2.status === 'fulfilled' && r2.value?.success) remoteOrders = r2.value.data || []

      // Supabase 回退：依 email 抓 orders，pending 歸類為預約，其餘為正式
      try {
        if ((r1.status !== 'fulfilled' || !r1.value?.success) || (r2.status !== 'fulfilled' || !r2.value?.success)) {
          const emailLc = (member.email||'').toLowerCase()
          const { data, error } = await supabase.from('orders').select('*').eq('customer_email', emailLc).order('created_at', { ascending: false })
          if (!error && Array.isArray(data)) {
            const mapped = (data||[])
            const pending = mapped.filter((o:any)=> (o.status||'')==='pending').map((o:any)=> ({
              id: o.order_number || o.id,
              status: o.status,
              item_count: Array.isArray(o.service_items) ? o.service_items.reduce((n:number,it:any)=> n + (it.quantity||0), 0) : 0,
              total_price: Array.isArray(o.service_items) ? o.service_items.reduce((s:number,it:any)=> s + ((it.unitPrice||0)*(it.quantity||0)), 0) : 0,
              reservation_date: o.preferred_date || '',
              reservation_time: (o.preferred_time_start && o.preferred_time_end) ? `${o.preferred_time_start}-${o.preferred_time_end}` : (o.preferred_time_start || ''),
              payment_method: o.payment_method || '',
              points_used: o.points_used || 0,
              points_deduct_amount: o.points_deduct_amount || 0,
              address: o.customer_address || '',
              items: Array.isArray(o.service_items) ? o.service_items.map((it:any)=> ({ service_name: it.name, quantity: it.quantity, price: it.unitPrice })) : []
            }))
            const confirmed = mapped.filter((o:any)=> (o.status||'')!=='pending').map((o:any)=> ({
              id: o.order_number || o.id,
              status: o.status,
              items: Array.isArray(o.service_items) ? o.service_items.map((it:any)=> ({ service_name: it.name, quantity: it.quantity, price: it.unitPrice })) : []
            }))
            if (remoteReservations.length===0) remoteReservations = pending
            if (remoteOrders.length===0) remoteOrders = confirmed
          }
        }
      } catch {}

      // 本地預約資料（聚合：以訂單為單位）
      let localReservations: any[] = []
      try {
        const all = JSON.parse(localStorage.getItem('reservationOrders') || '[]')
        const email = (member.email || '').toLowerCase()
        const mine = all.filter((o:any)=> (o?.customerInfo?.email||'').toLowerCase() === email)
        localReservations = mine.map((o:any) => ({
          id: o.id,
          status: o.status || 'pending',
          item_count: (o.items||[]).reduce((n:number, it:any)=> n + (it.quantity||0), 0),
          total_price: Number(o.finalPrice || o.totalPrice || 0),
          reservation_date: o.customerInfo?.preferredDate || '',
          reservation_time: o.customerInfo?.preferredTime || '',
          payment_method: o.paymentMethod || '',
          points_used: o.pointsUsed || 0,
          points_deduct_amount: o.pointsDiscount || 0,
          address: o.customerInfo?.address || o.customerInfo?.street || '',
          discount_code: o.discountCode || '',
          items: (o.items||[]).map((it:any)=> ({ service_name: it.name, quantity: it.quantity, price: it.price }))
        }))
      } catch {}

      setReservations([...(remoteReservations||[]), ...localReservations])
      setOrders(remoteOrders)

      if ((r1.status === 'fulfilled' && !r1.value?.success) || (r2.status === 'fulfilled' && !r2.value?.success)) {
        setError((r1 as any).value?.error || (r2 as any).value?.error || '')
      }
    } catch (e: any) {
      setError(e?.message || '載入失敗')
    } finally {
      setLoading(false)
    }
  }

  const submitRating = async (orderId: number, stars: number, score: number, comment: string) => {
    if (!member) return
    try {
      const cid = (member as any)?.customerId || member?.id
      const res = await fetch(`/api/orders/member/${cid}/orders/${orderId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stars, score, comment })
      })
      const j = await res.json()
      if (!j.success) throw new Error(j.error || '提交評價失敗')
      await load()
      alert('感謝您的評價！')
    } catch (e: any) {
      alert(e?.message || '提交評價失敗')
    }
  }

  useEffect(() => { load() }, [])

  if (!member) {
    return (
      <div className="p-6 text-center">
        <div className="mb-3 text-gray-600">請先登入會員後查看您的訂單</div>
        <Link to="/login/member" className="rounded bg-blue-600 px-4 py-2 text-white">會員登入</Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-base md:text-lg font-bold">我的訂單</div>
        <div className="flex gap-2">
          <button onClick={()=>setTab('orders')} className={`rounded px-3 py-1 text-sm ${tab==='orders'?'bg-gray-900 text-white':'border'}`}>正式訂單</button>
          <button onClick={()=>setTab('reservations')} className={`rounded px-3 py-1 text-sm ${tab==='reservations'?'bg-gray-900 text-white':'border'}`}>預約訂單</button>
        </div>
      </div>
      <div className="mb-3 flex items-center gap-2 text-sm">
        <Link to="/store" className="text-blue-600 hover:underline">返回首頁</Link>
        <span className="text-gray-300">|</span>
        <Link to="/shop/products" className="text-blue-600 hover:underline">返回購物</Link>
      </div>

      {error && <div className="mb-3 rounded bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
      {loading && <div className="text-sm text-gray-500">載入中...</div>}

      {tab==='reservations' && (
        <div className="space-y-3">
          {reservations.map((r:any)=>(
            <Link to={`/member/orders/${encodeURIComponent(r.id)}`} className="block rounded border p-3 md:p-4 hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="font-medium text-sm md:text-base">預約單號 {r.id}</div>
                <span className="ml-auto text-[11px] md:text-xs rounded px-2 py-0.5 bg-gray-100">{r.status}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs md:text-sm text-gray-700">
                <div>品項數量：<span className="font-medium">{r.item_count}</span></div>
                <div>預估金額：<span className="font-medium">NT$ {Number(r.total_price||0).toLocaleString()}</span></div>
                <div>期望日期：<span className="font-medium">{r.reservation_date || '-'}</span></div>
                <div>期望時間：<span className="font-medium">{r.reservation_time || '-'}</span></div>
              </div>
              {r.payment_method || r.points_used || r.points_deduct_amount || r.address || r.discount_code ? (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs md:text-sm text-gray-700">
                  {r.payment_method && <div>付款方式：<span className="font-medium">{r.payment_method}</span></div>}
                  {(r.points_used||r.points_deduct_amount) && (
                    <div>積分折抵：<span className="font-medium">{r.points_used||0} 點（-NT$ {(r.points_deduct_amount||0).toLocaleString()}）</span></div>
                  )}
                  {r.address && <div className="truncate">地址：<span className="font-medium">{r.address}</span></div>}
                  {r.discount_code && <div>折扣碼：<span className="font-medium">{r.discount_code}</span></div>}
                </div>
              ) : null}
              <div className="mt-2 text-xs md:text-sm text-gray-600">
                {Array.isArray(r.items) && r.items.length>0 && (
                  <div>
                    <div className="font-medium text-gray-800 mb-1">品項明細</div>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {r.items.map((it:any, idx:number)=> (
                        <li key={idx}>{it.service_name} ×{it.quantity}（NT$ {Number(it.price||0).toLocaleString()}）</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Link>
          ))}
          {reservations.length===0 && <div className="text-sm text-gray-500">目前沒有預約訂單</div>}
        </div>
      )}

      {tab==='orders' && (
        <div className="space-y-3">
          {orders.map((o:any)=>{
            const amount = Array.isArray(o.items) ? o.items.reduce((s:number,it:any)=> s + (Number(it.price)||0)*(Number(it.quantity)||0), 0) : 0
            const count = Array.isArray(o.items) ? o.items.reduce((n:number,it:any)=> n + (Number(it.quantity)||0), 0) : 0
            return (
              <Link key={o.id} to={`/member/orders/${encodeURIComponent(o.order_number||o.id)}`} className="block rounded border p-3 md:p-4 hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm md:text-base">訂單編號 {o.order_number || o.id}</div>
                  <span className="ml-auto text-[11px] md:text-xs rounded px-2 py-0.5 bg-gray-100">{o.status}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs md:text-sm text-gray-700">
                  <div>品項數量：<span className="font-medium">{count}</span></div>
                  <div>預估金額：<span className="font-medium">NT$ {amount.toLocaleString()}</span></div>
                </div>
                <div className="mt-2 space-y-1 text-xs md:text-sm text-gray-600">
                  {(o.items||[]).slice(0,3).map((it:any,idx:number)=> (
                    <div key={idx}>• {it.service_name} ×{it.quantity}（NT$ {Number(it.price||0).toLocaleString()}）</div>
                  ))}
                  {(Array.isArray(o.items) && o.items.length>3) && (
                    <div className="text-gray-400">… 其餘 {o.items.length-3} 項</div>
                  )}
                </div>
                {o.photos && o.photos.length>0 && (
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {o.photos.map((p:any)=> (
                      <img key={p.id} src={p.url} alt={p.caption||''} className="h-24 w-full object-cover rounded" />
                    ))}
                  </div>
                )}
                {o.status==='completed' && (
                  <div className="mt-3 rounded bg-gray-50 p-3">
                    <div className="text-sm font-medium mb-2">為本次服務評價</div>
                    <RatingForm orderId={o.id} onSubmit={submitRating} />
                  </div>
                )}
              </Link>
            )
          })}
          {orders.length===0 && <div className="text-sm text-gray-500">目前沒有正式訂單</div>}
        </div>
      )}

      {/* 行動底部安全間距 */}
      <div className="h-16 md:h-0" />
    </div>
  )
}

function RatingForm({ orderId, onSubmit }:{ orderId: number; onSubmit: (orderId:number, stars:number, score:number, comment:string)=>void }){
  const [stars, setStars] = useState(5)
  const [score, setScore] = useState(100)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)

  const handle = async () => {
    setSending(true)
    try{ await onSubmit(orderId, stars, score, comment) } finally { setSending(false) }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm">
        <label>星等</label>
        <select value={stars} onChange={e=>setStars(Number(e.target.value))} className="rounded border px-2 py-1">
          {[5,4,3,2,1].map(n=> <option key={n} value={n}>{n} 星</option>)}
        </select>
        <label className="ml-3">總分</label>
        <input type="number" min={0} max={100} value={score} onChange={e=>setScore(Number(e.target.value))} className="w-20 rounded border px-2 py-1" />
      </div>
      <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="服務感受、改進建議..." className="rounded border p-2 text-sm" rows={3} />
      <div>
        <button disabled={sending} onClick={handle} className="rounded bg-blue-600 px-3 py-1 text-white text-sm">{sending?'送出中...':'送出評價'}</button>
      </div>
    </div>
  )
}
