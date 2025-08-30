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
    let { data, error } = await supabase.auth.signInWithPassword({ email: lc, password })

    // 若密碼登入失敗，嘗試以相同密碼自動建立帳號（適用於尚未在 Auth 建立用戶的情境）
    if (error) {
      try {
        const { data: signupData, error: signupError } = await supabase.auth.signUp({ email: lc, password, options: { emailRedirectTo: undefined } })
        if (signupError) {
          // 已存在但密碼錯誤 → 明確提示
          throw new Error(signupError.message?.includes('already registered')
            ? '帳號已存在，但密碼不正確。請至 Supabase Auth 設定密碼或使用忘記密碼'
            : (signupError.message || '登入失敗'))
        }
        data = signupData as any
      } catch (e: any) {
        throw new Error(e?.message || '登入失敗')
      }
    }

    if (!data.user) {
      throw new Error('登入失敗：無法取得使用者資料')
    }

    // 從 staff 表取得詳細資料
    const { data: staffData } = await supabase
      .from('staff')
      .select('id,email,name,role,phone,status')
      .eq('email', lc)
      .maybeSingle()

    // 主帳號後備名單（永遠優先）
    const PRIMARY: Record<string, { name: string; role: 'admin' | 'support' | 'technician' }> = {
      'a90046766@gmail.com': { name: '洗濯', role: 'admin' },
      'xiaofu888@yahoo.com.tw': { name: '洗小濯', role: 'support' },
      'jason660628@yahoo.com.tw': { name: '楊小飛', role: 'technician' },
    }

    if (!staffData && !PRIMARY[lc]) {
      throw new Error('找不到對應的員工資料')
    }

    // 以主帳號資訊為最優先（避免被錯誤 staff 資料覆蓋）
    const displayName = PRIMARY[lc]?.name ?? staffData?.name ?? data.user.email ?? ''
    const role = (PRIMARY[lc]?.role ?? (staffData?.role as any) ?? 'support') as User['role']

    this.currentUser = {
      id: data.user.id,
      email: data.user.email!,
      name: displayName,
      role,
      phone: (staffData as any)?.phone,
      passwordSet: true
    }

    // 若為主帳號且 staff 中尚無資料，或需要校正角色，嘗試自動補齊/校正一筆 staff 記錄
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
    } else if (!staffData) {
      // 非主帳號但缺 staff → 最少補上基本資料（support）
      try {
        await supabase
          .from('staff')
          .upsert({
            id: data.user.id,
            name: data.user.email || '',
            email: lc,
            phone: '',
            role: 'support',
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
    role: 'support' | 'sales' // 只允許客服和業務
    password?: string // 設為可選，預設使用 a123123
  }): Promise<User> {
    const password = staffData.password && staffData.password.trim()
      ? staffData.password.trim()
      : 'a123123' // 預設密碼，依你習慣
    
    // 1. 在 Supabase Auth 中建立用戶
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: staffData.email.trim().toLowerCase(),
      password: password,
      options: { emailRedirectTo: undefined }
    })

    if (authError) {
      console.error('Auth signup error:', authError)
      throw new Error(`建立用戶失敗: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('無法建立用戶')
    }

    // 2. 在 staff 表中新增員工資料
    const { data: staffInsertData, error: staffError } = await supabase
      .from('staff')
      .insert({
        id: authData.user.id,
        name: staffData.name,
        email: staffData.email.trim().toLowerCase(),
        phone: staffData.phone,
        role: staffData.role,
        status: 'active'
      })
      .select()
      .single()

    if (staffError) {
      // 如果 staff 表插入失敗，記錄錯誤但不刪除 auth 用戶（需要管理員權限）
      console.error('Staff table insert failed:', staffError)
      throw new Error(staffError.message || '建立員工資料失敗')
    }

    return {
      id: authData.user.id,
      email: staffData.email.trim().toLowerCase(),
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
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message || '取得員工列表失敗')
    }

    return data.map(staff => ({
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
    role: 'support' | 'sales' // 只允許客服和業務
    status: 'active' | 'inactive'
    password?: string // 新增密碼更新支援
  }>): Promise<void> {
    // 如果有密碼更新，記錄但不執行（需要管理員權限）
    if (updates.password) {
      console.warn('密碼更新需要管理員權限，請在 Supabase Dashboard 中手動更新')
      // 注意：密碼更新需要 service role key，這裡暫時跳過
    }

    // 更新 staff 表資料（排除密碼欄位）
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
    // 1. 從 staff 表刪除
    const { error: staffError } = await supabase
      .from('staff')
      .delete()
      .eq('id', staffId)

    if (staffError) {
      throw new Error(staffError.message || '刪除員工資料失敗')
    }

    // 2. 記錄需要手動刪除 auth 用戶
    console.warn('員工資料已刪除，請在 Supabase Dashboard 中手動刪除對應的 Auth 用戶')
  }
}

export const authRepo = new SupabaseAuthRepo()
