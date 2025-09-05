import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './styles.css'

// 頁面
import LoginPage from './ui/pages/Login'
import TechnicianApplyPage from './ui/pages/TechnicianApply'
import StaffApplyPage from './ui/pages/StaffApply'
import MemberApplyPage from './ui/pages/MemberApply'
import ApprovalsPage from './ui/pages/Approvals'
import AppShell from './ui/AppShell'
import PageDispatchHome from './ui/pages/DispatchHome'
import PageOrderDetail from './ui/pages/OrderDetail'
import PageProfile from './ui/pages/Profile'
import ResetPasswordPage from './ui/pages/ResetPassword'
import NotificationsPage from './ui/pages/Notifications'
import TechnicianSchedulePage from './ui/pages/TechnicianSchedule'
import MemberRegisterPage from './ui/pages/MemberRegister'
import MemberLoginPage from './ui/pages/MemberLogin'
import MemberPasswordResetPage from './ui/pages/MemberPasswordReset'
import ProductsPage from './ui/pages/Products'
import InventoryPage from './ui/pages/Inventory'
import TechnicianManagementPage from './ui/pages/TechnicianManagement'
import PromotionsPage from './ui/pages/Promotions'
import OrderManagementPage from './ui/pages/OrderManagement'
import ReservationsPage from './ui/pages/Reservations'
import StaffManagementPage from './ui/pages/StaffManagement'
import DocumentsPage from './ui/pages/Documents'
import ModelsPage from './ui/pages/Models'
import MembersPage from './ui/pages/Members'
import CustomersPage from './ui/pages/Customers'
import PayrollPage from './ui/pages/Payroll'
import ReportsPage from './ui/pages/Reports'
import ReportCenterPage from './ui/pages/ReportCenter'
import UsedItemsPage from './ui/pages/UsedItems'
import QuotesPage from './ui/pages/Quotes'
import NewShopPage from './ui/pages/NewShop'
import ShopProductsPage from './ui/pages/ShopProducts'
import ShopCartPage from './ui/pages/ShopCart'
import OrderSuccessPage from './ui/pages/OrderSuccess'
import DatabaseTestPage from './ui/pages/DatabaseTest'
import AdminContentPage from './ui/pages/AdminContent'
import AdminSettingsPage from './ui/pages/AdminSettings'
import AdminBroadcastPage from './ui/pages/AdminBroadcast'
import MemberOrdersPage from './ui/pages/MemberOrders'
import MemberOrderDetailPage from './ui/pages/MemberOrderDetail'
import { supabase } from './utils/supabase'

// 權限保護
import { loadAdapters } from './adapters/index'
import { can } from './utils/permissions'

function getCurrentUserFromStorage(): any {
  try {
    const supa = localStorage.getItem('supabase-auth-user')
    if (supa) return JSON.parse(supa)
  } catch {}
  try {
    const local = localStorage.getItem('local-auth-user')
    if (local) return JSON.parse(local)
  } catch {}
  return null
}

