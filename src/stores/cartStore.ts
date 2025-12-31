/**
 * Cart Store (Zustand)
 *
 * 장바구니 UI 상태 관리 (드로어 열림/닫힘, 항목 수)
 * 서버 상태는 useCart 훅(React Query)에서 관리
 *
 * 지원하는 항목 타입:
 * 1. 일반 서비스 (CartItem - 기존 cart_items 테이블)
 * 2. 서비스 패키지/플랜 (ServiceCartItem - 로컬 상태, 결제 시 전달)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ServiceCartItem } from '@/types/services-platform'

interface CartStore {
  // 상태
  isOpen: boolean // 장바구니 드로어 열림/닫힘
  itemCount: number // 장바구니 항목 수 (UI 표시용)
  serviceItems: ServiceCartItem[] // 서비스 패키지/플랜 (로컬 상태)

  // 액션
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  setItemCount: (count: number) => void
  addServiceItem: (item: ServiceCartItem) => void
  removeServiceItem: (itemId: string) => void
  clearServiceItems: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      // 초기 상태
      isOpen: false,
      itemCount: 0,
      serviceItems: [],

      // 액션
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      setItemCount: (count) => set({ itemCount: count }),

      // 서비스 항목 추가
      addServiceItem: (item) =>
        set((state) => {
          // 이미 장바구니에 있는지 확인
          const existingIndex = state.serviceItems.findIndex((i) => i.item_id === item.item_id)

          if (existingIndex >= 0) {
            // 정기구독 플랜은 중복 추가 무시 (quantity 증가 안 함)
            if (item.type === 'plan') {
              return state // 변경 없음
            }

            // 일반 패키지는 수량 증가
            const updatedItems = [...state.serviceItems]
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              quantity: updatedItems[existingIndex].quantity + item.quantity,
            }
            return { serviceItems: updatedItems }
          } else {
            // 없으면 새로 추가
            return { serviceItems: [...state.serviceItems, item] }
          }
        }),

      // 서비스 항목 제거
      removeServiceItem: (itemId) =>
        set((state) => ({
          serviceItems: state.serviceItems.filter((item) => item.item_id !== itemId),
        })),

      // 서비스 항목 전체 삭제
      clearServiceItems: () => set({ serviceItems: [] }),
    }),
    {
      name: 'cart-storage', // localStorage key
      partialize: (state) => ({ serviceItems: state.serviceItems }), // serviceItems만 persist
    }
  )
)
