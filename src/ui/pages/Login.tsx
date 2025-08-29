import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authRepo } from '../../adapters/local/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // 檢查是否有記住的帳號
    const remembered = authRepo.getRememberedEmail()
    if (remembered) {
      setEmail(remembered)
      setRemember(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    setError('')

    try {
      const u = await authRepo.login(email, password)
      
      // 處理記住帳號
      if (remember) {
        authRepo.rememberEmail(email)
      } else {
        authRepo.forgetEmail()
      }

      if (!u.passwordSet) navigate('/reset-password')
      else navigate('/dispatch')
    } catch (err: any) {
      setError(err.message || '登入失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleChangeAccount = () => {
    setRemember(false)
    setEmail('')
    authRepo.forgetEmail()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">洗濯派工系統</h1>
          <p className="mt-1 text-sm text-gray-500">員工登入</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {remember && email ? (
            <div className="rounded-xl bg-brand-50 p-3">
              <div className="text-sm text-gray-700">
                已記住帳號：<span className="font-medium">{email}</span>
              </div>
              <button 
                type="button" 
                onClick={handleChangeAccount}
                className="mt-1 text-sm text-brand-600 underline"
              >
                更換帳號
              </button>
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                placeholder="請輸入 Email"
                required
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="請輸入密碼"
              required
            />
          </div>

          {!remember && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-gray-700">
                記住帳號
              </label>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="mt-6 w-full rounded-xl bg-brand-500 py-3 font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? '登入中...' : '登入'}
        </button>

        {/* 註冊選項 */}
        <div className="mt-6 text-center">
          <div className="text-sm text-gray-600">還沒有帳號？</div>
          <button
            type="button"
            onClick={() => navigate('/apply/technician')}
            className="mt-2 text-sm text-brand-600 underline hover:text-brand-700"
          >
            註冊
          </button>
        </div>
      </form>
    </div>
  )
}
