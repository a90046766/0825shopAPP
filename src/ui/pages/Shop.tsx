import { useEffect, useMemo, useState } from 'react'
import { loadAdapters } from '../../adapters'

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
  const [rows, setRows] = useState<Product[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const a = await loadAdapters()
        const items = await a.productRepo.list()
        // 若資料含有 published 欄位，才套用上架過濾；否則顯示全部（相容舊資料）
        const hasPublished = (items || []).some((p: any) => typeof p.published !== 'undefined')
        const filtered = hasPublished ? (items || []).filter((p: any) => p.published === true) : (items || [])
        setRows(filtered)
        try {
          const meta = await import('../../adapters/supabase/product_meta')
          const list = await meta.productMeta.listCategories(true)
          setCats(list as any)
        } catch {}
      } catch (e: any) {
        setError(e?.message || '載入失敗')
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

  if (loading) return <div className="p-6 text-center">載入中...</div>
  if (error) return <div className="p-6 text-center text-rose-600">{error}</div>

  return (
    <div className="space-y-6">
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
                      <button className="rounded bg-brand-500 px-3 py-1 text-white">加入</button>
                    </div>
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
                      <button className="rounded bg-brand-500 px-3 py-1 text-white">加入</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })()}
    </div>
  )
}



