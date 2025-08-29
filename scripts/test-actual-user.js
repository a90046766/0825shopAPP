import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dekopbnpsvqlztabblxg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRla29wYm5wc3ZxbHp0YWJibHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzkxMDgsImV4cCI6MjA3MTQ1NTEwOH0.vGeRNxRag5H4UmfuEVcju9Pt5p-i36hwfnOZaCd0x8Q'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testActualUser() {
  console.log('🔍 測試實際用戶登入...')
  
  const email = 'qyome168@gmail.com'
  console.log(`\n測試用戶: ${email}`)
  
  // 檢查該用戶是否在 staff 表中
  const { data: staffUser, error: staffError } = await supabase.from('staff').select('*').eq('email', email).single()
  if (staffError || !staffUser) {
    console.log('❌ 用戶不在 staff 表中:', staffError?.message)
    return
  }
  
  console.log(`✅ 用戶在 staff 表中: ${staffUser.name} (${staffUser.role})`)
  
  // 嘗試不同密碼登入
  const passwords = ['a123123', 'a123123a', '123456', 'password']
  
  for (const password of passwords) {
    console.log(`\n嘗試密碼: ${password}`)
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    })
    
    if (loginError) {
      console.log(`❌ 登入失敗: ${loginError.message}`)
    } else {
      console.log(`✅ 登入成功！`)
      console.log(`   用戶 ID: ${loginData.user.id}`)
      console.log(`   確認狀態: ${loginData.user.email_confirmed_at ? '已確認' : '未確認'}`)
      
      // 登出
      await supabase.auth.signOut()
      return
    }
  }
  
  console.log('\n❌ 所有密碼都無法登入')
  console.log('\n可能的原因:')
  console.log('1. 該用戶在 staff 表中但未在 Auth 中建立')
  console.log('2. 密碼不正確')
  console.log('3. 用戶未確認 email')
}

testActualUser().catch(console.error)
