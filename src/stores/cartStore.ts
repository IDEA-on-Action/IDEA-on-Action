/**
 * Cart Store (Zustand)
 *
 * 장바구니 상태 관리
 * - 로컬 스토리지 persist
 * - Supabase 동기화 (로그인 시)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Service } from '@/types/database'

export interface CartItem {
  serviceId: string
  service: Pick<Service, 'id' | 'title' | 'price' | 'image_url'>
  quantity: number
}

interface CartState {
  items: CartItem[]
  isOpen: boolean

  // Actions
  addItem: (service: Service, quantity?: number) => void
  removeItem: (serviceId: string) => void
  updateQuantity: (serviceId: string, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void

  // Computed
  getTotalItems: () => number
  getTotalPrice: () => number
  getItemQuantity: (serviceId: string) => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (service, quantity = 1) => {
        const { items } = get()
        const existingIndex = items.findIndex(
          (item) => item.serviceId === service.id
        )

        if (existingIndex >= 0) {
          // 이미 있으면 수량 증가
          const newItems = [...items]
          newItems[existingIndex].quantity += quantity
          set({ items: newItems })
        } else {
          // 없으면 새로 추가
          const newItem: CartItem = {
            serviceId: service.id,
            service: {
              id: service.id,
              title: service.title,
              price: service.price,
              image_url: service.image_url,
            },
            quantity,
          }
          set({ items: [...items, newItem] })
        }
      },

      removeItem: (serviceId) => {
        const { items } = get()
        set({ items: items.filter((item) => item.serviceId !== serviceId) })
      },

      updateQuantity: (serviceId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(serviceId)
          return
        }

        const { items } = get()
        const newItems = items.map((item) =>
          item.serviceId === serviceId ? { ...item, quantity } : item
        )
        set({ items: newItems })
      },

      clearCart: () => {
        set({ items: [] })
      },

      toggleCart: () => {
        set((state) => ({ isOpen: !state.isOpen }))
      },

      openCart: () => {
        set({ isOpen: true })
      },

      closeCart: () => {
        set({ isOpen: false })
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.service.price * item.quantity,
          0
        )
      },

      getItemQuantity: (serviceId) => {
        const item = get().items.find((item) => item.serviceId === serviceId)
        return item?.quantity || 0
      },
    }),
    {
      name: 'vibe-working-cart',
      partialize: (state) => ({ items: state.items }), // isOpen은 persist 제외
    }
  )
)
