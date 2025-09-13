import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { can } from '../../utils/permissions'
// 改為動態從 adapters 取得 authRepo
import { loadAdapters } from '../../adapters'

export default function PageDispatchHome() {
  const [user, setUser] = useState<any>(null)
  const [repos, setRepos] = useState<any>(null)
  const [bulletin, setBulletin] = useState('')
  const [loading, setLoading] = useState(true)
  const editable = !!user && (user.role==='admin' || user.role==='support')

  const taRef = useRef<HTMLTextAreaElement|null>(null)
  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  useEffect(() => { (async()=>{ const a = await loadAdapters(); setRepos(a); setUser(a.authRepo.getCurrentUser()); try{ const s = await (a as any).settingsRepo?.get?.(); const val = (s&&s.bulletin)||''; setBulletin(val); setTimeout(()=>autoResize(taRef.current), 0) } finally { setLoading(false) } })() }, [])
  useEffect(()=>{ autoResize(taRef.current) }, [bulletin])
  useEffect(()=>{ const onResize = () => autoResize(taRef.current); window.addEventListener('resize', onResize, { passive: true } as any); return () => window.removeEventListener('resize', onResize) }, [])

  async function saveBulletin() {
    if (!repos || !user) return
    try {
      await (repos as any).settingsRepo?.update?.({ bulletin, bulletinUpdatedAt: new Date().toISOString(), bulletinUpdatedBy: user?.email || '' })
      alert('已更新公告')
    } catch (e: any) {
      alert('公告更新失敗：' + (e?.message || '未知錯誤'))
    }
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
              <textarea
                ref={taRef}
                value={bulletin}
                onChange={e=>setBulletin(e.target.value)}
                onInput={e=>autoResize(e.currentTarget)}
                className="w-full rounded-lg border px-3 py-2 min-h-[96px] resize-none overflow-hidden"
                placeholder="輸入公告內容（僅客服/管理員可編輯）"
              />
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
          <Link to="/report-center" className="rounded-xl border bg-white p-4 shadow-card">回報中心</Link>
          <Link to="/payroll" className="rounded-xl border bg-white p-4 shadow-card">薪資</Link>
          <Link to="/me" className="rounded-xl border bg-white p-4 shadow-card">個人設定</Link>
          <Link to="/inventory" className="rounded-xl border bg-white p-4 shadow-card">庫存管理</Link>
          <Link to="/documents" className="rounded-xl border bg-white p-4 shadow-card">文件管理</Link>
          <Link to="/share-referral" className="rounded-xl border bg-white p-4 shadow-card">分享推薦</Link>
          <button 
            onClick={() => {
              // 登出並導航到購物站
              localStorage.removeItem('supabase-auth-user')
              localStorage.removeItem('local-auth-user')
              window.location.href = '/store'
            }}
            className="rounded-xl border bg-white p-4 shadow-card text-left"
          >
            購物站
          </button>
        </div>
      </div>
    </div>
  )
}


