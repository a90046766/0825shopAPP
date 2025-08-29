# 本地數據同步到 Supabase 指南

這個工具可以幫助您將本地開發的數據快速同步到 Supabase，實現無縫的開發和部署流程。

## 🚀 快速開始

### 1. 本地開發階段
```bash
# 啟動本地開發服務器
npm run dev

# 在瀏覽器中訪問 http://localhost:3000
# 使用本地模式進行開發和測試
```

### 2. 備份本地數據
```bash
# 生成備份腳本
npm run backup-local-data generate

# 在瀏覽器控制台執行備份腳本
# 1. 打開開發者工具 (F12)
# 2. 複製並執行 backup-script.js 中的代碼
# 3. 下載的 JSON 文件會自動保存
# 4. 將文件重命名為 local-storage-backup.json 並放到項目根目錄
```

### 3. 同步到 Supabase
```bash
# 處理備份文件並生成 SQL 腳本
npm run sync-local-to-supabase

# 重置 Supabase 數據庫
npm run reset-supabase

# 部署到 Supabase
npm run deploy-supabase
```

## 📋 詳細步驟

### 步驟 1: 本地開發
1. 確保 `VITE_USE_SUPABASE=0` 在 `.env.local` 中
2. 啟動本地開發服務器：`npm run dev`
3. 在本地模式下創建和測試您的數據
4. 確保所有功能都正常工作

### 步驟 2: 數據備份
1. 運行：`npm run backup-local-data generate`
2. 在瀏覽器中打開您的應用
3. 按 F12 打開開發者工具
4. 複製 `backup-script.js` 中的代碼到控制台並執行
5. 下載的備份文件會自動保存到 Downloads 文件夾
6. 將文件重命名為 `local-storage-backup.json` 並移動到項目根目錄

### 步驟 3: 環境準備
1. 確保 `.env.local` 包含正確的 Supabase 配置：
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_USE_SUPABASE=1
   ```

### 步驟 4: 數據同步
1. 運行：`npm run sync-local-to-supabase`
2. 腳本會生成 `supabase/sync-local-data.sql`
3. 運行：`npm run reset-supabase` 重置數據庫
4. 運行：`npm run deploy-supabase` 部署變更

### 步驟 5: 測試驗證
1. 重新啟動開發服務器：`npm run dev`
2. 確認 `VITE_USE_SUPABASE=1` 已設置
3. 測試所有功能是否正常工作
4. 檢查訂單編號是否為 `OD11362` 格式

## 🔧 腳本說明

### backup-local-data
- `npm run backup-local-data generate` - 生成瀏覽器備份腳本
- `npm run backup-local-data process` - 處理備份文件

### sync-local-to-supabase
- 讀取 `local-storage-backup.json`
- 生成對應的 SQL 插入腳本
- 自動處理訂單編號格式（OD11362+）

### reset-supabase
- 重置 Supabase 數據庫到初始狀態
- 清除所有現有數據

### deploy-supabase
- 將本地變更推送到 Supabase
- 執行所有遷移腳本

## 📊 支援的數據類型

- ✅ 產品 (products)
- ✅ 訂單 (orders) - 自動生成 OD11362+ 編號
- ✅ 技師 (technicians)
- ✅ 客戶 (customers)
- ✅ 會員 (members)
- ✅ 通知 (notifications)
- ✅ 回報 (reports)
- ✅ 庫存 (inventory)
- ✅ 促銷 (promotions)
- ✅ 文件 (documents)
- ✅ 機型 (models)

## ⚠️ 注意事項

1. **數據備份**：同步前請確保已備份重要數據
2. **環境變數**：確保 Supabase 環境變數正確設置
3. **訂單編號**：同步後訂單編號會從 OD11362 開始
4. **UUID 轉換**：本地 ID 會自動轉換為 Supabase UUID
5. **測試驗證**：同步後務必測試所有功能

## 🛠️ 故障排除

### 問題：備份文件讀取失敗
**解決方案**：
1. 確保備份文件格式正確（JSON）
2. 檢查文件路徑是否正確
3. 重新執行備份腳本

### 問題：Supabase 連接失敗
**解決方案**：
1. 檢查環境變數是否正確
2. 確認 Supabase 項目狀態
3. 檢查網絡連接

### 問題：訂單編號格式錯誤
**解決方案**：
1. 確保已執行最新的遷移腳本
2. 檢查 `generate_order_number()` 函數
3. 重新執行數據庫重置

## 📞 支援

如果遇到問題，請檢查：
1. 控制台錯誤信息
2. Supabase 日誌
3. 網絡連接狀態
4. 環境變數配置

---

**提示**：建議在每次重要更新後都進行備份，以確保數據安全。
