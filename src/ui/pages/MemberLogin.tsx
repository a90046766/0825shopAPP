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
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id, name, email, code, status')
        .eq('email', email.toLowerCase())
        .single()

      if (memberError || !member) {
        setError('此 Email 尚未註冊為會員，請先註冊')
        return
      }

      if (member.status !== 'active') {
        setError('您的會員帳號尚未啟用，請聯繫客服')
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.user) {
        const memberInfo = {
          id: member.id,
          name: member.name,
          email: member.email,
          code: member.code,
          role: 'member',
          type: 'member'
        }
        localStorage.setItem('member-auth-user', JSON.stringify(memberInfo))
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
      </div>
    </div>
  )
}
