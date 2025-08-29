# 生產環境操作指南

## 🚨 重要提醒

**上線後，所有數據都是寶貴的客戶資料，絕對不能丟失！**

## 📋 開發階段 vs 生產環境

### 開發階段（現在）
✅ **可以大動作操作**：
- 修改原始碼
- 重置數據庫：`npm run reset-supabase`
- 重新部署
- 批量刪除數據
- 修改數據結構

### 生產環境（上線後）
❌ **絕對不能做的操作**：
- 重置數據庫（會丟失所有客戶數據）
- 批量刪除數據
- 隨意修改數據結構
- 使用 `TRUNCATE` 或 `DROP TABLE`

✅ **安全的操作**：
- 添加新欄位：`ALTER TABLE ... ADD COLUMN`
- 更新現有數據：`UPDATE ... SET`
- 添加新數據：`INSERT INTO`
- 修改前端代碼
- 添加新函數

## 🛠️ 生產環境安全更新工具

### 1. 添加新欄位
```bash
# 生成安全的 SQL 腳本
npm run safe-update:add-columns

# 在 Supabase Dashboard 中執行生成的 SQL
```

### 2. 更新現有數據
```bash
# 為現有訂單生成編號
npm run safe-update:update-data

# 在 Supabase Dashboard 中執行生成的 SQL
```

### 3. 添加產品分類
```bash
# 添加預設產品分類
npm run safe-update:add-categories

# 在 Supabase Dashboard 中執行生成的 SQL
```

### 4. 添加新函數
```bash
# 添加或更新數據庫函數
npm run safe-update:add-functions

# 在 Supabase Dashboard 中執行生成的 SQL
```

## 🔧 生產環境微調方法

### 方法 1：Supabase Dashboard（推薦）
1. 登入 Supabase Dashboard
2. 進入 SQL Editor
3. 執行安全的 SQL 腳本
4. 即時查看結果

### 方法 2：命令行（謹慎使用）
```bash
# 只推送新的遷移文件
npx supabase db push --include-all

# 不要使用 reset 命令
# ❌ npx supabase db reset --linked
```

### 方法 3：前端代碼更新
```bash
# 更新前端代碼（安全）
npm run build
git push origin main
```

## 📊 安全的 SQL 操作範例

### ✅ 安全的操作
```sql
-- 添加新欄位
ALTER TABLE products ADD COLUMN IF NOT EXISTS content text;

-- 更新現有數據
UPDATE products SET content = '預設內容' WHERE content IS NULL;

-- 添加新數據
INSERT INTO product_categories (name, sort_order) 
VALUES ('新分類', 5) ON CONFLICT (name) DO NOTHING;

-- 添加新函數
CREATE OR REPLACE FUNCTION public.new_function() RETURNS void AS $$
BEGIN
  -- 函數邏輯
END $$ LANGUAGE plpgsql;
```

### ❌ 危險的操作
```sql
-- 絕對不要執行這些操作
DROP TABLE products;           -- 刪除整個表
TRUNCATE TABLE orders;         -- 清空所有數據
DELETE FROM customers;         -- 刪除所有客戶
ALTER TABLE products DROP COLUMN name;  -- 刪除重要欄位
```

## 🚨 緊急情況處理

### 數據備份
```bash
# 定期備份數據
# 在 Supabase Dashboard 中：
# 1. 進入 Settings > Database
# 2. 點擊 "Create backup"
# 3. 下載備份文件
```

### 回滾操作
```sql
-- 如果添加的欄位有問題，可以安全移除
ALTER TABLE products DROP COLUMN IF EXISTS problematic_column;

-- 如果更新的數據有問題，可以恢復
UPDATE products SET content = '原始內容' WHERE id = 'specific_id';
```

## 📞 最佳實踐

### 1. 測試環境
- 所有變更先在測試環境執行
- 確認無誤後再部署到生產環境

### 2. 備份策略
- 每次重要變更前都要備份
- 保留多個版本的備份

### 3. 變更記錄
- 記錄所有生產環境的變更
- 包括變更原因、執行時間、影響範圍

### 4. 監控
- 監控數據庫性能
- 監控應用程式錯誤
- 設置告警機制

## 🔍 常見問題

### Q: 如何添加新功能而不影響現有數據？
A: 使用 `ADD COLUMN IF NOT EXISTS` 和 `ON CONFLICT DO NOTHING`

### Q: 如何更新大量數據？
A: 分批更新，避免鎖表時間過長

### Q: 如何回滾錯誤的變更？
A: 準備回滾腳本，在變更前測試

