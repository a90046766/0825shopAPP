import React, { useState, useEffect } from 'react'
import { useProductsStore } from '../store/products'
import { useCartStore } from '../store/cart'
import { Search, ShoppingCart, Star, Tag, Users } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProductsPage() {
  const { 
    products, 
    categories, 
    loading, 
    error,
    getProductsByCategory,
    searchProducts,
    syncWithSupabase 
  } = useProductsStore()
  
  const { addToCart, error: cartError } = useCartStore()
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'newest'>('newest')

  useEffect(() => {
    syncWithSupabase()
  }, [syncWithSupabase])

  useEffect(() => {
    if (cartError) {
      toast.error(cartError)
    }
  }, [cartError])

  // 篩選和排序產品
  const filteredProducts = React.useMemo(() => {
    let filtered = selectedCategory === 'all' 
      ? products.filter(p => p.visible_in_cart)
      : getProductsByCategory(selectedCategory)
    
    if (searchQuery) {
      filtered = searchProducts(searchQuery)
    }
    
    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'price':
          return a.price - b.price
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default:
          return 0
      }
    })
    
    return filtered
  }, [products, selectedCategory, searchQuery, sortBy, getProductsByCategory, searchProducts])

  const handleAddToCart = (product: any) => {
    addToCart(product)
    toast.success(`已加入購物車：${product.name}`)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(price)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg">載入中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-600">
        <p>載入失敗：{error}</p>
        <button 
          onClick={syncWithSupabase}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          重新載入
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">精選商品</h1>
        <p className="mt-2 text-gray-600">專業清洗服務，品質保證</p>
      </div>

      {/* 團購提醒 */}
      {selectedCategory === 'all' || selectedCategory === '專業清洗服務' ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">團購優惠</h3>
          </div>
          <p className="text-sm text-blue-700">
            專業清洗服務滿3件即可享受團購價！冷氣、洗衣機、抽油煙機等服務都可以搭配，讓您省更多！
          </p>
        </div>
      ) : null}

      {/* 篩選和搜尋 */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        {/* 搜尋欄 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="搜尋商品..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 分類篩選 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全部商品
          </button>
          {categories
            .filter(cat => cat.active)
            .map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.name)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.name
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </button>
            ))}
        </div>

        {/* 排序選項 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">排序：</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="newest">最新上架</option>
            <option value="name">名稱</option>
            <option value="price">價格</option>
          </select>
        </div>
      </div>

      {/* 產品列表 */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">沒有找到商品</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery ? '請嘗試其他搜尋關鍵字' : '目前沒有可購買的商品'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {/* 產品圖片 */}
              <div className="aspect-square bg-gray-100 relative">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Tag className="h-12 w-12" />
                  </div>
                )}
                {product.originalPrice && product.originalPrice > product.price && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    特價
                  </div>
                )}
                {product.groupBuyPrice && (
                  <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    團購
                  </div>
                )}
              </div>

              {/* 產品資訊 */}
              <div className="p-4 space-y-3">
                {/* 分類標籤 */}
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {product.category}
                  </span>
                  {product.region && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {product.region}
                    </span>
                  )}
                </div>

                {/* 產品名稱 */}
                <h3 className="font-semibold text-gray-900 line-clamp-2">
                  {product.name}
                </h3>

                {/* 產品描述 */}
                {product.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {product.description}
                  </p>
                )}

                {/* 價格 */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(product.price)}
                    </span>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <span className="text-sm text-gray-500 line-through">
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                  </div>
                  
                  {/* 團購價 */}
                  {product.groupBuyPrice && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-orange-600 font-semibold">
                        團購價 {formatPrice(product.groupBuyPrice)}
                      </span>
                      <span className="text-xs text-gray-500">
                        (滿3件)
                      </span>
                    </div>
                  )}
                </div>

                {/* 庫存狀態 */}
                <div className="text-sm text-gray-600">
                  {product.currentStock > 0 ? (
                    <span className="text-green-600">
                      庫存：{product.currentStock} 件
                    </span>
                  ) : (
                    <span className="text-red-600">缺貨中</span>
                  )}
                </div>

                {/* 加入購物車按鈕 */}
                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={product.currentStock <= 0}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    product.currentStock > 0
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {product.currentStock > 0 ? '加入購物車' : '缺貨中'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 結果統計 */}
      {filteredProducts.length > 0 && (
        <div className="text-center text-sm text-gray-600">
          共找到 {filteredProducts.length} 件商品
        </div>
      )}
    </div>
  )
}
