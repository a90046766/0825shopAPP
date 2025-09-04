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
  ShoppingBag
} from 'lucide-react'

export default function NewShopPage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // 檢查用戶登入狀態
  useEffect(() => {
    const checkUser = () => {
      try {
        const supabaseUser = localStorage.getItem('supabase-auth-user')
        const localUser = localStorage.getItem('local-auth-user')
        const user = supabaseUser ? JSON.parse(supabaseUser) : localUser ? JSON.parse(localUser) : null
        setCurrentUser(user)
      } catch (error) {
        console.error('檢查用戶狀態失敗:', error)
      }
    }
    
    checkUser()
    // 監聽 localStorage 變化
    window.addEventListener('storage', checkUser)
    return () => window.removeEventListener('storage', checkUser)
  }, [])

  // 自動輪播
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const heroSlides = [
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

  const services = [
    {
      name: "專業清洗服務",
      description: "冷氣、洗衣機、抽油煙機等家電專業清洗",
      icon: Sparkles,
      features: ["專業技師", "環保清潔劑", "保固服務"],
      link: "/shop/products?category=cleaning"
    },
    {
      name: "家電銷售服務",
      description: "各品牌家電，品質保證，價格實惠",
      icon: Award,
      features: ["原廠保固", "免費安裝", "售後服務"],
      link: "/shop/products?category=new"
    },
    {
      name: "二手家電服務",
      description: "品質檢驗，價格優惠，環保選擇",
      icon: Heart,
      features: ["品質保證", "價格實惠", "環保節能"],
      link: "/shop/products?category=used"
    },
    {
      name: "居家清潔/消毒服務",
      description: "定期清潔，專業服務，讓家更舒適",
      icon: CheckCircle,
      features: ["定期服務", "專業清潔", "滿意保證"],
      link: "/shop/products?category=home"
    }
  ]

  const advantages = [
    {
      title: "專業技術",
      description: "擁有多年經驗的專業技師團隊",
      icon: Award,
      color: "text-blue-600"
    },
    {
      title: "品質保證",
      description: "使用環保清潔劑，不傷家電",
      icon: Shield,
      color: "text-green-600"
    },
    {
      title: "快速服務",
      description: "預約制服務，準時到達",
      icon: Clock,
      color: "text-orange-600"
    },
    {
      title: "滿意保證",
      description: "服務不滿意，免費重做",
      icon: Star,
      color: "text-purple-600"
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 用戶資訊欄 */}
      {currentUser && (
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">歡迎回來，</span>
              <span className="font-medium text-gray-900">{currentUser.name || currentUser.email}</span>
              <span className="text-sm text-gray-500">({currentUser.role || '用戶'})</span>
            </div>
                                      <div className="flex items-center space-x-3">
                            <Link
                              to="/login/member"
                              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <ShoppingBag className="h-4 w-4 mr-2" />
                              會員登入
                            </Link>
                            <Link
                              to="/dispatch"
                              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                              返回派工系統
                            </Link>
                          </div>
          </div>
        </div>
      )}

      {/* Hero 輪播區塊 */}
      <div className="relative h-[450px] overflow-hidden">
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
              <div className="text-center text-white max-w-4xl mx-auto px-6">
                <h1 className="text-4xl md:text-5xl font-bold mb-4 animate-fade-in">
                  {slide.title}
                </h1>
                <p className="text-lg md:text-xl mb-6 opacity-90">
                  {slide.subtitle}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/shop/products"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-full text-base font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    瀏覽服務
                    <ArrowRight className="inline ml-2 h-4 w-4" />
                  </Link>
                  <Link
                    to="/shop/services"
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-6 py-3 rounded-full text-base font-semibold transition-all duration-300 border border-white/30"
                  >
                    服務介紹
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* 輪播指示器 */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex space-x-3">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'bg-white scale-125' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

                        {/* 四大服務分類 */}
                  <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
                                <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">
                          我們的服務
                        </h2>
                        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                          專業的日式洗濯服務，讓您的家電煥然一新，享受潔淨舒適的生活品質
                        </p>
                      </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <service.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
                  {service.name}
                </h3>
                <p className="text-gray-600 mb-4 text-center">
                  {service.description}
                </p>
                                            <ul className="space-y-2 mb-6">
                              {service.features.map((feature, idx) => (
                                <li key={idx} className="flex items-center text-sm text-gray-600">
                                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                            <Link
                              to={service.link}
                              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 text-center block"
                            >
                              瀏覽服務
                            </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 為什麼選擇我們 */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-6">
                                <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">
                          為什麼選擇日式洗濯？
                        </h2>
                        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                          我們提供的不只是清潔服務，更是對品質的堅持和對客戶的承諾
                        </p>
                      </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {advantages.map((advantage, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className={`w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 mx-auto`}>
                  <advantage.icon className={`h-10 w-10 ${advantage.color}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {advantage.title}
                </h3>
                <p className="text-gray-600">
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
                  所有清洗服務提供30天保固，如有問題免費重做
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">品質保證</h3>
                <p className="text-green-100">
                  使用環保清潔劑，不傷家電，延長使用壽命
                </p>
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
                <div className="text-3xl font-bold mb-2">3件</div>
                <div className="text-orange-100">團購門檻</div>
              </div>
              <div className="bg-white/20 rounded-2xl p-6">
                <div className="text-3xl font-bold mb-2">85折</div>
                <div className="text-orange-100">團購優惠</div>
              </div>
              <div className="bg-white/20 rounded-2xl p-6">
                <div className="text-3xl font-bold mb-2">積分</div>
                <div className="text-orange-100">額外回饋</div>
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
            <p className="text-xl mb-8 text-purple-100 max-w-3xl mx-auto">
              消費即可累積積分，享受更多優惠！每100元消費獲得1積分，每100積分可折抵10元
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-8">
              <div className="bg-white/20 rounded-2xl p-6">
                <div className="text-3xl font-bold mb-2">1:1</div>
                <div className="text-purple-100">積分比例</div>
                <div className="text-sm text-purple-200">每100元=1積分</div>
              </div>
              <div className="bg-white/20 rounded-2xl p-6">
                <div className="text-3xl font-bold mb-2">10:1</div>
                <div className="text-purple-100">折抵比例</div>
                <div className="text-sm text-purple-200">每100積分=10元</div>
              </div>
              <div className="bg-white/20 rounded-2xl p-6">
                <div className="text-3xl font-bold mb-2">永久</div>
                <div className="text-purple-100">積分有效</div>
                <div className="text-sm text-purple-200">積分永不過期</div>
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
              <p className="text-gray-300">0800-XXX-XXX</p>
              <p className="text-gray-400 text-sm">週一至週日 8:00-20:00</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">客服信箱</h3>
              <p className="text-gray-300">service@company.com</p>
              <p className="text-gray-400 text-sm">24小時內回覆</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">服務區域</h3>
              <p className="text-gray-300">台北、新北、桃園</p>
              <p className="text-gray-400 text-sm">其他地區請來電詢問</p>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Link
              to="/shop/products"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-full text-base font-semibold transition-all duration-300 inline-flex items-center"
            >
              立即預約服務
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
