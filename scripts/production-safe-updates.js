#!/usr/bin/env node

/**
 * 生產環境安全更新工具
 * 
 * 這個工具只執行安全的操作，不會刪除或重置數據
 * 
 * 使用方法：
 * 1. npm run safe-update:add-columns    # 添加新欄位
 * 2. npm run safe-update:update-data    # 更新現有數據
 * 3. npm run safe-update:add-categories # 添加產品分類
 */

const fs = require('fs');
const path = require('path');

// 檢查是否為生產環境
function checkProductionEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production' || 
                      process.env.VITE_USE_SUPABASE === '1';
  
  if (!isProduction) {
    console.log('⚠️ 警告：這看起來不是生產環境');
    console.log('請確認您要在生產環境執行這些操作');
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question('確認繼續？(y/N): ', (answer) => {
        rl.close();
        if (answer.toLowerCase() !== 'y') {
          console.log('操作已取消');
          process.exit(0);
        }
        resolve(true);
      });
    });
  }
  
  return Promise.resolve(true);
}

// 生成安全的 SQL 腳本
function generateSafeSQLScript(operation) {
  const sql = [];
  
  switch (operation) {
    case 'add-columns':
      sql.push('-- 安全添加新欄位（如果不存在）');
      sql.push('ALTER TABLE products ADD COLUMN IF NOT EXISTS content text;');
      sql.push('ALTER TABLE products ADD COLUMN IF NOT EXISTS region text;');
      sql.push('ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number text;');
      sql.push('');
      sql.push('-- 為現有產品設置預設值');
      sql.push("UPDATE products SET content = '專業服務' WHERE content IS NULL;");
      sql.push("UPDATE products SET region = '全台' WHERE region IS NULL;");
      break;
      
    case 'update-data':
      sql.push('-- 安全更新現有數據');
      sql.push('-- 為沒有 order_number 的訂單生成編號');
      sql.push(`
DO $$
DECLARE
  order_record RECORD;
  counter INTEGER := 11362;
BEGIN
  FOR order_record IN 
    SELECT id FROM orders WHERE order_number IS NULL ORDER BY created_at
  LOOP
    UPDATE orders 
    SET order_number = 'OD' || lpad(counter::text, 5, '0')
    WHERE id = order_record.id;
    counter := counter + 1;
  END LOOP;
END $$;
      `);
      break;
      
    case 'add-categories':
      sql.push('-- 安全添加產品分類');
      sql.push(`
INSERT INTO product_categories (id, name, sort_order, active, updated_at)
VALUES 
  (gen_random_uuid(), '專業清洗服務', 1, true, now()),
  (gen_random_uuid(), '家電服務', 2, true, now()),
  (gen_random_uuid(), '二手家電服務', 3, true, now()),
  (gen_random_uuid(), '居家清潔/消毒服務', 4, true, now())
ON CONFLICT (name) DO NOTHING;
      `);
      break;
      
    case 'add-functions':
      sql.push('-- 安全添加或更新函數');
      sql.push(`
-- 自動生成訂單編號的函數
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num int;
  order_num text;
BEGIN
  -- 獲取當前最大編號，如果沒有則從 11362 開始
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 3) AS int)), 11361) + 1
  INTO next_num
  FROM orders
  WHERE order_number ~ '^OD[0-9]+$';
  
  -- 格式化為 OD + 5位數字
  order_num := 'OD' || LPAD(next_num::text, 5, '0');
  
  RETURN order_num;
END $$;

GRANT EXECUTE ON FUNCTION public.generate_order_number() TO anon, authenticated;
      `);
      break;
      
    default:
      throw new Error(`未知的操作類型: ${operation}`);
  }
  
  return sql.join('\n');
}

