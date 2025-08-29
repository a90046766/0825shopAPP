import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadAdapters } from '../../adapters'

export default function TechnicianApplyPage() {
  const [form, setForm] = useState({
    name: '',
    shortName: '',
    email: '',
    phone: '',
    region: 'north' as const
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.phone) return

    setLoading(true)
    setError('')

    try {
      const a = await loadAdapters()
      await (a as any).technicianApplicationRepo.submit({
        name: form.name,
        shortName: form.shortName || form.name,
        email: form.email,
        phone: form.phone,
        region: form.region
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || '申請失敗')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card text-center">
          <div className="text-6xl">✅</div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">申請已送出</h1>
          <p className="mt-2 text-gray-600">
            您的技師申請已成功送出，請等待管理員審核。
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-6 w-full rounded-xl bg-brand-500 py-3 text-white hover:bg-brand-600"
          >
            返回登入
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">技師申請</h1>
          <p className="mt-1 text-sm text-gray-500">請填寫您的基本資料</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">姓名 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="請輸入真實姓名"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">暱稱</label>
            <input
              type="text"
              value={form.shortName}
              onChange={(e) => setForm({ ...form, shortName: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="客戶看到的稱呼（選填）"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="請輸入 Email"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">手機 *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="請輸入手機號碼"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">服務區域</label>
            <select
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value as any })}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option value="north">北區</option>
              <option value="central">中區</option>
              <option value="south">南區</option>
              <option value="all">全區</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !form.name || !form.email || !form.phone}
          className="mt-6 w-full rounded-xl bg-brand-500 py-3 font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? '送出中...' : '送出申請'}
        </button>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-sm text-gray-500 underline"
          >
            返回登入
          </button>
        </div>
      </form>
    </div>
  )
}
