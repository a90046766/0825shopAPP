import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dekopbnpsvqlztabblxg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRla29wYm5wc3ZxbHp0YWJibHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzkxMDgsImV4cCI6MjA3MTQ1NTEwOH0.vGeRNxRag5H4UmfuEVcju9Pt5p-i36hwfnOZaCd0x8Q'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugLogin() {
  console.log('🔍 詳細登入診斷...')
  
  // 1. 檢查 staff 表
  console.log('\n1. 檢查 staff 表...')
  const { data: staffUsers, error: staffError } = await supabase.from('staff').select('*')
  if (staffError) {
    console.log('❌ staff 表查詢失敗:', staffError.message)
  } else {
    console.log('✅ staff 表查詢成功，共有', staffUsers.length, '個用戶')
    staffUsers.forEach(staff => {
      console.log(`   - ${staff.email} (${staff.name}, ${staff.role}, ID: ${staff.id})`)
    })
  }

  // 2. 嘗試獲取 Auth 用戶列表（需要 service role）
  console.log('\n2. 檢查 Auth 用戶...')
  try {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      console.log('❌ 無法取得 Auth 用戶列表:', authError.message)
      console.log('   這可能是因為缺少 service role 權限')
    } else {
      console.log('✅ Auth 用戶列表:')
      authUsers.users.forEach(user => {
        console.log(`   - ${user.email} (確認狀態: ${user.email_confirmed_at ? '已確認' : '未確認'})`)
      })
    }
  } catch (error) {
    console.log('❌ Auth 用戶查詢異常:', error.message)
  }

  // 3. 測試特定用戶登入
  const testEmails = ['test@example.com', 'xiaomei@example.com', 'xiaohua@example.com']
  
  for (const email of testEmails) {
    console.log(`\n3. 測試登入 ${email}...`)
    
    // 檢查該用戶是否在 staff 表中
    const { data: staffUser } = await supabase.from('staff').select('*').eq('email', email).single()
    if (!staffUser) {
      console.log(`   ❌ ${email} 不在 staff 表中`)
      continue
    }
    
    console.log(`   ✅ ${email} 在 staff 表中 (${staffUser.name}, ${staffUser.role})`)
    
    // 嘗試登入
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: email,
      password: 'a123123a'
    })
    
    if (loginError) {
      console.log(`   ❌ 登入失敗:`, loginError.message)
      
      // 嘗試其他密碼
      const passwords = ['a123123', 'a123123a', '123456']
      for (const pwd of passwords) {
        if (pwd === 'a123123a') continue // 已經試過了
        
        const { error: pwdError } = await supabase.auth.signInWithPassword({
          email: email,
          password: pwd
        })
        
        if (!pwdError) {
          console.log(`   ✅ 密碼 ${pwd} 可以登入！`)
          break
        }
      }
    } else {
      console.log(`   ✅ 登入成功:`, loginData.user.email)
    }
    
    // 登出
    await supabase.auth.signOut()
  }

  // 4. 檢查環境變數
  console.log('\n4. 檢查環境變數...')
  console.log('   VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL || '未設定')
  console.log('   VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '已設定' : '未設定')
  
  // 5. 檢查 Supabase 連線
  console.log('\n5. 檢查 Supabase 連線...')
  const { data: testData, error: testError } = await supabase.from('staff').select('count').limit(1)
  if (testError) {
    console.log('❌ Supabase 連線失敗:', testError.message)
  } else {
    console.log('✅ Supabase 連線正常')
  }
}

debugLogin().catch(console.error)
