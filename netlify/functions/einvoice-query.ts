import type { Handler } from '@netlify/functions'
import crypto from 'crypto'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

function md5Upper(input: string): string {
  return crypto.createHash('md5').update(input, 'utf8').digest('hex').toUpperCase()
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' }
  try {
    const { invoiceCode } = JSON.parse(event.body || '{}')
    const uncode = process.env.EINVOICE_UNCODE || process.env.VITE_EINVOICE_UNCODE
    const idno = process.env.EINVOICE_IDNO || process.env.VITE_EINVOICE_IDNO
    const password = process.env.EINVOICE_PASSWORD || process.env.VITE_EINVOICE_PASSWORD
    if (!uncode || !idno || !password) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Missing EINVOICE env: EINVOICE_UNCODE/IDNO/PASSWORD' }) }
    }
    const ts = Date.now().toString()
    const sign = md5Upper(ts + idno + password)

    const payload: any = { timeStamp: ts, uncode, idno, sign, code: invoiceCode }
    const url = 'https://www.giveme.com.tw/invoice.do?action=query'
    const resp = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
    const text = await resp.text(); let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text } }
    if (!resp.ok || data?.success === 'false') {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: data?.msg || 'Query failed', data }) }
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, data }) }
  } catch (err: any) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err?.message || 'Server error' }) }
  }
}

export default handler






