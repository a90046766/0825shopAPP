import React, { useEffect, useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { getMemberUser } from '../../utils/memberAuth'
import { supabase } from '../../utils/supabase'

export default function MemberBell() {
  const member = getMemberUser()
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!member) return
    setLoading(true)
    try {
      // 優先讀取後端 API（派工系統）
      let merged: any[] = []
      try {
        const res = await fetch(`/api/notifications/member/${member.id}`)
        const j = await res.json()
        if (j?.success && Array.isArray(j.data)) merged = j.data
      } catch {}
      // 回退：讀取 Supabase notifications（target=all 或 user=email）
      try {
        const emailLc = (member.email||'').toLowerCase()
        const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false })
        if (!error && Array.isArray(data)) {
          const mapped = (data||[])
            .filter((n:any)=>{
              const t = n.target
              if (t==='all') return true
              if (t==='user') return (String(n.target_user_email||'').toLowerCase()===emailLc)
              if (t==='member') return true
              return false
            })
            .map((n:any)=>{
              let dataObj:any = null
              try { if (n.body && typeof n.body==='string' && n.body.trim().startsWith('{')) dataObj = JSON.parse(n.body) } catch {}
              return {
                id: n.id,
                title: n.title,
                message: dataObj ? '' : (n.body || n.message),
                data: dataObj,
                is_read: false,
                created_at: n.created_at
              }
            })
          // 合併去重（以 id 為準）
          const map: Record<string, any> = {}
          for (const it of [...merged, ...mapped]) { map[it.id] = it }
          merged = Object.values(map)
        }
      } catch {}
      setList(merged)
    } catch {}
    setLoading(false)
  }

  const readAll = async () => {
    if (!member) return
    try {
      await fetch(`/api/notifications/member/${member.id}/read-all`, { method: 'PUT' })
      await load()
    } catch {}
    try {
      // Supabase 回退：將目前列表逐一標記已讀
      const emailLc = (member.email||'').toLowerCase()
      for (const it of list) {
        try {
          await supabase.from('notifications_read').upsert({ notification_id: it.id, user_email: emailLc, read_at: new Date().toISOString() })
        } catch {}
      }
      await load()
    } catch {}
  }

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [])

  const unread = list.filter(n => !n.is_read).length

  const extractOrderId = (text: string) => {
    try {
      // 嘗試匹配「訂單編號 XXX」或 UUID/OD 開頭/ORDER-時間戳
      const m = text.match(/訂單編號\s*([A-Za-z0-9\-:_]+)/)
      if (m && m[1]) return m[1]
      const uuid = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
      if (uuid) return uuid[0]
      const od = text.match(/\bOD[0-9]+\b/i)
      if (od) return od[0]
      const ts = text.match(/ORDER-[0-9]{10,}/)
      if (ts) return ts[0]
      return ''
    } catch { return '' }
  }

  const readOne = async (id: string) => {
    if (!member) return
    try { await fetch(`/api/notifications/member/${member.id}/read/${id}`, { method: 'PUT' }) } catch {}
  }

  return (
    <div className="relative">
      <button onClick={()=>setOpen(v=>!v)} className="relative rounded-lg border px-3 py-2 text-sm bg-white">
        <Bell className="inline h-4 w-4 mr-1" />
        通知
        {unread>0 && <span className="ml-2 rounded bg-red-600 text-white text-xs px-1.5">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-xl border bg-white shadow-xl z-50">
          <div className="flex items-center justify-between p-2 border-b">
            <div className="text-sm font-medium">通知</div>
            <button onClick={readAll} className="text-xs text-blue-600 flex items-center gap-1"><Check className="h-3 w-3"/> 全部已讀</button>
          </div>
          <div className="divide-y">
            {loading && <div className="p-3 text-sm text-gray-500">載入中...</div>}
            {!loading && list.length===0 && <div className="p-3 text-sm text-gray-500">目前沒有通知</div>}
            {list.map(n => {
              const orderId = extractOrderId(String(n.message||'') + ' ' + String(n.title||''))
              return (
              <div key={n.id} className={`p-3 ${n.is_read? 'bg-white':'bg-blue-50'}`}>
                <div className="text-sm font-medium">{n.title}</div>
                {n.data && n.data.kind==='review_prompt' ? (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-700">感謝您的評價！請選擇以下其一完成並領取 {Number(n.data.bonus||0)} 點：</div>
                    <div className="mt-2 flex gap-2">
                      {(Array.isArray(n.data.options)? n.data.options:[]).slice(0,2).map((opt:any,idx:number)=> (
                        <a key={idx} href={opt.url} target="_blank" rel="noreferrer" className="inline-block rounded bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700">{opt.label}</a>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 mt-1">{n.message}</div>
                )}
                {/* 加入 LINE CTA */}
                <div className="mt-2">
                  <a
                    href="https://line.me/R/ti/p/@942clean"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                  >加入官方 LINE</a>
                  {orderId && (
                    <a
                      href={`/store/member/orders/${encodeURIComponent(orderId)}`}
                      onClick={async()=>{ await readOne(n.id) }}
                      className="ml-2 inline-block rounded bg-gray-900 px-2 py-1 text-xs text-white hover:bg-gray-800"
                    >查看訂單</a>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('zh-TW')}</div>
              </div>
            )})}
          </div>
        </div>
      )}
    </div>
  )
}


