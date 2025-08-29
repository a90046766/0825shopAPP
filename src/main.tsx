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

// 權限保護
import { loadAdapters } from './adapters/index'
import { authRepo as staticAuthRepo } from './adapters/local/auth'
import { can } from './utils/permissions'

function PrivateRoute({ children, permission }: { children: React.ReactNode; permission?: string }) {
  const user = staticAuthRepo?.getCurrentUser?.()
  
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
  const a = await loadAdapters()
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
        
        {/* 私有路由 */}
        <Route path="/" element={<Navigate to="/dispatch" replace />} />
        <Route element={<PrivateRoute><AppShell /></PrivateRoute>}>
          <Route path="/dispatch" element={<PrivateRoute><PageDispatchHome /></PrivateRoute>} />
          <Route path="/orders/:id" element={<PrivateRoute permission="orders.read"><PageOrderDetail /></PrivateRoute>} />
          <Route path="/approvals" element={<PrivateRoute permission="admin"><ApprovalsPage /></PrivateRoute>} />
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
          <Route path="/used-items" element={<PrivateRoute permission="inventory.manage"><UsedItemsPage /></PrivateRoute>} />
          <Route path="/quotes" element={<PrivateRoute><QuotesPage /></PrivateRoute>} />
          <Route path="/me" element={<PrivateRoute><PageProfile /></PrivateRoute>} />
        </Route>
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  )
})()