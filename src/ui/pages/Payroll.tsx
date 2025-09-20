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
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed'>('all')
  const [sortBy, setSortBy] = useState<string>('userName')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState<number>(1)
  const pageSize = 20
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({})
  
  // 技師只能看到自己的薪資
  const isTechnician = user?.role === 'technician'
  const isSales = user?.role === 'sales'
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
  // 技師分潤計算方式：新增「結案金額/1.05*0.8」與自訂
  const [techCalcMethod, setTechCalcMethod] = useState<'scheme'|'afterTax80'|'custom'>('scheme')
  const [customCommission, setCustomCommission] = useState<number | ''>('')
  const [customCalcNote, setCustomCalcNote] = useState<string>('')
  const [showHistory, setShowHistory] = useState<boolean>(false)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [editTab, setEditTab] = useState<'base'|'allow'|'deduct'|'tech'|'sales'|'notes'>('base')
  // 績效積分來源（推薦+購物）
  const [perfOrders, setPerfOrders] = useState<any[]>([])
  const [perfSelections, setPerfSelections] = useState<Record<string, boolean>>({})
  const [referralSignupCount, setReferralSignupCount] = useState<number>(0)
  const [referralSignupPoints, setReferralSignupPoints] = useState<number>(0)
  const [referralSignupRows, setReferralSignupRows] = useState<any[]>([])
  const [perfLoading, setPerfLoading] = useState<boolean>(false)
  const [salesType, setSalesType] = useState<'parttime'|'fulltime'>('fulltime')

  // 數值與彙整工具
  const toNumberOrNull = (v: any): number | null => {
    const n = Number(v)
    return isFinite(n) ? n : null
  }
  const sumExtra = (list: any[]): number => Array.isArray(list) ? list.reduce((s, it) => s + (Number(it?.amount) || 0), 0) : 0

  // 技師分潤（重算本月合計，用於保底拆分）
  const computeTechCommissionFromOrders = (orders: any[], ratePercent: number): number => {
    const rate = Math.max(0, Math.min(100, ratePercent)) / 100
    let commission = 0
    for (const o of orders) {
      if (techSelections[o.id] === false) continue
      const totalRaw = Number((o as any).totalAmount ?? (o as any).total ?? 0)
      const sumItems = (o.serviceItems||[]).reduce((s:number, it:any)=> s + (it.unitPrice||0)*(it.quantity||0), 0)
      const total = totalRaw > 0 ? totalRaw : sumItems
      const techCount = Array.isArray(o.assignedTechnicians) && o.assignedTechnicians.length>0 ? o.assignedTechnicians.length : 1
      const basis = total / techCount
      commission += Math.round(basis * rate)
    }
    return commission
  }

  // 薪資發放日期（延用既有 getIssuanceDate）
  const getNextMonthDate = (month: string, day: number) => {
    const d = new Date(month + '-01')
    d.setMonth(d.getMonth() + 1)
    d.setDate(day)
    return d.toLocaleDateString('zh-TW')
  }
  const getBonusPayoutDate = (month: string) => getNextMonthDate(month, 18)
  const getSalaryPayoutDate = (month: string) => getNextMonthDate(month, 10)

  // 產出發放清單（目前支援 support/technician）
  const buildPayoutRows = (r: any): Array<{date:string; name:string; bankCode:string; bankName:string; account:string; amount:number; note?:string}> => {
    const staff = staffList.find(s => s.email === r.userEmail)
    const role = staff ? getRoleOf(staff) : 'support'
    const bankCode = (staff as any)?.bankCode || ''
    const bankName = (staff as any)?.bankName || ''
    const account = (staff as any)?.bankAccount || ''
    const name = r.userName || (staff?.name || '')
    const rows: any[] = []
    if (role === 'technician') {
      const scheme = (r as any).shareScheme || shareScheme
      const rate = Number((r as any).shareRate ?? shareRate)
      if (scheme === 'pure') {
        const amount = Number((r as any).techCommission || 0)
        const date = getIssuanceDate(r.month, r.platform || '同')
        rows.push({ date, name, bankCode, bankName, account, amount, note: '技師純分潤' })
      } else {
        // 保底：拆成底薪（次月10）與獎金（次月18）
        const commission = computeTechCommissionFromOrders(techOrders, rate)
        const basePart = Number((r as any).baseGuarantee || baseGuarantee || 0)
        const bonusPart = Math.max(0, commission - basePart)
        rows.push({ date: getSalaryPayoutDate(r.month), name, bankCode, bankName, account, amount: basePart, note: '技師保底' })
        rows.push({ date: getBonusPayoutDate(r.month), name, bankCode, bankName, account, amount: bonusPart, note: '技師保底獎金' })
      }
    } else if (role === 'sales') {
      const recSalesType: 'parttime'|'fulltime' = (Number(r.baseSalary||0) > 0) ? 'fulltime' : 'parttime'
      const allowances = r.allowances || {}
      const deductions = r.deductions || {}
      const base = r.baseSalary || 0
      const extraAllow = sumExtra((r as any).extraAllowances || [])
      const extraDed = sumExtra((r as any).extraDeductions || [])
      const allowSum = (allowances.fuel||0)+(allowances.overtime||0)+(allowances.holiday||0)+(allowances.duty||0)+extraAllow
      const dedSum = (deductions.leave||0)+(deductions.tardiness||0)+(deductions.complaints||0)+(deductions.repairCost||0)+extraDed
      const pointsValue = (Number(r.points)||0) // 業務一律將績效積分以 1:1 轉薪

      if (recSalesType === 'parttime') {
        // 兼職：僅積分換薪，於次月18日一次發放
        rows.push({ date: getBonusPayoutDate(r.month), name, bankCode, bankName, account, amount: pointsValue, note: '業務績效（兼職）' })
      } else {
        // 正職：底薪＋補貼－扣除＋積分，於次月10日；獎金於次月18日
        const salaryPart = Math.max(0, base + allowSum + pointsValue - dedSum)
        const bonusPart = r.bonus || 0
        rows.push({ date: getSalaryPayoutDate(r.month), name, bankCode, bankName, account, amount: salaryPart, note: '業務薪資（含積分）' })
        rows.push({ date: getBonusPayoutDate(r.month), name, bankCode, bankName, account, amount: bonusPart, note: '業務月度獎金' })
      }
    } else {
      // 客服/管理員：薪資（次月10） + 獎金（次月18）
      const allowances = r.allowances || {}
      const deductions = r.deductions || {}
      const base = r.baseSalary || 0
      const extraAllow = sumExtra((r as any).extraAllowances || [])
      const extraDed = sumExtra((r as any).extraDeductions || [])
      const allowSum = (allowances.fuel||0)+(allowances.overtime||0)+(allowances.holiday||0)+(allowances.duty||0)+extraAllow
      const dedSum = (deductions.leave||0)+(deductions.tardiness||0)+(deductions.complaints||0)+(deductions.repairCost||0)+extraDed
      const pointsValue = r.pointsMode === 'include' ? (r.points||0) : 0
      const salaryPart = Math.max(0, base + allowSum + pointsValue - dedSum)
      const bonusPart = r.bonus || 0
      rows.push({ date: getSalaryPayoutDate(r.month), name, bankCode, bankName, account, amount: salaryPart, note: '月薪' })
      rows.push({ date: getBonusPayoutDate(r.month), name, bankCode, bankName, account, amount: bonusPart, note: '月度獎金' })
    }
    return rows
  }

  const exportPayoutCSV = (r: any) => {
    try {
      // 中國信託群發常見欄位（可依實際批量上傳格式再微調）：收款銀行代碼,收款帳號,收款戶名,金額,付款日期,備註
      const headers = ['收款銀行代碼','收款帳號','收款戶名','金額','付款日期','備註']
      const baseRows = buildPayoutRows(r)
      // 校驗
      const issues: string[] = []
      for (const row of baseRows) {
        const miss: string[] = []
        if (!row.bankCode) miss.push('銀行代碼')
        if (!row.account) miss.push('帳號')
        if (!row.name) miss.push('戶名')
        if (!row.date) miss.push('付款日期')
        if (miss.length) issues.push(`${row.name||'(未填姓名)'} 缺少：${miss.join('、')}`)
      }
      if (issues.length) {
        alert('以下資料缺漏，請先補齊再匯出:\n' + issues.join('\n'))
        return
      }
      const rows = baseRows.map(row => [row.bankCode||'', row.account||'', row.name||'', row.amount, row.date, row.note||''])
      const csv = [headers.join(','), ...rows.map(cols => cols.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ctbc_payout_${r?.userName||'staff'}_${month}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('匯出發放CSV失敗:', e)
    }
  }

  const exportAllPayoutCSV = () => {
    try {
      const headers = ['收款銀行代碼','收款帳號','收款戶名','金額','付款日期','備註']
      const allRows: any[] = []
      for (const rec of filteredRecords) {
        const rows = buildPayoutRows(rec as any)
        for (const row of rows) {
          allRows.push({
            bankCode: row.bankCode||'',
            account: row.account||'',
            name: row.name||'',
            amount: row.amount||0,
            date: row.date||'',
            note: row.note||''
          })
        }
      }
      // 校驗
      const issues: string[] = []
      for (const row of allRows) {
        const miss: string[] = []
        if (!row.bankCode) miss.push('銀行代碼')
        if (!row.account) miss.push('帳號')
        if (!row.name) miss.push('戶名')
        if (!row.date) miss.push('付款日期')
        if (miss.length) issues.push(`${row.name||'(未填姓名)'} 缺少：${miss.join('、')}`)
      }
      if (issues.length) {
        alert('以下資料缺漏，請先補齊再匯出:\n' + issues.join('\n'))
        return
      }
      // 依日期排序（yyyy/mm/dd 轉日期）
      const parseDate = (s: string) => {
        // zh-TW 可能為 2025/09/12
        const parts = String(s||'').split(/[\/-]/).map(p=>parseInt(p,10))
        if (parts.length >= 3) return new Date(parts[0], parts[1]-1, parts[2]).getTime()
        return 0
      }
      allRows.sort((a,b)=> parseDate(a.date) - parseDate(b.date))
      const rows = allRows.map(r => [r.bankCode, r.account, r.name, r.amount, r.date, r.note])
      const csv = [headers.join(','), ...rows.map(cols => cols.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ctbc_payout_all_${month}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('匯出全員中信CSV失敗:', e)
    }
  }

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
        // 初始化方案/比例（若記錄上已有，沿用）。若未指定，沿用技師預設。
        setShareScheme(((editingRecord as any).shareScheme as any) || 'pure')
        setShareRate(((editingRecord as any).shareRate as any) || 30)
        setBaseGuarantee(((editingRecord as any).baseGuarantee as any) || 40000)
        setTechCalcMethod((((editingRecord as any).techCalcMethod as any) || 'scheme') as any)
        setCustomCommission((editingRecord as any).customCommission ?? '')
        setCustomCalcNote((editingRecord as any).customCalcNote ?? '')
        try {
          if (!((editingRecord as any).techCalcMethod)) {
            const scheme: string | undefined = (staff as any).revenueShareScheme
            if (scheme === 'afterTax80') setTechCalcMethod('afterTax80')
            if (scheme === 'custom') {
              setTechCalcMethod('custom')
              if ((customCommission === '' || customCommission === undefined)) setCustomCommission((staff as any).customCommission ?? '')
              if (!customCalcNote) setCustomCalcNote((staff as any).customCalcNote ?? '')
            }
          }
        } catch {}
      } catch {
      } finally {
        setTechOrdersLoading(false)
      }
    }
    loadTech()
  }, [editingRecord, orderRepo, staffList, month])

  // 依目前人員（業務）推定型態：有底薪=正職；否則=兼職
  useEffect(() => {
    try {
      if (!editingRecord) return
      const staff = staffList.find(s => s.email === editingRecord.userEmail)
      if (!staff) return
      if (getRoleOf(staff) !== 'sales') return
      setSalesType((editingRecord.baseSalary || 0) > 0 ? 'fulltime' : 'parttime')
    } catch {}
  }, [editingRecord, staffList])

  // 載入「績效積分來源」：推薦註冊 + 會員購物(NT$300=1)
  useEffect(() => {
    const loadPerf = async () => {
      try {
        setPerfLoading(true)
        setPerfOrders([])
        setPerfSelections({})
        setReferralSignupCount(0)
        setReferralSignupPoints(0)
        setReferralSignupRows([])
        if (!editingRecord || !orderRepo) return
        const staff = staffList.find(s => s.email === editingRecord.userEmail)
        if (!staff) return
        const role = getRoleOf(staff)
        if (role !== 'technician' && role !== 'sales') return
        const codePref = String((staff as any).refCode || (staff as any).code || '').toUpperCase()
        if (!codePref) return
        // 訂單（同月、推薦碼一致）
        const orders = await orderRepo.list()
        const ym = month
        const inMonth = (orders||[]).filter((o: any) => {
          const d = o.workCompletedAt || o.createdAt
          return (d || '').slice(0,7) === ym
        })
        const mine = inMonth.filter((o: any) => String((o.referrerCode||'')).toUpperCase() === codePref)
        const sel: Record<string, boolean> = {}
        for (const o of mine) sel[o.id] = true
        setPerfOrders(mine)
        setPerfSelections(sel)
        // 推薦註冊 +100（以 points_ledger 為主；月份過濾）
        try {
          const start = new Date(month + '-01')
          const end = new Date(start)
          end.setMonth(end.getMonth()+1)
          const { data: rows } = await supabase
            .from('points_ledger')
            .select('points, source, created_at, ref_code')
            .eq('ref_code', codePref)
            .gte('created_at', start.toISOString())
            .lt('created_at', end.toISOString())
          const list = Array.isArray(rows) ? rows : []
          const signup = list.filter((r: any) => String(r.source||'') === 'member_signup')
          const cnt = signup.length
          const pts = signup.reduce((s: number, r: any) => s + (Number(r.points)||0), 0)
          setReferralSignupCount(cnt)
          setReferralSignupPoints(pts)
          setReferralSignupRows(signup)
        } catch {}
      } finally {
        setPerfLoading(false)
      }
    }
    loadPerf()
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
      // 非管理員：自動載入本人的當月薪資記錄，供「我的薪資」明細使用
      try {
        const isAdmin = can(user, 'admin')
        if (!isAdmin && user?.email) {
          const me = monthRecords.find((r: any) => String(r.userEmail||'').toLowerCase() === String(user.email||'').toLowerCase())
          if (me) setEditingRecord(me as any)
        }
      } catch {}
      // 技師本月分潤估算（僅用於顯示）
      if (viewRole === 'technician') {
        try {
          const techMonthly = await computeMonthlyPayroll(month)
          const map: Record<string, any> = {}
          for (const row of techMonthly) {
            map[row.technician.name] = row
          }
          setTechMonthlyMap(map)
        } catch {}
      } else {
        setTechMonthlyMap({})
      }
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
        // 若為技師，預設帶入技師管理上的方案與自訂欄位
        const role = getRoleOf(staff)
        if (role === 'technician') {
          const scheme: string | undefined = (staff as any).revenueShareScheme
          const customCommissionPref = (staff as any).customCommission
          const customCalcNotePref = (staff as any).customCalcNote
          if (scheme === 'afterTax80') {
            ;(newRecord as any).techCalcMethod = 'afterTax80'
          } else if (scheme === 'custom') {
            ;(newRecord as any).techCalcMethod = 'custom'
            if (typeof customCommissionPref === 'number') {
              ;(newRecord as any).customCommission = customCommissionPref
            }
            if (customCalcNotePref) {
              ;(newRecord as any).customCalcNote = customCalcNotePref
            }
          } else if (scheme && scheme.startsWith('pure')) {
            ;(newRecord as any).techCalcMethod = 'scheme'
            ;(newRecord as any).shareScheme = 'pure'
            const pct = Number(String(scheme).replace('pure', ''))
            ;(newRecord as any).shareRate = isFinite(pct) && pct > 0 ? pct : 70
          } else if (scheme && scheme.startsWith('base')) {
            ;(newRecord as any).techCalcMethod = 'scheme'
            ;(newRecord as any).shareScheme = 'base'
            const rateMap: Record<string, number> = { base1: 10, base2: 20, base3: 30 }
            ;(newRecord as any).shareRate = rateMap[scheme] ?? 10
            ;(newRecord as any).baseGuarantee = 40000
          }
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
      const hitStatus = statusFilter === 'all' || String(r.status || 'pending') === statusFilter
      return hitView && hitRole && hitQ && hitStatus
    })
  }, [recordsWithRole, roleFilter, search, viewRole, statusFilter])

  // 管理員表格排序 + 分頁
  const adminSorted = useMemo(() => {
    const val = (r: any, key: string): any => {
      if (key === 'role') return (r.__role || '')
      if (key === 'allowancesSum') return calculateSalary(r as PayrollRecord).totalAllowances
      if (key === 'deductionsSum') return calculateSalary(r as PayrollRecord).totalDeductions
      if (key === 'net') return calculateSalary(r as PayrollRecord).net
      if (key === 'techCommission') return Number((r as any).techCommission || 0)
      return (r as any)[key]
    }
    const rows = [...filteredRecords]
    rows.sort((a, b) => {
      const va = val(a, sortBy)
      const vb = val(b, sortBy)
      if (va == null && vb == null) return 0
      if (va == null) return sortDir === 'asc' ? -1 : 1
      if (vb == null) return sortDir === 'asc' ? 1 : -1
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
    return rows
  }, [filteredRecords, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(adminSorted.length / pageSize))
  const adminPageRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return adminSorted.slice(start, start + pageSize)
  }, [adminSorted, page])

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
    const totalAllowances = (allowances.fuel || 0) + (allowances.overtime || 0) + (allowances.holiday || 0) + (allowances.duty || 0) + (otherAllowance || 0) + sumExtra((record as any).extraAllowances || [])
    const extraDeductions = ((deductions as any).laborInsurance || 0) + ((deductions as any).healthInsurance || 0) + ((deductions as any).other || 0) + sumExtra((record as any).extraDeductions || [])
    const totalDeductions = (deductions.leave || 0) + (deductions.tardiness || 0) + (deductions.complaints || 0) + (deductions.repairCost || 0) + extraDeductions
    const bonus = record.bonus || 0
    const pointsValue = record.pointsMode === 'include' ? (record.points || 0) : 0
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
        // 業務：以績效積分來源面板合計的 points 為主；兼職=僅積分換薪，正職=底薪+積分
        const staffCode = String((staff as any).refCode || (staff as any).code || '').toUpperCase()
        // 若未先開啟來源面板也能自算一次（以 referrerCode 匹配當月訂單）
        let shoppingPts = 0
        if (orderRepo && staffCode) {
          const orders = await orderRepo.list()
          const ym = month
          const inMonth = (orders||[]).filter((o: any) => { const d = o.workCompletedAt || o.createdAt; return (d||'').slice(0,7)===ym })
          const mine = inMonth.filter((o: any) => String((o.referrerCode||'')).toUpperCase() === staffCode)
          for (const o of mine) {
            const totalRaw = Number((o as any).totalAmount ?? (o as any).total ?? 0)
            const sumItems = (o.serviceItems||[]).reduce((s:number,it:any)=> s+(it.unitPrice||0)*(it.quantity||0),0)
            const total = totalRaw>0? totalRaw: sumItems
            shoppingPts += Math.floor(Math.max(0,total)/300)
          }
        }
        // 推薦註冊（當月）
        let signupPts = 0
        try {
          const start = new Date(month + '-01')
          const end = new Date(start); end.setMonth(end.getMonth()+1)
          const { data: rows } = await supabase
            .from('points_ledger')
            .select('points, source, created_at, ref_code')
            .eq('ref_code', staffCode)
            .gte('created_at', start.toISOString())
            .lt('created_at', end.toISOString())
          const list = Array.isArray(rows) ? rows : []
          signupPts = list.filter((r:any)=> String(r.source||'')==='member_signup').reduce((s:number,r:any)=> s+(Number(r.points)||0),0)
        } catch {}
        const totalPts = signupPts + shoppingPts
        setEditingRecord(r => ({ ...(r as PayrollRecord), points: totalPts }))
      } catch {}
      return
    }
    // 客服/管理員：暫不自動計算
  }

  const saveRecord = async (record: PayrollRecord) => {
    try {
      // 最小必要欄位（snake_case）— 優先寫入，避免 schema 差異造成 400
      const minimal: any = {
        month: record.month,
        user_email: String((record as any).userEmail || (record as any).user_email || user?.email || '').toLowerCase(),
        user_name: (record as any).userName || (record as any).user_name || '',
        employee_id: (record as any).employeeId || (record as any).employee_id || '',
        base_salary: record.baseSalary || 0,
        bonus: record.bonus || 0,
        points: record.points || 0,
        points_mode: record.pointsMode || 'accumulate',
        platform: record.platform || '同',
        status: record.status || 'pending'
      }
      if ((record as any).id) minimal.id = (record as any).id
      // 完整 payload（含 JSON 欄位），若欄位不存在自動回退移除再嘗試
      const full: any = {
        ...minimal,
        bonus_rate: (record as any).bonusRate ?? null,
        allowances: (record as any).allowances ?? {},
        deductions: (record as any).deductions ?? {},
        extra_allowances: (record as any).extraAllowances ?? null,
        extra_deductions: (record as any).extraDeductions ?? null,
        notes: (record as any).notes ?? null,
        updated_at: new Date().toISOString()
      }
      // 去除 undefined 以避免 schema 比對誤判
      Object.keys(full).forEach(k => { if (full[k] === undefined) delete full[k] })

      const upsertOpts = (full.id ? {} : { onConflict: 'month,user_email' }) as any
      const tryUpsert = async (body: any) => {
        let attempt = { ...body }
        const tried = new Set<string>()
        for (let i = 0; i < 16; i++) {
          const { error } = await supabase.from('payroll_records').upsert(attempt, upsertOpts)
          if (!error) return
          const msg = String(error?.message || '')
          const m = msg.match(/Could not find the '([^']+)' column/i)
          if (m && m[1] && !tried.has(m[1])) {
            delete (attempt as any)[m[1]]
            tried.add(m[1])
            continue
          }
          // 若是 JSON 欄位不支援，逐步移除
          if (!tried.has('extra_allowances')) { delete (attempt as any).extra_allowances; tried.add('extra_allowances'); continue }
          if (!tried.has('extra_deductions')) { delete (attempt as any).extra_deductions; tried.add('extra_deductions'); continue }
          if (!tried.has('allowances')) { delete (attempt as any).allowances; tried.add('allowances'); continue }
          if (!tried.has('deductions')) { delete (attempt as any).deductions; tried.add('deductions'); continue }
          throw error
        }
      }
 
      await tryUpsert(full)
      await loadData()
    } catch (error) {
      console.error('儲存失敗:', error)
      alert(`儲存失敗：${(error as any)?.message || '未知錯誤'}`)
    }
  }

  const confirmSave = async () => {
    if (!editingRecord) return
    const { confirmTwice } = await import('../kit')
    if (await confirmTwice('確定要儲存薪資資料嗎？', '可隨時再編輯，確定繼續？')) {
      await saveRecord(editingRecord)
    }
  }

  // 內嵌編輯（不再使用彈窗）
  const renderInlineEditor = () => {
    if (!editingRecord) return null
    const staff = staffList.find(s => s.email === editingRecord.userEmail)
    const role = staff ? getRoleOf(staff) : 'support'
    const calc = calculateSalary(editingRecord)
    return (
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">編輯薪資 - {editingRecord.userName}</div>
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-600">
            <span>即時淨發：</span>
            <span className="text-base font-bold text-emerald-600">${calc.net.toLocaleString()}</span>
              </div>
              </div>
        {/* 分頁切換 */}
        <div className="mb-3 flex flex-wrap gap-2 text-sm">
          <button className={`rounded px-3 py-1 border ${editTab==='base'?'bg-gray-900 text-white':'bg-white'}`} onClick={()=>setEditTab('base')}>基本</button>
          <button className={`rounded px-3 py-1 border ${editTab==='allow'?'bg-gray-900 text-white':'bg-white'}`} onClick={()=>setEditTab('allow')}>補貼</button>
          <button className={`rounded px-3 py-1 border ${editTab==='deduct'?'bg-gray-900 text-white':'bg-white'}`} onClick={()=>setEditTab('deduct')}>扣除</button>
          {role==='technician' && <button className={`rounded px-3 py-1 border ${editTab==='tech'?'bg-gray-900 text-white':'bg-white'}`} onClick={()=>setEditTab('tech')}>技師</button>}
          {role==='sales' && <button className={`rounded px-3 py-1 border ${editTab==='sales'?'bg-gray-900 text-white':'bg-white'}`} onClick={()=>setEditTab('sales')}>業務</button>}
          <button className={`rounded px-3 py-1 border ${editTab==='notes'?'bg-gray-900 text-white':'bg-white'}`} onClick={()=>setEditTab('notes')}>備註</button>
              </div>
        {/* 主編輯區 + 右側即時試算 */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            {editTab==='base' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">基本薪資</label>
              <Input type="number" value={editingRecord.baseSalary || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, baseSalary: Number(e.target.value)})} placeholder="底薪" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">獎金</label>
              <Input type="number" value={editingRecord.bonus || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, bonus: Number(e.target.value)})} placeholder="獎金" />
            </div>
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
                {role!=='support' && (
                  <>
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
                  </>
                )}
              </div>
            )}

            {editTab==='allow' && (
              <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" value={editingRecord.allowances?.fuel || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, allowances: { ...editingRecord.allowances, fuel: Number(e.target.value) } })} placeholder="油資補貼" />
            <Input type="number" value={editingRecord.allowances?.overtime || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, allowances: { ...editingRecord.allowances, overtime: Number(e.target.value) } })} placeholder="加班費" />
            <Input type="number" value={editingRecord.allowances?.holiday || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, allowances: { ...editingRecord.allowances, holiday: Number(e.target.value) } })} placeholder="節金" />
            <Input type="number" value={editingRecord.allowances?.duty || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, allowances: { ...editingRecord.allowances, duty: Number(e.target.value) } })} placeholder="職務加給" />
                  <Input type="number" value={(editingRecord.allowances as any)?.other || 0} onChange={(e)=> setEditingRecord({ ...(editingRecord as any), allowances: { ...(editingRecord as any).allowances, other: Number(e.target.value) } } as any)} placeholder="其他補貼" />
          </div>
                <div>
            <div className="text-sm font-medium mb-1">其他補貼（可多筆）</div>
            <div className="space-y-2">
              {((editingRecord as any).extraAllowances || []).map((row: any, idx: number) => (
                <div key={idx} className="grid grid-cols-5 gap-2">
                  <Input className="col-span-3" placeholder="說明（例如：餐補）" value={row?.title||''} onChange={(e)=>{
                    const list = [ ...((editingRecord as any).extraAllowances || []) ]
                    list[idx] = { ...list[idx], title: e.target.value }
                    setEditingRecord({ ...(editingRecord as any), extraAllowances: list } as any)
                  }} />
                  <Input className="col-span-2" type="number" placeholder="金額" value={row?.amount||''} onChange={(e)=>{
                    const list = [ ...((editingRecord as any).extraAllowances || []) ]
                    list[idx] = { ...list[idx], amount: toNumberOrNull(e.target.value) }
                    setEditingRecord({ ...(editingRecord as any), extraAllowances: list } as any)
                  }} />
                </div>
              ))}
              <Button variant="outline" onClick={()=> setEditingRecord({ ...(editingRecord as any), extraAllowances: [ ...(((editingRecord as any).extraAllowances)||[]), { title:'', amount:null } ] } as any)}>+ 新增補貼</Button>
            </div>
          </div>
              </div>
            )}

            {editTab==='deduct' && (
              <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" value={editingRecord.deductions?.leave || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, deductions: { ...editingRecord.deductions, leave: Number(e.target.value) } })} placeholder="休假扣除" />
            <Input type="number" value={editingRecord.deductions?.tardiness || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, deductions: { ...editingRecord.deductions, tardiness: Number(e.target.value) } })} placeholder="遲到扣除" />
            <Input type="number" value={editingRecord.deductions?.complaints || 0} onChange={(e)=> setEditingRecord({ ...editingRecord, deductions: { ...editingRecord.deductions, complaints: Number(e.target.value) } })} placeholder="客訴扣除" />
            <Input type="number" value={editingRecord.deductions?.repairCost || '' as any} onChange={(e)=> setEditingRecord({ ...editingRecord, deductions: { ...editingRecord.deductions, repairCost: Number(e.target.value) } })} placeholder="維修費用（封頂30%）" />
                  <Input placeholder="勞保" type="number" value={(editingRecord.deductions as any)?.laborInsurance || 0} onChange={(e)=> setEditingRecord({ ...(editingRecord as any), deductions: { ...((editingRecord as any).deductions || {}), laborInsurance: Number(e.target.value) } } as any)} />
                  <Input placeholder="健保" type="number" value={(editingRecord.deductions as any)?.healthInsurance || 0} onChange={(e)=> setEditingRecord({ ...(editingRecord as any), deductions: { ...((editingRecord as any).deductions || {}), healthInsurance: Number(e.target.value) } } as any)} />
                  <Input placeholder="眷數" type="number" value={(editingRecord.deductions as any)?.dependents || 0} onChange={(e)=> setEditingRecord({ ...(editingRecord as any), deductions: { ...((editingRecord as any).deductions || {}), dependents: Number(e.target.value) } } as any)} />
                  <Input placeholder="其他" type="number" value={(editingRecord.deductions as any)?.other || 0} onChange={(e)=> setEditingRecord({ ...(editingRecord as any), deductions: { ...((editingRecord as any).deductions || {}), other: Number(e.target.value) } } as any)} />
          </div>
                <div>
            <div className="text-sm font-medium mb-1">其他扣除（可多筆）</div>
            <div className="space-y-2">
              {((editingRecord as any).extraDeductions || []).map((row: any, idx: number) => (
                <div key={idx} className="grid grid-cols-5 gap-2">
                  <Input className="col-span-3" placeholder="說明（例如：工具遺失）" value={row?.title||''} onChange={(e)=>{
                    const list = [ ...((editingRecord as any).extraDeductions || []) ]
                    list[idx] = { ...list[idx], title: e.target.value }
                    setEditingRecord({ ...(editingRecord as any), extraDeductions: list } as any)
                  }} />
                  <Input className="col-span-2" type="number" placeholder="金額" value={row?.amount||''} onChange={(e)=>{
                    const list = [ ...((editingRecord as any).extraDeductions || []) ]
                    list[idx] = { ...list[idx], amount: toNumberOrNull(e.target.value) }
                    setEditingRecord({ ...(editingRecord as any), extraDeductions: list } as any)
                  }} />
                </div>
              ))}
              <Button variant="outline" onClick={()=> setEditingRecord({ ...(editingRecord as any), extraDeductions: [ ...(((editingRecord as any).extraDeductions)||[]), { title:'', amount:null } ] } as any)}>+ 新增扣除</Button>
            </div>
          </div>
              </div>
            )}

            {editTab==='tech' && renderTechOrdersPanel()}
            {editTab==='sales' && renderPerformancePointsPanel()}

            {editTab==='notes' && (
              <div>
                <label className="block text-sm font-medium mb-1">備註</label>
                <Textarea value={(editingRecord as any).notes || ''} onChange={(e)=> setEditingRecord({ ...(editingRecord as any), notes: e.target.value })} rows={3} />
              </div>
            )}
          </div>

          {/* 右側即時試算 */}
              <div>
            <div className="rounded border bg-white p-3 text-sm">
              <div className="mb-2 font-semibold">即時淨發試算</div>
              <div className="space-y-1 text-gray-700">
                <div>底薪：${calc.base.toLocaleString()}</div>
                <div>補貼：${calc.totalAllowances.toLocaleString()}</div>
                <div>扣除：${calc.totalDeductions.toLocaleString()}</div>
                <div>獎金：${(editingRecord.bonus||0).toLocaleString()}</div>
                <div>積分（{editingRecord.pointsMode==='include'?'併入':'累積'}）：{editingRecord.points||0}</div>
                {role==='technician' && (
                  <div>分潤：${Number((editingRecord as any).techCommission||0).toLocaleString()}</div>
                )}
              </div>
              <div className="mt-2 text-right">
                <div className="text-xs text-gray-600">淨發金額</div>
                <div className="text-xl font-bold text-emerald-700">${calc.net.toLocaleString()}</div>
            </div>
            </div>
          </div>
        </div>

        {/* 底部操作列 */}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={()=>{ setEditingRecord(null) }}>取消</Button>
          <Button variant="outline" onClick={autoCalc}>自動計算</Button>
          <Button onClick={()=> editingRecord && saveRecord(editingRecord)}>儲存</Button>
              </div>
      </Card>
    )
  }

  // 非管理員用：我的薪資明細（技師/業務）
  const renderMySalaryDetails = () => {
    const me = editingRecord || records.find(r => String(r.userEmail||'').toLowerCase() === String(user?.email||'').toLowerCase())
    if (!me) return (
      <Card>
        <div className="text-sm text-gray-600">本月尚無薪資資料</div>
      </Card>
    )
    const calc = calculateSalary(me as PayrollRecord)
    const allowances: any = (me as any).allowances || {}
    const deductions: any = (me as any).deductions || {}
    const extraAllow: Array<{title:string;amount:number|null}> = (me as any).extraAllowances || []
    const extraDed: Array<{title:string;amount:number|null}> = (me as any).extraDeductions || []
    const schemeLabel = getSchemeLabel(me as any)
    const isTech = (()=>{ const s = staffList.find(x=>x.email===(me as any).userEmail); return s ? getRoleOf(s)==='technician' : user?.role==='technician' })()
    const isSales = (()=>{ const s = staffList.find(x=>x.email===(me as any).userEmail); return s ? getRoleOf(s)==='sales' : user?.role==='sales' })()

    return (
      <Card>
        <div className="text-lg font-semibold mb-3">我的薪資明細（{me.month}）</div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded border bg-white p-3">
            <div className="font-semibold mb-2">基本</div>
            <div className="text-sm space-y-1">
              <div>底薪：<span className="font-medium">${(me.baseSalary||0).toLocaleString()}</span></div>
              <div>獎金：<span className="font-medium">${(me.bonus||0).toLocaleString()}</span></div>
              <div>積分：<span className="font-medium">{me.points||0}</span>（{me.pointsMode==='include'?'併入薪資':'累積'}）</div>
              {isTech && (
                <>
                  <div>分潤方案：<span className="font-medium">{schemeLabel||'—'}</span></div>
                  <div>本月分潤：<span className="font-medium text-emerald-700">${Number((me as any).techCommission||0).toLocaleString()}</span></div>
                </>
              )}
              </div>
            </div>
          <div className="rounded border bg-white p-3">
            <div className="font-semibold mb-2">發放資訊</div>
            <div className="text-sm space-y-1">
              <div>平台：{me.platform||'同'}</div>
              <div>發放日：{getIssuanceDate(me.month, me.platform||'同')}</div>
              <div>狀態：{me.status==='confirmed'?'已確認':'待確認'}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <div className="rounded border bg-white p-3">
            <div className="font-semibold mb-2">補貼明細</div>
            <table className="min-w-full text-sm">
              <tbody>
                <tr className="border-b"><td className="px-2 py-1">油資</td><td className="px-2 py-1 text-right">${Number(allowances.fuel||0).toLocaleString()}</td></tr>
                <tr className="border-b"><td className="px-2 py-1">加班</td><td className="px-2 py-1 text-right">${Number(allowances.overtime||0).toLocaleString()}</td></tr>
                <tr className="border-b"><td className="px-2 py-1">節金</td><td className="px-2 py-1 text-right">${Number(allowances.holiday||0).toLocaleString()}</td></tr>
                <tr className="border-b"><td className="px-2 py-1">職務加給</td><td className="px-2 py-1 text-right">${Number(allowances.duty||0).toLocaleString()}</td></tr>
                {'other' in allowances && (<tr className="border-b"><td className="px-2 py-1">其他</td><td className="px-2 py-1 text-right">${Number((allowances as any).other||0).toLocaleString()}</td></tr>)}
                {extraAllow.map((row,idx)=>(<tr key={`ea-${idx}`} className="border-b"><td className="px-2 py-1">{row.title||'其他補貼'}</td><td className="px-2 py-1 text-right">${Number(row.amount||0).toLocaleString()}</td></tr>))}
                <tr><td className="px-2 py-1 font-semibold">小計</td><td className="px-2 py-1 text-right font-semibold">${calc.totalAllowances.toLocaleString()}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="rounded border bg-white p-3">
            <div className="font-semibold mb-2">扣除明細</div>
            <table className="min-w-full text-sm">
              <tbody>
                <tr className="border-b"><td className="px-2 py-1">請假</td><td className="px-2 py-1 text-right">${Number(deductions.leave||0).toLocaleString()}</td></tr>
                <tr className="border-b"><td className="px-2 py-1">遲到</td><td className="px-2 py-1 text-right">${Number(deductions.tardiness||0).toLocaleString()}</td></tr>
                <tr className="border-b"><td className="px-2 py-1">客訴</td><td className="px-2 py-1 text-right">${Number(deductions.complaints||0).toLocaleString()}</td></tr>
                <tr className="border-b"><td className="px-2 py-1">維修費用</td><td className="px-2 py-1 text-right">${Number(deductions.repairCost||0).toLocaleString()}</td></tr>
                {'laborInsurance' in deductions && (<tr className="border-b"><td className="px-2 py-1">勞保</td><td className="px-2 py-1 text-right">${Number((deductions as any).laborInsurance||0).toLocaleString()}</td></tr>)}
                {'healthInsurance' in deductions && (<tr className="border-b"><td className="px-2 py-1">健保</td><td className="px-2 py-1 text-right">${Number((deductions as any).healthInsurance||0).toLocaleString()}</td></tr>)}
                {'dependents' in deductions && (<tr className="border-b"><td className="px-2 py-1">眷數</td><td className="px-2 py-1 text-right">${Number((deductions as any).dependents||0).toLocaleString()}</td></tr>)}
                {'other' in deductions && (<tr className="border-b"><td className="px-2 py-1">其他</td><td className="px-2 py-1 text-right">${Number((deductions as any).other||0).toLocaleString()}</td></tr>)}
                {extraDed.map((row,idx)=>(<tr key={`ed-${idx}`} className="border-b"><td className="px-2 py-1">{row.title||'其他扣除'}</td><td className="px-2 py-1 text-right">${Number(row.amount||0).toLocaleString()}</td></tr>))}
                <tr><td className="px-2 py-1 font-semibold">小計</td><td className="px-2 py-1 text-right font-semibold">${calc.totalDeductions.toLocaleString()}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 rounded border bg-white p-3">
          <div className="font-semibold mb-2">淨發計算</div>
          <div className="text-sm text-gray-700">
            底薪 {calc.base.toLocaleString()} + 補貼 {calc.totalAllowances.toLocaleString()} - 扣除 {calc.totalDeductions.toLocaleString()} + 獎金 {(me.bonus||0).toLocaleString()} {(me.pointsMode==='include'? `+ 積分 ${(me.points||0).toLocaleString()}` : '')} {isTech? `+ 分潤 ${Number((me as any).techCommission||0).toLocaleString()}` : ''}
          </div>
          <div className="mt-1 text-xl font-bold text-emerald-700">${calc.net.toLocaleString()}</div>
        </div>

        {/* 額外明細：技師分潤 / 業務積分來源 */}
        {isTech && renderTechOrdersPanel()}
        {isSales && renderPerformancePointsPanel()}
      </Card>
    )
  }

  // 管理員：薪資總覽表（更詳細、可展開拆項）
  const renderAdminTable = () => {
    if (!can(user, 'admin')) return null
    const rows = adminPageRows
    const getKey = (r: any) => String(r.id || `${r.userEmail}-${r.month}`)
    const toggle = (k: string) => setExpandedRows(s => ({ ...s, [k]: !s[k] }))
    const A = (r: any) => (r.allowances || {})
    const D = (r: any) => (r.deductions || {})
    return (
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-semibold">薪資總覽表（{month}）</div>
          <div className="text-xs text-gray-500">點「詳情」可展開補貼/扣除拆項</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-600">
                <th className="px-2 py-2 text-left">姓名 / Email</th>
                <th className="px-2 py-2 text-left">角色</th>
                <th className="px-2 py-2 text-right">底薪</th>
                <th className="px-2 py-2 text-right">補貼小計</th>
                <th className="px-2 py-2 text-right">扣除小計</th>
                <th className="px-2 py-2 text-right">獎金</th>
                <th className="px-2 py-2 text-right">積分</th>
                <th className="px-2 py-2 text-right">分潤</th>
                <th className="px-2 py-2 text-right">淨發</th>
                <th className="px-2 py-2 text-left">狀態</th>
                <th className="px-2 py-2 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.length===0 ? (
                <tr><td className="px-2 py-3" colSpan={11}>本月暫無薪資記錄</td></tr>
              ) : rows.map((r: any) => {
                const key = getKey(r)
                const calc = calculateSalary(r as PayrollRecord)
                const role = (r as any).__role || 'support'
                const pointsLabel = r.pointsMode==='include' ? `${r.points||0}（併）` : `${r.points||0}`
                const techCommission = Number((r as any).techCommission || 0)
                return (
                  <>
                    <tr key={key} className="border-b last:border-0">
                      <td className="px-2 py-2">
                        <div className="font-medium">{r.userName || r.userEmail}</div>
                        <div className="text-xs text-gray-500">{r.userEmail}</div>
                      </td>
                      <td className="px-2 py-2">{role==='support'?'客服/管理':'技師'===role? '技師' : role==='sales'?'業務': role}</td>
                      <td className="px-2 py-2 text-right">${(r.baseSalary||0).toLocaleString()}</td>
                      <td className="px-2 py-2 text-right">
                        <div>${calc.totalAllowances.toLocaleString()}</div>
                        <button className="text-xs text-blue-600 hover:underline" onClick={()=>toggle(key)}>詳情</button>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div>${calc.totalDeductions.toLocaleString()}</div>
                        <button className="text-xs text-blue-600 hover:underline" onClick={()=>toggle(key)}>詳情</button>
                      </td>
                      <td className="px-2 py-2 text-right">${(r.bonus||0).toLocaleString()}</td>
                      <td className="px-2 py-2 text-right">{pointsLabel}</td>
                      <td className="px-2 py-2 text-right">{role==='technician'? `$${techCommission.toLocaleString()}` : '—'}</td>
                      <td className="px-2 py-2 text-right font-semibold text-emerald-700">${calc.net.toLocaleString()}</td>
                      <td className="px-2 py-2">{r.status==='confirmed'? '已確認' : '待確認'}</td>
                      <td className="px-2 py-2 text-center">
                        <Button size="sm" variant="outline" onClick={()=>{ setEditingRecord(r as PayrollRecord) }}>編輯</Button>
                      </td>
                    </tr>
                    {expandedRows[key] && (
                      <tr className="bg-gray-50/60">
                        <td className="px-2 py-2" colSpan={11}>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded border bg-white p-3">
                              <div className="font-semibold mb-2">補貼拆項</div>
                              <div className="grid grid-cols-2 text-sm gap-1">
                                <div>油資</div><div className="text-right">${Number(A(r).fuel||0).toLocaleString()}</div>
                                <div>加班</div><div className="text-right">${Number(A(r).overtime||0).toLocaleString()}</div>
                                <div>節金</div><div className="text-right">${Number(A(r).holiday||0).toLocaleString()}</div>
                                <div>職務加給</div><div className="text-right">${Number(A(r).duty||0).toLocaleString()}</div>
                                {'other' in A(r)? (<>
                                  <div>其他</div><div className="text-right">${Number(A(r).other||0).toLocaleString()}</div>
                                </>) : null}
                                {(((r as any).extraAllowances)||[]).map((row:any, idx:number)=> (
                                  <>
                                    <div key={`ea-l-${key}-${idx}`}>{row?.title||'其他補貼'}</div>
                                    <div key={`ea-r-${key}-${idx}`} className="text-right">${Number(row?.amount||0).toLocaleString()}</div>
                                  </>
                                ))}
                                <div className="font-semibold mt-1">小計</div><div className="text-right font-semibold mt-1">${calc.totalAllowances.toLocaleString()}</div>
                              </div>
                            </div>
                            <div className="rounded border bg-white p-3">
                              <div className="font-semibold mb-2">扣除拆項</div>
                              <div className="grid grid-cols-2 text-sm gap-1">
                                <div>請假</div><div className="text-right">${Number(D(r).leave||0).toLocaleString()}</div>
                                <div>遲到</div><div className="text-right">${Number(D(r).tardiness||0).toLocaleString()}</div>
                                <div>客訴</div><div className="text-right">${Number(D(r).complaints||0).toLocaleString()}</div>
                                <div>維修費用</div><div className="text-right">${Number(D(r).repairCost||0).toLocaleString()}</div>
                                {'laborInsurance' in D(r)? (<>
                                  <div>勞保</div><div className="text-right">${Number((D(r) as any).laborInsurance||0).toLocaleString()}</div>
                                </>) : null}
                                {'healthInsurance' in D(r)? (<>
                                  <div>健保</div><div className="text-right">${Number((D(r) as any).healthInsurance||0).toLocaleString()}</div>
                                </>) : null}
                                {'dependents' in D(r)? (<>
                                  <div>眷數</div><div className="text-right">${Number((D(r) as any).dependents||0).toLocaleString()}</div>
                                </>) : null}
                                {'other' in D(r)? (<>
                                  <div>其他</div><div className="text-right">${Number((D(r) as any).other||0).toLocaleString()}</div>
                                </>) : null}
                                {(((r as any).extraDeductions)||[]).map((row:any, idx:number)=> (
                                  <>
                                    <div key={`ed-l-${key}-${idx}`}>{row?.title||'其他扣除'}</div>
                                    <div key={`ed-r-${key}-${idx}`} className="text-right">${Number(row?.amount||0).toLocaleString()}</div>
                                  </>
                                ))}
                                <div className="font-semibold mt-1">小計</div><div className="text-right font-semibold mt-1">${calc.totalDeductions.toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* 分頁 */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <div>共 {adminSorted.length} 筆，頁 {page}/{totalPages}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={page<=1}>上一頁</Button>
            <Button variant="outline" onClick={()=> setPage(p=> Math.min(totalPages, p+1))} disabled={page>=totalPages}>下一頁</Button>
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
    let sumAfterTax80 = 0
    for (const o of techOrders) {
      if (techSelections[o.id] === false) continue
      const totalRaw = Number((o as any).totalAmount ?? (o as any).total ?? 0)
      const sumItems = (o.serviceItems||[]).reduce((s:number, it:any)=> s + (it.unitPrice||0)*(it.quantity||0), 0)
      const total = totalRaw > 0 ? totalRaw : sumItems
      const techCount = Array.isArray(o.assignedTechnicians) && o.assignedTechnicians.length>0 ? o.assignedTechnicians.length : 1
      const basis = total / techCount
      sumBasis += basis
      sumCommission += Math.round(basis * rate)
      // 新公式：結案金額/1.05*0.8（不分攤技師數）
      sumAfterTax80 += (total / 1.05) * 0.8
    }
    let finalCommission = 0
    if (techCalcMethod === 'scheme') {
      finalCommission = shareScheme === 'base' ? Math.max(baseGuarantee, sumCommission) : sumCommission
    } else if (techCalcMethod === 'afterTax80') {
      finalCommission = Math.round(sumAfterTax80)
    } else {
      finalCommission = Math.max(0, Number(customCommission || 0))
    }

    return (
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">技師分潤計算（{month}）</div>
          <div className="text-sm text-gray-600">訂單數：{techOrders.length}</div>
        </div>
        <div className="mb-3 grid gap-3 md:grid-cols-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">計算方式</div>
            <Select value={techCalcMethod} onChange={(e)=> setTechCalcMethod((e.target.value as any) || 'scheme')}>
              <option value="scheme">比例/保底（現有）</option>
              <option value="afterTax80">結案金額/1.05*0.8</option>
              <option value="custom">自訂</option>
            </Select>
          </div>
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
                {shareScheme==='pure' && techCalcMethod==='scheme' && (
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
                {shareScheme!=='pure' && techCalcMethod==='scheme' && (
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
          {shareScheme==='base' && techCalcMethod==='scheme' && (
            <div>
              <div className="text-sm text-gray-600 mb-1">保底金額</div>
              {can(user,'admin') ? (
                <Input type="number" value={baseGuarantee} onChange={(e)=> setBaseGuarantee(Number(e.target.value)||0)} />
              ) : (
                <div className="rounded border bg-white px-2 py-1 text-gray-700">${baseGuarantee.toLocaleString()}</div>
              )}
            </div>
          )}
          {techCalcMethod==='custom' && (
            <>
              <div>
                <div className="text-sm text-gray-600 mb-1">自訂金額（元）</div>
                <Input type="number" value={customCommission as any} onChange={(e)=> setCustomCommission((e.target.value===''?'':Number(e.target.value)) as any)} placeholder="直接輸入計算後金額" />
              </div>
              <div className="md:col-span-2">
                <div className="text-sm text-gray-600 mb-1">特殊計算方式備註</div>
                <Textarea rows={2} value={customCalcNote} onChange={(e)=> setCustomCalcNote(e.target.value)} placeholder="例如：結案金額/1.03*0.78，僅本月適用" />
              </div>
            </>
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
          <Button variant="outline" onClick={()=>{ setTechSelections({}); setShareRate(30); setShareScheme('pure'); setBaseGuarantee(40000); setTechCalcMethod('scheme'); setCustomCommission(''); setCustomCalcNote('') }}>重設</Button>
          <Button variant="outline" onClick={exportTechOrdersCSV}>下載對帳CSV</Button>
          <Button onClick={()=>{
            setEditingRecord(r=> ({
              ...(r as PayrollRecord),
              techCommission: finalCommission,
              shareScheme,
              shareRate,
              baseGuarantee,
              techCalcMethod,
              customCommission: (techCalcMethod==='custom'? (customCommission||0): undefined),
              customCalcNote: (techCalcMethod==='custom'? customCalcNote: undefined)
            } as any))
          }}>套用到本筆薪資</Button>
        </div>
      </Card>
    )
  }

  // 績效積分來源（推薦 + 購物）
  const renderPerformancePointsPanel = () => {
    if (!editingRecord) return null
    const staff = staffList.find(s => s.email === editingRecord.userEmail)
    if (!staff) return null
    const role = getRoleOf(staff)
    if (role !== 'technician' && role !== 'sales') return null
    const codePref = String((staff as any).refCode || (staff as any).code || '').toUpperCase()
    const calcOrderTotal = (o: any) => {
      const totalRaw = Number((o as any).totalAmount ?? (o as any).total ?? 0)
      const sumItems = (o.serviceItems||[]).reduce((s:number, it:any)=> s + (it.unitPrice||0)*(it.quantity||0), 0)
      return totalRaw > 0 ? totalRaw : sumItems
    }
    let sumShoppingPts = 0
    for (const o of perfOrders) {
      if (perfSelections[o.id] === false) continue
      const total = calcOrderTotal(o)
      sumShoppingPts += Math.floor(Math.max(0, total) / 300)
    }
    const totalPts = (referralSignupPoints||0) + sumShoppingPts

    return (
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">📈 績效積分來源（{month}）</div>
          <div>
            <Button variant="outline" size="sm" onClick={()=>{
              try {
                const headers = ['類型','日期','編號','金額','點數']
                const rows: any[] = []
                // 推薦註冊（逐筆）
                for (const r of referralSignupRows) {
                  const d = String(r.created_at||'').slice(0,10)
                  rows.push(['推薦註冊', d, String(codePref||''), '—', Number(r.points)||0])
                }
                // 購物明細
                for (const o of perfOrders) {
                  if (perfSelections[o.id] === false) continue
                  const total = calcOrderTotal(o)
                  const pts = Math.floor(Math.max(0, total) / 300)
                  const date = String(o.workCompletedAt||o.createdAt||'').slice(0,10)
                  rows.push(['會員購物', date, String(o.code||o.id), total, pts])
                }
                const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `performance_points_${month}.csv`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
              } catch {}
            }}>下載積分明細CSV</Button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded border bg-white p-3">
            <div className="text-sm text-gray-600">推薦註冊</div>
            {perfLoading ? (
              <div className="text-sm text-gray-500 mt-1">讀取中…</div>
            ) : (
              <div className="mt-1 text-sm">
                <div>當月人數：<span className="font-semibold">{referralSignupCount}</span></div>
                <div>積分：<span className="font-semibold text-emerald-700">+{referralSignupPoints}</span></div>
              </div>
            )}
          </div>
          <div className="md:col-span-2 rounded border bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm text-gray-600">會員購物（每 NT$300 = 1 點）</div>
              <div className="text-sm">合計：<span className="font-bold text-emerald-700">{sumShoppingPts}</span> 點</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600">
                    <th className="px-2 py-2 text-left">結案日</th>
                    <th className="px-2 py-2 text-left">訂單編號</th>
                    <th className="px-2 py-2 text-right">訂單金額</th>
                    <th className="px-2 py-2 text-right">點數</th>
                    <th className="px-2 py-2 text-center">納入</th>
                  </tr>
                </thead>
                <tbody>
                  {perfOrders.length === 0 ? (
                    <tr><td className="px-2 py-3" colSpan={5}>本月無符合推薦碼的訂單</td></tr>
                  ) : (
                    perfOrders.map((o:any) => {
                      const total = calcOrderTotal(o)
                      const pts = Math.floor(Math.max(0, total) / 300)
                      const date = String(o.workCompletedAt||o.createdAt||'').slice(0,10)
                      return (
                        <tr key={`perf-${o.id}`} className="border-b last:border-0">
                          <td className="px-2 py-2">{date}</td>
                          <td className="px-2 py-2">{o.code || o.id}</td>
                          <td className="px-2 py-2 text-right">${total.toLocaleString()}</td>
                          <td className="px-2 py-2 text-right">{pts}</td>
                          <td className="px-2 py-2 text-center">
                            <input type="checkbox" checked={perfSelections[o.id] !== false} onChange={(e)=> setPerfSelections(prev=> ({ ...prev, [o.id]: e.target.checked }))} />
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <div className="mr-auto text-sm">總積分（推薦+購物）：<span className="font-bold text-emerald-700">{totalPts}</span></div>
          <Button variant="outline" onClick={()=>{ setPerfSelections({}); }}>重設</Button>
          <Button onClick={()=> setEditingRecord(r => ({ ...(r as PayrollRecord), points: totalPts }))}>套用到本筆積分</Button>
        </div>
      </Card>
    )
  }

  // 匯出技師對帳 CSV（已勾選的訂單）
  const exportTechOrdersCSV = () => {
    try {
      const headers = ['結案日','訂單編號','服務數量','整張訂單金額','技師數','分攤基礎','分潤%','分潤金額','方案','保底']
      const rate = Math.max(0, Math.min(100, shareRate)) / 100
      const rows: any[] = []
      for (const o of techOrders) {
        if (techSelections[o.id] === false) continue
        const totalRaw = Number((o as any).totalAmount ?? (o as any).total ?? 0)
        const sumItems = (o.serviceItems||[]).reduce((s:number, it:any)=> s + (it.unitPrice||0)*(it.quantity||0), 0)
        const total = totalRaw > 0 ? totalRaw : sumItems
        const techCount = Array.isArray(o.assignedTechnicians) && o.assignedTechnicians.length>0 ? o.assignedTechnicians.length : 1
        const basis = total / techCount
        const commission = Math.round(basis * rate)
        const date = String(o.workCompletedAt||o.createdAt||'').slice(0,10)
        const units = summarizeServiceUnits(o.serviceItems||[])
        const scheme = shareScheme==='pure' ? `純分潤(${shareRate||'自訂'}%)` : `保底(${baseGuarantee})+超額×${shareRate}%`
        rows.push([date, (o.code||o.id), units, total, techCount, Math.round(basis), `${shareRate}%`, commission, scheme, baseGuarantee])
      }
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tech_orders_${month}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch(e) {
      console.error('CSV 匯出失敗:', e)
    }
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
        <h1 className="text-2xl font-bold">{isTechnician ? '我的薪資' : '薪資管理'}</h1>
        <div className="flex items-center space-x-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
          {!isTechnician && (
            <>
          <Select value={roleFilter} onChange={(e)=>setRoleFilter(e.target.value as any)} className="w-36">
            <option value="all">全部</option>
            <option value="support">客服/管理員</option>
            <option value="sales">業務</option>
            <option value="technician">技師</option>
          </Select>
              <Select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value as any)} className="w-32">
                <option value="all">所有狀態</option>
                <option value="pending">待確認</option>
                <option value="confirmed">已確認</option>
              </Select>
          <Input placeholder="搜尋姓名/Email" value={search} onChange={(e)=>setSearch(e.target.value)} className="w-48" />
            </>
          )}
          {can(user, 'admin') && (
            <>
              <Button variant="outline" onClick={exportCSV}>匯出 CSV</Button>
              <Button variant="outline" onClick={exportAllPayoutCSV}>匯出全員中信CSV</Button>
              <Button onClick={() => setShowBulkEditModal(true)}>快速編輯</Button>
            </>
          )}
        </div>
      </div>

      {!isTechnician && (
      <div className="flex items-center gap-2">
        <Tab to="/payroll/support" label="客服/管理員" />
        <Tab to="/payroll/sales" label="業務" />
        <Tab to="/payroll/technician" label="技師" />
      </div>
      )}

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

      {/* 內嵌編輯器 / 我的薪資明細（非管理員）*/}
      {can(user, 'admin') ? renderInlineEditor() : renderMySalaryDetails()}

      {/* 發放區塊 */}
      {editingRecord && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">💸 薪資發放</div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500">（依平台自動帶出日期）</div>
              <Button variant="outline" size="sm" onClick={()=> exportPayoutCSV(editingRecord)}>匯出中信CSV</Button>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-600">
                  <th className="px-2 py-2 text-left">發放日期</th>
                  <th className="px-2 py-2 text-left">姓名</th>
                  <th className="px-2 py-2 text-left">銀行</th>
                  <th className="px-2 py-2 text-left">帳號</th>
                  <th className="px-2 py-2 text-right">金額</th>
                  <th className="px-2 py-2 text-left">備註</th>
                </tr>
              </thead>
              <tbody>
                {buildPayoutRows(editingRecord as any).map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-2 py-2">{row.date}</td>
                    <td className="px-2 py-2">{row.name}</td>
                    <td className="px-2 py-2">{row.bankCode} {row.bankName}</td>
                    <td className="px-2 py-2">{row.account}</td>
                    <td className="px-2 py-2 text-right">${row.amount.toLocaleString()}</td>
                    <td className="px-2 py-2">{row.note||''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 管理員：薪資總覽表（詳情可展開） */}
      {renderAdminTable()}

      {/* 記錄列表（依角色顯示） */}
      <div className="space-y-4">
        {!showHistory ? null : filteredRecords.map((record) => {
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
        {(!showHistory && filteredRecords.length>0) && (
          <div className="text-center text-gray-500 py-6">
            已隱藏歷史清單
          </div>
        )}
        {filteredRecords.length === 0 && (
          <div className="text-center text-gray-500 py-8">本月暫無薪資記錄</div>
        )}
      </div>

      {/* 歷史清單切換 */}
      <div className="text-center">
        <Button variant="outline" onClick={()=> setShowHistory(s=>!s)}>{showHistory ? '隱藏歷史清單' : '顯示歷史清單'}</Button>
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


