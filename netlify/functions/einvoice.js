/* Netlify Function proxy: /api/einvoice/*
   將前端 eInvoice.ts 的請求導回這裡，避免直接打供應商 API。
   目前為 demo：返回模擬成功，避免 HTTP 404。
*/

exports.handler = async (event) => {
  try {
    const path = (event.path || '').replace(/^.*\/api\/einvoice/, '')
    const isJson = (event.headers?.['content-type'] || '').includes('application/json')
    const body = isJson ? JSON.parse(event.body || '{}') : {}

    if (path === '/create-b2c' || path === '/create-b2b') {
      // 回傳模擬發票號碼
      const code = 'INV-' + Math.random().toString().slice(2, 10)
      return { statusCode: 200, body: JSON.stringify({ ok: true, invoiceNumber: code }) }
    }
    if (path === '/print') {
      // 回傳示意連結
      return { statusCode: 200, body: JSON.stringify({ ok: true, url: 'https://example.com/invoice-demo.pdf' }) }
    }
    if (path === '/cancel') {
      return { statusCode: 200, body: JSON.stringify({ ok: true }) }
    }
    if (path === '/query') {
      return { statusCode: 200, body: JSON.stringify({ ok: true, status: 'issued' }) }
    }
    return { statusCode: 404, body: JSON.stringify({ ok: false, error: 'Not Found' }) }
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: String(e?.message||e) }) }
  }
}


