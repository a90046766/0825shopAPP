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
  const [cart, setCart] = useState<any[]>(getLocalCart())
  const user = getCurrentUser()
  const isEditor = user?.role === 'admin' || user?.role === 'support'

  useEffect(() => { setLocalCart(cart) }, [cart])

  useEffect(() => {
    const seed = {
      id, name: '商品', description: '', content: '', price: 0,
      groupPrice: null, groupMinQty: null, category: 'cleaning',
      features: [], image: '', images: [], published: true
    }
    const load = async () => {
      if (!id) { setError('缺少商品ID'); setLoading(false); return }
      setLoading(true); setError(null)
      try {
        // 先從 Functions 嘗試（若有）
        try {
          const res = await fetch('/api/products-get?id=' + encodeURIComponent(id), { method: 'GET' })
          if (res.ok) {
            const j = await res.json()
            if (j?.ok && j.data) {
              // 非管理者：未上架不可見
              if (!isEditor && j.data && j.data.published === false) {
                setError('商品未上架或不存在');
                setProduct(null);
                setLoading(false);
                return
              }
              setProduct(j.data); setLoading(false); return
            }
          }
        } catch {}
        // 直接查 DB
        let q = supabase
          .from('products')
          .select('id,name,unit_price,group_price,group_min_qty,description,content,features,image_urls,category,mode_code,published')
          .eq('id', id)
        if (!isEditor) q = q.eq('published', true)
        const { data, error } = await q.maybeSingle()
        if (error) throw error
        if (!data) { setProduct(seed); setLoading(false); return }
        const mapped = {
          id: String(data.id),
          name: data.name || '商品',
          description: data.description || '',
          content: data.content || '',
          price: Number(data.unit_price ?? 0),
          groupPrice: data.group_price ?? null,
          groupMinQty: data.group_min_qty ?? null,
          category: data.mode_code ?? data.category ?? 'cleaning',
          features: Array.isArray(data.features) ? data.features : [],
          image: Array.isArray(data.image_urls) && data.image_urls[0] ? data.image_urls[0] : '',
          images: Array.isArray(data.image_urls) ? data.image_urls : [],
          published: !!data.published
        }
        if (!isEditor && mapped.published === false) {
          setError('商品未上架或不存在')
          setProduct(null)
          setLoading(false)
          return
        }
        setProduct(mapped)
      } catch (e: any) {
        setError(e?.message || String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const quantityInCart = useMemo(() => {
    if (!product) return 0
    const item = cart.find(i => i.id === product.id)
    return item?.quantity || 0
  }, [cart, product])

  const addToCart = () => {
    if (!product) return
    const exists = cart.find(i => i.id === product.id)
    if (exists) {
      // 類別規則沿用列表頁
      const maxByCategory = product.category === 'new' ? 2 : Infinity
      if (exists.quantity >= maxByCategory) return
      setCart(cart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
    } else {
      setCart([{ ...product, quantity: 1 }, ...cart])
    }
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
        {loading && <div className="rounded border p-3 text-gray-600 text-sm">載入中…</div>}
        {error && (
          <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-yellow-800 text-sm">
            {error}
            <div className="mt-2">
              <Link to="/store/products" className="text-blue-600 underline">回到商品列表</Link>
            </div>
          </div>
        )}
        {!!product && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
            <div>
              <div className="aspect-[4/3] bg-white rounded-2xl overflow-hidden shadow">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">無圖片</div>
                )}
              </div>
              {Array.isArray(product.images) && product.images.length>1 && (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {product.images.slice(0,5).map((url:string,idx:number)=> (
                    <div key={idx} className="aspect-square bg-gray-100 rounded overflow-hidden">
                      <img src={url} alt="thumb" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{product.name}</div>
              <div className="text-gray-600 mb-4">{product.description}</div>
              <div className="text-2xl font-extrabold text-blue-600 mb-2">NT$ {Number(product.price||0).toLocaleString()}</div>
              {product.groupPrice && product.groupMinQty && (
                <div className="text-sm text-orange-600 mb-3">團購價：NT$ {product.groupPrice.toLocaleString()} (滿{product.groupMinQty}件)</div>
              )}

              {product.features && product.features.length>0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {product.features.slice(0,5).map((f:string, i:number)=> (
                    <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">{f}</span>
                  ))}
                </div>
              )}

              {product.content && (
                <div className="mb-6">
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <div dangerouslySetInnerHTML={{ __html: product.content }} />
                  </div>
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
      </div>
    </div>
  )
}


