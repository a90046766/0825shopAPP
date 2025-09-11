import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './styles.css'
import CmsEditor from './ui/pages/CmsEditor';
// 最早期可視占位，避免任何情況出現白屏
try {
  const rootEl = document.getElementById('root')
  if (rootEl && !rootEl.innerHTML) {
    rootEl.innerHTML = '<div style="padding:16px;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111">啟動中…</div>'
  }
} catch {}

// 頁面
const LoginPage = React.lazy(() => import('./ui/pages/Login'))
const TechnicianApplyPage = React.lazy(() => import('./ui/pages/TechnicianApply'))
const StaffApplyPage = React.lazy(() => import('./ui/pages/StaffApply'))
// 移除會員申請；保留審核頁（技師/員工）
// const MemberApplyPage = React.lazy(() => import('./ui/pages/MemberApply'))
const ApprovalsPage = React.lazy(() => import('./ui/pages/Approvals'))
const AppShell = React.lazy(() => import('./ui/AppShell'))
const PageDispatchHome = React.lazy(() => import('./ui/pages/DispatchHome'))
const PageOrderDetail = React.lazy(() => import('./ui/pages/OrderDetail'))
const PageProfile = React.lazy(() => import('./ui/pages/Profile'))
const ResetPasswordPage = React.lazy(() => import('./ui/pages/ResetPassword'))
// const NotificationsPage = React.lazy(() => import('./ui/pages/Notifications'))
const TechnicianSchedulePage = React.lazy(() => import('./ui/pages/TechnicianSchedule'))
const MemberRegisterPage = React.lazy(() => import('./ui/pages/MemberRegister'))
const MemberLoginPage = React.lazy(() => import('./ui/pages/MemberLogin'))
const MemberPasswordResetPage = React.lazy(() => import('./ui/pages/MemberPasswordReset'))
const ProductsPage = React.lazy(() => import('./ui/pages/Products'))
const InventoryPage = React.lazy(() => import('./ui/pages/Inventory'))
const TechnicianManagementPage = React.lazy(() => import('./ui/pages/TechnicianManagement'))
const PromotionsPage = React.lazy(() => import('./ui/pages/Promotions'))
const OrderManagementPage = React.lazy(() => import('./ui/pages/OrderManagement'))
const StaffManagementPage = React.lazy(() => import('./ui/pages/StaffManagement'))
const DocumentsPage = React.lazy(() => import('./ui/pages/Documents'))
const ModelsPage = React.lazy(() => import('./ui/pages/Models'))
const MembersPage = React.lazy(() => import('./ui/pages/Members'))
const CustomersPage = React.lazy(() => import('./ui/pages/Customers'))
const PayrollPage = React.lazy(() => import('./ui/pages/Payroll'))
const ReportsPage = React.lazy(() => import('./ui/pages/Reports'))
const ReportCenterPage = React.lazy(() => import('./ui/pages/ReportCenter'))
const UsedItemsPage = React.lazy(() => import('./ui/pages/UsedItems'))
const QuotesPage = React.lazy(() => import('./ui/pages/Quotes'))
import NewShopPage from './ui/pages/NewShop'
import EntryPage from './ui/pages/Entry'
const ShopProductsPage = React.lazy(() => import('./ui/pages/ShopProducts'))
const ShopCartPage = React.lazy(() => import('./ui/pages/ShopCart'))
const OrderSuccessPage = React.lazy(() => import('./ui/pages/OrderSuccess'))
const SalaryPage = React.lazy(() => import('./ui/pages/Salary'))
const LeaveManagementPage = React.lazy(() => import('./ui/pages/LeaveManagement'))
const DatabaseTestPage = React.lazy(() => import('./ui/pages/DatabaseTest'))
const AdminContentPage = React.lazy(() => import('./ui/pages/AdminContent'))
const AdminSettingsPage = React.lazy(() => import('./ui/pages/AdminSettings'))
const AdminBroadcastPage = React.lazy(() => import('./ui/pages/AdminBroadcast'))
const MemberOrdersPage = React.lazy(() => import('./ui/pages/MemberOrders'))
const MemberOrderDetailPage = React.lazy(() => import('./ui/pages/MemberOrderDetail'))
const MemberProfilePage = React.lazy(() => import('./ui/pages/MemberProfile'))
import { supabase } from './utils/supabase'

