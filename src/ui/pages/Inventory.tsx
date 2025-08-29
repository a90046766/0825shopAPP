import { useEffect, useState } from 'react'
import { loadAdapters } from '../../adapters'
import { authRepo } from '../../adapters/local/auth'
import { Navigate } from 'react-router-dom'
import { can } from '../../utils/permissions'

export default function InventoryPage() {
  const u = authRepo.getCurrentUser()
  if (u && u.role==='technician') return <Navigate to="/dispatch" replace />
  
  const [rows, setRows] = useState<any[]>([])
  const [repos, setRepos] = useState<any>(null)
  const [edit, setEdit] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all'|'available'|'low_stock'|'out_of_stock'>('all')
  
  const load = async () => { if(!repos) return; setRows(await repos.inventoryRepo.list()) }
  useEffect(() => { (async()=>{ const a = await loadAdapters(); setRepos(a) })() }, [])
  useEffect(() => { if(repos) load() }, [repos])

  // 過濾庫存項目
  const filteredRows = rows.filter(item => {
    const searchMatch = !searchTerm || 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const statusMatch = (() => {
      if (statusFilter === 'all') return true
      if (statusFilter === 'available') return (item.quantity || 0) > 0
      if (statusFilter === 'low_stock') return (item.quantity || 0) > 0 && (item.quantity || 0) <= (item.safeStock || 0)
      if (statusFilter === 'out_of_stock') return (item.quantity || 0) <= 0
      return true
    })()
    
    return searchMatch && statusMatch
  })

  // 統計信息
  const stats = {
    total: rows.length,
    available: rows.filter(item => (item.quantity || 0) > 0).length,
    lowStock: rows.filter(item => (item.quantity || 0) > 0 && (item.quantity || 0) <= (item.safeStock || 0)).length,
    outOfStock: rows.filter(item => (item.quantity || 0) <= 0).length,
  }

  // 員工購買申請
  const requestPurchase = async (item: any) => {
    if (!repos || !u) return
    
    try {
      const quantity = prompt(`請輸入要購買的 ${item.name} 數量：`)
      if (!quantity || isNaN(Number(quantity))) return
      
      const purchaseRequest = {
        id: `PUR-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        itemId: item.id,
        itemName: item.name,
        requestedQuantity: Number(quantity),
        requesterId: u.id,
        requesterName: u.name,
        requesterRole: u.role,
        status: 'pending', // pending, approved, rejected, completed
        requestDate: new Date().toISOString(),
        approvedBy: null,
        approvedDate: null,
        notes: '',
        priority: 'normal', // low, normal, high, urgent
      }
      
      // 保存購買申請
      await repos.inventoryRepo.createPurchaseRequest(purchaseRequest)
      
      // 發送通知給管理員和客服
      const notification = {
        id: `NOT-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        title: '工具設備購買申請',
        message: `${u.name} 申請購買 ${item.name} x${quantity} 件`,
        type: 'purchase_request',
        priority: 'normal',
        targetRoles: ['admin', 'support'],
        senderId: u.id,
        senderName: u.name,
        createdAt: new Date().toISOString(),
        readBy: [],
        data: {
          purchaseRequestId: purchaseRequest.id,
          itemId: item.id,
          itemName: item.name,
          quantity: Number(quantity),
        }
      }
      
      await repos.notificationRepo.create(notification)
      
      alert('購買申請已送出，等待管理員審核')
      load()
    } catch (error) {
      console.error('購買申請失敗:', error)
      alert('購買申請失敗：' + (error as any)?.message || '未知錯誤')
    }
  }

  // 管理員審核購買申請
  const approvePurchaseRequest = async (requestId: string, approved: boolean) => {
    if (!repos || !u) return
    
    try {
      const request = await repos.inventoryRepo.getPurchaseRequest(requestId)
      if (!request) {
        alert('找不到購買申請')
        return
      }
      
      const notes = prompt('請輸入審核備註（可選）：')
      
      const updateData = {
        status: approved ? 'approved' : 'rejected',
        approvedBy: u.id,
        approvedDate: new Date().toISOString(),
        notes: notes || '',
      }
      
      await repos.inventoryRepo.updatePurchaseRequest(requestId, updateData)
      
      // 發送通知給申請者
      const notification = {
        id: `NOT-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        title: '購買申請審核結果',
        message: `您的 ${request.itemName} 購買申請已${approved ? '通過' : '被拒絕'}`,
        type: 'purchase_response',
        priority: 'normal',
        targetRoles: [request.requesterRole],
        targetUserId: request.requesterId,
        senderId: u.id,
        senderName: u.name,
        createdAt: new Date().toISOString(),
        readBy: [],
        data: {
          purchaseRequestId: requestId,
          approved,
          notes: notes || '',
        }
      }
      
      await repos.notificationRepo.create(notification)
      
      alert(`購買申請已${approved ? '通過' : '拒絕'}`)
      load()
    } catch (error) {
      console.error('審核失敗:', error)
      alert('審核失敗：' + (error as any)?.message || '未知錯誤')
    }
  }

  return (
    <div className="space-y-4">
      {/* 標題和新增按鈕 */}
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">工具設備管理（內部用）</div>
        {can(u, 'inventory.create') && (
          <button 
            onClick={() => setCreating(true)} 
            className="rounded-lg bg-brand-500 px-3 py-1 text-white hover:bg-brand-600"
          >
            新增工具設備
          </button>
        )}
      </div>

      {/* 搜索和過濾 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder="搜尋工具設備..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border px-4 py-2 pl-10 focus:border-brand-500 focus:outline-none"
          />
          <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-lg border px-3 py-2 focus:border-brand-500 focus:outline-none"
        >
          <option value="all">全部狀態</option>
          <option value="available">有庫存</option>
          <option value="low_stock">庫存不足</option>
          <option value="out_of_stock">缺貨</option>
        </select>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-card">
          <div className="text-xs text-gray-500">總項目</div>
          <div className="mt-1 text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-card">
          <div className="text-xs text-gray-500">有庫存</div>
          <div className="mt-1 text-2xl font-bold text-green-600">{stats.available}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-card">
          <div className="text-xs text-gray-500">庫存不足</div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{stats.lowStock}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-card">
          <div className="text-xs text-gray-500">缺貨</div>
          <div className="mt-1 text-2xl font-bold text-red-600">{stats.outOfStock}</div>
        </div>
      </div>

      {/* 工具設備列表 */}
      <div className="space-y-3">
        {filteredRows.map(item => (
          <div key={item.id} className={`rounded-xl border p-4 shadow-card hover:shadow-lg transition-shadow ${
            (item.quantity || 0) <= 0 ? 'border-red-400 bg-red-50' :
            (item.quantity || 0) <= (item.safeStock || 0) ? 'border-amber-400 bg-amber-50' :
            'border-gray-200 bg-white'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="font-semibold text-lg">{item.name}</div>
                  <span className={`rounded px-2 py-1 text-xs ${
                    (item.quantity || 0) <= 0 ? 'bg-red-100 text-red-700' :
                    (item.quantity || 0) <= (item.safeStock || 0) ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {(item.quantity || 0) <= 0 ? '缺貨' :
                     (item.quantity || 0) <= (item.safeStock || 0) ? '庫存不足' : '有庫存'}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  📦 數量：{item.quantity || 0} 件
                  {item.safeStock && <span className="ml-4">🛡️ 安全庫存：{item.safeStock} 件</span>}
                </div>
                
                {item.description && (
                  <div className="text-sm text-gray-600 mb-2">
                    📝 {item.description}
                  </div>
                )}
                
                {item.category && (
                  <div className="text-sm text-gray-600 mb-2">
                    🏷️ 分類：{item.category}
                  </div>
                )}
                
                {item.unitPrice && (
                  <div className="text-sm text-gray-600">
                    💰 單價：${item.unitPrice.toLocaleString()}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-2 ml-4">
                {can(u, 'inventory.purchase') && (item.quantity || 0) > 0 && (
                  <button 
                    onClick={() => requestPurchase(item)}
                    className="rounded-lg bg-blue-500 px-3 py-1 text-white text-sm hover:bg-blue-600"
                  >
                    申請購買
                  </button>
                )}
                
                {can(u, 'inventory.edit') && (
                  <button 
                    onClick={() => setEdit(item)} 
                    className="rounded-lg bg-gray-900 px-3 py-1 text-white text-sm hover:bg-gray-800"
                  >
                    編輯
                  </button>
                )}
                
                {can(u, 'inventory.delete') && (
                  <button 
                    onClick={async()=>{ 
                      const { confirmTwice } = await import('../kit'); 
                      if(await confirmTwice('確認刪除該工具設備？','刪除後無法復原，仍要刪除？')){ 
                        if(!repos) return; 
                        await repos.inventoryRepo.remove(item.id); 
                        load() 
                      } 
                    }} 
                    className="rounded-lg bg-rose-500 px-3 py-1 text-white text-sm hover:bg-rose-600"
                  >
                    刪除
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRows.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          {rows.length === 0 ? '尚無工具設備' : '沒有符合條件的工具設備'}
        </div>
      )}

      {/* 新增工具設備模態框 */}
      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-card max-h-[90vh] overflow-y-auto">
            <div className="mb-4 text-lg font-semibold">新增工具設備</div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">名稱 *</label>
                  <input 
                    className="w-full rounded border px-3 py-2" 
                    placeholder="工具設備名稱" 
                    value={edit?.name || ''} 
                    onChange={e=>setEdit({...edit,name:e.target.value})} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分類</label>
                  <select 
                    className="w-full rounded border px-3 py-2" 
                    value={edit?.category || ''} 
                    onChange={e=>setEdit({...edit,category:e.target.value})}
                  >
                    <option value="">選擇分類</option>
                    <option value="工具">工具</option>
                    <option value="設備">設備</option>
                    <option value="耗材">耗材</option>
                    <option value="安全用品">安全用品</option>
                    <option value="辦公用品">辦公用品</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea 
                  className="w-full rounded border px-3 py-2" 
                  placeholder="工具設備描述（可選）"
                  rows={3}
                  value={edit?.description || ''} 
                  onChange={e=>setEdit({...edit,description:e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">數量 *</label>
                  <input 
                    type="number" 
                    className="w-full rounded border px-3 py-2" 
                    placeholder="0"
                    value={edit?.quantity || 0} 
                    onChange={e=>setEdit({...edit,quantity:Number(e.target.value)})} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">安全庫存</label>
                  <input 
                    type="number" 
                    className="w-full rounded border px-3 py-2" 
                    placeholder="0"
                    value={edit?.safeStock || 0} 
                    onChange={e=>setEdit({...edit,safeStock:Number(e.target.value)})} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">單價</label>
                  <input 
                    type="number" 
                    className="w-full rounded border px-3 py-2" 
                    placeholder="0"
                    value={edit?.unitPrice || 0} 
                    onChange={e=>setEdit({...edit,unitPrice:Number(e.target.value)})} 
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button 
                onClick={() => {
                  setCreating(false)
                  setEdit(null)
                }} 
                className="rounded-lg bg-gray-100 px-4 py-2 hover:bg-gray-200"
              >
                取消
              </button>
              <button 
                onClick={async()=>{ 
                  if(!repos) return; 
                  await repos.inventoryRepo.upsert(edit); 
                  setCreating(false)
                  setEdit(null)
                  load() 
                }} 
                className="rounded-lg bg-brand-500 px-4 py-2 text-white hover:bg-brand-600"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 編輯工具設備模態框 */}
      {edit && !creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-card max-h-[90vh] overflow-y-auto">
            <div className="mb-4 text-lg font-semibold">編輯工具設備</div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">名稱 *</label>
                  <input 
                    className="w-full rounded border px-3 py-2" 
                    placeholder="工具設備名稱" 
                    value={edit.name} 
                    onChange={e=>setEdit({...edit,name:e.target.value})} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分類</label>
                  <select 
                    className="w-full rounded border px-3 py-2" 
                    value={edit.category || ''} 
                    onChange={e=>setEdit({...edit,category:e.target.value})}
                  >
                    <option value="">選擇分類</option>
                    <option value="工具">工具</option>
                    <option value="設備">設備</option>
                    <option value="耗材">耗材</option>
                    <option value="安全用品">安全用品</option>
                    <option value="辦公用品">辦公用品</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea 
                  className="w-full rounded border px-3 py-2" 
                  placeholder="工具設備描述（可選）"
                  rows={3}
                  value={edit.description || ''} 
                  onChange={e=>setEdit({...edit,description:e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">數量 *</label>
                  <input 
                    type="number" 
                    className="w-full rounded border px-3 py-2" 
                    placeholder="0"
                    value={edit.quantity || 0} 
                    onChange={e=>setEdit({...edit,quantity:Number(e.target.value)})} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">安全庫存</label>
                  <input 
                    type="number" 
                    className="w-full rounded border px-3 py-2" 
                    placeholder="0"
                    value={edit.safeStock || 0} 
                    onChange={e=>setEdit({...edit,safeStock:Number(e.target.value)})} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">單價</label>
                  <input 
                    type="number" 
                    className="w-full rounded border px-3 py-2" 
                    placeholder="0"
                    value={edit.unitPrice || 0} 
                    onChange={e=>setEdit({...edit,unitPrice:Number(e.target.value)})} 
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button 
                onClick={() => setEdit(null)} 
                className="rounded-lg bg-gray-100 px-4 py-2 hover:bg-gray-200"
              >
                取消
              </button>
              <button 
                onClick={async()=>{ 
                  if(!repos) return; 
                  await repos.inventoryRepo.upsert(edit); 
                  setEdit(null)
                  load() 
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


