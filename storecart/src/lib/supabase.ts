import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase: any = null

export function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase 環境變數未設定')
    return null
  }

  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
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

