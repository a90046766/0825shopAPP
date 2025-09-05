import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../utils/supabase'

export default function MemberLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 先嘗試登入（避免 members 表尚未建立導致誤判）
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.user) {
        // 若為首次登入，強制要求重設密碼
        try {
          const needReset = localStorage.getItem('member-pw-reset-required') === '1'
          if (needReset) {
            navigate('/login/member/reset')
            return
          }
        } catch {}
        // 嘗試讀取正式會員；若無則讀申請記錄，設定為 pending
        let resolved: any = null
        try {
          const { data: m } = await supabase
            .from('members')
            .select('id, name, email, code, status')
            .eq('email', email.toLowerCase())
            .maybeSingle()
          if (m) resolved = m
          else {
            const { data: app } = await supabase
              .from('member_applications')
              .select('id, name, email, status')
              .eq('email', email.toLowerCase())
              .order('applied_at', { ascending: false })
              .maybeSingle()
            if (app) resolved = { ...app, status: app.status || 'pending' }
          }
        } catch {}

        // 嘗試取得派工系統的 customerId（用 email 搜尋），用於會員端查單
        let customerId: number | undefined
        try {
          const res = await fetch(`/api/customers?search=${encodeURIComponent((resolved?.email || data.user.email || '').toLowerCase())}`)
          const j = await res.json()
          if (j?.success && Array.isArray(j.data)) {
            const exact = j.data.find((c:any)=> String(c.email||'').toLowerCase() === (resolved?.email || data.user.email || '').toLowerCase())
            customerId = exact?.id
          }
        } catch {}

        const memberInfo = {
          id: resolved?.id || data.user.id,
          name: resolved?.name || data.user.email || '',
          email: (resolved?.email || data.user.email || '').toLowerCase(),
          code: resolved?.code,
          role: 'member' as const,
          type: 'member' as const,
          status: resolved?.status || 'pending',
          customerId
        }
        try { localStorage.setItem('member-auth-user', JSON.stringify(memberInfo)) } catch {}
        navigate('/store')
      }
    } catch (err: any) {
      setError(err.message || '登入失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-8">會員登入</h1>

        {error && (
          <div className="mb-6 p-3 rounded border border-red-200 bg-red-50 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">電子郵件</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="請輸入您的 Email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="請輸入您的密碼"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 font-medium disabled:opacity-50"
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          還沒有會員帳號？
          <Link to="/register/member" className="text-blue-600 hover:text-blue-700 ml-1">立即註冊</Link>
        </div>
        <div className="mt-2 text-center text-xs text-gray-500">
          第一次登入密碼預設為手機後六碼；登入後將引導您變更密碼。
        </div>
      </div>
    </div>
  )
}
