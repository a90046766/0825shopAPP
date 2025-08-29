import { checkSupabaseConnection } from '../utils/supabase'

// 修改預設行為：優先使用 Supabase，只有在連線失敗時才回退本地
const RAW = String(import.meta.env.VITE_USE_SUPABASE || '').toLowerCase()
const WANT_SUPABASE = RAW === '1' || RAW === 'true' || RAW === '' // 空字串也預設為 true
const HAS_SUPABASE_KEYS = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
const USE_SUPABASE = WANT_SUPABASE && HAS_SUPABASE_KEYS

export async function loadAdapters() {
  console.log('🔧 載入 Adapters...')
  console.log('VITE_USE_SUPABASE:', import.meta.env.VITE_USE_SUPABASE)
  console.log('HAS_SUPABASE_KEYS:', HAS_SUPABASE_KEYS)
  console.log('USE_SUPABASE:', USE_SUPABASE)

  if (USE_SUPABASE) {
    try {
      console.log('🌐 嘗試連線 Supabase...')
      
      // 先檢查連線狀態
      const isConnected = await checkSupabaseConnection()
      if (!isConnected) {
        console.warn('❌ Supabase 連線失敗，回退至本地模式')
        return await import('./local/_exports')
      }

      console.log('✅ Supabase 連線成功，載入雲端 adapters...')
      const a = await import('./supabase/_exports')
      
      // 連線探測 + 首次種子，失敗則自動回退至本地模式
      try {
        console.log('🔍 測試 Supabase 資料存取...')
        const list = await a.productRepo.list()
        console.log('📦 產品列表載入成功，數量:', list?.length || 0)
        
        if (!list || list.length === 0) {
          console.log('🌱 初始化預設產品資料...')
          await a.productRepo.upsert({ id: '', name: '分離式冷氣清洗', unitPrice: 1800, groupPrice: 1600, groupMinQty: 2, description: '室內外機標準清洗，包含濾網、蒸發器、冷凝器清潔', imageUrls: [], safeStock: 20 } as any)
          await a.productRepo.upsert({ id: '', name: '洗衣機清洗（滾筒）', unitPrice: 1999, groupPrice: 1799, groupMinQty: 2, description: '滾筒式洗衣機拆洗保養，包含內筒、外筒、管路清潔', imageUrls: [], safeStock: 20 } as any)
          await a.productRepo.upsert({ id: '', name: '倒T型抽油煙機清洗', unitPrice: 2200, groupPrice: 2000, groupMinQty: 2, description: '不鏽鋼倒T型抽油煙機，包含內部機械清洗', imageUrls: [], safeStock: 20 } as any)
          await a.productRepo.upsert({ id: '', name: '傳統雙渦輪抽油煙機清洗', unitPrice: 1800, groupPrice: 1600, groupMinQty: 2, description: '傳統型雙渦輪抽油煙機清洗保養', imageUrls: [], safeStock: 20 } as any)
        }
        
        // 首次技師資料（空表時種子兩名預設技師）
        try {
          const techs = await (a as any).technicianRepo?.list?.()
          if (Array.isArray(techs) && techs.length === 0) {
            console.log('👨‍🔧 初始化預設技師資料...')
            await (a as any).technicianRepo.upsert({ name: '楊小飛', shortName: '小飛', email: 'jason660628@yahoo.com.tw', phone: '0913788051', region: 'north', status: 'active' })
            await (a as any).technicianRepo.upsert({ name: '洗小濯', shortName: '小濯', email: 'xiaofu888@yahoo.com.tw', phone: '0986985725', region: 'north', status: 'active' })
          }
        } catch (techError) {
          console.warn('⚠️ 技師資料初始化失敗:', techError)
        }
        
        console.log('✅ Supabase 模式初始化完成')
        return a
      } catch (error) {
        console.error('❌ Supabase 初始化失敗:', error)
        // 任一 API 失敗 → 回退本地
        console.log('🔄 回退至本地模式...')
        return await import('./local/_exports')
      }
    } catch (error) {
      console.error('❌ Supabase adapter 載入失敗:', error)
      // import 失敗 → 回退本地
      console.log('🔄 回退至本地模式...')
      return await import('./local/_exports')
    }
  }
  
  // 只有在明確設定 VITE_USE_SUPABASE=false 時才使用本地模式
  console.log('💾 使用本地模式（僅在開發測試時使用）')
  return await import('./local/_exports')
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


