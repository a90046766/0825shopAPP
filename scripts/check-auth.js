#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const url = 'https://dekopbnpsvqlztabblxg.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRla29wYm5wc3ZxbHp0YWJibHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzkxMDgsImV4cCI6MjA3MTQ1NTEwOH0.vGeRNxRag5H4UmfuEVcju9Pt5p-i36hwfnOZaCd0x8Q';

const supabase = createClient(url, key);

async function checkAuth() {
  console.log('🔍 檢查 Supabase Auth 狀態...\n');

  try {
    // 1. 檢查 staff 表格中的用戶
    console.log('1. 檢查 staff 表格中的用戶...');
    const { data: staffUsers, error: staffError } = await supabase
      .from('staff')
      .select('email, name, role')
      .order('created_at', { ascending: false });
    
    if (staffError) {
      console.log('   ❌ staff 查詢失敗:', staffError.message);
      return;
    }
    
    console.log(`   ✅ 找到 ${staffUsers.length} 個 staff 用戶:`);
    staffUsers.forEach(user => {
      console.log(`      - ${user.email} (${user.name}, ${user.role})`);
    });

    // 2. 嘗試登入測試
    console.log('\n2. 測試登入...');
    const testEmails = ['xiaomei@test.com', 'xiaohua@test.com', 'xiaoqiang@test.com'];
    
    for (const email of testEmails) {
      try {
        console.log(`   測試 ${email}...`);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: 'a123123'
        });
        
        if (error) {
          console.log(`     ❌ ${email} 登入失敗:`, error.message);
        } else {
          console.log(`     ✅ ${email} 登入成功`);
        }
        
        // 登出
        await supabase.auth.signOut();
      } catch (err) {
        console.log(`     ❌ ${email} 登入異常:`, err.message);
      }
    }

    // 3. 檢查是否需要建立 Auth 用戶
    console.log('\n3. 建議解決方案...');
    console.log('   如果登入失敗，需要在 Supabase Auth 中建立用戶帳號');
    console.log('   請執行以下 SQL 來建立 Auth 用戶:');
    console.log('');
    console.log('   -- 建立 Auth 用戶（需要在 Supabase Dashboard 中手動建立）');
    console.log('   -- 或者使用以下 SQL 來建立用戶:');
    console.log('');
    
    staffUsers.forEach(user => {
      console.log(`   -- 為 ${user.email} 建立 Auth 用戶`);
    });

  } catch (error) {
    console.error('❌ 檢查失敗:', error);
  }

  console.log('\n🎯 檢查完成！');
}

checkAuth();
