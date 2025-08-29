# 日式洗濯購物車系統

現代化的電子商務購物車系統，專為日式洗濯服務設計。

## 🚀 功能特色

### 產品管理
- ✅ 產品分類管理（專業清洗服務、家電服務、二手家電、居家清潔）
- ✅ 產品搜尋和篩選
- ✅ 庫存管理
- ✅ 價格管理（原價/特價）
- ✅ 地區標籤
- ✅ 產品內容編輯

### 購物車功能
- ✅ 加入購物車
- ✅ 數量調整
- ✅ 商品移除
- ✅ 總價計算
- ✅ 庫存檢查
- ✅ 購物車數量顯示

### 訂單管理
- ✅ 從購物車創建訂單
- ✅ 客戶資訊收集
- ✅ 預約時間選擇
- ✅ 訂單狀態追蹤
- ✅ Supabase 資料同步

### 會員系統
- ✅ 會員註冊
- ✅ 會員申請管理
- ✅ 推薦人積分系統

## 🛠 技術棧

- **前端框架**: React 19 + TypeScript
- **建置工具**: Vite
- **樣式**: Tailwind CSS
- **狀態管理**: Zustand
- **路由**: React Router DOM
- **UI 圖示**: Lucide React
- **通知**: React Hot Toast
- **表單**: React Hook Form
- **後端**: Supabase

## 📦 安裝與運行

### 1. 安裝依賴
```bash
npm install
```

### 2. 環境配置
創建 `.env.local` 檔案：
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 啟動開發伺服器
```bash
npm run dev
```

### 4. 建置生產版本
```bash
npm run build
```

## 🗂 專案結構

```
src/
├── store/           # 狀態管理
│   ├── products.ts  # 產品管理
│   ├── cart.ts      # 購物車管理
│   ├── orders.ts    # 訂單管理
│   └── members.ts   # 會員管理
├── pages/           # 頁面組件
│   ├── Products.tsx # 產品展示
│   ├── Cart.tsx     # 購物車
│   └── Register.tsx # 會員註冊
├── lib/             # 工具函數
│   └── supabase.ts  # Supabase 配置
└── App.tsx          # 主應用程式
```

## 🔧 主要功能說明

### 產品展示頁面 (`/services`, `/new-appliances`, `/used-appliances`, `/cleaning`)
- 產品列表展示
- 分類篩選
- 搜尋功能
- 價格排序
- 加入購物車

### 購物車頁面 (`/cart`)
- 購物車商品列表
- 數量調整
- 商品移除
- 結帳表單
- 客戶資訊收集

### 會員註冊 (`/register`)
- 會員資料填寫
- 推薦人系統
- 申請狀態追蹤

## 🔗 與派工系統整合

購物車系統與現有的派工系統完全整合：

1. **資料同步**: 使用相同的 Supabase 資料庫
2. **訂單流程**: 購物車訂單 → 預約訂單 → 正式訂單 → 派工
3. **客戶管理**: 自動創建客戶資料
4. **產品管理**: 共享產品資料庫

## 🎯 使用流程

1. **客戶瀏覽產品** → 選擇服務類別
2. **加入購物車** → 調整數量
3. **填寫客戶資訊** → 選擇預約時間
4. **確認下單** → 生成訂單
5. **客服確認** → 轉為正式訂單
6. **派工安排** → 技師服務

## 🚀 部署

### Netlify 部署
```bash
npm run build
# 將 dist/ 資料夾部署到 Netlify
```

### Vercel 部署
```bash
npm run build
# 將專案推送到 GitHub，Vercel 會自動部署
```

## 📝 開發筆記

- 使用 Zustand 進行狀態管理，支援本地儲存
- 所有資料操作都會同步到 Supabase
- 響應式設計，支援手機和桌面
- 現代化 UI 設計，使用 Tailwind CSS

## 🔮 未來規劃

- [ ] 支付系統整合
- [ ] 會員積分系統
- [ ] 評價系統
- [ ] 推播通知
- [ ] 語音助手整合
- [ ] 多語言支援

