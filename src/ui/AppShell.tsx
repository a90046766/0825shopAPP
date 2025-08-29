import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { authRepo } from '../adapters/local/auth'
import { can } from '../utils/permissions'
import { notificationRepo } from '../adapters/local/notifications'
import { useEffect, useState } from 'react'
import { loadAdapters } from '../adapters'
import QiuBaoVoiceAssistant from './components/QiuBao'

function AppBar() {
  const title = { '/dispatch': '派工', '/me': '個人', '/notifications': '通知', '/schedule': '排班', '/customers': '客戶', '/payroll': '薪資', '/reports': '回報', '/report-center': '回報' } as Record<string,string>
  const loc = useLocation()
  const navigate = useNavigate()
  const t = title[loc.pathname] || '訂單內容'
  const u = authRepo.getCurrentUser()
  const isTechnician = u?.role === 'technician'
  
  return (
    <div className="sticky top-0 z-20 flex h-14 items-center justify-center bg-brand-500 text-white">
      <div className="absolute left-3 cursor-pointer text-sm" onClick={() => navigate('/dispatch')}>返回(總覽)</div>
      <div className="text-lg font-semibold">{t}</div>
      <div className="absolute right-3 flex items-center gap-2 text-xs opacity-90">
        <span>{u?.name || ''}</span>
        {isTechnician && (
          <button 
            onClick={() => {
              authRepo.logout()
              navigate('/login')
            }}
            className="rounded bg-white/20 px-2 py-1 text-white hover:bg-white/30"
          >
            登出
          </button>
        )}
      </div>
    </div>
  )
}

function TabBar() {
  const loc = useLocation()
  const active = (p: string) => (loc.pathname.startsWith(p) ? 'text-brand-500' : 'text-gray-400')
  const [unreadCount, setUnreadCount] = useState(0)
  const user = authRepo.getCurrentUser()

  useEffect(() => {
    const user = authRepo.getCurrentUser()
    if (!user) return
    notificationRepo.listForUser(user).then(({ unreadIds }) => {
      const count = Object.values(unreadIds).filter(Boolean).length
      setUnreadCount(count)
    })
  }, [loc.pathname])
  if (user?.role === 'technician') {
    // 技師：移除底部分頁列
    return null
  }
  return (
    <div className="sticky bottom-0 z-20 grid grid-cols-5 border-t bg-white py-2 text-center text-sm">
      <Link to="/dispatch" className={`${active('/dispatch')}`}>派工</Link>
      <Link to="/orders" className={`${active('/orders')}`}>訂單</Link>
      <Link to="/schedule" className={`${active('/schedule')}`}>排班</Link>
      <Link to="/notifications" className={`relative ${active('/notifications')}`}>
        通知
        {unreadCount > 0 && (<span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />)}
      </Link>
      <Link to="/me" className={`${active('/me')}`}>個人</Link>
    </div>
  )
}

