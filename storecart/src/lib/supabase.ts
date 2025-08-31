import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase: any = null

export function getSupabase() {
  // 即使環境變數缺失也建立 client（避免 UI 掛死），但 API 會失敗
  if (!supabase) {
    supabase = createClient(supabaseUrl || 'https://dummy.supabase.co', supabaseAnonKey || 'dummy-key', {
      auth: { storageKey: 'sb-storecart-auth' },
      // 明確注入 fetch 與預設標頭，確保帶上 apikey/Authorization
      global: {
        headers: supabaseAnonKey
          ? { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
          : {},
        fetch: (...args: any[]) => (window as any).fetch?.(...args)
      }
    })
  }
  return supabase
}

export async function checkSupabaseConnection() {
  try {
    const client = getSupabase()
    if (!client) return false

    const { data, error } = await client.from('products').select('count').limit(1)
    return !error
  } catch (error) {
    console.error('Supabase 連線檢查失敗:', error)
    return false
  }
}

