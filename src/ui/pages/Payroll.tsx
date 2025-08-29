import React, { useState, useEffect, useMemo } from 'react'
import { Button, Card, Badge, Modal, Select, Input, Textarea } from '../kit'
import { loadAdapters } from '../../adapters'
import { authRepo } from '../../adapters/local/auth'
import { can } from '../../utils/permissions'
import { PayrollRecord, User } from '../../core/repository'

export default function Payroll() {
  const user = authRepo.getCurrentUser()
  const [payrollRepo, setPayrollRepo] = useState<any>(null)
  const [staffRepo, setStaffRepo] = useState<any>(null)
  const [technicianRepo, setTechnicianRepo] = useState<any>(null)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null)
  const [staffList, setStaffList] = useState<any[]>([])

  useEffect(() => {
    if (!user || !can(user, 'payroll.view')) return
    
    loadAdapters().then(adapters => {
      setPayrollRepo(adapters.payrollRepo)
      setStaffRepo(adapters.staffRepo)
      setTechnicianRepo(adapters.technicianRepo)
    })
  }, [user])
  
  useEffect(() => {
    if (payrollRepo && staffRepo && technicianRepo) {
      loadData()
    }
  }, [payrollRepo, staffRepo, technicianRepo, month])

  const loadData = async () => {
    if (!payrollRepo || !staffRepo || !technicianRepo) return
    
    try {
      setLoading(true)
      const [payrollData, staffData, techData] = await Promise.all([
        payrollRepo.list(user),
        staffRepo.list(),
        technicianRepo.list()
      ])
      
      // 過濾當前月份的記錄
      const monthRecords = payrollData.filter((r: any) => r.month === month)
      setRecords(monthRecords)
      setStaffList([...staffData, ...techData])
    } catch (error) {
      console.error('載入薪資資料失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStaffSelect = (staffEmail: string) => {
    setSelectedStaff(staffEmail)
    const record = records.find(r => r.userEmail === staffEmail)
    if (record) {
      setEditingRecord(record)
      setShowEditModal(true)
    } else {
      // 創建新記錄
      const staff = staffList.find(s => s.email === staffEmail)
      if (staff) {
        const newRecord: Partial<PayrollRecord> = {
          userEmail: staffEmail,
          userName: staff.name,
          employeeId: staff.code || staff.id,
          month,
          baseSalary: 0,
          bonus: 0,
          points: 0,
          pointsMode: 'accumulate',
          allowances: { fuel: 0, overtime: 0, holiday: 0, duty: 0 },
          deductions: { leave: 0, tardiness: 0, complaints: 0, repairCost: 0 },
          bonusRate: 10,
          platform: '同',
          status: 'pending'
        }
        setEditingRecord(newRecord as PayrollRecord)
        setShowEditModal(true)
      }
    }
  }

  const calculateSalary = (record: PayrollRecord) => {
    const base = record.baseSalary || 0
    const allowances = record.allowances || {}
    const deductions = record.deductions || {}
    
    const totalAllowances = (allowances.fuel || 0) + (allowances.overtime || 0) + 
                           (allowances.holiday || 0) + (allowances.duty || 0)
    const totalDeductions = (deductions.leave || 0) + (deductions.tardiness || 0) + 
                           (deductions.complaints || 0) + (deductions.repairCost || 0)
    
    const bonus = record.bonus || 0
    const pointsValue = record.pointsMode === 'include' ? (record.points || 0) * 100 : 0
    
    return {
      base,
      totalAllowances,
      totalDeductions,
      bonus,
      pointsValue,
      net: base + totalAllowances - totalDeductions + bonus + pointsValue
    }
  }

  const getIssuanceDate = (month: string, platform: string) => {
    const date = new Date(month + '-01')
    
    switch (platform) {
      case '同':
      case '日':
        date.setMonth(date.getMonth() + 1)
        date.setDate(10)
        return date.toLocaleDateString('zh-TW')
      case '黃':
        date.setMonth(date.getMonth() + 2)
        date.setDate(1)
        return date.toLocaleDateString('zh-TW')
      case '今':
        date.setMonth(date.getMonth() + 2)
        date.setDate(18)
        return date.toLocaleDateString('zh-TW')
      default:
        return '未設定'
    }
  }

  const saveRecord = async (record: PayrollRecord) => {
    try {
      await payrollRepo.upsert(record)
      setShowEditModal(false)
      setEditingRecord(null)
      loadData()
    } catch (error) {
      console.error('儲存失敗:', error)
    }
  }

  const confirmSave = async () => {
    if (!editingRecord) return
    
    const { confirmTwice } = await import('../kit')
    if (await confirmTwice('確定要儲存薪資資料嗎？', '儲存後將無法撤銷，確定繼續？')) {
      await saveRecord(editingRecord)
    }
  }

  if (!user || !can(user, 'payroll.view')) {
    return <div className="p-4">權限不足</div>
  }

  if (loading) {
    return <div className="p-4">載入中...</div>
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">薪資管理</h1>
        <div className="flex items-center space-x-4">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-40"
          />
          {can(user, 'admin') && (
            <Button onClick={() => setShowBulkEditModal(true)}>
              快速編輯
            </Button>
          )}
        </div>
      </div>

      {/* 客服薪資編輯 */}
      {can(user, 'admin') && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">客服薪資編輯</h2>
          <div className="flex items-center space-x-4">
            <Select
              value={selectedStaff}
              onChange={(e) => handleStaffSelect(e.target.value)}
              className="w-64"
            >
              <option value="">選擇客服人員</option>
              {staffList
                .filter(s => s.role === 'support')
                .map(staff => (
                  <option key={staff.email} value={staff.email}>
                    {staff.name} ({staff.email})
                  </option>
                ))
              }
            </Select>
            <span className="text-sm text-gray-600">
              選擇客服後可查看/編輯其薪資資料
            </span>
          </div>
        </Card>
      )}

      {/* 薪資記錄列表 */}
      <div className="space-y-4">
        {records.map((record) => {
          const calc = calculateSalary(record)
          const issuanceDate = getIssuanceDate(record.month, record.platform || '同')
          
          return (
            <Card key={record.id}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold">{record.userName}</h3>
                    <Badge color="blue">{record.employeeId}</Badge>
                    <Badge color={record.status === 'confirmed' ? 'green' : 'yellow'}>
                      {record.status === 'confirmed' ? '已確認' : '待確認'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">基本薪資</div>
                      <div className="text-gray-600">底薪: ${calc.base}</div>
                      <div className="text-gray-600">獎金: ${calc.bonus}</div>
                      <div className="text-gray-600">積分: {record.points || 0} 點</div>
                      <div className="text-gray-600">積分模式: {record.pointsMode === 'include' ? '併入薪資' : '累積'}</div>
                    </div>
                    
                    <div>
                      <div className="font-medium">補貼與扣除</div>
                      <div className="text-gray-600">補貼: ${calc.totalAllowances}</div>
                      <div className="text-gray-600">扣除: ${calc.totalDeductions}</div>
                      <div className="text-gray-600">平台: {record.platform}</div>
                      <div className="text-gray-600">發放日: {issuanceDate}</div>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    ${calc.net.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">淨發金額</div>
                  {can(user, 'admin') && (
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setEditingRecord(record)
                        setShowEditModal(true)
                      }}
                      className="mt-2"
                    >
                      編輯
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
        
        {records.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            本月暫無薪資記錄
          </div>
        )}
      </div>

      {/* 編輯模態框 */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`編輯薪資 - ${editingRecord?.userName}`}
      >
        {editingRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">基本薪資</label>
                <Input
                  type="number"
                  value={editingRecord.baseSalary || 0}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    baseSalary: Number(e.target.value)
                  })}
                  placeholder="底薪"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">獎金</label>
                <Input
                  type="number"
                  value={editingRecord.bonus || 0}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    bonus: Number(e.target.value)
                  })}
                  placeholder="獎金"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">積分</label>
                <Input
                  type="number"
                  value={editingRecord.points || 0}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    points: Number(e.target.value)
                  })}
                  placeholder="積分"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">積分模式</label>
                <Select
                  value={editingRecord.pointsMode || 'accumulate'}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    pointsMode: e.target.value as 'accumulate' | 'include'
                  })}
                >
                  <option value="accumulate">累積</option>
                  <option value="include">併入薪資</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">補貼項目</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={editingRecord.allowances?.fuel || 0}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    allowances: {
                      ...editingRecord.allowances,
                      fuel: Number(e.target.value)
                    }
                  })}
                  placeholder="油資補貼"
                />
                <Input
                  type="number"
                  value={editingRecord.allowances?.overtime || 0}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    allowances: {
                      ...editingRecord.allowances,
                      overtime: Number(e.target.value)
                    }
                  })}
                  placeholder="加班費"
                />
                <Input
                  type="number"
                  value={editingRecord.allowances?.holiday || 0}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    allowances: {
                      ...editingRecord.allowances,
                      holiday: Number(e.target.value)
                    }
                  })}
                  placeholder="節金"
                />
                <Input
                  type="number"
                  value={editingRecord.allowances?.duty || 0}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    allowances: {
                      ...editingRecord.allowances,
                      duty: Number(e.target.value)
                    }
                  })}
                  placeholder="職務加給"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">扣除項目</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={editingRecord.deductions?.leave || 0}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    deductions: {
                      ...editingRecord.deductions,
                      leave: Number(e.target.value)
                    }
                  })}
                  placeholder="休假扣除"
                />
                <Input
                  type="number"
                  value={editingRecord.deductions?.tardiness || 0}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    deductions: {
                      ...editingRecord.deductions,
                      tardiness: Number(e.target.value)
                    }
                  })}
                  placeholder="遲到扣除"
                />
                <Input
                  type="number"
                  value={editingRecord.deductions?.complaints || 0}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    deductions: {
                      ...editingRecord.deductions,
                      complaints: Number(e.target.value)
                    }
                  })}
                  placeholder="客訴扣除"
                />
                <Input
                  type="number"
                  value={editingRecord.deductions?.repairCost || 0}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    deductions: {
                      ...editingRecord.deductions,
                      repairCost: Number(e.target.value)
                    }
                  })}
                  placeholder="維修費用"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">獎金比例</label>
                                 <Select
                   value={String(editingRecord.bonusRate || 10)}
                   onChange={(e) => setEditingRecord({
                     ...editingRecord,
                     bonusRate: Number(e.target.value) as 10 | 20 | 30
                   })}
                 >
                  <option value={10}>10%</option>
                  <option value={20}>20%</option>
                  <option value={30}>30%</option>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">平台</label>
                <Select
                  value={editingRecord.platform || '同'}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    platform: e.target.value as '同' | '日' | '黃' | '今'
                  })}
                >
                  <option value="同">同</option>
                  <option value="日">日</option>
                  <option value="黃">黃</option>
                  <option value="今">今</option>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                取消
              </Button>
              <Button onClick={confirmSave}>
                確認儲存
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 快速編輯模態框 */}
      <Modal
        isOpen={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        title="快速編輯薪資"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            此功能適用於年終獎金等批量調整。選擇要調整的項目和金額，系統將自動套用到所有客服人員。
          </p>
          
          <div className="grid grid-cols-2 gap-4">
                         <div>
               <label className="block text-sm font-medium mb-1">調整項目</label>
               <Select value="" onChange={() => {}}>
                 <option value="">選擇項目</option>
                 <option value="baseSalary">基本薪資</option>
                 <option value="bonus">獎金</option>
                 <option value="allowances.fuel">油資補貼</option>
                 <option value="allowances.holiday">節金</option>
                 <option value="allowances.duty">職務加給</option>
               </Select>
             </div>
            
                         <div>
               <label className="block text-sm font-medium mb-1">調整金額</label>
               <Input
                 type="number"
                 value=""
                 onChange={() => {}}
                 placeholder="輸入金額"
               />
             </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowBulkEditModal(false)}>
              取消
            </Button>
            <Button>
              套用到所有人
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}


