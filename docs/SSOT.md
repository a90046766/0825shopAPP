## SSOT（Single Source of Truth）原則與統一 API 對照

本系統採用「單一真相」原則，所有敏感或跨頁面的核心資料，皆以後端（Supabase + Netlify Functions）為唯一來源，前端只讀 API，不寫 localStorage 作為真相來源。

### 會員資料（members）
- 單一真相：`members` 資料表
- 統一 API：`/_api/member/profile`（GET/PUT）
  - GET 參數：`memberId`｜`memberEmail`｜`phone`
  - 回傳：`id, code(MO+4), name, email, phone, city, district, address`

### 積分（member_points / member_points_ledger）
- 單一真相：`member_points.balance` 與 `member_points_ledger`
- 統一 API：
  - 餘額：`/_api/points/balance?memberId|memberEmail`
  - 明細：`/_api/points/ledger?memberId|memberEmail`
  - 下單立即扣點：`/_api/points/use-on-create`（POST）

### 通知（notifications）
- 單一真相：`notifications` + `notifications_read`
- 統一 API：
  - 員工聚合：`/_api/staff-notifications`（GET）
  - 員工已讀：`/_api/staff-notifications/read`、`/_api/staff-notifications/read-all`（POST）
  - 會員聚合：`/_api/member-notifications`（GET）
  - 會員已讀：`/_api/member-notifications/read`、`/_api/member-notifications/read-all`（POST）

### 客戶反饋（member_feedback → orders.signatures.customer_feedback）
- 單一真相：以通知聚合為主檢視，歷史資料寫回 `orders.signatures.customer_feedback`
- 統一 API：`/_api/notifications-feedback-list`（GET）

### 設計原則
- 前端一律以統一 API 讀取／操作；避免直接由前端對 Supabase 表做跨域或 RLS 受限的存取。
- 後端 Functions 使用 Service Role，統一處理 RLS 與關聯補碼（例如由 `member_id` 補 `members.code`）。
- 對使用者可見的識別碼，統一顯示 `members.code`（如 `MO7777`），不顯示 `UUID`。

### 常見頁面接入
- 首頁抬頭、分享推薦、購物站首頁：皆改用 `/_api/member/profile` 顯示 `MO+4` 會員編號。
- 購物車：以 `/_api/member/profile` 預填電話與地址；以 `/_api/points/balance` 顯示可用積分；建立訂單後以 `/_api/points/use-on-create` 扣點。
- 後台訂單：以 `/_api/points/balance` 顯示可用積分；移除服務流程噪音通知，只保留重要事件（新訂單、技師申請、採購申請、反饋）。


