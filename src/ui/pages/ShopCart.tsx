import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  ShoppingCart, 
  Star, 
  Users, 
  CheckCircle, 
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Gift,
  Shield,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { checkMemberAuth, canCheckout } from '../../utils/memberAuth'

export default function ShopCartPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState<any[]>([])
  const [memberUser, setMemberUser] = useState<any>(null)
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    preferredDate: '',
    preferredTime: '',
    referrer: '' // 介紹人欄位
  })
  const [discountCode, setDiscountCode] = useState('')
  const [customerPoints, setCustomerPoints] = useState(0)
  const [usePoints, setUsePoints] = useState(false)
  const [pointsToUse, setPointsToUse] = useState(0)

  // 檢查會員登入狀態
  useEffect(() => {
    const member = checkMemberAuth()
    if (member) {
      setMemberUser(member)
      // 自動填入會員資訊
      setCustomerInfo(prev => ({
        ...prev,
        name: member.name,
        email: member.email
      }))
    }
  }, [])

  // 專業清洗服務產品（與產品頁面保持一致）
  const cleaningProducts = [
    {
      id: 'ac-split',
      name: '分離式冷氣清洗',
      price: 1800,
      groupPrice: 1600,
      groupMinQty: 3,
      category: 'cleaning'
    },
    {
      id: 'ac-window',
      name: '窗型冷氣清洗',
      price: 1500,
      groupPrice: 1350,
      groupMinQty: 3,
      category: 'cleaning'
    },
    {
      id: 'washer-drum',
      name: '洗衣機清洗（滾筒）',
      price: 1999,
      groupPrice: 1799,
      groupMinQty: 3,
      category: 'cleaning'
    },
    {
      id: 'washer-vertical',
      name: '洗衣機清洗（直立）',
      price: 1799,
      groupPrice: 1619,
      groupMinQty: 3,
      category: 'cleaning'
    },
    {
      id: 'hood-inverted',
      name: '倒T型抽油煙機清洗',
      price: 2200,
      groupPrice: 2000,
      groupMinQty: 3,
      category: 'cleaning'
    },
    {
      id: 'hood-traditional',
      name: '傳統雙渦輪抽油煙機清洗',
      price: 1800,
      groupPrice: 1600,
      groupMinQty: 3,
      category: 'cleaning'
    },
    {
      id: 'fridge-clean',
      name: '冰箱清洗除臭',
      price: 1600,
      groupPrice: 1440,
      groupMinQty: 3,
      category: 'cleaning'
    },
    {
      id: 'water-heater',
      name: '熱水器除垢清洗',
      price: 1400,
      groupPrice: 1260,
      groupMinQty: 3,
      category: 'cleaning'
    }
  ]

  // 新家電銷售產品
  const newAppliances = [
    {
      id: 'ac-new-split',
      name: '日立分離式冷氣',
      price: 25000,
      category: 'new'
    },
    {
      id: 'washer-new',
      name: 'LG滾筒洗衣機',
      price: 32000,
      category: 'new'
    },
    {
      id: 'hood-new',
      name: '櫻花抽油煙機',
      price: 15000,
      category: 'new'
    }
  ]

  // 二手家電產品
  const usedAppliances = [
    {
      id: 'ac-used-split',
      name: '二手分離式冷氣',
      price: 8000,
      category: 'used'
    },
    {
      id: 'washer-used',
      name: '二手洗衣機',
      price: 5000,
      category: 'used'
    },
    {
      id: 'fridge-used',
      name: '二手冰箱',
      price: 6000,
      category: 'used'
    }
  ]

  // 居家清潔服務
  const homeCleaning = [
    {
      id: 'cleaning-regular',
      name: '定期居家清潔',
      price: 2500,
      category: 'home'
    },
    {
      id: 'cleaning-deep',
      name: '深度居家清潔',
      price: 3500,
      category: 'home'
    },
    {
      id: 'cleaning-move',
      name: '搬家清潔服務',
      price: 4000,
      category: 'home'
    }
  ]

  // 合併所有產品
  const allProducts = [...cleaningProducts, ...newAppliances, ...usedAppliances, ...homeCleaning]

  // 從 localStorage 載入購物車
  useEffect(() => {
    const savedCart = localStorage.getItem('shopCart')
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    }
    
    // 載入客戶積分
    const savedPoints = localStorage.getItem('customerPoints')
    if (savedPoints) {
      setCustomerPoints(parseInt(savedPoints))
    }
  }, [])

  // 儲存購物車到 localStorage
  useEffect(() => {
    localStorage.setItem('shopCart', JSON.stringify(cart))
  }, [cart])

  // 更新數量
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.id !== productId))
    } else {
      setCart(cart.map(item => 
        item.id === productId ? { ...item, quantity } : item
      ))
    }
  }

  // 從購物車移除
  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId))
  }

  // 清空購物車
  const clearCart = () => {
    setCart([])
    toast.success('購物車已清空')
  }

  // 計算商品總價
  const getTotalPrice = () => {
    return cart.reduce((sum, item) => {
      const product = allProducts.find(p => p.id === item.id)
      if (product?.groupPrice && product?.groupMinQty && item.quantity >= product.groupMinQty) {
        return sum + (product.groupPrice * item.quantity)
      }
      return sum + (product?.price || 0) * item.quantity
    }, 0)
  }

  // 計算團購優惠
  const getGroupBuyPrice = () => {
    return cart.reduce((sum, item) => {
      const product = allProducts.find(p => p.id === item.id)
      if (product?.groupPrice && product?.groupMinQty && item.quantity >= product.groupMinQty) {
        return sum + (product.price * item.quantity)
      }
      return sum + (product?.price || 0) * item.quantity
    }, 0)
  }

  // 計算團購優惠金額
  const getGroupBuySavings = () => {
    return getGroupBuyPrice() - getTotalPrice()
  }

  // 檢查是否適用團購價
  const isGroupBuyEligible = (productId: string) => {
    const product = allProducts.find(p => p.id === productId)
    const cartItem = cart.find(item => item.id === productId)
    return product?.groupPrice && product?.groupMinQty && cartItem && cartItem.quantity >= product.groupMinQty
  }

  // 取得適用團購價的商品
  const getGroupBuyEligibleItems = () => {
    return cart.filter(item => isGroupBuyEligible(item.id))
  }

  // 針對單一商品：距離團購門檻還差幾件
  const getRemainingForGroup = (productId: string) => {
    const product = allProducts.find(p => p.id === productId) as any
    const cartItem = cart.find(item => item.id === productId)
    if (!product || !product.groupMinQty || !cartItem) return 0
    const remain = product.groupMinQty - cartItem.quantity
    return Math.max(0, remain)
  }

  // 計算折扣碼優惠
  const getDiscountAmount = () => {
    if (!discountCode) return 0
    
    const total = getTotalPrice()
    if (discountCode === 'SR001' || discountCode === 'SE001') {
      return total * 0.03 // 97% 折扣
    }
    return 0
  }

  // 計算積分折扣（每1積分=1元，可全額折抵）
  const getPointsDiscount = () => {
    if (!usePoints || pointsToUse <= 0) return 0
    return Math.min(pointsToUse, getTotalPrice())
  }

  // 計算最終價格
  const getFinalPrice = () => {
    const total = getTotalPrice()
    const groupBuySavings = getGroupBuySavings()
    const discountAmount = getDiscountAmount()
    const pointsDiscount = getPointsDiscount()
    
    return Math.max(0, total - groupBuySavings - discountAmount - pointsDiscount)
  }

  // 尚差幾件達團購（僅針對清洗服務）
  const getItemsToReachGroup = () => {
    const targets = cart
      .filter(item => {
        const p = allProducts.find(x => x.id === item.id)
        return p?.category === 'cleaning' && p?.groupMinQty
      })
      .map(item => {
        const p = allProducts.find(x => x.id === item.id) as any
        const remain = Math.max(0, (p.groupMinQty || 0) - item.quantity)
        return remain
      })
    const minRemain = targets.length ? Math.min(...targets) : 0
    return minRemain
  }

  // 預估可獲得積分（消費$100=1積分，取整）
  const getEstimatedPoints = () => {
    return Math.floor(getFinalPrice() / 100)
  }

  // 處理折扣碼
  const handleDiscountCode = () => {
    if (!discountCode) {
      toast.error('請輸入折扣碼')
      return
    }
    
    if (discountCode === 'SR001' || discountCode === 'SE001') {
      toast.success('折扣碼已套用！享受97%優惠')
    } else {
      toast.error('無效的折扣碼')
      setDiscountCode('')
    }
  }

  // 處理積分使用（可全額折抵）
  const handlePointsChange = (points: number) => {
    const maxPoints = Math.min(customerPoints, Math.floor(getTotalPrice()))
    setPointsToUse(Math.min(points, maxPoints))
  }

  // 提交訂單
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCheckout()) {
      toast.error('您的會員尚未通過審核，暫時無法結帳')
      return
    }
    
    // 驗證必填欄位
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.email || !customerInfo.address) {
      toast.error('請填寫所有必填欄位')
      return
    }
    
    if (cart.length === 0) {
      toast.error('購物車是空的')
      return
    }

    try {
      // 確保派工系統內已建立客戶資料（失敗不阻斷提單）
      try {
        await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: customerInfo.name,
            phone: customerInfo.phone,
            email: customerInfo.email,
            address: customerInfo.address
          })
        })
      } catch {}

      // 創建訂單資料
      const order = {
        id: `ORDER-${Date.now()}`,
        customerInfo,
        items: cart,
        totalPrice: getTotalPrice(),
        groupBuySavings: getGroupBuySavings(),
        discountAmount: getDiscountAmount(),
        pointsUsed: pointsToUse,
        pointsDiscount: getPointsDiscount(),
        finalPrice: getFinalPrice(),
        discountCode,
        createdAt: new Date().toISOString(),
        status: 'pending'
      }

      // 儲存到 localStorage（模擬資料庫）
      const existingOrders = JSON.parse(localStorage.getItem('reservationOrders') || '[]')
      existingOrders.push(order)
      localStorage.setItem('reservationOrders', JSON.stringify(existingOrders))

      // 更新積分
      if (usePoints && pointsToUse > 0) {
        const newPoints = customerPoints - pointsToUse
        setCustomerPoints(newPoints)
        localStorage.setItem('customerPoints', newPoints.toString())
      }

      // 清空購物車
      setCart([])
      localStorage.removeItem('shopCart')

      toast.success('訂單已成功提交！')
      
      // 導向成功頁面或返回首頁
      setTimeout(() => {
        navigate('/shop')
      }, 2000)

    } catch (error) {
      toast.error('提交訂單時發生錯誤')
      console.error('Order submission error:', error)
    }
  }

  // 計算可使用的最大積分
  const maxUsablePoints = Math.min(customerPoints, Math.floor(getTotalPrice() * 10))

  // 如果未登入會員，顯示提示
  if (!memberUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">需要會員登入</h1>
          <p className="text-gray-600 mb-6">您需要登入會員才能使用購物車功能</p>
          <div className="space-y-3">
            <Link
              to="/login/member"
              className="w-full inline-flex justify-center items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              會員登入
            </Link>
            <Link
              to="/register/member"
              className="w-full inline-flex justify-center items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              立即註冊
            </Link>
            <Link
              to="/store"
              className="w-full inline-flex justify-center items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              返回購物站
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-6">
        {/* 頁面標題 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link
              to="/shop/products"
              className="inline-flex items-center text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              返回商品頁面
            </Link>
            {/* 會員資訊 */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm text-gray-600">歡迎，{memberUser.name}</p>
                <p className="text-xs text-gray-500">會員編號：{memberUser.code}</p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('member-auth-user')
                  navigate('/store')
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                登出
              </button>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">購物車結帳</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 購物車商品列表 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
                購物車商品 ({cart.length} 件)
              </h2>

              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg mb-2">購物車是空的</p>
                  <p className="mb-4">開始選購商品吧！</p>
                  <Link
                    to="/shop/products"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    前往選購
                  </Link>
                </div>
              ) : (
                <>
                  {/* 商品列表 */}
                  <div className="space-y-4 mb-6">
                    {cart.map((item) => {
                      const product = allProducts.find(p => p.id === item.id)
                      const isGroupBuy = isGroupBuyEligible(item.id)
                      
                      return (
                        <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{item.name}</h3>
                            <div className="text-sm text-gray-600 mt-1">
                              {isGroupBuy ? (
                                <span className="text-orange-600">
                                  團購價：NT$ {product?.groupPrice?.toLocaleString()} × {item.quantity}
                                </span>
                              ) : (
                                <span>NT$ {product?.price?.toLocaleString()} × {item.quantity}</span>
                              )}
                            </div>
                            {!isGroupBuy && product?.groupMinQty ? (
                              <div className="text-xs text-orange-600 mt-1">
                                再加 {getRemainingForGroup(item.id)} 件即可享團購價（門檻 {product.groupMinQty} 件）
                              </div>
                            ) : null}
                            {isGroupBuy && (
                              <div className="text-xs text-green-600 mt-1">
                                ✓ 已達團購門檻，享受優惠價
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-12 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 團購提醒 */}
                  {getGroupBuyEligibleItems().length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                      <div className="flex items-center gap-2 text-orange-800 mb-2">
                        <Users className="h-5 w-5" />
                        <span className="font-medium">團購優惠提醒</span>
                      </div>
                      <p className="text-orange-700 text-sm">
                        您已達到團購門檻，享受優惠價格！共節省 NT$ {getGroupBuySavings().toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* 清空購物車 */}
                  <div className="text-right">
                    <button
                      onClick={clearCart}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      清空購物車
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* 客戶資訊表單 */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-6 w-6 text-blue-600" />
                客戶資訊
              </h2>
              
              <form onSubmit={handleSubmitOrder} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="請輸入Email"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      介紹人
                    </label>
                    <input
                      type="text"
                      value={customerInfo.referrer}
                      onChange={(e) => setCustomerInfo({...customerInfo, referrer: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="請輸入介紹人（選填）"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      服務地址 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerInfo.address}
                      onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="請輸入完整服務地址"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      偏好日期
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
                      偏好時間
                    </label>
                    <select
                      value={customerInfo.preferredTime}
                      onChange={(e) => setCustomerInfo({...customerInfo, preferredTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">請選擇時間</option>
                      <option value="morning">上午 (8:00-12:00)</option>
                      <option value="afternoon">下午 (13:00-17:00)</option>
                      <option value="evening">晚上 (18:00-20:00)</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* 結帳摘要 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-blue-600" />
                結帳摘要
              </h2>

              {cart.length > 0 && (
                <>
                  {/* 規則說明卡片 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-900">
                    <div className="font-semibold mb-1">購物說明</div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>專業清洗服務：同項商品單次數量滿 3 件享團購價</li>
                      <li>積分：每消費 NT$100 累積 1 點；100 點可折抵 NT$10</li>
                      <li>折扣碼：商業 SR001、技師 SE001，可享 97% 優惠</li>
                    </ul>
                  </div>

                  {/* 價格明細 */}
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>商品總計</span>
                      <span>NT$ {getGroupBuyPrice().toLocaleString()}</span>
                    </div>
                    
                    {getGroupBuySavings() > 0 && (
                      <div className="flex justify-between text-sm text-orange-600">
                        <span>團購優惠</span>
                        <span>-NT$ {getGroupBuySavings().toLocaleString()}</span>
                      </div>
                    )}
                    
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>優惠後金額</span>
                        <span>NT$ {getTotalPrice().toLocaleString()}</span>
                      </div>
                      {/* 尚差幾件達團購提示 */}
                      {getItemsToReachGroup() > 0 && (
                        <div className="mt-2 text-xs text-orange-600">
                          再加 {getItemsToReachGroup()} 件清洗服務可享團購價
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 折扣碼 */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      折扣碼
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="輸入折扣碼"
                      />
                      <button
                        type="button"
                        onClick={handleDiscountCode}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        套用
                      </button>
                    </div>
                    {discountCode && (
                      <div className="text-xs text-gray-500 mt-1">
                        可用折扣碼：SR001 (商業)、SE001 (技師) - 97% 優惠
                      </div>
                    )}
                  </div>

                  {/* 積分系統 */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        積分使用 (目前有 {customerPoints} 積分)
                      </label>
                      <button
                        type="button"
                        onClick={() => setUsePoints(!usePoints)}
                        className={`text-sm px-2 py-1 rounded ${
                          usePoints 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {usePoints ? '使用中' : '使用積分'}
                      </button>
                    </div>
                    
                    {usePoints && (
                      <div className="space-y-2">
                        <input
                          type="number"
                          min="0"
                          max={maxUsablePoints}
                          value={pointsToUse}
                          onChange={(e) => handlePointsChange(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="輸入要使用的積分"
                        />
                        <div className="text-xs text-gray-500">
                          每100積分可折抵NT$10，最多使用 {maxUsablePoints.toLocaleString()} 積分
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 最終價格 */}
                  <div className="border-t pt-4 space-y-3 mb-6">
                    {getDiscountAmount() > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>折扣碼優惠</span>
                        <span>-NT$ {getDiscountAmount().toLocaleString()}</span>
                      </div>
                    )}
                    
                    {usePoints && pointsToUse > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>積分折抵</span>
                        <span>-NT$ {getPointsDiscount().toLocaleString()}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                      <span>應付金額</span>
                      <span>NT$ {getFinalPrice().toLocaleString()}</span>
                    </div>
                    {getGroupBuySavings() > 0 && (
                      <div className="text-xs text-green-600">
                        已為您節省：NT$ {getGroupBuySavings().toLocaleString()}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      預估可獲得積分：{getEstimatedPoints().toLocaleString()} 點
                    </div>
                  </div>

                  {/* 提交訂單按鈕 */}
                  <button
                    onClick={handleSubmitOrder}
                    disabled={cart.length === 0 || !canCheckout()}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 disabled:cursor-not-allowed"
                  >
                    提交訂單
                  </button>
                </>
              )}
            </div>

            {/* 聯繫我們 */}
            <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                聯繫我們
              </h2>
              <div className="space-y-3 text-sm text-gray-700">
                <div>
                  <div className="font-medium">公司資訊</div>
                  <div className="text-gray-600">日式洗濯 統編:90046766</div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-medium">客服專線</div>
                    <div className="text-gray-600">(02)7756-2269</div>
                    <div className="text-xs text-gray-500">電話客服服務時間：上午九點~下午六點</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">官方 LINE</div>
                    <div className="text-gray-600">@942clean</div>
                    <div className="text-xs text-gray-500">線上客服服務時間：上午九點~晚間九點</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-purple-600 mt-0.5" />
                  <div>
                    <div className="font-medium">服務區域</div>
                    <div className="text-gray-600">基隆 / 台北 / 新北 / 桃園 / 中壢 / 新竹 / 頭份 / 台中 / 彰化 / 台南 / 高雄</div>
                    <div className="text-xs text-gray-500 mt-1">偏遠地區或山區皆無法服務。南投/雲林/嘉義/屏東由周邊地區技師支援，需同址三台(含)以上才能承接。</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
