// 電子發票服務（簡化版封裝：與 Giveme API 介接）
// 注意：這裡僅提供前端代理請求的封裝，實際部署應改由 Netlify Functions 代為呼叫供應商 API。

type B2CInput = {
  orderId: string
  buyer: { name: string; email?: string; phone?: string }
  items: Array<{ name: string; quantity: number; unitPrice: number }>
  amount: number
}

const API_BASE = '/api/einvoice'

async function post(path: string, body: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json().catch(()=>({}))
}

export const EInvoice = {
  async createB2C(input: B2CInput): Promise<any> {
    return await post('/create-b2c', input)
  },
  async createB2B(input: any): Promise<any> {
    return await post('/create-b2b', input)
  },
  async cancel(invoiceCode: string): Promise<any> {
    return await post('/cancel', { invoiceCode })
  },
  async query(invoiceCode: string): Promise<any> {
    return await post('/query', { invoiceCode })
  },
  async print(invoiceCode: string): Promise<any> {
    return await post('/print', { invoiceCode })
  }
}

export default EInvoice


