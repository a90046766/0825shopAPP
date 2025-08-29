import type { User } from '../core/repository'

// 權限定義（單一真相）
export type Permission = 
  | 'admin'
  | 'dashboard.view'
  | 'orders.list' | 'orders.read' | 'orders.create' | 'orders.update' | 'orders.delete' | 'orders.cancel'
  | 'reservations.manage'
  | 'customers.manage'
  | 'technicians.manage' | 'technicians.schedule.view' | 'technicians.schedule.edit'
  | 'support.schedule.view' | 'support.schedule.edit'
  | 'staff.manage' | 'staff.payroll.view' | 'staff.payroll.edit'
  | 'products.manage' | 'inventory.manage' | 'inventory.create' | 'inventory.edit' | 'inventory.delete' | 'inventory.purchase'
  | 'promotions.manage' | 'documents.manage' | 'models.manage'
  | 'notifications.send' | 'notifications.read'
  | 'approvals.manage'
  | 'schedule.view'
  | 'customers.manage'
  | 'inventory.manage'
  | 'payroll.view' | 'payroll.edit'
  | 'reports.view' | 'reports.manage'
  | 'reservations.manage'
  | 'reports.thread'
  | 'bulletin.manage'

// 角色權限矩陣
const ROLE_PERMISSIONS: Record<User['role'], Permission[]> = {
  admin: [
    'admin',
    'dashboard.view',
    'orders.list', 'orders.read', 'orders.create', 'orders.update', 'orders.delete', 'orders.cancel',
    'reservations.manage',
    'customers.manage',
    'technicians.manage', 'technicians.schedule.view', 'technicians.schedule.edit',
    'support.schedule.view', 'support.schedule.edit',
    'staff.manage', 'staff.payroll.view', 'staff.payroll.edit', 'payroll.view', 'payroll.edit',
    'products.manage', 'inventory.manage', 'inventory.create', 'inventory.edit', 'inventory.delete', 'inventory.purchase',
    'promotions.manage', 'documents.manage', 'models.manage',
    'notifications.send', 'notifications.read',
    'approvals.manage',
    'schedule.view',
    'inventory.manage',
    'reports.view', 'reports.manage',
    'bulletin.manage'
  ],
  support: [
    'dashboard.view',
    'orders.list', 'orders.read', 'orders.create', 'orders.update', 'orders.cancel',
    'reservations.manage',
    'customers.manage',
    'technicians.schedule.view',
    'support.schedule.view', 'support.schedule.edit',
    'staff.payroll.view', // 僅自己
    'payroll.view',
    'products.manage', 'inventory.manage', 'inventory.create', 'inventory.edit', 'inventory.delete', 'inventory.purchase',
    'promotions.manage', 'documents.manage', 'models.manage',
    'notifications.send', 'notifications.read',
    'approvals.manage',
    'schedule.view',
    'inventory.manage',
    'reports.view',
    'bulletin.manage'
  ],
  sales: [
    'dashboard.view',
    'customers.manage',
    'promotions.manage', 'documents.manage', 'models.manage',
    'notifications.read',
    'schedule.view',
    'reports.view'
  ],
  technician: [
    'dashboard.view',
    'orders.list', 'orders.read', 'orders.update', // 僅負數調整與照片
    'technicians.schedule.view',
    'notifications.read',
    'schedule.view',
    'payroll.view',
    'reports.view'
  ],
  member: [
    'notifications.read'
  ]
}

// 權限檢查函數（中央門閘）
type PermissionOverride = { allow?: Permission[]; deny?: Permission[] }

function loadOverrides(): Record<string, PermissionOverride> {
  try { const s = localStorage.getItem('local-permission-overrides'); return s ? JSON.parse(s) : {} } catch { return {} }
}
function saveOverrides(map: Record<string, PermissionOverride>) { try { localStorage.setItem('local-permission-overrides', JSON.stringify(map)) } catch {} }

export function getPermissionOverride(email: string): PermissionOverride | undefined {
  const all = loadOverrides(); return all[(email||'').toLowerCase()]
}
export function setPermissionOverride(email: string, override: PermissionOverride) {
  const all = loadOverrides(); all[(email||'').toLowerCase()] = override; saveOverrides(all)
}

export function can(user: User | null, permission: Permission): boolean {
  if (!user) return false
  const base = ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false
  const ov = getPermissionOverride(user.email || '')
  if (ov?.deny && ov.deny.includes(permission)) return false
  if (ov?.allow && ov.allow.includes(permission)) return true
  return base
}

// 便利函數（向後兼容）
export const canViewDashboard = (role?: User['role']) => role ? can({ role } as User, 'dashboard.view') : false
export const canViewOrders = (role?: User['role']) => role ? can({ role } as User, 'orders.list') : false
export const canCreateOrders = (role?: User['role']) => role ? can({ role } as User, 'orders.create') : false
export const canDeleteOrders = (role?: User['role']) => role ? can({ role } as User, 'orders.delete') : false
export const canViewReservations = (role?: User['role']) => role ? can({ role } as User, 'reservations.manage') : false
export const canViewCustomers = (role?: User['role']) => role ? can({ role } as User, 'customers.manage') : false
export const canViewTechnicians = (role?: User['role']) => role ? can({ role } as User, 'technicians.manage') : false
export const canViewSchedule = (role?: User['role']) => role ? can({ role } as User, 'technicians.schedule.view') : false
export const canViewStaffManagement = (role?: User['role']) => role ? can({ role } as User, 'staff.manage') : false
export const canViewProducts = (role?: User['role']) => role ? can({ role } as User, 'products.manage') : false
export const canViewInventory = (role?: User['role']) => role ? can({ role } as User, 'inventory.manage') : false
export const canViewPromotions = (role?: User['role']) => role ? can({ role } as User, 'promotions.manage') : false
export const canManageNotifications = (role?: User['role']) => role ? can({ role } as User, 'notifications.send') : false
export const canViewApprovals = (role?: User['role']) => role ? can({ role } as User, 'approvals.manage') : false
