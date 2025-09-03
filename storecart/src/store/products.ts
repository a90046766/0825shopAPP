import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Product {
  id: string
  name: string
  description?: string
  price: number
  originalPrice?: number
  groupBuyPrice?: number // 團購價
  category: string
  subcategory?: string
  image?: string
  content?: string
  region?: string
  defaultQuantity: number
  safeStock: number
  currentStock: number
  visible_in_cart: boolean
  // 銷售模式：svc(服務)/home(居家)/new(新品)/used(二手)
  modeCode?: 'svc' | 'home' | 'new' | 'used'
  created_at: string
  updated_at: string
}

export interface ProductCategory {
  id: string
  name: string
  description?: string
  sort_order: number
  active: boolean
}

interface ProductsState {
  products: Product[]
  categories: ProductCategory[]
  loading: boolean
  error: string | null
  
  // 產品操作
  setProducts: (products: Product[]) => void
  addProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<Product>
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  
  // 分類操作
  setCategories: (categories: ProductCategory[]) => void
  addCategory: (category: Omit<ProductCategory, 'id'>) => Promise<ProductCategory>
  updateCategory: (id: string, updates: Partial<ProductCategory>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  
  // 搜尋和篩選
  getProductsByCategory: (category: string) => Product[]
  searchProducts: (query: string) => Product[]
  getLowStockProducts: () => Product[]
  
  // 同步
  syncWithSupabase: () => Promise<void>
  loadFromSupabase: () => Promise<void>
}

export const useProductsStore = create<ProductsState>()(
  persist(
    (set, get) => ({
      products: [],
      categories: [],
      loading: false,
      error: null,

      setProducts: (products) => set({ products }),
      
      addProduct: async (productData) => {
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const product: Product = {
          ...productData,
          id,
          created_at: now,
          updated_at: now,
        }
        
        set((state) => ({
          products: [product, ...state.products]
        }))
        
        // 同步到 Supabase
        try {
          const { getSupabase } = await import('../lib/supabase')
          const supabase = getSupabase()
          if (supabase) {
            const insertRow: any = {
              id: product.id,
              name: product.name,
              description: product.description,
              // DB 欄位：unit_price / group_price
              unit_price: product.price,
              group_price: product.groupBuyPrice,
              category: product.category,
              content: product.content,
              region: product.region,
              default_quantity: product.defaultQuantity,
              safe_stock: product.safeStock,
              visible_in_cart: product.visible_in_cart,
              mode_code: product.modeCode,
              updated_at: product.updated_at,
            }
            if (product.image) insertRow.image_urls = [product.image]
            const { error } = await supabase.from('products').insert(insertRow)
            if (error) throw error
          }
        } catch (error) {
          console.error('Failed to sync product to Supabase:', error)
        }
        
        return product
      },

      updateProduct: async (id, updates) => {
        const updatedProduct = {
          ...updates,
          updated_at: new Date().toISOString()
        }
        
        set((state) => ({
          products: state.products.map(p => 
            p.id === id ? { ...p, ...updatedProduct } : p
          )
        }))
        
        // 同步到 Supabase
        try {
          const { getSupabase } = await import('../lib/supabase')
          const supabase = getSupabase()
          if (supabase) {
            const updateRow: any = {
              name: (updatedProduct as any).name,
              description: (updatedProduct as any).description,
              unit_price: (updatedProduct as any).price,
              group_price: (updatedProduct as any).groupBuyPrice,
              category: (updatedProduct as any).category,
              content: (updatedProduct as any).content,
              region: (updatedProduct as any).region,
              default_quantity: (updatedProduct as any).defaultQuantity,
              safe_stock: (updatedProduct as any).safeStock,
              visible_in_cart: (updatedProduct as any).visible_in_cart,
              mode_code: (updatedProduct as any).modeCode,
              updated_at: (updatedProduct as any).updated_at,
            }
            if ((updatedProduct as any).image) updateRow.image_urls = [(updatedProduct as any).image]
            const { error } = await supabase
              .from('products')
              .update(updateRow)
              .eq('id', id)
            if (error) throw error
          }
        } catch (error) {
          console.error('Failed to sync product update to Supabase:', error)
        }
      },

      deleteProduct: async (id) => {
        set((state) => ({
          products: state.products.filter(p => p.id !== id)
        }))
        
        // 同步到 Supabase
        try {
          const { getSupabase } = await import('../lib/supabase')
          const supabase = getSupabase()
          if (supabase) {
            const { error } = await supabase
              .from('products')
              .delete()
              .eq('id', id)
            if (error) throw error
          }
        } catch (error) {
          console.error('Failed to sync product deletion to Supabase:', error)
        }
      },

      setCategories: (categories) => set({ categories }),
      
      addCategory: async (categoryData) => {
        const id = crypto.randomUUID()
        const category: ProductCategory = {
          ...categoryData,
          id,
        }
        
        set((state) => ({
          categories: [category, ...state.categories]
        }))
        
        // 同步到 Supabase
        try {
          const { getSupabase } = await import('../lib/supabase')
          const supabase = getSupabase()
          if (supabase) {
            const { error } = await supabase.from('product_categories').insert({
              id: category.id,
              name: category.name,
              description: category.description,
              sort_order: category.sort_order,
              active: category.active,
            })
            if (error) throw error
          }
        } catch (error) {
          console.error('Failed to sync category to Supabase:', error)
        }
        
        return category
      },

      updateCategory: async (id, updates) => {
        set((state) => ({
          categories: state.categories.map(c => 
            c.id === id ? { ...c, ...updates } : c
          )
        }))
        
        // 同步到 Supabase
        try {
          const { getSupabase } = await import('../lib/supabase')
          const supabase = getSupabase()
          if (supabase) {
            const { error } = await supabase
              .from('product_categories')
              .update(updates)
              .eq('id', id)
            if (error) throw error
          }
        } catch (error) {
          console.error('Failed to sync category update to Supabase:', error)
        }
      },

      deleteCategory: async (id) => {
        set((state) => ({
          categories: state.categories.filter(c => c.id !== id)
        }))
        
        // 同步到 Supabase
        try {
          const { getSupabase } = await import('../lib/supabase')
          const supabase = getSupabase()
          if (supabase) {
            const { error } = await supabase
              .from('product_categories')
              .delete()
              .eq('id', id)
            if (error) throw error
          }
        } catch (error) {
          console.error('Failed to sync category deletion to Supabase:', error)
        }
      },

      getProductsByCategory: (category) => {
        const { products } = get()
        return products.filter(p => p.category === category && p.visible_in_cart)
      },

      searchProducts: (query) => {
        const { products } = get()
        const lowerQuery = query.toLowerCase()
        return products.filter(p => 
          p.visible_in_cart && (
            p.name.toLowerCase().includes(lowerQuery) ||
            p.description?.toLowerCase().includes(lowerQuery) ||
            p.category.toLowerCase().includes(lowerQuery)
          )
        )
      },

      getLowStockProducts: () => {
        const { products } = get()
        return products.filter(p => p.currentStock <= p.safeStock)
      },

      syncWithSupabase: async () => {
        set({ loading: true, error: null })
        try {
          await get().loadFromSupabase()
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '同步失敗' })
        } finally {
          set({ loading: false })
        }
      },

      loadFromSupabase: async () => {
        const { getSupabase } = await import('../lib/supabase')
        const supabase = getSupabase()
        if (!supabase) return

        // 預設分類（後備）
        const PRESET = [
          { id: 'svc', name: '專業清洗服務', sort_order: 0, active: true },
          { id: 'new', name: '家電購買服務', sort_order: 1, active: true },
          { id: 'used', name: '二手家電服務', sort_order: 2, active: true },
          { id: 'home', name: '居家清潔/消毒服務', sort_order: 3, active: true },
        ]

        // 載入分類（若出錯則使用預設）
        let categories: any[] = []
        try {
          const { data, error } = await supabase
            .from('product_categories')
            .select('id,name,sort_order,active')
          if (error) throw error
          const rows = (data || []) as any[]
          categories = rows.sort((a:any,b:any)=> (a.sort_order??0)-(b.sort_order??0) || String(a.name||'').localeCompare(String(b.name||''),'zh-Hant'))
        } catch {
          categories = PRESET
        }

        // 載入產品
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('*')
          .order('updated_at', { ascending: false })
        
        if (productsError) throw productsError

        // 轉換資料格式
        const formattedProducts: Product[] = (products || []).map((p: any) => {
          const imageFromArray = Array.isArray(p.image_urls) && p.image_urls.length > 0 ? p.image_urls[0] : undefined
          return {
            id: p.id,
            name: p.name,
            description: p.description,
            // 我們的 schema 使用 unit_price/group_price；storecart 使用 price/groupBuyPrice
            price: p.price ?? p.unit_price ?? 0,
            originalPrice: p.original_price ?? undefined,
            groupBuyPrice: p.group_buy_price ?? p.group_price ?? undefined,
            // 分類：先用文字欄位，之後可依 category_id 對應名稱
            category: p.category || '',
            subcategory: p.subcategory,
            image: p.image || imageFromArray,
            content: p.content,
            region: p.region,
            defaultQuantity: p.default_quantity ?? p.defaultQuantity ?? 1,
            safeStock: p.safe_stock ?? 0,
            currentStock: p.current_stock ?? 999,
            visible_in_cart: typeof p.visible_in_cart === 'boolean' ? p.visible_in_cart : true,
            modeCode: p.mode_code ?? undefined,
            created_at: p.created_at ?? new Date().toISOString(),
            updated_at: p.updated_at ?? new Date().toISOString(),
          }
        })

        set({ 
          products: formattedProducts,
          categories: categories || []
        })
      },
    }),
    { 
      name: 'cart-products',
      partialize: (state) => ({ 
        products: state.products,
        categories: state.categories
      })
    },
  ),
)
