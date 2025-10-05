// 電子發票服務（簡化版封裝：與 Giveme API 介接）
// 注意：這裡僅提供前端代理請求的封裝，實際部署應改由 Netlify Functions 代為呼叫供應商 API。

type B2CInput = {
  orderId: string
  buyer: { name: string; email?: string; phone?: string }
  items: Array<{ name: string; quantity: number; unitPrice: number }>
  amount: number
}

const API_BASE = '/.netlify/functions' as const

async function withTimeoutFetch(url: string, init: any, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...(init||{}), signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

async function postWithRetry(primaryPath: string, body: any, timeoutMs = 10000) {
  // 1) 主要走 Netlify Functions 固定路徑
  try {
    const res = await withTimeoutFetch(`${API_BASE}${primaryPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }, timeoutMs)
    if (res.ok) return await res.json().catch(()=>({}))
    // 若 HTTP 非 2xx，落入後備
  } catch {}
  // 2) 後備：走 /api/*（由 netlify.toml 轉發）
  try {
    const alt = primaryPath.startsWith('/') ? primaryPath.slice(1) : primaryPath
    const res2 = await withTimeoutFetch(`/api/${alt}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }, timeoutMs)
    if (!res2.ok) throw new Error(`HTTP ${res2.status}`)
    return await res2.json().catch(()=>({}))
  } catch (e: any) {
    throw new Error(e?.message || '發票服務請求失敗')
  }
}

export const EInvoice = {
  async createB2C(input: B2CInput): Promise<any> {
    return await postWithRetry('/einvoice-create-b2c', input, 10000)
  },
  async createB2B(input: any): Promise<any> {
    return await postWithRetry('/einvoice-create-b2b', input, 10000)
  },
  async cancel(invoiceCode: string): Promise<any> {
    return await postWithRetry('/einvoice-cancel', { invoiceCode }, 10000)
  },
  async query(invoiceCode: string): Promise<any> {
    return await postWithRetry('/einvoice-query', { invoiceCode }, 10000)
  },
  async print(invoiceCode: string): Promise<any> {
    return await postWithRetry('/einvoice-print', { invoiceCode }, 10000)
  }
}

export default EInvoice


