import { useEffect, useState } from 'react'
import { computeMonthlyPayroll } from '../../services/payroll'

export default function ReportsPage() {
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7))
  const [payroll, setPayroll] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [scheme, setScheme] = useState<string>('')
  const [region, setRegion] = useState<string>('')
  const [platform, setPlatform] = useState<string>('')
  const [summary, setSummary] = useState<{ revenue: number; orders: number }>({ revenue: 0, orders: 0 })
  useEffect(() => { computeMonthlyPayroll(month).then(setPayroll) }, [month])
  useEffect(() => {
    (async()=>{
      const { orderRepo } = await import('../../adapters/local/orders')
      const list = await orderRepo.list()
      const done = list.filter((o:any)=>o.status==='completed' && (o.workCompletedAt||o.createdAt||'').slice(0,7)===month)
      const revenue = done.reduce((s:number,o:any)=> s + (o.serviceItems||[]).reduce((ss:number,it:any)=>ss+it.unitPrice*it.quantity,0), 0)
      setSummary({ revenue, orders: done.length })
    })()
  }, [month])
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-lg font-semibold">報表</div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="rounded border px-2 py-1 text-sm" />
          <input placeholder="搜尋姓名/編碼" value={q} onChange={e=>setQ(e.target.value)} className="rounded border px-2 py-1 text-sm" />
          <select className="rounded border px-2 py-1 text-sm" value={scheme} onChange={e=>setScheme(e.target.value)}>
            <option value="">全部方案</option>
            <option value="pure70">純70</option>
            <option value="pure72">純72</option>
            <option value="pure73">純73</option>
            <option value="pure75">純75</option>
            <option value="pure80">純80</option>
            <option value="base1">保1</option>
            <option value="base2">保2</option>
            <option value="base3">保3</option>
          </select>
          <select className="rounded border px-2 py-1 text-sm" value={region} onChange={e=>setRegion(e.target.value)}>
            <option value="">全部區域</option>
            <option value="north">北</option>
            <option value="central">中</option>
            <option value="south">南</option>
            <option value="all">全區</option>
          </select>
          <select className="rounded border px-2 py-1 text-sm" value={platform} onChange={e=>setPlatform(e.target.value)}>
            <option value="">全部平台</option>
            <option value="日">日</option>
            <option value="同">同</option>
            <option value="黃">黃</option>
            <option value="今">今</option>
          </select>
        </div>
      </div>
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <div className="mb-2 grid grid-cols-2 gap-3 text-sm text-gray-700">
          <div className="rounded-lg bg-gray-50 p-2">本月完成訂單：<span className="font-semibold">{summary.orders}</span></div>
          <div className="rounded-lg bg-gray-50 p-2">本月營收：<span className="font-semibold">{summary.revenue}</span></div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold">當月分潤概覽</div>
          <div className="text-xs text-gray-500">可臨時調整方案後重算</div>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {payroll.filter((p:any)=>{
            const code = (p.technician as any).code || ''
            const hit = !q || p.technician.name.includes(q) || code.includes(q)
            const byScheme = !scheme || p.scheme===scheme
            const byRegion = !region || (p.technician.region===region)
            const byPlatform = !platform || ((p.orders||[]).some((o:any)=>o.platform===platform))
            return hit && byScheme && byRegion && byPlatform
          }).map((p:any, idx:number) => (
            <div key={p.technician.id} className="flex items-center justify-between gap-3 border-b pb-2">
              <div className="min-w-0 flex-1 truncate">{p.technician.name} <span className="text-xs text-gray-500">{(p.technician as any).code || ''}</span> {(p.technician as any).code && <button onClick={()=>navigator.clipboard.writeText((p.technician as any).code)} className="ml-1 rounded bg-gray-100 px-2 py-0.5 text-[10px]">複製</button>}</div>
              <select className="rounded border px-2 py-1 text-xs" value={p.scheme} onChange={e=>{
                const next = [...payroll]; next[idx] = { ...p, scheme: e.target.value } as any; setPayroll(next as any)
              }}>
                <option value="pure70">純70</option>
                <option value="pure72">純72</option>
                <option value="pure73">純73</option>
                <option value="pure75">純75</option>
                <option value="pure80">純80</option>
                <option value="base1">保1</option>
                <option value="base2">保2</option>
                <option value="base3">保3</option>
              </select>
              <div className="text-gray-700">合計 {p.total}（底薪 {p.baseSalary}＋獎金 {p.bonus}）</div>
            </div>
          ))}
          {payroll.length===0 && <div className="text-gray-500">尚無資料</div>}
        </div>
        {payroll.length>0 && (
          <div className="mt-3 text-right">
            <button onClick={()=>{
              const header = ['名稱','編碼','區域','方案','個人額','底薪','獎金','合計']
              const lines = payroll.map((p:any)=>[
                p.technician.name,(p.technician as any).code||'',p.technician.region||'',p.scheme,p.perTechTotal,p.baseSalary,p.bonus,p.total
              ].join(','))
              const csv = [header.join(','),...lines].join('\n')
              const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `payroll-${month}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }} className="rounded-lg bg-gray-900 px-3 py-1 text-sm text-white">匯出分潤 CSV</button>
            <button onClick={()=>{
              const header = ['名稱','編碼','區域','方案','個人額','底薪','獎金','合計']
              const rowsHtml = payroll.map((p:any)=>`<tr><td>${p.technician.name}</td><td>${(p.technician as any).code||''}</td><td>${p.technician.region||''}</td><td>${p.scheme}</td><td>${p.perTechTotal}</td><td>${p.baseSalary}</td><td>${p.bonus}</td><td>${p.total}</td></tr>`).join('')
              const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table><thead><tr>${header.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`
              const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `payroll-${month}.xls`
              a.click(); URL.revokeObjectURL(url)
            }} className="ml-2 rounded-lg bg-brand-600 px-3 py-1 text-sm text-white">匯出 Excel</button>
          </div>
        )}
      </div>
    </div>
  )
}

