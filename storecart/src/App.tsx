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
      {/* 主橫幅 */}
      <section className="relative rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-8 text-white shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            日式洗濯・專業服務
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-6 max-w-3xl">
            找日式洗濯，因為我們更細膩、更專業、更守承諾。冷氣/洗衣機/抽油煙機/水塔/水管，專業清洗與售後服務，一站搞定。
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/services" className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
              立即預約服務
            </Link>
            <Link to="/cart" className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-blue-600 transition-colors">
              前往購物車
            </Link>
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

      {/* 為什麼選擇我們 */}
      <section className="bg-gray-50 rounded-2xl p-8">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">為什麼選擇日式洗濯？</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="text-center">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="font-semibold text-gray-900 mb-2">10年經驗</h3>
            <p className="text-sm text-gray-600">專業團隊，豐富經驗</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="font-semibold text-gray-900 mb-2">5000+客戶</h3>
            <p className="text-sm text-gray-600">服務過無數滿意客戶</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">⭐</div>
            <h3 className="font-semibold text-gray-900 mb-2">4.9星評價</h3>
            <p className="text-sm text-gray-600">客戶一致好評推薦</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">🕒</div>
            <h3 className="font-semibold text-gray-900 mb-2">24小時服務</h3>
            <p className="text-sm text-gray-600">緊急服務隨時待命</p>
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
      <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">聯絡我們</h2>
        <div className="grid gap-6 md:grid-cols-3 text-center">
          <div>
            <div className="text-2xl mb-2">📞</div>
            <h3 className="font-semibold text-gray-900 mb-2">客服專線</h3>
            <p className="text-gray-600">0800-000-000</p>
          </div>
          <div>
            <div className="text-2xl mb-2">📧</div>
            <h3 className="font-semibold text-gray-900 mb-2">電子郵件</h3>
            <p className="text-gray-600">service@942clean.com.tw</p>
          </div>
          <div>
            <div className="text-2xl mb-2">🕒</div>
            <h3 className="font-semibold text-gray-900 mb-2">服務時間</h3>
            <p className="text-gray-600">週一至週日 8:00-20:00</p>
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
