import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// 檢查環境變數是否存在
if (!url || !key) {
  console.warn('Supabase 環境變數未設定，將使用本地模式')
}

export const supabase = createClient(url || 'https://dummy.supabase.co', key || 'dummy-key')

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


