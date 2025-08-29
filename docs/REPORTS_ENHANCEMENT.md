# 報表管理增強功能

## 🎯 功能概述

報表管理系統已經升級，提供更詳細的訂單匯出功能，包含地址管理、數量計算、技師顯示和結案金額統計。

## ✨ 新功能

### 1. 增強匯出報表
- **標準化欄位**：項次、日期、平台、訂單編號、地區、數量、服務技師、結案金額
- **智能地址解析**：自動從地址中提取縣市和區域
- **數量計算**：根據服務項目自動計算總數量
- **技師顯示**：多位技師用「、」分隔顯示
- **結案金額**：根據訂單狀態計算實際金額

### 2. 地址管理系統
- **三層式地址結構**：縣市（下拉式）、區域（下拉式）、詳細地址（自由編輯）
- **智能解析**：從現有地址自動提取縣市和區域
- **地圖連結**：一鍵開啟 Google Maps
- **即時更新**：地址變更時自動更新完整地址

### 3. 數量計算邏輯
- **服務項目統計**：將所有服務項目的數量加總
- **自動計算**：無需手動輸入，系統自動統計
- **即時更新**：服務項目變更時數量自動更新

### 4. 技師顯示格式
- **多人服務**：A、B、C 技師用「、」分隔
- **單人服務**：直接顯示技師姓名
- **無人指派**：顯示空白

## 📋 功能詳解

### 匯出報表欄位說明

| 欄位 | 說明 | 範例 |
|------|------|------|
| 項次 | 序號 | 1, 2, 3... |
| 日期 | 服務日期 | 2024-01-15 |
| 平台 | 訂單來源 | 日、同、黃、今 |
| 訂單編號 | 系統編號 | OD11362 |
| 地區 | 縣市+區域 | 台北市大安區 |
| 數量 | 服務項目總數 | 3 |
| 服務技師 | 指派技師 | 王小明、李小華 |
| 結案金額 | 實際收款金額 | 5000 |

### 地址管理流程

1. **新建訂單時**：
   - 選擇縣市（下拉式選單）
   - 選擇區域（根據縣市動態顯示）
   - 輸入詳細地址（自由編輯）
   - 系統自動組合完整地址

2. **編輯訂單時**：
   - 系統自動解析現有地址
   - 分別顯示縣市、區域、詳細地址
   - 可個別修改各層級地址
   - 自動更新完整地址

3. **地圖連結**：
   - 一鍵開啟 Google Maps
   - 自動定位到指定地址
   - 支援導航功能

### 數量計算說明

```
範例訂單服務項目：
- 冷氣清洗 x 2
- 濾網更換 x 1
- 管路檢查 x 1

總數量計算：2 + 1 + 1 = 4
```

### 技師顯示說明

```
單人服務：王小明
雙人服務：王小明、李小華
三人服務：王小明、李小華、張小美
無人指派：（空白）
```

## 🚀 使用方法

### 匯出報表
1. 進入訂單管理頁面
2. 使用過濾器選擇要匯出的訂單
3. 點擊「匯出報表 Excel」或「匯出報表 CSV」
4. 下載報表檔案

### 地址管理
1. **新建訂單**：
   - 選擇縣市
   - 選擇區域
   - 輸入詳細地址
   - 系統自動組合完整地址

2. **編輯訂單**：
   - 點擊地址欄位
   - 修改縣市、區域或詳細地址
   - 系統自動更新完整地址

3. **地圖連結**：
   - 點擊「地圖」按鈕
   - 在新視窗開啟 Google Maps

## 🔧 技術實現

### 地址解析邏輯
```typescript
// 從地址中提取縣市和區域
function extractLocationFromAddress(address: string) {
  // 遍歷所有縣市
  for (const [city, districts] of Object.entries(TAIWAN_CITIES)) {
    if (address.includes(city)) {
      // 尋找區域
      for (const district of districts) {
        if (address.includes(district)) {
          return { city, district, address: detailAddress }
        }
      }
      return { city, district: '', address: detailAddress }
    }
  }
  return { city: '', district: '', address: cleanAddress }
}
```

### 數量計算邏輯
```typescript
// 計算訂單數量
function calculateOrderQuantity(serviceItems: any[]): string {
  if (!serviceItems || serviceItems.length === 0) return '0'
  
  const totalQuantity = serviceItems.reduce((sum, item) => {
    return sum + (item.quantity || 0)
  }, 0)
  
  return totalQuantity.toString()
}
```

### 技師顯示邏輯
```typescript
// 格式化技師顯示
function formatTechniciansDisplay(assignedTechnicians: string[]): string {
  if (!assignedTechnicians || assignedTechnicians.length === 0) return ''
  
  return assignedTechnicians.join('、')
}
```

### 結案金額計算
```typescript
// 計算結案金額
function calculateFinalAmount(serviceItems: any[], status: string): number {
  if (status === 'canceled') return 0
  
  if (!serviceItems || serviceItems.length === 0) return 0
  
  return serviceItems.reduce((sum, item) => {
    return sum + ((item.unitPrice || 0) * (item.quantity || 0))
  }, 0)
}
```

## 📱 響應式設計

- 桌面端：完整功能展示
- 平板端：適配中等螢幕
- 手機端：簡化界面，重點功能

## 🔒 權限控制

- **查看權限**：所有員工可查看訂單列表
- **匯出權限**：管理員和客服可匯出報表
- **編輯權限**：管理員和客服可編輯訂單地址

## 🚀 部署說明

### 本地開發
```bash
npm run dev
```

### 生產環境更新
```bash
# 生成安全更新 SQL
npm run safe-update:enhance-reports

# 在 Supabase Dashboard 執行生成的 SQL
# 或使用命令行
npx supabase db push --include-all
```

## 📊 報表範例

### Excel 報表示範
```
項次 | 日期       | 平台 | 訂單編號 | 地區         | 數量 | 服務技師           | 結案金額
1    | 2024-01-15 | 日   | OD11362  | 台北市大安區 | 3    | 王小明、李小華     | 5000
2    | 2024-01-16 | 同   | OD11363  | 新北市板橋區 | 2    | 張小美             | 3000
3    | 2024-01-17 | 黃   | OD11364  | 桃園市中壢區 | 1    | （空白）           | 0
```

## 🔮 未來規劃

- [ ] 自定義報表欄位
- [ ] 報表範本管理
- [ ] 自動排程匯出
- [ ] 報表數據分析
- [ ] 圖表視覺化
- [ ] 多格式匯出（PDF、Word）
- [ ] 報表分享功能
- [ ] 歷史報表查詢

## 📞 支援

如有問題，請聯繫開發團隊或查看相關文檔。
