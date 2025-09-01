import { useEffect, useMemo, useState } from 'react'
import { loadAdapters, useAuth } from '../../adapters'
import { useLocation } from 'react-router-dom'
import { can } from '../../utils/permissions'
import { supabase } from '../../utils/supabase'

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
  const totalAmount = useMemo(()=> cart.reduce((s,it)=>s+it.quantity*it.price,0), [cart])

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
      alert('預約已送出！我們將盡快與您聯絡確認時間。單號：' + ro.id)
      setCartOpen(false)
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
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          <button onClick={()=>setCartOpen(true)} className="rounded-full bg-gray-900 px-3 py-1 text-white text-sm">購物車（{totalQty}）</button>
          {canManage && (
            <label className="ml-2 inline-flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={adminMode} onChange={e=>setAdminMode(e.target.checked)} /> 管理模式
            </label>
          )}
        </div>
      </div>
      {byCategory.order.map(catId => {
        const cat = cats.find(c => c.id === catId)
        const list = byCategory.map[catId] || []
        if (list.length === 0) return null
        return (
          <section key={catId}>
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
                      <div className="text-brand-600 font-semibold">${p.unitPrice}</div>
                      <div className="flex items-center gap-2">
                        {p.modeCode === 'used' && (
                          <span className="rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-700">唯一件</span>
                        )}
                        <button onClick={()=>addToCart(p)} className="rounded bg-brand-500 px-3 py-1 text-white">加入</button>
                      </div>
                    </div>
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
                              <input type="checkbox" checked={!!draft.published} onChange={e=>setDraft(d=>({...d, published: e.target.checked}))} /> 上架到購物站
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
                      <div className="text-brand-600 font-semibold">${p.unitPrice}</div>
                      <button onClick={()=>addToCart(p)} className="rounded bg-brand-500 px-3 py-1 text-white">加入</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })()}

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
                {cart.map(it => (
                  <div key={it.productId} className="rounded border p-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{it.name}</div>
                        {it.modeCode === 'used' && <div className="text-xs text-rose-600">唯一件 × 1</div>}
                      </div>
                      <div className="text-sm font-semibold">${it.price * it.quantity}</div>
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
                ))}
                <div className="border-t pt-2 text-right text-base">合計：<span className="font-semibold">${totalAmount}</span></div>
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



