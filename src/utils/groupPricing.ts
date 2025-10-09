export type CleaningProduct = {
  id: string
  name: string
  price: number
  groupPrice: number
  groupMinQty: number
  category: 'cleaning'
}

// 與購物車頁面一致的清洗服務定價（團購門檻與團購價）
export const CLEANING_PRODUCTS: CleaningProduct[] = [
  { id: 'ac-split', name: '分離式冷氣清洗', price: 1800, groupPrice: 1600, groupMinQty: 3, category: 'cleaning' },
  { id: 'ac-window', name: '窗型冷氣清洗', price: 1500, groupPrice: 1350, groupMinQty: 3, category: 'cleaning' },
  { id: 'washer-drum', name: '洗衣機清洗（滾筒）', price: 1999, groupPrice: 1799, groupMinQty: 3, category: 'cleaning' },
  { id: 'washer-vertical', name: '洗衣機清洗（直立）', price: 1799, groupPrice: 1619, groupMinQty: 3, category: 'cleaning' },
  { id: 'hood-inverted', name: '倒T型抽油煙機清洗', price: 2200, groupPrice: 2000, groupMinQty: 3, category: 'cleaning' },
  { id: 'hood-traditional', name: '傳統雙渦輪抽油煙機清洗', price: 1800, groupPrice: 1600, groupMinQty: 3, category: 'cleaning' },
  { id: 'fridge-clean', name: '冰箱清洗除臭', price: 1600, groupPrice: 1440, groupMinQty: 3, category: 'cleaning' },
  { id: 'water-heater', name: '熱水器除垢清洗', price: 1400, groupPrice: 1260, groupMinQty: 3, category: 'cleaning' }
]

export function findCleaningProductByName(name: string): CleaningProduct | undefined {
  const n = String(name||'').trim()
  return CLEANING_PRODUCTS.find(p => p.name === n)
}

export function getCleaningGroupContextFromItems(items: Array<{ name?: string; quantity?: number }>) {
  const matched = (items||[]).map(it => findCleaningProductByName(String(it?.name||''))).filter(Boolean) as CleaningProduct[]
  if (matched.length === 0) return { totalQty: 0, minThreshold: 0, active: false }
  const totalQty = (items||[]).reduce((sum, it) => {
    const prod = findCleaningProductByName(String(it?.name||''))
    const qty = Math.max(0, Number(it?.quantity||0)) // 減項不列入門檻
    if (prod && qty>0) return sum + qty
    return sum
  }, 0)
  const minThreshold = matched.reduce((m, p) => Math.min(m, Number(p.groupMinQty||3)), Number(matched[0].groupMinQty||3))
  const active = totalQty >= minThreshold
  return { totalQty, minThreshold, active }
}

export function applyGroupPricingToServiceItems<T extends { name?: string; quantity?: number; unitPrice?: number }>(items: T[]): T[] {
  const ctx = getCleaningGroupContextFromItems(items)
  if (!ctx.active) return items
  return (items||[]).map((it) => {
    const prod = findCleaningProductByName(String(it?.name||''))
    if (!prod) return it
    // 套用團購價於清洗類品項
    const next: any = { ...it }
    next.unitPrice = prod.groupPrice
    return next
  })
}


