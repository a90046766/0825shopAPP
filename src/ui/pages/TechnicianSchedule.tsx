import { useEffect, useMemo, useRef, useState } from 'react'
import { loadAdapters } from '../../adapters'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { authRepo } from '../../adapters/local/auth'
import Calendar from '../components/Calendar'
import { overlaps } from '../../utils/time'
import { formatServiceQuantity } from '../../utils/serviceQuantity'
import { extractLocationFromAddress } from '../../utils/location'

export default function TechnicianSchedulePage() {
  const [leaves, setLeaves] = useState<any[]>([])
  const [techs, setTechs] = useState<any[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [works, setWorks] = useState<any[]>([])
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId') || ''
  const date = searchParams.get('date') || new Date().toISOString().slice(0,10)
  const start = searchParams.get('start') || '09:00'
  const end = searchParams.get('end') || '12:00'
  const getCurrentUser = () => {
    try { const s = localStorage.getItem('supabase-auth-user'); if (s) return JSON.parse(s) } catch {}
    try { const l = localStorage.getItem('local-auth-user'); if (l) return JSON.parse(l) } catch {}
    return authRepo.getCurrentUser()
  }
  const user = getCurrentUser()
  const [view, setView] = useState<'month' | 'week'>('month')
  const [supportOpen, setSupportOpen] = useState(false)
  const [supportDate, setSupportDate] = useState(date)
  const [supportSlot, setSupportSlot] = useState<'am' | 'pm' | 'full'>('am')
  const [supportType, setSupportType] = useState<'排休' | '特休' | '事假' | '婚假' | '病假' | '喪假'>('排休')
  const [supportShifts, setSupportShifts] = useState<any[]>([])
  const [staffMap, setStaffMap] = useState<Record<string, any>>({})
  const [staffList, setStaffList] = useState<any[]>([])
  const [selectedSupportEmail, setSelectedSupportEmail] = useState<string>('')
  const [selectedTechEmail, setSelectedTechEmail] = useState<string>('')
  const [leaveListMonth, setLeaveListMonth] = useState<string>(new Date().toISOString().slice(0,7))
  const [leavesList, setLeavesList] = useState<any[]>([])
  const [workMarkers, setWorkMarkers] = useState<Record<string, number>>({})
  const [emphasisMarkers, setEmphasisMarkers] = useState<Record<string, 'warn' | 'danger'>>({})
  const [dayTooltips, setDayTooltips] = useState<Record<string, string>>({})
  const [skillFilter, setSkillFilter] = useState<Record<string, boolean>>({})
  const [skillMode, setSkillMode] = useState<'all'|'any'>('all')
  const [selectedRegion, setSelectedRegion] = useState<'north' | 'central' | 'south' | 'all'>('all')
  const SKILLS: Array<[string,string]> = [
    ['acStandard','分離式冷氣'],
    ['washerStandard','直立洗衣機'],
    ['acSpecial','特殊分離式'],
    ['hoodStandard','一般抽油煙機'],
    ['hoodHidden','隱藏抽油煙機'],
    ['stainlessTank','不鏽鋼水塔'],
    ['concreteTank','水泥水塔'],
    ['concealedAC','吊隱式冷氣'],
    ['concealedACSpecial','吊隱特殊'],
    ['pipe','管路施工'],
    ['washerDrum','滾筒洗衣機'],
  ]
  // 月份結束日：e.g. '2025-09' -> '2025-09-30'
  const monthEnd = (yymm: string) => {
    const [y, m] = yymm.split('-').map(n => parseInt(n, 10))
    const last = new Date(y, m, 0).getDate()
    return `${yymm}-${String(last).padStart(2, '0')}`
  }
  const [techLeaveOpen, setTechLeaveOpen] = useState(false)
  const [techLeaveDate, setTechLeaveDate] = useState(date)
  const [techLeaveSlot, setTechLeaveSlot] = useState<'am' | 'pm' | 'full'>('am')
  const [techLeaveType, setTechLeaveType] = useState<'排休' | '特休' | '事假' | '婚假' | '病假' | '喪假'>('排休')
  const [techLeaveEmail, setTechLeaveEmail] = useState('')
  const [submittingLeave, setSubmittingLeave] = useState(false)

  const navigate = useNavigate()
  const [hoverDate, setHoverDate] = useState<string>('')
  const [hoverOrders, setHoverOrders] = useState<Record<string, any>>({})
  const [dateOrdersMap, setDateOrdersMap] = useState<Record<string, any>>({})
  const [dayOrders, setDayOrders] = useState<any[]>([])

  const [repos, setRepos] = useState<any>(null)
  const [appSettings, setAppSettings] = useState<{ autoDispatchEnabled?: boolean; autoDispatchMinScore?: number; reviewBonusPoints?: number } | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  useEffect(()=>{ (async()=>{ const a = await loadAdapters(); setRepos(a) })() },[])
  useEffect(() => {
    if(!repos) return
    ;(async()=>{
      try { const s = await repos.settingsRepo.get(); setAppSettings(s) } catch {}
    })()
    ;(async()=>{
      try {
        const start = new Date()
        const end = new Date()
        end.setDate(end.getDate() + 30)
        const s = start.toISOString().slice(0, 10)
        const e = end.toISOString().slice(0, 10)
        const rows = await repos.scheduleRepo.listTechnicianLeaves({ start: s, end: e })
        if (user?.role==='technician') {
          const emailLc = (user.email||'').toLowerCase(); setLeaves(rows.filter((r:any) => (r.technicianEmail||'').toLowerCase()===emailLc))
        } else {
          setLeaves(rows)
        }
      } catch (e) { console.warn('init leaves load failed', e) }
      try {
        const rows = await repos.technicianRepo.list()
        // 技師角色：避免載入全部訂單做評分統計，直接使用清單即可（大幅減少查詢量）
        if (user?.role === 'technician') {
          setTechs(rows.filter((t:any) => (t.email||'').toLowerCase()===(user.email||'').toLowerCase()))
        } else {
          // 管理／客服：計算平均評分與樣本數（可能較重，僅在需要時執行）
          let enriched = rows
          try {
            const orders = await repos.orderRepo.list()
            const byName: Record<string, { sum: number; count: number }> = {}
            for (const o of orders || []) {
              const sig: any = (o as any).signatures || {}
              const r: any = sig.rating
              if (!r || typeof r.score !== 'number') continue
              const score = Math.max(0, Math.min(100, Number(r.score)))
              const names: string[] = []
              if ((o as any).signatureTechnician) names.push((o as any).signatureTechnician)
              if (Array.isArray((o as any).assignedTechnicians)) {
                for (const n of (o as any).assignedTechnicians) {
                  if (n && !names.includes(n)) names.push(n)
                }
              }
              for (const name of names) {
                const key = String(name || '').trim()
                if (!key) continue
                if (!byName[key]) byName[key] = { sum: 0, count: 0 }
                byName[key].sum += score
                byName[key].count += 1
              }
            }
            enriched = rows.map((t: any) => {
              const key = String(t.shortName || t.name || '').trim()
              const agg = byName[key]
              if (agg && agg.count > 0) {
                const avg = Math.round(agg.sum / agg.count)
                return { ...t, ratingAvg: avg, ratingCount: agg.count }
              }
              return t
            })
          } catch {}
          setTechs(enriched)
        }
      } catch (e) { console.warn('tech list load failed', e) }
      try {
        const staffRows = await repos.staffRepo.list()
        const map: Record<string, any> = {}
        for (const s of staffRows||[]) map[(s.email||'').toLowerCase()] = s
        setStaffMap(map)
        setStaffList(staffRows||[])
        // 預設：客服看到自己；管理員預設顯示全部（空值）
        if (user?.role==='support') setSelectedSupportEmail((user.email||'').toLowerCase())
      } catch (e) { console.warn('staff list load failed', e) }
    })()
  }, [repos])

  // 依月份載入工單占用，並建立月曆徽章
  const lastLoadedMonthKeyRef = useRef<string>('')
  const monthLoadingRef = useRef<boolean>(false)
  const monthCacheRef = useRef<{ key: string; works: any[]; leaves: any[] } | null>(null)
  useEffect(() => {
    const yymm = date.slice(0, 7)
    const startMonth = `${yymm}-01`
    const endMonth = monthEnd(yymm)
    if(!repos) return
    const key = `${startMonth}_${endMonth}`
    if (monthCacheRef.current && monthCacheRef.current.key === key){
      const ws = monthCacheRef.current.works
      const ls = monthCacheRef.current.leaves
      let filteredWorks = ws
      if (user?.role === 'technician') {
        const userEmail = (user.email || '').toLowerCase()
        filteredWorks = ws.filter((w: any) => (w.technicianEmail || '').toLowerCase() === userEmail)
      }
      setWorks(filteredWorks)
      setLeaves(ls)
      return
    }
    if (monthLoadingRef.current) return
    monthLoadingRef.current = true
    ;(async()=>{
      try {
        const [ws, ls]: any[] = await Promise.all([
          repos.scheduleRepo.listWork({ start: startMonth, end: endMonth }),
          repos.scheduleRepo.listTechnicianLeaves({ start: startMonth, end: endMonth })
        ])
        // 技師只能看到自己的工單
        let filteredWorks = ws
        if (user?.role === 'technician') {
          const userEmail = (user.email || '').toLowerCase()
          filteredWorks = ws.filter((w: any) => (w.technicianEmail || '').toLowerCase() === userEmail)
        }
        setWorks(filteredWorks)
        monthCacheRef.current = { key, works: ws, leaves: ls }
        const map: Record<string, number> = {}
        const overlapCount: Record<string, number> = {}
        const leaveCount: Record<string, number> = {}
        for (const w of filteredWorks) {
          map[w.date] = (map[w.date] || 0) + 1
          if (overlaps(w.startTime, w.endTime, start, end)) overlapCount[w.date] = (overlapCount[w.date] || 0) + 1
        }
        for (const l of ls) leaveCount[l.date] = (leaveCount[l.date] || 0) + 1
        const emph: Record<string, 'warn' | 'danger'> = {}
        Object.keys(overlapCount).forEach(d => { const c = overlapCount[d]; emph[d] = c >= 5 ? 'danger' : 'warn' })
        const tips: Record<string, string> = {}
        const days = new Set([...Object.keys(map), ...Object.keys(leaveCount)])
        days.forEach(d => { 
          const w = map[d] || 0; 
          const l = leaveCount[d] || 0; 
          if (user?.role === 'technician') {
            tips[d] = `我的工單 ${w}、請假 ${l}`
          } else {
            tips[d] = `工單 ${w}、請假 ${l}`
          }
        })
        setWorkMarkers(map)
        setEmphasisMarkers(emph)
        setDayTooltips(tips)
        lastLoadedMonthKeyRef.current = key
      } catch (e) {
        console.warn('month load failed', e)
      } finally {
        monthLoadingRef.current = false
      }
    })()
  }, [date, start, end, repos, user])

  // 當 hoverDate 變更時，補取當日工單細節（數量用）
  useEffect(() => {
    (async () => {
      if (!repos || !hoverDate) { setDayOrders([]); return }
      const ids = Array.from(new Set(works.filter(w=>w.date===hoverDate).map(w=>w.orderId))).filter(Boolean)
      const miss = ids.filter(id => !hoverOrders[id])
      let next = { ...hoverOrders }
      if (miss.length > 0) {
        const pairs = await Promise.all(miss.map(async (id) => { try { const o = await repos.orderRepo.get(id); return [id, o] as const } catch { return [id, null] as const } }))
        for (const [id, o] of pairs) if (o) next[id] = o
        setHoverOrders(next)
      }
      setDayOrders(ids.map(id => next[id]).filter(Boolean) as any[])
    })()
  }, [hoverDate, works, repos])

  // 依「目前選定日期」載入該日涉及的訂單，用於過濾舊的 work 紀錄（避免不可指派誤判）
  useEffect(()=>{
    (async()=>{
      try{
        if (!repos) return
        const ids = Array.from(new Set(works.filter(w=>w.date===date).map(w=>w.orderId))).filter(Boolean)
        if (ids.length===0) { setDateOrdersMap({}); return }
        const pairs = await Promise.all(ids.map(async (id:string)=>{ try{ const o=await repos.orderRepo.get(id); return [id,o] as const }catch{ return [id,null] as const } }))
        const map: Record<string, any> = {}
        for (const [id,o] of pairs) if (o) map[id]=o
        setDateOrdersMap(map)
      }catch{}
    })()
  }, [repos, works, date])

  // 以實際訂單指派過濾當日占用，避免誤將已改派的技師列為不可指派
  const effectiveWorksForDate = ((): any[] => {
    try{
      return works.filter((w:any)=>{
        if (w.date !== date) return true
        const o = dateOrdersMap[w.orderId]
        // 訂單不存在 → 視為無效占用（忽略）
        if (!o) return false
        // 訂單日期已調整 → 視為無效占用
        if (o.preferredDate && o.preferredDate !== date) return false
        const emailLc = String(w.technicianEmail||'').toLowerCase()
        const t = techs.find((x:any)=> String(x.email||'').toLowerCase()===emailLc)
        const name = t?.name || ''
        const included = Array.isArray(o.assignedTechnicians) ? o.assignedTechnicians.includes(name) : false
        if (!included) return false
        // 僅在時間有重疊時才視為有效占用
        return overlaps(w.startTime, w.endTime, start, end)
      })
    }catch{return works}
  })()

  // 背景清理：自動刪除當日無效占用（僅限管理員/客服）
  useEffect(() => {
    (async()=>{
      try{
        if(!repos) return
        if (!user || (user.role!=='admin' && user.role!=='support')) return
        const todays = works.filter((w:any)=> w.date===date)
        if (todays.length===0) return
        const invalid = todays.filter((w:any)=>{
          const o = dateOrdersMap[w.orderId]
          if (!o) return true
          if (o.preferredDate && o.preferredDate !== date) return true
          const emailLc = String(w.technicianEmail||'').toLowerCase()
          const t = techs.find((x:any)=> String(x.email||'').toLowerCase()===emailLc)
          const name = t?.name || ''
          const included = Array.isArray(o.assignedTechnicians) ? o.assignedTechnicians.includes(name) : false
          if (!included) return true
          return !overlaps(w.startTime, w.endTime, start, end)
        })
        for (const w of invalid) {
          try { await repos.scheduleRepo.removeWork(w.id) } catch {}
        }
        if (invalid.length>0) {
          // 重新整理當月資料
          await refreshMonth(date.slice(0,7))
        }
      } catch {}
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repos, user?.role, works, date, start, end, JSON.stringify(dateOrdersMap), techs.length])

  useEffect(() => {
    // 只有管理員和客服可以看到客服排班，技師完全看不到
    if(!repos) return
    const role = user?.role
    const emailLc = (user?.email || '').toLowerCase()
    if (!role) return
    if (role === 'technician') {
      setSupportShifts([]) // 技師看不到客服排班
      return
    }
    const yymm = (supportDate || new Date().toISOString().slice(0,10)).slice(0,7)
    const startMonth = `${yymm}-01`
    const endMonthStr = monthEnd(yymm)
    repos.scheduleRepo.listSupport({ start: startMonth, end: endMonthStr }).then((rows:any[]) => {
      if (role === 'admin') setSupportShifts(rows)
      else {
        const mine = rows.filter((r:any) => r.supportEmail && String(r.supportEmail).toLowerCase() === emailLc)
        setSupportShifts(mine)
      }
    }).catch((e:any)=>{
      console.warn('listSupport failed', e)
    })
  }, [repos, supportDate, user?.role, user?.email])

  useEffect(()=>{
    (async()=>{
      if (!repos) return
      if (!selectedTechEmail) { setLeavesList([]); return }
      const startMonth = `${leaveListMonth}-01`
      const endMonthStr = monthEnd(leaveListMonth)
      try {
        const rows = await repos.scheduleRepo.listTechnicianLeaves({ start: startMonth, end: endMonthStr })
        const emailLc = selectedTechEmail.toLowerCase()
        setLeavesList((rows||[]).filter((l:any)=> String(l.technicianEmail||'').toLowerCase()===emailLc))
      } catch { setLeavesList([]) }
    })()
  }, [repos, selectedTechEmail, leaveListMonth])

  // 將客服排班名稱併入當月日曆 tooltip（管理員/客服可見）
  useEffect(() => {
    if (!user) return
    if (user.role === 'technician') return
    const yymm = date.slice(0,7)
    const monthStart = `${yymm}-01`
    const monthEndStr = monthEnd(yymm)
    const inMonth = (d: string) => d >= monthStart && d <= monthEndStr
    const namesByDate: Record<string, string[]> = {}
    for (const s of supportShifts || []) {
      const d = String(s.date||'').slice(0,10)
      if (!d || !inMonth(d)) continue
      const emailLc = String(s.supportEmail||'').toLowerCase()
      const name = staffMap[emailLc]?.name || s.supportEmail || ''
      if (!name) continue
      if (!namesByDate[d]) namesByDate[d] = []
      if (!namesByDate[d].includes(name)) namesByDate[d].push(name)
    }
    if (Object.keys(namesByDate).length===0) return
    setDayTooltips(prev => {
      // 先移除既有 tooltip 中以「客服：」開頭的行，避免重覆堆疊
      const next: Record<string, string> = {}
      for (const [d, text] of Object.entries(prev || {})) {
        const base = String(text || '')
          .split('\n')
          .filter(line => line.trim() && !line.startsWith('客服：'))
          .join('\n')
          .trim()
        if (base) next[d] = base
      }
      for (const [d, arr] of Object.entries(namesByDate)) {
        const label = `客服：${arr.join('、')}`
        next[d] = next[d] ? `${next[d]}\n${label}` : label
      }
      return next
    })
  }, [supportShifts, staffMap, user, date])

  // 重新整理指定月份的工單與休假，並刷新日曆徽章與不可指派依據
  const refreshMonth = async (yymm?: string) => {
    if (!repos) return
    const yymmKey = yymm || date.slice(0,7)
    const startMonth = `${yymmKey}-01`
    const endMonthStr = monthEnd(yymmKey)
    try {
      const [ws, ls] = await Promise.all([
        repos.scheduleRepo.listWork({ start: startMonth, end: endMonthStr }),
        repos.scheduleRepo.listTechnicianLeaves({ start: startMonth, end: endMonthStr })
      ])
      let filteredWorks = ws
      if (user?.role === 'technician') {
        const emailLc = (user.email || '').toLowerCase()
        filteredWorks = ws.filter((w: any) => (w.technicianEmail || '').toLowerCase() === emailLc)
        setLeaves(ls.filter((l:any)=> String(l.technicianEmail||'').toLowerCase() === emailLc))
      } else {
        setLeaves(ls)
      }
      setWorks(filteredWorks)

      const map: Record<string, number> = {}
      const overlapCount: Record<string, number> = {}
      const leaveCount: Record<string, number> = {}
      for (const w of filteredWorks) {
        map[w.date] = (map[w.date] || 0) + 1
        if (overlaps(w.startTime, w.endTime, start, end)) overlapCount[w.date] = (overlapCount[w.date] || 0) + 1
      }
      const visibleLeaves = (user?.role==='technician') ? (ls.filter((x:any)=> String(x.technicianEmail||'').toLowerCase()===(user?.email||'').toLowerCase())) : ls
      for (const l of visibleLeaves) leaveCount[l.date] = (leaveCount[l.date] || 0) + 1
      const emph: Record<string, 'warn' | 'danger'> = {}
      Object.keys(overlapCount).forEach(d => { const c = overlapCount[d]; emph[d] = c >= 5 ? 'danger' : 'warn' })
      const tips: Record<string, string> = {}
      const days = new Set([...Object.keys(map), ...Object.keys(leaveCount)])
      days.forEach(d => {
        const w = map[d] || 0
        const l = leaveCount[d] || 0
        if (user?.role === 'technician') tips[d] = `我的工單 ${w}、請假 ${l}`
        else tips[d] = `工單 ${w}、請假 ${l}`
      })
      setWorkMarkers(map)
      setEmphasisMarkers(emph)
      setDayTooltips(tips)
    } catch {}
  }

  const assignable = useMemo(() => {
    // 可用性：無請假且無工單重疊，且符合區域篩選
    const selectedKeys = Object.keys(skillFilter).filter(k => skillFilter[k])
    return techs.filter(t => {
      // 區域篩選
      if (selectedRegion !== 'all' && t.region !== selectedRegion && t.region !== 'all') {
        return false
      }
      
      const emailLc = (t.email || '').toLowerCase()
      const hasLeave = leaves.some(l => {
        const okTech = String(l.technicianEmail||'').toLowerCase() === emailLc
        const okDate = l.date === date
        if (!okTech || !okDate) return false
        if (l.fullDay) return true
        const startT = l.startTime || '00:00'
        const endT = l.endTime || '23:59'
        return overlaps(startT, endT, start, end)
      })
      if (hasLeave) return false
      const hasOverlap = effectiveWorksForDate.some(w => ((w.technicianEmail || '').toLowerCase() === emailLc) && w.date === date && overlaps(w.startTime, w.endTime, start, end))
      if (hasOverlap) return false
      if (selectedKeys.length > 0) {
        const skills = t.skills || {}
        if (skillMode === 'all') {
          for (const key of selectedKeys) if (!skills[key]) return false
        } else {
          let ok = false
          for (const key of selectedKeys) if (skills[key]) { ok = true; break }
          if (!ok) return false
        }
      }
      return true
    })
  }, [techs, leaves, works, date, start, end, skillFilter, skillMode, selectedRegion])

  const unavailable = useMemo(() => {
    return techs
      .map(t => {
        const emailLc = (t.email || '').toLowerCase()
        const leave = leaves.find(l => (l.technicianEmail || '').toLowerCase() === emailLc && l.date === date)
        if (leave) return { t, reason: '請假' }
        const conflicts = effectiveWorksForDate.filter(w => ((w.technicianEmail || '').toLowerCase() === emailLc) && w.date === date && overlaps(w.startTime, w.endTime, start, end))
        if (conflicts.length > 0) {
          const first = conflicts[0]
          return { t, reason: `重疊 ${first.startTime}~${first.endTime}` }
        }
        return { t, reason: '' }
      })
      .filter(x => x.reason && !assignable.find(a => a.id === x.t.id))
  }, [techs, leaves, works, date, start, end, assignable])

  // 建議順序（依評分高→當日負荷少）
  const recommended = useMemo(() => {
    const countWorks = (emailLc: string) => effectiveWorksForDate.filter(w => (w.technicianEmail||'').toLowerCase()===emailLc && w.date===date).length
    const score = (t:any) => typeof t.rating_override === 'number' ? t.rating_override : (typeof t.ratingAvg==='number' ? t.ratingAvg : 80)
    return [...assignable]
      .map(t => ({ t, s: score(t), load: countWorks((t.email||'').toLowerCase()) }))
      .sort((a,b)=> b.s - a.s || a.load - b.load)
      .map(x=> x.t)
  }, [assignable, effectiveWorksForDate, date])

  const toggleSelect = (id: string) => setSelected(s => ({ ...s, [id]: !s[id] }))
  const emailToTech = useMemo(()=>{
    const map: Record<string, any> = {}
    for (const t of techs) map[(t.email||'').toLowerCase()] = t
    return map
  }, [techs])

  const handleAssign = async () => {
    if (!repos || !orderId) return
    
    const selectedTechs = Object.keys(selected).filter(k => selected[k])
    if (selectedTechs.length === 0) {
      alert('請選擇至少一名技師')
      return
    }

    try {
      // 雙向更新：以目前再指派頁的日期/時段為準，回寫到訂單
      try {
        await repos.orderRepo.update(orderId, { preferredDate: date, preferredTimeStart: start, preferredTimeEnd: end })
      } catch {}

      // 將技師 ID 轉換為技師名稱與 Email
      const selectedTechInfos = selectedTechs.map(techId => {
        const tech = techs.find(t => t.id === techId)
        return { name: tech ? tech.name : techId, email: (tech?.email || '').toLowerCase() }
      })

      // 更新訂單的指派技師（名稱）
      await repos.orderRepo.update(orderId, { assignedTechnicians: selectedTechInfos.map(i=>i.name) })

      // 同步寫入工作記錄（避免重疊由前端篩選保障）
      for (const info of selectedTechInfos) {
        try {
          await repos.scheduleRepo.saveWork({
            technicianEmail: info.email,
            date,
            startTime: start,
            endTime: end,
            orderId
          })
        } catch {}
      }
      alert('已指派，返回訂單選擇簽名技師')
      navigate(`/orders/${orderId}`)
    } catch (error) {
      console.error('指派失敗:', error)
      alert('指派失敗：' + (error as any)?.message || '未知錯誤')
    }
  }

  return (
    <div className="space-y-6">
      {/* 技師角色：簡化介面，只顯示自己的排班 */}
      {user?.role === 'technician' ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">我的排班</h2>
              <button 
                onClick={() => setTechLeaveOpen(true)}
                className="rounded bg-brand-500 px-3 py-1 text-white text-sm"
              >
                申請休假
              </button>
            </div>
            
            {/* 月曆顯示 */}
            <div className="mt-4">
              <Calendar
                value={date}
                onChange={(newDate) => {
                  try {
                    const qp = new URLSearchParams()
                    qp.set('date', newDate)
                    if (orderId) qp.set('orderId', orderId)
                    if (start) qp.set('start', start)
                    if (end) qp.set('end', end)
                    navigate(`/schedule?${qp.toString()}`)
                  } catch {
                    navigate(`/schedule?date=${newDate}`)
                  }
                }}
                onMonthChange={async (year, month) => {
                  const yymm = `${year}-${String(month + 1).padStart(2, '0')}`
                  const startMonth = `${yymm}-01`
                  const endMonth = monthEnd(yymm)
                  if(!repos) return
                  const [ws, ls] = await Promise.all([
                    repos.scheduleRepo.listWork({ start: startMonth, end: endMonth }),
                    repos.scheduleRepo.listTechnicianLeaves({ start: startMonth, end: endMonth })
                  ])
                  // 技師視角：切月時僅看自己的資料；管理員/客服顯示全部
                  const isTech = user?.role === 'technician'
                  setWorks(isTech ? ws.filter((w:any)=> (w.technicianEmail||'').toLowerCase() === (user?.email||'').toLowerCase()) : ws)
                  if (isTech) {
                    const userEmail = (user?.email || '').toLowerCase()
                    setLeaves(ls.filter((l: any) => (l.technicianEmail || '').toLowerCase() === userEmail))
                  } else {
                    setLeaves(ls)
                  }
                  monthCacheRef.current = { key: `${startMonth}_${endMonth}`, works: ws, leaves: ls }
                }}
                markers={workMarkers}
                emphasis={emphasisMarkers}
                tooltips={dayTooltips}
                onDayHover={setHoverDate}
                onDayLeave={() => setHoverDate('')}
              />
            </div>
            
            {/* 當日概覽（固定顯示，點日期更新） */}
            {hoverDate && (
              <div className="mt-4 rounded-lg border bg-gray-50 p-3">
                <div className="mb-2 font-semibold">當日概覽 - {hoverDate}</div>
                <div className="space-y-2 text-sm">
                  {/* 已指派工單 */}
                  <div>
                    <div className="font-medium text-gray-700">已指派工單：</div>
                    {dayOrders.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {dayOrders.map((order: any, i: number) => (
                          <div key={i} className="rounded bg-white p-2 text-xs cursor-pointer hover:bg-gray-50" onClick={()=> navigate(`/orders/${order.id}`)}>
                            <div className="font-semibold">工單：{order.id}</div>
                            <div>時間：{order.preferredTimeStart} - {order.preferredTimeEnd}</div>
                            <div>地區：{(() => { const loc = extractLocationFromAddress(order.customerAddress||''); return (loc.city||'') + (loc.district||'') || '—' })()}</div>
                            <div>數量：{formatServiceQuantity(order.serviceItems || [])}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500">無指派工單</div>
                    )}
                  </div>
                  
                  {/* 技師視角不顯示其他技師清單，避免資訊外洩並提升渲染效能 */}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // 管理員/客服：完整功能
        <div className="space-y-6">
          {/* 原有的完整功能保持不變 */}
          <div className="rounded-2xl bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">技師排班管理</h2>
              <div className="flex gap-2">
                <button onClick={() => setTechLeaveOpen(true)} className="rounded bg-brand-500 px-3 py-1 text-white text-sm">技師休假</button>
                <button onClick={() => setSupportOpen(true)} className="rounded bg-blue-500 px-3 py-1 text-white text-sm">客服排班</button>
              </div>
            </div>
            
            {/* 月曆顯示 */}
            <div className="mt-4">
              <Calendar
                value={date}
                onChange={(newDate) => { 
                  setHoverDate(newDate);
                  try {
                    const qp = new URLSearchParams()
                    qp.set('date', newDate)
                    if (orderId) qp.set('orderId', orderId)
                    if (start) qp.set('start', start)
                    if (end) qp.set('end', end)
                    navigate(`/schedule?${qp.toString()}`)
                  } catch {
                    navigate(`/schedule?date=${newDate}`)
                  }
                }}
                onMonthChange={async (year, month) => {
                  const yymm = `${year}-${String(month + 1).padStart(2, '0')}`
                  const startMonth = `${yymm}-01`
                  const endMonth = monthEnd(yymm)
                  if(!repos) return
                  const [ws, ls] = await Promise.all([
                    repos.scheduleRepo.listWork({ start: startMonth, end: endMonth }),
                    repos.scheduleRepo.listTechnicianLeaves({ start: startMonth, end: endMonth })
                  ])
                  setWorks(ws)
                  const userEmail = user?.email?.toLowerCase()
                  setLeaves(ls.filter((l: any) => (l.technicianEmail || '').toLowerCase() === userEmail))
                }}
                markers={workMarkers}
                emphasis={emphasisMarkers}
                tooltips={dayTooltips}
                onDayHover={setHoverDate}
                onDayLeave={() => setHoverDate('')}
              />
            </div>
          </div>
        </div>
      )}

      {user?.role!=='technician' && (
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <div className="text-sm text-gray-500">以下為未在該時段請假的可用技師。可依區域和技能篩選；選擇多人後，回訂單頁指定簽名技師。</div>
        {/* 建議排序與自動指派 */}
        {recommended.length>0 && (
          <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs">
            <div className="mb-2 font-semibold">建議順序（高評分·低負荷優先）</div>
            <div className="flex flex-wrap gap-2">
              {recommended.slice(0,8).map(t=>{
                const s = typeof t.rating_override==='number'? t.rating_override : (typeof (t as any).ratingAvg==='number' ? (t as any).ratingAvg : 80)
                const load = works.filter(w=> (w.technicianEmail||'').toLowerCase()===(t.email||'').toLowerCase() && w.date===date).length
                const count = typeof (t as any).ratingCount==='number' ? (t as any).ratingCount : 0
                return <span key={t.id} className="rounded-full bg-white px-2 py-0.5 border text-gray-700">{t.shortName||t.name} · {(s/20).toFixed(1)}★ · {load}單 · {count}筆</span>
              })}
            </div>
            <div className="mt-2">
              <button
                disabled={!appSettings?.autoDispatchEnabled}
                onClick={()=>{
                  const MIN_SCORE = typeof appSettings?.autoDispatchMinScore === 'number' ? appSettings!.autoDispatchMinScore! : 80
                  const pick = recommended.find(t=> (typeof t.rating_override==='number'? t.rating_override : (typeof (t as any).ratingAvg==='number' ? (t as any).ratingAvg : 80)) >= MIN_SCORE)
                  if (!pick) { alert('沒有達到門檻的可自派技師'); return }
                  setSelected(s=> ({ ...Object.keys(s).reduce((m,k)=>{m[k]=false;return m},{} as any), [pick.id]: true }))
                  handleAssign()
                }}
                className={`rounded px-3 py-1 text-white text-xs ${appSettings?.autoDispatchEnabled? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-400 cursor-not-allowed'}`}
              >自動指派{appSettings?.autoDispatchEnabled? '' : '（已關閉）'}</button>
            </div>
          </div>
        )}
        
        {/* 區域篩選 */}
        <div className="mt-3 rounded-lg bg-blue-50 p-3 text-xs">
          <div className="mb-2 font-semibold">區域篩選</div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1">
              <input 
                type="radio" 
                name="region" 
                checked={selectedRegion === 'all'} 
                onChange={() => setSelectedRegion('all')} 
              />
              全部區域
            </label>
            <label className="flex items-center gap-1">
              <input 
                type="radio" 
                name="region" 
                checked={selectedRegion === 'north'} 
                onChange={() => setSelectedRegion('north')} 
              />
              北區
            </label>
            <label className="flex items-center gap-1">
              <input 
                type="radio" 
                name="region" 
                checked={selectedRegion === 'central'} 
                onChange={() => setSelectedRegion('central')} 
              />
              中區
            </label>
            <label className="flex items-center gap-1">
              <input 
                type="radio" 
                name="region" 
                checked={selectedRegion === 'south'} 
                onChange={() => setSelectedRegion('south')} 
              />
              南區
            </label>
          </div>
        </div>
        
        <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs">
          <div className="mb-2 font-semibold">技能篩選</div>
          <div className="mb-2 flex items-center gap-3">
            <label className="flex items-center gap-1"><input type="radio" name="mode" checked={skillMode==='all'} onChange={()=>setSkillMode('all')} />全部符合</label>
            <label className="flex items-center gap-1"><input type="radio" name="mode" checked={skillMode==='any'} onChange={()=>setSkillMode('any')} />至少一項</label>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {SKILLS.map(([key,label]) => (
              <label key={key} className="flex items-center gap-2">
                <input type="checkbox" checked={!!skillFilter[key]} onChange={e=>setSkillFilter(s=>({ ...s, [key]: e.target.checked }))} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div className="mt-2">
            <button onClick={()=>setSkillFilter({})} className="rounded bg-gray-200 px-2 py-1">清除</button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {recommended.map(t => {
            const selectedKeys = Object.keys(skillFilter).filter(k => skillFilter[k])
            return (
              <label key={t.id} className={`flex flex-col gap-1 rounded-xl border p-3 ${selected[t.id] ? 'border-brand-400' : ''}`}>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={!!selected[t.id]} onChange={() => toggleSelect(t.id)} />
                  <div>
                    <div className="font-semibold">{t.shortName || t.name}</div>
                    <div className="text-xs text-gray-400">{t.code}</div>
                    <div className="text-xs text-gray-500">{t.region === 'all' ? '全區' : `${t.region}區`} · {t.email}</div>
                  </div>
                </div>
                {selectedKeys.length>0 && (
                  <div className="ml-7 flex flex-wrap gap-1">
                    {selectedKeys.map(key=>{
                      const has = (t.skills||{})[key]
                      const label = (SKILLS.find(s=>s[0]===key)?.[1]) || key
                      return <span key={key} className={`rounded-full px-2 py-0.5 text-[10px] ${has? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{label}{has?'✓':'×'}</span>
                    })}
                  </div>
                )}
              </label>
            )
          })}
        </div>
        {unavailable.length>0 && (
          <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
            <div className="mb-1 font-semibold">不可指派（重疊/請假）</div>
            <div className="space-y-1">
              {unavailable.map(({t, reason}) => (
                <div key={t.id} className="flex items-center justify-between border-b border-amber-100 pb-1">
                  <div className="truncate">{t.name} <span className="text-gray-400">{t.code}</span></div>
                  <div>{reason}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
          <div className="mb-1 font-semibold">當日占用</div>
          {works.filter(w=>w.date===date).map((w,i)=>{
            const conflict = overlaps(w.startTime, w.endTime, start, end)
            const t = emailToTech[(w.technicianEmail||'').toLowerCase()]
            return (
              <div key={i} className={`flex items-center justify-between border-b py-1 ${conflict? 'text-rose-600' : ''}`} title={conflict? '與選定時段重疊' : ''}>
                <div className="truncate">{t ? `${t.shortName||t.name} (${t.code})` : w.technicianEmail} <span className="text-gray-400">#{w.orderId}</span></div>
                <div>{w.startTime}~{w.endTime}</div>
              </div>
            )
          })}
          {works.filter(w=>w.date===date).length===0 && <div>無</div>}
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={handleAssign} disabled={!orderId || Object.values(selected).every(v=>!v)} className="rounded-xl px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed bg-brand-500">確認指派</button>
          <Link to={`/orders/${orderId || 'O01958'}`} className="rounded-xl bg-gray-900 px-4 py-2 text-white">返回訂單</Link>
        </div>
      </div>
      )}

      {user?.role!=='technician' && (
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">內部排班/請假</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSupportOpen(o => !o)} className="rounded-lg bg-gray-100 px-3 py-1 text-sm">{supportOpen ? '收起' : '展開'}</button>
          </div>
        </div>
        {/* 自動派工與評分贈點 設定（僅管理端可見） */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded border p-3">
            <div className="font-semibold mb-2">自動派工</div>
            <label className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={!!appSettings?.autoDispatchEnabled} onChange={e=> setAppSettings(s=> ({ ...(s||{}), autoDispatchEnabled: e.target.checked }))} />
              <span>啟用自動派工</span>
            </label>
            <div className="flex items-center gap-2">
              <span>最低分數</span>
              <input type="number" min={0} max={100} value={typeof appSettings?.autoDispatchMinScore==='number'? appSettings!.autoDispatchMinScore! : 80} onChange={e=> setAppSettings(s=> ({ ...(s||{}), autoDispatchMinScore: Number(e.target.value) }))} className="w-20 rounded border px-2 py-1" />
            </div>
          </div>
          <div className="rounded border p-3">
            <div className="font-semibold mb-2">好評贈點</div>
            <div className="flex items-center gap-2">
              <span>贈點數</span>
              <input type="number" min={0} max={1000} value={typeof appSettings?.reviewBonusPoints==='number'? appSettings!.reviewBonusPoints! : 50} onChange={e=> setAppSettings(s=> ({ ...(s||{}), reviewBonusPoints: Number(e.target.value) }))} className="w-20 rounded border px-2 py-1" />
            </div>
          </div>
          <div className="rounded border p-3 flex items-end">
            <button disabled={!repos || savingSettings || !appSettings} onClick={async()=>{
              if(!repos || !appSettings) return
              try { setSavingSettings(true); await repos.settingsRepo.update(appSettings) ; alert('設定已儲存') } catch(e:any){ alert('儲存失敗：'+(e?.message||'')) } finally { setSavingSettings(false) }
            }} className={`rounded px-3 py-2 text-white text-xs ${savingSettings?'bg-gray-400':'bg-blue-600 hover:bg-blue-700'}`}>{savingSettings?'儲存中…':'儲存設定'}</button>
          </div>
        </div>
        {supportOpen && (
            <div className="mt-3 space-y-3">
            {/* 客服篩選 */}
            <div className="flex items-center gap-2 text-sm">
              <div className="text-gray-600">查看客服</div>
              <select className="rounded-lg border px-2 py-1" value={selectedSupportEmail} onChange={(e)=> setSelectedSupportEmail(e.target.value)}>
                <option value="">全部客服</option>
                {staffList.map(s => (
                  <option key={s.id} value={(s.email||'').toLowerCase()}>{s.name || s.email}</option>
                ))}
              </select>
            </div>
            <Calendar value={supportDate} onChange={setSupportDate} header="選擇日期" />
            <div className="flex items-center gap-3 text-sm">
              <div>
                <label className="mr-2 text-gray-600">時段</label>
                <select className="rounded-lg border px-2 py-1" value={supportSlot} onChange={(e) => setSupportSlot(e.target.value as any)}>
                  <option value="am">上午</option>
                  <option value="pm">下午</option>
                  <option value="full">全天</option>
                </select>
              </div>
              <div>
                <label className="mr-2 text-gray-600">假別</label>
                <select className="rounded-lg border px-2 py-1" value={supportType} onChange={(e) => setSupportType(e.target.value as any)}>
                  <option value="排休">排休</option>
                  <option value="特休">特休</option>
                  <option value="事假">事假</option>
                  <option value="婚假">婚假</option>
                  <option value="病假">病假</option>
                  <option value="喪假">喪假</option>
                </select>
              </div>
              <button onClick={async () => {
                if (!user) return
                const color = (type: string) => type==='排休'||type==='特休'? '#FEF3C7' : type==='事假'? '#DBEAFE' : type==='婚假'? '#FCE7F3' : type==='病假'? '#E5E7EB' : '#9CA3AF'
                if(!repos) return
                await repos.scheduleRepo.saveSupportShift({ supportEmail: user.email, date: supportDate, slot: supportSlot, reason: supportType, color: color(supportType) })
                const rows = await repos.scheduleRepo.listSupport()
                setSupportShifts(rows.filter((r:any) => r.supportEmail && r.supportEmail.toLowerCase() === user.email.toLowerCase()))
              }} className="rounded-xl bg-brand-500 px-4 py-2 text-white">新增</button>
            </div>
            <div className="space-y-2">
              {supportShifts
                .filter(s => (s.date || '').startsWith(supportDate.slice(0,7)))
                .filter(s => !selectedSupportEmail || (String(s.supportEmail||'').toLowerCase()===selectedSupportEmail))
                .map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: s.color || '#E5E7EB' }} />
                    <div>
                      {s.date} · {s.slot === 'full' ? '全天' : (s.slot === 'am' ? '上午' : '下午')} · {s.reason}
                      <span className="ml-2 text-gray-600">客服：{staffMap[(s.supportEmail||'').toLowerCase()]?.name || s.supportEmail}</span>
                    </div>
                  </div>
                  {(() => {
                    const allowed = (user?.role==='admin') || (String(s.supportEmail||'').toLowerCase() === String(user?.email||'').toLowerCase())
                    if (!allowed) return null
                    return (
                      <button
                        onClick={async()=>{
                          if (!repos) return
                          if (!confirm('確定刪除此客服/業務排班（休假）？')) return
                          try {
                            await repos.scheduleRepo.removeSupportShift(s.id)
                            // 重新載入當月清單與徽章
                            const yymm = (supportDate || new Date().toISOString().slice(0,10)).slice(0,7)
                            const startMonth = `${yymm}-01`
                            const endMonthStr = monthEnd(yymm)
                            const rows:any[] = await repos.scheduleRepo.listSupport({ start: startMonth, end: endMonthStr })
                            if (user?.role==='admin') setSupportShifts(rows)
                            else {
                              const emailLc = String(user?.email||'').toLowerCase()
                              setSupportShifts(rows.filter((r:any)=> String(r.supportEmail||'').toLowerCase()===emailLc))
                            }
                            await refreshMonth(yymm)
                          } catch (e:any) {
                            alert('刪除失敗：' + (e?.message || ''))
                          }
                        }}
                        className="rounded bg-rose-600 px-2 py-1 text-white"
                      >刪除</button>
                    )
                  })()}
                </div>
              ))}
              {supportShifts.length === 0 && <div className="text-gray-500">目前無排班資料</div>}
            </div>
          </div>
        )}
      </div>
      )}

      {/* 技師休假申請 Modal */}
      {techLeaveOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-card text-sm">
            <div className="mb-2 text-lg font-semibold">技師休假申請</div>
            <div className="space-y-3">
              {user?.role!=='technician' && (
                <div>
                  <div className="mb-1 text-gray-600">技師 Email</div>
                  <select className="w-full rounded border px-2 py-1" value={techLeaveEmail} onChange={e=>setTechLeaveEmail(e.target.value)}>
                    <option value="">請選擇</option>
                    {techs.map((t:any)=> (
                      <option key={t.id} value={(t.email||'').toLowerCase()}>{t.name}（{t.email}）</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <div className="mb-1 text-gray-600">日期</div>
                <input type="date" className="w-full rounded border px-2 py-1" value={techLeaveDate} onChange={e=>setTechLeaveDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1 text-gray-600">時段</div>
                  <select className="w-full rounded border px-2 py-1" value={techLeaveSlot} onChange={e=>setTechLeaveSlot(e.target.value as any)}>
                    <option value="am">上午</option>
                    <option value="pm">下午</option>
                    <option value="full">全天</option>
                  </select>
                </div>
                <div>
                  <div className="mb-1 text-gray-600">假別</div>
                  <select className="w-full rounded border px-2 py-1" value={techLeaveType} onChange={e=>setTechLeaveType(e.target.value as any)}>
                    <option value="排休">排休</option>
                    <option value="特休">特休</option>
                    <option value="事假">事假</option>
                    <option value="婚假">婚假</option>
                    <option value="病假">病假</option>
                    <option value="喪假">喪假</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=>setTechLeaveOpen(false)} className="rounded bg-gray-100 px-3 py-1">取消</button>
                <button type="button" disabled={submittingLeave} onClick={async()=>{
                  try {
                    if (!repos) return
                    setSubmittingLeave(true)
                    const color = (type: string) => type==='排休'||type==='特休'? '#FEF3C7' : type==='事假'? '#DBEAFE' : type==='婚假'? '#FCE7F3' : type==='病假'? '#E5E7EB' : '#9CA3AF'
                    const email = (user?.role==='technician' ? (user.email||'') : techLeaveEmail || '')
                    if (!email) { alert('請選擇技師'); return }
                    const isFull = techLeaveSlot==='full'
                    const startTime = isFull ? '00:00' : (techLeaveSlot==='am' ? '09:00' : '13:00')
                    const endTime = isFull ? '23:59' : (techLeaveSlot==='am' ? '12:00' : '18:00')
                    const payload:any = { technicianEmail: email.toLowerCase(), date: techLeaveDate, fullDay: isFull, startTime, endTime, reason: techLeaveType, color: color(techLeaveType) }
                    try {
                      await repos.scheduleRepo.saveTechnicianLeave(payload)
                    } catch (e:any) {
                      const resp = await fetch('/.netlify/functions/schedule-upsert-leave', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
                      let json:any = {}
                      try { json = await resp.json() } catch {}
                      if (!resp.ok || json?.success !== true) {
                        const msg = (json?.error || json?.message || `HTTP ${resp.status}`)
                        throw new Error(String(msg))
                      }
                    }
                    const yymm2 = techLeaveDate.slice(0,7)
                    const range = { start: `${yymm2}-01`, end: monthEnd(yymm2) }
                    const ls = await repos.scheduleRepo.listTechnicianLeaves(range)
                    if (user?.role==='technician') { const emailLc=(user.email||'').toLowerCase(); setLeaves(ls.filter((r:any)=> (r.technicianEmail||'').toLowerCase()===emailLc)) } else { setLeaves(ls) }
                    setTechLeaveOpen(false)
                    alert('已建立休假')
                  } catch (e:any) {
                    alert('建立休假失敗：' + (e?.message||''))
                  } finally {
                    setSubmittingLeave(false)
                  }
                }} className={`rounded px-3 py-1 text-white ${submittingLeave? 'bg-gray-400' : 'bg-brand-500 hover:bg-brand-600'}`}>{submittingLeave? '送出中…' : '送出'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-lg font-semibold">技師排班（休假）</div>
      <div className="rounded-2xl bg-white p-3 text-xs text-gray-600 shadow-card">
        <div className="mb-2 font-semibold">圖例</div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1"><i className="h-3 w-3 rounded" style={{background:'#FEF3C7'}}/>排休/特休</span>
          <span className="inline-flex items-center gap-1"><i className="h-3 w-3 rounded" style={{background:'#DBEAFE'}}/>事假</span>
          <span className="inline-flex items-center gap-1"><i className="h-3 w-3 rounded" style={{background:'#FCE7F3'}}/>婚假</span>
          <span className="inline-flex items-center gap-1"><i className="h-3 w-3 rounded" style={{background:'#E5E7EB'}}/>病假</span>
          <span className="inline-flex items-center gap-1"><i className="h-3 w-3 rounded" style={{background:'#9CA3AF'}}/>喪假</span>
        </div>
      </div>
      {/* 技師休假下拉與月份選擇（未選擇前不顯示清單） */}
      <div className="mb-2 flex items-center gap-3">
        <div className="text-sm text-gray-600">技師</div>
        <select className="rounded border px-2 py-1 text-sm" value={selectedTechEmail} onChange={e=>setSelectedTechEmail(e.target.value)}>
          <option value="">請選擇</option>
          {techs.map((t:any)=> (
            <option key={t.id} value={(t.email||'').toLowerCase()}>{t.shortName||t.name}（{t.email}）</option>
          ))}
        </select>
        <div className="text-sm text-gray-600">月份</div>
        <input type="month" className="rounded border px-2 py-1 text-sm" value={leaveListMonth} onChange={e=>setLeaveListMonth(e.target.value || new Date().toISOString().slice(0,7))} />
      </div>
      {!selectedTechEmail && (
        <div className="text-gray-500">請先選擇技師與月份，才會顯示當月休假</div>
      )}
      {selectedTechEmail && leavesList.map((l) => (
        <div key={l.id} className="rounded-xl border bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-gray-600">{l.date} {l.fullDay ? '全天' : `${l.startTime || ''} ~ ${l.endTime || ''}`}</div>
              <div className="mt-1 text-base">{emailToTech[(l.technicianEmail||'').toLowerCase()]?.name || l.technicianEmail}</div>
              {l.reason && <div className="text-sm text-gray-500">{l.reason}</div>}
            </div>
            {(() => {
              const isOwner = String(l.technicianEmail||'').toLowerCase() === String(user?.email||'').toLowerCase()
              const allowed = (user?.role==='admin') || (user?.role==='technician' && isOwner)
              if (!allowed) return null
              return (
                <button
                  onClick={async()=>{
                    if (!repos) return
                    if (!confirm('確定刪除此技師休假？')) return
                    try {
                      await repos.scheduleRepo.removeTechnicianLeave(l.id)
                      setLeavesList(prev => (prev||[]).filter(x => x.id !== l.id))
                      await refreshMonth(l.date.slice(0,7))
                    } catch (e:any) {
                      alert('刪除失敗：' + (e?.message || ''))
                    }
                  }}
                  className="rounded bg-rose-600 px-2 py-1 text-white text-xs"
                >刪除</button>
              )
            })()}
          </div>
        </div>
      ))}
      {leaves.length === 0 && <div className="text-gray-500">近期無資料</div>}

      <div className="pt-2">
        <Link to={`/orders/${orderId || 'O01958'}`} className="inline-block rounded-xl bg-gray-900 px-4 py-2 text-white">返回訂單</Link>
      </div>
    </div>
  )
}


