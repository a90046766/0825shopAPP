import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function ACAdvisorPage(){
  const navigate = useNavigate()
  const [ack1, setAck1] = useState(false)
  const [ack2, setAck2] = useState(false)
  const [ack3, setAck3] = useState(false)

  const [lengthM, setLengthM] = useState<string>('')
  const [widthM, setWidthM] = useState<string>('')
  const [pingInput, setPingInput] = useState<string>('')
  const [westSunOrTopOrHigh, setWestSunOrTopOrHigh] = useState<boolean>(false)
  const [modelIndexInput, setModelIndexInput] = useState<string>('')

  // 坪數（由 長寬 或 直接輸入 擇一，直接輸入優先）
  const pingBySize = useMemo(() => {
    const L = Number(lengthM)
    const W = Number(widthM)
    if (!isFinite(L) || !isFinite(W) || L <= 0 || W <= 0) return 0
    return Math.max(0, L * W * 0.325)
  }, [lengthM, widthM])

  const basePing = useMemo(() => {
    const P = Number(pingInput)
    if (isFinite(P) && P > 0) return P
    return pingBySize
  }, [pingInput, pingBySize])

  const effectivePing = useMemo(() => {
    return Math.max(0, basePing + (westSunOrTopOrHigh ? 1 : 0))
  }, [basePing, westSunOrTopOrHigh])

  // 建議「編號」：常見機種編號（對應約 0.1kW/1 編號 → 28=2.8kW）
  const SERIES = [18, 20, 22, 25, 28, 36, 40, 45, 50, 56, 63, 71]

  const recommendedIndex = useMemo(() => {
    // 坪數 * 6，向上取整，並取用不小於該值的最近常見編號
    const need = Math.ceil(effectivePing * 6)
    const pick = SERIES.find(v => v >= need)
    return pick || need
  }, [effectivePing])

  const recommendedKW = useMemo(() => (recommendedIndex / 10).toFixed(1), [recommendedIndex])

  // 反推：輸入已有的「冷房能力編號」（如 28）→ 建議坪數
  const capacityToPing = useMemo(() => {
    const idx = Number(modelIndexInput)
    if (!isFinite(idx) || idx <= 0) return 0
    return Math.max(0, idx / 6)
  }, [modelIndexInput])

  const canCalc = ack1 && ack2 && ack3

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold">冷氣建議計算</h1>
            <div className="flex items-center gap-2 text-sm">
              <Link to="/store/products?category=new" className="rounded bg-white/20 px-3 py-1 hover:bg-white/25">前往冷氣商品</Link>
              <Link to="/store" className="rounded bg-white/20 px-3 py-1 hover:bg-white/25">返回購物站</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
        {/* 聲明需勾選 */}
        <div className="rounded-2xl bg-white p-4 md:p-6 shadow-sm border">
          <div className="text-sm text-gray-700 space-y-2">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={ack1} onChange={e=>setAck1(e.target.checked)} />
              <span>我已了解：冷氣型號中的數字大多對應冷房能力（例：28≈2.8kW）；一般環境每坪約需 0.52~0.58 kW 能力。</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={ack2} onChange={e=>setAck2(e.target.checked)} />
              <span>我已了解：如有西曬、頂樓樓層、挑高（&gt;3m），建議多加約 1 坪的冷房能力再行評估。</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={ack3} onChange={e=>setAck3(e.target.checked)} />
              <span>我已了解：本頁試算僅供參考，實際選型與價格以現場評估與品牌規格為準。</span>
            </label>
          </div>
        </div>

        {/* 計算卡 */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white p-4 md:p-6 shadow-sm border">
            <div className="font-semibold mb-2">輸入條件</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-gray-600">長（公尺）</span>
                <input className="rounded border px-2 py-1" value={lengthM} onChange={e=>setLengthM(e.target.value)} placeholder="例：3.5" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-gray-600">寬（公尺）</span>
                <input className="rounded border px-2 py-1" value={widthM} onChange={e=>setWidthM(e.target.value)} placeholder="例：3.0" />
              </label>
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-gray-600">或直接輸入坪數</span>
                <input className="rounded border px-2 py-1" value={pingInput} onChange={e=>setPingInput(e.target.value)} placeholder="例：4.5" />
              </label>
              <label className="col-span-2 inline-flex items-center gap-2 text-gray-700">
                <input type="checkbox" checked={westSunOrTopOrHigh} onChange={e=>setWestSunOrTopOrHigh(e.target.checked)} />
                有西曬 / 頂樓樓層 / 挑高（&gt;3m）
              </label>
            </div>
            {/* 坪數計算式提示需求調整：依指示隱藏 */}
          </div>

          <div className="rounded-2xl bg-white p-4 md:p-6 shadow-sm border">
            <div className="font-semibold mb-2">結果（建議可大不可小）</div>
            {/* 強化結果可視性 */}
            {canCalc && effectivePing>0 ? (
              <div className="mb-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 shadow">
                <div className="text-xs opacity-90">建議型號（編號）</div>
                <div className="text-2xl md:text-3xl font-extrabold tracking-wide">{recommendedIndex}</div>
                <div className="text-sm mt-1">約 {recommendedKW} kW</div>
              </div>
            ) : (
              <div className="mb-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 border">
                請先勾選上方三項說明並輸入條件，方可顯示建議結果。
              </div>
            )}
            <div className="space-y-2 text-sm">
              <div className="text-gray-700">有效坪數：<span className="font-semibold">{effectivePing>0 ? effectivePing.toFixed(2) : '-' } 坪</span></div>
              <div className="text-gray-700">建議型號（編號）：<span className="font-semibold">{canCalc && effectivePing>0 ? `${recommendedIndex}` : '-'}</span></div>
              <div className="text-gray-700">建議冷房能力：約 <span className="font-semibold">{canCalc && effectivePing>0 ? `${recommendedKW} kW` : '-'}</span></div>
            </div>
            <div className="mt-3 text-xs text-gray-500">對應常見編號：18/20/22/25/28/36/40/45/50/56/63/71…（數字≈kW×10）</div>
          </div>
        </div>

        {/* 反推（已有型號編號） */}
        <div className="mt-4 rounded-2xl bg-white p-4 md:p-6 shadow-sm border">
          <div className="font-semibold mb-2">反推：已有型號編號 ➜ 建議坪數</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm items-end">
            <label className="flex flex-col gap-1">
              <span className="text-gray-600">型號編號（例如 28 表示約 2.8kW）</span>
              <input className="rounded border px-2 py-1" value={modelIndexInput} onChange={e=>setModelIndexInput(e.target.value)} placeholder="例：28" />
            </label>
            <div className="text-gray-700">建議坪數內：<span className="font-semibold">{canCalc && capacityToPing>0 ? capacityToPing.toFixed(2) : '-'}</span></div>
          </div>
          {/* 依指示隱藏提示文字 */}
        </div>

        {/* 參考價目表依指示移除，後續另做 */}

        <div className="mt-6 flex items-center justify-end gap-2 text-sm">
          <button onClick={()=> navigate('/store/products?category=new')} className="rounded bg-blue-600 px-4 py-2 text-white">前往冷氣商品</button>
          <Link to="/store" className="rounded bg-gray-100 px-4 py-2">返回首頁</Link>
        </div>
      </div>
    </div>
  )
}