function DesktopNav() {
  const loc = useLocation()
  const active = (p: string) => (loc.pathname.startsWith(p) ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'text-gray-700 hover:bg-gray-50')
  const [unreadCount, setUnreadCount] = useState(0)
  const user = authRepo.getCurrentUser()
  useEffect(() => {
    if (!user) return
    notificationRepo.listForUser(user).then(({ unreadIds }) => {
      const count = Object.values(unreadIds).filter(Boolean).length
      setUnreadCount(count)
    })
  }, [loc.pathname])
  const Item = ({ to, label, badge, disabled }: { to: string; label: string; badge?: number; disabled?: boolean }) => (
    <Link to={to} className={`relative flex items-center justify-between rounded-lg px-3 py-2 text-sm ${active(to)} ${disabled ? 'pointer-events-none opacity-40' : ''}`}>
      <span className="truncate">{label}</span>
      {/* 通知中心：紅點 */}
      {to==='/notifications' && unreadCount>0 && (<span className="h-2 w-2 rounded-full bg-rose-500" />)}
      {/* 其他項目：紅色數字標籤 */}
      {badge && badge>0 && to!=='/notifications' && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-medium text-white ml-1">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
  // 根據權限隱藏功能，並將「技師管理/員工管理/報表管理」移至最下方（客服無權限仍可見為灰階）
 const menuTop = [
  { to: '/dispatch', label: '派工總覽', perm: 'dashboard.view' },
  { to: '/orders', label: '訂單管理', perm: 'orders.list' },
  { to: '/reservations', label: '預約訂單', perm: 'orders.list' },
  { to: '/products', label: '產品管理', perm: 'products.manage' },
  { to: '/inventory', label: '庫存管理', perm: 'inventory.manage' },
  { to: '/notifications', label: '通知中心', perm: 'notifications.read' },
  { to: '/schedule', label: '排班/派工', perm: 'technicians.schedule.view' },
  { to: '/customers', label: '客戶管理', perm: 'customers.manage' },
  { to: '/members', label: '會員管理', perm: 'customers.manage' },
  { to: '/approvals', label: '待審核', perm: 'admin' },
  { to: '/report-center', label: '回報中心', perm: 'reports.view' },
  { to: '/payroll', label: '薪資/分潤', perm: 'payroll.view' },
  { to: '/documents', label: '文件管理', perm: 'documents.manage' },
  { to: '/models', label: '機型管理', perm: 'models.manage' },
  { to: '/quotes', label: '職人語錄', perm: 'dashboard.view' },
  { to: '/me', label: '個人設定', perm: 'dashboard.view' }
]
  const menuBottom = [
    { to: '/technicians', label: '技師管理', perm: 'technicians.manage' },
    { to: '/staff', label: '員工管理', perm: 'staff.manage' },
    { to: '/reports', label: '報表', perm: 'reports.manage' }
  ]

  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    (async()=>{
      try {
        const a = await loadAdapters()
        const [orders, reservations, threads] = await Promise.all([
          a.orderRepo?.list?.() ?? [],
          (a as any)?.reservationsRepo?.list?.() ?? [],
          (a as any)?.reportsRepo?.list?.() ?? [],
        ])
        const [memberApps, techApps, staffApps] = await Promise.all([
          (a as any)?.memberApplicationRepo?.listPending?.() ?? [],
          (a as any)?.technicianApplicationRepo?.listPending?.() ?? [],
          (a as any)?.staffApplicationRepo?.listPending?.() ?? [],
        ])
        const approvals = (memberApps?.length || 0) + (techApps?.length || 0) + (staffApps?.length || 0)
        const ordersNew = (orders||[]).filter((o:any)=> o.status==='confirmed' && !o.workStartedAt).length
        const needAssign = (orders||[]).filter((o:any)=> o.status==='confirmed' && (!Array.isArray(o.assignedTechnicians) || o.assignedTechnicians.length===0)).length
        const rsvPending = (reservations||[]).filter((r:any)=> r.status==='pending').length
        // 回報中心：僅計算對當前使用者可見且未結案的數量
        const emailLc = (user?.email||'').toLowerCase()
        const visible = (threads||[]).filter((t:any)=>{
          if (t.status !== 'open') return false
          if (t.target === 'all') return true
          if (t.target === 'tech') return user?.role === 'technician'
          if (t.target === 'support') return user?.role === 'support'
          if (t.target === 'subset') {
            const list = (t.targetEmails||[]).map((x:string)=> (x||'').toLowerCase())
            return list.includes(emailLc)
          }
          return false
        }).length
        setCounts({ approvals, orders: ordersNew, schedule: needAssign, reservations: rsvPending, reports: visible })
      } catch {}
    })()
  }, [loc.pathname])

  const renderItem = (to: string, label: string, perm: any) => {
    const allowed = can(user, perm as any)
    const badge = to==='/approvals' ? (counts.approvals||0)
      : to==='/orders' ? (counts.orders||0)
      : to==='/schedule' ? (counts.schedule||0)
      : to==='/reservations' ? (counts.reservations||0)
      : to==='/report-center' ? (counts.reports||0)
      : 0
    return <Item key={to} to={to} label={label} badge={badge} disabled={!allowed} />
  }

  return (
    <aside className="w-48 shrink-0 border-r bg-white p-3">
      <div className="mb-3 px-1 text-sm font-semibold text-gray-500">功能選單</div>
      <nav className="space-y-1">
        {menuTop.map(m => renderItem(m.to, m.label, m.perm))}
        <div className="my-2 border-t" />
        {menuBottom.map(m => renderItem(m.to, m.label, m.perm))}
      </nav>
    </aside>
  )
}

