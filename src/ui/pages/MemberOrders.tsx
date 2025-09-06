import React, { useEffect, useState } from 'react'
import { getMemberUser } from '../../utils/memberAuth'
import { Link } from 'react-router-dom'
import { Home, ShoppingBag, ClipboardList, CheckCircle2, Share2 } from 'lucide-react'
import ShareReferral from '../components/ShareReferral'
import { supabase } from '../../utils/supabase'

function normalizeTimeSlot(raw: string): string {
  if (!raw) return ''
  const text = String(raw).toLowerCase().trim()
  // 直接時間區間格式（09:00-12:00）維持原樣
  if (/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/.test(text)) return raw
  // 常見英文/中文時段對應
  const map: Record<string, string> = {
    'morning': '09:00-12:00',
    '上午': '09:00-12:00',
    'afternoon': '13:00-17:00',
    '下午': '13:00-17:00',
    'evening': '18:00-21:00',
    '晚上': '18:00-21:00',
  }
  if (map[text]) return map[text]
  // 若像是 '09:00' 單點，給一個推定範圍
  if (/^\d{1,2}:\d{2}$/.test(text)) {
    const [h, m] = text.split(':').map(Number)
    if (h < 12) return '09:00-12:00'
    if (h < 18) return '13:00-17:00'
    return '18:00-21:00'
  }
  return raw
}

