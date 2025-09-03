import { useEffect, useMemo, useState } from 'react'
import { loadAdapters, useAuth } from '../../adapters'
import { useLocation, Link } from 'react-router-dom'
import { can } from '../../utils/permissions'
import { supabase } from '../../utils/supabase'
import PublicHeader from '../components/PublicHeader'
import { siteCMS } from '../../adapters/supabase/site_cms'

type Product = {
  id: string
  name: string
  description?: string
  content?: string
  imageUrls: string[]
  unitPrice: number
  categoryId?: string
  modeCode?: string
  defaultQuantity?: number
  published?: boolean
  storeSort?: number
}

type Category = { id: string; name: string; sortOrder?: number }

export default function ShopPage() {
  const loc = useLocation()
  const [rows, setRows] = useState<Product[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [adapters, setAdapters] = useState<any>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<Product>>({})
  const [adminMode, setAdminMode] = useState(false)

  type CartItem = { productId: string; name: string; price: number; quantity: number; modeCode?: string }
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const totalQty = useMemo(()=> cart.reduce((s,it)=>s+it.quantity,0), [cart])
  // 產品快取映射
  const productMap = useMemo(()=>{
    const m: Record<string, any> = {}
    for (const p of rows) m[p.id] = p
    return m
  }, [rows])
  // 計算團購價是否生效
  const getEffectivePrice = (productId: string, qty: number): number => {
    const p = productMap[productId]
    if (!p) return 0
    if (p.groupPrice && p.groupMinQty && qty >= p.groupMinQty) return Number(p.groupPrice) || Number(p.unitPrice) || 0
    return Number(p.unitPrice) || 0
  }
  const originalTotal = useMemo(()=> cart.reduce((s,it)=>{
    const p = productMap[it.productId]
    const unit = p?.unitPrice ?? it.price
    return s + unit * it.quantity
  }, 0), [cart, productMap])
  const totalAmount = useMemo(()=> cart.reduce((s,it)=>{
    const eff = getEffectivePrice(it.productId, it.quantity)
    return s + eff * it.quantity
  }, 0), [cart, productMap])
  const totalSavings = Math.max(0, originalTotal - totalAmount)

  const [checkout, setCheckout] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    preferredDate: '',
    preferredTimeStart: '',
    preferredTimeEnd: ''
  })
  const [placing, setPlacing] = useState(false)
  const [hero, setHero] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const userRaw = (()=>{ try{ return JSON.parse(localStorage.getItem('supabase-auth-user')||'null') }catch{return null} })()
  const isEditor = userRaw?.role==='admin' || userRaw?.role==='support'
  const [cmsMode, setCmsMode] = useState(false)
  const [editingHero, setEditingHero] = useState<any|null>(null)
  const [editingSettings, setEditingSettings] = useState<any|null>(null)

  useEffect(() => {
    (async () => {
      try {
        // 強制雲端
        const a = await loadAdapters()
        setAdapters(a)
        // 使用雲端身份資訊
        try {
          const auth = await useAuth()
          setCurrentUser(auth.user)
        } catch {}
        const items = await a.productRepo.list()
        const numPublishedTrue = (items || []).filter((p: any) => p.published === true).length
        const filtered = numPublishedTrue > 0 ? (items || []).filter((p: any) => p.published === true) : (items || [])
        setRows(filtered)
        try {
          const meta = await import('../../adapters/supabase/product_meta')
          const list = await meta.productMeta.listCategories(true)
          setCats(list as any)
        } catch {}

        // 讀取 CMS：/store 的 Hero 與 site_settings
        try {
          const [h, s] = await Promise.all([
            siteCMS.getHero('store-hero'),
            siteCMS.getSettings()
          ])
          setHero(h)
          setSettings(s)
        } catch {}
      } catch (e: any) {
        setError(e?.message || '載入失敗（雲端）')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const byCategory = useMemo(() => {
    const map: Record<string, Product[]> = {}
    const sortCat = [...cats].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    const sortProd = (arr: Product[]) => arr.sort((a, b) => (a.storeSort || 9999) - (b.storeSort || 9999))
    for (const c of sortCat) map[c.id] = []
    for (const p of rows) {
      const key = p.categoryId || '__other__'
      if (!map[key]) map[key] = []
      map[key].push(p)
    }
    Object.keys(map).forEach(k => map[k] = sortProd(map[k]))
    return { map, order: sortCat.map(c => c.id) }
  }, [rows, cats])

  const canManage = currentUser ? can(currentUser, 'products.manage') : false

  async function startEdit(p: Product) {
    setEditingId(p.id)
    setDraft({
      id: p.id,
      name: p.name,
      unitPrice: p.unitPrice,
      groupPrice: p.groupPrice,
      groupMinQty: p.groupMinQty,
      defaultQuantity: p.defaultQuantity,
      modeCode: p.modeCode as any,
      published: p.published,
      storeSort: p.storeSort,
      description: p.description,
      content: p.content,
    } as any)
  }

  async function saveEdit() {
    if (!adapters || !editingId) return
    const updated = await adapters.productRepo.upsert({ ...(draft as any) })
    setRows(prev => prev.map(x => x.id === updated.id ? { ...x, ...updated } : x))
    setEditingId(null)
    setDraft({})
  }

  function addToCart(p: Product) {
    // used 唯一件：只能一件，且若已在車中則提示
    if (p.modeCode === 'used') {
      if (cart.some(it => it.productId === p.id)) { alert('此二手商品已在購物車，僅能保留一件'); return }
      setCart(prev => [...prev, { productId: p.id, name: p.name, price: p.unitPrice, quantity: 1, modeCode: p.modeCode }])
      setCartOpen(true)
      return
    }
    // 其它商品：累加數量
    setCart(prev => {
      const idx = prev.findIndex(it => it.productId === p.id)
      if (idx >= 0) {
        const arr = [...prev]
        arr[idx] = { ...arr[idx], quantity: arr[idx].quantity + (p.defaultQuantity || 1) }
        return arr
      }
      return [...prev, { productId: p.id, name: p.name, price: p.unitPrice, quantity: p.defaultQuantity || 1, modeCode: p.modeCode }]
    })
    setCartOpen(true)
  }

  function updateQty(productId: string, q: number) {
    setCart(prev => prev.map(it => it.productId === productId ? { ...it, quantity: Math.max(1, q) } : it))
  }
  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(it => it.productId !== productId))
  }

  async function placeReservation() {
    if (cart.length === 0) { alert('購物車是空的'); return }
    if (!checkout.name || !checkout.phone || !checkout.address) { alert('請填姓名、電話、地址'); return }
    setPlacing(true)
    try {
      const now = new Date().toISOString()
      const { data: ro, error: e1 } = await supabase
        .from('reservation_orders')
        .insert({
          customer_name: checkout.name,
          customer_phone: checkout.phone,
          customer_email: checkout.email,
          customer_address: checkout.address,
          preferred_date: checkout.preferredDate || null,
          preferred_time_start: checkout.preferredTimeStart || null,
          preferred_time_end: checkout.preferredTimeEnd || null,
          status: 'pending',
          channel: 'cart',
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()
      if (e1) throw e1
      const rows = cart.map(it => ({ reservation_id: ro.id, product_id: it.productId, name: it.name, unit_price: it.price, quantity: it.quantity, updated_at: now }))
      const { error: e2 } = await supabase.from('reservation_items').insert(rows)
      if (e2) throw e2
      setCart([])
      setCartOpen(false)
      // 導向結帳成功頁，帶上預約單號 rid
      window.location.href = `/store/success?rid=${encodeURIComponent(ro.id)}`
    } catch (err: any) {
      console.error(err)
      alert('建立預約失敗：' + (err?.message || '請稍後再試'))
    } finally {
      setPlacing(false)
    }
  }

  if (loading) return <div className="p-6 text-center">載入中...</div>
  if (error) return <div className="p-6 text-center text-rose-600">{error}</div>

  return (
    <div className="space-y-6">
      <PublicHeader />
      {/* 品牌條 */}
      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-card">
        <div className="text-base font-extrabold tracking-wide text-gray-900">日式洗濯 0825 購物站</div>
        <div className="text-xs text-gray-500">線上預約 · 官方直營 · 透明價格</div>
      </div>

      {/* Hero 區（讀取 CMS：slot=store-hero；無資料時 fallback） */}
      {hero ? (
        <section className="relative overflow-hidden rounded-2xl p-0 text-white shadow-card" style={{ backgroundImage: hero.imageUrl?`url(${hero.imageUrl})`:undefined, backgroundSize:'cover', backgroundPosition:'center' }}>
          <div className="relative z-10 bg-black/35 p-6">
            <h1 className="text-2xl font-extrabold tracking-tight">{hero.title || '日式洗濯．專業到你家'}</h1>
            {hero.subtitle && <p className="mt-2 max-w-2xl text-sm text-white/90">{hero.subtitle}</p>}
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <Link to="/services/cleaning" className="rounded-full bg-white/90 px-3 py-1 text-gray-900 hover:bg-white">專業清洗服務</Link>
              <Link to="/services/home" className="rounded-full bg-white/90 px-3 py-1 text-gray-900 hover:bg-white">居家清潔</Link>
              <Link to="/appliances" className="rounded-full bg-white/90 px-3 py-1 text-gray-900 hover:bg-white">家電購買</Link>
              <Link to="/used" className="rounded-full bg-white/90 px-3 py-1 text-gray-900 hover:bg-white">二手服務</Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 p-6 text-white shadow-card">
          <div className="relative z-10">
            <h1 className="text-2xl font-extrabold tracking-tight">日式洗濯．專業到你家</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/90">冷氣洗濯・居家清潔・家電購買・二手服務｜線上預約、透明價格、服務保固、照片存證、雙簽名結案。</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <Link to="/services/cleaning" className="rounded-full bg-white/90 px-3 py-1 text-brand-600 hover:bg-white">專業清洗服務</Link>
              <Link to="/services/home" className="rounded-full bg-white/90 px-3 py-1 text-brand-600 hover:bg-white">居家清潔</Link>
              <Link to="/appliances" className="rounded-full bg-white/90 px-3 py-1 text-brand-600 hover:bg-white">家電購買</Link>
              <Link to="/used" className="rounded-full bg-white/90 px-3 py-1 text-brand-600 hover:bg-white">二手服務</Link>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
        </section>
      )}

      {/* 首頁橫幅（水平捲動） */}
      <section aria-label="首頁橫幅">
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
          {[
            { k:'b1', title:'日式洗濯｜冷氣深層清洗', sub:'高壓深洗・藥水防護・完整覆蓋保護', href:'#svc', cls:'from-emerald-500 to-teal-500' },
            { k:'b2', title:'居家清潔｜安心到家', sub:'裝修後/定期清潔・到府服務', href:'#home', cls:'from-sky-500 to-cyan-500' },
            { k:'b3', title:'家電購買｜嚴選品牌', sub:'到府安裝・原廠保固', href:'#new', cls:'from-amber-500 to-orange-500' },
            { k:'b4', title:'二手家電｜嚴修認證', sub:'唯一件・來源透明・功能保固', href:'#used', cls:'from-rose-500 to-pink-500' },
          ].map(b => (
            <a key={b.k} href={b.href} className={`min-w-[280px] flex-1 snap-start rounded-2xl bg-gradient-to-r ${b.cls} p-4 text-white shadow-card`}> 
              <div className="text-lg font-extrabold">{b.title}</div>
              <div className="mt-1 text-sm text-white/90">{b.sub}</div>
            </a>
          ))}
        </div>
      </section>

      {/* 四大服務導覽（錨點） */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { id:'svc', name:'專業清洗服務', desc:'冷氣/洗衣機/油煙機', icon:'🧼' },
          { id:'home', name:'居家清潔', desc:'居家/裝修後/消毒', icon:'🏠' },
          { id:'new', name:'家電購買', desc:'嚴選品牌/到府安裝', icon:'🛒' },
          { id:'used', name:'二手服務', desc:'檢修/收購/唯一件', icon:'♻️' },
        ].map(s => (
          <a key={s.id} href={`#${s.id}`} className="rounded-2xl border bg-white p-4 shadow-card hover:shadow-lg transition-shadow">
            <div className="text-2xl">{s.icon}</div>
            <div className="mt-1 font-semibold text-gray-900">{s.name}</div>
            <div className="text-xs text-gray-600">{s.desc}</div>
          </a>
        ))}
      </section>

      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          <button onClick={()=>setCartOpen(true)} className="rounded-full bg-gray-900 px-3 py-1 text-white text-sm">購物車（{totalQty}）</button>
          {canManage && (
            <label className="ml-2 inline-flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={adminMode} onChange={e=>setAdminMode(e.target.checked)} /> 管理模式
            </label>
          )}
          {isEditor && (
            <label className="ml-2 inline-flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={cmsMode} onChange={e=>setCmsMode(e.target.checked)} /> CMS 管理
            </label>
          )}
        </div>
      </div>
      {byCategory.order.map(catId => {
        const cat = cats.find(c => c.id === catId)
        const list = byCategory.map[catId] || []
        if (list.length === 0) return null
        return (
          <section key={catId} id={(cat?.name||'').includes('清洗')?'svc':(cat?.name||'').includes('居家')?'home':(cat?.name||'').includes('二手')?'used':(cat?.name||'').includes('購買')?'new':undefined}>
            <h2 className="mb-2 text-lg font-semibold">{cat?.name || '未分類'}</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {list.map(p => (
                <div key={p.id} className="overflow-hidden rounded-xl border bg-white shadow-card">
                  {p.imageUrls?.[0] && (
                    <img src={p.imageUrls[0]} className="h-40 w-full object-cover" />
                  )}
                  <div className="space-y-2 p-3">
                    <div className="truncate text-base font-semibold">{p.name}</div>
                    {p.description && <div className="line-clamp-2 text-sm text-gray-600">{p.description}</div>}
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-brand-600">${p.unitPrice}</div>
                      <div className="flex items-center gap-2">
                        {p.modeCode === 'used' && (
                          <span className="rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-700">唯一件</span>
                        )}
                        <button onClick={()=>addToCart(p)} className="rounded bg-brand-500 px-3 py-1 text-white">加入</button>
                      </div>
                    </div>
                    {/* 團購提示 */}
                    {p.groupPrice && p.groupMinQty && p.groupMinQty > 1 && (
                      <div className="text-xs text-gray-600">
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">團 ${p.groupPrice}｜滿 {p.groupMinQty}</span>
                        {(() => {
                          const inCart = cart.find(it => it.productId === p.id)?.quantity || 0
                          if (inCart >= p.groupMinQty!) return <span className="ml-2 text-emerald-700">已享團購價</span>
                          const diff = (p.groupMinQty as number) - inCart
                          return <span className="ml-2">再 {diff} 件享團購價</span>
                        })()}
                      </div>
                    )}
                    {canManage && adminMode && (
                      <div className="pt-2 border-t mt-2">
                        {editingId === p.id ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <input className="rounded border px-2 py-1 text-sm" value={draft.name || ''} onChange={e=>setDraft(d=>({...d, name: e.target.value}))} placeholder="名稱" />
                              <input className="rounded border px-2 py-1 text-sm" type="number" value={draft.unitPrice as any || ''} onChange={e=>setDraft(d=>({...d, unitPrice: Number(e.target.value||0)}))} placeholder="售價" />
                              <input className="rounded border px-2 py-1 text-sm" type="number" value={draft.groupPrice as any || ''} onChange={e=>setDraft(d=>({...d, groupPrice: Number(e.target.value||0)}))} placeholder="團購價" />
                              <input className="rounded border px-2 py-1 text-sm" type="number" value={draft.groupMinQty as any || ''} onChange={e=>setDraft(d=>({...d, groupMinQty: Number(e.target.value||0)}))} placeholder="團購門檻" />
                              <select className="rounded border px-2 py-1 text-sm" value={(draft.modeCode as any) || ''} onChange={e=>setDraft(d=>({...d, modeCode: e.target.value as any}))}>
                                <option value="">模式</option>
                                <option value="svc">svc 服務不扣庫</option>
                                <option value="home">home 居家不扣庫</option>
                                <option value="new">new 新品不扣庫</option>
                                <option value="used">used 二手唯一件</option>
                              </select>
                              <input className="rounded border px-2 py-1 text-sm" type="number" value={draft.defaultQuantity as any || 1} onChange={e=>setDraft(d=>({...d, defaultQuantity: Number(e.target.value||1)}))} placeholder="預設數量" />
                              <input className="rounded border px-2 py-1 text-sm" type="number" value={draft.storeSort as any || 0} onChange={e=>setDraft(d=>({...d, storeSort: Number(e.target.value||0)}))} placeholder="排序" />
                            </div>
                            <label className="flex items-center gap-2 text-xs text-gray-600">
                              <input type="checkbox" checked={!!draft.published} onChange={e=>setDraft(d=>({...d, published:e.target.checked}))} /> 上架到購物站
                            </label>
                            <div className="flex items-center gap-2">
                              <button onClick={saveEdit} className="rounded bg-emerald-600 px-3 py-1 text-white text-sm">儲存</button>
                              <button onClick={()=>{setEditingId(null); setDraft({})}} className="rounded bg-gray-200 px-3 py-1 text-sm">取消</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end">
                            <button onClick={()=>startEdit(p)} className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">編輯</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {/* 其他未分類 */}
      {(() => {
        const others = byCategory.map['__other__'] || []
        if (others.length === 0) return null
        return (
          <section>
            <h2 className="mb-2 text-lg font-semibold">其它</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {others.map(p => (
                <div key={p.id} className="overflow-hidden rounded-xl border bg-white shadow-card">
                  {p.imageUrls?.[0] && (
                    <img src={p.imageUrls[0]} className="h-40 w-full object-cover" />
                  )}
                  <div className="space-y-2 p-3">
                    <div className="truncate text-base font-semibold">{p.name}</div>
                    {p.description && <div className="line-clamp-2 text-sm text-gray-600">{p.description}</div>}
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-brand-600">${p.unitPrice}</div>
                      <button onClick={()=>addToCart(p)} className="rounded bg-brand-500 px-3 py-1 text-white">加入</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })()}

      {/* 聯繫我們（讀取 site_settings） */}
      <section className="rounded-2xl border bg-white p-4 shadow-card">
        <h2 className="mb-2 text-lg font-semibold">聯繫我們</h2>
        <div className="grid gap-2 text-sm md:grid-cols-3">
          <a href={settings?.phone?`tel:${settings.phone}`:'#'} className="rounded-lg bg-gray-100 px-3 py-2">電話：{settings?.phone || '—'}</a>
          <a href={settings?.email?`mailto:${settings.email}`:'#'} className="rounded-lg bg-gray-100 px-3 py-2">Email：{settings?.email || '—'}</a>
          <a href={settings?.lineUrl || '#'} target="_blank" rel="noreferrer" className="rounded-lg bg-gray-100 px-3 py-2">LINE：{settings?.lineUrl ? '前往官方 LINE' : '—'}</a>
        </div>
      </section>

      {/* CMS 管理（admin/support 可見）：編輯 store-hero 與 site_settings */}
      {isEditor && cmsMode && (
        <section className="rounded-2xl border bg-white p-4 shadow-card">
          <div className="mb-2 text-lg font-semibold">購物站 CMS 管理</div>
          <div className="grid gap-4 md:grid-cols-2">
            {/* store-hero 編輯 */}
            <div className="rounded border p-3">
              <div className="mb-1 font-medium">Store Hero（slot=store-hero）</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <input className="rounded border px-2 py-1" placeholder="標題" value={(editingHero??hero)?.title||''} onChange={e=>setEditingHero({ ...(editingHero??hero??{ slot:'store-hero' }), title:e.target.value })} />
                <input className="rounded border px-2 py-1" placeholder="副標" value={(editingHero??hero)?.subtitle||''} onChange={e=>setEditingHero({ ...(editingHero??hero??{ slot:'store-hero' }), subtitle:e.target.value })} />
                <input className="col-span-2 rounded border px-2 py-1" placeholder="圖片網址（可留空）" value={(editingHero??hero)?.imageUrl||''} onChange={e=>setEditingHero({ ...(editingHero??hero??{ slot:'store-hero' }), imageUrl:e.target.value })} />
              </div>
              <div className="mt-2 text-right">
                <button onClick={async()=>{ try{ const saved = await siteCMS.upsertBanner({ id: hero?.id, slot:'store-hero', title:(editingHero??hero)?.title, subtitle:(editingHero??hero)?.subtitle, imageUrl:(editingHero??hero)?.imageUrl, sortOrder:0, active:true }); setHero(saved); setEditingHero(null) } catch(e:any){ alert(e?.message||'儲存失敗') } }} className="rounded bg-brand-500 px-3 py-1 text-sm text-white">儲存 Hero</button>
              </div>
            </div>

            {/* site_settings 編輯 */}
            <div className="rounded border p-3">
              <div className="mb-1 font-medium">聯絡設定（site_settings）</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <input className="rounded border px-2 py-1" placeholder="品牌色 #7C3AED" value={(editingSettings??settings)?.brandColor||''} onChange={e=>setEditingSettings({ ...(editingSettings??settings??{ id:'default' }), brandColor:e.target.value })} />
                <input className="rounded border px-2 py-1" placeholder="電話" value={(editingSettings??settings)?.phone||''} onChange={e=>setEditingSettings({ ...(editingSettings??settings??{ id:'default' }), phone:e.target.value })} />
                <input className="rounded border px-2 py-1" placeholder="Email" value={(editingSettings??settings)?.email||''} onChange={e=>setEditingSettings({ ...(editingSettings??settings??{ id:'default' }), email:e.target.value })} />
                <input className="rounded border px-2 py-1" placeholder="LINE 連結" value={(editingSettings??settings)?.lineUrl||''} onChange={e=>setEditingSettings({ ...(editingSettings??settings??{ id:'default' }), lineUrl:e.target.value })} />
              </div>
              <div className="mt-2 text-right">
                <button onClick={async()=>{ try{ const saved = await siteCMS.updateSettings(editingSettings??settings??{}); setSettings(saved); setEditingSettings(null) } catch(e:any){ alert(e?.message||'儲存失敗') } }} className="rounded bg-brand-500 px-3 py-1 text-sm text-white">儲存設定</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 購物車抽屜 */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/30">
          <div className="h-[85vh] w-full max-w-md rounded-t-2xl bg-white p-4 shadow-card overflow-auto">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-lg font-semibold">購物車</div>
              <button onClick={()=>setCartOpen(false)} className="rounded bg-gray-100 px-3 py-1">關閉</button>
            </div>
            {cart.length === 0 ? (
              <div className="py-10 text-center text-gray-500">購物車是空的</div>
            ) : (
              <div className="space-y-3">
                {cart.map(it => {
                  const p = productMap[it.productId]
                  const unit = p?.unitPrice ?? it.price
                  const eff = getEffectivePrice(it.productId, it.quantity)
                  const lineOrig = unit * it.quantity
                  const lineNow = eff * it.quantity
                  const saved = Math.max(0, lineOrig - lineNow)
                  const groupOn = eff < unit
                  return (
                    <div key={it.productId} className="rounded border p-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{it.name}</div>
                          {it.modeCode === 'used' && <div className="text-xs text-rose-600">唯一件 × 1</div>}
                          {!it.modeCode || it.modeCode!=='used' ? (
                            <div className="text-xs text-gray-600">
                              單價：{groupOn ? (<><span className="line-through mr-1 text-gray-400">${unit}</span><span className="text-emerald-700">${eff}</span></>) : (<span>${unit}</span>)} × {it.quantity}
                              {groupOn && saved>0 && <span className="ml-2 text-emerald-700">省 ${saved}</span>}
                            </div>
                          ) : null}
                        </div>
                        <div className="text-sm font-semibold">${lineNow}</div>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-sm">
                        {it.modeCode === 'used' ? (
                          <div className="text-gray-500">固定數量：1</div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button onClick={()=>updateQty(it.productId, it.quantity - 1)} className="rounded bg-gray-100 px-2">-</button>
                            <input className="w-14 rounded border px-2 py-1 text-right" type="number" value={it.quantity} onChange={e=>updateQty(it.productId, Number(e.target.value||1))} />
                            <button onClick={()=>updateQty(it.productId, it.quantity + 1)} className="rounded bg-gray-100 px-2">+</button>
                          </div>
                        )}
                        <button onClick={()=>removeFromCart(it.productId)} className="rounded bg-red-100 px-2 py-1 text-red-600">移除</button>
                      </div>
                    </div>
                  )
                })}
                <div className="border-t pt-2 text-right text-base">合計：<span className="font-semibold">${totalAmount}</span></div>
                {totalSavings>0 && <div className="text-right text-sm text-emerald-700">本次共省：${totalSavings}</div>}
                <div className="text-right text-sm text-gray-700">預估會員可得積分：{Math.floor(totalAmount/100)} 點</div>
              </div>
            )}
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input className="rounded border px-2 py-1" placeholder="姓名*" value={checkout.name} onChange={e=>setCheckout({...checkout, name: e.target.value})} />
                <input className="rounded border px-2 py-1" placeholder="手機*" value={checkout.phone} onChange={e=>setCheckout({...checkout, phone: e.target.value})} />
              </div>
              <input className="w-full rounded border px-2 py-1" placeholder="Email（選填）" value={checkout.email} onChange={e=>setCheckout({...checkout, email: e.target.value})} />
              <textarea className="w-full rounded border px-2 py-1" rows={2} placeholder="服務地址*" value={checkout.address} onChange={e=>setCheckout({...checkout, address: e.target.value})} />
              <div className="grid grid-cols-3 gap-2">
                <input type="date" className="rounded border px-2 py-1" value={checkout.preferredDate} onChange={e=>setCheckout({...checkout, preferredDate: e.target.value})} />
                <input type="time" className="rounded border px-2 py-1" value={checkout.preferredTimeStart} onChange={e=>setCheckout({...checkout, preferredTimeStart: e.target.value})} />
                <input type="time" className="rounded border px-2 py-1" value={checkout.preferredTimeEnd} onChange={e=>setCheckout({...checkout, preferredTimeEnd: e.target.value})} />
              </div>
              <button disabled={placing || cart.length===0} onClick={placeReservation} className={`w-full rounded px-3 py-2 text-white ${placing||cart.length===0?'bg-gray-400':'bg-brand-500'}`}>{placing?'送出中…':'送出預約'}</button>
              <div className="text-center text-xs text-gray-500">送出後客服會與您確認時間，預約單轉正式單後會有訂單編號。</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