### Q: 如何確保數據一致性？
A: 使用事務（Transaction）確保原子性操作

---

**記住：生產環境的每一條數據都代表真實的客戶，必須謹慎對待！**

---

# 地址驗證功能

## 🎯 功能概述

新增地址驗證功能，在客戶下單時自動檢查是否為非標準服務區，防止在偏遠地區或山區下單。

## ✨ 主要功能

### 1. 非標準服務區定義
- **台北市**: 烏來區
- **新北市**: 平溪區、雙溪區、貢寮區、金山區、萬里區、烏來區
- **桃園市**: 復興區
- **台中市**: 和平區
- **台南市**: 左鎮區、玉井區、楠西區、南化區、龍崎區
- **高雄市**: 田寮區、阿蓮區、內門區、杉林區、甲仙區、六龜區、茂林區、桃源區、那瑪夏區
- **新竹縣**: 尖石鄉、五峰鄉
- **苗栗縣**: 泰安鄉
- **南投縣**: 信義鄉、仁愛鄉
- **雲林縣**: 古坑鄉
- **嘉義縣**: 阿里山鄉
- **屏東縣**: 三地門鄉、霧台鄉、瑪家鄉、泰武鄉、來義鄉、春日鄉、獅子鄉、牡丹鄉
- **宜蘭縣**: 大同鄉、南澳鄉
- **花蓮縣**: 秀林鄉、萬榮鄉、卓溪鄉
- **台東縣**: 海端鄉、延平鄉、金峰鄉、達仁鄉、蘭嶼鄉
- **澎湖縣**: 望安鄉、七美鄉
- **金門縣**: 烏坵鄉
- **連江縣**: 莒光鄉、東引鄉

### 2. 驗證機制
- **即時驗證**: 在地址選擇時顯示警告提示
- **提交驗證**: 在訂單創建時阻止非標準服務區訂單
- **預約驗證**: 在預約訂單轉換時也進行驗證

### 3. 用戶體驗
- **友善提示**: 顯示「本服務無法服務非標準服務區，請見諒」
- **避免歧視**: 不使用「偏鄉」或「山區」等可能造成歧視的詞彙
- **視覺警告**: 紅色背景的警告框，清楚標示問題

## 🔧 技術實現

### 1. 核心函數
```typescript
// 驗證縣市和區域
validateServiceArea(city: string, district: string)

// 驗證完整地址
validateAddressServiceArea(address: string)
```

### 2. 集成位置
- **訂單管理頁面**: 新建訂單時的地址驗證
- **預約訂單頁面**: 轉換預約為正式訂單時的驗證
- **地址選擇器**: 即時顯示驗證結果

### 3. 數據結構
```typescript
interface ValidationResult {
  isValid: boolean
  message: string
  isNonStandard: boolean
}
```

## 📱 使用方式

### 1. 新建訂單
1. 選擇縣市和區域
2. 系統自動檢查是否為非標準服務區
3. 如果是非標準服務區，顯示紅色警告
4. 嘗試提交時會阻止並顯示提示訊息

### 2. 預約訂單轉換
1. 點擊「確認轉換」按鈕
2. 系統自動驗證預約地址
3. 如果是非標準服務區，顯示錯誤並阻止轉換

## 🚀 部署說明

### 1. 開發環境
- 功能已集成到現有代碼中
- 無需額外的數據庫變更
- 直接部署即可使用

### 2. 生產環境
- 前端代碼更新（安全）
- 無需數據庫遷移
- 不影響現有數據

## 🔍 測試建議

### 1. 功能測試
- 測試非標準服務區地址選擇
- 測試標準服務區地址選擇
- 測試地址驗證提示顯示
- 測試訂單提交阻止機制

### 2. 邊界測試
- 測試空地址處理
- 測試部分地址選擇
- 測試特殊字符處理

### 3. 用戶體驗測試
- 確認提示訊息友善
- 確認視覺效果清晰
- 確認操作流程順暢

## 📝 維護說明

### 1. 更新服務區列表
如需修改非標準服務區列表，請更新 `src/utils/location.ts` 中的 `NON_STANDARD_SERVICE_AREAS` 常數。

### 2. 修改提示訊息
如需修改提示訊息，請更新 `validateServiceArea` 函數中的 `message` 返回值。

### 3. 添加新驗證邏輯
如需添加更複雜的驗證邏輯（如郵遞區號驗證），請擴展 `validateServiceArea` 函數。

---

**注意：此功能旨在提供更好的服務體驗，避免在無法提供服務的地區產生訂單糾紛。**
