
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMySubscriptions, useCancelSubscription } from './useSubscriptions'
import { createWrapper } from '@/test/utils' // Assuming a test wrapper exists or I'll create a simple one
import { supabase } from '@/integrations/supabase/client'

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        auth: {
            getUser: vi.fn()
        },
        from: vi.fn()
    }
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
        it('should throw error if user is not logged in', async () => {
            // Mock getUser to return null
            (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } })

            const { result } = renderHook(() => useMySubscriptions(), {
                wrapper: createWrapper()
            })

            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(result.current.error).toEqual(new Error('로그인이 필요합니다.'))
        })

        it('should return subscriptions if user is logged in', async () => {
            // Mock getUser
            (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'user-123' } } })

            // Mock select chain
            const mockData = [{ id: 'sub-1', status: 'active' }]
            const mockSelect = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: mockData, error: null })
                })
            })

                ; (supabase.from as any).mockReturnValue({
                    select: mockSelect
                })

            const { result } = renderHook(() => useMySubscriptions(), {
                wrapper: createWrapper()
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data).toEqual(mockData)
        })
    })

    describe('useCancelSubscription', () => {
        it('should cancel subscription successfully', async () => {
            // Mock update chain
            const mockUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: { id: 'sub-1', status: 'cancelled' }, error: null })
                    })
                })
            })

                ; (supabase.from as any).mockReturnValue({
                    update: mockUpdate
                })

            const { result } = renderHook(() => useCancelSubscription(), {
                wrapper: createWrapper()
            })

            result.current.mutate({ subscription_id: 'sub-1', cancel_at_period_end: false })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))
        })
    })
})
