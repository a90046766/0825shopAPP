import React from 'react'

export default function ShareReferral({ code, onClose }: { code: string; onClose: ()=>void }){
  const url = `${location.origin}/register/member?ref=${encodeURIComponent(code)}`
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-card">
        <div className="mb-2 text-lg font-semibold">分享推薦</div>
        <div className="text-xs text-gray-600 mb-3">讓客戶掃描 QR Code 或點擊連結完成註冊，介紹人會自動帶入。</div>
        <div className="grid place-items-center">
          <img src={qr} alt="Referral QR" className="h-44 w-44 rounded bg-white p-2" />
        </div>
        <div className="mt-3 break-all rounded border bg-gray-50 p-2 text-xs">{url}</div>
        <div className="mt-3 flex justify-between gap-2">
          <button onClick={()=>{ navigator.clipboard?.writeText(url) }} className="rounded bg-blue-600 px-3 py-1 text-white text-sm">複製連結</button>
          <button onClick={onClose} className="rounded bg-gray-100 px-3 py-1 text-sm">關閉</button>
        </div>
      </div>
    </div>
  )
}


