import { useState } from 'react'
import { authRepo } from '../../adapters/local/auth'
import { useNavigate } from 'react-router-dom'

export default function ResetPasswordPage(){
  const [pwd, setPwd] = useState('')
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card">
        <div className="mb-4 text-center text-xl font-bold">首次登入，請設定新密碼</div>
        <input className="w-full rounded-xl border px-4 py-3" type="password" placeholder="新密碼" value={pwd} onChange={e=>setPwd(e.target.value)} />
        <button onClick={async()=>{ await authRepo.resetPassword(pwd); alert('已更新'); navigate('/dispatch') }} disabled={!pwd} className="mt-3 w-full rounded-xl bg-brand-500 py-3 text-white disabled:opacity-50">儲存</button>
      </div>
    </div>
  )
}


