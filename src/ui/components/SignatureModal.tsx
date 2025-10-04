import { useEffect, useRef } from 'react'

export default function SignatureModal({ open, onClose, onSave }: { open: boolean; onClose: ()=>void; onSave: (dataUrl: string)=>void }) {
	const ref = useRef<HTMLCanvasElement>(null)
	useEffect(()=>{
		if (!open) return
		// 鎖定 body 滾動，避免簽名時整頁移動
		const prevOverflow = document.body.style.overflow
		const prevOverscroll = (document.body.style as any).overscrollBehavior
		document.body.style.overflow = 'hidden'
		;(document.body.style as any).overscrollBehavior = 'none'
		const restore = () => { document.body.style.overflow = prevOverflow; (document.body.style as any).overscrollBehavior = prevOverscroll }
		
		const cvs = ref.current!
		const ctx = cvs.getContext('2d')!
		let drawing = false
		const start = (e: any) => { e.preventDefault?.(); drawing = true; const p = point(e); ctx.beginPath(); ctx.moveTo(p.x, p.y) }
		const move = (e: any) => { e.preventDefault?.(); if (!drawing) return; const p = point(e); ctx.lineTo(p.x, p.y); ctx.stroke() }
		const end = () => { drawing = false }
		const point = (e:any) => { const r = cvs.getBoundingClientRect(); const x = (e.touches? e.touches[0].clientX : e.clientX) - r.left; const y = (e.touches? e.touches[0].clientY : e.clientY) - r.top; return { x, y } }
		cvs.addEventListener('mousedown', start); window.addEventListener('mousemove', move); window.addEventListener('mouseup', end)
		cvs.addEventListener('touchstart', start, { passive: false } as any); window.addEventListener('touchmove', move, { passive: false } as any); window.addEventListener('touchend', end)
		return () => { cvs.removeEventListener('mousedown', start); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', end); cvs.removeEventListener('touchstart', start as any); window.removeEventListener('touchmove', move as any); window.removeEventListener('touchend', end); restore() }
	}, [open])
	if (!open) return null
	return (
		<div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onWheel={(e)=>e.preventDefault()} onTouchMove={(e)=>e.preventDefault()} style={{ touchAction: 'none' as any }}>
			<div className="w-full max-w-md rounded-2xl bg-white p-4" style={{ touchAction: 'none' as any }}>
				<div className="mb-2 text-lg font-semibold">簽名</div>
				<canvas ref={ref} width={360} height={240} className="h-60 w-full rounded border" style={{ touchAction: 'none' }} />
				<div className="mt-3 flex justify-end gap-2">
					<button onClick={onClose} className="rounded bg-gray-100 px-3 py-1">取消</button>
					<button onClick={()=>{ const dataUrl = ref.current!.toDataURL('image/png'); onSave(dataUrl) }} className="rounded bg-brand-500 px-3 py-1 text-white">確定</button>
				</div>
			</div>
		</div>
	)
}


