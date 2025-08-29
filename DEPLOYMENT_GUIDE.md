# 系統部署指南

## 快速部署步驟

### 1. 環境變數設定
在專案根目錄建立 `.env.local` 檔案：
```env
VITE_USE_SUPABASE=1
VITE_SUPABASE_URL=https://dekopbnpsvqlztabblxg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRla29wYm5wc3ZxbHp0YWJibHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzkxMDgsImV4cCI6MjA3MTQ1NTEwOH0.vGeRNxRag5H4UmfuEVcju9Pt5p-i36hwfnOZaCd0x8Q
```

### 2. 安裝依賴
```bash
npm install
```

### 3. 啟動開發伺服器
```bash
npm run dev
```

### 4. 檢查 Console 訊息
瀏覽器 Console 應該顯示：
```
🌐 嘗試連線 Supabase...
✅ Supabase 連線成功，載入雲端 adapters...
✅ Supabase 模式初始化完成
```

## 常見問題解決

### 問題 1：無法登入
**解決方案**：
1. 檢查 Console 是否有錯誤訊息
2. 確認 Supabase 連線正常
3. 預設客服帳號：
   - 小美：xiaomei@test.com / a123123
   - 小華：xiaohua@test.com / a123123
   - 小強：xiaoqiang@test.com / a123123

### 問題 2：資料無法載入
**解決方案**：
1. 檢查網路連線
2. 確認 Supabase 專案狀態
3. 重新整理頁面

### 問題 3：功能無法使用
**解決方案**：
1. 清除瀏覽器快取
2. 重新啟動開發伺服器
3. 檢查 Console 錯誤訊息

## 生產環境部署

### Netlify 部署
1. 推送到 GitHub
2. Netlify 會自動部署
3. 設定環境變數：
   - VITE_USE_SUPABASE = 1
   - VITE_SUPABASE_URL = https://dekopbnpsvqlztabblxg.supabase.co
   - VITE_SUPABASE_ANON_KEY = [您的金鑰]

## 聯絡支援
如果遇到問題，請提供：
1. 瀏覽器 Console 錯誤訊息
2. 操作步驟
3. 設備資訊（作業系統、瀏覽器版本）
