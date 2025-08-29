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
            const { error } = await supabase.from('products').insert({
              id: product.id,
              name: product.name,
              description: product.description,
              price: product.price,
              original_price: product.originalPrice,
              group_buy_price: product.groupBuyPrice,
              category: product.category,
              subcategory: product.subcategory,
              image: product.image,
              content: product.content,
              region: product.region,
              default_quantity: product.defaultQuantity,
              safe_stock: product.safeStock,
              current_stock: product.currentStock,
              visible_in_cart: product.visible_in_cart,
              created_at: product.created_at,
              updated_at: product.updated_at,
            })
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
            const { error } = await supabase
              .from('products')
              .update({
                name: updatedProduct.name,
                description: updatedProduct.description,
                price: updatedProduct.price,
                original_price: updatedProduct.originalPrice,
                group_buy_price: updatedProduct.groupBuyPrice,
                category: updatedProduct.category,
                subcategory: updatedProduct.subcategory,
                image: updatedProduct.image,
                content: updatedProduct.content,
                region: updatedProduct.region,
                default_quantity: updatedProduct.defaultQuantity,
                safe_stock: updatedProduct.safeStock,
                current_stock: updatedProduct.currentStock,
                visible_in_cart: updatedProduct.visible_in_cart,
                updated_at: updatedProduct.updated_at,
              })
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

        // 載入分類
        const { data: categories, error: categoriesError } = await supabase
          .from('product_categories')
          .select('*')
          .order('sort_order', { ascending: true })
        
        if (categoriesError) throw categoriesError

        // 載入產品
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (productsError) throw productsError

        // 轉換資料格式
        const formattedProducts: Product[] = (products || []).map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          originalPrice: p.original_price,
          groupBuyPrice: p.group_buy_price,
          category: p.category,
          subcategory: p.subcategory,
          image: p.image,
          content: p.content,
          region: p.region,
          defaultQuantity: p.default_quantity,
          safeStock: p.safe_stock,
          currentStock: p.current_stock,
          visible_in_cart: p.visible_in_cart,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }))

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
