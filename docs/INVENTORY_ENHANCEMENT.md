# 工具設備管理增強功能

## 🎯 功能概述

工具設備管理系統已經升級，從原本的庫存管理改為內部員工購買工具設備的完整系統，包含購買申請、審核流程和通知機制。

## ✨ 新功能

### 1. 工具設備管理
- **分類管理**：工具、設備、耗材、安全用品、辦公用品、其他
- **詳細資訊**：名稱、描述、分類、數量、安全庫存、單價
- **狀態顯示**：有庫存、庫存不足、缺貨
- **視覺化標示**：不同狀態用不同顏色標示

### 2. 員工購買申請
- **申請流程**：員工可申請購買有庫存的工具設備
- **數量輸入**：可指定購買數量
- **自動通知**：申請後自動通知管理員和客服
- **狀態追蹤**：pending、approved、rejected、completed

### 3. 管理員審核系統
- **審核權限**：管理員可審核購買申請
- **備註功能**：可添加審核備註
- **通知回饋**：審核結果自動通知申請者
- **批量處理**：支援批量審核

### 4. 通知機制
- **即時通知**：購買申請即時通知相關人員
- **角色定向**：針對不同角色發送通知
- **狀態更新**：審核結果自動通知申請者
- **群組通知**：可同時通知管理員和客服群組

## 📋 功能詳解

### 工具設備分類
```
- 工具：維修工具、檢測工具等
- 設備：大型設備、機械設備等
- 耗材：消耗性材料、零件等
- 安全用品：安全帽、手套、防護用品等
- 辦公用品：文具、辦公設備等
- 其他：其他類別的工具設備
```

### 狀態顯示
- **有庫存**：綠色標籤，數量充足
- **庫存不足**：黃色標籤，數量低於安全庫存
- **缺貨**：紅色標籤，數量為0

### 購買申請流程
1. **員工申請**：
   - 選擇要購買的工具設備
   - 輸入購買數量
   - 系統自動檢查庫存

2. **管理員審核**：
   - 收到購買申請通知
   - 審核申請內容
   - 添加審核備註
   - 批准或拒絕申請

3. **通知回饋**：
   - 申請者收到審核結果通知
   - 包含審核備註和結果

## 🚀 使用方法

### 查看工具設備
1. 進入工具設備管理頁面
2. 使用搜索功能快速找到需要的工具
3. 查看庫存狀態和詳細資訊
4. 使用狀態過濾器查看特定狀態的工具

### 申請購買
1. 找到要購買的工具設備
2. 點擊「申請購買」按鈕
3. 輸入購買數量
4. 確認申請

### 管理員審核
1. 在通知中心查看購買申請
2. 點擊申請詳情
3. 審核申請內容
4. 添加備註（可選）
5. 批准或拒絕申請

### 新增工具設備
1. 點擊「新增工具設備」按鈕
2. 填寫工具設備資訊：
   - 名稱（必填）
   - 分類（可選）
   - 描述（可選）
   - 數量（必填）
   - 安全庫存（可選）
   - 單價（可選）
3. 點擊「儲存」

## 🔧 技術實現

### 購買申請數據結構
```typescript
interface PurchaseRequest {
  id: string
  itemId: string
  itemName: string
  requestedQuantity: number
  requesterId: string
  requesterName: string
  requesterRole: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  requestDate: string
  approvedBy?: string
  approvedDate?: string
  notes?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
}
```

### 通知機制
```typescript
// 購買申請通知
const notification = {
  title: '工具設備購買申請',
  message: `${requesterName} 申請購買 ${itemName} x${quantity} 件`,
  type: 'purchase_request',
  targetRoles: ['admin', 'support'],
  data: {
    purchaseRequestId: requestId,
    itemId: itemId,
    itemName: itemName,
    quantity: quantity,
  }
}

// 審核結果通知
const notification = {
  title: '購買申請審核結果',
  message: `您的 ${itemName} 購買申請已${approved ? '通過' : '被拒絕'}`,
  type: 'purchase_response',
  targetUserId: requesterId,
  data: {
    purchaseRequestId: requestId,
    approved: approved,
    notes: notes,
  }
}
```

## 📱 響應式設計

- 桌面端：完整功能展示
- 平板端：適配中等螢幕
- 手機端：簡化界面，重點功能

## 🔒 權限控制

- **查看權限**：所有員工可查看工具設備列表
- **申請權限**：有庫存的工具設備可申請購買
- **管理權限**：管理員可新增、編輯、刪除工具設備
- **審核權限**：管理員和客服可審核購買申請

## 🚀 部署說明

### 本地開發
```bash
npm run dev
```

### 生產環境更新
```bash
# 生成安全更新 SQL
npm run safe-update:enhance-inventory

# 在 Supabase Dashboard 執行生成的 SQL
# 或使用命令行
npx supabase db push --include-all
```

## 📊 統計功能

- **總項目數**：所有工具設備數量
- **有庫存**：數量大於0的項目
- **庫存不足**：數量低於安全庫存的項目
- **缺貨**：數量為0的項目

## 🔮 未來規劃

- [ ] 購買申請歷史記錄
- [ ] 批量購買申請
- [ ] 自動補貨提醒
- [ ] 工具設備使用統計
- [ ] 成本分析報表
- [ ] 供應商管理
- [ ] 工具設備維護記錄
- [ ] 庫存預警系統

## 📞 支援

如有問題，請聯繫開發團隊或查看相關文檔。
