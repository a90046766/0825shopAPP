import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  ShoppingCart, 
  Star, 
  Users, 
  CheckCircle, 
  ArrowRight,
  ArrowLeft,
  Plus,
  Minus,
  Sparkles,
  Award,
  Heart,
  Shield
} from 'lucide-react'
import { supabase } from '../../utils/supabase'

function getCurrentUser(): any | null {
  try {
    const s = localStorage.getItem('supabase-auth-user')
    if (s) return JSON.parse(s)
  } catch {}
  try {
    const l = localStorage.getItem('local-auth-user')
    if (l) return JSON.parse(l)
  } catch {}
  return null
}
// 重複 import 會造成編譯錯誤，移除第二個重複 import

export default function ShopProductsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const initialCategory = (params.get('category') as any) || 'cleaning'
  const [cart, setCart] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [searchQuery, setSearchQuery] = useState('')
  const [groupOnly, setGroupOnly] = useState(false)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortKey, setSortKey] = useState<'relevance' | 'priceAsc' | 'priceDesc'>('relevance')
  const [favorites, setFavorites] = useState<string[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null)
  const [useServerApi, setUseServerApi] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [edit, setEdit] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const user = getCurrentUser()
  const isEditor = user?.role === 'admin' || user?.role === 'support'

  // 當網址列的 category 變化時同步
  useEffect(() => {
    const p = new URLSearchParams(location.search)
    const next = (p.get('category') as any) || 'cleaning'
    setSelectedCategory(next)
  }, [location.search])

  // 初始載入收藏與瀏覽紀錄
  useEffect(() => {
    try {
      const fav = JSON.parse(localStorage.getItem('shopFavorites') || '[]')
      if (Array.isArray(fav)) setFavorites(fav)
    } catch {}
    try {
      const hist = JSON.parse(localStorage.getItem('shopHistory') || '[]')
      if (Array.isArray(hist)) setHistory(hist)
    } catch {}
    // 初始化購物車（從 localStorage 帶入，避免切頁後歸零）
    try {
      const saved = JSON.parse(localStorage.getItem('shopCart') || '[]')
      if (Array.isArray(saved)) setCart(saved)
    } catch {}
  }, [])

  // 從 Supabase 讀取產品（含容錯與離線預設）
  useEffect(() => {
    const seedProducts: any[] = [
      { id: 'seed-ac-split', name: '分離式冷氣清洗', description: '專業拆洗殺菌', price: 1800, groupPrice: 1600, groupMinQty: 3, category: 'cleaning', features: ['深度清洗','除菌除臭','保固說明'], image: 'https://images.unsplash.com/photo-1528323273322-d81458248d40?q=80&w=1200&auto=format&fit=crop', images: [], published: true },
      { id: 'seed-washer', name: '洗衣機清洗（滾筒）', description: '內槽還原常新', price: 1999, groupPrice: 1799, groupMinQty: 3, category: 'cleaning', features: ['內槽拆洗','去汙抗菌','快速完工'], image: 'https://images.unsplash.com/photo-1565718815432-d975f22f1b19?q=80&w=1200&auto=format&fit=crop', images: [], published: true },
      { id: 'seed-hood', name: '抽油煙機清洗', description: '重油汙徹底處理', price: 2200, groupPrice: 2000, groupMinQty: 3, category: 'cleaning', features: ['渦輪清洗','強力去油','安全環保'], image: 'https://images.unsplash.com/photo-1599597435093-6ab35cda2f5c?q=80&w=1200&auto=format&fit=crop', images: [], published: true },
      { id: 'seed-fridge', name: '冰箱清洗除臭', description: '乾淨無異味', price: 1600, groupPrice: 1440, groupMinQty: 3, category: 'cleaning', features: ['食安無虞','抑菌處理','保鮮加分'], image: 'https://images.unsplash.com/photo-1586201375761-83865001e31b?q=80&w=1200&auto=format&fit=crop', images: [], published: true },
    ]

    const safeMap = (rows: any[]): any[] => {
      return (rows || []).map((r: any) => ({
        id: String(r.id ?? r.uuid ?? Math.random().toString(36).slice(2)),
        name: r.name ?? '',
        description: r.description ?? '',
        price: Number(r.unit_price ?? r.price ?? 0),
        groupPrice: (r.group_price ?? r.groupPrice) ?? null,
        groupMinQty: (r.group_min_qty ?? r.groupMinQty) ?? null,
        category: r.mode_code ?? r.category ?? 'cleaning',
        features: Array.isArray(r.features) ? r.features : [],
        image: Array.isArray(r.image_urls) && r.image_urls[0] ? r.image_urls[0] : (r.image || ''),
        images: Array.isArray(r.image_urls) ? r.image_urls : (Array.isArray(r.images) ? r.images : []),
        published: r.published !== undefined ? !!r.published : true
      }))
    }

    const load = async () => {
      setLoading(true)
      setError(null)
      setFallbackNotice(null)
      try {
        // 方案 S：優先走 Netlify Functions（更穩定）
        if (useServerApi) {
          try {
            const res = await fetch('/api/products-list?publishedOnly=' + (isEditor && editMode ? '0' : '1'), { method: 'GET' })
            const j = await res.json()
            if (j?.ok && Array.isArray(j.data)) {
              setAllProducts(j.data)
              if (j.data.length === 0) setFallbackNotice('目前尚無上架商品，請於管理模式新增')
              setLoading(false)
              return
            }
          } catch {}
        }

        // 方案 A：直接查 Supabase（完整欄位 + 排序，若資料表完整）
        let q = supabase
          .from('products')
          .select('id,name,unit_price,group_price,group_min_qty,description,features,image_urls,category,mode_code,published,store_sort,updated_at')
          .order('store_sort', { ascending: true })
          .order('updated_at', { ascending: false })
        if (!(isEditor && editMode)) {
          q = q.eq('published', true)
        }
        let { data, error } = await q
        if (error) {
          // 方案 B：移除可能不存在欄位（如 store_sort）
          let q2 = supabase
            .from('products')
            .select('id,name,unit_price,group_price,group_min_qty,description,features,image_urls,category,mode_code,published,updated_at')
            .order('updated_at', { ascending: false })
          if (!(isEditor && editMode)) q2 = q2.eq('published', true)
          const r2 = await q2
          data = r2.data as any
          error = r2.error as any
        }
        if (error) {
          // 方案 C：最小化查詢（select *），避免欄位不相容帶來 400
          let q3 = supabase.from('products').select('*')
          if (!(isEditor && editMode)) q3 = q3.eq('published', true)
          const r3 = await q3
          if (r3.error) throw r3.error
          const mappedC = safeMap(r3.data || [])
          setAllProducts(mappedC)
          if (mappedC.length === 0) {
            setAllProducts(seedProducts)
            setFallbackNotice('目前顯示預設商品（資料庫無資料或未上架）')
          }
          return
        }

        const mapped = safeMap(data || [])
        if (mapped.length === 0) {
          setAllProducts(seedProducts)
          setFallbackNotice('目前顯示預設商品（暫無上架商品）')
        } else {
          setAllProducts(mapped)
        }
      } catch (e: any) {
        // 完全失敗：離線/連線錯誤 → 顯示預設商品，並給管理員看到錯誤
        setError(e?.message || String(e))
        setAllProducts(seedProducts)
        setFallbackNotice('連線異常，暫時顯示預設商品')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [editMode, isEditor, useServerApi])

  const reloadProducts = async () => {
    setLoading(true)
    setError(null)
    setFallbackNotice(null)
    try {
      let q = supabase
        .from('products')
        .select('id,name,unit_price,group_price,group_min_qty,description,features,image_urls,category,mode_code,published,updated_at')
        .order('updated_at', { ascending: false })
      if (!(isEditor && editMode)) q = q.eq('published', true)
      const { data, error } = await q
      if (error) throw error
      const mapped = (data || []).map((r: any) => ({
        id: String(r.id ?? Math.random().toString(36).slice(2)),
        name: r.name ?? '',
        description: r.description ?? '',
        price: Number(r.unit_price ?? r.price ?? 0),
        groupPrice: r.group_price ?? null,
        groupMinQty: r.group_min_qty ?? null,
        category: r.mode_code ?? r.category ?? 'cleaning',
        features: Array.isArray(r.features) ? r.features : [],
        image: Array.isArray(r.image_urls) && r.image_urls[0] ? r.image_urls[0] : (r.image || ''),
        images: Array.isArray(r.image_urls) ? r.image_urls : [],
        published: !!r.published
      }))
      if (mapped.length === 0) setFallbackNotice('目前顯示預設商品（暫無上架商品）')
      setAllProducts(mapped)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  const beginCreate = () => {
    setEdit({
      id: null,
      name: '',
      description: '',
      price: 0,
      groupPrice: null,
      groupMinQty: null,
      category: selectedCategory || 'cleaning',
      features: [],
      image: '',
      images: [],
      published: true
    })
  }

  const beginEdit = (p: any) => {
    setEdit({ ...p, features: Array.isArray(p.features) ? p.features : [] })
  }

  const saveEdit = async () => {
    if (!edit) return
    setSaving(true)
    try {
      const row: any = {
        name: edit.name || '',
        unit_price: Number(edit.price || 0),
        group_price: edit.groupPrice ?? null,
        group_min_qty: edit.groupMinQty ?? null,
        description: edit.description || '',
        features: Array.isArray(edit.features) ? edit.features : String(edit.features||'').split(',').map((s:string)=>s.trim()).filter(Boolean),
        image_urls: Array.isArray(edit.images) && edit.images.length>0 ? edit.images : (edit.image ? [edit.image] : []),
        category: edit.category,
        mode_code: edit.category,
        published: !!edit.published,
        updated_at: new Date().toISOString()
      }
      // 經過 Functions 透過 Service Role 寫入，避免 CORS/RLS 攔截
      const res = await fetch('/api/products-upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: edit.id, ...row })
      })
      const j = await res.json().catch(()=>({ ok:false }))
      if (!j?.ok) throw new Error(j?.error || '保存失敗')
      setEdit(null)
      await reloadProducts()
    } catch (e: any) {
      alert(`儲存失敗：${e?.message || e}`)
    } finally {
      setSaving(false)
    }
  }

  const deleteEdit = async () => {
    if (!edit?.id) { setEdit(null); return }
    if (!confirm('確定刪除此商品？')) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('products').delete().eq('id', edit.id)
      if (error) throw error
      setEdit(null)
      await reloadProducts()
    } catch (e: any) {
      alert(`刪除失敗：${e?.message || e}`)
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    try { localStorage.setItem('shopFavorites', JSON.stringify(favorites)) } catch {}
  }, [favorites])

  useEffect(() => {
    try { localStorage.setItem('shopHistory', JSON.stringify(history)) } catch {}
  }, [history])

  // 持久化購物車，避免到結帳頁歸零
  useEffect(() => {
    try { localStorage.setItem('shopCart', JSON.stringify(cart)) } catch {}
  }, [cart])

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId])
  }

  const addToHistory = (product: any) => {
    setHistory(prev => {
      const without = prev.filter((p:any) => p.id !== product.id)
      const entry = { id: product.id, name: product.name, image: product.image, price: product.price, category: product.category }
      return [entry, ...without].slice(0, 10)
    })
  }

  // 所有產品由資料庫取得（上方 useEffect）

  // 根據分類/關鍵字/團購/價格區間篩選 + 排序
  const filteredProducts = (() => {
    const min = minPrice ? Math.max(0, Number(minPrice)) : 0
    const max = maxPrice ? Math.max(min, Number(maxPrice)) : Infinity
    const base = allProducts
      .filter(p => selectedCategory === 'all' ? true : p.category === selectedCategory)
      .filter(p => {
        if (!searchQuery.trim()) return true
        const q = searchQuery.trim().toLowerCase()
        const hay = [p.name, p.description, ...(p.features||[])].join(' ').toLowerCase()
        return hay.includes(q)
      })
      .filter(p => groupOnly ? !!p.groupPrice : true)
      .filter(p => p.price >= min && p.price <= max)

    const sorted = [...base].sort((a:any, b:any) => {
      if (sortKey === 'priceAsc') return a.price - b.price
      if (sortKey === 'priceDesc') return b.price - a.price
      return 0
    })
    return sorted
  })()

  // 添加到購物車
  const addToCart = (product: any) => {
    const existingItem = cart.find(item => item.id === product.id)
    // 銷售型態規則：
    // cleaning/home：可無限增加
    // used：唯一單一件（不可重複）
    // new：限制最多 2 件
    if (existingItem) {
      const category = product.category
      if (category === 'used') {
        return // 二手件唯一單一件
      }
      if (category === 'new' && existingItem.quantity >= 2) {
        return // 新家電上限 2 件
      }
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      const initialQty = product.category === 'used' ? 1 : 1
      setCart([...cart, { ...product, quantity: initialQty }])
    }
  }

  // 從購物車移除
  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId))
  }

  // 更新數量
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
    } else {
      setCart(cart.map(item => 
        item.id === productId ? { ...item, quantity } : item
      ))
    }
  }

  // 計算總價
  const totalPrice = cart.reduce((sum, item) => {
    const product = allProducts.find(p => p.id === item.id)
    if (product?.groupPrice && product?.groupMinQty && item.quantity >= product.groupMinQty) {
      return sum + (product.groupPrice * item.quantity)
    }
    return sum + (product?.price || 0) * item.quantity
  }, 0)

  // 計算團購優惠
  const groupBuySavings = cart.reduce((sum, item) => {
    const product = allProducts.find(p => p.id === item.id)
    if (product?.groupPrice && product?.groupMinQty && item.quantity >= product.groupMinQty) {
      return sum + ((product.price - product.groupPrice) * item.quantity)
    }
    return sum
  }, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頁面標題 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-10 md:py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
          <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">我們的產品與服務</h1>
          <p className="text-sm md:text-xl opacity-90">
            專業的日式洗濯服務，讓您的家電煥然一新
          </p>
        </div>
      </div>

      {/* 分類與搜尋列 */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between py-3 md:py-4">
            <div className="flex items-center space-x-6 overflow-x-auto">
              <Link to="/store" className="inline-flex items-center text-blue-600 hover:text-blue-700 text-xs md:text-base">
                <ArrowLeft className="h-4 w-4 mr-1 hidden md:inline" />
                首頁
              </Link>
              <button
                onClick={() => navigate('/store/products?category=cleaning')}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'cleaning'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                專業清洗服務
              </button>
              <button
                onClick={() => navigate('/store/products?category=new')}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'new'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                新家電銷售
              </button>
              <button
                onClick={() => navigate('/store/products?category=used')}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'used'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                二手家電
              </button>
              <button
                onClick={() => navigate('/store/products?category=home')}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'home'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                居家清潔
              </button>
            </div>

            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              {isEditor && (
                <>
                  <button
                    onClick={()=> setEditMode(v=>!v)}
                    className="rounded bg-gray-100 px-3 py-1 text-xs md:text-sm text-gray-700"
                  >{editMode ? '關閉管理' : '管理模式'}</button>
                  {editMode && (
                    <button
                      onClick={beginCreate}
                      className="rounded bg-blue-600 px-3 py-1 text-xs md:text-sm text-white"
                    >新增商品</button>
                  )}
                </>
              )}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e)=> setSearchQuery(e.target.value)}
                  placeholder="搜尋服務 / 商品關鍵字"
                  className="w-48 md:w-64 max-w-full rounded-lg border px-3 md:px-4 py-1.5 md:py-2 pr-8 md:pr-10 text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="pointer-events-none absolute right-2 md:right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              </div>
              <label className="inline-flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-700">
                <input type="checkbox" checked={groupOnly} onChange={(e)=> setGroupOnly(e.target.checked)} />
                只看可團購
              </label>
              <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                <input
                  type="number"
                  min={0}
                  value={minPrice}
                  onChange={(e)=> setMinPrice(e.target.value)}
                  placeholder="最低價"
                  className="w-20 md:w-24 rounded-lg border px-2 py-1.5 md:py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  min={0}
                  value={maxPrice}
                  onChange={(e)=> setMaxPrice(e.target.value)}
                  placeholder="最高價"
                  className="w-20 md:w-24 rounded-lg border px-2 py-1.5 md:py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={sortKey}
                  onChange={(e)=> setSortKey(e.target.value as any)}
                  className="ml-1.5 md:ml-2 rounded-lg border px-2 py-1.5 md:py-2 text-xs md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="relevance">預設排序</option>
                  <option value="priceAsc">價格（低→高）</option>
                  <option value="priceDesc">價格（高→低）</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-8">
          {/* 產品列表 */}
          <div className="lg:col-span-3">
            {loading && (
              <div className="mb-3 rounded border p-3 text-sm text-gray-600">載入中…</div>
            )}
            {error && (
              <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {isEditor ? `載入商品失敗：${error}` : '商品載入異常，請稍後再試'}
              </div>
            )}
            {fallbackNotice && (
              <div className="mb-3 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                {fallbackNotice}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
                >
                  {/* 產品圖片 */}
                  <div className="h-40 md:h-48 bg-gray-100 relative" onClick={()=> addToHistory(product)}>
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    {isEditor && editMode && (
                      <div className="absolute right-2 top-2 z-10 flex gap-1">
                        <button onClick={()=> beginEdit(product)} className="rounded bg-white/90 px-2 py-0.5 text-xs text-gray-800 hover:bg-white">編輯</button>
                      </div>
                    )}
                    {(!product.published) && (
                      <div className="absolute left-2 top-2 z-10 rounded bg-gray-700/90 px-2 py-0.5 text-[10px] text-white">草稿</div>
                    )}
                    <button
                      type="button"
                      onClick={(e)=> { e.stopPropagation(); toggleFavorite(product.id) }}
                      className={`absolute top-2 right-2 md:top-3 md:right-3 rounded-full p-1.5 md:p-2 ${favorites.includes(product.id) ? 'bg-rose-500 text-white' : 'bg-white text-gray-600'} shadow`}
                      aria-label="favorite"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 md:h-4 md:w-4">
                        <path d="M11.645 20.91l-.007-.003-.022-.01a15.247 15.247 0 01-.383-.173 25.18 25.18 0 01-4.244-2.457C4.688 16.744 2.25 14.328 2.25 11.25 2.25 8.75 4.2 6.75 6.75 6.75c1.591 0 3.094.735 4.095 1.878a5.248 5.248 0 014.095-1.878c2.55 0 4.5 2 4.5 4.5 0 3.078-2.438 5.494-4.739 6.997a25.175 25.175 0 01-4.244 2.457 15.247 15.247 0 01-.383.173l-.022.01-.007.003-.003.001a.75.75 0 01-.592 0l-.003-.001z" />
                      </svg>
                    </button>
                    {product.category === 'cleaning' && (
                      <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-blue-600 text-white px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium">
                        專業清洗
                      </div>
                    )}
                    {product.category === 'new' && (
                      <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-green-600 text-white px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium">
                        新品
                      </div>
                    )}
                    {product.category === 'used' && (
                      <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-orange-600 text-white px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium">
                        二手
                      </div>
                    )}
                    {product.category === 'home' && (
                      <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-purple-600 text-white px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium">
                        居家清潔
                      </div>
                    )}
                  </div>

                  {/* 產品資訊 */}
                  <div className="p-4 md:p-6">
                    <h3 className="text-base md:text-xl font-bold text-gray-900 mb-1 md:mb-2">
                      {product.name}
                    </h3>
                    <p className="text-gray-600 mb-3 md:mb-4 line-clamp-2 text-sm md:text-base">
                      {product.description}
                    </p>

                    {/* 價格資訊 */}
                    <div className="mb-3 md:mb-4">
                      <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                        <span className="text-lg md:text-2xl font-bold text-blue-600">
                          NT$ {product.price.toLocaleString()}
                        </span>
                        {product.groupPrice && (
                          <span className="text-xs md:text-sm text-orange-600 font-medium">
                            團購價
                          </span>
                        )}
                      </div>
                      {product.groupPrice && product.groupMinQty && (
                        <div className="text-xs md:text-sm text-orange-600">
                          團購價：NT$ {product.groupPrice.toLocaleString()} (滿{product.groupMinQty}件)
                        </div>
                      )}
                    </div>

                    {/* 特色功能 */}
                    <div className="mb-3 md:mb-4">
                      <div className="flex flex-wrap gap-1">
                        {product.features.slice(0, 3).map((feature, idx) => (
                          <span
                            key={idx}
                            className="bg-gray-100 text-gray-700 px-2 py-0.5 md:py-1 rounded text-[11px] md:text-xs"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 加入購物車按鈕 */}
                    <button
                      onClick={() => addToCart(product)}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2.5 md:py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm md:text-base"
                    >
                      <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
                      加入購物車
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 購物車側邊欄 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 lg:sticky lg:top-24">
              <h3 className="text-base md:text-xl font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                購物車
              </h3>

              {cart.length === 0 ? (
                <div className="text-center py-6 md:py-8 text-gray-500">
                  <ShoppingCart className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 md:mb-3 text-gray-300" />
                  <p>購物車是空的</p>
                  <p className="text-xs md:text-sm">開始選購商品吧！</p>
                </div>
              ) : (
                <>
                  {/* 購物車商品列表 */}
                  <div className="space-y-3 mb-3 md:mb-4 max-h-48 md:max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate text-sm md:text-base">
                            {item.name}
                          </h4>
                          <div className="text-xs md:text-sm text-gray-600">
                            NT$ {item.price.toLocaleString()} × {item.quantity}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Minus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                          </button>
                          <span className="w-8 text-center text-xs md:text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 價格摘要 */}
                  <div className="border-t pt-4 space-y-2 mb-4">
                    <div className="flex justify-between text-xs md:text-sm text-gray-600">
                      <span>商品總計</span>
                      <span>NT$ {totalPrice.toLocaleString()}</span>
                    </div>
                    {groupBuySavings > 0 && (
                      <div className="flex justify-between text-xs md:text-sm text-orange-600">
                        <span>團購優惠</span>
                        <span>-NT$ {groupBuySavings.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base md:text-lg font-bold text-gray-900 pt-2 border-t">
                      <span>應付金額</span>
                      <span>NT$ {(totalPrice - groupBuySavings).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* 結帳按鈕 */}
                  <Link
                    to="/store/cart"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2.5 md:py-3 px-4 rounded-xl font-semibold transition-all duration-300 text-center block text-sm md:text-base"
                  >
                    前往結帳
                    <ArrowRight className="inline ml-2 h-4 w-4 md:h-5 md:w-5" />
                  </Link>

                  {/* 最近瀏覽 */}
                  {history.length > 0 && (
                    <div className="mt-8 border-t pt-4">
                      <div className="text-xs md:text-sm font-semibold text-gray-800 mb-2">最近瀏覽</div>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {history.map((h:any) => (
                          <div key={h.id} className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden">
                              <img src={h.image} alt={h.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs md:text-sm font-medium text-gray-900 truncate">{h.name}</div>
                              <div className="text-[11px] md:text-xs text-gray-600">NT$ {h.price?.toLocaleString?.()}</div>
                            </div>
                            <button onClick={()=> addToCart(h)} className="text-[11px] md:text-xs px-2 py-1 bg-blue-600 text-white rounded">加入</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 編輯面板 */}
      {isEditor && editMode && edit && (
        <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-black/30 p-3">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-bold">{edit.id ? '編輯商品' : '新增商品'}</div>
              <button onClick={()=> setEdit(null)} className="rounded bg-gray-100 px-3 py-1 text-xs text-gray-700">關閉</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-gray-600">名稱</span>
                <input className="rounded border px-2 py-1" value={edit.name} onChange={e=> setEdit({...edit, name: e.target.value})} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-gray-600">分類</span>
                <select className="rounded border px-2 py-1" value={edit.category} onChange={e=> setEdit({...edit, category: e.target.value})}>
                  <option value="cleaning">專業清洗</option>
                  <option value="home">居家清潔</option>
                  <option value="new">家電購買</option>
                  <option value="used">二手家電</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-gray-600">單價</span>
                <input type="number" min={0} className="rounded border px-2 py-1" value={edit.price} onChange={e=> setEdit({...edit, price: Number(e.target.value||0)})} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-gray-600">團購價</span>
                  <input type="number" min={0} className="rounded border px-2 py-1" value={edit.groupPrice ?? ''} onChange={e=> setEdit({...edit, groupPrice: e.target.value===''? null : Number(e.target.value) })} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-gray-600">團購門檻</span>
                  <input type="number" min={0} className="rounded border px-2 py-1" value={edit.groupMinQty ?? ''} onChange={e=> setEdit({...edit, groupMinQty: e.target.value===''? null : Number(e.target.value) })} />
                </label>
              </div>
              <label className="md:col-span-2 flex flex-col gap-1">
                <span className="text-gray-600">描述</span>
                <textarea rows={3} className="rounded border px-2 py-1" value={edit.description} onChange={e=> setEdit({...edit, description: e.target.value})} />
              </label>
              <label className="md:col-span-2 flex flex-col gap-1">
                <span className="text-gray-600">特色（以逗號分隔）</span>
                <input className="rounded border px-2 py-1" value={Array.isArray(edit.features)? edit.features.join(',') : ''} onChange={e=> setEdit({...edit, features: e.target.value.split(',').map((s:string)=>s.trim()).filter(Boolean)})} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-gray-600">封面圖片URL</span>
                <input className="rounded border px-2 py-1" value={edit.image || ''} onChange={e=> setEdit({...edit, image: e.target.value})} />
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!edit.published} onChange={e=> setEdit({...edit, published: e.target.checked})} />
                <span className="text-gray-700">上架</span>
              </label>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              {edit?.id && (
                <button disabled={deleting||saving} onClick={deleteEdit} className="rounded bg-red-50 px-3 py-1 text-xs text-red-600 disabled:opacity-60">{deleting? '刪除中…':'刪除'}</button>
              )}
              <button disabled={saving} onClick={saveEdit} className="rounded bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-60">{saving? '儲存中…':'儲存'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 行動版底部快速結帳列 */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t shadow-md p-3 flex items-center justify-between lg:hidden">
          <div className="text-sm">
            <div className="text-gray-600">小計</div>
            <div className="text-base font-bold text-gray-900">NT$ {(totalPrice - groupBuySavings).toLocaleString()}</div>
          </div>
          <Link
            to="/store/cart"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            前往結帳
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
      {/* 底部安全間距 */}
      <div className="h-16 lg:h-0" />
    </div>
  )
}
