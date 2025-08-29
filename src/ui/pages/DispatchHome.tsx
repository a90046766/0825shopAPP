import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { can } from '../../utils/permissions'
import { authRepo as staticAuth } from '../../adapters/local/auth'
import { loadAdapters } from '../../adapters'

export default function PageDispatchHome() {
  const user = staticAuth.getCurrentUser()
  const [repos, setRepos] = useState<any>(null)
  const [bulletin, setBulletin] = useState('')
  const [loading, setLoading] = useState(true)
  const editable = can(user, 'bulletin.manage')

  useEffect(() => { (async()=>{ const a = await loadAdapters(); setRepos(a); try{ const s = await (a as any).settingsRepo?.get?.(); setBulletin((s&&s.bulletin)||'') } finally { setLoading(false) } })() }, [])

  async function saveBulletin() {
    if (!repos) return
    await (repos as any).settingsRepo?.update?.({ bulletin, bulletinUpdatedAt: new Date().toISOString(), bulletinUpdatedBy: user?.email || '' })
    alert('已更新公告')
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-lg font-semibold">公告欄</div>
        <div className="mt-3 rounded-2xl bg-white p-4 text-sm text-gray-600 shadow-card">
          {loading ? (
            <div className="text-gray-400">載入中…</div>
          ) : editable ? (
            <div className="space-y-2">
              <textarea value={bulletin} onChange={e=>setBulletin(e.target.value)} rows={4} className="w-full rounded-lg border px-3 py-2" placeholder="輸入公告內容（僅客服/管理員可編輯）" />
              <div className="flex items-center justify-end gap-2">
                <button onClick={saveBulletin} className="rounded-lg bg-brand-500 px-4 py-2 text-white">儲存公告</button>
              </div>
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-gray-700">{bulletin || '目前無公告'}</div>
          )}
        </div>
      </div>
      <div>
        <div className="text-lg font-semibold">快速入口</div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <Link to="/orders" className="rounded-xl border bg-white p-4 shadow-card">訂單管理</Link>
          <Link to="/schedule" className="rounded-xl border bg-white p-4 shadow-card">排班/派工</Link>
          <Link to="/report-center" className="rounded-xl border bg-white p-4 shadow-card">回報管理</Link>
          <Link to="/notifications" className="rounded-xl border bg-white p-4 shadow-card">通知中心</Link>
          <Link to="/payroll" className="rounded-xl border bg-white p-4 shadow-card">薪資</Link>
          <Link to="/me" className="rounded-xl border bg-white p-4 shadow-card">個人設定</Link>
        </div>
      </div>
    </div>
  )
}


