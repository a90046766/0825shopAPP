import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from './cart'

export interface OrderItem {
  productId: string
  productName: string
  price: number
  quantity: number
}

export interface Order {
  id: string
  orderNumber?: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  customerAddress: string
  preferredDate?: string
  preferredTimeStart?: string
  preferredTimeEnd?: string
  platform: 'cart' | 'manual' | 'phone'
  referrerCode?: string
  memberId?: string
  serviceItems: OrderItem[]
  assignedTechnicians?: string[]
  signatureTechnician?: string
  signatures?: string[]
  photos?: string[]
  photosBefore?: string[]
  photosAfter?: string[]
  paymentMethod?: string
  paymentStatus: 'pending' | 'paid' | 'refunded'
  pointsUsed?: number
  pointsDeductAmount?: number
  category?: string
  channel?: string
  usedItemId?: string
  workStartedAt?: string
  workCompletedAt?: string
  serviceFinishedAt?: string
  canceledReason?: string
  status: 'pending' | 'confirmed' | 'assigned' | 'in_progress' | 'completed' | 'canceled'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface ReservationOrder {
  id: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  customerAddress: string
  preferredDate?: string
  preferredTimeStart?: string
  preferredTimeEnd?: string
  items: OrderItem[]
  totalAmount: number
  status: 'pending' | 'confirmed' | 'converted' | 'canceled'
  notes?: string
  createdAt: string
  updatedAt: string
}

interface OrdersState {
  orders: Order[]
  reservations: ReservationOrder[]
  loading: boolean
  error: string | null
  
