import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCheckout } from '@/components/checkout/useCheckout'
import { createWrapper } from '@/test/utils'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useCreateOrder } from '@/hooks/payments/useOrders'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '@/stores/cartStore'

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
    useAuth: vi.fn()
}))

vi.mock('@/hooks/useCart', () => ({
    useCart: vi.fn()
}))

vi.mock('@/hooks/payments/useOrders', () => ({
    useCreateOrder: vi.fn()
}))

vi.mock('react-router-dom', () => ({
    useNavigate: vi.fn()
}))

vi.mock('@/stores/cartStore', () => ({
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

    it('should handle empty cart', () => {
        ; (useCart as MockedFunction<typeof useCart>).mockReturnValue({
            data: { items: [] },
            isLoading: false
        })
        ; (useCartStore as MockedFunction<typeof useCartStore>).mockReturnValue({
            serviceItems: [],
            clearServiceItems: mockClearServiceItems
        })

        const { result } = renderHook(() => useCheckout(), {
            wrapper: createWrapper()
        })

        expect(result.current.isEmpty).toBe(true)
        expect(result.current.subtotal).toBe(0)
        expect(result.current.total).toBe(0)
    })

    it('should calculate tax correctly', () => {
        const { result } = renderHook(() => useCheckout(), {
            wrapper: createWrapper()
        })

        // Subtotal: 2000, Tax: 10% of 2000 = 200
        expect(result.current.tax).toBe(200)
    })

    it('should show loading state when cart is loading', () => {
        ; (useCart as MockedFunction<typeof useCart>).mockReturnValue({
            data: undefined,
            isLoading: true
        })

        const { result } = renderHook(() => useCheckout(), {
            wrapper: createWrapper()
        })

        expect(result.current.isCartLoading).toBe(true)
    })

    it('should show creating order state', () => {
        ; (useCreateOrder as MockedFunction<typeof useCreateOrder>).mockReturnValue({
            mutate: mockCreateOrder,
            isPending: true
        })

        const { result } = renderHook(() => useCheckout(), {
            wrapper: createWrapper()
        })

        expect(result.current.isCreatingOrder).toBe(true)
    })

    it('should handle postcode popup open/close', () => {
        const { result } = renderHook(() => useCheckout(), {
            wrapper: createWrapper()
        })

        expect(result.current.isPostcodeOpen).toBe(false)

        act(() => {
            result.current.setIsPostcodeOpen(true)
        })

        expect(result.current.isPostcodeOpen).toBe(true)

        act(() => {
            result.current.setIsPostcodeOpen(false)
        })

        expect(result.current.isPostcodeOpen).toBe(false)
    })

    it('should handle postcode selection', () => {
        const { result } = renderHook(() => useCheckout(), {
            wrapper: createWrapper()
        })

        const postcodeData = {
            address: '서울 강남구 테헤란로',
            addressType: 'R',
            bname: '역삼동',
            buildingName: '강남빌딩',
            zonecode: '06234'
        }

        act(() => {
            result.current.handlePostcodeComplete(postcodeData)
        })

        expect(result.current.form.getValues('postcode')).toBe('06234')
        expect(result.current.form.getValues('address')).toContain('서울 강남구 테헤란로')
        expect(result.current.isPostcodeOpen).toBe(false)
    })

    it('should handle all agreements toggle', () => {
        const { result } = renderHook(() => useCheckout(), {
            wrapper: createWrapper()
        })

        expect(result.current.isAllAgreed).toBe(false)

        act(() => {
            result.current.handleAllAgree(true)
        })

        expect(result.current.form.getValues('termsAgreed')).toBe(true)
        expect(result.current.form.getValues('privacyAgreed')).toBe(true)
        expect(result.current.form.getValues('refundAgreed')).toBe(true)
        expect(result.current.form.getValues('electronicFinanceAgreed')).toBe(true)
        expect(result.current.form.getValues('digitalServiceWithdrawalAgreed')).toBe(true)
        expect(result.current.isAllAgreed).toBe(true)

        act(() => {
            result.current.handleAllAgree(false)
        })

        expect(result.current.isAllAgreed).toBe(false)
    })

    it('should ignore indeterminate state in handleAllAgree', () => {
        const { result } = renderHook(() => useCheckout(), {
            wrapper: createWrapper()
        })

        act(() => {
            result.current.handleAllAgree('indeterminate')
        })

        // Values should remain unchanged
        expect(result.current.form.getValues('termsAgreed')).toBe(false)
    })

    it('should set default email from user', () => {
        ; (useAuth as MockedFunction<typeof useAuth>).mockReturnValue({
            user: { id: 'user-123', email: 'test@example.com' }
        })

        const { result } = renderHook(() => useCheckout(), {
            wrapper: createWrapper()
        })

        expect(result.current.form.getValues('contactEmail')).toBe('test@example.com')
    })

    it('should handle no authenticated user', () => {
        ; (useAuth as MockedFunction<typeof useAuth>).mockReturnValue({
            user: null
        })

        const { result } = renderHook(() => useCheckout(), {
            wrapper: createWrapper()
        })

        expect(result.current.user).toBeNull()
        expect(result.current.form.getValues('contactEmail')).toBe('')
    })

    it('should navigate after successful order creation', async () => {
        const mockOrder = { id: 'order-123' }

        ; (useCreateOrder as MockedFunction<typeof useCreateOrder>).mockReturnValue({
            mutate: vi.fn((data, options) => {
                options?.onSuccess?.(mockOrder)
            }),
            isPending: false
        })

        const { result } = renderHook(() => useCheckout(), {
            wrapper: createWrapper()
        })

        act(() => {
            result.current.form.setValue('shippingName', 'Test User')
            result.current.form.setValue('shippingPhone', '010-1234-5678')
            result.current.form.setValue('postcode', '12345')
            result.current.form.setValue('address', 'Seoul')
            result.current.form.setValue('addressDetail', 'Gangnam')
            result.current.form.setValue('contactEmail', 'test@example.com')
            result.current.form.setValue('contactPhone', '010-1234-5678')
            result.current.form.setValue('termsAgreed', true)
            result.current.form.setValue('privacyAgreed', true)
            result.current.form.setValue('refundAgreed', true)
            result.current.form.setValue('electronicFinanceAgreed', true)
            result.current.form.setValue('digitalServiceWithdrawalAgreed', true)
        })

        await act(async () => {
            await result.current.onSubmit(result.current.form.getValues())
        })

        expect(mockNavigate).toHaveBeenCalledWith('/checkout/payment?order_id=order-123')
        expect(mockClearServiceItems).toHaveBeenCalled()
    })

    it('should not submit without cart and service items', async () => {
        ; (useCart as MockedFunction<typeof useCart>).mockReturnValue({
            data: undefined,
            isLoading: false
        })
        ; (useCartStore as MockedFunction<typeof useCartStore>).mockReturnValue({
            serviceItems: [],
            clearServiceItems: mockClearServiceItems
        })

        const { result } = renderHook(() => useCheckout(), {
            wrapper: createWrapper()
        })

        act(() => {
            result.current.form.setValue('shippingName', 'Test User')
            result.current.form.setValue('shippingPhone', '010-1234-5678')
            result.current.form.setValue('postcode', '12345')
            result.current.form.setValue('address', 'Seoul')
            result.current.form.setValue('addressDetail', 'Gangnam')
            result.current.form.setValue('contactEmail', 'test@example.com')
            result.current.form.setValue('contactPhone', '010-1234-5678')
            result.current.form.setValue('termsAgreed', true)
            result.current.form.setValue('privacyAgreed', true)
            result.current.form.setValue('refundAgreed', true)
            result.current.form.setValue('electronicFinanceAgreed', true)
            result.current.form.setValue('digitalServiceWithdrawalAgreed', true)
        })

        await act(async () => {
            await result.current.onSubmit(result.current.form.getValues())
        })

        expect(mockCreateOrder).not.toHaveBeenCalled()
    })

    it('should submit with only service items', async () => {
        const mockOrder = { id: 'order-456' }

        ; (useCart as MockedFunction<typeof useCart>).mockReturnValue({
            data: undefined,
            isLoading: false
        })
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
        ; (useCreateOrder as MockedFunction<typeof useCreateOrder>).mockReturnValue({
            mutate: vi.fn((data, options) => {
                options?.onSuccess?.(mockOrder)
            }),
            isPending: false
        })

        const { result } = renderHook(() => useCheckout(), {
            wrapper: createWrapper()
        })

        act(() => {
            result.current.form.setValue('shippingName', 'Test User')
            result.current.form.setValue('shippingPhone', '010-1234-5678')
            result.current.form.setValue('postcode', '12345')
            result.current.form.setValue('address', 'Seoul')
            result.current.form.setValue('addressDetail', 'Gangnam')
            result.current.form.setValue('contactEmail', 'test@example.com')
            result.current.form.setValue('contactPhone', '010-1234-5678')
            result.current.form.setValue('termsAgreed', true)
            result.current.form.setValue('privacyAgreed', true)
            result.current.form.setValue('refundAgreed', true)
            result.current.form.setValue('electronicFinanceAgreed', true)
            result.current.form.setValue('digitalServiceWithdrawalAgreed', true)
        })

        await act(async () => {
            await result.current.onSubmit(result.current.form.getValues())
        })

        expect(mockNavigate).toHaveBeenCalledWith('/checkout/payment?order_id=order-456')
        expect(mockClearServiceItems).toHaveBeenCalled()
    })
})
