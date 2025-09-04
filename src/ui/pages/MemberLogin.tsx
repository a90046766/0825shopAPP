import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../utils/supabase'
import { Eye, EyeOff, ShoppingBag, ArrowLeft } from 'lucide-react'

export default function MemberLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 檢查是否為會員
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

      // 使用 Supabase Auth 登入
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.user) {
        // 儲存會員資訊到 localStorage
        const memberInfo = {
          id: member.id,
          name: member.name,
          email: member.email,
          code: member.code,
          role: 'member',
          type: 'member'
        }
        localStorage.setItem('member-auth-user', JSON.stringify(memberInfo))
        
        // 導向購物站首頁
        navigate('/store')
      }
    } catch (err: any) {
      setError(err.message || '登入失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* 返回按鈕 */}
        <div className="mb-6">
          <Link
            to="/store"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回購物站
          </Link>
        </div>

        {/* 登入表單 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* 標題 */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">會員登入</h1>
            <p className="text-gray-600 mt-2">歡迎回到購物站</p>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* 登入表單 */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                電子郵件
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="請輸入您的 Email"
              />
            </div>

            {/* 密碼 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密碼
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="請輸入您的密碼"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* 登入按鈕 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '登入中...' : '登入'}
            </button>
          </form>

          {/* 其他選項 */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              還沒有會員帳號？{' '}
              <Link
                to="/register/member"
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                立即註冊
              </Link>
            </p>
          </div>

          {/* 分隔線 */}
          <div className="mt-8 flex items-center">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-sm text-gray-500">或</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* 內部人員登入 */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              您是內部人員？{' '}
              <Link
                to="/login"
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                點此登入後台系統
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
