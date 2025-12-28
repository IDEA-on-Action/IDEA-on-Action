/**
 * Work Inquiries Hook
 *
 * Work with Us 문의 관리
 * - 문의 제출
 * - 이메일 발송
 * - Workers API 저장
 *
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { callWorkersApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export interface WorkInquiry {
  id?: string
  name: string
  email: string
  company?: string
  package: string
  budget?: string
  brief: string
  status?: 'pending' | 'contacted' | 'in_progress' | 'completed' | 'rejected'
  admin_notes?: string
  created_at?: string
}

/**
 * Work with Us 문의 제출
 */
export function useSubmitWorkInquiry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: WorkInquiry) => {
      // 1. 이메일 유효성 검사
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
        throw new Error('유효한 이메일 주소를 입력해주세요.')
      }

      // 2. Workers API에 저장
      const { data: inquiry, error: dbError } = await callWorkersApi<WorkInquiry>(
        '/api/v1/work-inquiries',
        {
          method: 'POST',
          body: {
            name: data.name,
            email: data.email,
            company: data.company || null,
            package: data.package,
            budget: data.budget || null,
            brief: data.brief,
            status: 'pending',
          },
        }
      )

      if (dbError) {
        console.error('Workers API error:', dbError)
        throw new Error('문의 접수에 실패했습니다. 잠시 후 다시 시도해주세요.')
      }

      // 3. 이메일 발송은 Workers API 내부에서 처리됨 (비동기)

      return inquiry as WorkInquiry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-inquiries'] })
      toast.success('문의가 접수되었습니다', {
        description: '빠른 시일 내에 연락드리겠습니다. 감사합니다!',
      })
    },
    onError: (error: Error) => {
      toast.error('문의 접수 실패', {
        description: error.message,
      })
    },
  })
}

/**
 * Work with Us 문의 목록 조회 (관리자용)
 */
export function useWorkInquiries(status?: string) {
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['work-inquiries', status],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (status) queryParams.set('status', status)
      const queryString = queryParams.toString()

      const { data, error } = await callWorkersApi<WorkInquiry[]>(
        `/api/v1/work-inquiries${queryString ? `?${queryString}` : ''}`,
        { token: workersTokens?.accessToken }
      )

      if (error) throw new Error(error)

      return data || []
    },
    enabled: !!workersTokens?.accessToken,
    staleTime: 2 * 60 * 1000, // 2분
  })
}

/**
 * Work with Us 문의 단일 조회 (관리자용)
 */
export function useWorkInquiry(id: string) {
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['work-inquiry', id],
    queryFn: async () => {
      const { data, error } = await callWorkersApi<WorkInquiry>(
        `/api/v1/work-inquiries/${id}`,
        { token: workersTokens?.accessToken }
      )

      if (error) throw new Error(error)

      return data as WorkInquiry
    },
    enabled: !!id && !!workersTokens?.accessToken,
    staleTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Work with Us 문의 상태 업데이트 (관리자용)
 */
export function useUpdateWorkInquiryStatus() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      adminNotes,
    }: {
      id: string
      status: WorkInquiry['status']
      adminNotes?: string
    }) => {
      const updateData: Partial<WorkInquiry> = {
        status,
      }

      if (adminNotes !== undefined) {
        updateData.admin_notes = adminNotes
      }

      const { data, error } = await callWorkersApi<WorkInquiry>(
        `/api/v1/work-inquiries/${id}`,
        {
          method: 'PATCH',
          token: workersTokens?.accessToken,
          body: updateData,
        }
      )

      if (error) throw new Error(error)

      return data as WorkInquiry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-inquiries'] })
      toast.success('문의 상태가 업데이트되었습니다')
    },
    onError: () => {
      toast.error('상태 업데이트 실패', {
        description: '잠시 후 다시 시도해주세요.',
      })
    },
  })
}

/**
 * Work with Us 문의 삭제 (관리자용)
 */
export function useDeleteWorkInquiry() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await callWorkersApi(
        `/api/v1/work-inquiries/${id}`,
        {
          method: 'DELETE',
          token: workersTokens?.accessToken,
        }
      )

      if (error) throw new Error(error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-inquiries'] })
      toast.success('문의가 삭제되었습니다')
    },
    onError: () => {
      toast.error('삭제 실패', {
        description: '잠시 후 다시 시도해주세요.',
      })
    },
  })
}

/**
 * Work with Us 통계 조회 (관리자용)
 */
export function useWorkInquiriesStats() {
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['work-inquiries-stats'],
    queryFn: async () => {
      const { data, error } = await callWorkersApi<{
        statusStats: {
          total: number;
          pending: number;
          contacted: number;
          in_progress: number;
          completed: number;
          rejected: number;
        };
        packageStats: {
          MVP: number;
          Growth: number;
          Custom: number;
        };
      }>(
        '/api/v1/work-inquiries/stats',
        { token: workersTokens?.accessToken }
      )

      if (error) throw new Error(error)

      return data || {
        statusStats: {
          total: 0,
          pending: 0,
          contacted: 0,
          in_progress: 0,
          completed: 0,
          rejected: 0,
        },
        packageStats: {
          MVP: 0,
          Growth: 0,
          Custom: 0,
        },
      }
    },
    enabled: !!workersTokens?.accessToken,
    staleTime: 5 * 60 * 1000, // 5분
  })
}
