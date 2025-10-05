import React, { useEffect, useState } from 'react'
import { loadAdapters } from '../../adapters'

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [autoDispatchEnabled, setAutoDispatchEnabled] = useState(false)
  const [error, setError] = useState('')
  const [minStars, setMinStars] = useState(4)
  const [saved, setSaved] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const a: any = await loadAdapters()
      const s = await a.settingsRepo.get()
      setAutoDispatchEnabled(!!s.autoDispatchEnabled)
      const score = typeof s.autoDispatchMinScore === 'number' ? s.autoDispatchMinScore : 80
      const stars = Math.min(5, Math.max(1, Math.round(score / 20)))
      setMinStars(stars)
    } catch (e: any) {
      setError(e?.message || '載入失敗')
    } finally {
      setLoading(false)
    }
  }

  const save = async () => {
    setLoading(true)
    setError('')
    setSaved(false)
    try {
      const a: any = await loadAdapters()
      await a.settingsRepo.update({ autoDispatchEnabled, autoDispatchMinScore: minStars * 20 })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (e: any) {
      setError(e?.message || '更新失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">系統設定</h1>
      {error && <div className="mb-3 rounded bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">自動派單</div>
            <div className="text-sm text-gray-500">依技能匹配與評分（4星以上）自動指派技師</div>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={autoDispatchEnabled} onChange={e => setAutoDispatchEnabled(e.target.checked)} />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:h-5 after:w-5 after:bg-white after:border-gray-300 after:border after:rounded-full after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="text-sm text-gray-700">最低星等門檻</div>
          <select value={minStars} onChange={e=> setMinStars(Number(e.target.value))} className="rounded border px-2 py-1 text-sm">
            {[1,2,3,4,5].map(n=> <option key={n} value={n}>{n} 星</option>)}
          </select>
        </div>
        <div className="mt-4 flex gap-2">
          <button disabled={loading} onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60">{loading ? '儲存中...' : '儲存'}</button>
          <button disabled={loading} onClick={load} className="px-4 py-2 rounded border text-sm">重載</button>
          {saved && <div className="text-green-600 text-sm">已儲存</div>}
        </div>
      </div>
    </div>
  )
}


