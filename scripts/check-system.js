#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 系統檢查開始...\n');

// 檢查環境變數檔案
console.log('1. 檢查環境變數檔案...');
const envPath = path.join(path.dirname(__dirname), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasSupabase = envContent.includes('VITE_USE_SUPABASE=1');
  const hasUrl = envContent.includes('VITE_SUPABASE_URL=https://');
  const hasKey = envContent.includes('VITE_SUPABASE_ANON_KEY=eyJ');
  
  console.log('   ✅ .env.local 檔案存在');
  console.log(`   ${hasSupabase ? '✅' : '❌'} VITE_USE_SUPABASE=1`);
  console.log(`   ${hasUrl ? '✅' : '❌'} VITE_SUPABASE_URL 已設定`);
  console.log(`   ${hasKey ? '✅' : '❌'} VITE_SUPABASE_ANON_KEY 已設定`);
} else {
  console.log('   ❌ .env.local 檔案不存在');
  console.log('   💡 請建立 .env.local 檔案並設定 Supabase 環境變數');
}

// 檢查 package.json
console.log('\n2. 檢查 package.json...');
const packagePath = path.join(path.dirname(__dirname), 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log('   ✅ package.json 存在');
  console.log(`   📦 專案名稱: ${packageJson.name}`);
  console.log(`   📦 版本: ${packageJson.version}`);
} else {
  console.log('   ❌ package.json 不存在');
}

// 檢查 node_modules
console.log('\n3. 檢查依賴套件...');
const nodeModulesPath = path.join(path.dirname(__dirname), 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('   ✅ node_modules 存在');
} else {
  console.log('   ❌ node_modules 不存在');
  console.log('   💡 請執行: npm install');
}

// 檢查 Supabase 設定
console.log('\n4. 檢查 Supabase 設定...');
const supabasePath = path.join(path.dirname(__dirname), 'supabase');
if (fs.existsSync(supabasePath)) {
  console.log('   ✅ supabase 目錄存在');
  
  const migrationsPath = path.join(supabasePath, 'migrations');
  if (fs.existsSync(migrationsPath)) {
    const migrations = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.sql'));
    console.log(`   📁 找到 ${migrations.length} 個遷移檔案`);
  }
} else {
  console.log('   ❌ supabase 目錄不存在');
}

// 檢查 src 目錄
console.log('\n5. 檢查原始碼...');
const srcPath = path.join(path.dirname(__dirname), 'src');
if (fs.existsSync(srcPath)) {
  console.log('   ✅ src 目錄存在');
  
  const adaptersPath = path.join(srcPath, 'adapters');
  if (fs.existsSync(adaptersPath)) {
    console.log('   ✅ adapters 目錄存在');
  }
} else {
  console.log('   ❌ src 目錄不存在');
}

console.log('\n🎯 檢查完成！');
console.log('\n📋 下一步：');
console.log('1. 如果看到 ❌ 錯誤，請先解決這些問題');
console.log('2. 執行: npm run dev');
console.log('3. 開啟瀏覽器並檢查 Console 訊息');
console.log('4. 如果還有問題，請提供 Console 錯誤訊息');
