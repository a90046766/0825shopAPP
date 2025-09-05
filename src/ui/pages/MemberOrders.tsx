import React, { useEffect, useState } from 'react'
import { getMemberUser } from '../../utils/memberAuth'
import { Link } from 'react-router-dom'

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
      const [r1, r2] = await Promise.all([
        fetch(`/api/orders/member/${cid}/reservations`).then(r=>r.json()),
        fetch(`/api/orders/member/${cid}/orders`).then(r=>r.json())
      ])
      if (r1.success) setReservations(r1.data || [])
      if (r2.success) setOrders(r2.data || [])
      if (!r1.success) setError(r1.error || '載入預約訂單失敗')
      if (!r2.success) setError((prev)=> prev || r2.error || '載入正式訂單失敗')
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
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-bold">我的訂單</div>
        <div className="flex gap-2">
          <button onClick={()=>setTab('orders')} className={`rounded px-3 py-1 text-sm ${tab==='orders'?'bg-gray-900 text-white':'border'}`}>正式訂單</button>
          <button onClick={()=>setTab('reservations')} className={`rounded px-3 py-1 text-sm ${tab==='reservations'?'bg-gray-900 text-white':'border'}`}>預約訂單</button>
        </div>
      </div>

      {error && <div className="mb-3 rounded bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
      {loading && <div className="text-sm text-gray-500">載入中...</div>}

      {tab==='reservations' && (
        <div className="space-y-3">
          {reservations.map((r:any)=>(
            <div key={r.id} className="rounded border p-4">
              <div className="flex items-center gap-2">
                <div className="font-medium">{r.service_name}</div>
                <div className="text-sm text-gray-500">數量 {r.quantity}</div>
                <span className="ml-auto text-xs rounded px-2 py-0.5 bg-gray-100">{r.status}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">預約時間：{r.reservation_date} {r.reservation_time}</div>
            </div>
          ))}
          {reservations.length===0 && <div className="text-sm text-gray-500">目前沒有預約訂單</div>}
        </div>
      )}

      {tab==='orders' && (
        <div className="space-y-3">
          {orders.map((o:any)=>(
            <div key={o.id} className="rounded border p-4">
              <div className="flex items-center gap-2">
                <div className="font-medium">訂單編號 {o.order_number || o.id}</div>
                <span className="ml-auto text-xs rounded px-2 py-0.5 bg-gray-100">{o.status}</span>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                {(o.items||[]).map((it:any)=> (
                  <div key={it.id}>• {it.service_name} x{it.quantity} (${it.price})</div>
                ))}
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
            </div>
          ))}
          {orders.length===0 && <div className="text-sm text-gray-500">目前沒有正式訂單</div>}
        </div>
      )}
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
