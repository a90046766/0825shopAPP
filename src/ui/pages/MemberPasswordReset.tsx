import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../utils/supabase'

export default function MemberPasswordResetPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!password || password.length < 6) { setError('新密碼至少 6 碼'); return }
    if (password !== confirm) { setError('兩次輸入不一致'); return }
    try {
      setSaving(true)
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { setError(error.message); return }
      try { localStorage.removeItem('member-pw-reset-required') } catch {}
      navigate('/login/member')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-4">變更密碼</h1>
        <p className="text-sm text-gray-600 text-center mb-6">為了您的帳號安全，首次登入請先設定新密碼。</p>
        {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">新密碼</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">確認新密碼</label>
            <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
          </div>
          <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text白 rounded-lg py-3 font-medium disabled:opacity-50">{saving?'更新中...':'更新密碼'}</button>
        </form>
      </div>
    </div>
  )
}