// 文件管理增強功能
function generateDocumentsEnhancementSQL() {
  return `
-- 文件管理增強功能 - 生產環境安全更新
-- 執行時間: ${new Date().toISOString()}

-- 1. 添加新欄位（如果不存在）
DO $$ 
BEGIN
  -- 添加分類欄位
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'category') THEN
    ALTER TABLE documents ADD COLUMN category text DEFAULT 'forms';
    RAISE NOTICE 'Added category column to documents table';
  ELSE
    RAISE NOTICE 'Category column already exists in documents table';
  END IF;

  -- 添加描述欄位
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'description') THEN
    ALTER TABLE documents ADD COLUMN description text;
    RAISE NOTICE 'Added description column to documents table';
  ELSE
    RAISE NOTICE 'Description column already exists in documents table';
  END IF;

  -- 添加訪問權限欄位
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'access_level') THEN
    ALTER TABLE documents ADD COLUMN access_level text DEFAULT 'all' CHECK (access_level IN ('all', 'admin', 'tech', 'support'));
    RAISE NOTICE 'Added access_level column to documents table';
  ELSE
    RAISE NOTICE 'Access_level column already exists in documents table';
  END IF;
END $$;

-- 2. 創建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_access_level ON documents(access_level);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING gin(tags);

-- 3. 添加示例數據（如果表為空）
INSERT INTO documents (title, url, tags, category, description, access_level)
SELECT * FROM (VALUES
  ('驗收單範本', 'https://drive.google.com/file/d/example1/view', 
   '["驗收單", "範本"]'::jsonb, 'forms', '標準驗收單範本，用於服務完成後的客戶簽收', 'all'),
  ('技術手冊 - 冷氣清洗', 'https://drive.google.com/file/d/example2/view', 
   '["技術手冊", "冷氣", "SOP"]'::jsonb, 'manuals', '冷氣清洗標準作業程序', 'tech'),
  ('員工手冊', 'https://drive.google.com/file/d/example3/view', 
   '["員工手冊", "政策"]'::jsonb, 'policies', '公司員工手冊及相關政策', 'all'),
  ('報價單範本', 'https://drive.google.com/file/d/example4/view', 
   '["報價單", "範本"]'::jsonb, 'templates', '標準報價單範本', 'support'),
  ('安全規範', 'https://drive.google.com/file/d/example5/view', 
   '["安全規範", "SOP"]'::jsonb, 'policies', '工作安全規範及注意事項', 'all'),
  ('品質標準', 'https://drive.google.com/file/d/example6/view', 
   '["品質標準", "SOP"]'::jsonb, 'policies', '服務品質標準及檢查項目', 'tech')
) AS v(title, url, tags, category, description, access_level)
WHERE NOT EXISTS (SELECT 1 FROM documents LIMIT 1);

-- 4. 更新現有記錄的默認值
UPDATE documents 
SET category = COALESCE(category, 'forms'),
    description = COALESCE(description, ''),
    access_level = COALESCE(access_level, 'all')
WHERE category IS NULL OR description IS NULL OR access_level IS NULL;

-- 完成
SELECT 'Documents enhancement completed successfully' as status;
`;
}

// 主函數
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'add-columns') {
    console.log('生成添加欄位的 SQL...');
    console.log(generateSafeSQLScript('add-columns'));
  } else if (command === 'update-data') {
    console.log('生成更新數據的 SQL...');
    console.log(generateSafeSQLScript('update-data'));
  } else if (command === 'add-categories') {
    console.log('生成添加分類的 SQL...');
    console.log(generateSafeSQLScript('add-categories'));
  } else if (command === 'add-functions') {
    console.log('生成添加函數的 SQL...');
    console.log(generateSafeSQLScript('add-functions'));
  } else if (command === 'enhance-documents') {
    console.log('生成文件管理增強功能的 SQL...');
    console.log(generateDocumentsEnhancementSQL());
  } else {
    console.log('使用方法:');
    console.log('  node production-safe-updates.js add-columns');
    console.log('  node production-safe-updates.js update-data');
    console.log('  node production-safe-updates.js add-categories');
    console.log('  node production-safe-updates.js add-functions');
    console.log('  node production-safe-updates.js enhance-documents');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateSafeSQLScript, checkProductionEnvironment };
