import { SectionTitle } from '../kit'
import { authRepo } from '../../adapters/local/auth'
import { useNavigate } from 'react-router-dom'

export default function PageProfile() {
  const u = authRepo.getCurrentUser()
  const nav = useNavigate()
  const roleZh = u?.role==='admin'? '管理員' : u?.role==='support'? '客服' : u?.role==='sales'? '業務' : u?.role==='technician'? '外勤人員' : '會員'
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-gray-200" />
        <div>
          <div className="text-lg font-semibold">{roleZh}</div>
          <div className="text-sm text-gray-500">{u?.name||'-'}｜{u?.email||'-'}｜日式洗濯有限公司</div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-card">
        <SectionTitle>帳號資訊</SectionTitle>
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex items-center justify-between"><span className="text-gray-500">姓名</span><span>{u?.name||'-'}</span></div>
          <div className="flex items-center justify-between"><span className="text-gray-500">帳號</span><span>{u?.email||'-'}</span></div>
          <div className="flex items-center justify-between"><span className="text-gray-500">廠商</span><span>日式洗濯有限公司</span></div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-card">
        <SectionTitle>安全性</SectionTitle>
        <div className="mt-3 space-y-3 text-sm">
          <button onClick={()=>nav('/reset-password')} className="w-full rounded-xl bg-gray-900 py-3 text-white">變更密碼</button>
        </div>
      </div>
    </div>
  )
}


