import { useMemo, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { siteCMS } from '../../adapters/supabase/site_cms'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

export default function CheckoutSuccessPage() {
  const q = useQuery()
  const rid = q.get('rid') || ''
  const [settings, setSettings] = useState<any>(null)
  useEffect(()=>{ (async()=>{ try{ setSettings(await siteCMS.getSettings()) } catch{} })() }, [])
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-card">
      <div className="text-xl font-bold text-emerald-700">預約已送出</div>
      <div className="text-sm text-gray-700">
        感謝您的預約！我們的客服將盡快與您聯繫確認時間與細節。
      </div>
      <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
        預約單號：<span className="font-mono font-semibold">{rid || '—'}</span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="font-medium text-gray-900">快速聯繫</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <a href={settings?.phone?`tel:${settings.phone}`:'#'} className="rounded bg-gray-100 px-3 py-2 text-center">撥打電話</a>
          <a href={settings?.email?`mailto:${settings.email}`:'#'} className="rounded bg-gray-100 px-3 py-2 text-center">寄送 Email</a>
          <a href={settings?.lineUrl || '#'} target="_blank" rel="noreferrer" className="rounded bg-gray-100 px-3 py-2 text-center">官方 LINE</a>
        </div>
      </div>
      <div className="pt-2 text-right">
        <Link to="/store" className="rounded bg-brand-500 px-4 py-2 text-white">回到購物站</Link>
      </div>
    </div>
  )
}


