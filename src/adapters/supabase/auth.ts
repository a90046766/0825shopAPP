import type { AuthRepo, User } from '../../core/repository'
import { supabase } from '../../utils/supabase'

class SupabaseAuthRepo implements AuthRepo {
  private currentUser: User | null = null
  private readonly storageKey = 'supabase-auth-user'

  constructor() {
    // 恢復登入狀態
    try {
      const saved = localStorage.getItem(this.storageKey)
      if (saved) {
        this.currentUser = JSON.parse(saved)
      }
    } catch {}
  }

  async login(email: string, password: string): Promise<User> {
    const lc = email.trim().toLowerCase()
    const pwd = password && password.trim() ? password : 'a123123'
    const { data, error } = await supabase.auth.signInWithPassword({ email: lc, password: pwd })
    if (error) throw new Error(error.message || '登入失敗')

    if (!data.user) {
      throw new Error('登入失敗：無法取得使用者資料')
    }

    // 嚴格阻擋商城會員登入後台
    const userType = (data.user.user_metadata && (data.user.user_metadata as any).user_type) || ''
    if (String(userType).toLowerCase() === 'member') {
      await supabase.auth.signOut()
      throw new Error('此帳號為商城會員，請使用會員登入頁 /login/member')
    }

    // 先查技師，若找到就不再查 staff，避免 staff 查詢 500 影響登入
    const { data: technicianData } = await supabase
      .from('technicians')
      .select('id,email,name,phone,status,region')
      .eq('email', lc)
      .maybeSingle()

    // 再視需要查 staff（只有在尚未命中技師時）
    let staffData: any = null
    if (!technicianData) {
      const { data: sData } = await supabase
        .from('staff')
        .select('id,email,name,role,phone,status')
        .eq('email', lc)
        .maybeSingle()
      staffData = sData as any
    }

    // 主帳號後備名單（永遠優先）
    const PRIMARY: Record<string, { name: string; role: 'admin' | 'support' | 'technician' }> = {
      'a90046766@gmail.com': { name: '洗濯', role: 'admin' },
      'xiaofu888@yahoo.com.tw': { name: '洗小濯', role: 'support' },
      'jason660628@yahoo.com.tw': { name: '楊小飛', role: 'technician' },
    }

    // 僅允許 PRIMARY / technicians / staff 登入
    const displayName = PRIMARY[lc]?.name ?? technicianData?.name ?? staffData?.name ?? data.user.email ?? ''
    const role = (PRIMARY[lc]?.role ?? (technicianData ? 'technician' : (staffData?.role as any) ?? null)) as User['role']
    if (!role) {
      await supabase.auth.signOut()
      throw new Error('此帳號非內部人員，請改用會員登入頁 /login/member')
    }

    this.currentUser = {
      id: data.user.id,
      email: data.user.email!,
      name: displayName,
      role,
      phone: (staffData as any)?.phone || (technicianData as any)?.phone,
      passwordSet: true
    }

    // 只對 PRIMARY 進行自動補齊/校正 staff 資料
    if (PRIMARY[lc]) {
      try {
        await supabase
          .from('staff')
          .upsert({
            id: data.user.id,
            name: PRIMARY[lc].name,
            email: lc,
            phone: (staffData as any)?.phone || '',
            role: PRIMARY[lc].role,
            status: 'active'
          }, { onConflict: 'email' })
      } catch {}
    }

    // 保存登入狀態
    localStorage.setItem(this.storageKey, JSON.stringify(this.currentUser))
    
    return this.currentUser
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut()
    this.currentUser = null
    localStorage.removeItem(this.storageKey)
  }

  async resetPassword(newPassword: string): Promise<void> {
    if (!this.currentUser) throw new Error('未登入')
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      throw new Error(error.message || '密碼更新失敗')
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser
  }

  // 新增客服/業務帳號（支援預設密碼 a123123）
  async createStaffAccount(staffData: {
    name: string
    email: string
    phone: string
    role: 'support' | 'sales'
    password?: string
  }): Promise<User> {
    const lc = staffData.email.trim().toLowerCase()
    const password = staffData.password && staffData.password.trim() ? staffData.password.trim() : 'a123123'

    // 1) 先嘗試註冊 Auth 用戶；若回傳 422（已存在），視為成功繼續
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: lc,
      password,
      options: { emailRedirectTo: undefined }
    })
    if (authError && !String(authError.message || '').toLowerCase().includes('already')) {
      throw new Error(`建立用戶失敗: ${authError.message}`)
    }

    // 2) 在 staff 表建立或更新資料（不使用 select() 以避免 500）
    const { error: staffError } = await supabase
      .from('staff')
      .upsert({
        name: staffData.name,
        email: lc,
        phone: staffData.phone,
        role: staffData.role,
        status: 'active'
      }, { onConflict: 'email' })
    if (staffError) {
      throw new Error(staffError.message || '建立員工資料失敗')
    }

    return {
      id: authData?.user?.id || lc,
      email: lc,
      name: staffData.name,
      role: staffData.role,
      phone: staffData.phone,
      passwordSet: true
    }
  }

  // 取得所有員工列表
  async getStaffList(): Promise<User[]> {
    const { data, error } = await supabase
      .from('staff')
      .select('id,email,name,role,phone,status,updated_at')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message || '取得員工列表失敗')
    }

    return (data || []).map((staff: any) => ({
      id: staff.id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
      phone: staff.phone,
      passwordSet: true
    }))
  }

  // 更新員工資料
  async updateStaff(staffId: string, updates: Partial<{
    name: string
    phone: string
    role: 'support' | 'sales'
    status: 'active' | 'inactive'
    password?: string
  }>): Promise<void> {
    // 如果有密碼更新，記錄但不執行（需要管理員權限）
    if (updates.password) {
      console.warn('密碼更新需要管理員權限，請在 Supabase Dashboard 中手動更新')
    }

    const { password, ...staffUpdates } = updates
    const { error } = await supabase
      .from('staff')
      .update({
        ...staffUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', staffId)

    if (error) {
      throw new Error(error.message || '更新員工資料失敗')
    }
  }

  // 刪除員工帳號
  async deleteStaff(staffId: string): Promise<void> {
    const { error: staffError } = await supabase
      .from('staff')
      .delete()
      .eq('id', staffId)

    if (staffError) {
      throw new Error(staffError.message || '刪除員工資料失敗')
    }

    console.warn('員工資料已刪除，如需移除 Auth 用戶請於 Supabase Dashboard 操作')
  }
}

export const authRepo = new SupabaseAuthRepo()
