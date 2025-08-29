# 角色權限矩陣（單一真相）

角色：
- admin：系統管理者
- support：客服
- sales：業務
- technician：技師
- member：會員

權限點（僅節錄核心；實作以 can(user, permission) 控制）：
- dashboard.view
- orders.list
- orders.read
- orders.create
- orders.update
- orders.delete
- orders.cancel
- orders.assignTechnician
- orders.finish
- orders.uploadPhotos
- reservations.manage
- customers.manage
- technicians.manage
- technicians.schedule.view
- technicians.schedule.edit
- support.schedule.view
- support.schedule.edit
- staff.manage
- staff.payroll.view
- staff.payroll.edit
- products.manage
- inventory.manage
- promotions.manage
- documents.manage
- models.manage
- notifications.send
- notifications.read

矩陣（Y=允許）：

- admin：全部 Y
- support：
  - Y：dashboard.view, orders.*, reservations.manage, customers.manage, technicians.schedule.view, support.schedule.view, support.schedule.edit, staff.payroll.view(僅自己), products.manage, inventory.manage, promotions.manage, documents.manage, models.manage, notifications.send, notifications.read
  - N：staff.manage（僅 admin）
- sales：
  - Y：dashboard.view, customers.manage, promotions.manage, documents.manage, models.manage, notifications.read
  - N：orders.delete, staff.manage, staff.payroll.edit
- technician：
  - Y：dashboard.view, orders.list, orders.read, orders.update(僅可填寫負數調整與上傳照片), orders.finish, technicians.schedule.view, notifications.read
  - N：orders.create, orders.delete, staff.manage, support.schedule.*
- member：
  - Y：notifications.read
  - N：內部功能

補充規則：
- 客服/技師不可修改過去日期之排班（硬性規則）。
- 刪除動作全站必須二次確認，並記錄操作者與理由。
- 登入後首次強制改密碼；技師不可被行動裝置限制；客服僅在寬度 < 600px 顯示提示，不阻擋。
