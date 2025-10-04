// 電子發票服務（簡化版封裝：與 Giveme API 介接）
// 注意：這裡僅提供前端代理請求的封裝，實際部署應改由 Netlify Functions 代為呼叫供應商 API。

type B2CInput = {
  orderId: string
  buyer: { name: string; email?: string; phone?: string }
  items: Array<{ name: string; quantity: number; unitPrice: number }>
  amount: number
}

async function postFull(url: string, body: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  let payload: any = {}
  try { payload = await res.json() } catch { try { payload = { raw: await res.text() } } catch { payload = {} } }
  if (!res.ok) {
    const msg = payload?.error || payload?.msg || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return payload
}

export const EInvoice = {
  async createB2C(input: B2CInput): Promise<any> {
    return await postFull('/.netlify/functions/einvoice-create-b2c', input)
  },
  async createB2B(input: any): Promise<any> {
    return await postFull('/.netlify/functions/einvoice-create-b2b', input)
  },
  async cancel(invoiceCode: string): Promise<any> {
    return await postFull('/.netlify/functions/einvoice-cancel', { invoiceCode })
  },
  async query(invoiceCode: string): Promise<any> {
    return await postFull('/.netlify/functions/einvoice-query', { invoiceCode })
  },
  async print(invoiceCode: string): Promise<any> {
    return await postFull('/.netlify/functions/einvoice-print', { invoiceCode })
  }
}

export default EInvoice


