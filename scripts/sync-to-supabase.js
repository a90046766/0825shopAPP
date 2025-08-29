#!/usr/bin/env node

/**
 * 本地數據同步到 Supabase 工具
 * 
 * 使用方法：
 * 1. npm run sync-local-to-supabase  # 同步本地數據到 Supabase
 * 2. npm run sync-supabase-to-local  # 同步 Supabase 數據到本地
 * 3. npm run reset-supabase          # 重置 Supabase 數據庫
 */

const fs = require('fs');
const path = require('path');

// 檢查環境變數
function checkEnvironment() {
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ 缺少必要的環境變數：', missing.join(', '));
    console.log('請確保 .env.local 文件包含：');
    console.log('VITE_SUPABASE_URL=your_supabase_url');
    console.log('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
    process.exit(1);
  }
  
  console.log('✅ 環境變數檢查通過');
}

// 讀取本地數據
function readLocalData() {
  const data = {};
  
  // 讀取 localStorage 數據（如果存在）
  const localStoragePath = path.join(__dirname, '../local-storage-backup.json');
  if (fs.existsSync(localStoragePath)) {
    try {
      const backup = JSON.parse(fs.readFileSync(localStoragePath, 'utf8'));
      Object.assign(data, backup);
      console.log('📦 讀取本地備份數據');
    } catch (error) {
      console.warn('⚠️ 本地備份數據讀取失敗:', error.message);
    }
  }
  
  return data;
}

// 生成 SQL 腳本
function generateSQLScript(data) {
  const sql = [];
  
  // 清空現有數據
  sql.push('-- 清空現有數據');
  sql.push('TRUNCATE TABLE orders, products, technicians, customers, members, notifications, reports CASCADE;');
  sql.push('');
  
  // 插入產品數據
  if (data.products && data.products.length > 0) {
    sql.push('-- 插入產品數據');
    sql.push('INSERT INTO products (id, name, unit_price, group_price, group_min_qty, description, content, region, image_urls, safe_stock, category, mode_code, category_id, default_quantity, sold_count, updated_at) VALUES');
    
    const productValues = data.products.map(p => 
      `('${p.id}', '${p.name}', ${p.unitPrice}, ${p.groupPrice || 'NULL'}, ${p.groupMinQty}, '${p.description || ''}', '${p.content || ''}', '${p.region || ''}', '[]', ${p.safeStock || 'NULL'}, '${p.category || ''}', '${p.modeCode || ''}', '${p.categoryId || ''}', ${p.defaultQuantity || 'NULL'}, ${p.soldCount || 0}, '${p.updatedAt}')`
    );
    
    sql.push(productValues.join(',\n') + ';');
    sql.push('');
  }
  
  // 插入技師數據
  if (data.technicians && data.technicians.length > 0) {
    sql.push('-- 插入技師數據');
    sql.push('INSERT INTO technicians (id, code, name, short_name, email, phone, region, status, points, revenue_share_scheme, skills, updated_at) VALUES');
    
    const techValues = data.technicians.map(t => 
      `('${t.id}', '${t.code}', '${t.name}', '${t.shortName || ''}', '${t.email}', '${t.phone || ''}', '${t.region}', '${t.status}', ${t.points || 0}, '${t.revenueShareScheme || ''}', '{}', '${t.updatedAt}')`
    );
    
    sql.push(techValues.join(',\n') + ';');
    sql.push('');
  }
  
  // 插入客戶數據
  if (data.customers && data.customers.length > 0) {
    sql.push('-- 插入客戶數據');
    sql.push('INSERT INTO customers (id, name, phone, email, addresses, notes, blacklisted, updated_at) VALUES');
    
    const customerValues = data.customers.map(c => 
      `('${c.id}', '${c.name}', '${c.phone}', '${c.email || ''}', '${JSON.stringify(c.addresses || [])}', '${c.notes || ''}', ${c.blacklisted || false}, '${c.updatedAt}')`
    );
    
    sql.push(customerValues.join(',\n') + ';');
    sql.push('');
  }
  
  // 插入訂單數據（需要特殊處理 order_number）
  if (data.orders && data.orders.length > 0) {
    sql.push('-- 插入訂單數據');
    sql.push('INSERT INTO orders (id, order_number, member_id, customer_name, customer_phone, customer_address, preferred_date, preferred_time_start, preferred_time_end, referrer_code, payment_method, payment_status, points_used, points_deduct_amount, service_items, assigned_technicians, signature_technician, status, platform, photos, photos_before, photos_after, signatures, work_started_at, work_completed_at, service_finished_at, canceled_reason, created_at, updated_at) VALUES');
    
    const orderValues = data.orders.map((o, index) => {
      const orderNumber = `OD${String(11362 + index).padStart(5, '0')}`;
      return `('${o.id}', '${orderNumber}', '${o.memberId || ''}', '${o.customerName}', '${o.customerPhone}', '${o.customerAddress}', '${o.preferredDate || ''}', '${o.preferredTimeStart}', '${o.preferredTimeEnd}', '${o.referrerCode || ''}', '${o.paymentMethod || ''}', '${o.paymentStatus || ''}', ${o.pointsUsed || 0}, ${o.pointsDeductAmount || 0}, '${JSON.stringify(o.serviceItems || [])}', '${JSON.stringify(o.assignedTechnicians || [])}', '${o.signatureTechnician || ''}', '${o.status}', '${o.platform}', '${JSON.stringify(o.photos || [])}', '${JSON.stringify(o.photosBefore || [])}', '${JSON.stringify(o.photosAfter || [])}', '${JSON.stringify(o.signatures || {})}', '${o.workStartedAt || ''}', '${o.workCompletedAt || ''}', '${o.serviceFinishedAt || ''}', '${o.canceledReason || ''}', '${o.createdAt}', '${o.updatedAt}')`;
    });
    
    sql.push(orderValues.join(',\n') + ';');
    sql.push('');
  }
  
  return sql.join('\n');
}

// 主函數
async function main() {
  console.log('🚀 開始同步本地數據到 Supabase...');
  
  // 檢查環境
  checkEnvironment();
  
  // 讀取本地數據
  const localData = readLocalData();
  
  if (Object.keys(localData).length === 0) {
    console.log('⚠️ 沒有找到本地數據，請先在本地模式下創建一些數據');
    return;
  }
  
  // 生成 SQL 腳本
  const sqlScript = generateSQLScript(localData);
  
  // 保存 SQL 腳本
  const sqlPath = path.join(__dirname, '../supabase/sync-local-data.sql');
  fs.writeFileSync(sqlPath, sqlScript);
  
  console.log('✅ SQL 腳本已生成：', sqlPath);
  console.log('');
  console.log('📋 下一步操作：');
  console.log('1. 執行 Supabase 重置：');
  console.log('   npx supabase db reset --linked');
  console.log('');
  console.log('2. 執行同步腳本：');
  console.log('   npx supabase db push');
  console.log('');
  console.log('3. 或者手動執行 SQL：');
  console.log('   npx supabase db reset --linked && psql -h your-host -U postgres -d postgres -f supabase/sync-local-data.sql');
}

// 執行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, checkEnvironment, readLocalData, generateSQLScript };