function QuoteBar() {
  const QUOTES = [
    '專業，來自於每一次的細節堅持。',
    '把今天做到最好，明天自然會更好。',
    '職人之道：不急不徐，精準到位。',
    '真正的效率，是品質與速度的平衡。',
    '服務的本質，是把別人的事當成自己的事。',
    '做好一件事，勝過說一百句話。',
    '每一次完成，都是下一次進步的起點。',
    '專注當下，持續改善。'
  ]
  const idx = Math.abs(new Date().getDate()) % QUOTES.length
  const text = QUOTES[idx]
  return <div className="bg-brand-50 px-3 py-1 text-center text-xs text-brand-700">{text}</div>
}

export default function AppShell() {
  const [blocked, setBlocked] = useState(false)
  useEffect(() => {
    const check = () => {
      try {
        const user = authRepo.getCurrentUser()
        const ua = navigator.userAgent.toLowerCase()
        // 更嚴謹的行動裝置判斷：UA / UA-CH / coarse 指標
        // 並將視窗寬度門檻降到 600，避免桌面雙窗被誤攔
        // 註：若裝置為行動或平板，無論寬度皆阻擋；僅在桌面小窗時以 600 為門檻
        // UA
        const isMobileUA = /iphone|ipad|ipod|android|mobile|tablet|silk|kindle|playbook|bb10/.test(ua)
        // UA Client Hints（Chromium）
        // @ts-ignore
        const isUaChMobile = typeof navigator !== 'undefined' && navigator.userAgentData ? navigator.userAgentData.mobile === true : false
        // 指標（觸控為主）
        const isCoarsePointer = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(any-pointer: coarse)').matches : false
                 // 視口寬度（桌面小窗）
         const isSmallViewport = window.innerWidth < 500
        const isMobileLike = isMobileUA || isUaChMobile || isCoarsePointer
        const shouldBlock = !!user && user.role === 'support' && (isMobileLike || (!isMobileLike && isSmallViewport))
        setBlocked(shouldBlock)
      } catch {}
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (blocked) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-[#F5F7FB] p-4">
        <div className="w-full rounded-2xl bg-white p-6 text-center shadow-card">
          <div className="text-5xl">🖥️</div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">僅限桌面裝置使用</h1>
          <p className="mt-2 text-gray-600">目前無法在手機或平板上使用系統，請改用電腦。</p>
        </div>
      </div>
    )
  }

  // 角色導向版型：技師保留行動版，其餘採用桌面左側選單
  const user = authRepo.getCurrentUser()
  if (user?.role === 'technician') {
    // 技師：隱藏左側選單，保留上方 AppBar，移除底部 TabBar
    return (
      <div className="mx-auto min-h-screen bg-[#F5F7FB]">
        <AppBar />
        <QuoteBar />
        <div className="px-3 pt-3 pb-6">
          <Outlet />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#F5F7FB]">
      <DesktopNav />
      <main className="flex-1">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/80 px-4 py-3 backdrop-blur">
          <div className="text-base font-semibold text-gray-800">洗濯派工系統 <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-[10px]">v1.1.2</span></div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-700">{authRepo.getCurrentUser()?.name || ''}</div>
            <button onClick={()=>{ authRepo.logout().then(()=>{ window.location.href='/login' }) }} className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700">登出</button>
          </div>
        </div>
        <QuoteBar />
        <div className="px-4 py-4">
          <Outlet />
        </div>
      </main>
      {/* 球寶語音助手 */}
      <QiuBaoVoiceAssistant />
    </div>
  )
}


