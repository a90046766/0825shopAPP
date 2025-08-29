import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dekopbnpsvqlztabblxg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRla29wYm5wc3ZxbHp0YWJibHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzkxMDgsImV4cCI6MjA3MTQ1NTEwOH0.vGeRNxRag5H4UmfuEVcju9Pt5p-i36hwfnOZaCd0x8Q'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLogin() {
  console.log('🔍 測試登入問題...')
  
  // 1. 檢查 Auth 用戶
  console.log('\n1. 檢查 Auth 用戶...')
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
  if (authError) {
    console.log('❌ 無法取得 Auth 用戶列表:', authError.message)
  } else {
    console.log('✅ Auth 用戶列表:')
    authUsers.users.forEach(user => {
      console.log(`   - ${user.email} (確認狀態: ${user.email_confirmed_at ? '已確認' : '未確認'})`)
    })
  }
  
  // 2. 檢查 staff 表格
  console.log('\n2. 檢查 staff 表格...')
  const { data: staffUsers, error: staffError } = await supabase
    .from('staff')
    .select('*')
  
  if (staffError) {
    console.log('❌ 無法取得 staff 列表:', staffError.message)
  } else {
    console.log('✅ Staff 用戶列表:')
    staffUsers.forEach(staff => {
      console.log(`   - ${staff.email} (${staff.name}, ${staff.role})`)
    })
  }
  
  // 3. 測試登入（請替換為實際的 email）
  const testEmail = 'test@example.com' // 請替換為您新增的客服 email
  const testPassword = 'a123123'
  
  console.log(`\n3. 測試登入 ${testEmail}...`)
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  })
  
  if (loginError) {
    console.log('❌ 登入失敗:', loginError.message)
  } else {
    console.log('✅ 登入成功:', loginData.user.email)
  }
}

testLogin().catch(console.error)
