import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string
// 允許以本地開關快速改走 Functions：localStorage.useFunctionsOnly = '1'
// 僅在本機開發環境允許 useFunctionsOnly；正式環境一律忽略並自動清除
const isLocalDev = (() => {
  try {
    if (typeof window === 'undefined') return false
    const h = window.location.hostname
    const isLocalName = (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.local'))
    const isFile = window.location.protocol === 'file:'
    return isLocalName || isFile
  } catch { return false }
})()
try {
  if (typeof window !== 'undefined' && !isLocalDev && localStorage.getItem('useFunctionsOnly') === '1') {
    localStorage.removeItem('useFunctionsOnly')
  }
} catch {}
const forceFunctionsOnly = (typeof window !== 'undefined') && isLocalDev && (localStorage.getItem('useFunctionsOnly') === '1')
// 對 supabase 請求設置逾時：Auth 15s，REST 20s；遇到 AbortError 自動重試一次
const BASE_TIMEOUT_MS = 20000
const AUTH_TIMEOUT_MS = 15000
const timeoutFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const makeUrlString = () => {
    try {
      return typeof input === 'string'
        ? input
        : (input instanceof URL ? input.href : (input as any)?.url || '')
    } catch { return '' }
  }
  const urlStr = makeUrlString()
  const isAuth = /\/auth\//.test(urlStr)
  const timeoutMs = isAuth ? AUTH_TIMEOUT_MS : BASE_TIMEOUT_MS
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  const nextInit = { ...(init||{}), signal: controller.signal }
  try {
    return await (window as any).fetch(input as any, nextInit)
  } catch (err: any) {
    // 若為逾時中止，進行一次後備重試（放寬 10s 並不帶 signal）
    if (err && (err.name === 'AbortError' || String(err).includes('AbortError'))) {
      try {
        const ctrl2 = new AbortController()
        const t2 = setTimeout(() => ctrl2.abort(), Math.max(10000, timeoutMs))
        try {
          return await (window as any).fetch(input as any, { ...(init||{}), signal: ctrl2.signal })
        } finally {
          clearTimeout(t2)
        }
      } catch {}
    }
    throw err
  } finally {
    clearTimeout(t)
  }
}

// 檢查環境變數是否存在
if (!url || !key) {
  console.warn('Supabase 環境變數未設定，將使用本地模式')
}

// 強制帶上 apikey 與 Authorization，避免偶發遺失標頭導致 401/500
export const supabase = createClient((forceFunctionsOnly ? 'https://invalid.supabase.local' : (url || 'https://dummy.supabase.co')), key || 'dummy-key', {
  auth: {
    storageKey: 'sb-0825shopapp-auth',
    autoRefreshToken: true,
    persistSession: true
  },
  global: {
    // 僅強制 apikey，授權權杖交由 supabase-js 以登入 session 自動帶入
    headers: key ? { apikey: key, Accept: 'application/json' } : { Accept: 'application/json' },
    // 明確使用瀏覽器 fetch + 逾時，避免長時間卡住
    fetch: (input: any, init?: any) => timeoutFetch(input as any, init as any)
  }
})

// 健康檢查函數
export const checkSupabaseConnection = async () => {
  try {
    if (!url || !key || forceFunctionsOnly) return false
    // 1) 直接呼叫 Auth 健康檢查端點（加上 3s 超時，避免卡住）
    try {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 3000)
      const res = await fetch(`${url}/auth/v1/health`, {
        method: 'GET',
        headers: { 'apikey': key },
        mode: 'cors',
        signal: controller.signal
      })
      clearTimeout(t)
      if (res.ok) return true
    } catch (e) {
      // 靜默改用 session 測試
    }

    // 2) 後備：檢查 auth session（若匿名也不應拋例外）
    const { error } = await supabase.auth.getSession()
    if (error) {
      console.error('Supabase 連線失敗 (getSession):', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Supabase 健康檢查失敗:', err)
    return false
  }
}

// 背景 30 秒心跳：低風險刷新 session 與偵測連線；失敗不打擾使用者
(() => {
  try {
    let timer: any = null
    const beat = async () => {
      try {
        await supabase.auth.getSession()
      } catch {}
      finally {
        timer = setTimeout(beat, 30_000)
      }
    }
    // 僅在瀏覽器啟動
    if (typeof window !== 'undefined') {
      timer = setTimeout(beat, 30_000)
      window.addEventListener('beforeunload', () => { try { clearTimeout(timer) } catch {} })
    }
  } catch {}
})()


