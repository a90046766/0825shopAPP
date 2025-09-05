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

  // 專業清洗服務產品（參考 942clean.com.tw）
  const cleaningProducts = [
    {
      id: 'ac-split',
      name: '分離式冷氣清洗',
      description: '室內外機標準清洗，包含濾網、蒸發器、冷凝器清潔，延長冷氣壽命',
      price: 1800,
      groupPrice: 1600,
      groupMinQty: 3,
      category: 'cleaning',
      features: ['專業技師', '環保清潔劑', '30天保固', '免費檢測'],
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'ac-window',
      name: '窗型冷氣清洗',
      description: '窗型冷氣深度清洗，除塵、除菌、除異味，恢復冷房效果',
      price: 1500,
      groupPrice: 1350,
      groupMinQty: 3,
      category: 'cleaning',
      features: ['深度清洗', '除菌除臭', '30天保固', '免費檢測'],
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'washer-drum',
      name: '洗衣機清洗（滾筒）',
      description: '滾筒式洗衣機拆洗保養，包含內筒、外筒、管路清潔，去除黴菌',
      price: 1999,
      groupPrice: 1799,
      groupMinQty: 3,
      category: 'cleaning',
      features: ['拆洗保養', '除黴除菌', '30天保固', '免費檢測'],
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'washer-vertical',
      name: '洗衣機清洗（直立）',
      description: '直立式洗衣機深度清洗，去除洗衣槽污垢，恢復清潔效果',
      price: 1799,
      groupPrice: 1619,
      groupMinQty: 3,
      category: 'cleaning',
      features: ['深度清洗', '除垢除菌', '30天保固', '免費檢測'],
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'hood-inverted',
      name: '倒T型抽油煙機清洗',
      description: '不鏽鋼倒T型抽油煙機，包含內部機械清洗，去除油垢',
      price: 2200,
      groupPrice: 2000,
      groupMinQty: 3,
      category: 'cleaning',
      features: ['機械清洗', '除油除垢', '30天保固', '免費檢測'],
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'hood-traditional',
      name: '傳統雙渦輪抽油煙機清洗',
      description: '傳統型雙渦輪抽油煙機清洗保養，恢復吸油煙效果',
      price: 1800,
      groupPrice: 1600,
      groupMinQty: 3,
      category: 'cleaning',
      features: ['渦輪清洗', '除油除垢', '30天保固', '免費檢測'],
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'fridge-clean',
      name: '冰箱清洗除臭',
      description: '冰箱內部深度清洗，去除異味，除菌消毒，延長使用壽命',
      price: 1600,
      groupPrice: 1440,
      groupMinQty: 3,
      category: 'cleaning',
      features: ['深度清洗', '除臭除菌', '30天保固', '免費檢測'],
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'water-heater',
      name: '熱水器除垢清洗',
      description: '電熱水器除垢清洗，延長使用壽命，提高加熱效率',
      price: 1400,
      groupPrice: 1260,
      groupMinQty: 3,
      category: 'cleaning',
      features: ['除垢清洗', '延長壽命', '30天保固', '免費檢測'],
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    }
  ]

  // 新家電銷售產品
  const newAppliances = [
    {
      id: 'ac-new-split',
      name: '日立分離式冷氣',
      description: '變頻分離式冷氣，節能省電，靜音設計',
      price: 25000,
      category: 'new',
      features: ['變頻節能', '靜音設計', '原廠保固', '免費安裝'],
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'washer-new',
      name: 'LG滾筒洗衣機',
      description: '大容量滾筒洗衣機，蒸汽除菌，智能控制',
      price: 32000,
      category: 'new',
      features: ['大容量', '蒸汽除菌', '原廠保固', '免費安裝'],
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'hood-new',
      name: '櫻花抽油煙機',
      description: '強力抽油煙機，靜音設計，易清潔',
      price: 15000,
      category: 'new',
      features: ['強力抽風', '靜音設計', '原廠保固', '免費安裝'],
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    }
  ]

  // 二手家電產品
  const usedAppliances = [
    {
      id: 'ac-used-split',
      name: '二手分離式冷氣',
      description: '品質檢驗二手冷氣，功能正常，價格實惠',
      price: 8000,
      category: 'used',
      features: ['品質檢驗', '功能正常', '90天保固', '環保選擇'],
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'washer-used',
      name: '二手洗衣機',
      description: '檢驗合格二手洗衣機，節省預算，環保選擇',
      price: 5000,
      category: 'used',
      features: ['檢驗合格', '節省預算', '90天保固', '環保選擇'],
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'fridge-used',
      name: '二手冰箱',
      description: '功能正常二手冰箱，大容量，適合小家庭',
      price: 6000,
      category: 'used',
      features: ['功能正常', '大容量', '90天保固', '環保選擇'],
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    }
  ]

  // 居家清潔服務
  const homeCleaning = [
    {
      id: 'cleaning-regular',
      name: '定期居家清潔',
      description: '每週/每月定期清潔服務，保持居家環境整潔',
      price: 2500,
      category: 'home',
      features: ['定期服務', '專業清潔', '滿意保證', '環保清潔劑'],
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'cleaning-deep',
      name: '深度居家清潔',
      description: '年度深度清潔，包含死角、高處、特殊區域',
      price: 3500,
      category: 'home',
      features: ['深度清潔', '死角處理', '滿意保證', '環保清潔劑'],
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'cleaning-move',
      name: '搬家清潔服務',
      description: '搬家前後清潔服務，讓新家煥然一新',
      price: 4000,
      category: 'home',
      features: ['搬家清潔', '全面清潔', '滿意保證', '環保清潔劑'],
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    }
  ]

  // 合併所有產品
  const allProducts = [...cleaningProducts, ...newAppliances, ...usedAppliances, ...homeCleaning]

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
                返回首頁
              </Link>
              <button
                onClick={() => navigate('/shop/products?category=cleaning')}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'cleaning'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                專業清洗服務
              </button>
              <button
                onClick={() => navigate('/shop/products?category=new')}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'new'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                新家電銷售
              </button>
              <button
                onClick={() => navigate('/shop/products?category=used')}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'used'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                二手家電
              </button>
              <button
                onClick={() => navigate('/shop/products?category=home')}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
                >
                  {/* 產品圖片 */}
                  <div className="h-40 md:h-48 bg-gray-100 relative" onClick={()=> addToHistory(product)}>
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
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
                    to="/shop/cart"
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

      {/* 行動版底部快速結帳列 */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t shadow-md p-3 flex items-center justify-between lg:hidden">
          <div className="text-sm">
            <div className="text-gray-600">小計</div>
            <div className="text-base font-bold text-gray-900">NT$ {(totalPrice - groupBuySavings).toLocaleString()}</div>
          </div>
          <Link
            to="/shop/cart"
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
