import { checkSupabaseConnection } from '../utils/supabase'

// 單例快取：避免跨頁重複初始化/探測
let adaptersPromise: Promise<any> | null = null

// 修改預設行為：優先使用 Supabase。若設定嚴格模式，連線失敗時不回退本地，直接拋錯
const RAW = String(import.meta.env.VITE_USE_SUPABASE || '').toLowerCase()
const RAW_STRICT = String(import.meta.env.VITE_STRICT_SUPABASE || '').toLowerCase()
const WANT_SUPABASE = RAW === '1' || RAW === 'true' || RAW === '' // 空字串也預設為 true
const HAS_SUPABASE_KEYS = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
const USE_SUPABASE = WANT_SUPABASE && HAS_SUPABASE_KEYS
const STRICT = RAW_STRICT === '1' || RAW_STRICT === 'true'
const QUIET_BOOT = String(import.meta.env.VITE_QUIET_BOOT || '0').toLowerCase() === '1'

export async function loadAdapters() {
  if (adaptersPromise) return adaptersPromise
  if (!QUIET_BOOT) {
    console.log('🔧 載入 Adapters...')
    console.log('VITE_USE_SUPABASE:', import.meta.env.VITE_USE_SUPABASE)
    console.log('HAS_SUPABASE_KEYS:', HAS_SUPABASE_KEYS)
    console.log('USE_SUPABASE:', USE_SUPABASE)
    console.log('STRICT_SUPABASE:', STRICT)
  }
  adaptersPromise = (async () => {
    if (USE_SUPABASE) {
      try {
        if (!QUIET_BOOT) console.log('🌐 嘗試連線 Supabase...')
        const isConnected = await checkSupabaseConnection()
        if (!isConnected) {
          const msg = '❌ Supabase 連線失敗' + (STRICT ? '（嚴格模式）' : '，回退至本地模式')
          console.warn(msg)
          if (STRICT) throw new Error('SUPABASE_CONNECTION_FAILED')
          try { localStorage.setItem('adapter-mode', 'local') } catch {}
          return await import('./local/_exports')
        }

        if (!QUIET_BOOT) console.log('✅ Supabase 連線成功，載入雲端 adapters...')
        const a = await import('./supabase/_exports')
        try { localStorage.setItem('adapter-mode', 'supabase') } catch {}
        // 將資料探測與種子移至背景，不阻塞首屏
        setTimeout(async () => {
          if (STRICT) return
          try {
            const techs = await (a as any).technicianRepo?.list?.()
            if (Array.isArray(techs) && techs.length === 0) {
              await (a as any).technicianRepo.upsert({ name: '楊小飛', shortName: '小飛', email: 'jason660628@yahoo.com.tw', phone: '0913788051', region: 'north', status: 'active' })
              await (a as any).technicianRepo.upsert({ name: '洗小濯', shortName: '小濯', email: 'xiaofu888@yahoo.com.tw', phone: '0986985725', region: 'north', status: 'active' })
            }
          } catch {}
        }, 0)
        return a
      } catch (error) {
        if (!QUIET_BOOT) console.error('❌ Supabase 初始化失敗:', error)
        if (STRICT) throw error
        try { localStorage.setItem('adapter-mode', 'supabase') } catch {}
        throw error
      }
    }
    // 強制雲端：不支援本地 fallback
    throw new Error('SUPABASE_ONLY_MODE')
  })()
  return adaptersPromise
}

// 添加 useAuth hook
export async function useAuth() {
  const adapters = await loadAdapters()
  const user = adapters.authRepo.getCurrentUser()
  
  return {
    user,
    ...adapters
  }
}


