import React, { useState } from 'react'
import { useCartStore } from '../store/cart'
import { ShoppingCart, Star, Clock, Shield, Users, Zap, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProductsPage() {
  const { addToCart, getItemQuantity } = useCartStore()
  const [selectedCategory, setSelectedCategory] = useState('all')

  // 專業清洗服務產品
  const cleaningServices = [
    {
      id: 'ac_cleaning_1',
      name: '分離式冷氣清洗',
      description: '室內外機深度清洗，包含濾網清潔、蒸發器除菌、冷凝器清潔',
      price: 1500,
      groupBuyPrice: 1300,
      category: '冷氣清洗',
      duration: '2-3小時',
      features: ['濾網清潔', '蒸發器除菌', '冷凝器清潔', '排水管疏通', '30天保固'],
      image: null,
      currentStock: 999,
      modeCode: 'service'
    },
    {
      id: 'ac_cleaning_2',
      name: '窗型冷氣清洗',
      description: '窗型冷氣機完整清洗，包含機體清潔、濾網更換、效能檢測',
      price: 1200,
      groupBuyPrice: 1000,
      category: '冷氣清洗',
      duration: '1.5-2小時',
      features: ['機體清潔', '濾網更換', '效能檢測', '排水檢查', '30天保固'],
      image: null,
      currentStock: 999,
      modeCode: 'service'
    },
    {
      id: 'washer_cleaning_1',
      name: '滾筒洗衣機清洗',
      description: '滾筒洗衣機深度清洗，去除洗衣槽污垢、除菌除臭、效能提升',
      price: 1200,
      groupBuyPrice: 1000,
      category: '洗衣機清洗',
      duration: '2-3小時',
      features: ['洗衣槽清潔', '除菌除臭', '效能提升', '排水管疏通', '30天保固'],
      image: null,
      currentStock: 999,
      modeCode: 'service'
    },
    {
      id: 'washer_cleaning_2',
      name: '直立式洗衣機清洗',
      description: '直立式洗衣機完整清洗，包含內槽清潔、濾網清潔、除菌處理',
      price: 1000,
      groupBuyPrice: 800,
      category: '洗衣機清洗',
      duration: '1.5-2小時',
      features: ['內槽清潔', '濾網清潔', '除菌處理', '效能檢測', '30天保固'],
      image: null,
      currentStock: 999,
      modeCode: 'service'
    },
    {
      id: 'hood_cleaning_1',
      name: '抽油煙機深度清洗',
      description: '抽油煙機完整拆洗，包含風扇清潔、油網清潔、除油除臭',
      price: 1000,
      groupBuyPrice: 800,
      category: '抽油煙機清洗',
      duration: '2-3小時',
      features: ['風扇清潔', '油網清潔', '除油除臭', '效能檢測', '30天保固'],
      image: null,
      currentStock: 999,
      modeCode: 'service'
    },
    {
      id: 'water_tower_1',
      name: '水塔清洗消毒',
      description: '水塔深度清洗消毒，去除水垢、藻類、細菌，確保用水安全',
      price: 3000,
      groupBuyPrice: 2500,
      category: '水塔清洗',
      duration: '4-6小時',
      features: ['水垢去除', '藻類清除', '細菌消毒', '水質檢測', '90天保固'],
      image: null,
      currentStock: 999,
      modeCode: 'service'
    },
    {
      id: 'pipe_cleaning_1',
      name: '水管疏通清洗',
      description: '水管堵塞疏通，高壓清洗，去除管壁污垢，恢復水流暢通',
      price: 800,
      groupBuyPrice: 600,
      category: '水管清洗',
      duration: '1-2小時',
      features: ['堵塞疏通', '高壓清洗', '管壁清潔', '水流檢測', '30天保固'],
      image: null,
      currentStock: 999,
      modeCode: 'service'
    },
    {
      id: 'refrigerator_cleaning',
      name: '冰箱除菌清潔',
      description: '冰箱內部除菌清潔，去除異味，延長食物保鮮期',
      price: 800,
      groupBuyPrice: 600,
      category: '家電清洗',
      duration: '1-1.5小時',
      features: ['內部清潔', '除菌處理', '異味去除', '保鮮檢測', '30天保固'],
      image: null,
      currentStock: 999,
      modeCode: 'service'
    }
  ]

  const categories = [
    { id: 'all', name: '全部服務', count: cleaningServices.length },
    { id: '冷氣清洗', name: '冷氣清洗', count: cleaningServices.filter(p => p.category === '冷氣清洗').length },
    { id: '洗衣機清洗', name: '洗衣機清洗', count: cleaningServices.filter(p => p.category === '洗衣機清洗').length },
    { id: '抽油煙機清洗', name: '抽油煙機清洗', count: cleaningServices.filter(p => p.category === '抽油煙機清洗').length },
    { id: '水塔清洗', name: '水塔清洗', count: cleaningServices.filter(p => p.category === '水塔清洗').length },
    { id: '水管清洗', name: '水管清洗', count: cleaningServices.filter(p => p.category === '水管清洗').length },
    { id: '家電清洗', name: '家電清洗', count: cleaningServices.filter(p => p.category === '家電清洗').length }
  ]

  const filteredProducts = selectedCategory === 'all' 
    ? cleaningServices 
    : cleaningServices.filter(product => product.category === selectedCategory)

  const handleAddToCart = (product: any) => {
    addToCart(product, 1)
    toast.success(`${product.name} 已加入購物車`)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="space-y-8">
      {/* 頁面標題 */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">專業清洗服務</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          採用日本進口清潔劑，專業設備，為您的家電提供最優質的清洗服務
        </p>
      </div>

      {/* 服務特色 */}
      <div className="grid gap-6 md:grid-cols-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">品質保證</h3>
          <p className="text-sm text-gray-600">30天保固，品質有保障</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">快速服務</h3>
          <p className="text-sm text-gray-600">預約制，準時到達</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">團購優惠</h3>
          <p className="text-sm text-gray-600">滿3件享受團購價</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-orange-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">滿意保證</h3>
          <p className="text-sm text-gray-600">不滿意免費重做</p>
        </div>
      </div>

      {/* 分類篩選 */}
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.name} ({category.count})
          </button>
        ))}
      </div>

      {/* 產品列表 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            {/* 產品圖片 */}
            <div className="h-48 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <div className="text-4xl mb-2">🧹</div>
                  <div className="text-sm">{product.category}</div>
                </div>
              )}
            </div>

            {/* 產品資訊 */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {product.category}
                </span>
              </div>
              
              <p className="text-gray-600 text-sm mb-4">{product.description}</p>

              {/* 服務特色 */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">服務時間: {product.duration}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {product.features.slice(0, 3).map((feature, index) => (
                    <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* 價格資訊 */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold text-gray-900">
                    {formatPrice(product.price)}
                  </span>
                  {product.groupBuyPrice && (
                    <span className="text-sm text-orange-600 font-medium">
                      團購價 {formatPrice(product.groupBuyPrice)}
                    </span>
                  )}
                </div>
                {product.groupBuyPrice && (
                  <div className="flex items-center gap-1 text-xs text-orange-600">
                    <Users className="h-3 w-3" />
                    <span>滿3件享受團購價</span>
                  </div>
                )}
              </div>

              {/* 加入購物車按鈕 */}
              <button
                onClick={() => handleAddToCart(product)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                加入購物車
              </button>

              {/* 購物車數量顯示 */}
              {getItemQuantity(product.id) > 0 && (
                <div className="mt-2 text-center">
                  <span className="text-sm text-gray-600">
                    購物車中已有 {getItemQuantity(product.id)} 件
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 團購提醒 */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6 text-center">
        <h3 className="text-xl font-semibold text-orange-900 mb-2">🎉 團購優惠活動</h3>
        <p className="text-orange-700 mb-4">
          專業清洗服務滿3件即可享受團購價！選擇多項服務，享受更多優惠
        </p>
        <div className="flex justify-center gap-4 text-sm">
          <span className="text-orange-600">冷氣清洗: 原價$1500 → 團購價$1300</span>
          <span className="text-orange-600">洗衣機清洗: 原價$1200 → 團購價$1000</span>
          <span className="text-orange-600">抽油煙機清洗: 原價$1000 → 團購價$800</span>
        </div>
      </div>
    </div>
  )
}
