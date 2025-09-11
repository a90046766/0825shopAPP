import { useEffect, useMemo, useState } from 'react'
import { loadAdapters } from '../../adapters'
import type { PayrollRecord } from '../../core/repository'

export default function SalaryPage() {
  const getCurrentUser = () => { try{ const s=localStorage.getItem('supabase-auth-user'); if(s) return JSON.parse(s) }catch{}; try{ const l=localStorage.getItem('local-auth-user'); if(l) return JSON.parse(l) }catch{}; return null }
  const user = getCurrentUser()
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7))
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const fetchData = async () => {
    setError('')
    try {
      setLoading(true)
      const a = await loadAdapters()
      const abort = new Promise((_, rej)=> setTimeout(()=> rej(new Error('timeout')), 8000))
      const all = await Promise.race([a.payrollRepo.list(user), abort]) as any[]
      const mine = (all||[]).filter((r: any) => String(r.userEmail||'').toLowerCase() === String(user?.email||'').toLowerCase())
      setRecords(mine)
    } catch (e: any) {
      setError(e?.message || '載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const monthRecord = useMemo(() => records.find(r => r.month === month) || null, [records, month])

  const calc = (r: PayrollRecord | null) => {
    if (!r) return { base:0, bonus:0, allowances:0, deductions:0, pointsValue:0, net:0 }
    const base = r.baseSalary || 0
    const bonus = r.bonus || 0
    const allowances = (r.allowances?.fuel||0) + (r.allowances?.overtime||0) + (r.allowances?.holiday||0) + (r.allowances?.duty||0) + ((r.allowances as any)?.other||0)
    const deductions = (r.deductions?.leave||0) + (r.deductions?.tardiness||0) + (r.deductions?.complaints||0) + (r.deductions?.repairCost||0) + ((r.deductions as any)?.laborInsurance||0) + ((r.deductions as any)?.healthInsurance||0) + ((r.deductions as any)?.other||0)
    const pointsValue = r.pointsMode === 'include' ? (r.points||0) * 100 : 0
    const net = base + bonus + allowances + pointsValue - deductions
    return { base, bonus, allowances, deductions, pointsValue, net }
  }

  const c = calc(monthRecord)

  if (!user) return <div className="p-4">請先登入</div>
  if (loading) return <div className="p-4">載入中…</div>

  return (
    <div className="space-y-4 p-2">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">我的薪資</div>
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="rounded border px-2 py-1 text-sm" />
      </div>

      {error ? (
        <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 shadow-card">
          <div className="font-semibold mb-1">載入失敗</div>
          <div className="mb-2">{error==='timeout' ? '伺服器回應逾時，請稍後重試。' : error}</div>
          <button onClick={fetchData} className="rounded bg-rose-600 px-3 py-1 text-white">重試</button>
        </div>
      ) : null}

      {monthRecord ? (
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-600">月份</div>
              <div className="font-semibold">{monthRecord.month}</div>
            </div>
            <div>
              <div className="text-gray-600">狀態</div>
              <div className="font-semibold">{monthRecord.status==='confirmed' ? '已確認' : '待確認'}</div>
            </div>
            <div>
              <div className="text-gray-600">底薪</div>
              <div className="font-semibold">${c.base}</div>
            </div>
            <div>
              <div className="text-gray-600">獎金</div>
              <div className="font-semibold">${c.bonus}</div>
            </div>
            <div>
              <div className="text-gray-600">補貼合計</div>
              <div className="font-semibold">${c.allowances}</div>
            </div>
            <div>
              <div className="text-gray-600">扣除合計</div>
              <div className="font-semibold">${c.deductions}</div>
            </div>
            <div>
              <div className="text-gray-600">積分併入</div>
              <div className="font-semibold">${c.pointsValue}</div>
            </div>
            <div>
              <div className="text-gray-600">應發</div>
              <div className="text-xl font-extrabold text-green-600">${c.net}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-4 text-sm text-gray-600 shadow-card">此月份尚無薪資資料</div>
      )}

      {records.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <div className="mb-2 font-semibold">歷史月份</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {records.map(r => (
              <button key={r.id} onClick={()=>setMonth(r.month)} className={`rounded border px-3 py-2 text-left ${r.month===month? 'border-brand-300 bg-brand-50' : ''}`}>
                <div className="font-medium">{r.month}</div>
                <div className="text-xs text-gray-500">{r.status==='confirmed'?'已確認':'待確認'}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


