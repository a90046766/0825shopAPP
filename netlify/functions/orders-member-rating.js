// Netlify Function: orders-member-rating
// POST /.netlify/functions/orders-member-rating (also supports proxy path /api/orders/member/:memberId/orders/:orderId/rating)

const { createClient } = require('@supabase/supabase-js')

function json(statusCode, obj){
	return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }
}

exports.handler = async (event) => {
	try {
		if (event.httpMethod !== 'POST') return json(405, { success:false, error:'method_not_allowed' })
		const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
		const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
		if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { success:false, error:'missing_service_role' })
		const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

		const path = event.path || ''
		const body = (()=>{ try{ return JSON.parse(event.body||'{}') }catch{ return {} } })()
		let { memberId, orderId } = body
		if (!memberId || !orderId) {
			const m = path.match(/member\/(.+?)\/orders\/(.+?)\/rating/)
			if (m) { memberId = decodeURIComponent(m[1]); orderId = decodeURIComponent(m[2]) }
		}
		const kind = String(body.kind||'').toLowerCase()
		const comment = body.comment ? String(body.comment) : null
		const assetBase64 = body.asset_base64 || body.assetBase64 || null
		const assetPathClient = body.asset_path || null
		if (!memberId || !orderId || !kind) return json(400, { success:false, error:'missing_params' })
		if (!['good','suggest'].includes(kind)) return json(400, { success:false, error:'invalid_kind' })

		const { data: existed } = await supabase
			.from('member_feedback')
			.select('id')
			.eq('member_id', memberId)
			.eq('order_id', String(orderId))
			.eq('kind', kind)
			.limit(1)
		if (Array.isArray(existed) && existed.length>0) return json(200, { success:false, error:'already_submitted' })

		let asset_path = assetPathClient || null
		if (kind==='good') {
			if (assetBase64) {
				let contentType = 'image/jpeg'
				let base64 = assetBase64
				try {
					const m = String(assetBase64).match(/^data:(.*?);base64,(.+)$/)
					if (m) { contentType = m[1] || 'image/jpeg'; base64 = m[2] }
				} catch {}
				const buffer = Buffer.from(base64, 'base64')
				const bucket = 'review-uploads'
				try { await supabase.storage.createBucket(bucket, { public: false }) } catch {}
				const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
				const pathKey = `${memberId}/${String(orderId)}/${Date.now()}.${ext}`
				const { error: upErr } = await supabase.storage.from(bucket).upload(pathKey, buffer, { contentType, upsert: false })
				if (upErr) return json(500, { success:false, error:'upload_failed', detail: upErr.message })
				asset_path = pathKey
			}
		}

		const row = {
			member_id: memberId,
			order_id: String(orderId),
			kind,
			comment: comment || null,
			asset_path: asset_path || null,
			created_at: new Date().toISOString()
		}
		const { error: insErr } = await supabase.from('member_feedback').insert(row)
		if (insErr) return json(500, { success:false, error:'insert_failed', detail: insErr.message })
		return json(200, { success:true, path: asset_path })
	} catch (e) {
		return json(500, { success:false, error:'exception', detail: String(e&&e.message||e) })
	}
}


