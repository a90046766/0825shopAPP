import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../utils/supabase'

export default function FeedbackPage(){
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<'all'|'good'|'suggest'>('all')

  const load = async()=>{
    setLoading(true)
    try {
      // 先走 Service Role API，避免 RLS 導致看不到
      try {
        const res = await fetch('/api/member-feedback-list')
        const j = await res.json()
        if (j?.success && Array.isArray(j.data)) {
          setRows(j.data)
        } else {
          throw new Error('api_failed')
        }
      } catch {
        // 後備：直接讀表（需確保 RLS 允許管理端讀取）
        const { data, error } = await supabase.from('member_feedback').select('*').order('created_at', { ascending: false })
        if (error) throw error
        setRows(data||[])
      }
    } catch {}
    setLoading(false)
  }
  useEffect(()=>{ load() }, [])

  const list = useMemo(()=>{
    return (rows||[]).filter((r:any)=> (kind==='all' || r.kind===kind)).filter((r:any)=>{
      if (!q) return true
      const t = (q||'').toLowerCase()
      return String(r.member_id||'').toLowerCase().includes(t) || String(r.order_id||'').toLowerCase().includes(t) || String(r.comment||'').toLowerCase().includes(t)
    })
  }, [rows, q, kind])

  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold">回饋檢視</div>
      <div className="flex items-center gap-2">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="搜尋 會員/訂單/評論" className="rounded border px-3 py-1 text-sm" />
        <select value={kind} onChange={e=>setKind(e.target.value as any)} className="rounded border px-3 py-1 text-sm">
          <option value="all">全部</option>
          <option value="good">好評（截圖）</option>
          <option value="suggest">建議評（文字）</option>
        </select>
        <button onClick={load} className="rounded bg-gray-100 px-3 py-1 text-sm">重新整理</button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {loading && <div className="text-sm text-gray-500">載入中...</div>}
        {!loading && list.map((r:any)=> (
          <div key={r.id} className="rounded-xl border bg-white p-3 shadow-card text-sm">
            <div className="flex items-center justify-between">
              <div className="font-medium">{r.kind==='good'?'好評截圖':'建議評論'}</div>
              <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString('zh-TW')}</div>
            </div>
            <div className="mt-1 text-gray-700">
              <div>會員：<span className="font-mono">{r.member_id}</span></div>
              <div>訂單：<span className="font-mono">{r.order_id}</span></div>
            </div>
            {r.kind==='suggest' && r.comment && (
              <div className="mt-2 rounded bg-gray-50 p-2 text-gray-800 whitespace-pre-wrap">{r.comment}</div>
            )}
            {r.kind==='good' && r.asset_path && (
              <div className="mt-2">
                <img src={`${supabase.storage.from('review-uploads').getPublicUrl(r.asset_path).data.publicUrl}`} alt="upload" className="max-h-64 rounded border" />
              </div>
            )}
          </div>
        ))}
        {!loading && list.length===0 && <div className="text-sm text-gray-500">目前無回饋</div>}
      </div>
    </div>
  )
}


