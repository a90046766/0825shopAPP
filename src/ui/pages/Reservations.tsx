import { useEffect, useState } from 'react'
import { loadAdapters } from '../../adapters'
import { Link } from 'react-router-dom'
import { authRepo } from '../../adapters/local/auth'
import { can } from '../../utils/permissions'
import { validateAddressServiceArea } from '../../utils/location'

export default function ReservationsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [repos, setRepos] = useState<any>(null)
  const user = authRepo.getCurrentUser()
  const [q, setQ] = useState('')
  const [statusTab, setStatusTab] = useState<'all'|'pending'|'confirmed'|'canceled'>('all')
  
  const load = async () => { 
    if (!repos) return
    try {
      const reservations = await (repos as any).reservationsRepo?.list?.() || []
      setRows(reservations)
    } catch (error) {
      console.error('載入預約訂單失敗:', error)
      setRows([])
    }
  }
  
  useEffect(() => { (async()=>{ const a = await loadAdapters(); setRepos(a) })() }, [])
  useEffect(() => { if (repos) load() }, [repos])

  const filtered = rows.filter(r => {
    const hit = !q || r.id.includes(q) || (r.customerName||'').includes(q) || (r.customerPhone||'').includes(q)
    const byStatus = statusTab === 'all' || r.status === statusTab
    return hit && byStatus
  })

  const counts = {
    all: rows.length,
    pending: rows.filter(r => r.status === 'pending').length,
    confirmed: rows.filter(r => r.status === 'confirmed').length,
    canceled: rows.filter(r => r.status === 'canceled').length,
  }

  const confirmReservation = async (reservation: any) => {
    if (!repos || !can(user, 'orders.create')) return
    
    try {
      // 地址驗證：檢查是否為非標準服務區
      const addressValidation = validateAddressServiceArea(reservation.customerAddress || '')
      if (!addressValidation.isValid) {
        alert(addressValidation.message)
        return
      }
      
      // 自動新增客戶（如果不存在）
      if (reservation.customerPhone && reservation.customerName) {
        try {
          const existingCustomers = await repos.customerRepo.list()
          const existingCustomer = existingCustomers.find((c: any) => c.phone === reservation.customerPhone)
          
          if (!existingCustomer) {
            // 創建新客戶
            const newCustomer = {
              name: reservation.customerName,
              phone: reservation.customerPhone,
              email: reservation.customerEmail || '',
              addresses: [{
                id: `ADDR-${Math.random().toString(36).slice(2,8)}`,
                address: reservation.customerAddress || ''
              }],
              notes: '自動從購物車預約新增',
              blacklisted: false
            }
            await repos.customerRepo.upsert(newCustomer)
            console.log('已自動新增客戶:', reservation.customerName)
          }
        } catch (error) {
          console.log('自動新增客戶失敗:', error)
          // 不阻擋訂單創建，只記錄錯誤
        }
      }
      
      // 將預約訂單轉換為正式訂單
      const orderData = {
        id: '',
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone,
        customerAddress: reservation.customerAddress || '',
        preferredDate: '',
        preferredTimeStart: '09:00',
        preferredTimeEnd: '12:00',
        platform: 'cart',
        referrerCode: '',
        memberId: null,
        serviceItems: reservation.items || [],
        assignedTechnicians: [],
        signatures: {},
        photos: [],
        photosBefore: [],
        photosAfter: [],
        paymentMethod: '',
        paymentStatus: 'pending',
        pointsUsed: 0,
        pointsDeductAmount: 0,
        category: 'service',
        channel: 'cart',
        status: 'confirmed',
        workStartedAt: null,
        workCompletedAt: null,
        serviceFinishedAt: null,
        canceledReason: '',
      }

      await repos.orderRepo.create(orderData)
      
      // 更新預約訂單狀態為已確認
      await (repos as any).reservationsRepo.update(reservation.id, { status: 'confirmed' })
      
      alert('預約訂單已轉換為正式訂單')
      load()
    } catch (error) {
      console.error('轉換預約訂單失敗:', error)
      alert('轉換失敗：' + (error as any)?.message || '未知錯誤')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">預約訂單</div>
        <div className="flex items-center gap-2">
          <input placeholder="搜尋客戶/電話" className="rounded border px-2 py-1 text-sm" value={q} onChange={e=>setQ(e.target.value)} />
        </div>
      </div>

      {/* 狀態統計 */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {([
          ['all','全部', counts.all],
          ['pending','待確認', counts.pending],
          ['confirmed','已確認', counts.confirmed],
          ['canceled','已取消', counts.canceled],
        ] as any[]).map(([key,label,num])=> (
          <button key={key} onClick={()=>setStatusTab(key)} className={`rounded-2xl border p-4 text-left shadow-card ${statusTab===key? 'ring-2 ring-brand-400' : ''}`}>
            <div className="text-xs text-gray-500">{label}</div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums">{num}</div>
          </button>
        ))}
      </div>

      {/* 預約訂單列表 */}
      <div className="space-y-3">
        {filtered.map(r => (
          <div key={r.id} className={`rounded-xl border p-4 shadow-card ${r.status === 'pending' ? 'border-amber-400 bg-amber-50' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{r.customerName}</div>
                  <div className="text-sm text-gray-500">{r.customerPhone}</div>
                  <span className={`rounded px-2 py-0.5 text-xs ${
                    r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    r.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {r.status === 'pending' ? '待確認' : 
                     r.status === 'confirmed' ? '已確認' : '已取消'}
                  </span>
                </div>
                
                {/* 預約項目 */}
                <div className="mt-2 space-y-1">
                  {(r.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="text-sm text-gray-600">
                      • {item.name} x{item.quantity} - ${item.unitPrice}
                    </div>
                  ))}
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  建立時間：{new Date(r.createdAt).toLocaleString('zh-TW')}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {r.status === 'pending' && can(user, 'orders.create') && (
                  <button 
                    onClick={() => confirmReservation(r)}
                    className="rounded-lg bg-brand-500 px-3 py-1 text-white text-sm"
                  >
                    確認轉換
                  </button>
                )}
                <Link 
                  to={`/orders/${r.id}`} 
                  className="rounded-lg bg-gray-900 px-3 py-1 text-white text-sm"
                >
                  查看詳情
                </Link>
              </div>
            </div>
          </div>
        ))}
        
        {filtered.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            {rows.length === 0 ? '尚無預約訂單' : '沒有符合條件的預約訂單'}
          </div>
        )}
      </div>
    </div>
  )
}


