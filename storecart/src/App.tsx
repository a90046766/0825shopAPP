import React from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import RegisterPage from './pages/Register'
import ProductsPage from './pages/Products'
import CartPage from './pages/Cart'
import { useCartStore } from './store/cart'
import './index.css'

function Layout({ children }: { children: React.ReactNode }) {
  const { getTotalItems } = useCartStore()
  
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="text-lg font-extrabold tracking-tight">日式洗濯</Link>
          <nav className="hidden gap-4 text-sm text-gray-600 md:flex">
            <Link to="/" className="hover:text-gray-900">首頁</Link>
            <Link to="/services" className="hover:text-gray-900">專業清洗服務</Link>
            <Link to="/new-appliances" className="hover:text-gray-900">新家電</Link>
            <Link to="/used-appliances" className="hover:text-gray-900">二手家電</Link>
            <Link to="/cleaning" className="hover:text-gray-900">居家消毒清潔</Link>
            <Link to="/account" className="hover:text-gray-900">會員</Link>
            <Link to="/cart" className="hover:text-gray-900 relative">
              購物車
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getTotalItems() > 99 ? '99+' : getTotalItems()}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4">
        {children}
      </main>
      <Toaster position="top-right" />
    </div>
  )
}

function Home() {
  return (
    <div className="space-y-12">
      {/* 輪播橫幅 */}
      <section className="relative overflow-hidden rounded-2xl">
        <div className="flex transition-transform duration-500 ease-in-out">
          {/* 橫幅 1: 加入會員想好康 */}
          <div className="w-full flex-shrink-0 relative bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 p-8 text-white">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-3xl">🎉</span>
                  <span className="text-sm bg-white/20 px-3 py-1 rounded-full">限時優惠</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">加入會員想好康</h2>
                <p className="text-xl text-white/90 mb-6">推薦加入就送100積分，立即享受會員專屬優惠！</p>
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 rounded-lg px-4 py-2">
                    <span className="text-2xl font-bold">100</span>
                    <span className="text-sm ml-1">積分</span>
                  </div>
                  <Link to="/register" className="bg-white text-pink-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                    立即加入
                  </Link>
                </div>
              </div>
              <div className="hidden md:block text-8xl opacity-20">🎁</div>
            </div>
          </div>

          {/* 橫幅 2: 積分回饋制度 */}
          <div className="w-full flex-shrink-0 relative bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-8 text-white">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-3xl">💎</span>
                  <span className="text-sm bg-white/20 px-3 py-1 rounded-full">會員專享</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">積分回饋制度</h2>
                <p className="text-xl text-white/90 mb-6">消費$100=1積分，每一積分=$1元，可全額折抵！</p>
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 rounded-lg px-4 py-2">
                    <span className="text-2xl font-bold">1:1</span>
                    <span className="text-sm ml-1">回饋</span>
                  </div>
                  <Link to="/account" className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                    查看積分
                  </Link>
                </div>
              </div>
              <div className="hidden md:block text-8xl opacity-20">💰</div>
            </div>
          </div>

          {/* 橫幅 3: 專業日式洗濯服務 */}
          <div className="w-full flex-shrink-0 relative bg-gradient-to-r from-green-500 via-teal-500 to-cyan-500 p-8 text-white">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-3xl">✨</span>
                  <span className="text-sm bg-white/20 px-3 py-1 rounded-full">專業服務</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">專業日式洗濯服務</h2>
                <p className="text-xl text-white/90 mb-6">讓您的家電煥然一新，享受如新機般的清潔效果！</p>
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 rounded-lg px-4 py-2">
                    <span className="text-2xl font-bold">99%</span>
                    <span className="text-sm ml-1">清潔率</span>
                  </div>
                  <Link to="/services" className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                    立即預約
                  </Link>
                </div>
              </div>
              <div className="hidden md:block text-8xl opacity-20">🧽</div>
            </div>
          </div>
        </div>
        
        {/* 輪播指示器 */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          <button className="w-3 h-3 bg-white rounded-full opacity-80 hover:opacity-100 transition-opacity"></button>
          <button className="w-3 h-3 bg-white/50 rounded-full hover:opacity-100 transition-opacity"></button>
          <button className="w-3 h-3 bg-white/50 rounded-full hover:opacity-100 transition-opacity"></button>
        </div>
      </section>

      {/* 主橫幅 */}
      <section className="relative rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-8 text-white shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🏆</span>
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">10年專業經驗</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            日式洗濯・專業服務
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-6 max-w-3xl">
            找日式洗濯，因為我們更細膩、更專業、更守承諾。冷氣/洗衣機/抽油煙機/水塔/水管，專業清洗與售後服務，一站搞定。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Link to="/services" className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-all duration-300 hover:scale-105 shadow-lg">
              <span className="mr-2">🚀</span>
              立即預約服務
            </Link>
            <Link to="/cart" className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-blue-600 transition-all duration-300 hover:scale-105">
              <span className="mr-2">🛒</span>
              前往購物車
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <div className="text-2xl mb-1">⭐</div>
              <div className="text-sm font-medium">4.9星評價</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <div className="text-2xl mb-1">👥</div>
              <div className="text-sm font-medium">5000+客戶</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <div className="text-2xl mb-1">🕒</div>
              <div className="text-sm font-medium">24小時服務</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <div className="text-2xl mb-1">🛡️</div>
              <div className="text-sm font-medium">品質保證</div>
            </div>
          </div>
        </div>
      </section>

      {/* 服務特色 */}
      <section className="grid gap-6 md:grid-cols-3">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🧹</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">專業清洗</h3>
          <p className="text-gray-600">採用日本進口清潔劑，專業設備，徹底清潔不留死角</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚡</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">快速服務</h3>
          <p className="text-gray-600">預約制服務，準時到達，高效完成，不耽誤您的時間</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🛡️</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">品質保證</h3>
          <p className="text-gray-600">服務後提供保固，如有問題立即處理，讓您安心無憂</p>
        </div>
      </section>

      {/* 服務項目 */}
      <section>
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">我們的服務</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: '專業清洗服務',
              description: '冷氣、洗衣機、抽油煙機專業清洗',
              href: '/services',
              icon: '❄️',
              color: 'from-blue-500 to-blue-600'
            },
            {
              title: '新家電購買',
              description: '正品家電，品質保證，價格實惠',
              href: '/new-appliances',
              icon: '🆕',
              color: 'from-green-500 to-green-600'
            },
            {
              title: '二手家電購買',
              description: '精選二手家電，品質檢驗，價格優惠',
              href: '/used-appliances',
              icon: '🔄',
              color: 'from-orange-500 to-orange-600'
            },
            {
              title: '居家消毒清潔',
              description: '專業消毒清潔，守護家人健康',
              href: '/cleaning',
              icon: '🧼',
              color: 'from-purple-500 to-purple-600'
            }
          ].map((service) => (
            <Link key={service.title} to={service.href} className="group">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group-hover:scale-105">
                <div className={`w-12 h-12 bg-gradient-to-r ${service.color} rounded-lg flex items-center justify-center mb-4`}>
                  <span className="text-xl">{service.icon}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.title}</h3>
                <p className="text-sm text-gray-600">{service.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 為什麼要找日式洗濯 */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">為什麼要找日式洗濯？</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="text-center bg-white/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="font-semibold text-gray-900 mb-2">10年專業經驗</h3>
            <p className="text-sm text-gray-600">深耕業界十年，累積豐富實戰經驗</p>
          </div>
          <div className="text-center bg-white/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="font-semibold text-gray-900 mb-2">5000+滿意客戶</h3>
            <p className="text-sm text-gray-600">服務過無數家庭，口碑見證品質</p>
          </div>
          <div className="text-center bg-white/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">⭐</div>
            <h3 className="font-semibold text-gray-900 mb-2">4.9星高評價</h3>
            <p className="text-sm text-gray-600">客戶一致好評，品質有口皆碑</p>
          </div>
          <div className="text-center bg-white/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">🕒</div>
            <h3 className="font-semibold text-gray-900 mb-2">24小時服務</h3>
            <p className="text-sm text-gray-600">緊急狀況隨時待命，全年無休</p>
          </div>
          <div className="text-center bg-white/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">🇯🇵</div>
            <h3 className="font-semibold text-gray-900 mb-2">日式精工精神</h3>
            <p className="text-sm text-gray-600">嚴謹細膩的服務態度，追求完美</p>
          </div>
          <div className="text-center bg-white/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">🧪</div>
            <h3 className="font-semibold text-gray-900 mb-2">日本進口清潔劑</h3>
            <p className="text-sm text-gray-600">使用頂級環保清潔劑，安全有效</p>
          </div>
          <div className="text-center bg-white/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">🔧</div>
            <h3 className="font-semibold text-gray-900 mb-2">專業設備工具</h3>
            <p className="text-sm text-gray-600">引進最新清洗設備，效果更佳</p>
          </div>
          <div className="text-center bg-white/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">🛡️</div>
            <h3 className="font-semibold text-gray-900 mb-2">30天品質保固</h3>
            <p className="text-sm text-gray-600">服務後提供保固，讓您安心無憂</p>
          </div>
          <div className="text-center bg-white/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="font-semibold text-gray-900 mb-2">透明合理價格</h3>
            <p className="text-sm text-gray-600">公開透明收費，絕不亂加價</p>
          </div>
          <div className="text-center bg-white/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="font-semibold text-gray-900 mb-2">線上預約便利</h3>
            <p className="text-sm text-gray-600">24小時線上預約，時間彈性安排</p>
          </div>
          <div className="text-center bg-white/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">👨‍🔬</div>
            <h3 className="font-semibold text-gray-900 mb-2">專業技師團隊</h3>
            <p className="text-sm text-gray-600">經驗豐富技師，技術精湛可靠</p>
          </div>
          <div className="text-center bg-white/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">🌱</div>
            <h3 className="font-semibold text-gray-900 mb-2">環保永續理念</h3>
            <p className="text-sm text-gray-600">使用環保清潔劑，愛護地球環境</p>
          </div>
        </div>
      </section>

      {/* 常見問題 FAQ */}
      <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">常見問題</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
              <h3 className="font-semibold text-gray-900 mb-2">Q: 清洗服務需要多長時間？</h3>
              <p className="text-sm text-gray-600">A: 一般冷氣清洗約1-2小時，洗衣機清洗約1小時，抽油煙機清洗約1.5小時，具體時間依設備狀況而定。</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
              <h3 className="font-semibold text-gray-900 mb-2">Q: 清洗後有保固嗎？</h3>
              <p className="text-sm text-gray-600">A: 是的，我們提供30天保固服務，如有問題可免費重新處理。</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
              <h3 className="font-semibold text-gray-900 mb-2">Q: 需要提前多久預約？</h3>
              <p className="text-sm text-gray-600">A: 建議提前1-3天預約，我們會安排最適合的時間為您服務。</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
              <h3 className="font-semibold text-gray-900 mb-2">Q: 清洗過程會影響日常生活嗎？</h3>
              <p className="text-sm text-gray-600">A: 我們會盡量減少對您日常生活的影響，並在清洗前詳細說明流程。</p>
            </div>
            <div className="bg-pink-50 rounded-lg p-4 border-l-4 border-pink-500">
              <h3 className="font-semibold text-gray-900 mb-2">Q: 使用什麼清潔劑？</h3>
              <p className="text-sm text-gray-600">A: 我們使用日本進口環保清潔劑，對人體和環境無害，效果更佳。</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4 border-l-4 border-indigo-500">
              <h3 className="font-semibold text-gray-900 mb-2">Q: 可以指定技師嗎？</h3>
              <p className="text-sm text-gray-600">A: 可以，我們會盡量安排您指定的技師，但需視排程情況而定。</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
              <h3 className="font-semibold text-gray-900 mb-2">Q: 團購優惠如何計算？</h3>
              <p className="text-sm text-gray-600">A: 同一地址滿3件服務即可享受團購價，可節省200-300元不等。</p>
            </div>
            <div className="bg-teal-50 rounded-lg p-4 border-l-4 border-teal-500">
              <h3 className="font-semibold text-gray-900 mb-2">Q: 清洗後多久可以正常使用？</h3>
              <p className="text-sm text-gray-600">A: 清洗完成後即可正常使用，我們會確保設備完全乾燥。</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
              <h3 className="font-semibold text-gray-900 mb-2">Q: 如果設備有故障怎麼辦？</h3>
              <p className="text-sm text-gray-600">A: 我們會先評估故障原因，如非清洗造成，會協助您聯繫維修服務。</p>
            </div>
            <div className="bg-cyan-50 rounded-lg p-4 border-l-4 border-cyan-500">
              <h3 className="font-semibold text-gray-900 mb-2">Q: 可以開發票嗎？</h3>
              <p className="text-sm text-gray-600">A: 可以，我們提供電子發票，可選擇個人或公司統編。</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 border-l-4 border-emerald-500">
              <h3 className="font-semibold text-gray-900 mb-2">Q: 服務範圍包含哪些地區？</h3>
              <p className="text-sm text-gray-600">A: 目前服務大台北地區，其他地區請來電洽詢。</p>
            </div>
            <div className="bg-rose-50 rounded-lg p-4 border-l-4 border-rose-500">
              <h3 className="font-semibold text-gray-900 mb-2">Q: 如何取消或改期？</h3>
              <p className="text-sm text-gray-600">A: 請提前24小時聯繫客服，我們會協助您重新安排時間。</p>
            </div>
          </div>
        </div>
      </section>

      {/* 團購優惠 */}
      <section className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-8 text-white">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">🎉 團購優惠活動</h2>
          <p className="text-xl mb-6">專業清洗服務滿3件即可享受團購價！</p>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-2xl font-bold">冷氣清洗</div>
              <div className="text-sm opacity-90">原價 $1500 → 團購價 $1300</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-2xl font-bold">洗衣機清洗</div>
              <div className="text-sm opacity-90">原價 $1200 → 團購價 $1000</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-2xl font-bold">抽油煙機清洗</div>
              <div className="text-sm opacity-90">原價 $1000 → 團購價 $800</div>
            </div>
          </div>
          <Link to="/services" className="inline-flex items-center justify-center px-8 py-3 bg-white text-orange-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
            立即查看優惠
          </Link>
        </div>
      </section>

      {/* 聯絡資訊 */}
      <section className="bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold text-center mb-8">聯繫我們</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="text-center bg-white/10 rounded-xl p-6 backdrop-blur-sm">
            <div className="text-3xl mb-4">📞</div>
            <h3 className="font-semibold mb-2">客服專線</h3>
            <p className="text-white/90 mb-2">0800-000-000</p>
            <p className="text-sm text-white/70">24小時客服熱線</p>
          </div>
          <div className="text-center bg-white/10 rounded-xl p-6 backdrop-blur-sm">
            <div className="text-3xl mb-4">📧</div>
            <h3 className="font-semibold mb-2">電子郵件</h3>
            <p className="text-white/90 mb-2">service@942clean.com.tw</p>
            <p className="text-sm text-white/70">24小時內回覆</p>
          </div>
          <div className="text-center bg-white/10 rounded-xl p-6 backdrop-blur-sm">
            <div className="text-3xl mb-4">🕒</div>
            <h3 className="font-semibold mb-2">服務時間</h3>
            <p className="text-white/90 mb-2">週一至週日</p>
            <p className="text-sm text-white/70">8:00-20:00</p>
          </div>
          <div className="text-center bg-white/10 rounded-xl p-6 backdrop-blur-sm">
            <div className="text-3xl mb-4">📍</div>
            <h3 className="font-semibold mb-2">服務範圍</h3>
            <p className="text-white/90 mb-2">大台北地區</p>
            <p className="text-sm text-white/70">其他地區請洽詢</p>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-white/20">
          <div className="grid gap-6 md:grid-cols-3 text-center">
            <div>
              <h4 className="font-semibold mb-3">快速預約</h4>
              <p className="text-sm text-white/80 mb-3">線上預約，快速安排</p>
              <Link to="/services" className="inline-block bg-white text-blue-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                立即預約
              </Link>
            </div>
            <div>
              <h4 className="font-semibold mb-3">LINE客服</h4>
              <p className="text-sm text-white/80 mb-3">加入LINE好友，即時諮詢</p>
              <button className="inline-block bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 transition-colors">
                加入LINE
              </button>
            </div>
            <div>
              <h4 className="font-semibold mb-3">緊急服務</h4>
              <p className="text-sm text-white/80 mb-3">24小時緊急服務專線</p>
              <a href="tel:0800-000-000" className="inline-block bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors">
                緊急聯絡
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function NewAppliances() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">新家電購買</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          正品家電，品質保證，價格實惠，為您的居家生活提供最優質的選擇
        </p>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-green-900 mb-4">🆕 新家電服務</h2>
        <p className="text-green-700 mb-6">
          我們提供各種品牌的新家電，包含冷氣、洗衣機、冰箱、抽油煙機等
        </p>
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="bg-white/50 rounded-lg p-4">
            <div className="text-2xl mb-2">❄️</div>
            <div className="font-semibold text-green-900">冷氣設備</div>
            <div className="text-sm text-green-700">分離式、窗型冷氣</div>
          </div>
          <div className="bg-white/50 rounded-lg p-4">
            <div className="text-2xl mb-2">🧺</div>
            <div className="font-semibold text-green-900">洗衣設備</div>
            <div className="text-sm text-green-700">滾筒、直立式洗衣機</div>
          </div>
          <div className="bg-white/50 rounded-lg p-4">
            <div className="text-2xl mb-2">🍳</div>
            <div className="font-semibold text-green-900">廚房設備</div>
            <div className="text-sm text-green-700">抽油煙機、瓦斯爐</div>
          </div>
        </div>
        <p className="text-sm text-green-600">
          詳細產品資訊和價格請聯繫我們的客服專線，我們會為您提供最適合的選擇
        </p>
      </div>

      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">📞 聯絡我們</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-gray-600 mb-2">客服專線：0800-000-000</p>
            <p className="text-gray-600 mb-2">服務時間：週一至週日 8:00-20:00</p>
            <p className="text-gray-600">電子郵件：service@942clean.com.tw</p>
          </div>
          <div>
            <p className="text-gray-600 mb-2">我們提供：</p>
            <ul className="text-gray-600 text-sm space-y-1">
              <li>• 專業諮詢服務</li>
              <li>• 免費估價</li>
              <li>• 安裝服務</li>
              <li>• 保固服務</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function UsedAppliances() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">二手家電購買</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          精選二手家電，品質檢驗，價格優惠，環保又經濟的選擇
        </p>
      </div>

      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-orange-900 mb-4">🔄 二手家電服務</h2>
        <p className="text-orange-700 mb-6">
          我們嚴格檢驗每一件二手家電，確保品質和安全性，讓您安心使用
        </p>
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="bg-white/50 rounded-lg p-4">
            <div className="text-2xl mb-2">🔍</div>
            <div className="font-semibold text-orange-900">品質檢驗</div>
            <div className="text-sm text-orange-700">專業檢測，品質保證</div>
          </div>
          <div className="bg-white/50 rounded-lg p-4">
            <div className="text-2xl mb-2">💰</div>
            <div className="font-semibold text-orange-900">價格優惠</div>
            <div className="text-sm text-orange-700">比新品便宜30-50%</div>
          </div>
          <div className="bg-white/50 rounded-lg p-4">
            <div className="text-2xl mb-2">🌱</div>
            <div className="font-semibold text-orange-900">環保選擇</div>
            <div className="text-sm text-orange-700">減少浪費，愛護地球</div>
          </div>
        </div>
        <p className="text-sm text-orange-600">
          二手家電庫存會定期更新，請聯繫我們了解最新可用的商品
        </p>
      </div>

      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">📋 二手家電流程</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-xl">1</span>
            </div>
            <p className="text-sm font-medium text-gray-900">收購檢驗</p>
            <p className="text-xs text-gray-600">專業檢測品質</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-xl">2</span>
            </div>
            <p className="text-sm font-medium text-gray-900">清潔保養</p>
            <p className="text-xs text-gray-600">深度清潔消毒</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-xl">3</span>
            </div>
            <p className="text-sm font-medium text-gray-900">功能測試</p>
            <p className="text-xs text-gray-600">確保正常運作</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-xl">4</span>
            </div>
            <p className="text-sm font-medium text-gray-900">保固服務</p>
            <p className="text-xs text-gray-600">提供保固保障</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Cleaning() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">居家消毒清潔</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          專業消毒清潔，守護家人健康，為您的居家環境提供最安全的保護
        </p>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-purple-900 mb-4">🧼 居家清潔服務</h2>
        <p className="text-purple-700 mb-6">
          採用專業消毒設備和環保清潔劑，徹底清除細菌病毒，讓您的居家環境更加安全健康
        </p>
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="bg-white/50 rounded-lg p-4">
            <div className="text-2xl mb-2">🦠</div>
            <div className="font-semibold text-purple-900">病毒消毒</div>
            <div className="text-sm text-purple-700">99.9%病毒清除率</div>
          </div>
          <div className="bg-white/50 rounded-lg p-4">
            <div className="text-2xl mb-2">🌿</div>
            <div className="font-semibold text-purple-900">環保清潔</div>
            <div className="text-sm text-purple-700">無毒無害清潔劑</div>
          </div>
          <div className="bg-white/50 rounded-lg p-4">
            <div className="text-2xl mb-2">📱</div>
            <div className="font-semibold text-purple-900">預約服務</div>
            <div className="text-sm text-purple-700">彈性時間安排</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🏠 室內清潔服務</h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              客廳、臥室深度清潔
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              廚房油污清除
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              浴室除菌消毒
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              地毯深度清潔
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              窗戶玻璃清潔
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🦠 消毒服務項目</h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              空氣消毒淨化
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              表面消毒處理
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              空調系統消毒
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              排水管消毒
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              寵物區域消毒
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">💡 為什麼選擇我們的清潔服務？</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="text-center">
            <div className="text-3xl mb-2">🔬</div>
            <h4 className="font-medium text-gray-900 mb-1">專業設備</h4>
            <p className="text-xs text-gray-600">使用專業清潔設備</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🧪</div>
            <h4 className="font-medium text-gray-900 mb-1">環保清潔劑</h4>
            <p className="text-xs text-gray-600">無毒無害配方</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">👨‍🔬</div>
            <h4 className="font-medium text-gray-900 mb-1">專業團隊</h4>
            <p className="text-xs text-gray-600">經驗豐富清潔師</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">📋</div>
            <h4 className="font-medium text-gray-900 mb-1">服務報告</h4>
            <p className="text-xs text-gray-600">詳細清潔記錄</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Page({ title }: { title: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">內容建置中…</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<ProductsPage />} />
          <Route path="/new-appliances" element={<NewAppliances />} />
          <Route path="/used-appliances" element={<UsedAppliances />} />
          <Route path="/cleaning" element={<Cleaning />} />
          <Route path="/account" element={<Page title="會員中心" />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
