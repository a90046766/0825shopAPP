# Supabase 設定指南

## 1. 建立 Supabase 專案

1. 前往 [Supabase](https://supabase.com) 註冊帳號
2. 建立新專案
3. 記下專案 URL 和匿名金鑰

## 2. 執行資料庫遷移

在 Supabase 專案中執行 SQL 遷移：

```sql
-- 複製 supabase/migrations/20250822_000001_init.sql 的內容
-- 在 Supabase SQL Editor 中執行
```

## 3. 設定環境變數

在專案根目錄建立 `.env.local` 檔案：

```bash
# Supabase 設定
VITE_USE_SUPABASE=1
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 4. 檢查 RLS 政策

確保以下表格的 RLS 政策已正確設定：

- products
- orders
- technicians
- staff
- members
- inventory
- promotions
- documents
- models
- notifications

## 5. 測試連線

啟動開發伺服器：

```bash
npm run dev
```

檢查瀏覽器 Console 是否有以下訊息：
- ✅ Supabase 連線成功
- ✅ 產品列表載入成功
- ✅ Supabase 模式初始化完成

## 6. 故障排除

### 常見問題

1. **連線失敗**
   - 檢查環境變數是否正確
   - 確認 Supabase 專案狀態
   - 檢查網路連線

2. **權限錯誤**
   - 確認 RLS 政策已設定
   - 檢查匿名金鑰是否正確

3. **資料表不存在**
   - 執行完整的 SQL 遷移
   - 檢查表格名稱是否正確

4. **自動回退到本地模式**
   - 檢查 Console 錯誤訊息
   - 確認 Supabase 服務狀態

### 錯誤訊息對照

| 錯誤訊息 | 解決方案 |
|---------|---------|
| `Supabase 連線失敗` | 檢查環境變數和網路連線 |
| `訂單列表載入失敗` | 確認 orders 表格存在且 RLS 政策正確 |
| `產品列表載入失敗` | 確認 products 表格存在且 RLS 政策正確 |
| `技師資料初始化失敗` | 確認 technicians 表格存在且 RLS 政策正確 |

## 7. 部署設定

### Netlify
在 Netlify 環境變數中設定：
- `VITE_USE_SUPABASE=1`
- `VITE_SUPABASE_URL=your-url`
- `VITE_SUPABASE_ANON_KEY=your-key`

### Vercel
在 Vercel 環境變數中設定相同的變數。

## 8. 監控與維護

- 定期檢查 Supabase 專案狀態
- 監控 API 使用量
- 備份重要資料
- 更新 RLS 政策
