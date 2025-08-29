# cousor555-local（本機重構版）

本專案為「派工系統與購物車管理」的本機重構版本，採離線優先（Local-first）與 Repository 模式：
- 先在本機把流程、規則、權限一次做對，再接回雲端（Supabase/Netlify）。
- 前端僅呼叫資料存取介面，之後切換雲端只需更換 Adapter，不影響業務碼。

## 最新更新（2025-01-27）

### 修正內容
- ✅ **指派/簽名/休假功能**：完整修復技師指派流程，簽名技師選擇，休假申請功能
- ✅ **400/404 錯誤修復**：Supabase 連線錯誤處理，環境變數檢查，優雅降級機制
- ✅ **性能優化**：添加節流、快取、防抖功能，優化清單/詳情同步
- ✅ **驗收清單**：完整的功能驗證清單，包含部署檢查項目

### 技術改進
- 改進 Supabase 連線檢查和錯誤處理
- 添加節流、快取、防抖工具函數
- 優化技師指派和簽名流程
- 完善環境變數配置

## 快速開始

### 本地開發
```bash
npm install
npm run dev
```

### 環境變數設定
複製 `env.example` 為 `.env.local` 並設定：
```bash
# 本地模式（預設）
VITE_USE_SUPABASE=0

# Supabase 模式
VITE_USE_SUPABASE=1
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 建置部署
```bash
npm run build
```

## 文件

- docs/SPEC.md：完整需求快照
- docs/PERMISSIONS.md：角色權限矩陣（單一真相）
- docs/DATA_MODEL.md：核心資料模型與三表（staff/technician_applications/member_applications）規格
- docs/API_CONTRACTS.md：Repository 介面契約
- docs/SMOKE_TEST.md：驗收清單
- docs/ROADMAP.md：重構里程碑（M1~M8）

## 狀態

- 當前目標 M1：底座（權限門閘、健康檢查、Repository 介面、本機 Adapter 骨架）

## 環境變數與雙模資料來源（Local / Supabase）

### 本地模式（預設）
- 資料儲存在瀏覽器 localStorage
- 無需外部依賴，適合離線開發
- 資料格式與雲端模式一致

### Supabase 模式
- 設定 `VITE_USE_SUPABASE=1` 啟用
- 需要 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`
- 自動健康檢查，連線失敗時回退本地模式

## 功能特色

### 認證與權限
- 多角色權限管理（admin/support/sales/technician/member）
- 記住帳號功能
- 首次登入強制改密碼

### 訂單管理
- 完整的訂單生命週期
- 技師指派和簽名流程
- 照片上傳和壓縮
- 積分抵扣系統

### 排班系統
- 技師和客服分離排班
- 休假申請和衝突檢查
- 技能篩選和匹配

### 管理功能
- 產品、庫存、活動管理
- 薪資計算和報表
- 通知中心

## 部署

### Netlify
1. 連接 GitHub 倉庫
2. 設定環境變數
3. 建置命令：`npm run build`
4. 發布目錄：`dist`

### Vercel
1. 導入專案
2. 設定環境變數
3. 自動部署

## 故障排除

### 常見問題
1. **Supabase 連線失敗**：檢查環境變數，系統會自動回退到本地模式
2. **指派技師失敗**：確認訂單有設定日期和時間
3. **建置錯誤**：檢查 TypeScript 錯誤和依賴版本

### 日誌查看
- 瀏覽器開發者工具 Console
- 網路請求 Network 標籤
- 應用程式 Application 標籤（本地儲存）