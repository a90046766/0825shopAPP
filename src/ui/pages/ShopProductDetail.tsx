import React, { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Plus, Minus } from 'lucide-react'
import { supabase } from '../../utils/supabase'

function getLocalCart(): any[] {
  try { return JSON.parse(localStorage.getItem('shopCart') || '[]') } catch { return [] }
}
function setLocalCart(cart: any[]) {
  try { localStorage.setItem('shopCart', JSON.stringify(cart)) } catch {}
}
function getDetailCache(id: string): any | null {
  try {
    const raw = localStorage.getItem('product-detail:'+id)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}
function setDetailCache(id: string, data: any) {
  try { localStorage.setItem('product-detail:'+id, JSON.stringify(data)) } catch {}
}
function getCurrentUser(): any | null {
  try {
    const s = localStorage.getItem('supabase-auth-user')
    if (s) return JSON.parse(s)
  } catch {}
  try {
    const l = localStorage.getItem('local-auth-user')
    if (l) return JSON.parse(l)
  } catch {}
  return null
}

export default function ShopProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [product, setProduct] = useState<any | null>(null)
  const [related, setRelated] = useState<any[]>([])
  const [activeIdx, setActiveIdx] = useState<number>(0)
  const [cart, setCart] = useState<any[]>(getLocalCart())
  const [addonOn, setAddonOn] = useState<boolean>(false)
  const [addonQty, setAddonQty] = useState<number>(0)
  const user = getCurrentUser()
  const isEditor = user?.role === 'admin' || user?.role === 'support'

  useEffect(() => { setLocalCart(cart) }, [cart])
  useEffect(() => {
    // 切換商品時，重置加購狀態
    setAddonOn(!!(product as any)?.addonConfig?.enabled)
    setAddonQty(0)
  }, [product?.id])

  useEffect(() => {
    const seed = {
      id, name: '商品', description: '', content: '', price: 0,
      groupPrice: null, groupMinQty: null, category: 'cleaning',
      features: [], image: '', images: [], published: true
    }
    // 以歷史/快取預先顯示，減少感知延遲
    try {
      const hist = JSON.parse(localStorage.getItem('shopHistory') || '[]')
      const hit = Array.isArray(hist) ? hist.find((h:any)=> String(h.id)===String(id)) : null
      if (hit) {
        setProduct({ id: hit.id, name: hit.name, price: hit.price, image: hit.image, images: [], description: '', content: '', category: hit.category, features: [], published: true })
      }
    } catch {}
    try {
      const cached = id ? getDetailCache(String(id)) : null
      if (cached) setProduct(cached)
    } catch {}
    const load = async () => {
      if (!id) { setError('缺少商品ID'); setLoading(false); return }
      setLoading(true); setError(null)
      try {
        // 直接查 DB
        let q = supabase
          .from('products')
          .select('id,name,unit_price,group_price,group_min_qty,description,detail_html,content,features,image_urls,head_images,category,mode_code,published,addon_config')
          .eq('id', id)
        if (!isEditor) q = q.eq('published', true)
        let { data, error } = await q.maybeSingle()
        if (error) {
          // 欄位不存在時回退移除 detail_html
          let q2 = supabase
            .from('products')
            .select('id,name,unit_price,group_price,group_min_qty,description,content,features,image_urls,head_images,category,mode_code,published')
            .eq('id', id)
          if (!isEditor) q2 = q2.eq('published', true)
          const r2 = await q2.maybeSingle()
          data = r2.data as any
          error = r2.error as any
          if (error) throw error
        }
        if (!data) { setProduct(seed); setLoading(false); return }
        const mapped = {
          id: String(data.id),
          name: data.name || '商品',
          description: data.description || '',
          content: (data.detail_html ?? data.content) || '',
          price: Number(data.unit_price ?? 0),
          groupPrice: data.group_price ?? null,
          groupMinQty: data.group_min_qty ?? null,
          category: data.mode_code ?? data.category ?? 'cleaning',
          features: Array.isArray(data.features) ? data.features : [],
          image: Array.isArray(data.image_urls) && data.image_urls[0] ? data.image_urls[0] : (Array.isArray((data as any).image) ? (data as any).image[0] : ((data as any).image || '')),
          images: Array.isArray(data.image_urls) ? data.image_urls : (Array.isArray((data as any).images) ? (data as any).images : []),
          headImages: Array.isArray((data as any).head_images) ? (data as any).head_images : (Array.isArray((data as any).headImages) ? (data as any).headImages : []),
          published: !!data.published,
          addonConfig: (data as any).addon_config || null
        }
        if (!isEditor && mapped.published === false) {
          setError('商品未上架或不存在')
          setProduct(null)
          setLoading(false)
          return
        }
        setProduct(mapped)
        try { setDetailCache(String(mapped.id), mapped) } catch {}
        try { await loadRelated(mapped) } catch {}
      } catch (e: any) {
        setError(e?.message || String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function loadRelated(base: any) {
    if (!base?.category) { setRelated([]); return }
    try {
      let rq = supabase
        .from('products')
        .select('id,name,unit_price,description,image_urls,category,published,updated_at')
        .eq('category', base.category)
        .neq('id', base.id)
        .order('updated_at', { ascending: false })
        .limit(6)
      rq = rq.eq('published', true)
      const { data, error } = await rq
      if (error) throw error
      const mapped = (data || []).map((r:any)=> ({
        id: String(r.id),
        name: r.name || '',
        price: Number(r.unit_price ?? 0),
        description: r.description || '',
        image: Array.isArray(r.image_urls) && r.image_urls[0] ? r.image_urls[0] : ''
      }))
      setRelated(mapped)
    } catch {
      setRelated([])
    }
  }

  const quantityInCart = useMemo(() => {
    if (!product) return 0
    const item = cart.find(i => i.id === product.id)
    return item?.quantity || 0
  }, [cart, product])

  const addToCart = () => {
    if (!product) return
    const addonData = (product as any).addonConfig
    const shouldAddAddon = !!addonOn && addonQty > 0 && addonData && Number(addonData.price) > 0
    setCart(prev => {
      let next = [...prev]
      const idx = next.findIndex(i => i.id === product.id)
      if (idx >= 0) {
        const category = product.category
        const maxByCategory = category === 'new' ? 2 : Infinity
        const cur = next[idx]
        if (cur.quantity < maxByCategory) {
          next[idx] = { ...cur, quantity: cur.quantity + 1 }
        }
      } else {
        next = [{ ...product, quantity: 1 }, ...next]
      }
      if (shouldAddAddon) {
        const addonId = `addon:${product.id}`
        const j = next.findIndex(i => i.id === addonId)
        if (j >= 0) {
          next[j] = { ...next[j], quantity: (next[j].quantity || 0) + addonQty }
        } else {
          next.unshift({ id: addonId, name: `加購 - ${addonData.name}`, price: Number(addonData.price), category: 'addon', quantity: addonQty })
        }
      }
      return next
    })
  }

  const decFromCart = () => {
    if (!product) return
    const exists = cart.find(i => i.id === product.id)
    if (!exists) return
    if (exists.quantity <= 1) {
      setCart(cart.filter(i => i.id !== product.id))
    } else {
      setCart(cart.map(i => i.id === product.id ? { ...i, quantity: i.quantity - 1 } : i))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
          <button onClick={()=> window.history.back()} className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> 返回
          </button>
          <Link to="/store/products" className="text-gray-600 hover:text-gray-800 text-sm">所有商品</Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {!product && loading && <div className="rounded border p-3 text-gray-600 text-sm">載入中…</div>}
        {error && (
          <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-yellow-800 text-sm">
            {error}
            <div className="mt-2">
              <Link to="/store/products" className="text-blue-600 underline">回到商品列表</Link>
            </div>
          </div>
        )}
        {!!product && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
            {/* 圖片區 */}
            <div className="lg:col-span-6">
              {(() => {
                const gallery: string[] = Array.from(new Set([
                  ...(product.image ? [product.image] : []),
                  ...(Array.isArray(product.images) ? product.images : [])
                ].filter(Boolean)))
                const headStrip: string[] = Array.isArray((product as any).headImages) ? (product as any).headImages : []
                const main = gallery[activeIdx] || gallery[0]
                return (
                  <>
                    {headStrip.length > 0 && (
                      <div className="mb-3 flex gap-2 overflow-x-auto">
                        {headStrip.map((url: string, idx: number) => (
                          <div key={idx} className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border bg-white">
                            <img src={url} alt="head" className="w-full h-full object-cover" loading="lazy" />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="aspect-[4/3] bg-white rounded-2xl overflow-hidden shadow">
                      {main ? (
                        <img src={main} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">無圖片</div>
                      )}
                    </div>
                    {gallery.length > 1 && (
                      <div className="mt-3 grid grid-cols-5 gap-2">
                        {gallery.slice(0,5).map((url:string,idx:number)=> (
                          <button key={idx} onClick={()=> setActiveIdx(idx)} className={`aspect-square rounded overflow-hidden border ${idx===activeIdx? 'border-blue-500':'border-transparent'}`}>
                            <img src={url} alt="thumb" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>

            {/* 資訊區 */}
            <div className="lg:col-span-6">
              <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{product.name}</div>
              <div className="text-gray-600 mb-4 leading-relaxed">{product.description}</div>
              <div className="text-2xl font-extrabold text-blue-600 mb-2">NT$ {Number(product.price||0).toLocaleString()}</div>
              {product.groupPrice && product.groupMinQty && (
                <div className="text-sm text-orange-600 mb-4">團購價：NT$ {product.groupPrice.toLocaleString()} (滿{product.groupMinQty}件)</div>
              )}

              {product.features && product.features.length>0 && (
                <div className="mb-5">
                  <div className="text-sm text-gray-800 font-semibold mb-2">特色</div>
                  <div className="flex flex-wrap gap-2">
                    {product.features.map((f:string, i:number)=> (
                      <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">{f}</span>
                    ))}
                  </div>
                </div>
              )}

            {/* 加購區塊 */}
            {!!(product as any)?.addonConfig?.enabled && Number((product as any).addonConfig?.price) > 0 && !/四方吹/.test(product?.name||'') && (
              <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50/50 p-3">
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input type="checkbox" checked={addonOn} onChange={(e)=> { const on = e.target.checked; setAddonOn(on); if (on && addonQty===0) setAddonQty(1); if (!on) setAddonQty(0) }} />
                  <span>加購：{(product as any).addonConfig?.name} +NT$ {Number((product as any).addonConfig?.price||0).toLocaleString()}</span>
                </label>
                {addonOn && (
                  <div className="mt-2 flex items-center gap-3">
                    <button onClick={()=> setAddonQty(q=> Math.max(0, q-1))} className="rounded bg-white border px-3 py-1 text-gray-700"><Minus className="h-4 w-4" /></button>
                    <div className="min-w-[2rem] text-center font-semibold">{addonQty}</div>
                    <button onClick={()=> setAddonQty(q=> q+1)} className="rounded bg-white border px-3 py-1 text-gray-700"><Plus className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
            )}

              <div className="flex items-center gap-3">
                <button onClick={decFromCart} className="rounded bg-gray-100 px-3 py-2 text-gray-700"><Minus className="h-4 w-4" /></button>
                <div className="min-w-[2rem] text-center font-semibold">{quantityInCart}</div>
                <button onClick={addToCart} className="rounded bg-blue-600 px-4 py-2 text-white inline-flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> 加入購物車
                </button>
                <Link to="/store/cart" className="rounded bg-gray-900 px-4 py-2 text-white">前往結帳</Link>
              </div>
            </div>
          </div>
        )}

        {/* 商品介紹（內容） */}
        {!!product?.content && (
          <div className="mt-10">
            <div className="text-lg font-bold text-gray-900 mb-3">商品介紹</div>
            <div className="rounded-2xl border bg-white p-4 md:p-6 prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: product.content }} />
            </div>
          </div>
        )}

        {/* 相關商品 */}
        {related.length>0 && (
          <div className="mt-10">
            <div className="text-lg font-bold text-gray-900 mb-3">你也許會喜歡</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {related.map((r:any)=> (
                <div key={r.id} className="bg-white rounded-xl border shadow hover:shadow-md transition overflow-hidden cursor-pointer" onClick={()=> navigate(`/store/products/${r.id}`)}>
                  <div className="aspect-square bg-gray-100">
                    {r.image ? <img src={r.image} alt={r.name} className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-semibold text-gray-900 line-clamp-2">{r.name}</div>
                    <div className="text-[11px] text-gray-600">NT$ {r.price.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


