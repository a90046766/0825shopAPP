# IMPLEMENTATION LOG

日期：2025-08-20

本檔記錄本地版（cousor555-local）的重要改動、決策與未完清單，供後續 AI/人員銜接。

## 新增/調整

- Supabase 連線與雙模切換（2025-08-20）
  - 新增 `src/utils/supabase.ts` 建立 client（讀取 `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`）
  - 新增 `src/adapters/index.ts` 工廠：以 `VITE_USE_SUPABASE` 切換 Local/Supabase adapters
  - 新增 `src/adapters/supabase/orders.ts`：最小 `OrderRepo`（list/get/create/update/cancel/confirm/startWork/finishWork）
  - 新增 `src/adapters/local/_exports.ts` 與 `src/adapters/supabase/_exports.ts`
  - 調整 `src/main.tsx` 啟動時動態載入 adapters；路由保護沿用 `authRepo`（暫用 local）
  - 調整 `src/ui/pages/OrderManagement.tsx` 改用工廠載入之 `orderRepo`

- 技師與客服排班
  - 月曆新增 markers、擁擠度強調（warn/danger）與 tooltips（當日工單/請假數）。
  - 工單重疊檢查：依選定時段動態過濾可指派名單；重疊列表標紅提示。
  - 技師休假建立：選技師、日期、時段、假別（顏色規則）；儲存後即時刷新。
  - 技能矩陣：
    - 型別：`Technician.skills?: Record<string, boolean>`。
    - 管理頁可編輯技能；排班頁提供「技能篩選」與「匹配模式（全部/至少一項）」過濾指派名單。
  - Admin 可檢視全部客服排班，其他角色僅看自己。

- 訂單/預約/活動
  - 訂單詳情：開始/完成工作按鈕（含公司承諾提示），簽名全螢幕，取消/刪除草稿改為二次確認。
  - 訂單管理：加入平台篩選、推薦碼一鍵複製、列表 CSV/Excel 匯出。
  - 預約：轉單時套用活動「百分比」到每個明細；新增「取消」操作（二次確認）。
  - 活動：型別加 `coverUrl`，支援封面上傳（≤200KB 壓縮）；規則時間支援純日期字串；UI 新增百分比欄位。

- 技師/員工/會員
  - 技師代碼 SR 不可變；員工代碼 SE、會員代碼 MO 顯示與複製按鈕覆蓋多頁。
  - 審核頁：技師申請核准/婉拒採二次確認；核准時以 email 唯一化（更新或新增）。

- 報表/薪資
  - 分潤報表：搜尋、方案篩選、即時重算；匯出 CSV 與 Excel（.xls）；複製技師編號。
  - 完成訂單報表：CSV 與 Excel 匯出。
  - 積分報表：CSV 與 Excel 匯出（會員/員工/技師）。
  - 薪資頁：客服僅看自己，Admin 看全部；發薪與獎金發放日期顯示。

- 共用
  - 統一刪除/危險操作為「二次確認」：`confirmTwice(message, second)` 已在多頁套用。

## 既有規格遵循

- 採用 Repository Pattern，所有資料讀寫透過本地 adapters；未引用外部專案資料。
- 角色/權限由 `utils/permissions.ts` 管理；頁面路由已加私有權限守衛。
- 影像壓縮：前端壓縮至 ≤200KB。

## 待辦/下一步

- 月曆 tooltip 顯示更完整的當日明細（工單清單、請假名單）。
- 活動規則擴充：滿額、定額折、指定品項。
- 技師派工清單：區域/平台/關鍵字更多篩選與排序。
- 技能矩陣在派工顯示每位技師的技能標籤。
- 全站 SR/SE/MO 顯示一致化與一鍵複製覆蓋所有相關頁面。
- 所有刪除/取消動作檢核「二次確認」是否已全面覆蓋。

# 實作紀錄（持續更新）

本文件用於紀錄需求共識、重要決策與目前落地進度，方便團隊或其他 AI 接手不需重講。

## 需求共識（摘要）
- 以 `docs/` 為主、234 行為為輔，重構 555-local。
- 本機資料使用 localStorage；日後可換 Supabase 透過相同 Repository 介面替換。
- 三位種子帳號密碼需保留。
- 核心模組：訂單新增、預約（連結購物車）、申請審核（技師/會員）、排班/派工、產品管理、客戶管理、庫存管理、技師管理、薪資/獎金管理、回報管理、活動管理、報表管理（包含結案訂單、營收與分潤勾選）。
- 矩陣式權限；管理員可細項開放他職能權限。
- 客服禁止在手機/平板使用；桌面小窗門檻 600px。
- 指派流程：訂單時間確定→指派→自動跳技師排班月曆→顯示該時段可用技師；可多選，並從已指派中指定簽名技師；月曆同步顯示占用。

## 近期重要決策
- 裝置限制：UA/UA-CH/coarse pointer 任一命中即阻擋；桌面視窗寬度 < 600px 亦阻擋（僅客服）。
- Calendar 支援日徽章（占用數）與 onMonthChange，利於負載觀察。

## 目前落地進度
- 型別與 Repo：`src/core/repository/index.ts` 已涵蓋 Users/Orders/Technicians/Products/Inventory/Promotions/Documents/Models/Customers/Reports/Payroll/Reservations/Schedule/Notifications 等。
- 本地 adapters：`src/adapters/local/*`（auth/orders/staff/technicians/products/technicians applications/schedule/notifications/customers/reports/payroll/reservations）。
- UI：
  - 訂單詳情：顯示已指派技師＋簽名技師選擇；可跳至排班。
  - 技師排班：月/週視圖、請假排除、（接口就緒）工單重疊檢查、客服排班（收合、假別/顏色、列表）。
  - 通知：未讀徽章；列表與已讀。
  - 客服裝置限制：已生效。
- Build 狀態：多次驗證均通過。

## 待辦與優先（擬定）
1) 指派完整化：在指派時寫入 work 占用，並於可用性以 overlaps 嚴格檢查（部分完成）。
2) 技師/客服月曆視覺化：顏色塊與占用 tooltip、週/月切換一致。
3) 產品/庫存/活動：安全庫存、購物車同步接口雛形、圖片上傳/壓縮。
4) 報表管理：當月結案、營收、分潤勾選；權限矩陣落地。
5) 刪除二次確認與審核不回彈 pending 的交易性保障。

> 本文件應與代碼一同更新，作為單一事實來源（Single Source of Truth）。
