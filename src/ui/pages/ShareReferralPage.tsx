// src/ui/pages/ShareReferralPage.tsx
import { useEffect, useState } from 'react'

export default function ShareReferralPage() {
  const [user, setUser] = useState<any>(null)
  const [memberCode, setMemberCode] = useState('')

  useEffect(() => {
    try {
      const s = localStorage.getItem('supabase-auth-user')
      if (s) {
        const u = JSON.parse(s)
        setUser(u)
        // TODO: 依角色從 technicians 或 staff 撈推薦碼
        // 先放占位以通過編譯
        setMemberCode(u?.refCode || u?.code || '')
      }
    } catch {}
  }, [])

  if (!user) {
    return <div className="p-4">請先登入</div>
  }
  return (
    <div className="space-y-3 p-4">
      <div className="text-lg font-semibold">分享推薦</div>
      <div className="rounded-2xl bg-white p-4 shadow-card text-center">
        <div className="text-2xl font-bold text-brand-500 mb-2">我的推薦碼</div>
        <div className="text-3xl font-mono bg-gray-100 p-3 rounded-lg">{memberCode || '尚無'}</div>
      </div>
    </div>
  )
}