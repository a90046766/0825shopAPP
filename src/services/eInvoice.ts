// 電子發票服務（簡化版封裝：與 Giveme API 介接）
// 注意：這裡僅提供前端代理請求的封裝，實際部署應改由 Netlify Functions 代為呼叫供應商 API。

type B2CInput = {
  orderId: string
  buyer: { name: string; email?: string; phone?: string }
  items: Array<{ name: string; quantity: number; unitPrice: number }>
  amount: number
}

const API_BASE = '/.netlify/functions' as const

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
    // 走 Netlify Functions 正式端點
    const res = await fetch(`${API_BASE}/einvoice-create-b2c`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(input) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json().catch(()=>({}))
  },
  async createB2B(input: any): Promise<any> {
    const res = await fetch(`${API_BASE}/einvoice-create-b2b`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(input) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json().catch(()=>({}))
  },
  async cancel(invoiceCode: string): Promise<any> {
    const res = await fetch(`${API_BASE}/einvoice-cancel`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ invoiceCode }) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json().catch(()=>({}))
  },
  async query(invoiceCode: string): Promise<any> {
    const res = await fetch(`${API_BASE}/einvoice-query`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ invoiceCode }) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json().catch(()=>({}))
  },
  async print(invoiceCode: string): Promise<any> {
    const res = await fetch(`${API_BASE}/einvoice-print`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ invoiceCode }) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json().catch(()=>({}))
  }
}

export default EInvoice