// 權限保護
import { loadAdapters } from './adapters/index'
import { can } from './utils/permissions'

// 頁面啟動前：若在根路徑，暫不強制導向，交由 Router 決策

// 移除直渲染 bypass，統一交由 Router 控制

function getCurrentUserFromStorage(): any {
  try {
    const supa = localStorage.getItem('supabase-auth-user')
    if (supa) {
      // 防止「假登入」：若沒有 Supabase 的 session 存檔，視為未登入
      try {
        const sb = localStorage.getItem('sb-0825shopapp-auth')
        if (!sb) {
          localStorage.removeItem('supabase-auth-user')
          return null
        }
      } catch {}
      return JSON.parse(supa)
    }
  } catch {}
  try {
    const local = localStorage.getItem('local-auth-user')
    if (local) return JSON.parse(local)
  } catch {}
  return null
}

function PrivateRoute({ children, permission }: { children: React.ReactNode; permission?: string }) {
  const user = getCurrentUserFromStorage()
  // 追加：若無 Supabase session，視為未登入，避免假登入
  try {
    const sb = localStorage.getItem('sb-0825shopapp-auth')
    if (!sb) {
      try { localStorage.removeItem('supabase-auth-user') } catch {}
      return <Navigate to="/login" replace />
    }
  } catch {}
  
  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (permission && !can(user, permission as any)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] p-4">
        <div className="rounded-2xl bg-white p-6 shadow-card text-center">
          <h1 className="text-xl font-bold text-gray-900">權限不足</h1>
          <p className="mt-2 text-gray-600">您沒有權限訪問此頁面</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-white"
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// 先渲染 UI，再在背景做初始化，避免白屏
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <React.Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] p-6"><div className="rounded-2xl bg-white p-6 shadow-card text-center text-sm text-gray-600">載入中…</div></div>}>
      <Routes>
      {/* 公開路由 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/apply/technician" element={<TechnicianApplyPage />} />
      <Route path="/apply/staff" element={<StaffApplyPage />} />
      {/* 移除會員申請頁 */}
      <Route path="/register/member" element={<MemberRegisterPage />} />
      {/* 會員專用登入 */}
      <Route path="/login/member" element={<MemberLoginPage />} />
      <Route path="/login/member/reset" element={<MemberPasswordResetPage />} />
      {/* 對外入口與購物站 */}
      {/* 根路由：store 子網域進購物站，其餘進員工登入 */}
      <Route
        path="/"
        element={(() => {
          try {
            const host = typeof window !== 'undefined' ? window.location.hostname : ''
            const envStoreHost = (() => { try { return new URL((import.meta as any).env?.VITE_STORE_BASE_URL || '').hostname } catch { return '' } })()
            const isStoreHost = !!host && (host === 'store.942clean.com.tw' || host.startsWith('store.') || (envStoreHost && host === envStoreHost))
            return <Navigate to={isStoreHost ? '/store' : '/login'} replace />
          } catch {
            return <Navigate to="/login" replace />
          }
        })()}
      />
      <Route path="/store" element={<NewShopPage />} />
      <Route path="/store/products" element={<ShopProductsPage />} />
      <Route path="/store/cart" element={<ShopCartPage />} />
      <Route path="/store/order-success" element={<OrderSuccessPage />} />
      {/* 會員中心 */}
      <Route path="/store/member/orders" element={<MemberOrdersPage />} />
      <Route path="/store/member/profile" element={<MemberProfilePage />} />
      <Route path="/store/member/orders/:id" element={<MemberOrderDetailPage />} />
      {/* 舊路徑相容 */}
      <Route path="/shop/*" element={<Navigate to="/store" replace />} />
      <Route path="/member/*" element={<Navigate to="/store/member/orders" replace />} />
      {/* 測試頁面 */}
      <Route path="/test/database" element={<DatabaseTestPage />} />
      
        {/* 私有路由 */}
        <Route element={<PrivateRoute><AppShell /></PrivateRoute>}>
        {/* 舊購物路徑導向 /store */}
        <Route path="/shop" element={<Navigate to="/store" replace />} />
        <Route path="/dispatch" element={<PrivateRoute><PageDispatchHome /></PrivateRoute>} />
        <Route path="/orders/:id" element={<PrivateRoute permission="orders.read"><PageOrderDetail /></PrivateRoute>} />
        {/* 通知中心頁面已移除（保留站內廣播） */}
        <Route path="/schedule" element={<PrivateRoute permission="technicians.schedule.view"><TechnicianSchedulePage /></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute permission="products.manage"><ProductsPage /></PrivateRoute>} />
        <Route path="/inventory" element={<PrivateRoute permission="inventory.manage"><InventoryPage /></PrivateRoute>} />
        <Route path="/orders" element={<PrivateRoute permission="orders.list"><OrderManagementPage /></PrivateRoute>} />
        <Route path="/reservations" element={<Navigate to="/orders" replace />} />
        <Route path="/staff" element={<PrivateRoute permission="staff.manage"><StaffManagementPage /></PrivateRoute>} />
        <Route path="/technicians" element={<PrivateRoute permission="technicians.manage"><TechnicianManagementPage /></PrivateRoute>} />
        <Route path="/promotions" element={<PrivateRoute permission="promotions.manage"><PromotionsPage /></PrivateRoute>} />
        <Route path="/documents" element={<PrivateRoute permission="documents.manage"><DocumentsPage /></PrivateRoute>} />
        <Route path="/models" element={<Navigate to="/cms" replace />} />
        <Route path="/members" element={<PrivateRoute permission="customers.manage"><MembersPage /></PrivateRoute>} />
        <Route path="/customers" element={<PrivateRoute permission="customers.manage"><CustomersPage /></PrivateRoute>} />
        {/* Approvals 僅限 admin 可見，權限已在選單側控制 */}
        <Route path="/approvals" element={<PrivateRoute permission="approvals.manage"><ApprovalsPage /></PrivateRoute>} />
        <Route path="/payroll" element={<PrivateRoute permission="payroll.view"><PayrollPage /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute permission="reports.view"><ReportsPage /></PrivateRoute>} />
        <Route path="/report-center" element={<PrivateRoute permission="reports.view"><ReportCenterPage /></PrivateRoute>} />
        <Route path="/admin/settings" element={<PrivateRoute permission="promotions.manage"><AdminSettingsPage /></PrivateRoute>} />
        <Route path="/admin/broadcast" element={<PrivateRoute permission="bulletin.manage"><AdminBroadcastPage /></PrivateRoute>} />
        <Route path="/used-items" element={<PrivateRoute permission="inventory.manage"><UsedItemsPage /></PrivateRoute>} />
        <Route path="/quotes" element={<PrivateRoute><QuotesPage /></PrivateRoute>} />
        <Route path="/me" element={<PrivateRoute><PageProfile /></PrivateRoute>} />
        <Route path="/salary" element={<PrivateRoute><SalaryPage /></PrivateRoute>} />
        {/* <Route path="/leave-management" element={<PrivateRoute><LeaveManagementPage /></PrivateRoute>} /> */}
        <Route path="/admin/content" element={<PrivateRoute permission="promotions.manage"><AdminContentPage /></PrivateRoute>} />
        {/* 改為新 CMS 編輯頁 */}
        <Route path="/cms" element={<PrivateRoute permission="promotions.manage"><CmsEditor /></PrivateRoute>} />
      </Route>
        {/* 萬用路由：任何未知路徑導回購物站 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </React.Suspense>
    </BrowserRouter>
  </React.StrictMode>
)

;(async()=>{
  try {
  // 背景初始化 adapters（供各頁按需使用），避免阻塞首屏
  loadAdapters().catch(()=>{})

  async function mapSessionToLocalUser(session: any) {
    if (!session?.user) return
    const email = (session.user.email || '').toLowerCase()
    const userType = (session.user.user_metadata && (session.user.user_metadata as any).user_type) || ''

    // 若為商城會員，嚴禁注入後台登入態
    if (userType === 'member') {
      try { localStorage.removeItem('supabase-auth-user') } catch {}
      return
    }
    try {
      const { data: tech } = await supabase
        .from('technicians')
        .select('id,email,name,phone,status,region')
        .eq('email', email)
        .maybeSingle()
      const { data: staff } = await supabase
        .from('staff')
        .select('id,email,name,role,phone,status')
        .eq('email', email)
        .maybeSingle()

      const PRIMARY: Record<string, { name: string; role: 'admin' | 'support' | 'technician' }> = {
        'a90046766@gmail.com': { name: '洗濯', role: 'admin' },
        'xiaofu888@yahoo.com.tw': { name: '洗小濯', role: 'support' },
        'jason660628@yahoo.com.tw': { name: '楊小飛', role: 'technician' },
      } as any

      const displayName = (PRIMARY as any)[email]?.name ?? tech?.name ?? staff?.name ?? session.user.email ?? ''
      let inferredRole = ((PRIMARY as any)[email]?.role ?? (tech ? 'technician' : (staff?.role as any) ?? null)) as any

      // 自動補錄：若非內部資料，預設建立為 support（避免假登入但無權限的狀況）
      if (!inferredRole) {
        try {
          await supabase.from('staff').upsert({
            id: session.user.id,
            name: displayName || session.user.email || '',
            email,
            phone: (staff as any)?.phone || '',
            role: 'support',
            status: 'active'
          }, { onConflict: 'email' })
          inferredRole = 'support'
        } catch {}
      }

      if (!inferredRole) return

      const user = { id: session.user.id, email: session.user.email, name: displayName, role: inferredRole, phone: (staff as any)?.phone || (tech as any)?.phone, passwordSet: true }
      try { localStorage.setItem('supabase-auth-user', JSON.stringify(user)) } catch {}

      try {
        const path = location.pathname
        // 僅在登入頁或根路徑時導向 /dispatch；不再攔截 /store 路徑
        if (path === '/login' || path === '/') {
          location.replace('/dispatch')
        }
      } catch {}

      if ((PRIMARY as any)[email] && !staff) {
        try {
          await supabase.from('staff').upsert({
            id: session.user.id,
            name: (PRIMARY as any)[email].name,
            email,
            phone: (staff as any)?.phone || '',
            role: (PRIMARY as any)[email].role,
            status: 'active'
          }, { onConflict: 'email' })
        } catch {}
      }
    } catch {}
  }

  // 啟動時先嘗試載入現有 session（魔術連結／回訪）
  try {
    const { data } = await supabase.auth.getSession()
    if (data?.session) await mapSessionToLocalUser(data.session)
    // 若 local 有 supabase-auth-user 但無 session，視為假登入，清除
    try {
      const local = localStorage.getItem('supabase-auth-user')
      const sb = localStorage.getItem('sb-0825shopapp-auth')
      if (local && !sb) localStorage.removeItem('supabase-auth-user')
    } catch {}
  } catch {}

  // 監聽後續的簽入/刷新事件
  try {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        await mapSessionToLocalUser(session)
      }
      if (event === 'SIGNED_OUT') {
        try { localStorage.removeItem('supabase-auth-user') } catch {}
      }
    })
  } catch {}

  // 實時驗證：偵測互動/聚焦時驗證 session（修正假登入殘影）
  const verifySession = async () => {
    try {
      const { data } = await supabase.auth.getSession()
      const hasSession = !!data?.session?.user
      const local = localStorage.getItem('supabase-auth-user')
      if (!hasSession && local) {
        // 清除假登入並刷新 UI
        try { localStorage.removeItem('supabase-auth-user') } catch {}
        // 僅在前台頁面與需要權限的後台頁面刷新一次
        try {
          const p = location.pathname
          if (p.startsWith('/dispatch') || p.startsWith('/orders') || p.startsWith('/inventory')) {
            location.reload()
          }
        } catch {}
      }
    } catch {}
  }
  let idleTimer: any = null
  const scheduleVerify = () => {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(verifySession, 600) // 0.6s 內首次互動後驗證一次
  }
  ;['mousemove','mousedown','keydown','touchstart','visibilitychange','focus'].forEach(evt => {
    window.addEventListener(evt as any, scheduleVerify, { passive: true })
  })
  // 直接 Render Router
  } catch (err: any) {
    const msg = (err && (err.message || String(err))) || '初始化失敗'
    try { console.error('App init error:', err) } catch {}
    createRoot(document.getElementById('root')!).render(
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-card">
          <h1 className="text-xl font-bold text-gray-900">系統初始化失敗</h1>
          <p className="mt-2 text-gray-600 break-words">{msg}</p>
          <p className="mt-2 text-gray-600">請確認已設定 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY，並重新部署。</p>
        </div>
      </div>
    )
  }
})()