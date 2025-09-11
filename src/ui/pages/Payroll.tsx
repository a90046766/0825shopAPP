import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Button, Card, Badge, Modal, Select, Input, Textarea } from '../kit'
import { loadAdapters } from '../../adapters'
import { can } from '../../utils/permissions'
import { PayrollRecord, User } from '../../core/repository'
import { computeMonthlyPayroll } from '../../services/payroll'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../utils/supabase'

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
  // 技師專用狀態：訂單與分潤
  const [techOrders, setTechOrders] = useState<any[]>([])
  const [techOrdersLoading, setTechOrdersLoading] = useState<boolean>(false)
  const [techSelections, setTechSelections] = useState<Record<string, boolean>>({})
  const [shareScheme, setShareScheme] = useState<'pure' | 'base'>('pure')
  const [shareRate, setShareRate] = useState<number>(30) // 30%
  const [baseGuarantee, setBaseGuarantee] = useState<number>(40000)

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

  // 當切換到某位技師的編輯，載入該月訂單
  useEffect(() => {
    const loadTech = async () => {
      try {
        if (!orderRepo || !editingRecord) return
        const staff = staffList.find(s => s.email === editingRecord.userEmail)
        if (!staff) return
        const role = getRoleOf(staff)
        if (role !== 'technician') return
        setTechOrdersLoading(true)
        const orders = await orderRepo.list()
        const ym = month
        const inMonth = (orders||[]).filter((o: any) => {
          const d = o.workCompletedAt || o.createdAt
          return (d || '').slice(0,7) === ym
        })
        const emailLc = String(staff.email||'').toLowerCase()
        const idStr = String(staff.id||'')
        const mine = inMonth.filter((o: any) => {
          const at = Array.isArray(o.assignedTechnicians) ? o.assignedTechnicians : []
          // 支援 email 或 id 兩種型態
          return at.some((t: any) => String(t||'').toLowerCase() === emailLc || String(t||'') === idStr)
        })
        setTechOrders(mine)
        // 預設勾選「已結案/已完成」的訂單
        const sel: Record<string, boolean> = {}
        for (const o of mine) { sel[o.id] = (o.status==='completed' || o.status==='done' || !!o.workCompletedAt) }
        setTechSelections(sel)
        // 初始化方案/比例（若記錄上已有，沿用）
        setShareScheme(((editingRecord as any).shareScheme as any) || 'pure')
        setShareRate(((editingRecord as any).shareRate as any) || 30)
        setBaseGuarantee(((editingRecord as any).baseGuarantee as any) || 40000)
      } catch {
      } finally {
        setTechOrdersLoading(false)
      }
    }
    loadTech()
  }, [editingRecord, orderRepo, staffList, month])

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
    const headers = ['姓名','員編','Email','月份','底薪','獎金','積分','模式','油資','加班','節金','職務','請假','遲到','客訴','維修','平台','方案','比例','保底','分潤','狀態','淨發']
    const rows = filteredRecords.map(r => {
      const calc = calculateSalary(r as PayrollRecord)
      return [
        r.userName, r.employeeId, r.userEmail, r.month,
        r.baseSalary||0, r.bonus||0, r.points||0, r.pointsMode||'accumulate',
        r.allowances?.fuel||0, r.allowances?.overtime||0, r.allowances?.holiday||0, r.allowances?.duty||0,
        r.deductions?.leave||0, r.deductions?.tardiness||0, r.deductions?.complaints||0, r.deductions?.repairCost||0,
        r.platform||'同', (r as any).shareScheme||'', (r as any).shareRate||'', (r as any).baseGuarantee||'', (r as any).techCommission||0,
        r.status||'pending', calc.net
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
    const techCommission = (record as any).techCommission || 0
    return { base, totalAllowances, totalDeductions, bonus, pointsValue, techCommission, net: base + totalAllowances - totalDeductions + bonus + pointsValue + techCommission }
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
    // 技師：使用選單 + 訂單來計算分潤
    if (role === 'technician') {
      const rate = Math.max(0, Math.min(100, shareRate)) / 100
      let commission = 0
      for (const o of techOrders) {
        if (techSelections[o.id] === false) continue
        const total = (o.serviceItems||[]).reduce((s:number, it:any)=> s + (it.unitPrice||0)*(it.quantity||0), 0)
        const techCount = Array.isArray(o.assignedTechnicians) && o.assignedTechnicians.length>0 ? o.assignedTechnicians.length : 1
        const basis = total / techCount
        commission += Math.round(basis * rate)
      }
      const finalCommission = shareScheme === 'base' ? Math.max(baseGuarantee, commission) : commission
      setEditingRecord(r => ({ ...(r as PayrollRecord), techCommission: finalCommission, shareScheme, shareRate, baseGuarantee }))
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
      const payload: any = {
        id: (record as any).id,
        month: record.month,
        userEmail: (record as any).userEmail,
        userName: (record as any).userName,
        employeeId: (record as any).employeeId,
        baseSalary: record.baseSalary || 0,
        bonus: record.bonus || 0,
        points: record.points || 0,
        pointsMode: record.pointsMode || 'accumulate',
        platform: record.platform || '同',
        status: record.status || 'pending',
        bonusRate: (record as any).bonusRate || 0,
        techCommission: (record as any).techCommission || 0,
        shareScheme: (record as any).shareScheme || null,
        shareRate: (record as any).shareRate || null,
        baseGuarantee: (record as any).baseGuarantee || null,
        // 攤平欄位（若資料表無 JSON 欄位仍可寫入）
        allowance_fuel: (record as any).allowances?.fuel ?? null,
        allowance_overtime: (record as any).allowances?.overtime ?? null,
        allowance_holiday: (record as any).allowances?.holiday ?? null,
        allowance_duty: (record as any).allowances?.duty ?? null,
        allowance_other: (record as any).allowances?.other ?? null,
        deduction_leave: (record as any).deductions?.leave ?? null,
        deduction_tardiness: (record as any).deductions?.tardiness ?? null,
        deduction_complaints: (record as any).deductions?.complaints ?? null,
        deduction_repairCost: (record as any).deductions?.repairCost ?? null,
        deduction_laborInsurance: (record as any).deductions?.laborInsurance ?? null,
        deduction_healthInsurance: (record as any).deductions?.healthInsurance ?? null,
        deduction_other: (record as any).deductions?.other ?? null,
        notes: (record as any).notes || null
      }
      // 追加 snake_case 欄位以相容資料表命名
      payload.user_email = payload.userEmail ?? (record as any).user_email ?? (record as any).userEmail ?? (user?.email || null)
      payload.user_name = (record as any).user_name ?? payload.userName ?? null
      payload.employee_id = (record as any).employee_id ?? payload.employeeId ?? null
      payload.base_salary = (record as any).base_salary ?? payload.baseSalary ?? null
      payload.points_mode = (record as any).points_mode ?? payload.pointsMode ?? null
      payload.bonus_rate = (record as any).bonus_rate ?? payload.bonusRate ?? null
      payload.tech_commission = (record as any).tech_commission ?? payload.techCommission ?? null
      payload.share_scheme = (record as any).share_scheme ?? payload.shareScheme ?? null
      payload.share_rate = (record as any).share_rate ?? payload.shareRate ?? null
      payload.base_guarantee = (record as any).base_guarantee ?? payload.baseGuarantee ?? null

      Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k] })

      // 直接呼叫 Supabase 並在遇到 PGRST204（欄位不存在）時移除該欄位重試
      const upsertWithFallback = async (body: any) => {
        let attempt = { ...body }
        const tried = new Set<string>()
        for (let i = 0; i < 12; i++) {
          const { error } = await supabase.from('payroll_records').upsert(attempt)
          if (!error) return
          const msg = String(error?.message || '')
          const m = msg.match(/Could not find the '([^']+)' column/i)
          if (m && m[1] && !tried.has(m[1])) {
            delete (attempt as any)[m[1]]
            tried.add(m[1])
            continue
          }
          throw error
        }
      }

      await upsertWithFallback(payload)
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

          {/* 技師：分潤與訂單清單 */}
          {renderTechOrdersPanel()}

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
            <Input type="number" value={editingRecord.deductions?.repairCost || '' as any} onChange={(e)=> setEditingRecord({ ...editingRecord, deductions: { ...editingRecord.deductions, repairCost: Number(e.target.value) } })} placeholder="維修費用（封頂30%）" />
          </div>

          {(() => { const staff = staffList.find(s => s.email === editingRecord.userEmail); const r = staff ? getRoleOf(staff) : 'support'; return r==='support' ? null : (
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
          ) })()}

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

  // 技師訂單明細區塊
  const renderTechOrdersPanel = () => {
    if (!editingRecord) return null
    const staff = staffList.find(s => s.email === editingRecord.userEmail)
    if (!staff || getRoleOf(staff) !== 'technician') return null
    const rate = Math.max(0, Math.min(100, shareRate)) / 100
    let sumBasis = 0
    let sumCommission = 0
    for (const o of techOrders) {
      if (techSelections[o.id] === false) continue
      const totalRaw = Number((o as any).totalAmount ?? (o as any).total ?? 0)
      const sumItems = (o.serviceItems||[]).reduce((s:number, it:any)=> s + (it.unitPrice||0)*(it.quantity||0), 0)
      const total = totalRaw > 0 ? totalRaw : sumItems
      const techCount = Array.isArray(o.assignedTechnicians) && o.assignedTechnicians.length>0 ? o.assignedTechnicians.length : 1
      const basis = total / techCount
      sumBasis += basis
      sumCommission += Math.round(basis * rate)
    }
    const finalCommission = shareScheme === 'base' ? Math.max(baseGuarantee, sumCommission) : sumCommission

    return (
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">技師分潤計算（{month}）</div>
          <div className="text-sm text-gray-600">訂單數：{techOrders.length}</div>
        </div>
        <div className="mb-3 grid gap-3 md:grid-cols-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">分潤方案</div>
            {can(user, 'admin') ? (
              <Select value={shareScheme} onChange={(e)=> setShareScheme((e.target.value as any) || 'pure')}>
                <option value="pure">純分潤</option>
                <option value="base">保底</option>
              </Select>
            ) : (
              <div className="rounded border bg-white px-2 py-1 text-gray-700">{shareScheme==='pure' ? '純分潤' : '保底'}</div>
            )}
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">分潤比例</div>
            {can(user, 'admin') ? (
              <>
                {shareScheme==='pure' && (
                  <div className="flex items-center gap-2">
                    <Select value={String(shareRate)} onChange={(e)=> setShareRate(Number(e.target.value))}>
                      <option value={70}>純7（70%）</option>
                      <option value={72}>純72（72%）</option>
                      <option value={73}>純73（73%）</option>
                      <option value={75}>純75（75%）</option>
                      <option value={80}>純80（80%）</option>
                      <option value={0}>自訂</option>
                    </Select>
                    {Number(shareRate)===0 && (
                      <Input type="number" placeholder="自訂% 如 68" value={shareRate||''} onChange={(e)=> setShareRate(Number(e.target.value)||0)} />
                    )}
                  </div>
                )}
                {shareScheme!=='pure' && (
                  <Select value={String(shareRate)} onChange={(e)=> setShareRate(Number(e.target.value))}>
                    <option value={10}>10%</option>
                    <option value={20}>20%</option>
                    <option value={30}>30%</option>
                  </Select>
                )}
              </>
            ) : (
              <div className="rounded border bg-white px-2 py-1 text-gray-700">{shareScheme==='pure' ? (shareRate? `${shareRate}%` : '自訂%') : `${shareRate}%`}</div>
            )}
          </div>
          {shareScheme==='base' && (
            <div>
              <div className="text-sm text-gray-600 mb-1">保底金額</div>
              {can(user,'admin') ? (
                <Input type="number" value={baseGuarantee} onChange={(e)=> setBaseGuarantee(Number(e.target.value)||0)} />
              ) : (
                <div className="rounded border bg-white px-2 py-1 text-gray-700">${baseGuarantee.toLocaleString()}</div>
              )}
            </div>
          )}
          <div className="text-right self-end">
            <div className="text-xs text-gray-600">本月分潤（試算）</div>
            <div className="text-xl font-bold text-emerald-600">${finalCommission.toLocaleString()}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-600">
                <th className="px-2 py-2 text-left">結案日</th>
                <th className="px-2 py-2 text-left">訂單編號</th>
                <th className="px-2 py-2 text-left">服務數量</th>
                <th className="px-2 py-2 text-right">訂單金額</th>
                <th className="px-2 py-2 text-right">技師數</th>
                <th className="px-2 py-2 text-right">分攤基礎</th>
                <th className="px-2 py-2 text-right">分潤(試算)</th>
                <th className="px-2 py-2 text-center">納入</th>
              </tr>
            </thead>
            <tbody>
              {techOrdersLoading ? (
                <tr><td className="px-2 py-3" colSpan={8}>載入訂單中…</td></tr>
              ) : techOrders.length === 0 ? (
                <tr><td className="px-2 py-3" colSpan={8}>本月未找到相關訂單</td></tr>
              ) : (
                techOrders.map((o:any) => {
                  const totalRaw = Number((o as any).totalAmount ?? (o as any).total ?? 0)
                  const sumItems = (o.serviceItems||[]).reduce((s:number, it:any)=> s + (it.unitPrice||0)*(it.quantity||0), 0)
                  const total = totalRaw > 0 ? totalRaw : sumItems
                  const techCount = Array.isArray(o.assignedTechnicians) && o.assignedTechnicians.length>0 ? o.assignedTechnicians.length : 1
                  const basis = total / techCount
                  const commission = Math.round(basis * rate)
                  const date = String(o.workCompletedAt||o.createdAt||'').slice(0,10)
                  return (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="px-2 py-2">{date}</td>
                      <td className="px-2 py-2">{o.code || o.id}</td>
                      <td className="px-2 py-2">{summarizeServiceUnits(o.serviceItems||[])}</td>
                      <td className="px-2 py-2 text-right">${total.toLocaleString()}</td>
                      <td className="px-2 py-2 text-right">{techCount}</td>
                      <td className="px-2 py-2 text-right">${Math.round(basis).toLocaleString()}</td>
                      <td className="px-2 py-2 text-right">${commission.toLocaleString()}</td>
                      <td className="px-2 py-2 text-center">
                        <input type="checkbox" checked={techSelections[o.id] !== false} onChange={(e)=> setTechSelections(prev=> ({ ...prev, [o.id]: e.target.checked }))} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={()=>{ setTechSelections({}); setShareRate(30); setShareScheme('pure'); setBaseGuarantee(40000) }}>重設</Button>
          <Button variant="outline" onClick={exportTechOrdersCSV}>下載對帳CSV</Button>
          <Button onClick={()=>{ const rate = Math.max(0, Math.min(100, shareRate)) / 100; let commission=0; for(const o of techOrders){ if(techSelections[o.id]===false) continue; const totalRaw=Number((o as any).totalAmount ?? (o as any).total ?? 0); const sumItems=(o.serviceItems||[]).reduce((s:number,it:any)=> s+(it.unitPrice||0)*(it.quantity||0),0); const total= totalRaw>0? totalRaw: sumItems; const techCount=Array.isArray(o.assignedTechnicians)&&o.assignedTechnicians.length>0?o.assignedTechnicians.length:1; const basis= total/techCount; commission += Math.round(basis*rate);} const finalCommission = shareScheme==='base'? Math.max(baseGuarantee, commission): commission; setEditingRecord(r=> ({ ...(r as PayrollRecord), techCommission: finalCommission, shareScheme, shareRate, baseGuarantee })); }}>套用到本筆薪資</Button>
        </div>
      </Card>
    )
  }

  // 服務數量摘要（分/吊/直/吹/抽/出/外/馬）
  const summarizeServiceUnits = (items: any[]): string => {
    const counters: Record<string, number> = { fen: 0, diao: 0, zhi: 0, chui: 0, chou: 0, chu: 0, wai: 0, ma: 0 }
    for (const it of (items || [])) {
      const nameRaw = String(it?.name || it?.title || it?.productName || '').toLowerCase()
      const name = nameRaw.replace(/\s+/g, '')
      const q = Number(it?.quantity || 1)
      if (!q) continue
      if (/車馬|車資|車馬費|transport|travel/.test(name)) { counters.ma += q; continue }
      if (/室外機|outdoor/.test(name)) { counters.wai += q; continue }
      if (/出風口|vent/.test(name)) { counters.chu += q; continue }
      if (/抽油煙|rangehood/.test(name)) { counters.chou += q; continue }
      if (/四方吹|四向|cassette/.test(name)) { counters.chui += q; continue }
      if (/吊隱|concealed|ceiling/.test(name)) { counters.diao += q; continue }
      if (/直立|洗衣|washer|topload/.test(name)) { counters.zhi += q; continue }
      if (/分離|冷氣|split|aircon/.test(name)) { counters.fen += q; continue }
    }
    const labelMap: Record<string, string> = { fen: '分', diao: '吊', zhi: '直', chui: '吹', chou: '抽', chu: '出', wai: '外', ma: '馬' }
    const parts: string[] = []
    for (const k of Object.keys(labelMap)) {
      const n = counters[k]
      if (n && n > 0) parts.push(`${n}${labelMap[k]}`)
    }
    return parts.join(' ')
  }

  const getSchemeLabel = (r: any) => {
    if (r.shareScheme === 'pure') {
      const pct = r.shareRate ? `${r.shareRate}%` : '自訂%'
      return `純分潤（${pct}）`
    }
    if (r.shareScheme === 'base') {
      return `保底 ${r.baseGuarantee||40000} + 超額×${r.shareRate||10}%`
    }
    return ''
  }
  const getPayoutDateDesc = (month: string, platform: string) => {
    const pay = getIssuanceDate(month, platform)
    return `本月薪資發放日：${pay}`
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
                  {viewRole==='technician' && (
                    <div className="mt-2 text-xs text-gray-600">方案：{getSchemeLabel(record)}</div>
                  )}
                  <div className="mt-1 text-xs text-gray-500">{getPayoutDateDesc(record.month, record.platform||'同')}</div>
                  {viewRole==='technician' && (
                    <div className="mt-2 text-xs text-gray-600">分潤：${(calc.techCommission||0).toLocaleString()}</div>
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


