import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { can } from '../../utils/permissions'
// 改為動態從 adapters 取得 authRepo
import { loadAdapters } from '../../adapters'
import { supabase } from '../../utils/supabase'

export default function PageDispatchHome() {
  const [user, setUser] = useState<any>(null)
  const [repos, setRepos] = useState<any>(null)
  const [bulletin, setBulletin] = useState('')
  const [loading, setLoading] = useState(true)
  const editable = !!user && (user.role==='admin' || user.role==='support')
  const [badges, setBadges] = useState<{ orders?: number; reports?: number }>({})

  const taRef = useRef<HTMLTextAreaElement|null>(null)
  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  useEffect(() => { (async()=>{ const a = await loadAdapters(); setRepos(a); setUser(a.authRepo.getCurrentUser()); try{ const s = await (a as any).settingsRepo?.get?.(); const val = (s&&s.bulletin)||''; setBulletin(val); setTimeout(()=>autoResize(taRef.current), 0) } finally { setLoading(false) } })() }, [])
  useEffect(()=>{ autoResize(taRef.current) }, [bulletin])
  useEffect(()=>{ const onResize = () => autoResize(taRef.current); window.addEventListener('resize', onResize, { passive: true } as any); return () => window.removeEventListener('resize', onResize) }, [])

  // 數字徽章：技師顯示「訂單管理/回報中心」數量
  useEffect(() => {
    (async()=>{
      try {
        if (!repos) return
        const me = repos.authRepo.getCurrentUser()
        if (!me || me.role !== 'technician') { setBadges({}); return }
        const emailLc = String(me.email||'').toLowerCase()
        const name = String(me.name||'')
        // 輕量計數：訂單（服務中/已確認，且我在指派名單）
        let ordersCount = 0
        try {
          const base = supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['confirmed','in_progress'])
          const byName = name ? await base.contains('assigned_technicians', [name]) : { count: 0 }
          const byEmail = emailLc ? await base.contains('assigned_technicians', [emailLc]) : { count: 0 }
          ordersCount = Math.max(Number(byName.count||0), Number(byEmail.count||0))
        } catch { ordersCount = 0 }
        // 回報：仍以 repo.list() 但僅一次，過濾未結案與與我相關
        let reportsCount = 0
        try {
          const threads = await ((repos as any)?.reportsRepo?.list?.() ?? [])
          reportsCount = (threads||[]).filter((t:any)=>{
            if (String(t.status||'') !== 'open') return false
            const target = String(t.target||'')
            const list = Array.isArray(t.targetEmails) ? t.targetEmails.map((x:string)=>String(x||'').toLowerCase()) : []
            const hit = (target==='all') || (target==='tech') || (target==='technician') || (target==='technicians') || (list.includes(emailLc)) || (String(t.createdBy||'').toLowerCase()===emailLc)
            return hit
          }).length
        } catch { reportsCount = 0 }
        setBadges({ orders: ordersCount, reports: reportsCount })
      } catch { setBadges({}) }
    })()
  }, [repos])

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
          <Link to="/orders" className="relative rounded-xl border bg-white p-4 shadow-card">
            訂單管理
            {user?.role==='technician' && (badges.orders||0) > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-medium text-white">{(badges.orders as number) > 99 ? '99+' : badges.orders}</span>
            )}
          </Link>
          <Link to="/schedule" className="rounded-xl border bg-white p-4 shadow-card">排班/派工</Link>
          <Link to="/report-center" className="relative rounded-xl border bg-white p-4 shadow-card">
            回報中心
            {user?.role==='technician' && (badges.reports||0) > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-medium text-white">{(badges.reports as number) > 99 ? '99+' : badges.reports}</span>
            )}
          </Link>
          <Link to="/payroll" className="rounded-xl border bg-white p-4 shadow-card">薪資</Link>
          <Link to="/me" className="rounded-xl border bg-white p-4 shadow-card">個人設定</Link>
          <Link to="/inventory" className="rounded-xl border bg-white p-4 shadow-card">庫存管理</Link>
          <Link to="/documents" className="rounded-xl border bg-white p-4 shadow-card">文件管理</Link>
          <Link to="/models" className="rounded-xl border bg-white p-4 shadow-card">機型管理</Link>
          <Link to="/share-referral" className="rounded-xl border bg-white p-4 shadow-card">分享推薦</Link>
          <button 
            onClick={async () => {
              try {
                // 完整登出內部帳號，避免返回後出現「假登入」
                try { const a = await loadAdapters(); await a.authRepo.logout?.() } catch {}
                try { const mod = await import('../../utils/supabase'); await mod.supabase.auth.signOut().catch(()=>{}) } catch {}
                try { localStorage.removeItem('supabase-auth-user') } catch {}
                try { localStorage.removeItem('local-auth-user') } catch {}
                try { localStorage.removeItem('member-auth-user') } catch {}
                try { localStorage.removeItem('sb-0825shopapp-auth') } catch {}
                try { localStorage.removeItem('sb-last-valid-ts') } catch {}
              } finally {
                // 導向購物站（優先用環境變數，否則走 /store 子路由）
                const base = (()=>{ try { return (import.meta as any).env?.VITE_STORE_BASE_URL || '' } catch { return '' } })()
                window.location.href = base || '/store'
              }
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


