import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMySubscriptions, useCancelSubscription } from '@/hooks/subscription/useSubscriptions'
import { createWrapper } from '@/test/utils'
import { subscriptionsApi } from '@/integrations/cloudflare/client'

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
    subscriptionsApi: {
        getHistory: vi.fn(),
        cancel: vi.fn(),
    }
}))

// Mock useAuth
vi.mock('@/hooks/auth/useAuth', () => ({
    useAuth: () => ({
        workersTokens: { accessToken: 'test-token' },
        user: { id: 'user-123' },
    }),
}))

// Mock toast
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}))

describe('useSubscriptions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('useMySubscriptions', () => {
        it('should return subscriptions when authenticated', async () => {
            const mockSubscriptions = [{ id: 'sub-1', status: 'active' }]
            vi.mocked(subscriptionsApi.getHistory).mockResolvedValue({
                data: { subscriptions: mockSubscriptions },
                error: null,
            })

            const { result } = renderHook(() => useMySubscriptions(), {
                wrapper: createWrapper()
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data).toEqual(mockSubscriptions)
        })

        it('should handle API errors', async () => {
            vi.mocked(subscriptionsApi.getHistory).mockResolvedValue({
                data: null,
                error: '조회 실패',
            })

            const { result } = renderHook(() => useMySubscriptions(), {
                wrapper: createWrapper()
            })

            await waitFor(() => expect(result.current.isError).toBe(true))
        })
    })

    describe('useCancelSubscription', () => {
        it('should cancel subscription successfully', async () => {
            vi.mocked(subscriptionsApi.cancel).mockResolvedValue({
                data: { id: 'sub-1', status: 'cancelled' },
                error: null,
            })

            const { result } = renderHook(() => useCancelSubscription(), {
                wrapper: createWrapper()
            })

            result.current.mutate({ subscription_id: 'sub-1', cancel_at_period_end: false })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))
        })
    })
})
