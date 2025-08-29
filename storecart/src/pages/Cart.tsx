import React, { useState } from 'react'
import { useCartStore } from '../store/cart'
import { useOrdersStore } from '../store/orders'
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Tag, Users } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CartPage() {
  const { 
    items, 
    removeFromCart, 
    updateQuantity, 
    getTotalItems, 
    getTotalPrice,
    getGroupBuyPrice,
    getFinalPrice,
    getDiscountAmount,
    clearCart,
    discountCode,
    setDiscountCode,
    isGroupBuyEligible,
    getGroupBuyEligibleItems
  } = useCartStore()
  
  const { createOrderFromCart } = useOrdersStore()
  
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    preferredDate: '',
    preferredTimeStart: '',
    preferredTimeEnd: ''
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      toast.success('商品已從購物車移除')
    } else {
      updateQuantity(productId, newQuantity)
    }
  }

  const handleDiscountCodeChange = (code: string) => {
    setDiscountCode(code)
    if (code && (code.startsWith('SR') || code.startsWith('SE'))) {
      toast.success('折扣碼已套用！享受97折優惠')
    }
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (items.length === 0) {
      toast.error('購物車是空的')
      return
    }

    // 驗證必填欄位
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
      toast.error('請填寫姓名、電話和地址')
      return
    }

    setIsCheckingOut(true)
    
    try {
      const order = await createOrderFromCart(customerInfo, items)
      clearCart()
      toast.success(`訂單已建立！訂單編號：${order.orderNumber || order.id}`)
      
      // 重置表單
      setCustomerInfo({
        name: '',
        phone: '',
        email: '',
        address: '',
        preferredDate: '',
        preferredTimeStart: '',
        preferredTimeEnd: ''
      })
      
      setIsCheckingOut(false)
    } catch (error) {
      toast.error('建立訂單失敗，請稍後再試')
      setIsCheckingOut(false)
    }
  }

  const totalPrice = getTotalPrice()
  const groupBuyPrice = getGroupBuyPrice()
  const finalPrice = getFinalPrice()
  const discountAmount = getDiscountAmount()
  const isGroupBuy = isGroupBuyEligible()
  const groupBuyItems = getGroupBuyEligibleItems()

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">購物車是空的</h3>
        <p className="mt-1 text-sm text-gray-500">
          開始購物，將商品加入購物車
        </p>
        <div className="mt-6">
          <a
            href="/services"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            開始購物
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">購物車</h1>
          <p className="mt-1 text-sm text-gray-600">
            共 {getTotalItems()} 件商品
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-sm text-red-600 hover:text-red-700"
        >
          清空購物車
        </button>
      </div>

      {/* 團購提醒 */}
      {groupBuyItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">團購優惠</h3>
          </div>
          <p className="text-sm text-blue-700">
            專業清洗服務滿3件即可享受團購價！目前有 {groupBuyItems.length} 項商品符合條件，
            還需要 {Math.max(0, 3 - groupBuyItems.reduce((sum, item) => sum + item.quantity, 0))} 件即可享受優惠。
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 購物車商品列表 */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.productId} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex gap-4">
                {/* 商品圖片 */}
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0">
                  {item.product.image ? (
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ShoppingBag className="h-8 w-8" />
                    </div>
                  )}
                </div>

                {/* 商品資訊 */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {item.product.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {item.product.category}
                  </p>
                  
                  {/* 團購價標示 */}
                  {item.product.groupBuyPrice && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                        團購價 {formatPrice(item.product.groupBuyPrice)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(item.product.price)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.product.currentStock}
                        className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-gray-600">
                      小計：{formatPrice(item.product.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 結帳表單 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">結帳資訊</h2>
            
            {/* 折扣碼輸入 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                折扣碼（業務/技師編號）
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="SR001 或 SE001"
                  value={discountCode}
                  onChange={(e) => handleDiscountCodeChange(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {discountCode && (discountCode.startsWith('SR') || discountCode.startsWith('SE')) && (
                  <Tag className="h-5 w-5 text-green-600 mt-2" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                輸入業務或技師編號可享受97折優惠
              </p>
            </div>
            
            {/* 總計 */}
            <div className="border-t border-gray-200 pt-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>商品總計</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              
              {/* 團購價 */}
              {isGroupBuy && groupBuyPrice > 0 && (
                <div className="flex justify-between text-sm text-orange-600">
                  <span>團購優惠</span>
                  <span>-{formatPrice(totalPrice - groupBuyPrice)}</span>
                </div>
              )}
              
              {/* 折扣碼優惠 */}
              {discountCode && (discountCode.startsWith('SR') || discountCode.startsWith('SE')) && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>折扣碼優惠 (97折)</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                <span>應付金額</span>
                <span>{formatPrice(finalPrice)}</span>
              </div>
            </div>

            {/* 客戶資訊表單 */}
            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="請輸入姓名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  電話 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="請輸入電話"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  電子郵件
                </label>
                <input
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="請輸入電子郵件"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  服務地址 <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="請輸入詳細地址"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    預約日期
                  </label>
                  <input
                    type="date"
                    value={customerInfo.preferredDate}
                    onChange={(e) => setCustomerInfo({...customerInfo, preferredDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    預約時間
                  </label>
                  <select
                    value={customerInfo.preferredTimeStart}
                    onChange={(e) => setCustomerInfo({...customerInfo, preferredTimeStart: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">請選擇時間</option>
                    <option value="09:00">09:00</option>
                    <option value="10:00">10:00</option>
                    <option value="11:00">11:00</option>
                    <option value="13:00">13:00</option>
                    <option value="14:00">14:00</option>
                    <option value="15:00">15:00</option>
                    <option value="16:00">16:00</option>
                    <option value="17:00">17:00</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCheckingOut || items.length === 0}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCheckingOut ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    處理中...
                  </>
                ) : (
                  <>
                    確認下單
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-xs text-gray-500 mt-4 text-center">
              下單後我們會盡快與您聯繫確認服務時間
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
