import type { Handler } from '@netlify/functions'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }
  try {
    const uncode = process.env.EINVOICE_UNCODE || process.env.VITE_EINVOICE_UNCODE || ''
    const idno = process.env.EINVOICE_IDNO || process.env.VITE_EINVOICE_IDNO || ''
    const password = process.env.EINVOICE_PASSWORD || process.env.VITE_EINVOICE_PASSWORD || ''
    const payload = {
      ok: Boolean(uncode && idno && password),
      EINVOICE_UNCODE_present: Boolean(uncode),
      EINVOICE_IDNO_present: Boolean(idno),
      EINVOICE_PASSWORD_present: Boolean(password)
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify(payload) }
  } catch (err: any) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: err?.message || 'error' }) }
  }
}

export default handler


