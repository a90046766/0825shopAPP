import { useEffect, useState } from 'react'
import { loadAdapters } from '../../adapters'

export default function CustomersPage() {
  const [rows, setRows] = useState<any[]>([])
  const [edit, setEdit] = useState<any | null>(null)
  const [repos, setRepos] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { 
    (async()=>{ 
      const a = await loadAdapters(); 
      setRepos(a); 
      
      // 載入客戶資料
      const customers = await (a as any).customerRepo.list()
      setRows(customers)
      
      // 載入訂單資料（用於服務紀錄）
      try {
        const orderList = await (a as any).orderRepo.list()
        setOrders(orderList)
      } catch (error) {
        console.log('無法載入訂單資料:', error)
      }
      
      setLoading(false)
    })() 
  }, [])

  // 過濾客戶
  const filteredRows = rows.filter(customer => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.addresses?.some((addr: any) => 
        addr.address?.toLowerCase().includes(searchLower)
      ) ||
      customer.notes?.toLowerCase().includes(searchLower)
    )
  })

  // 獲取客戶的服務紀錄
  const getCustomerServiceHistory = (customerPhone: string, customerEmail?: string) => {
    if (!orders || orders.length === 0) return []
    
    return orders.filter(order => {
      // 匹配手機號碼
      if (order.customerPhone === customerPhone) return true
      
      // 匹配 Email（如果有）
      if (customerEmail && order.customerEmail === customerEmail) return true
      
      return false
    }).map(order => ({
      orderNumber: order.orderNumber || order.id,
      date: order.createdAt,
      status: order.status,
      serviceItems: order.serviceItems,
      totalAmount: order.serviceItems?.reduce((sum: number, item: any) => 
        sum + (item.quantity * item.unitPrice), 0
      ) || 0
    }))
  }

  // 自動新增客戶（從訂單資料）
  const autoCreateCustomerFromOrder = async (orderData: any) => {
    if (!repos) return null
    
    try {
      // 檢查是否已存在相同手機的客戶
      const existingCustomer = rows.find(c => c.phone === orderData.customerPhone)
      if (existingCustomer) {
        return existingCustomer
      }
      
      // 創建新客戶
      const newCustomer = {
        name: orderData.customerName,
        phone: orderData.customerPhone,
        email: orderData.customerEmail || '',
        addresses: [{
          id: `ADDR-${Math.random().toString(36).slice(2,8)}`,
          address: orderData.customerAddress
        }],
        notes: '自動從訂單新增',
        blacklisted: false
      }
      
      const createdCustomer = await (repos as any).customerRepo.upsert(newCustomer)
      
      // 更新本地狀態
      setRows(prev => [createdCustomer, ...prev])
      
      return createdCustomer
    } catch (error) {
      console.error('自動新增客戶失敗:', error)
      return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">載入中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 標題和新增按鈕 */}
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">客戶管理</div>
        <button 
          onClick={()=>setEdit({ 
            name:'', 
            phone:'', 
            email:'', 
            addresses:[], 
            notes: '',
            blacklisted:false 
          })} 
          className="rounded-lg bg-brand-500 px-3 py-1 text-white hover:bg-brand-600"
        >
          新增客戶
        </button>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <input 
          type="text" 
          placeholder="搜尋姓名、手機、地址、信箱..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 pl-10 focus:border-brand-500 focus:outline-none"
        />
        <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* 統計信息 */}
      <div className="text-sm text-gray-500">
        共 {filteredRows.length} 個客戶 {searchTerm ? `(已過濾)` : ''}
      </div>

      {/* 客戶列表 */}
      <div className="space-y-3">
        {filteredRows.map(c => {
          const serviceHistory = getCustomerServiceHistory(c.phone, c.email)
          
          return (
            <div key={c.id} className="rounded-xl border bg-white p-4 shadow-card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`font-semibold text-lg ${c.blacklisted? 'text-rose-600' : ''}`}>
                      {c.name}
                    </div>
                    {c.blacklisted && (
                      <span className="rounded bg-rose-100 px-2 py-1 text-xs text-rose-700">
                        黑名單
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    📱 {c.phone} {c.email && `· 📧 ${c.email}`}
                  </div>
                  
                  {c.addresses?.length > 0 && (
                    <div className="text-xs text-gray-500 mb-2">
                      📍 {c.addresses.map((a:any) => a.address).join(' / ')}
                    </div>
                  )}
                  
                  {c.notes && (
                    <div className="text-sm text-gray-600 mb-2">
                      📝 {c.notes}
                    </div>
                  )}
                  
                  {/* 服務紀錄 */}
                  {serviceHistory.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        📋 服務紀錄 ({serviceHistory.length} 筆)
                      </div>
                      <div className="space-y-1">
                        {serviceHistory.slice(0, 3).map((record, idx) => (
                          <div key={idx} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            <div className="flex justify-between">
                              <span>訂單 {record.orderNumber}</span>
                              <span className="text-gray-500">
                                {new Date(record.date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-gray-500">
                              {record.serviceItems?.map((item: any) => item.name).join(', ')}
                            </div>
                            <div className="text-gray-500">
                              金額: ${record.totalAmount.toLocaleString()}
                            </div>
                          </div>
                        ))}
                        {serviceHistory.length > 3 && (
                          <div className="text-xs text-gray-500">
                            還有 {serviceHistory.length - 3} 筆紀錄...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <button 
                    onClick={()=>setEdit(c)} 
                    className="rounded-lg bg-gray-900 px-3 py-1 text-white text-sm hover:bg-gray-800"
                  >
                    編輯
                  </button>
                  <button 
                    onClick={()=>{ 
                      const last6 = String(c.phone||'').replace(/\D/g,'').slice(-6); 
                      alert(`已重設為手機後六碼：${last6||'（無手機）'}（示意）`) 
                    }} 
                    className="rounded-lg bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
                  >
                    重設密碼
                  </button>
                  <button 
                    onClick={async()=>{ 
                      const { confirmTwice } = await import('../kit'); 
                      if(await confirmTwice('確認刪除該客戶？','刪除後無法復原，仍要刪除？')){ 
                        await (repos as any).customerRepo.remove(c.id); 
                        setRows(await (repos as any).customerRepo.list()) 
                      } 
                    }} 
                    className="rounded-lg bg-rose-500 px-3 py-1 text-white text-sm hover:bg-rose-600"
                  >
                    刪除
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredRows.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          {searchTerm ? '沒有找到符合的客戶' : '尚無客戶資料'}
        </div>
      )}

      {/* 編輯模態框 */}
      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-card max-h-[90vh] overflow-y-auto">
            <div className="mb-4 text-lg font-semibold">{edit.id?'編輯':'新增'}客戶</div>
            
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                  <input 
                    className="w-full rounded border px-3 py-2" 
                    placeholder="客戶姓名" 
                    value={edit.name} 
                    onChange={e=>setEdit({...edit,name:e.target.value})} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">手機 *</label>
                  <input 
                    className="w-full rounded border px-3 py-2" 
                    placeholder="手機號碼" 
                    value={edit.phone||''} 
                    onChange={e=>setEdit({...edit,phone:e.target.value})} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  className="w-full rounded border px-3 py-2" 
                  placeholder="電子郵件" 
                  value={edit.email||''} 
                  onChange={e=>setEdit({...edit,email:e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
                <textarea 
                  className="w-full rounded border px-3 py-2" 
                  placeholder="客戶相關備註（可選）"
                  rows={3}
                  value={edit.notes||''} 
                  onChange={e=>setEdit({...edit,notes:e.target.value})} 
                />
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="blacklisted"
                  checked={!!edit.blacklisted} 
                  onChange={e=>setEdit({...edit,blacklisted:e.target.checked})} 
                />
                <label htmlFor="blacklisted" className="text-sm font-medium text-gray-700">
                  黑名單
                </label>
              </div>

              {/* 地址管理 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">地址</label>
                {(edit.addresses||[]).map((a:any, idx:number)=>(
                  <div key={idx} className="mb-2 flex gap-2">
                    <input 
                      className="flex-1 rounded border px-3 py-2" 
                      placeholder="地址"
                      value={a.address} 
                      onChange={e=>{ 
                        const arr=[...edit.addresses]; 
                        arr[idx]={...arr[idx],address:e.target.value}; 
                        setEdit({...edit,addresses:arr}) 
                      }} 
                    />
                    <button 
                      onClick={()=>{ 
                        const arr=[...edit.addresses]; 
                        arr.splice(idx,1); 
                        setEdit({...edit,addresses:arr}) 
                      }} 
                      className="rounded bg-gray-100 px-3 py-2 hover:bg-gray-200"
                    >
                      刪除
                    </button>
                  </div>
                ))}
                <button 
                  onClick={()=>setEdit({
                    ...edit,
                    addresses:[...(edit.addresses||[]),{ 
                      id:`ADDR-${Math.random().toString(36).slice(2,8)}`, 
                      address:'' 
                    }]
                  })} 
                  className="rounded bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
                >
                  + 新增地址
                </button>
              </div>

              {/* 服務紀錄預覽 */}
              {edit.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    服務紀錄預覽
                  </label>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    {(() => {
                      const history = getCustomerServiceHistory(edit.phone, edit.email)
                      if (history.length === 0) {
                        return <div className="text-gray-500">尚無服務紀錄</div>
                      }
                      return (
                        <div className="space-y-2">
                          {history.slice(0, 3).map((record, idx) => (
                            <div key={idx} className="text-gray-600">
                              <div className="flex justify-between">
                                <span>訂單 {record.orderNumber}</span>
                                <span>{new Date(record.date).toLocaleDateString()}</span>
                              </div>
                              <div className="text-gray-500">
                                {record.serviceItems?.map((item: any) => item.name).join(', ')}
                              </div>
                            </div>
                          ))}
                          {history.length > 3 && (
                            <div className="text-gray-500">
                              還有 {history.length - 3} 筆紀錄...
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button 
                onClick={()=>setEdit(null)} 
                className="rounded-lg bg-gray-100 px-4 py-2 hover:bg-gray-200"
              >
                取消
              </button>
              <button 
                onClick={async()=>{ 
                  await (repos as any).customerRepo.upsert(edit); 
                  setEdit(null); 
                  setRows(await (repos as any).customerRepo.list()) 
                }} 
                className="rounded-lg bg-brand-500 px-4 py-2 text-white hover:bg-brand-600"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


