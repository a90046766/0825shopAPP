import React, { useEffect, useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { supabase } from '../../utils/supabase'

type StaffUser = { email?: string; role?: string; name?: string } | null

function getStaffUser(): StaffUser {
  try {
    const s = localStorage.getItem('supabase-auth-user')
    if (s) return JSON.parse(s)
  } catch {}
  return null
}

export default function StaffBell({ compact = false }: { compact?: boolean }) {
  const user = getStaffUser()
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!user) return
    try { if (typeof navigator !== 'undefined' && navigator.onLine === false) return } catch {}
    setLoading(true)
    try {
      let merged: any[] = []
      try {
        const emailLc = String(user.email||'').toLowerCase()
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200)
        if (!error && Array.isArray(data)) {
          const now = new Date()
          merged = (data||[])
            .filter((n:any)=>{
              const t = String(n.target||'')
              if (t==='all') return true
              if (t==='user') return String(n.target_user_email||'').toLowerCase()===emailLc
              if (t==='tech' || t==='technician' || t==='technicians') return (user.role==='technician')
              if (t==='support' || t==='staff' || t==='admin') return (user.role==='support' || user.role==='admin')
              if (t==='subset') {
                const list = Array.isArray(n.targetEmails) ? n.targetEmails.map((x:string)=>String(x||'').toLowerCase()) : []
                return list.includes(emailLc)
              }
              return false
            })
            .filter((n:any)=>{
              const notExpired = !n.expires_at || new Date(n.expires_at) > now
              const delivered = (n.sent_at && new Date(n.sent_at) <= now) || (n.scheduled_at && new Date(n.scheduled_at) <= now) || !n.sent_at
              return notExpired && delivered
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

          // 讀取已讀紀錄
          try {
            const ids = (merged||[]).map((it:any)=>it.id).filter(Boolean)
            if (ids.length>0) {
              const { data: reads } = await supabase
                .from('notifications_read')
                .select('notification_id')
                .in('notification_id', ids)
                .eq('user_email', emailLc)
              const readSet = new Set((reads||[]).map((r:any)=>r.notification_id))
              merged = (merged||[]).map((it:any)=> ({ ...it, is_read: readSet.has(it.id) || !!it.is_read }))
            }
          } catch {}
        }
      } catch {}
      setList(merged)
    } catch {}
    setLoading(false)
  }

  const readAll = async () => {
    if (!user) return
    try {
      const emailLc = String(user.email||'').toLowerCase()
      for (const it of list) {
        try {
          await supabase.from('notifications_read').upsert({ notification_id: it.id, user_email: emailLc, read_at: new Date().toISOString() })
        } catch {}
      }
      setList(prev => (prev||[]).map(n => ({ ...n, is_read: true })))
    } catch {}
    await load()
  }

  const readOne = async (id: string) => {
    if (!user) return
    try {
      const emailLc = String(user.email||'').toLowerCase()
      await supabase.from('notifications_read').upsert({ notification_id: id, user_email: emailLc, read_at: new Date().toISOString() })
      setList(prev => prev.map(n => n.id===id ? { ...n, is_read: true } : n))
    } catch {}
  }

  useEffect(() => { 
    load();
    const t = setInterval(load, 30000);
    const onOnline = () => load();
    try { window.addEventListener('online', onOnline) } catch {}
    return () => { clearInterval(t); try { window.removeEventListener('online', onOnline) } catch {} }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const unread = list.filter(n => !n.is_read).length

  const extractOrderId = (text: string) => {
    try {
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

  return (
    <div className="relative">
      <button onClick={()=>setOpen(v=>!v)} className={`relative rounded-lg border ${compact? 'px-2 py-2' : 'px-3 py-2'} text-sm bg-white`}>
        <Bell className={`inline h-4 w-4 ${compact? '' : 'mr-1'}`} />
        {!compact && '通知'}
        {unread>0 && <span className={`${compact? 'ml-1' : 'ml-2'} rounded bg-red-600 text-white text-xs px-1.5`}>{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={()=>setOpen(false)} />
          <div className="fixed top-14 right-2 left-2 md:left-auto w-[28rem] max-w-[calc(100vw-16px)] md:max-w-[90vw] max-h-[calc(100vh-120px)] overflow-auto rounded-xl border bg-white shadow-2xl z-[9999]">
            <div className="flex items-center justify-between p-2 border-b">
              <div className="text-sm font-medium">通知</div>
              <div className="flex items-center gap-2">
                <button onClick={readAll} className="text-xs text-blue-600 flex items-center gap-1"><Check className="h-3 w-3"/> 全部已讀</button>
                <button onClick={()=>setOpen(false)} className="text-xs text-gray-500 hover:text-gray-700">關閉</button>
              </div>
            </div>
            <div className="divide-y">
              {loading && <div className="p-3 text-sm text-gray-500">載入中...</div>}
              {!loading && list.length===0 && <div className="p-3 text-sm text-gray-500">目前沒有通知</div>}
              {list.map(n => {
                const orderId = extractOrderId(String(n.message||'') + ' ' + String(n.title||''))
                return (
                  <div key={n.id} className={`p-3 ${n.is_read? 'bg-white':'bg-blue-50'}`}>
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.data && (
                      <div className="mt-1 text-sm text-gray-700">
                        <div>會員：<span className="font-mono">{n.data.member_id||''}</span></div>
                        <div>訂單：<span className="font-mono">{n.data.order_id||''}</span></div>
                        {n.data.kind==='suggest' && n.data.comment && (
                          <div className="mt-1 whitespace-pre-wrap">{n.data.comment}</div>
                        )}
                        {n.data.kind==='good' && n.data.asset_path && (
                          <div className="mt-1">
                            <img src={`${supabase.storage.from('review-uploads').getPublicUrl(n.data.asset_path).data.publicUrl}`} alt="upload" className="max-h-40 rounded border" />
                          </div>
                        )}
                      </div>
                    )}
                    {!n.data && <div className="text-sm text-gray-600 mt-1">{n.message}</div>}
                    <div className="mt-2">
                      {orderId && (
                        <a
                          href={`/orders/${encodeURIComponent(orderId)}`}
                          onClick={async(e)=>{ 
                            try { await readOne(n.id) } catch {} 
                            // 如果後台無此單，導向客戶端訂單詳情避免白屏
                            setTimeout(()=>{
                              try {
                                const pathOk = location.pathname.startsWith('/orders/')
                                if (!pathOk) location.href = `/store/member/orders/${encodeURIComponent(orderId)}`
                              } catch {}
                            }, 300)
                          }}
                          className="inline-block rounded bg-gray-900 px-2 py-1 text-xs text-white hover:bg-gray-800"
                        >查看訂單</a>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('zh-TW')}</div>
                  </div>
                )})}
            </div>
          </div>
        </>
      )}
    </div>
  )
}


