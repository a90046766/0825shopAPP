// 電子發票服務（簡化版封裝：與 Giveme API 介接）
// 注意：這裡僅提供前端代理請求的封裝，實際部署應改由 Netlify Functions 代為呼叫供應商 API。

type B2CInput = {
  orderId: string
  buyer: { name: string; email?: string; phone?: string }
  items: Array<{ name: string; quantity: number; unitPrice: number }>
  amount: number
}

// 回到正式供應商函式：使用具名函式端點
const API_B2C = '/.netlify/functions/einvoice-create-b2c'
const API_B2B = '/.netlify/functions/einvoice-create-b2b'
const API_CANCEL = '/.netlify/functions/einvoice-cancel'
const API_QUERY = '/.netlify/functions/einvoice-query'
const API_PRINT = '/.netlify/functions/einvoice-print'

async function withTimeoutFetch(url: string, init: any, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...(init||{}), signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

async function postJson(url: string, body: any, timeoutMs = 12000) {
  const res = await withTimeoutFetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) }, timeoutMs)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const j = await res.json().catch(()=>({}))
  if (!j || (!j.success && !j.invoiceNumber && !j.code)) throw new Error(j?.error || '供應商無有效回應')
  return j
}

export const EInvoice = {
  async createB2C(input: B2CInput): Promise<any> {
    return await postJson(API_B2C, input, 12000)
  },
  async createB2B(input: any): Promise<any> {
    return await postJson(API_B2B, input, 12000)
  },
  async cancel(invoiceCode: string): Promise<any> {
    return await postJson(API_CANCEL, { invoiceCode }, 12000)
  },
  async query(invoiceCode: string): Promise<any> {
    return await postJson(API_QUERY, { invoiceCode }, 12000)
  },
  async print(invoiceCode: string): Promise<any> {
    return await postJson(API_PRINT, { invoiceCode }, 12000)
  }
}

export default EInvoice


