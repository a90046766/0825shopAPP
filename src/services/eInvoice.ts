// 電子發票服務（簡化版封裝：與 Giveme API 介接）
// 注意：這裡僅提供前端代理請求的封裝，實際部署應改由 Netlify Functions 代為呼叫供應商 API。

type B2CInput = {
  orderId: string
  buyer: { name: string; email?: string; phone?: string }
  items: Array<{ name: string; quantity: number; unitPrice: number }>
  amount: number
}

// 改為以 /api/einvoice/* 為主要路徑（對應 netlify 轉發至單一函式 einvoice.js）
const API_BASE_PRIMARY = '/api/einvoice' as const
const API_BASE_FALLBACK = '/.netlify/functions/einvoice' as const

async function withTimeoutFetch(url: string, init: any, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...(init||{}), signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

async function postWithRetry(opPath: string, body: any, timeoutMs = 10000) {
  // 規範化片段：例如 '/create-b2c'
  const path = opPath.startsWith('/') ? opPath : `/${opPath}`
  // 1) 主要走 /api/einvoice/*
  try {
    const res = await withTimeoutFetch(`${API_BASE_PRIMARY}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }, timeoutMs)
    if (res.ok) return await res.json().catch(()=>({}))
    // 若 HTTP 非 2xx，落入後備
  } catch {}
  // 2) 後備：走 /.netlify/functions/einvoice/*（直接打函式，加強保險）
  try {
    const res2 = await withTimeoutFetch(`${API_BASE_FALLBACK}${path}`, {
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
    return await postWithRetry('/create-b2c', input, 10000)
  },
  async createB2B(input: any): Promise<any> {
    return await postWithRetry('/create-b2b', input, 10000)
  },
  async cancel(invoiceCode: string): Promise<any> {
    return await postWithRetry('/cancel', { invoiceCode }, 10000)
  },
  async query(invoiceCode: string): Promise<any> {
    return await postWithRetry('/query', { invoiceCode }, 10000)
  },
  async print(invoiceCode: string): Promise<any> {
    return await postWithRetry('/print', { invoiceCode }, 10000)
  }
}

export default EInvoice


