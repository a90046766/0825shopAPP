import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// 檢查環境變數是否存在
if (!url || !key) {
  console.warn('Supabase 環境變數未設定，將使用本地模式')
}

// 強制帶上 apikey 與 Authorization，避免偶發遺失標頭導致 401/500
export const supabase = createClient(url || 'https://dummy.supabase.co', key || 'dummy-key', {
  auth: {
    storageKey: 'sb-0825shopapp-auth',
    autoRefreshToken: true,
    persistSession: true
  },
  global: {
    // 僅強制 apikey，授權權杖交由 supabase-js 以登入 session 自動帶入
    headers: key ? { apikey: key } : {},
    // 明確使用瀏覽器 fetch，避免打包後的 typeof 檢測誤判
    fetch: (...args: any[]) => (window as any).fetch?.(...args)
  }
})

// 健康檢查函數
export const checkSupabaseConnection = async () => {
  try {
    if (!url || !key) return false
    
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('Supabase 連線失敗:', error)
      return false
    }
    
    return true
  } catch (err) {
    console.error('Supabase 健康檢查失敗:', err)
    return false
  }
}