  // 訂單操作
  createOrder: (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Order>
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>
  deleteOrder: (id: string) => Promise<void>
  getOrder: (id: string) => Order | null
  
  // 預約訂單操作
  createReservation: (reservationData: Omit<ReservationOrder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ReservationOrder>
  convertReservationToOrder: (reservationId: string) => Promise<Order>
  updateReservation: (id: string, updates: Partial<ReservationOrder>) => Promise<void>
  deleteReservation: (id: string) => Promise<void>
  
  // 從購物車創建
  createOrderFromCart: (customerInfo: {
    name: string
    phone: string
    email?: string
    address: string
    preferredDate?: string
    preferredTimeStart?: string
    preferredTimeEnd?: string
  }, cartItems: CartItem[]) => Promise<Order>
  
  // 同步
  syncWithSupabase: () => Promise<void>
  loadFromSupabase: () => Promise<void>
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      reservations: [],
      loading: false,
      error: null,

      createOrder: async (orderData) => {
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const order: Order = {
          ...orderData,
          id,
          createdAt: now,
          updatedAt: now,
        }
        
        set((state) => ({
          orders: [order, ...state.orders]
        }))
        
        // 同步到 Supabase
        try {
          const { getSupabase } = await import('../lib/supabase')
          const supabase = getSupabase()
          if (supabase) {
            const { error } = await supabase.from('orders').insert({
              id: order.id,
              order_number: order.orderNumber,
              customer_name: order.customerName,
              customer_phone: order.customerPhone,
              customer_email: order.customerEmail,
              customer_address: order.customerAddress,
              preferred_date: order.preferredDate,
              preferred_time_start: order.preferredTimeStart,
              preferred_time_end: order.preferredTimeEnd,
              platform: order.platform,
              referrer_code: order.referrerCode,
              member_id: order.memberId,
              service_items: order.serviceItems,
              assigned_technicians: order.assignedTechnicians,
              signature_technician: order.signatureTechnician,
              signatures: order.signatures,
              photos: order.photos,
              photos_before: order.photosBefore,
              photos_after: order.photosAfter,
              payment_method: order.paymentMethod,
              payment_status: order.paymentStatus,
              points_used: order.pointsUsed,
              points_deduct_amount: order.pointsDeductAmount,
              category: order.category,
              channel: order.channel,
              used_item_id: order.usedItemId,
              work_started_at: order.workStartedAt,
              work_completed_at: order.workCompletedAt,
              service_finished_at: order.serviceFinishedAt,
              canceled_reason: order.canceledReason,
              status: order.status,
              notes: order.notes,
              created_at: order.createdAt,
              updated_at: order.updatedAt,
            })
            if (error) throw error
          }
        } catch (error) {
          console.error('Failed to sync order to Supabase:', error)
        }
        
        return order
      },

      updateOrder: async (id, updates) => {
        const updatedOrder = {
          ...updates,
          updatedAt: new Date().toISOString()
        }
        
        set((state) => ({
          orders: state.orders.map(o => 
            o.id === id ? { ...o, ...updatedOrder } : o
          )
        }))
        
        // 同步到 Supabase
        try {
          const { getSupabase } = await import('../lib/supabase')
          const supabase = getSupabase()
          if (supabase) {
            const { error } = await supabase
              .from('orders')
              .update({
                order_number: updatedOrder.orderNumber,
                customer_name: updatedOrder.customerName,
                customer_phone: updatedOrder.customerPhone,
                customer_email: updatedOrder.customerEmail,
                customer_address: updatedOrder.customerAddress,
                preferred_date: updatedOrder.preferredDate,
                preferred_time_start: updatedOrder.preferredTimeStart,
                preferred_time_end: updatedOrder.preferredTimeEnd,
                platform: updatedOrder.platform,
                referrer_code: updatedOrder.referrerCode,
                member_id: updatedOrder.memberId,
                service_items: updatedOrder.serviceItems,
                assigned_technicians: updatedOrder.assignedTechnicians,
                signature_technician: updatedOrder.signatureTechnician,
                signatures: updatedOrder.signatures,
                photos: updatedOrder.photos,
                photos_before: updatedOrder.photosBefore,
                photos_after: updatedOrder.photosAfter,
                payment_method: updatedOrder.paymentMethod,
                payment_status: updatedOrder.paymentStatus,
                points_used: updatedOrder.pointsUsed,
                points_deduct_amount: updatedOrder.pointsDeductAmount,
                category: updatedOrder.category,
                channel: updatedOrder.channel,
                used_item_id: updatedOrder.usedItemId,
                work_started_at: updatedOrder.workStartedAt,
                work_completed_at: updatedOrder.workCompletedAt,
                service_finished_at: updatedOrder.serviceFinishedAt,
                canceled_reason: updatedOrder.canceledReason,
                status: updatedOrder.status,
                notes: updatedOrder.notes,
                updated_at: updatedOrder.updatedAt,
              })
              .eq('id', id)
            if (error) throw error
          }
        } catch (error) {
          console.error('Failed to sync order update to Supabase:', error)
        }
      },

      deleteOrder: async (id) => {
        set((state) => ({
          orders: state.orders.filter(o => o.id !== id)
        }))
        
        // 同步到 Supabase
        try {
          const { getSupabase } = await import('../lib/supabase')
          const supabase = getSupabase()
          if (supabase) {
            const { error } = await supabase
              .from('orders')
              .delete()
              .eq('id', id)
            if (error) throw error
          }
        } catch (error) {
          console.error('Failed to sync order deletion to Supabase:', error)
        }
      },

      getOrder: (id) => {
        return get().orders.find(o => o.id === id) || null
      },

      createReservation: async (reservationData) => {
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const reservation: ReservationOrder = {
          ...reservationData,
          id,
          createdAt: now,
          updatedAt: now,
        }
        
        set((state) => ({
          reservations: [reservation, ...state.reservations]
        }))
        
        return reservation
      },

      convertReservationToOrder: async (reservationId) => {
        const reservation = get().reservations.find(r => r.id === reservationId)
        if (!reservation) throw new Error('預約訂單不存在')
        
        // 創建正式訂單
        const orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
          customerName: reservation.customerName,
          customerPhone: reservation.customerPhone,
          customerEmail: reservation.customerEmail,
          customerAddress: reservation.customerAddress,
          preferredDate: reservation.preferredDate,
          preferredTimeStart: reservation.preferredTimeStart,
          preferredTimeEnd: reservation.preferredTimeEnd,
          platform: 'cart',
          serviceItems: reservation.items,
          paymentStatus: 'pending',
          status: 'pending',
          notes: '自動從購物車預約新增',
        }
        
        const order = await get().createOrder(orderData)
        
        // 更新預約狀態
        await get().updateReservation(reservationId, { status: 'converted' })
        
        return order
      },

      updateReservation: async (id, updates) => {
        const updatedReservation = {
          ...updates,
          updatedAt: new Date().toISOString()
        }
        
        set((state) => ({
          reservations: state.reservations.map(r => 
            r.id === id ? { ...r, ...updatedReservation } : r
          )
        }))
      },

      deleteReservation: async (id) => {
        set((state) => ({
          reservations: state.reservations.filter(r => r.id !== id)
        }))
      },

      createOrderFromCart: async (customerInfo, cartItems) => {
        const orderItems: OrderItem[] = cartItems.map(item => ({
          productId: item.productId,
          productName: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
        }))
        
        const totalAmount = cartItems.reduce((total, item) => {
          return total + (item.product.price * item.quantity)
        }, 0)
        
        const orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
          customerName: customerInfo.name,
          customerPhone: customerInfo.phone,
          customerEmail: customerInfo.email,
          customerAddress: customerInfo.address,
          preferredDate: customerInfo.preferredDate,
          preferredTimeStart: customerInfo.preferredTimeStart,
          preferredTimeEnd: customerInfo.preferredTimeEnd,
          platform: 'cart',
          serviceItems: orderItems,
          paymentStatus: 'pending',
          status: 'pending',
          notes: '從購物車創建',
        }
        
        return await get().createOrder(orderData)
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

        // 載入訂單
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (ordersError) throw ordersError

        // 轉換資料格式
        const formattedOrders: Order[] = (orders || []).map(o => ({
          id: o.id,
          orderNumber: o.order_number,
          customerName: o.customer_name,
          customerPhone: o.customer_phone,
          customerEmail: o.customer_email,
          customerAddress: o.customer_address,
          preferredDate: o.preferred_date,
          preferredTimeStart: o.preferred_time_start,
          preferredTimeEnd: o.preferred_time_end,
          platform: o.platform,
          referrerCode: o.referrer_code,
          memberId: o.member_id,
          serviceItems: o.service_items || [],
          assignedTechnicians: o.assigned_technicians,
          signatureTechnician: o.signature_technician,
          signatures: o.signatures,
          photos: o.photos,
          photosBefore: o.photos_before,
          photosAfter: o.photos_after,
          paymentMethod: o.payment_method,
          paymentStatus: o.payment_status,
          pointsUsed: o.points_used,
          pointsDeductAmount: o.points_deduct_amount,
          category: o.category,
          channel: o.channel,
          usedItemId: o.used_item_id,
          workStartedAt: o.work_started_at,
          workCompletedAt: o.work_completed_at,
          serviceFinishedAt: o.service_finished_at,
          canceledReason: o.canceled_reason,
          status: o.status,
          notes: o.notes,
          createdAt: o.created_at,
          updatedAt: o.updated_at,
        }))

        set({ orders: formattedOrders })
      },
    }),
    { 
      name: 'cart-orders',
      partialize: (state) => ({ 
        orders: state.orders,
        reservations: state.reservations
      })
    },
  ),
)

