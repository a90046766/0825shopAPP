import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from './products'

export interface CartItem {
  productId: string
  product: Product
  quantity: number
  addedAt: string
}

export interface CartState {
  items: CartItem[]
  loading: boolean
  error: string | null
  discountCode: string // 折扣碼（業務/技師編號）
  
  // 購物車操作
  addToCart: (product: Product, quantity?: number) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  setDiscountCode: (code: string) => void
  
  // 計算
  getTotalItems: () => number
  getTotalPrice: () => number
  getGroupBuyPrice: () => number // 團購價計算
  getFinalPrice: () => number // 最終價格（含折扣）
  getItemQuantity: (productId: string) => number
  getDiscountAmount: () => number // 折扣金額
  
  // 檢查庫存
  checkStock: (productId: string, quantity: number) => boolean
  getAvailableQuantity: (productId: string) => number
  
  // 團購檢查
  getGroupBuyEligibleItems: () => CartItem[] // 符合團購條件的商品
  isGroupBuyEligible: () => boolean // 是否符合團購條件
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      loading: false,
      error: null,
      discountCode: '',

      addToCart: (product, quantity = 1) => {
        const { items } = get()
        const existingItem = items.find(item => item.productId === product.id)
        
        if (existingItem) {
          // 如果商品已存在，增加數量
          const newQuantity = existingItem.quantity + quantity
          if (newQuantity > product.currentStock) {
            set({ error: `庫存不足，最多只能購買 ${product.currentStock} 件` })
            return
          }
          
          set({
            items: items.map(item =>
              item.productId === product.id
                ? { ...item, quantity: newQuantity }
                : item
            ),
            error: null
          })
        } else {
          // 新增商品到購物車
          if (quantity > product.currentStock) {
            set({ error: `庫存不足，最多只能購買 ${product.currentStock} 件` })
            return
          }
          
          const newItem: CartItem = {
            productId: product.id,
            product,
            quantity,
            addedAt: new Date().toISOString()
          }
          
          set({
            items: [...items, newItem],
            error: null
          })
        }
      },

      removeFromCart: (productId) => {
        set({
          items: get().items.filter(item => item.productId !== productId),
          error: null
        })
      },

      updateQuantity: (productId, quantity) => {
        const { items } = get()
        const item = items.find(item => item.productId === productId)
        
        if (!item) return
        
        if (quantity <= 0) {
          get().removeFromCart(productId)
          return
        }
        
        if (quantity > item.product.currentStock) {
          set({ error: `庫存不足，最多只能購買 ${item.product.currentStock} 件` })
          return
        }
        
        set({
          items: items.map(item =>
            item.productId === productId
              ? { ...item, quantity }
              : item
          ),
          error: null
        })
      },

      clearCart: () => {
        set({ items: [], error: null, discountCode: '' })
      },

      setDiscountCode: (code) => {
        set({ discountCode: code.toUpperCase() })
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => {
          return total + (item.product.price * item.quantity)
        }, 0)
      },

      // 團購價計算
      getGroupBuyPrice: () => {
        const { items } = get()
        const groupBuyItems = items.filter(item => item.product.groupBuyPrice)
        
        if (groupBuyItems.length === 0) return 0
        
        const totalGroupBuyQuantity = groupBuyItems.reduce((total, item) => total + item.quantity, 0)
        
        if (totalGroupBuyQuantity >= 3) {
          // 符合團購條件，計算團購價
          return groupBuyItems.reduce((total, item) => {
            const groupBuyPrice = item.product.groupBuyPrice || item.product.price
            return total + (groupBuyPrice * item.quantity)
          }, 0)
        }
        
        return 0 // 不符合團購條件
      },

      // 最終價格計算
      getFinalPrice: () => {
        const totalPrice = get().getTotalPrice()
        const groupBuyPrice = get().getGroupBuyPrice()
        const discountCode = get().discountCode
        
        let finalPrice = groupBuyPrice > 0 ? groupBuyPrice : totalPrice
        
        // 折扣碼優惠（97折）
        if (discountCode && (discountCode.startsWith('SR') || discountCode.startsWith('SE'))) {
          finalPrice = finalPrice * 0.97
        }
        
        return finalPrice
      },

      getDiscountAmount: () => {
        const totalPrice = get().getTotalPrice()
        const finalPrice = get().getFinalPrice()
        return totalPrice - finalPrice
      },

      getItemQuantity: (productId) => {
        const item = get().items.find(item => item.productId === productId)
        return item ? item.quantity : 0
      },

      checkStock: (productId, quantity) => {
        const item = get().items.find(item => item.productId === productId)
        if (!item) return false
        return quantity <= item.product.currentStock
      },

      getAvailableQuantity: (productId) => {
        const item = get().items.find(item => item.productId === productId)
        return item ? item.product.currentStock : 0
      },

      // 團購相關
      getGroupBuyEligibleItems: () => {
        const { items } = get()
        return items.filter(item => item.product.groupBuyPrice)
      },

      isGroupBuyEligible: () => {
        const groupBuyItems = get().getGroupBuyEligibleItems()
        const totalQuantity = groupBuyItems.reduce((total, item) => total + item.quantity, 0)
        return totalQuantity >= 3
      },
    }),
    { 
      name: 'cart-items',
      partialize: (state) => ({ 
        items: state.items,
        discountCode: state.discountCode
      })
    },
  ),
)
