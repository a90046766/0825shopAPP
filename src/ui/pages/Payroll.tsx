import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Button, Card, Badge, Modal, Select, Input, Textarea } from '../kit'
import { loadAdapters } from '../../adapters'
import { can } from '../../utils/permissions'
import { PayrollRecord, User } from '../../core/repository'
import { computeMonthlyPayroll } from '../../services/payroll'
import { Link, useParams, useNavigate } from 'react-router-dom'

export default function Payroll() {
  const getCurrentUser = () => { try{ const s=localStorage.getItem('supabase-auth-user'); if(s) return JSON.parse(s) }catch{}; try{ const l=localStorage.getItem('local-auth-user'); if(l) return JSON.parse(l) }catch{}; return null }
  const user = getCurrentUser()
  const navigate = useNavigate()
  const { role: roleParam } = useParams()
  const viewRole: 'support' | 'sales' | 'technician' = (roleParam === 'sales' ? 'sales' : roleParam === 'technician' ? 'technician' : 'support')
  const [payrollRepo, setPayrollRepo] = useState<any>(null)
  const [staffRepo, setStaffRepo] = useState<any>(null)
  const [technicianRepo, setTechnicianRepo] = useState<any>(null)
  const [orderRepo, setOrderRepo] = useState<any>(null)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null)
  const [staffList, setStaffList] = useState<any[]>([])
  const [techMonthlyMap, setTechMonthlyMap] = useState<Record<string, any>>({})
  const [roleFilter, setRoleFilter] = useState<'all' | 'support' | 'sales' | 'technician'>('all')
  const [search, setSearch] = useState('')
  // 批次調整狀態
  const [bulkRole, setBulkRole] = useState<'all' | 'support' | 'sales' | 'technician'>('support')
  const [bulkField, setBulkField] = useState('bonus')
  const [bulkAmount, setBulkAmount] = useState<string>('')

  useEffect(() => {
    if (!user || !can(user, 'payroll.view')) return
    loadAdapters().then(adapters => {
      setPayrollRepo(adapters.payrollRepo)
      setStaffRepo(adapters.staffRepo)
      setTechnicianRepo(adapters.technicianRepo)
      setOrderRepo(adapters.orderRepo)
    })
  }, [user])
  
  useEffect(() => {
    if (payrollRepo && staffRepo && technicianRepo) {
      loadData()
    }
  }, [payrollRepo, staffRepo, technicianRepo, month])

  // 監聽員工更新事件
  useEffect(() => {
    const handleStaffUpdate = () => {
      loadData()
    }
    window.addEventListener('staff-updated', handleStaffUpdate)
    return () => window.removeEventListener('staff-updated', handleStaffUpdate)
  }, [])

  const loadData = async () => {
    if (!payrollRepo || !staffRepo || !technicianRepo) return
    try {
      setLoading(true)
      const [payrollData, staffData, techData] = await Promise.all([
        payrollRepo.list(user),
        staffRepo.list(),
        technicianRepo.list()
      ])
      const monthRecords = payrollData.filter((r: any) => r.month === month)
      setRecords(monthRecords)
      setStaffList([...staffData, ...techData])
      // 技師本月分潤估算（僅用於顯示）
      try {
        const techMonthly = await computeMonthlyPayroll(month)
        const map: Record<string, any> = {}
        for (const row of techMonthly) {
          map[row.technician.name] = row
        }
        setTechMonthlyMap(map)
      } catch {}
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
    } else {
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
      }
    }
  }

  // 取得成員角色（support/sales/technician）
  const getRoleOf = (s: any): 'support' | 'sales' | 'technician' => {
    if (s?.role === 'admin') return 'support' // 管理員與客服同規則
    if (s?.role === 'support' || s?.role === 'sales') return s.role
    // 無 role 欄位者視為技師（具有 region/code）
    return 'technician'
  }

  const recordsWithRole = useMemo(() => {
    const emailToRole: Record<string, 'support'|'sales'|'technician'> = {}
    for (const s of staffList) emailToRole[s.email] = getRoleOf(s)
    return records.map(r => ({ ...r, __role: emailToRole[r.userEmail] || 'technician' as const }))
  }, [records, staffList])

  const filteredRecords = useMemo(() => {
    return recordsWithRole.filter(r => {
      const hitView = r.__role === viewRole || (viewRole === 'support' && r.__role === 'support')
      const hitRole = roleFilter === 'all' || r.__role === roleFilter
      const hitQ = !search || r.userName?.toLowerCase?.().includes(search.toLowerCase()) || r.userEmail?.toLowerCase?.().includes(search.toLowerCase())
      return hitView && hitRole && hitQ
    })
  }, [recordsWithRole, roleFilter, search, viewRole])

  const exportCSV = () => {
    const headers = ['姓名','員編','Email','月份','底薪','獎金','積分','模式','油資','加班','節金','職務','請假','遲到','客訴','維修','平台','狀態','淨發']
    const rows = filteredRecords.map(r => {
      const calc = calculateSalary(r as PayrollRecord)
      return [
        r.userName, r.employeeId, r.userEmail, r.month,
        r.baseSalary||0, r.bonus||0, r.points||0, r.pointsMode||'accumulate',
        r.allowances?.fuel||0, r.allowances?.overtime||0, r.allowances?.holiday||0, r.allowances?.duty||0,
        r.deductions?.leave||0, r.deductions?.tardiness||0, r.deductions?.complaints||0, r.deductions?.repairCost||0,
        r.platform||'同', r.status||'pending', calc.net
      ]
    })
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll_${month}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const applyBulk = async () => {
    try {
      const targets = recordsWithRole.filter(r => (bulkRole === 'all' ? true : r.__role === bulkRole))
      const field = bulkField
      const amountNum = Number(bulkAmount || 0)
      const patches = targets.map(r => {
        const patch: any = {}
        if (field.includes('.')) {
          const [grp, key] = field.split('.')
          patch[grp] = { ...(r as any)[grp] || {}, [key]: amountNum }
        } else {
          patch[field] = amountNum
        }
        return { id: (r as any).id, patch }
      })
      await payrollRepo.bulkUpdate(patches)
      setShowBulkEditModal(false)
      setBulkAmount('')
      await loadData()
    } catch (e) {
      console.error('批次更新失敗', e)
    }
  }

  const calculateSalary = (record: PayrollRecord) => {
    const base = record.baseSalary || 0
    const allowances = record.allowances || {}
    const deductions = record.deductions || {}
    const otherAllowance = (allowances as any).other || 0
    const totalAllowances = (allowances.fuel || 0) + (allowances.overtime || 0) + (allowances.holiday || 0) + (allowances.duty || 0) + (otherAllowance || 0)
    const extraDeductions = ((deductions as any).laborInsurance || 0) + ((deductions as any).healthInsurance || 0) + ((deductions as any).other || 0)
    const totalDeductions = (deductions.leave || 0) + (deductions.tardiness || 0) + (deductions.complaints || 0) + (deductions.repairCost || 0) + extraDeductions
    const bonus = record.bonus || 0
    const pointsValue = record.pointsMode === 'include' ? (record.points || 0) * 100 : 0
    return { base, totalAllowances, totalDeductions, bonus, pointsValue, net: base + totalAllowances - totalDeductions + bonus + pointsValue }
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

  // 自動計算（依職位）
  const autoCalc = async () => {
    if (!editingRecord) return
    const staff = staffList.find(s => s.email === editingRecord.userEmail)
    if (!staff) return
    const role = getRoleOf(staff)
    // 技師：使用技師分潤估算
    if (role === 'technician') {
      const t = techMonthlyMap[staff.name]
      if (t) {
        setEditingRecord(r => ({
          ...(r as PayrollRecord),
          baseSalary: t.baseSalary || 0,
          bonus: t.bonus || 0,
        }))
      }
      return
    }
    // 業務：以 refCode 匹配本月訂單金額 × (bonusRate%)
    if (role === 'sales') {
      try {
        const orders = await orderRepo.list()
        const ym = month
        const inMonth = orders.filter((o: any) => {
          const d = o.workCompletedAt || o.createdAt
          return (d || '').slice(0,7) === ym
        })
        const code: string = (staff.refCode || '').toUpperCase()
        const mine = inMonth.filter((o: any) => (o.referrerCode || '').toUpperCase() === code)
        const revenue = mine.reduce((sum: number, o: any) => sum + (o.serviceItems||[]).reduce((s: number, it: any)=> s + (it.unitPrice||0)*(it.quantity||0), 0), 0)
        const rate = Number((editingRecord.bonusRate || 10)) / 100
        const bonus = Math.round(revenue * rate)
        setEditingRecord(r => ({
          ...(r as PayrollRecord),
          bonus
        }))
      } catch {}
      return
    }
    // 客服/管理員：暫不自動計算
  }

  const saveRecord = async (record: PayrollRecord) => {
    try {
      await payrollRepo.upsert(record)
      await loadData()
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

  // 內嵌編輯（不再使用彈窗）
  const renderInlineEditor = () => {
    if (!editingRecord) return null
    return (
      <Card>
        <div className="text-lg font-semibold mb-3">編輯薪資 - {editingRecord.userName}</div>
        <div className="space-y-4">
          <div className="rounded-lg border bg-amber-50 p-3 text-sm">
            <div className="mb-2 font-semibold text-amber-900">客服薪資（快速表單）</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-amber-900 mb-1">基本薪資</label>
                <Input type="number" value={editingRecord.baseSalary || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, baseSalary: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-xs text-amber-900 mb-1">職務加給</label>
                <Input type="number" value={editingRecord.allowances?.duty || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, allowances: { ...editingRecord.allowances, duty: Number(e.target.value) } })} />
              </div>
              <div>
                <label className="block text-xs text-amber-900 mb-1">加班費</label>
                <Input type="number" value={editingRecord.allowances?.overtime || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, allowances: { ...editingRecord.allowances, overtime: Number(e.target.value) } })} />
              </div>
              <div>
                <label className="block text-xs text-amber-900 mb-1">節金</label>
                <Input type="number" value={editingRecord.allowances?.holiday || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, allowances: { ...editingRecord.allowances, holiday: Number(e.target.value) } })} />
              </div>
              <div>
                <label className="block text-xs text-amber-900 mb-1">其他補貼</label>
                <Input type="number" value={(editingRecord.allowances as any)?.other || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, allowances: { ...editingRecord.allowances, other: Number(e.target.value) } })} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-amber-900 mb-1">備註</label>
                <Textarea value={(editingRecord as any).notes || ''} onChange={(e)=> setEditingRecord({ ...(editingRecord as any), notes: e.target.value })} rows={2} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-red-600 font-semibold mb-1">應扣款項</div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="勞保" type="number" value={(editingRecord.deductions as any)?.laborInsurance || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, deductions: { ...editingRecord.deductions, laborInsurance: Number(e.target.value) } })} />
                  <Input placeholder="健保" type="number" value={(editingRecord.deductions as any)?.healthInsurance || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, deductions: { ...editingRecord.deductions, healthInsurance: Number(e.target.value) } })} />
                  <Input placeholder="眷數" type="number" value={(editingRecord.deductions as any)?.dependents || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, deductions: { ...editingRecord.deductions, dependents: Number(e.target.value) } })} />
                  <Input placeholder="其他" type="number" value={(editingRecord.deductions as any)?.other || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, deductions: { ...editingRecord.deductions, other: Number(e.target.value) } })} />
                </div>
              </div>
              <div className="text-right self-end">
                <div className="text-xs text-gray-600">應領金額</div>
                <div className="text-lg font-bold text-emerald-600">${calculateSalary(editingRecord).net.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* 原本細項編輯區（保留） */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">基本薪資</label>
              <Input type="number" value={editingRecord.baseSalary || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, baseSalary: Number(e.target.value)})} placeholder="底薪" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">獎金</label>
              <Input type="number" value={editingRecord.bonus || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, bonus: Number(e.target.value)})} placeholder="獎金" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">積分</label>
              <Input type="number" value={editingRecord.points || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, points: Number(e.target.value)})} placeholder="積分" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">積分模式</label>
              <Select value={editingRecord.pointsMode || 'accumulate'} onChange={(e)=> setEditingRecord({ ...editingRecord, pointsMode: e.target.value as 'accumulate' | 'include' })}>
                <option value="accumulate">累積</option>
                <option value="include">併入薪資</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input type="number" value={editingRecord.allowances?.fuel || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, allowances: { ...editingRecord.allowances, fuel: Number(e.target.value) } })} placeholder="油資補貼" />
            <Input type="number" value={editingRecord.allowances?.overtime || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, allowances: { ...editingRecord.allowances, overtime: Number(e.target.value) } })} placeholder="加班費" />
            <Input type="number" value={editingRecord.allowances?.holiday || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, allowances: { ...editingRecord.allowances, holiday: Number(e.target.value) } })} placeholder="節金" />
            <Input type="number" value={editingRecord.allowances?.duty || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, allowances: { ...editingRecord.allowances, duty: Number(e.target.value) } })} placeholder="職務加給" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input type="number" value={editingRecord.deductions?.leave || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, deductions: { ...editingRecord.deductions, leave: Number(e.target.value) } })} placeholder="休假扣除" />
            <Input type="number" value={editingRecord.deductions?.tardiness || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, deductions: { ...editingRecord.deductions, tardiness: Number(e.target.value) } })} placeholder="遲到扣除" />
            <Input type="number" value={editingRecord.deductions?.complaints || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, deductions: { ...editingRecord.deductions, complaints: Number(e.target.value) } })} placeholder="客訴扣除" />
            <Input type="number" value={editingRecord.deductions?.repairCost || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, deductions: { ...editingRecord.deductions, repairCost: Number(e.target.value) } })} placeholder="維修費用" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">獎金比例</label>
              <Select value={String(editingRecord.bonusRate || 10)} onChange={(e)=> setEditingRecord({ ...editingRecord, bonusRate: Number(e.target.value) as 10 | 20 | 30 })}>
                <option value={10}>10%</option>
                <option value={20}>20%</option>
                <option value={30}>30%</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">平台</label>
              <Select value={editingRecord.platform || '同'} onChange={(e)=> setEditingRecord({ ...editingRecord, platform: e.target.value as '同' | '日' | '黃' | '今' })}>
                <option value="同">同</option>
                <option value="日">日</option>
                <option value="黃">黃</option>
                <option value="今">今</option>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={()=>{ setEditingRecord(null) }}>
              取消編輯
            </Button>
            <Button variant="outline" onClick={autoCalc}>
              自動計算
            </Button>
            <Button onClick={()=> editingRecord && saveRecord(editingRecord)}>
              儲存
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  if (!user || !can(user, 'payroll.view')) {
    return <div className="p-4">權限不足</div>
  }

  if (loading) {
    return <div className="p-4">載入中...</div>
  }

  // 角色頁籤
  const Tab = ({ to, label }: { to: string; label: string }) => (
    <Link to={to} className={`rounded px-3 py-1 text-sm ${location.pathname.endsWith(to) || location.pathname.includes(to) ? 'bg-brand-100 text-brand-700' : 'hover:bg-gray-100 text-gray-700'}`}>{label}</Link>
  )

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">薪資管理</h1>
        <div className="flex items-center space-x-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
          <Select value={roleFilter} onChange={(e)=>setRoleFilter(e.target.value as any)} className="w-36">
            <option value="all">全部</option>
            <option value="support">客服/管理員</option>
            <option value="sales">業務</option>
            <option value="technician">技師</option>
          </Select>
          <Input placeholder="搜尋姓名/Email" value={search} onChange={(e)=>setSearch(e.target.value)} className="w-48" />
          {can(user, 'admin') && (
            <>
              <Button variant="outline" onClick={exportCSV}>匯出 CSV</Button>
              <Button onClick={() => setShowBulkEditModal(true)}>快速編輯</Button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Tab to="/payroll/support" label="客服/管理員" />
        <Tab to="/payroll/sales" label="業務" />
        <Tab to="/payroll/technician" label="技師" />
      </div>

      {/* 單一角色人員選取 */}
      {can(user, 'admin') && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">{viewRole==='support' ? '管理員/客服薪資' : viewRole==='sales' ? '業務薪資' : '技師薪資'}</h2>
          <div className="flex items-center space-x-4">
            <Select value={selectedStaff} onChange={(e)=> handleStaffSelect(e.target.value)} className="w-64">
              <option value="">{viewRole==='support' ? '選擇管理員/客服' : viewRole==='sales' ? '選擇業務' : '選擇技師'}</option>
              {staffList
                .filter(s => getRoleOf(s) === (viewRole==='support' ? 'support' : viewRole))
                .map(staff => (
                  <option key={staff.email} value={staff.email}>{staff.name} ({staff.email})</option>
                ))}
            </Select>
          </div>
        </Card>
      )}

      {/* 內嵌編輯器 */}
      {renderInlineEditor()}

      {/* 記錄列表（依角色頁面顯示） */}
      <div className="space-y-4">
        {filteredRecords.map((record) => {
          const calc = calculateSalary(record)
          const issuanceDate = getIssuanceDate(record.month, record.platform || '同')
          const techCalc = techMonthlyMap[record.userName]
          
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
                  {techCalc && viewRole==='technician' && (
                    <div className="mt-3 rounded border bg-gray-50 p-3 text-xs text-gray-700">
                      <div className="font-medium text-gray-900 mb-1">技師分潤估算（{month}）</div>
                      <div>方案：{techCalc.scheme}</div>
                      <div>本月服務額（平均分攤後）：${techCalc.perTechTotal}</div>
                      <div>保底：{String(techCalc.scheme).startsWith('base') ? '40000' : '無'}</div>
                      <div>估算應發：${techCalc.total}</div>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">${calc.net.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">淨發金額</div>
                  {can(user, 'admin') && (
                    <Button size="sm" onClick={() => { setEditingRecord(record) }} className="mt-2">編輯</Button>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
        {filteredRecords.length === 0 && (
          <div className="text-center text-gray-500 py-8">本月暫無薪資記錄</div>
        )}
      </div>

      {/* 快速編輯模態框（保留） */}
      <Modal isOpen={showBulkEditModal} onClose={() => setShowBulkEditModal(false)} title="快速編輯薪資">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">適用於年終獎金或臨時補貼的批量調整。選擇對象、項目與金額後套用。</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">套用對象</label>
              <Select value={bulkRole} onChange={(e)=>setBulkRole(e.target.value as any)}>
                <option value="all">全部</option>
                <option value="support">客服/管理員</option>
                <option value="sales">業務</option>
                <option value="technician">技師</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">調整項目</label>
              <Select value={bulkField} onChange={(e)=>setBulkField(e.target.value)}>
                <option value="bonus">獎金</option>
                <option value="baseSalary">基本薪資</option>
                <option value="allowances.fuel">油資補貼</option>
                <option value="allowances.holiday">節金</option>
                <option value="allowances.duty">職務加給</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">調整金額</label>
              <Input type="number" value={bulkAmount} onChange={(e)=>setBulkAmount(e.target.value)} placeholder="輸入金額" />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowBulkEditModal(false)}>取消</Button>
            <Button onClick={applyBulk}>套用到所有人</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}


