import type { Handler } from '@netlify/functions'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' }
  try {
    const { invoiceCode, uncode } = JSON.parse(event.body || '{}')
    const company = uncode || process.env.EINVOICE_UNCODE || process.env.VITE_EINVOICE_UNCODE
    if (!company) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing EINVOICE_UNCODE' }) }
    const url = `https://www.giveme.com.tw/invoice.do?action=invoicePrint&code=${encodeURIComponent(invoiceCode)}&uncode=${encodeURIComponent(company)}`
    // 直接回傳供前端開新視窗
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ url }) }
  } catch (err: any) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err?.message || 'Server error' }) }
  }
}

export default handler