function PrivateRoute({ children, permission }: { children: React.ReactNode; permission?: string }) {
  const user = getCurrentUserFromStorage()
  
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

;(async()=>{
  try {
  const a = await loadAdapters()

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
      const inferredRole = ((PRIMARY as any)[email]?.role ?? (tech ? 'technician' : (staff?.role as any) ?? null)) as any

      // 非內部人員（未命中 PRIMARY/technicians/staff）不建立後台登入態
      if (!inferredRole) return

      const user = { id: session.user.id, email: session.user.email, name: displayName, role: inferredRole, phone: (staff as any)?.phone || (tech as any)?.phone, passwordSet: true }
      try { localStorage.setItem('supabase-auth-user', JSON.stringify(user)) } catch {}

      if (location.pathname === '/login') {
        location.href = '/dispatch'
      }

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
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
        {/* 公開路由 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/apply/technician" element={<TechnicianApplyPage />} />
        <Route path="/apply/staff" element={<StaffApplyPage />} />
        <Route path="/apply/member" element={<MemberApplyPage />} />
        <Route path="/register/member" element={<MemberRegisterPage />} />
        {/* 會員專用登入 */}
        <Route path="/login/member" element={<MemberLoginPage />} />
        <Route path="/login/member/reset" element={<MemberPasswordResetPage />} />
        {/* 對外購物站入口（公開） */}
        <Route path="/store" element={<NewShopPage />} />
        <Route path="/shop/products" element={<ShopProductsPage />} />
        <Route path="/shop/cart" element={<ShopCartPage />} />
        <Route path="/shop/order-success" element={<OrderSuccessPage />} />
        {/* 會員中心 */}
        <Route path="/member/orders" element={<MemberOrdersPage />} />
        <Route path="/member/orders/:id" element={<MemberOrderDetailPage />} />
        {/* 測試頁面 */}
        <Route path="/test/database" element={<DatabaseTestPage />} />
        
        {/* 私有路由 */}
        <Route path="/" element={<Navigate to="/dispatch" replace />} />
        <Route element={<PrivateRoute><AppShell /></PrivateRoute>}>
          {/* 導向公開入口 /store */}
          <Route path="/shop" element={<Navigate to="/store" replace />} />
          <Route path="/dispatch" element={<PrivateRoute><PageDispatchHome /></PrivateRoute>} />
          <Route path="/orders/:id" element={<PrivateRoute permission="orders.read"><PageOrderDetail /></PrivateRoute>} />
          <Route path="/approvals" element={<PrivateRoute permission="approvals.manage"><ApprovalsPage /></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
          <Route path="/schedule" element={<PrivateRoute permission="technicians.schedule.view"><TechnicianSchedulePage /></PrivateRoute>} />
          <Route path="/products" element={<PrivateRoute permission="products.manage"><ProductsPage /></PrivateRoute>} />
          <Route path="/inventory" element={<PrivateRoute permission="inventory.manage"><InventoryPage /></PrivateRoute>} />
          <Route path="/orders" element={<PrivateRoute permission="orders.list"><OrderManagementPage /></PrivateRoute>} />
          <Route path="/reservations" element={<PrivateRoute permission="reservations.manage"><ReservationsPage /></PrivateRoute>} />
          <Route path="/staff" element={<PrivateRoute permission="staff.manage"><StaffManagementPage /></PrivateRoute>} />
          <Route path="/technicians" element={<PrivateRoute permission="technicians.manage"><TechnicianManagementPage /></PrivateRoute>} />
          <Route path="/promotions" element={<PrivateRoute permission="promotions.manage"><PromotionsPage /></PrivateRoute>} />
          <Route path="/documents" element={<PrivateRoute permission="documents.manage"><DocumentsPage /></PrivateRoute>} />
          <Route path="/models" element={<PrivateRoute permission="models.manage"><ModelsPage /></PrivateRoute>} />
          <Route path="/members" element={<PrivateRoute permission="customers.manage"><MembersPage /></PrivateRoute>} />
          <Route path="/customers" element={<PrivateRoute permission="customers.manage"><CustomersPage /></PrivateRoute>} />
          <Route path="/payroll" element={<PrivateRoute permission="payroll.view"><PayrollPage /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute permission="reports.view"><ReportsPage /></PrivateRoute>} />
          <Route path="/report-center" element={<PrivateRoute permission="reports.view"><ReportCenterPage /></PrivateRoute>} />
          <Route path="/admin/settings" element={<PrivateRoute permission="promotions.manage"><AdminSettingsPage /></PrivateRoute>} />
          <Route path="/admin/broadcast" element={<PrivateRoute permission="bulletin.manage"><AdminBroadcastPage /></PrivateRoute>} />
          <Route path="/used-items" element={<PrivateRoute permission="inventory.manage"><UsedItemsPage /></PrivateRoute>} />
          <Route path="/quotes" element={<PrivateRoute><QuotesPage /></PrivateRoute>} />
          <Route path="/me" element={<PrivateRoute><PageProfile /></PrivateRoute>} />
          <Route path="/admin/content" element={<PrivateRoute permission="promotions.manage"><AdminContentPage /></PrivateRoute>} />
        </Route>
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  )
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