export default function MemberOrdersPage() {
  const member = getMemberUser()
  const [tab, setTab] = useState<'reservations'|'orders'>('orders')
  const [reservations, setReservations] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shareOpen, setShareOpen] = useState(false)

  const load = async () => {
    if (!member) return
    setLoading(true)
    setError('')
    try {
      // 會員端：預約訂單讀取本地後端（以 customerId）
      let resv: any[] = []
      try {
        const cid = (member as any)?.customerId || ''
        if (cid) {
          const r = await fetch(`/api/orders/member/${encodeURIComponent(cid)}/reservations`)
          const j = await r.json(); if (j?.success) {
            // 後端是逐品項；前端聚合為單一預約卡片
            const grouped: Record<string, any> = {}
            for (const row of j.data || []) {
              const key = row.reservation_number
              if (!grouped[key]) {
                grouped[key] = {
                  id: row.reservation_number,
                  status: row.status,
                  item_count: 0,
                  total_price: 0,
                  reservation_date: row.reservation_date,
                  reservation_time: row.reservation_time,
                  reservation_time_display: normalizeTimeSlot(row.reservation_time),
                  payment_method: '',
                  points_used: 0,
                  points_deduct_amount: 0,
                  address: row.customer_address || '',
                  items: []
                }
              }
              grouped[key].item_count += Number(row.quantity||0)
              grouped[key].total_price += Number(row.service_price||0) * Number(row.quantity||0)
              grouped[key].items.push({ service_name: row.service_name || '服務', quantity: row.quantity, price: row.service_price })
            }
            resv = Object.values(grouped)
          }
        }
      } catch {}

      // 正式訂單仍可讀 supabase（如已轉單）
      const emailLc = (member.email||'').toLowerCase()
      const { data, error } = await supabase.from('orders').select('*').eq('customer_email', emailLc).order('created_at', { ascending: false })
      if (error) throw error
      const supOrders = (data||[]).filter((o:any)=> (o.status||'')!=='pending').map((o:any)=> ({
        id: o.order_number || o.id,
        status: o.status,
        items: Array.isArray(o.service_items) ? o.service_items.map((it:any)=> ({ service_name: it.name, quantity: it.quantity, price: it.unitPrice })) : []
      }))

      setReservations(resv)
      setOrders(supOrders)
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
          <button onClick={()=>setTab('orders')} className={`rounded px-3 py-1 text-sm ${tab==='orders'?'bg-blue-600 text-white':'border border-blue-200 text-blue-600'}`}>正式訂單</button>
          <button onClick={()=>setTab('reservations')} className={`rounded px-3 py-1 text-sm ${tab==='reservations'?'bg-amber-600 text-white':'border border-amber-200 text-amber-700'}`}>預約訂單</button>
        </div>
      </div>
      {/* 快速入口卡牌 */}
      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/store" className="rounded-xl border border-blue-200 bg-blue-50 p-3 hover:bg-blue-100/70 transition-colors">
          <div className="flex items-center gap-2 text-blue-900">
            <Home className="h-5 w-5" />
            <div className="font-semibold">首頁</div>
          </div>
        </Link>
        <Link to="/store/products" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 hover:bg-emerald-100/70 transition-colors">
          <div className="flex items-center gap-2 text-emerald-900">
            <ShoppingBag className="h-5 w-5" />
            <div className="font-semibold">返回購物</div>
          </div>
        </Link>
        <button onClick={()=>setTab('orders')} className="text-left rounded-xl border border-indigo-200 bg-indigo-50 p-3 hover:bg-indigo-100/70 transition-colors">
          <div className="flex items-center gap-2 text-indigo-900">
            <CheckCircle2 className="h-5 w-5" />
            <div className="font-semibold">正式訂單</div>
          </div>
        </button>
        <button onClick={()=>setTab('reservations')} className="text-left rounded-xl border border-amber-200 bg-amber-50 p-3 hover:bg-amber-100/70 transition-colors">
          <div className="flex items-center gap-2 text-amber-900">
            <ClipboardList className="h-5 w-5" />
            <div className="font-semibold">預約訂單</div>
          </div>
        </button>
        <button onClick={()=>setShareOpen(true)} className="text-left rounded-xl border border-rose-200 bg-rose-50 p-3 hover:bg-rose-100/70 transition-colors">
          <div className="flex items-center gap-2 text-rose-900">
            <Share2 className="h-5 w-5" />
            <div className="font-semibold">分享推薦</div>
          </div>
        </button>
      </div>

      {error && <div className="mb-3 rounded bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
      {loading && <div className="text-sm text-gray-500">載入中...</div>}

      {tab==='reservations' && (
        <div className="space-y-3">
          {reservations.map((r:any)=>(
            <Link to={`/store/member/orders/${encodeURIComponent(r.id)}`} className="block rounded-xl border border-amber-200 bg-amber-50 p-3 md:p-4 hover:bg-amber-100/70 transition-colors">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-sm md:text-base text-amber-900">預約單號 {r.id}</div>
                <span className="ml-auto text-[11px] md:text-xs rounded px-2 py-0.5 bg-amber-200 text-amber-800">{r.status}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs md:text-sm text-amber-900/90">
                <div>品項數量：<span className="font-semibold">{r.item_count}</span></div>
                <div>預估金額：<span className="font-semibold">NT$ {Number(r.total_price||0).toLocaleString()}</span></div>
                <div>期望日期：<span className="font-semibold">{r.reservation_date || '-'}</span></div>
                <div>期望時間：<span className="font-semibold">{r.reservation_time_display || r.reservation_time || '-'}</span></div>
              </div>
              {r.payment_method || r.points_used || r.points_deduct_amount || r.address || r.discount_code ? (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs md:text-sm text-amber-900/90">
                  {r.payment_method && <div>付款方式：<span className="font-semibold">{r.payment_method}</span></div>}
                  {(r.points_used||r.points_deduct_amount) && (
                    <div>積分折抵：
                      <span className="font-semibold">{r.points_used||0} 點（-NT$ {(r.points_deduct_amount||0).toLocaleString()}）</span>
                    </div>
                  )}
                  {r.address && <div className="truncate">地址：<span className="font-semibold">{r.address}</span></div>}
                  {r.discount_code && <div>折扣碼：<span className="font-semibold">{r.discount_code}</span></div>}
                </div>
              ) : null}
              <div className="mt-2 text-xs md:text-sm text-amber-900/80">
                {Array.isArray(r.items) && r.items.length>0 && (
                  <div>
                    <div className="font-semibold text-amber-900 mb-1">品項明細</div>
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
              <Link key={o.id} to={`/store/member/orders/${encodeURIComponent(o.order_number||o.id)}`} className="block rounded-xl border border-blue-200 bg-blue-50 p-3 md:p-4 hover:bg-blue-100/70 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-sm md:text-base text-blue-900">訂單編號 {o.order_number || o.id}</div>
                  <span className="ml-auto text-[11px] md:text-xs rounded px-2 py-0.5 bg-blue-200 text-blue-800">{o.status}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs md:text-sm text-blue-900/90">
                  <div>品項數量：<span className="font-semibold">{count}</span></div>
                  <div>預估金額：<span className="font-semibold">NT$ {amount.toLocaleString()}</span></div>
                </div>
                <div className="mt-2 space-y-1 text-xs md:text-sm text-blue-900/80">
                  {(o.items||[]).slice(0,3).map((it:any,idx:number)=> (
                    <div key={idx}>• {it.service_name} ×{it.quantity}（NT$ {Number(it.price||0).toLocaleString()}）</div>
                  ))}
                  {(Array.isArray(o.items) && o.items.length>3) && (
                    <div className="text-blue-800/50">… 其餘 {o.items.length-3} 項</div>
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
                  <div className="mt-3 rounded bg-blue-100/50 p-3">
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
      {shareOpen && (
        <ShareReferral code={(member?.code)||''} onClose={()=>setShareOpen(false)} />
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
