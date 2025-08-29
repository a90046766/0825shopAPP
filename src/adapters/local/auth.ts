import type { AuthRepo, User } from '../../core/repository'

// 本機種子帳號
const SEED_USERS: Array<{ email: string; password: string; name: string; role: User['role']; phone?: string }> = [
  { email: 'a90046766@gmail.com', password: 'a123123', name: '洗濯', role: 'admin', phone: '0906190101' },
  { email: 'xiaofu888@yahoo.com.tw', password: 'a123123', name: '洗小濯', role: 'support', phone: '0986985725' },
  { email: 'jason660628@yahoo.com.tw', password: 'a123123', name: '楊小飛', role: 'technician', phone: '0913788051' },
  // 新增更多客服帳號
  { email: 'cs1@942clean.com.tw', password: 'a123123', name: '客服小美', role: 'support', phone: '0912345678' },
  { email: 'cs2@942clean.com.tw', password: 'a123123', name: '客服小華', role: 'support', phone: '0923456789' },
  { email: 'cs3@942clean.com.tw', password: 'a123123', name: '客服小強', role: 'support', phone: '0934567890' },
]

class LocalAuthRepo implements AuthRepo {
  private currentUser: User | null = null
  private readonly storageKey = 'local-auth-user'
  private readonly rememberKey = 'local-auth-remember'
  private readonly customUsersKey = 'local-custom-users'

  constructor() {
    // 恢復登入狀態
    try {
      const saved = localStorage.getItem(this.storageKey)
      if (saved) {
        this.currentUser = JSON.parse(saved)
      }
    } catch {}
  }

  // 取得所有用戶（包括自定義用戶）
  private getAllUsers() {
    const customUsers = this.getCustomUsers()
    return [...SEED_USERS, ...customUsers]
  }

  // 取得自定義用戶
  private getCustomUsers() {
    try {
      const saved = localStorage.getItem(this.customUsersKey)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  }

  // 儲存自定義用戶
  private saveCustomUsers(users: any[]) {
    localStorage.setItem(this.customUsersKey, JSON.stringify(users))
  }

  async login(email: string, password: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase()
    const allUsers = this.getAllUsers()
    const user = allUsers.find(u => u.email.toLowerCase() === normalizedEmail && u.password === password)
    
    if (!user) {
      throw new Error('帳號或密碼錯誤')
    }

    this.currentUser = {
      id: `USER-${user.role.toUpperCase()}-${Date.now()}`,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      passwordSet: user.role==='admin' // admin 預設已設；其他視為首次需變更
    }

    // 保存登入狀態
    localStorage.setItem(this.storageKey, JSON.stringify(this.currentUser))
    
    return this.currentUser
  }

  async logout(): Promise<void> {
    this.currentUser = null
    localStorage.removeItem(this.storageKey)
  }

  async resetPassword(newPassword: string): Promise<void> {
    if (!this.currentUser) throw new Error('未登入')
    
    // 本機模式：僅更新 passwordSet 狀態
    this.currentUser.passwordSet = true
    localStorage.setItem(this.storageKey, JSON.stringify(this.currentUser))
  }

  getCurrentUser(): User | null {
    return this.currentUser
  }

  // 記住帳號功能
  rememberEmail(email: string): void {
    localStorage.setItem(this.rememberKey, email)
  }

  getRememberedEmail(): string | null {
    return localStorage.getItem(this.rememberKey)
  }

  forgetEmail(): void {
    localStorage.removeItem(this.rememberKey)
  }

  // 新增客服/業務帳號
  async createStaffAccount(staffData: {
    name: string
    email: string
    phone: string
    role: 'support' | 'sales' // 只允許客服和業務
    password: string
  }): Promise<User> {
    const customUsers = this.getCustomUsers()
    
    // 檢查 email 是否已存在
    const allUsers = this.getAllUsers()
    if (allUsers.some(u => u.email.toLowerCase() === staffData.email.toLowerCase())) {
      throw new Error('此 Email 已被使用')
    }

    // 新增到自定義用戶列表
    const newUser = {
      email: staffData.email,
      password: staffData.password,
      name: staffData.name,
      role: staffData.role,
      phone: staffData.phone
    }

    customUsers.push(newUser)
    this.saveCustomUsers(customUsers)

    return {
      id: `USER-${staffData.role.toUpperCase()}-${Date.now()}`,
      email: staffData.email,
      name: staffData.name,
      role: staffData.role,
      phone: staffData.phone,
      passwordSet: true
    }
  }

  // 取得所有員工列表
  async getStaffList(): Promise<User[]> {
    const allUsers = this.getAllUsers()
    return allUsers.map((user: any) => ({
      id: `USER-${user.role.toUpperCase()}-${user.email}`,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      passwordSet: true
    }))
  }

  // 更新員工資料
  async updateStaff(staffId: string, updates: Partial<{
    name: string
    phone: string
    role: 'support' | 'sales' // 只允許客服和業務
    status: 'active' | 'inactive'
  }>): Promise<void> {
    const customUsers = this.getCustomUsers()
    const userIndex = customUsers.findIndex((u: any) => `USER-${u.role.toUpperCase()}-${u.email}` === staffId)
    
    if (userIndex === -1) {
      throw new Error('找不到要更新的員工')
    }

    // 更新用戶資料
    customUsers[userIndex] = {
      ...customUsers[userIndex],
      name: updates.name || customUsers[userIndex].name,
      phone: updates.phone || customUsers[userIndex].phone,
      role: updates.role || customUsers[userIndex].role
    }

    this.saveCustomUsers(customUsers)
  }

  // 刪除員工帳號
  async deleteStaff(staffId: string): Promise<void> {
    const customUsers = this.getCustomUsers()
    const userIndex = customUsers.findIndex((u: any) => `USER-${u.role.toUpperCase()}-${u.email}` === staffId)
    
    if (userIndex === -1) {
      throw new Error('找不到要刪除的員工')
    }

    customUsers.splice(userIndex, 1)
    this.saveCustomUsers(customUsers)
  }
}

export const authRepo = new LocalAuthRepo()
