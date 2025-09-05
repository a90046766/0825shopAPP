import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadAdapters } from '../../adapters'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // 檢查是否有記住的帳號（統一使用本地儲存鍵）
    try {
      const remembered = localStorage.getItem('remember-login-email')
      if (remembered) {
        setEmail(remembered)
        setRemember(true)
      }
    } catch {}
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError('')

    try {
      // 嚴格雲端：透過 adapters 取得當前 authRepo（Supabase）
      const a = await loadAdapters()
      const norm = normalizeEmail(email)
      const pass = (password || '').trim() || 'a123123'
      const u = await a.authRepo.login(norm, pass)
      
      // 處理記住帳號
      if (remember) localStorage.setItem('remember-login-email', norm)
      else localStorage.removeItem('remember-login-email')

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
    try { localStorage.removeItem('remember-login-email') } catch {}
  }

  function normalizeEmail(raw: string): string {
    const s = (raw || '').trim().toLowerCase()
    if (!s.includes('@')) {
      if (s === 'a90046766') return 'a90046766@gmail.com'
      if (s === 'xiaofu888') return 'xiaofu888@yahoo.com.tw'
      if (s === 'jason660628') return 'jason660628@yahoo.com.tw'
      return `${s}@gmail.com`
    }
    return s
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
            {String(error).includes('商城會員') && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/login/member')}
                  className="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
                >
                  前往會員登入
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/store')}
                  className="rounded bg-gray-100 px-3 py-1.5 text-gray-800 hover:bg-gray-200"
                >
                  返回購物首頁
                </button>
              </div>
            )}
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
              placeholder="請輸入密碼（留空自動使用 a123123）"
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
          disabled={loading || !email}
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
