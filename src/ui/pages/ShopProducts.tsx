import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  ShoppingCart, 
  Star, 
  Users, 
  CheckCircle, 
  ArrowRight,
  Plus,
  Minus,
  Sparkles,
  Award,
  Heart,
  Shield
} from 'lucide-react'

export default function ShopProductsPage() {
  const [cart, setCart] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')

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

  // 根據分類篩選產品
  const filteredProducts = selectedCategory === 'all' 
    ? allProducts 
    : allProducts.filter(p => p.category === selectedCategory)

  // 添加到購物車
  const addToCart = (product: any) => {
    const existingItem = cart.find(item => item.id === product.id)
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
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
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold mb-4">我們的產品與服務</h1>
          <p className="text-xl opacity-90">
            專業的日式洗濯服務，讓您的家電煥然一新
          </p>
        </div>
      </div>

      {/* 分類導航 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8 overflow-x-auto py-4">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              全部產品
            </button>
            <button
              onClick={() => setSelectedCategory('cleaning')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'cleaning'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              專業清洗服務
            </button>
            <button
              onClick={() => setSelectedCategory('new')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'new'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              新家電銷售
            </button>
            <button
              onClick={() => setSelectedCategory('used')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'used'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              二手家電
            </button>
            <button
              onClick={() => setSelectedCategory('home')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'home'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              居家清潔
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 產品列表 */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
                >
                  {/* 產品圖片 */}
                  <div className="h-48 bg-gray-100 relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    {product.category === 'cleaning' && (
                      <div className="absolute top-3 left-3 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                        專業清洗
                      </div>
                    )}
                    {product.category === 'new' && (
                      <div className="absolute top-3 left-3 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                        新品
                      </div>
                    )}
                    {product.category === 'used' && (
                      <div className="absolute top-3 left-3 bg-orange-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                        二手
                      </div>
                    )}
                    {product.category === 'home' && (
                      <div className="absolute top-3 left-3 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                        居家清潔
                      </div>
                    )}
                  </div>

                  {/* 產品資訊 */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {product.name}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {product.description}
                    </p>

                    {/* 價格資訊 */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl font-bold text-blue-600">
                          NT$ {product.price.toLocaleString()}
                        </span>
                        {product.groupPrice && (
                          <span className="text-sm text-orange-600 font-medium">
                            團購價
                          </span>
                        )}
                      </div>
                      {product.groupPrice && product.groupMinQty && (
                        <div className="text-sm text-orange-600">
                          團購價：NT$ {product.groupPrice.toLocaleString()} (滿{product.groupMinQty}件)
                        </div>
                      )}
                    </div>

                    {/* 特色功能 */}
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {product.features.slice(0, 3).map((feature, idx) => (
                          <span
                            key={idx}
                            className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 加入購物車按鈕 */}
                    <button
                      onClick={() => addToCart(product)}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      加入購物車
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 購物車側邊欄 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
                購物車
              </h3>

              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>購物車是空的</p>
                  <p className="text-sm">開始選購商品吧！</p>
                </div>
              ) : (
                <>
                  {/* 購物車商品列表 */}
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {item.name}
                          </h4>
                          <div className="text-sm text-gray-600">
                            NT$ {item.price.toLocaleString()} × {item.quantity}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 價格摘要 */}
                  <div className="border-t pt-4 space-y-2 mb-4">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>商品總計</span>
                      <span>NT$ {totalPrice.toLocaleString()}</span>
                    </div>
                    {groupBuySavings > 0 && (
                      <div className="flex justify-between text-sm text-orange-600">
                        <span>團購優惠</span>
                        <span>-NT$ {groupBuySavings.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                      <span>應付金額</span>
                      <span>NT$ {(totalPrice - groupBuySavings).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* 結帳按鈕 */}
                  <Link
                    to="/shop/cart"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 text-center block"
                  >
                    前往結帳
                    <ArrowRight className="inline ml-2 h-5 w-5" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
