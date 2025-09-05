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
    city: '',
    district: '',
    street: '',
    address: '',
    preferredDate: '',
    preferredTime: '',
    referrer: '' // 介紹人欄位
  })
  const [discountCode, setDiscountCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash')
  const [customerPoints, setCustomerPoints] = useState(0)
  const [usePoints, setUsePoints] = useState(false)
  const [pointsToUse, setPointsToUse] = useState(0)

  // 台灣縣市/行政區（精簡版）
  const taiwanCities = [
    '基隆市','台北市','新北市','桃園市','新竹市','苗栗縣','台中市','彰化縣','台南市','高雄市'
  ]
  const taiwanDistricts: Record<string, string[]> = {
    '基隆市': ['中正區','仁愛區','信義區','安樂區','中山區','七堵區','暖暖區'],
    '台北市': ['信義區','大安區','中正區','內湖區','士林區','松山區','萬華區','中山區','文山區','南港區','北投區'],
    '新北市': ['板橋區','新店區','中和區','永和區','三重區','新莊區','土城區','樹林區','蘆洲區','淡水區','汐止區'],
    '桃園市': ['桃園區','中壢區','蘆竹區','龜山區','八德區','平鎮區','楊梅區'],
    '新竹市': ['東區','北區','香山區'],
    '苗栗縣': ['頭份市','苗栗市','竹南鎮'],
    '台中市': ['西屯區','北屯區','南屯區','中區','西區','北區','南區','太平區','大里區'],
    '彰化縣': ['彰化市','員林市','和美鎮','鹿港鎮'],
    '台南市': ['中西區','東區','南區','北區','安平區','安南區'],
    '高雄市': ['前鎮區','苓雅區','鼓山區','三民區','左營區','新興區']
  }

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

  // 清洗類別團購：跨品項累計數量（只要是有 groupPrice 的 cleaning 類別）
  const getCleaningGroupContext = () => {
    const cleaningItems = cart.filter(it => {
      const p = allProducts.find(x => x.id === it.id)
      return p?.category === 'cleaning' && (p as any)?.groupPrice
    })
    const totalQty = cleaningItems.reduce((acc, it) => acc + (it.quantity || 0), 0)
    const thresholds = cleaningItems
      .map(it => (allProducts.find(x => x.id === it.id) as any)?.groupMinQty || 3)
    const minThreshold = thresholds.length ? Math.min(...thresholds) : 3
    const active = totalQty >= minThreshold
    return { totalQty, minThreshold, active }
  }

  // 計算商品總價（套用跨品項清洗團購）
  const getTotalPrice = () => {
    const ctx = getCleaningGroupContext()
    return cart.reduce((sum, item) => {
      const product = allProducts.find(p => p.id === item.id) as any
      if (!product) return sum
      if (product.category === 'cleaning' && product.groupPrice && ctx.active) {
        return sum + (product.groupPrice * item.quantity)
      }
      return sum + (product.price || 0) * item.quantity
    }, 0)
  }

  // 計算團購前原價總計
  const getGroupBuyPrice = () => {
    return cart.reduce((sum, item) => {
      const product = allProducts.find(p => p.id === item.id) as any
      if (!product) return sum
      return sum + (product.price || 0) * item.quantity
    }, 0)
  }

  // 計算團購優惠金額
  const getGroupBuySavings = () => {
    return getGroupBuyPrice() - getTotalPrice()
  }

  // 檢查是否適用團購價（跨品項：清洗類別、開啟時所有清洗品項皆適用）
  const isGroupBuyEligible = (productId: string) => {
    const product = allProducts.find(p => p.id === productId) as any
    const ctx = getCleaningGroupContext()
    return !!(product && product.category === 'cleaning' && product.groupPrice && ctx.active)
  }

  // 取得適用團購價的商品
  const getGroupBuyEligibleItems = () => {
    return cart.filter(item => isGroupBuyEligible(item.id))
  }

  // 針對清洗類：距離團購門檻還差幾件（跨品項累計）
  const getRemainingForGroup = (productId: string) => {
    const product = allProducts.find(p => p.id === productId) as any
    if (!product || product.category !== 'cleaning') return 0
    const ctx = getCleaningGroupContext()
    return Math.max(0, ctx.minThreshold - ctx.totalQty)
  }

  // 計算折扣碼優惠
  const getDiscountAmount = () => {
    if (!discountCode) return 0
    const total = getTotalPrice()
    if (discountCode === 'SR001' || discountCode === 'SE001') {
      return total * 0.03 // 97% 優惠（3% 折抵）
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

  // 尚差幾件達團購（跨品項清洗）
  const getItemsToReachGroup = () => {
    const ctx = getCleaningGroupContext()
    return Math.max(0, ctx.minThreshold - ctx.totalQty)
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
    // 允許提交為預約訂單（未審核也可先提交），後台轉單前再檢核
    
    // 組合完整地址
    const fullAddress = `${(customerInfo.city||'').trim()}${(customerInfo.district||'').trim()}${(customerInfo.street||'').trim()}`.trim()

    // 驗證必填欄位
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.email || !fullAddress) {
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
        customerInfo: { ...customerInfo, address: fullAddress },
        items: cart,
        totalPrice: getTotalPrice(),
        groupBuySavings: getGroupBuySavings(),
        discountAmount: getDiscountAmount(),
        pointsUsed: pointsToUse,
        pointsDiscount: getPointsDiscount(),
        finalPrice: getFinalPrice(),
        discountCode,
        paymentMethod,
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

      // 導向成功頁面
      try { localStorage.setItem('lastOrderId', order.id) } catch {}
      navigate(`/shop/order-success?order=${encodeURIComponent(order.id)}`)

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
                  
                  {null}
                  
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">縣市 <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={customerInfo.city}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, city: e.target.value, district: '' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">請選擇縣市</option>
                        {taiwanCities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">區域 <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={customerInfo.district}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, district: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={!customerInfo.city}
                      >
                        <option value="">請選擇區域</option>
                        {(taiwanDistricts[customerInfo.city] || []).map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">詳細地址 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={customerInfo.street}
                      onChange={(e) => setCustomerInfo({...customerInfo, street: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例如：重慶南路一段100號6樓"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      期望日期
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
                      期望時間
                    </label>
                    <select
                      value={customerInfo.preferredTime}
                      onChange={(e) => setCustomerInfo({...customerInfo, preferredTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">請選擇時間</option>
                      <option value="morning">上午 (09:00-12:00)</option>
                      <option value="afternoon">下午 (13:00-17:00)</option>
                      <option value="evening">晚上 (18:00-20:00)</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <div className="mt-1 rounded-md bg-yellow-100 px-3 py-2 text-sm font-semibold text-red-700">
                      實際服務時間以客服跟您確認後為主
                    </div>
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
                  {/* 規則說明卡片（移除自動提供折扣碼文字） */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-900">
                    <div className="font-semibold mb-1">購物說明</div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>清洗服務：同次訂單清洗品項合併滿 3 件即享各品項團購價（可跨品項）</li>
                      <li>積分：每消費 NT$100 累積 1 點；1 點可折抵 NT$1（可全額折抵）</li>
                      <li>折扣碼：輸入折扣碼可享 97% 優惠</li>
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

                  {/* 折扣碼（依需求移除） */}

                  {/* 付款方式 */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">付款方式</label>
                    <div className="grid grid-cols-1 gap-2">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="radio" name="pay" checked={paymentMethod==='cash'} onChange={()=>setPaymentMethod('cash')} />
                        現金（到府付款）
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="radio" name="pay" checked={paymentMethod==='transfer'} onChange={()=>setPaymentMethod('transfer')} />
                        匯款（完成後回報末五碼）
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="radio" name="pay" checked={paymentMethod==='card'} onChange={()=>setPaymentMethod('card')} />
                        刷卡（到府行動刷卡）
                      </label>
                    </div>
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
                    disabled={cart.length === 0}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 disabled:cursor-not-allowed"
                  >
                    提交訂單
                  </button>
                </>
              )}
            </div>

            {/* 聯繫我們（移除：右側摘要展開時會被遮蔽） */}
          </div>
        </div>
      </div>
    </div>
  )
}
