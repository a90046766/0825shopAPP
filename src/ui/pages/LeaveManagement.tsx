import { useEffect, useState } from 'react'
import { loadAdapters } from '../../adapters'
import { authRepo } from '../../adapters/local/auth'
import { Navigate } from 'react-router-dom'
import { can } from '../../utils/permissions'

export default function LeaveManagementPage() {
  const u = authRepo.getCurrentUser()
  if (u && u.role==='technician') return <Navigate to="/dispatch" replace />
  
  const [rows, setRows] = useState<any[]>([])
  const [repos, setRepos] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [edit, setEdit] = useState<any | null>(null)
  
  const load = async () => { if(!repos) return; setRows(await repos.leaveRepo?.list?.() || []) }
  useEffect(() => { (async()=>{ const a = await loadAdapters(); setRepos(a) })() }, [])
  useEffect(() => { if(repos) load() }, [repos])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">請假管理</div>
        {can(u, 'leave.create') && (
          <button 
            onClick={() => {
              setCreating(true)
              setEdit({
                technicianEmail: u?.email || '',
                date: '',
                fullDay: true,
                startTime: '',
                endTime: '',
                reason: ''
              })
            }} 
            className="rounded-lg bg-brand-500 px-3 py-1 text-white hover:bg-brand-600"
          >
            新增請假申請
          </button>
        )}
      </div>

      <div className="space-y-3">
        {rows.map(leave => (
          <div key={leave.id} className="rounded-xl border p-4 shadow-card bg-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-semibold text-lg">{leave.technicianEmail}</div>
                <div className="text-sm text-gray-600 mt-1">
                  📅 日期：{leave.date}
                  {leave.fullDay ? ' (全天)' : ` (${leave.startTime} - ${leave.endTime})`}
                </div>
                {leave.reason && (
                  <div className="text-sm text-gray-600 mt-1">
                    📝 原因：{leave.reason}
                  </div>
                )}
                <div className="text-sm text-gray-500 mt-2">
                  申請時間：{new Date(leave.createdAt || '').toLocaleString()}
                </div>
              </div>
              
              <div className="flex flex-col gap-2 ml-4">
                <span className={`rounded px-2 py-1 text-xs ${
                  leave.status === 'approved' ? 'bg-green-100 text-green-700' :
                  leave.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {leave.status === 'approved' ? '已核准' :
                   leave.status === 'rejected' ? '已拒絕' : '待審核'}
                </span>
                
                {can(u, 'leave.approve') && leave.status === 'pending' && (
                  <div className="flex gap-1">
                    <button 
                      onClick={async()=>{ 
                        if(!repos) return; 
                        await repos.leaveRepo?.approve?.(leave.id); 
                        load() 
                      }} 
                      className="rounded bg-green-500 px-2 py-1 text-white text-xs"
                    >
                      核准
                    </button>
                    <button 
                      onClick={async()=>{ 
                        if(!repos) return; 
                        await repos.leaveRepo?.reject?.(leave.id); 
                        load() 
                      }} 
                      className="rounded bg-red-500 px-2 py-1 text-white text-xs"
                    >
                      拒絕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {rows.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          尚無請假申請
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card">
            <div className="mb-4 text-lg font-semibold">新增請假申請</div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">請假日期 *</label>
                <input 
                  type="date"
                  className="w-full rounded border px-3 py-2" 
                  value={edit?.date || ''} 
                  onChange={e=>setEdit({...edit,date:e.target.value})} 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">請假類型</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="type" 
                      checked={edit?.fullDay} 
                      onChange={()=>setEdit({...edit,fullDay:true})}
                    />
                    <span className="ml-2">全天</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="type" 
                      checked={!edit?.fullDay} 
                      onChange={()=>setEdit({...edit,fullDay:false})}
                    />
                    <span className="ml-2">部分時段</span>
                  </label>
                </div>
              </div>
              
              {!edit?.fullDay && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
                    <input 
                      type="time"
                      className="w-full rounded border px-3 py-2" 
                      value={edit?.startTime || ''} 
                      onChange={e=>setEdit({...edit,startTime:e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">結束時間</label>
                    <input 
                      type="time"
                      className="w-full rounded border px-3 py-2" 
                      value={edit?.endTime || ''} 
                      onChange={e=>setEdit({...edit,endTime:e.target.value})} 
                    />
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">請假原因 *</label>
                <textarea 
                  className="w-full rounded border px-3 py-2" 
                  placeholder="請輸入請假原因"
                  rows={3}
                  value={edit?.reason || ''} 
                  onChange={e=>setEdit({...edit,reason:e.target.value})} 
                />
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
                  if(!repos || !edit?.date || !edit?.reason) return; 
                  await repos.leaveRepo?.create?.(edit); 
                  setCreating(false)
                  setEdit(null)
                  load() 
                }} 
                className="rounded-lg bg-brand-500 px-4 py-2 text-white hover:bg-brand-600"
              >
                送出申請
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}