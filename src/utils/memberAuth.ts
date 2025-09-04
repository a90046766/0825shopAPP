// 會員權限檢查工具
export interface MemberUser {
  id: string
  name: string
  email: string
  code: string
  role: 'member'
  type: 'member'
}

// 檢查是否為會員
export const isMember = (): boolean => {
  try {
    const memberUser = localStorage.getItem('member-auth-user')
    return !!memberUser
  } catch {
    return false
  }
}

// 獲取會員資訊
export const getMemberUser = (): MemberUser | null => {
  try {
    const memberUser = localStorage.getItem('member-auth-user')
    return memberUser ? JSON.parse(memberUser) : null
  } catch {
    return null
  }
}

// 檢查會員登入狀態
export const checkMemberAuth = (): MemberUser | null => {
  const member = getMemberUser()
  if (!member) {
    // 清除可能存在的其他用戶資訊
    localStorage.removeItem('supabase-auth-user')
    localStorage.removeItem('local-auth-user')
    return null
  }
  return member
}

// 會員登出
export const memberLogout = (): void => {
  localStorage.removeItem('member-auth-user')
  // 可以添加其他清理邏輯
}

// 會員權限檢查（購物相關）
export const canShop = (): boolean => {
  const member = getMemberUser()
  return !!member && member.status === 'active'
}

// 會員權限檢查（結帳）
export const canCheckout = (): boolean => {
  const member = getMemberUser()
  return !!member && member.status === 'active'
}
