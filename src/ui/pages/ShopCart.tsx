import React, { useState, useEffect, useRef, useMemo } from 'react'
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
import { checkMemberAuth } from '../../utils/memberAuth'
import { supabase } from '../../utils/supabase'
import { loadAdapters } from '../../adapters'

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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [discountCode, setDiscountCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash')
  const [customerPoints, setCustomerPoints] = useState(0)
  const [usePoints, setUsePoints] = useState(false)
  const [pointsToUse, setPointsToUse] = useState(0)
  const [commitmentText, setCommitmentText] = useState('')
  const [agreeCommitment, setAgreeCommitment] = useState(false)

  // 欄位 refs（用於捲動至第一個錯誤）
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const cityRef = useRef<HTMLSelectElement>(null)
  const districtRef = useRef<HTMLSelectElement>(null)
  const streetRef = useRef<HTMLInputElement>(null)

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

  // 以 member-profile API 補齊電話與地址（若有）
  useEffect(() => {
    (async()=>{
      try{
        if (!memberUser?.email) return
        const q = new URLSearchParams({ memberEmail: String(memberUser.email).toLowerCase() })
        const res = await fetch(`/_api/member/profile?${q.toString()}`)
        const j = await res.json()
        if (j?.success && j.data) {
          const addr = `${j.data.city||''}${j.data.district||''}${j.data.address||''}`
          setCustomerInfo(prev => ({ ...prev, phone: prev.phone || j.data.phone || '', street: prev.street || addr || '' }))
        }
      } catch {}
    })()
  }, [memberUser?.email])

  // 載入「我們的承諾」（CMS 優先，無則使用預設）
  useEffect(() => {
    (async () => {
      try {
        const mod = await import('../../adapters/supabase/cms')
        const txt = await mod.fetchCommitment()
        if (typeof txt === 'string' && txt.trim()) {
          setCommitmentText(txt.trim())
          return
        }
      } catch {}
      // 預設版本
      setCommitmentText([
        '我們的承諾',
        '一、10年(不含第10年)內機器。保固三個月，保固後三個月內有問題免費前往查看檢測。',
        '二、13年(不含第13年)內機器。保固三個月，保固期內若已無法維修提供換機購物金。',
        '三、13年以上機器，無法提供保固及購物金，請見諒。',
        '免責聲明：',
        '1. 現場技師判斷機況較差，可能會婉拒施作，避免後續爭議。',
        '2. 10年以上機器，其機殼或部分塑料配件，可能硬化或脆化導致斷裂，在可正常運作的情況下不在保固範圍內。',
        '3. 家電機齡以規格表上之製造年月起算，無法查看的話基本上依機況判斷可能會以最高13年以上之機齡計算。',
        '4. 冷氣排水管一般僅以高壓水槍清洗及疏通，若是因為排水管堵塞之滴水，不在保固範圍內。'
      ].join('\n'))
    })()
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
  }, [])

  // 與雲端同步會員積分（單一真相 API）
  useEffect(() => {
    (async () => {
      try {
        if (!memberUser) return
        const q = new URLSearchParams(memberUser.id ? { memberId: memberUser.id } : { memberEmail: String(memberUser.email||'').toLowerCase() })
        const res = await fetch(`/_api/points/balance?${q.toString()}`)
        const j = await res.json()
        setCustomerPoints(Number(j?.balance||0))
      } catch {}
    })()
  }, [memberUser?.id, memberUser?.email])

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

  // 清洗類別團購：跨品項累計數量（以購物車項目本身欄位為主，缺值時退回 allProducts）
  const getCleaningGroupContext = () => {
    const cleaningItems = cart.filter(it => {
      const fallback = allProducts.find(x => x.id === it.id) as any
      const category = it.category ?? fallback?.category
      const groupPrice = it.groupPrice ?? fallback?.groupPrice
      return category === 'cleaning' && !!groupPrice
    })
    const totalQty = cleaningItems.reduce((acc, it) => acc + (it.quantity || 0), 0)
    const thresholds = cleaningItems
      .map(it => {
        const fallback = allProducts.find(x => x.id === it.id) as any
        return (it as any).groupMinQty ?? fallback?.groupMinQty ?? 3
      })
    const minThreshold = thresholds.length ? Math.min(...thresholds) : 3
    const active = totalQty >= minThreshold
    return { totalQty, minThreshold, active }
  }

  // 計算商品總價（套用跨品項清洗團購）
  const totalPriceMemo = useMemo(() => {
    const ctx = getCleaningGroupContext()
    return cart.reduce((sum, item) => {
      const fallback = allProducts.find(p => p.id === item.id) as any
      const category = item.category ?? fallback?.category
      const price = (typeof item.price === 'number' && !Number.isNaN(item.price)) ? item.price : (fallback?.price || 0)
      const groupPrice = (typeof (item as any).groupPrice === 'number' && !Number.isNaN((item as any).groupPrice)) ? (item as any).groupPrice : fallback?.groupPrice
      if (category === 'cleaning' && groupPrice && ctx.active) {
        return sum + (groupPrice * item.quantity)
      }
      return sum + price * item.quantity
    }, 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cart)])

  const getTotalPrice = () => totalPriceMemo

  // 計算團購前原價總計（不套用團購價）
  const groupBuyPriceMemo = useMemo(() => {
    return cart.reduce((sum, item) => {
      const fallback = allProducts.find(p => p.id === item.id) as any
      const price = (typeof item.price === 'number' && !Number.isNaN(item.price)) ? item.price : (fallback?.price || 0)
      return sum + price * item.quantity
    }, 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cart)])

  const getGroupBuyPrice = () => groupBuyPriceMemo

  // 計算團購優惠金額
  const groupBuySavingsMemo = useMemo(() => {
    return groupBuyPriceMemo - totalPriceMemo
  }, [groupBuyPriceMemo, totalPriceMemo])

  const getGroupBuySavings = () => groupBuySavingsMemo

  // 檢查是否適用團購價（跨品項：清洗類別、開啟時所有清洗品項皆適用）
  const isGroupBuyEligible = (productId: string) => {
    const item = cart.find(i => i.id === productId)
    const fallback = allProducts.find(p => p.id === productId) as any
    const category = item?.category ?? fallback?.category
    const groupPrice = (item as any)?.groupPrice ?? fallback?.groupPrice
    const ctx = getCleaningGroupContext()
    return !!(category === 'cleaning' && groupPrice && ctx.active)
  }

  // 取得適用團購價的商品
  const getGroupBuyEligibleItems = () => {
    return cart.filter(item => isGroupBuyEligible(item.id))
  }

  // 針對清洗類：距離團購門檻還差幾件（跨品項累計）
  const getRemainingForGroup = (productId: string) => {
    const item = cart.find(i => i.id === productId)
    const fallback = allProducts.find(p => p.id === productId) as any
    const category = item?.category ?? fallback?.category
    if (category !== 'cleaning') return 0
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
    // 注意：getTotalPrice() 已經套用團購價，不可再次扣除 groupBuySavings
    const totalAfterGroup = getTotalPrice()
    const discountAmount = getDiscountAmount()
    const pointsDiscount = getPointsDiscount()
    return Math.max(0, totalAfterGroup - discountAmount - pointsDiscount)
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
    
    // 我們的承諾（官網）：提交前必須同意
    const ok = window.confirm((commitmentText||'').trim() + '\n\n請點選「確定」代表您已閱讀並同意我們的承諾')
    if (!ok) return
    setAgreeCommitment(true)

    // 組合完整地址
    const fullAddress = `${(customerInfo.city||'').trim()}${(customerInfo.district||'').trim()}${(customerInfo.street||'').trim()}`.trim()

    // 驗證必填欄位（並捲動到第一個錯誤）
    const newErrors: Record<string, string> = {}
    if (!customerInfo.name.trim()) newErrors.name = '請填寫姓名'
    if (!customerInfo.phone.trim()) newErrors.phone = '請填寫電話'
    if (!customerInfo.email.trim()) newErrors.email = '請填寫 Email'
    if (!customerInfo.city.trim()) newErrors.city = '請選擇縣市'
    if (!customerInfo.district.trim()) newErrors.district = '請選擇區域'
    if (!customerInfo.street.trim()) newErrors.street = '請填寫詳細地址'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      const order = ['name','phone','email','city','district','street']
      const first = order.find(k => newErrors[k])
      const map: Record<string, any> = { name: nameRef, phone: phoneRef, email: emailRef, city: cityRef, district: districtRef, street: streetRef }
      setTimeout(() => map[first!]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
      toast.error('請填寫所有必填欄位')
      return
    }
    setErrors({})
    
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
            address: fullAddress
          })
        })
      } catch {}

      // 優先直寫 Supabase（透過 adapters）
      let createdId = ''
      try {
        const adapters = await loadAdapters()
        // 時段映射
        const mapTime: Record<string, { start: string; end: string }> = {
          morning: { start: '09:00', end: '12:00' },
          afternoon: { start: '13:00', end: '17:00' },
          evening: { start: '18:00', end: '20:00' }
        }
        const tw = mapTime[customerInfo.preferredTime] || { start: undefined as any, end: undefined as any }
        // 寫入服務品項：若為清洗類且達團購門檻，寫入團購價
        const ctx = getCleaningGroupContext()
        const serviceItems = cart.map((it:any)=> {
          const fallback = allProducts.find(p => p.id === it.id) as any
          const category = it.category ?? fallback?.category
          const price = (typeof it.price === 'number' && !Number.isNaN(it.price)) ? it.price : (fallback?.price || 0)
          const groupPrice = (typeof (it as any).groupPrice === 'number' && !Number.isNaN((it as any).groupPrice)) ? (it as any).groupPrice : fallback?.groupPrice
          const unitPrice = (category === 'cleaning' && groupPrice && ctx.active) ? Number(groupPrice) : Number(price)
          return ({ name: it.name, quantity: it.quantity, unitPrice, category })
        })
        // 合法 UUID 的 memberId 才帶上，否則交由後端留空
        const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        const memberId = (memberUser?.id && validUuid.test(memberUser.id)) ? memberUser.id : undefined
        const commitmentAcceptedAt = new Date().toISOString()
        const noteCommit = `【承諾已同意】${commitmentAcceptedAt}`
        const noteDiscount = discountCode ? `折扣碼: ${discountCode}` : ''
        const noteCombined = [noteCommit, noteDiscount].filter(Boolean).join('\n')
        const draft: any = {
          memberId,
          customerName: customerInfo.name,
          customerPhone: customerInfo.phone,
          customerEmail: customerInfo.email,
          customerAddress: fullAddress,
          preferredDate: customerInfo.preferredDate || undefined,
          preferredTimeStart: tw.start,
          preferredTimeEnd: tw.end,
          paymentMethod,
          pointsUsed: pointsToUse,
          pointsDeductAmount: getPointsDiscount(),
          note: [noteCombined, `預估回饋點數：${getEstimatedPoints()}（訂單結案後入點）》`].filter(Boolean).join('\n') || undefined,
          platform: '商',
          status: 'pending',
          serviceItems
        }
        const created = await (adapters as any).orderRepo.create(draft)
        createdId = created?.id || ''
      } catch (cloudErr) {
        console.warn('直寫雲端失敗，改用本地暫存：', cloudErr)
      }

      // 若雲端建立成功 → 清空購物車並導向（雙保險）
      if (createdId) {
        // 建單成功後即時扣除使用積分（寫入 ledger 與餘額）
        // 立即扣點（支援 memberId 或 email）
        try {
          if (usePoints && pointsToUse > 0) {
            const payload = memberId ? { memberId, orderId: createdId, points: pointsToUse } : { memberEmail: String(memberUser.email||'').toLowerCase(), orderId: createdId, points: pointsToUse }
            await fetch('/_api/points/use-on-create', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
          }
          // 預估入點：建立待入點記錄（供會員中心領取），避免前端與後端計算落差
          try {
            const est = getEstimatedPoints()
            if (est>0) {
              const payload2 = memberId ? { memberId, orderId: createdId, points: est, reason: '消費回饋（預估）' } : { memberEmail: String(memberUser.email||'').toLowerCase(), orderId: createdId, points: est, reason: '消費回饋（預估）' }
              await fetch('/_api/points/pending/create', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload2) })
            }
          } catch {}
        } catch {}
        // 前端不再寫入本地積分；畫面僅即時刷新，下一次進來會由 API 取得
        try { localStorage.setItem('lastOrderId', createdId) } catch {}
        try { localStorage.setItem('shopCart', JSON.stringify([])) } catch {}
        setCart([])
        navigate(`/store/order-success?order=${encodeURIComponent(createdId)}`)
        return
      }

      // 回退：儲存到 localStorage（模擬資料庫）
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
        status: 'pending',
        note: `【承諾已同意】${new Date().toISOString()}`
      }
      const existingOrders = JSON.parse(localStorage.getItem('reservationOrders') || '[]')
      existingOrders.push(order)
      localStorage.setItem('reservationOrders', JSON.stringify(existingOrders))

      try { localStorage.setItem('lastOrderId', order.id) } catch {}
      try { localStorage.setItem('shopCart', JSON.stringify([])) } catch {}
      setCart([])
      navigate(`/store/order-success?order=${encodeURIComponent(order.id)}`)

    } catch (error) {
      toast.error('提交訂單時發生錯誤')
      console.error('Order submission error:', error)
    }
  }

  // 計算可使用的最大積分
  const maxUsablePoints = Math.min(customerPoints, Math.floor(getTotalPrice()))

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
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        {/* 頁面標題 */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <Link
              to="/store/products"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">購物車結帳</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* 購物車商品列表 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                購物車商品 ({cart.length} 件)
              </h2>

              {cart.length === 0 ? (
                <div className="text-center py-10 md:py-12 text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-base md:text-lg mb-2">購物車是空的</p>
                  <p className="text-sm md:text-base mb-4">開始選購商品吧！</p>
                  <Link
                    to="/store/products"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 md:px-6 md:py-3 rounded-lg font-medium transition-colors"
                  >
                    前往選購
                  </Link>
                </div>
              ) : (
                <>
                  {/* 商品列表 */}
                  <div className="space-y-3 md:space-y-4 mb-5 md:mb-6">
                    {cart.map((item) => {
                      const product = allProducts.find(p => p.id === item.id)
                      const isGroupBuy = isGroupBuyEligible(item.id)
                      const unitPrice = (typeof item.price === 'number' && !Number.isNaN(item.price)) ? item.price : (product?.price || 0)
                      return (
                        <div key={item.id} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 text-sm md:text-base">{item.name}</h3>
                            <div className="text-xs md:text-sm text-gray-600 mt-1">
                              {isGroupBuy ? (
                                <span className="text-orange-600">
                                  團購價：NT$ {product?.groupPrice?.toLocaleString()} × {item.quantity}
                                </span>
                              ) : (
                                <span>NT$ {unitPrice.toLocaleString()} × {item.quantity}</span>
                              )}
                            </div>
                            {!isGroupBuy && product?.groupMinQty ? (
                              <div className="text-[11px] md:text-xs text-orange-600 mt-1">
                                再加 {getRemainingForGroup(item.id)} 件即可享團購價（門檻 {product.groupMinQty} 件）
                              </div>
                            ) : null}
                            {isGroupBuy && (
                              <div className="text-[11px] md:text-xs text-green-600 mt-1">
                                ✓ 已達團購門檻，享受優惠價
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-gray-200 rounded">
                              <Minus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            </button>
                            <span className="w-10 md:w-12 text-center text-xs md:text-sm font-medium">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-gray-200 rounded">
                              <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            </button>
                            <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 團購提醒 */}
                  {getGroupBuyEligibleItems().length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 md:p-4 mb-5 md:mb-6">
                      <div className="flex items-center gap-2 text-orange-800 mb-1.5 md:mb-2">
                        <Users className="h-4 w-4 md:h-5 md:w-5" />
                        <span className="text-sm md:text-base font-medium">團購優惠提醒</span>
                      </div>
                      <p className="text-orange-700 text-xs md:text-sm">
                        您已達到團購門檻，享受優惠價格！共節省 NT$ {getGroupBuySavings().toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* 清空購物車 */}
                  <div className="text-right">
                    <button onClick={clearCart} className="text-red-600 hover:text-red-700 text-sm font-medium">
                      清空購物車
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* 客戶資訊表單 */}
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
                <User className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                客戶資訊
              </h2>
              <form onSubmit={handleSubmitOrder} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">姓名 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      inputMode="text"
                      ref={nameRef}
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                      placeholder="請輸入姓名"
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">電話 <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      required
                      autoComplete="tel"
                      inputMode="tel"
                      ref={phoneRef}
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                      placeholder="請輸入電話"
                    />
                    {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      inputMode="email"
                      ref={emailRef}
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                      placeholder="請輸入Email"
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">縣市 <span className="text-red-500">*</span></label>
                      <select
                        required
                        ref={cityRef}
                        value={customerInfo.city}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, city: e.target.value, district: '' })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.city ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                      >
                        <option value="">請選擇縣市</option>
                        {taiwanCities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">區域 <span className="text-red-500">*</span></label>
                      <select
                        required
                        ref={districtRef}
                        value={customerInfo.district}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, district: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.district ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                        disabled={!customerInfo.city}
                      >
                        <option value="">請選擇區域</option>
                        {(taiwanDistricts[customerInfo.city] || []).map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      {errors.district && <p className="mt-1 text-xs text-red-600">{errors.district}</p>}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">詳細地址 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      autoComplete="street-address"
                      inputMode="text"
                      ref={streetRef}
                      value={customerInfo.street}
                      onChange={(e) => setCustomerInfo({...customerInfo, street: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.street ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                      placeholder="例如：重慶南路一段100號6樓"
                    />
                    {errors.street && <p className="mt-1 text-xs text-red-600">{errors.street}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">期望日期</label>
                    <input
                      type="date"
                      value={customerInfo.preferredDate}
                      onChange={(e) => setCustomerInfo({...customerInfo, preferredDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">期望時間</label>
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
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 lg:sticky lg:top-8">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                結帳摘要
              </h2>

              {cart.length > 0 && (
                <>
                  {/* 規則說明卡片 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 mb-5 md:mb-6 text-xs md:text-sm text-blue-900">
                    <div className="font-semibold mb-1">購物說明</div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>清洗服務：同次訂單清洗品項合併滿 3 件即享各品項團購價（可跨品項）</li>
                      <li>積分：每消費 NT$100 累積 1 點；1 點可折抵 NT$1（可全額折抵）</li>
                      <li>折扣碼：輸入折扣碼可享 97% 優惠</li>
                    </ul>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={()=> alert((commitmentText||'').trim() || '（目前無承諾內容）')}
                    className="rounded bg-white border px-2 py-1 text-blue-700 hover:bg-blue-100"
                  >查看我們的承諾</button>
                  <label className="inline-flex items-center gap-2 text-blue-900">
                    <input type="checkbox" checked={agreeCommitment} onChange={e=> setAgreeCommitment(e.target.checked)} />
                    <span>我已閱讀並同意</span>
                  </label>
                </div>
                  </div>

                  {/* 價格明細 */}
                  <div className="space-y-3 mb-5 md:mb-6">
                    <div className="flex justify-between text-xs md:text-sm text-gray-600">
                      <span>商品總計</span>
                      <span>NT$ {getGroupBuyPrice().toLocaleString()}</span>
                    </div>
                    {getGroupBuySavings() > 0 && (
                      <div className="flex justify-between text-xs md:text-sm text-orange-600">
                        <span>團購優惠</span>
                        <span>-NT$ {getGroupBuySavings().toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-xs md:text-sm text-gray-600">
                        <span>優惠後金額</span>
                        <span>NT$ {getTotalPrice().toLocaleString()}</span>
                      </div>
                      {getItemsToReachGroup() > 0 && (
                        <div className="mt-2 text-[11px] md:text-xs text-orange-600">
                          再加 {getItemsToReachGroup()} 件清洗服務可享團購價
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 付款方式 */}
                  <div className="mb-5 md:mb-6">
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
                  <div className="mb-5 md:mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">積分使用 (目前有 {customerPoints} 積分)</label>
                      <button
                        type="button"
                        onClick={() => setUsePoints(!usePoints)}
                        className={`text-xs md:text-sm px-2 py-1 rounded ${usePoints ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
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
                        <div className="text-[11px] md:text-xs text-gray-500">
                          每1積分可折抵NT$1，最多使用 {maxUsablePoints.toLocaleString()} 積分
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 最終價格 */}
                  <div className="border-t pt-4 space-y-3 mb-6">
                    {getDiscountAmount() > 0 && (
                      <div className="flex justify-between text-xs md:text-sm text-green-600">
                        <span>折扣碼優惠</span>
                        <span>-NT$ {getDiscountAmount().toLocaleString()}</span>
                      </div>
                    )}
                    {usePoints && pointsToUse > 0 && (
                      <div className="flex justify-between text-xs md:text-sm text-green-600">
                        <span>積分折抵</span>
                        <span>-NT$ {getPointsDiscount().toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base md:text-lg font-bold text-gray-900 pt-2 border-t">
                      <span>應付金額</span>
                      <span>NT$ {getFinalPrice().toLocaleString()}</span>
                    </div>
                    <div className="text-[11px] md:text-xs text-gray-700">
                      預估回饋點數：{getEstimatedPoints().toLocaleString()} 點（訂單結案後入點，下次服務可折抵）
                    </div>
                    {getGroupBuySavings() > 0 && (
                      <div className="text-[11px] md:text-xs text-green-600">已為您節省：NT$ {getGroupBuySavings().toLocaleString()}</div>
                    )}
                    <div className="text-[11px] md:text-xs text-gray-500">預估可獲得積分：{getEstimatedPoints().toLocaleString()} 點</div>
                  </div>

                  {/* 提交訂單按鈕（桌機） */}
                  <button
                    onClick={handleSubmitOrder}
                    disabled={cart.length === 0 || !agreeCommitment}
                    className="hidden md:block w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 disabled:cursor-not-allowed"
                  >
                    提交訂單
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 行動版底部提交列 */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t shadow-md p-3 flex items-center justify-between md:hidden">
          <div className="text-sm">
            <div className="text-gray-600">應付金額</div>
            <div className="text-base font-bold text-gray-900">NT$ {getFinalPrice().toLocaleString()}</div>
          </div>
          <button
            onClick={handleSubmitOrder}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            disabled={!agreeCommitment}
          >
            提交訂單
          </button>
        </div>
      )}
      {/* 底部安全間距 */}
      <div className="h-16 md:h-0" />
    </div>
  )
}
