import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const useSupabase = import.meta.env.VITE_USE_SUPABASE === '1'

let supabase: any = null

export function getSupabase() {
  // 如果設定為不使用 Supabase 或環境變數缺失，返回 null
  if (!useSupabase || !supabaseUrl || !supabaseAnonKey) {
    console.log('Supabase 未啟用或配置不完整，使用本地模式')
    return null
  }

  // 建立 Supabase client
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { storageKey: 'sb-storecart-auth' },
      global: {
        headers: { 
          apikey: supabaseAnonKey, 
          Authorization: `Bearer ${supabaseAnonKey}` 
        },
        fetch: (...args: any[]) => (window as any).fetch?.(...args)
      }
    })
  }
  return supabase
}

export async function checkSupabaseConnection() {
  try {
    const client = getSupabase()
    if (!client) {
      console.log('Supabase 未啟用，跳過連線檢查')
      return false
    }

    const { data, error } = await client.from('products').select('count').limit(1)
    return !error
  } catch (error) {
    console.error('Supabase 連線檢查失敗:', error)
    return false
  }
}

// 檢查是否啟用 Supabase
export function isSupabaseEnabled() {
  return useSupabase && !!supabaseUrl && !!supabaseAnonKey
}

