import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, CreditCard, Landmark, ArrowRight } from 'lucide-react'
import { loadAdapters } from '../../adapters'

export default function OrderSuccessPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const qs = useMemo(() => new URLSearchParams(location.search), [location.search])
  const orderId = qs.get('order') || localStorage.getItem('lastOrderId') || ''

  const [order, setOrder] = useState<any>(null)
  const [last5, setLast5] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem('reservationOrders') || '[]')
      const found = all.find((o: any) => o.id === orderId)
      setOrder(found || null)
    } catch {}
    ;(async()=>{
      // 若本地找不到，嘗試從雲端載入
      try {
        if (!orderId) return
        if (order) return
        const repos = await loadAdapters()
        const o = await repos.orderRepo.get(orderId).catch(()=>null)
        if (!o) return
        // 正規化為成功頁顯示需要的欄位
        const subTotal = Array.isArray(o.serviceItems) ? o.serviceItems.reduce((s:any,it:any)=> s + ((it.unitPrice||0)*(it.quantity||0)), 0) : 0
        const finalPrice = Math.max(0, subTotal - (o.pointsDeductAmount||0))
        const normalized = {
          id: o.id,
          paymentMethod: o.paymentMethod,
          finalPrice,
          customerInfo: {
            address: o.customerAddress,
            preferredDate: o.preferredDate,
            preferredTime: (o.preferredTimeStart && o.preferredTimeEnd) ? `${o.preferredTimeStart}-${o.preferredTimeEnd}` : ''
          }
        }
        setOrder(normalized)
      } catch {}
    })()
  }, [orderId])

  const saveRemit = async () => {
    if (!order || !last5 || last5.length < 5) return
    // 優先雲端
    try {
      const repos = await loadAdapters()
      const newNote = `${order?.note ? order.note + '\n' : ''}匯款末五碼：${last5}`
      await repos.orderRepo.update(order.id, { paymentStatus: 'pending' as any, note: newNote })
      setSaved(true)
      return
    } catch {}
    // 回退本地
    try {
      const all = JSON.parse(localStorage.getItem('reservationOrders') || '[]')
      const idx = all.findIndex((o: any) => o.id === order.id)
      if (idx >= 0) {
        all[idx] = { ...all[idx], remitLast5: last5, paymentReported: true }
        localStorage.setItem('reservationOrders', JSON.stringify(all))
        setSaved(true)
      }
    } catch {}
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card text-center">
          <div className="text-emerald-600 mx-auto w-16 h-16 flex items-center justify-center">
            <CheckCircle className="h-12 w-12" />
          </div>
          <div className="mt-3 text-lg font-semibold">訂單已提交</div>
          <div className="mt-2 text-gray-600">找不到訂單詳情，您可以前往我的訂單查看。</div>
          <div className="mt-6 grid grid-cols-1 gap-3">
            <Link to="/member/orders" className="w-full rounded-xl bg-gray-900 py-3 text-white hover:bg-gray-800 text-center">我的訂單</Link>
            <Link to="/store" className="w-full rounded-xl bg-gray-100 py-3 text-gray-800 hover:bg-gray-200 text-center">返回購物站</Link>
          </div>
        </div>
      </div>
    )
  }

  const isTransfer = order.paymentMethod === 'transfer'
  const isCash = order.paymentMethod === 'cash'
  const isCard = order.paymentMethod === 'card'

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">訂單提交成功</h1>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">訂單編號</div>
              <div className="font-semibold">{order.id}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">應付金額</div>
              <div className="font-semibold">NT$ {Number(order.finalPrice || 0).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">付款方式</div>
              <div className="font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4" /> {order.paymentMethod === 'transfer' ? '匯款' : order.paymentMethod === 'card' ? '刷卡' : '現金'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">期望時間</div>
              <div className="font-semibold">{order.customerInfo?.preferredDate || '-'} {order.customerInfo?.preferredTime || ''}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-gray-500">服務地址</div>
              <div className="font-semibold break-words">{order.customerInfo?.address}</div>
            </div>
          </div>

          {isTransfer && (
            <div className="mt-8 rounded-xl border p-4 bg-amber-50 border-amber-200">
              <div className="flex items-center gap-2 text-amber-900 font-semibold mb-2">
                <Landmark className="h-5 w-5" /> 匯款資訊
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-amber-900">
                <div>銀行代號：<span className="font-semibold">812</span></div>
                <div>銀行名稱：<span className="font-semibold">台新銀行</span></div>
                <div>帳號：<span className="font-semibold">0000-000-0000000</span></div>
              </div>
              <div className="mt-2 text-xs text-amber-700">以上為示意資訊，實際匯款帳號以客服提供為準。</div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-amber-900 mb-1">回報匯款末五碼</label>
                <div className="flex gap-2">
                  <input value={last5} onChange={(e)=> setLast5(e.target.value.replace(/[^0-9]/g, '').slice(-5))} className="flex-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-amber-400 focus:border-transparent" placeholder="請輸入末五碼（數字）" />
                  <button onClick={saveRemit} className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700">送出</button>
                </div>
                {saved && <div className="mt-2 text-sm text-emerald-700">已收到您的匯款資訊，我們將儘速對帳。</div>}
              </div>
            </div>
          )}

          {isCard && (
            <div className="mt-8 rounded-xl border p-4 bg-blue-50 border-blue-200 text-blue-900 text-sm">
              線上刷卡／Apple Pay 功能即將開通。現階段將由技師到府行動刷卡，或請聯繫客服調整付款方式。
            </div>
          )}

          {isCash && (
            <div className="mt-8 rounded-xl border p-4 bg-emerald-50 border-emerald-200 text-emerald-900 text-sm">
              將於到府完成服務後以現金付款。
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to="/member/orders" className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-gray-900 text-white hover:bg-gray-800">
              查看我的訂單
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <button onClick={()=> navigate('/store')} className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-gray-100 text-gray-800 hover:bg-gray-200">
              返回購物站
            </button>
            <a
              href="https://line.me/R/ti/p/@942clean"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 sm:col-span-2"
            >加入官方 LINE</a>
          </div>
        </div>
      </div>
    </div>
  )
}


