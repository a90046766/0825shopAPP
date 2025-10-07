// src/ui/pages/ShareReferralPage.tsx
import { useEffect, useState } from 'react'
import { loadAdapters } from '../../adapters'
import { supabase } from '../../utils/supabase'

export default function ShareReferralPage() {
  const [user, setUser] = useState<any>(null)
  const [memberCode, setMemberCode] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const s = localStorage.getItem('supabase-auth-user')
        if (!s) return
        const u = JSON.parse(s)
        setUser(u)

        let code = ''
        try {
          const emailLc = String(u.email || '').toLowerCase()
          // 會員分享：固定讀 members.code（與首頁、個資頁同步）
          const { data: m } = await supabase.from('members').select('code').eq('email', emailLc).maybeSingle()
          code = m?.code ? String(m.code) : ''
          if (!code && emailLc === 'a13788051@gmail.com') {
            try {
              const { data: ex } = await supabase.from('members').select('email').eq('email', emailLc).maybeSingle()
              if (ex) await supabase.from('members').update({ code: 'MO7777' }).eq('email', emailLc)
              else await supabase.from('members').insert({ email: emailLc, code: 'MO7777' })
            } catch {}
            code = 'MO7777'
          }
        } catch {}
        setMemberCode(code)
        const url = `${window.location.origin}/register/member?ref=${encodeURIComponent(code || '')}`
        setShareUrl(url)
      } catch {}
    })()
  }, [])

  if (!user) {
    return <div className="p-4">請先登入</div>
  }

  return (
    <div className="space-y-3 p-4">
      <div className="text-lg font-semibold">分享推薦</div>
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <div className="text-center">
          <div className="text-2xl font-bold text-brand-500 mb-2">我的推薦碼</div>
          <div className="text-3xl font-mono bg-gray-100 p-3 rounded-lg inline-block">{memberCode || '尚無'}</div>
        </div>

        {shareUrl && (
          <div className="mt-6 grid place-items-center gap-3">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(shareUrl)}`}
              alt="qrcode"
              className="rounded shadow"
            />
            <div className="text-center text-sm text-gray-600 break-all max-w-full">
              {shareUrl}
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={async()=>{ try{ await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(()=>setCopied(false),1500) }catch{} }}
                className="rounded-lg bg-gray-900 px-3 py-1 text-white text-sm"
              >{copied ? '已複製' : '複製連結'}</button>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-brand-500 px-3 py-1 text-white text-sm">開啟註冊頁</a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}