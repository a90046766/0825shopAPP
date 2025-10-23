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
    const { buyer, items, totalFee, amount, sales, taxState = '0', note } = JSON.parse(event.body || '{}')
    const uncode = process.env.EINVOICE_UNCODE || process.env.VITE_EINVOICE_UNCODE
    const idno = process.env.EINVOICE_IDNO || process.env.VITE_EINVOICE_IDNO
    const password = process.env.EINVOICE_PASSWORD || process.env.VITE_EINVOICE_PASSWORD
    if (!uncode || !idno || !password) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Missing EINVOICE env: EINVOICE_UNCODE/IDNO/PASSWORD' }) }
    }
    const ts = Date.now().toString()
    const sign = md5Upper(ts + idno + password)
    const fee = Math.max(1, Math.round(Number(totalFee || amount || 0)))
    const taxAmount = Math.round(Number(amount || 0))
    const sale = Math.round(Number(sales || fee - taxAmount))
    const today = new Date()
    const yyyy = today.getFullYear(); const mm = String(today.getMonth()+1).padStart(2,'0'); const dd = String(today.getDate()).padStart(2,'0')
    const datetime = `${yyyy}-${mm}-${dd}`

    const payload: any = {
      timeStamp: ts,
      uncode,
      idno,
      sign,
      customerName: buyer?.companyName || '',
      phone: buyer?.taxId || '',
      datetime,
      email: buyer?.email || '',
      taxState,
      totalFee: String(fee),
      amount: String(taxAmount),
      sales: String(sale),
      content: note || '',
      items: (Array.isArray(items) ? items : []).map((it: any) => ({
        name: String(it?.name || '品項'),
        money: Number(it?.unitPrice || it?.money || 0),
        number: Number(it?.quantity || it?.number || 1)
      }))
    }

    const url = 'https://www.giveme.com.tw/invoice.do?action=addB2B'
    const resp = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
    const text = await resp.text(); let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text } }
    if (!resp.ok || data?.success === 'false') {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: data?.msg || 'Create B2B failed', data }) }
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, invoiceNumber: data?.code || '', data }) }
  } catch (err: any) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err?.message || 'Server error' }) }
  }
}

export default handler















