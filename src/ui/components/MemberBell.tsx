import React, { useEffect, useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { getMemberUser } from '../../utils/memberAuth'

export default function MemberBell() {
  const member = getMemberUser()
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!member) return
    setLoading(true)
    try {
      const res = await fetch(`/api/notifications/member/${member.id}`)
      const j = await res.json()
      if (j.success) setList(j.data || [])
    } catch {}
    setLoading(false)
  }

  const readAll = async () => {
    if (!member) return
    try {
      await fetch(`/api/notifications/member/${member.id}/read-all`, { method: 'PUT' })
      await load()
    } catch {}
  }

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [])

  const unread = list.filter(n => !n.is_read).length

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
            {list.map(n => (
              <div key={n.id} className={`p-3 ${n.is_read? 'bg-white':'bg-blue-50'}`}>
                <div className="text-sm font-medium">{n.title}</div>
                <div className="text-sm text-gray-600 mt-1">{n.message}</div>
                <div className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('zh-TW')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


