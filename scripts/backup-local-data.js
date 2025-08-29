#!/usr/bin/env node

/**
 * 本地數據備份工具
 * 
 * 使用方法：
 * 1. 在瀏覽器控制台執行備份
 * 2. 運行 npm run backup-local-data 來處理備份文件
 */

const fs = require('fs');
const path = require('path');

// 生成瀏覽器備份腳本
function generateBackupScript() {
  const script = `
// 在瀏覽器控制台執行此腳本來備份本地數據
(function() {
  const data = {};
  
  // 備份各種數據
  const keys = [
    'local-products-data',
    'local-orders-data', 
    'local-technicians-data',
    'local-customers-data',
    'local-members-data',
    'local-notifications-data',
    'local-reports-data',
    'local-inventory-data',
    'local-promotions-data',
    'local-documents-data',
    'local-models-data'
  ];
  
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        data[key.replace('local-', '').replace('-data', '')] = JSON.parse(value);
      } catch (e) {
        console.warn('解析失敗:', key, e);
      }
    }
  });
  
  // 下載備份文件
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'local-storage-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  
  console.log('✅ 本地數據備份完成！');
  console.log('📦 備份內容:', Object.keys(data));
})();
`;

  const scriptPath = path.join(__dirname, '../backup-script.js');
  fs.writeFileSync(scriptPath, script);
  
  console.log('📝 備份腳本已生成：', scriptPath);
  console.log('');
  console.log('📋 使用步驟：');
  console.log('1. 在瀏覽器中打開您的應用（本地模式）');
  console.log('2. 打開開發者工具（F12）');
  console.log('3. 複製並執行 backup-script.js 中的代碼');
  console.log('4. 下載的 JSON 文件會自動保存到 Downloads 文件夾');
  console.log('5. 將下載的文件重命名為 local-storage-backup.json 並放到項目根目錄');
  console.log('6. 運行 npm run sync-local-to-supabase 來同步到 Supabase');
}

// 處理備份文件
function processBackupFile() {
  const backupPath = path.join(__dirname, '../local-storage-backup.json');
  
  if (!fs.existsSync(backupPath)) {
    console.log('❌ 找不到備份文件：', backupPath);
    console.log('請先執行備份腳本生成備份文件');
    return;
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log('✅ 備份文件讀取成功');
    console.log('📦 包含的數據類型：', Object.keys(data));
    
    // 統計數據量
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        console.log(`  - ${key}: ${value.length} 條記錄`);
      } else {
        console.log(`  - ${key}: 1 個對象`);
      }
    });
    
    console.log('');
    console.log('🚀 現在可以運行同步命令：');
    console.log('npm run sync-local-to-supabase');
    
  } catch (error) {
    console.error('❌ 備份文件處理失敗：', error.message);
  }
}

// 主函數
function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'generate':
      generateBackupScript();
      break;
    case 'process':
      processBackupFile();
      break;
    default:
      console.log('📋 使用方法：');
      console.log('npm run backup-local-data generate  # 生成備份腳本');
      console.log('npm run backup-local-data process   # 處理備份文件');
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateBackupScript, processBackupFile };
