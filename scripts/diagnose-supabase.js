#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const url = 'https://dekopbnpsvqlztabblxg.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRla29wYm5wc3ZxbHp0YWJibHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzkxMDgsImV4cCI6MjA3MTQ1NTEwOH0.vGeRNxRag5H4UmfuEVcju9Pt5p-i36hwfnOZaCd0x8Q';

const supabase = createClient(url, key);

async function diagnoseSupabase() {
  console.log('🔍 Supabase 診斷開始...\n');

  try {
    // 1. 測試基本連線
    console.log('1. 測試基本連線...');
    const { data: testData, error: testError } = await supabase
      .from('products')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.log('   ❌ 基本連線失敗:', testError.message);
      return;
    }
    console.log('   ✅ 基本連線成功');

    // 2. 檢查 products 表格結構
    console.log('\n2. 檢查 products 表格...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (productsError) {
      console.log('   ❌ products 查詢失敗:', productsError.message);
    } else {
      console.log('   ✅ products 查詢成功');
      if (products && products.length > 0) {
        console.log('   📋 欄位:', Object.keys(products[0]));
      }
    }

    // 3. 檢查 staff 表格結構
    console.log('\n3. 檢查 staff 表格...');
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .limit(1);
    
    if (staffError) {
      console.log('   ❌ staff 查詢失敗:', staffError.message);
    } else {
      console.log('   ✅ staff 查詢成功');
      if (staff && staff.length > 0) {
        console.log('   📋 欄位:', Object.keys(staff[0]));
      }
    }

    // 4. 檢查 product_categories 表格
    console.log('\n4. 檢查 product_categories 表格...');
    const { data: categories, error: categoriesError } = await supabase
      .from('product_categories')
      .select('*')
      .limit(1);
    
    if (categoriesError) {
      console.log('   ❌ product_categories 查詢失敗:', categoriesError.message);
    } else {
      console.log('   ✅ product_categories 查詢成功');
      if (categories && categories.length > 0) {
        console.log('   📋 欄位:', Object.keys(categories[0]));
      }
    }

    // 5. 檢查 staff 資料數量
    console.log('\n5. 檢查 staff 資料...');
    const { count: staffCount, error: countError } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log('   ❌ staff 計數失敗:', countError.message);
    } else {
      console.log(`   📊 staff 資料數量: ${staffCount}`);
    }

  } catch (error) {
    console.error('❌ 診斷失敗:', error);
  }

  console.log('\n🎯 診斷完成！');
}

diagnoseSupabase();
