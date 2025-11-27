import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCheckout } from '../useCheckout'
import { createWrapper } from '@/test/utils'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useCreateOrder } from '@/hooks/useOrders'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '@/store/cartStore'

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
    useAuth: vi.fn()
}))

vi.mock('@/hooks/useCart', () => ({
    useCart: vi.fn()
}))

vi.mock('@/hooks/useOrders', () => ({
    useCreateOrder: vi.fn()
}))

vi.mock('react-router-dom', () => ({
    useNavigate: vi.fn()
}))

vi.mock('@/store/cartStore', () => ({
    useCartStore: vi.fn()
}))

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn()
    }
}))

describe('useCheckout', () => {
    const mockNavigate = vi.fn()
    const mockCreateOrder = vi.fn()
    const mockClearServiceItems = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()

            // Default mocks
            ; (useNavigate as MockedFunction<typeof useNavigate>).mockReturnValue(mockNavigate)
            ; (useCreateOrder as MockedFunction<typeof useCreateOrder>).mockReturnValue({
                mutate: mockCreateOrder,
                isPending: false
            })
            ; (useAuth as MockedFunction<typeof useAuth>).mockReturnValue({
                user: { id: 'user-123', email: 'test@example.com' }
            })
            ; (useCart as MockedFunction<typeof useCart>).mockReturnValue({
                data: {
                    items: [
                        { id: 'item-1', price: 1000, quantity: 2, service: { title: 'Service 1' } }
                    ]
                },
                isLoading: false
            })
            ; (useCartStore as MockedFunction<typeof useCartStore>).mockReturnValue({
                serviceItems: [],
                clearServiceItems: mockClearServiceItems
            })
    })

    it('should initialize with default values', () => {
        const { result } = renderHook(() => useCheckout(), {
            wrapper: createWrapper()
        })

        expect(result.current.form).toBeDefined()
        expect(result.current.cart).toBeDefined()
        expect(result.current.subtotal).toBe(2000) // 1000 * 2
        expect(result.current.tax).toBe(200) // 10%
        expect(result.current.total).toBe(2200)
    })

    it('should calculate totals correctly with service items', () => {
        // Mock service items for this test
        ; (useCartStore as MockedFunction<typeof useCartStore>).mockReturnValue({
            serviceItems: [
                {
                    item_id: 'service-1',
                    item_name: 'Premium Plan',
                    price: 5000,
                    quantity: 1,
                    billing_cycle: 'monthly'
                }
            ],
            clearServiceItems: mockClearServiceItems
        })

        const { result } = renderHook(() => useCheckout(), {
            wrapper: createWrapper()
        })

        // Cart: 2000, Service: 5000 -> Subtotal: 7000
        expect(result.current.subtotal).toBe(7000)
        expect(result.current.tax).toBe(700)
        expect(result.current.total).toBe(7700)
    })

    it('should handle form submission', async () => {
        const { result } = renderHook(() => useCheckout(), {
            wrapper: createWrapper()
        })

        // Set form values
        act(() => {
            result.current.form.setValue('shippingName', 'Test User')
            result.current.form.setValue('shippingPhone', '010-1234-5678')
            result.current.form.setValue('postcode', '12345')
            result.current.form.setValue('address', 'Seoul')
            result.current.form.setValue('addressDetail', 'Gangnam')
            result.current.form.setValue('contactPhone', '010-1234-5678')

            // Set agreements
            result.current.form.setValue('termsAgreed', true)
            result.current.form.setValue('privacyAgreed', true)
            result.current.form.setValue('refundAgreed', true)
            result.current.form.setValue('electronicFinanceAgreed', true)
            result.current.form.setValue('digitalServiceWithdrawalAgreed', true)
        })

        await act(async () => {
            await result.current.onSubmit(result.current.form.getValues())
        })

        expect(mockCreateOrder).toHaveBeenCalled()
    })

    it('should validate agreements before submission', async () => {
        const { result } = renderHook(() => useCheckout(), {
            wrapper: createWrapper()
        })

        // Set form values but NOT agreements
        act(() => {
            result.current.form.setValue('shippingName', 'Test User')
            result.current.form.setValue('shippingPhone', '010-1234-5678')
            result.current.form.setValue('postcode', '12345')
            result.current.form.setValue('address', 'Seoul')
            result.current.form.setValue('addressDetail', 'Gangnam')
            result.current.form.setValue('contactPhone', '010-1234-5678')
        })

        expect(result.current.isAllAgreed).toBe(false)
    })
})
