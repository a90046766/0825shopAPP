import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Shield, 
  Star, 
  Users, 
  Award, 
  Clock, 
  CheckCircle, 
  ShoppingCart, 
  Phone, 
  Mail, 
  MapPin,
  ArrowRight,
  Sparkles,
  Heart,
  Zap,
  ShoppingBag,
  HelpCircle
} from 'lucide-react'
import MemberBell from '../components/MemberBell'

export default function NewShopPage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isMember, setIsMember] = useState(false)
  const [cmsHero, setCmsHero] = useState<any[] | null>(null)
  const [cmsServices, setCmsServices] = useState<any[] | null>(null)
  const [cmsAdvantages, setCmsAdvantages] = useState<any[] | null>(null)
  const [cmsPromotion, setCmsPromotion] = useState<any | null>(null)
  const [cmsLoyalty, setCmsLoyalty] = useState<any | null>(null)
  const [cmsContacts, setCmsContacts] = useState<any | null>(null)
  const [cmsFaqs, setCmsFaqs] = useState<any[] | null>(null)

  // 預取產品頁 chunk（滑入/觸控即預載）
  const prefetchOnceRef = React.useRef(false)
  const prefetchProducts = () => {
    if (prefetchOnceRef.current) return
    prefetchOnceRef.current = true
    import('./ShopProducts').catch(() => {})
  }

  // 顯示登入者資訊：會員與內部人員皆可顯示；用 isMember 區分是否會員
  useEffect(() => {
    const checkUser = () => {
      try {
        const memberUser = localStorage.getItem('member-auth-user')
        const supabaseUser = localStorage.getItem('supabase-auth-user')
        const localUser = localStorage.getItem('local-auth-user')
        const user = memberUser
          ? JSON.parse(memberUser)
          : supabaseUser
            ? JSON.parse(supabaseUser)
            : localUser
              ? JSON.parse(localUser)
              : null
        setCurrentUser(user)
        setIsMember(!!memberUser)
      } catch {}
    }
    checkUser()
    window.addEventListener('storage', checkUser)
    return () => window.removeEventListener('storage', checkUser)
  }, [])

  // 自動輪播
  useEffect(() => {
    const total = (cmsHero && cmsHero.length>0 ? cmsHero.length : 3)
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % Math.min(4, total))
    }, 5000)
    return () => clearInterval(timer)
  }, [cmsHero])

  // 載入 CMS 內容（失敗則用本地預設）
  useEffect(() => {
    (async () => {
      try {
        const mod = await import('../../adapters/supabase/cms')
        const [h, s, a, p, l, c, f] = await Promise.all([
          mod.fetchHeroSlides().catch(()=>null),
          mod.fetchServices().catch(()=>null),
          mod.fetchAdvantages().catch(()=>null),
          mod.fetchPromotions().catch(()=>null),
          mod.fetchLoyalty().catch(()=>null),
          mod.fetchContacts().catch(()=>null),
          mod.fetchFaqs().catch(()=>[])
        ])
        if (h && Array.isArray(h) && h.length>0) setCmsHero(h)
        if (s && Array.isArray(s) && s.length>0) setCmsServices(s)
        if (a && Array.isArray(a) && a.length>0) setCmsAdvantages(a)
        if (p) setCmsPromotion(p)
        if (l) setCmsLoyalty(l)
        if (c) setCmsContacts(c)
        if (Array.isArray(f) && f.length>0) setCmsFaqs(f as any)
      } catch {}
    })()
  }, [])

  const heroSlides = cmsHero || [
    {
      title: "專業日式洗濯服務",
      subtitle: "讓您的家電煥然一新，享受潔淨生活",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      color: "from-blue-600 to-purple-600"
    },
    {
      title: "團購優惠進行中",
      subtitle: "滿3件享團購價，省錢又省心",
      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      color: "from-orange-500 to-red-500"
    },
    {
      title: "積分回饋制度",
      subtitle: "消費累積積分，享受更多優惠",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      color: "from-green-500 to-emerald-600"
    }
  ]

  const services = cmsServices || [
    {
      name: "專業清洗服務",
      description: "冷氣、洗衣機、抽油煙機等家電專業清洗",
      icon: Sparkles,
      features: [
        "專業技師",
        "專用清潔劑",
        "保固服務",
        "透明定價",
        "完整防護",
        "快速到府"
      ],
      link: "/store/products?category=cleaning"
    },
    {
      name: "家電銷售服務",
      description: "各品牌家電，品質保證，價格實惠",
      icon: Award,
      features: [
        "原廠保固",
        "免費安裝",
        "售後服務",
        "正品保證",
        "專人諮詢",
        "快速到貨"
      ],
      link: "/store/products?category=new"
    },
    {
      name: "二手家電服務",
      description: "品質檢驗，價格優惠，安心選擇",
      icon: Heart,
      features: [
        "品質保證",
        "價格實惠",
        "多重檢測",
        "專業檢測",
        "功能保固",
        "安全可靠"
      ],
      link: "/store/products?category=used"
    },
    {
      name: "居家清潔/消毒服務",
      description: "定期清潔，專業服務，讓家更舒適",
      icon: CheckCircle,
      features: [
        "定期服務",
        "專業清潔",
        "滿意保證",
        "醫療等級消毒",
        "安全無毒配方",
        "彈性時段預約"
      ],
      link: "/store/products?category=home"
    }
  ]

  const advantages = cmsAdvantages || [
    {
      title: "專業技術",
      description: "多年實務經驗與標準化SOP，細節到位、品質穩定",
      icon: Award,
      color: "text-blue-600"
    },
    {
      title: "品質保證",
      description: "使用專用清潔劑與專用工具，不傷材質、延長壽命",
      icon: Shield,
      color: "text-green-600"
    },
    {
      title: "準時快速",
      description: "預約到府，準時抵達，縮短等待時間",
      icon: Clock,
      color: "text-orange-600"
    },
    {
      title: "滿意承諾",
      description: "若不滿意免費重做，完工後仍提供30天保固",
      icon: Star,
      color: "text-purple-600"
    },
    {
      title: "透明定價",
      description: "清楚標示每一項費用，現場無另加價，安心無負擔",
      icon: CheckCircle,
      color: "text-emerald-600"
    },
    {
      title: "合法投保",
      description: "人員皆投保公責保險，雙重保障維護您的權益",
      icon: Users,
      color: "text-sky-600"
    },
    {
      title: "口碑見證",
      description: "累積眾多好評與實際案例照片，值得信賴",
      icon: Heart,
      color: "text-rose-600"
    },
    {
      title: "到府防護",
      description: "作業全程鋪墊遮蔽與安全斷電，保護環境與設備",
      icon: Shield,
      color: "text-yellow-600"
    },
    {
      title: "專用清潔劑",
      description: "針對不同材質選用專用配方，清潔同時守護家電",
      icon: CheckCircle,
      color: "text-emerald-600"
    },
    {
      title: "安全防護",
      description: "完備的現場安全防護與流程管控，服務更安心",
      icon: Shield,
      color: "text-indigo-600"
    },
    {
      title: "服務聯保",
      description: "完工提供保固通知與LINE客服支援，有問題即時回應",
      icon: Users,
      color: "text-blue-500"
    },
    {
      title: "到府覆蓋",
      description: "北中南主要都會區到府，偏遠規範清楚，安排更有效率",
      icon: MapPin,
      color: "text-rose-500"
    }
  ]

  const defaultFaqs = [
    { question: '清洗服務的保固怎麼計算？', answer: '依機齡提供 30~90 天保固；若於保固內無法維修，提供換新機購物金。' },
    { question: '團購怎麼算？可以跨品項嗎？', answer: '同次訂單的清洗品項可跨品項累計，滿 3 件起即可套用各品項的團購價。' },
    { question: '積分怎麼累積與折抵？', answer: '消費每滿 NT$100 贈 1 點；每 1 點可折抵 NT$1，且可全額折抵，永久不過期。' },
    { question: '期望時段如何安排？', answer: '可選上午(09:00-12:00) / 下午(13:00-17:00) / 晚上(18:00-21:00)。實際到府時間以客服確認為準。' },
    { question: '付款方式有哪些？', answer: '支援現金、匯款（回報末五碼）、刷卡（行動刷卡）。未來將陸續開放更多方式。' },
    { question: '服務區域與偏遠規範？', answer: '北中南主要都會區到府。偏遠或山區多有限制，南投/雲林/嘉義/屏東由周邊地區技師支援，需同址三台(含)以上。' }
  ]
  const faqs = (cmsFaqs && cmsFaqs.length>0) ? cmsFaqs.map((x:any)=>({ question: x.question, answer: x.answer })) : defaultFaqs
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  // 色彩背景對應，讓優勢圖示背景更有色彩
  const advantageBgMap: Record<string, string> = {
    'text-blue-600': 'bg-blue-50',
    'text-green-600': 'bg-green-50',
    'text-orange-600': 'bg-orange-50',
    'text-purple-600': 'bg-purple-50',
    'text-emerald-600': 'bg-emerald-50',
    'text-sky-600': 'bg-sky-50',
    'text-rose-600': 'bg-rose-50',
    'text-yellow-600': 'bg-yellow-50',
    'text-indigo-600': 'bg-indigo-50',
    'text-blue-500': 'bg-blue-50',
    'text-rose-500': 'bg-rose-50'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 用戶資訊欄 */}
      {currentUser && (
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-xs text-gray-600">歡迎回來，</span>
              <span className="text-sm font-medium text-gray-900">{currentUser.name || currentUser.email}</span>
              {currentUser.code && (
                <span className="text-[11px] text-gray-500">會員編號：{currentUser.code}</span>
              )}
              {!isMember && (
                <span className="text-xs text-gray-500">({currentUser.role || '用戶'})</span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <Link
                to="/store/member/orders"
                className="inline-flex items-center px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                我的訂單
              </Link>
              <MemberBell />
              <button
                onClick={async()=>{ try{ const mod = await import('../../adapters/supabase/auth'); await mod.authRepo.logout(); localStorage.removeItem('member-auth-user'); location.href = '/store' }catch{ try{ localStorage.removeItem('member-auth-user'); }catch{} finally{ location.href = '/store' } }}}
                className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                登出
              </button>
              {!isMember && (currentUser?.role==='admin' || currentUser?.role==='support') && (
                <Link
                  to="/dispatch"
                  className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ArrowRight className="h-3 w-3 mr-2 rotate-180" />
                  返回派工系統
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
      {!currentUser && (
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="text-sm text-gray-600">歡迎來到日式洗濯</div>
            <div className="flex items-center space-x-3">
              <Link
                to="/login/member"
                className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <ShoppingBag className="h-3 w-3 mr-2" />
                會員登入
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 固定橫幅已移除 */}

      {/* Hero 輪播區塊 */}
      <div className="relative h-[300px] md:h-[360px] overflow-hidden">
        {heroSlides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-black/30 z-10" />
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="text-center text-white max-w-4xl mx-auto px-4">
                <h1 className="text-2xl md:text-3xl font-bold mb-2 animate-fade-in">
                  {slide.title}
                </h1>
                <p className="text-sm md:text-base mb-4 opacity-90">
                  {slide.subtitle}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    to="/store/products"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    瀏覽服務
                    <ArrowRight className="inline ml-2 h-3 w-3" />
                  </Link>
                  <a
                    href="#services"
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-300 border border-white/30"
                  >
                    服務介紹
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
        {/* 輪播指示器保持不變 */}
      </div>

      {/* 四大服務分類 */}
      <section id="services" className="py-10 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              我們的服務
            </h2>
            <p className="text-base text-gray-600 max-w-3xl mx-auto">
              專業的日式洗濯服務，讓您的家電煥然一新，享受潔淨舒適的生活品質
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-3 mx-auto">
                  {typeof (service as any).icon === 'string' ? (
                    (() => {
                      const map: any = { Shield, Star, Users, Award, Clock, CheckCircle, Heart, Sparkles }
                      const Icon = map[(service as any).icon] || Sparkles
                      return <Icon className="h-6 w-6 text-white" />
                    })()
                  ) : (
                    <service.icon className="h-6 w-6 text-white" />
                  )}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2 text-center">
                  {service.name}
                </h3>
                <p className="text-gray-600 mb-3 text-center text-xs">
                  {service.description}
                </p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-4">
                  {service.features.map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-center">
                      <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  to={service.link}
                  onMouseEnter={prefetchProducts}
                  onTouchStart={prefetchProducts}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 px-4 rounded-xl font-semibold transition-all duration-300 text-center block text-xs"
                >
                  瀏覽服務
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 為什麼選擇我們 */}
      <section className="py-12 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-6">
                                <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">
                          為什麼選擇日式洗濯？
                        </h2>
                        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                          我們提供的不只是清潔服務，更是對品質的堅持和對客戶的承諾
                        </p>
                      </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {advantages.map((advantage, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto ${advantageBgMap[advantage.color] || 'bg-blue-50'}`}>
                  {/* 若 CMS 回來的是字串名稱，進行對應；否則使用傳入的元件 */}
                  {typeof (advantage as any).icon === 'string' ? (
                    (() => {
                      const map: any = { Shield, Star, Users, Award, Clock, CheckCircle, Heart, MapPin }
                      const Icon = map[(advantage as any).icon] || CheckCircle
                      const color = (advantage as any).color || 'text-blue-600'
                      return <Icon className={`h-8 w-8 ${color}`} />
                    })()
                  ) : (
                    (()=>{ const C:any = (advantage as any).icon; const color = (advantage as any).color || 'text-blue-600'; return <C className={`h-8 w-8 ${color}`} /> })()
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  {advantage.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {advantage.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 保固承諾 */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl p-12 text-white text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-8 mx-auto">
              <Shield className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-4xl font-bold mb-6">
              保固承諾
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div>
                <h3 className="text-xl font-semibold mb-3">服務保固</h3>
                <p className="text-green-100">
                  依機齡提供30~90天保固，如無法維修提供換新機購物金
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">品質保證</h3>
                <p className="text-green-100">使用專用清潔劑，不傷家電</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">滿意保證</h3>
                <p className="text-green-100">
                  服務不滿意，我們承諾免費重做直到您滿意
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 團購優惠活動 */}
      <section className="py-16 bg-gradient-to-r from-orange-50 to-red-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl p-12 text-white text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-8 mx-auto">
              <Users className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-4xl font-bold mb-6">
              🎉 團購優惠活動
            </h2>
            <p className="text-xl mb-8 text-orange-100 max-w-3xl mx-auto">
              專業清洗服務滿3件即可享受團購價！邀請親朋好友一起享受優惠，省錢又省心
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-8">
              <div className="bg-white/20 rounded-2xl p-6">
                <div className="text-3xl font-bold mb-2">推薦加入</div>
                <div className="text-orange-100">就送100積分</div>
              </div>
              <div className="bg-white/20 rounded-2xl p-6">
                <div className="text-3xl font-bold mb-2">滿$100送1積分</div>
                <div className="text-orange-100">消費回饋</div>
              </div>
              <div className="bg-white/20 rounded-2xl p-6">
                <div className="text-3xl font-bold mb-2">可全額折抵</div>
                <div className="text-orange-100">積分永久有效</div>
              </div>
            </div>
                                    <Link
                          to="/shop/products?category=cleaning"
                          className="bg-white text-orange-600 hover:bg-gray-100 px-6 py-3 rounded-full text-base font-semibold transition-all duration-300 inline-flex items-center"
                        >
                          瀏覽清洗服務
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
          </div>
        </div>
      </section>

      {/* 積分系統介紹 */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl p-12 text-white text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-8 mx-auto">
              <Star className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-4xl font-bold mb-6">
              積分回饋制度
            </h2>
            <p className="text-xl mb-8 text-purple-100 max-w-3xl mx-auto">消費$100=1積分，每1積分=$1，積分可全額折抵，永久不過期</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-8">
              <div className="bg-white/20 rounded-2xl p-6">
                <div className="text-3xl font-bold mb-2">100:1</div>
                <div className="text-purple-100">積分比例</div>
                <div className="text-sm text-purple-200">消費$100=1積分</div>
              </div>
              <div className="bg-white/20 rounded-2xl p-6">
                <div className="text-3xl font-bold mb-2">1:1</div>
                <div className="text-purple-100">折抵比例</div>
                <div className="text-sm text-purple-200">每1積分=$1元</div>
              </div>
              <div className="bg-white/20 rounded-2xl p-6">
                <div className="text-3xl font-bold mb-2">永久</div>
                <div className="text-purple-100">永不過期</div>
                <div className="text-sm text-purple-200">積分可全額折抵費用</div>
              </div>
            </div>
            <Link
              to="/shop/products"
              className="bg-white text-purple-600 hover:bg-gray-100 px-6 py-3 rounded-full text-base font-semibold transition-all duration-300 inline-flex items-center"
            >
              開始累積積分
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 常見問題 */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">常見問題</h2>
            <p className="text-base text-gray-600">快速了解保固、團購、時段與付款等規則</p>
          </div>
          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.slice(0,6).map((item:any, idx:number)=> (
              <div key={idx} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  onClick={()=> setOpenFaq(openFaq===idx ? null : idx)}
                >
                  <span className="flex items-center gap-2 text-gray-900 font-medium">
                    <HelpCircle className="h-4 w-4 text-blue-600" />
                    {item.question}
                  </span>
                  <span className="text-gray-400 text-sm">{openFaq===idx ? '收合' : '展開'}</span>
                </button>
                {openFaq===idx && (
                  <div className="px-4 pb-4 text-sm text-gray-700 border-t">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 聯繫我們 */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">
              聯繫我們
            </h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              有任何問題或需要預約服務，歡迎隨時聯繫我們
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Phone className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">客服專線</h3>
              <p className="text-gray-300">(02)7756-2269</p>
              <p className="text-gray-400 text-sm">電話客服服務時間：上午九點~下午六點</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">官方 LINE</h3>
              <p className="text-gray-300">@942clean</p>
              <p className="text-gray-400 text-sm">線上客服服務時間：上午九點~晚間九點</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">服務區域</h3>
              <p className="text-gray-300">基隆 / 台北 / 新北 / 桃園 / 中壢 / 新竹 / 頭份 / 台中 / 彰化 / 台南 / 高雄</p>
              <p className="text-gray-400 text-sm">偏遠地區或山區皆無法服務。南投/雲林/嘉義/屏東由周邊地區技師支援，需同址三台(含)以上才能承接。</p>
            </div>
          </div>
          
          <div className="text-center mt-12 text-sm text-gray-300">日式洗濯 統編:90046766</div>
        </div>
      </section>
    </div>
  )
}
