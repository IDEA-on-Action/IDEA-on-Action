/**
 * 제품 문의 훅
 *
 * - 문의 접수 (공개)
 * - 문의 목록 조회, 상태 변경 (관리자)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { callWorkersApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/auth/useAuth'
import type { ProductInquiryStatus } from '@/data/products/product-inquiry'

export interface ProductInquiry {
  id: string
  product_id: string
  company: string
  name: string
  email: string
  phone: string | null
  role: string | null
  use_case: string
  deployment: string
  timeline: string | null
  consent_at: string
  status: ProductInquiryStatus
  admin_notes: string | null
  created_at: string
}

export interface ProductInquirySubmission {
  product_id: string
  company: string
  name: string
  email: string
  phone?: string
  role?: string
  use_case: string
  deployment: string
  timeline?: string
  consent: boolean
  /** 숨김 입력 칸. 사람은 채우지 않습니다. */
  website?: string
  turnstile_token?: string
}

const QUERY_KEY = 'product-inquiries'

/** 제품 문의 접수 */
export function useSubmitProductInquiry() {
  return useMutation({
    mutationFn: async (submission: ProductInquirySubmission) => {
      const { data, error } = await callWorkersApi<{ data: { id: string } }>('/api/v1/product-inquiries', {
        method: 'POST',
        body: submission,
      })

      if (error) throw new Error(error)

      return data?.data
    },
  })
}

/** 제품 문의 목록 (관리자) */
export function useProductInquiries(status?: ProductInquiryStatus) {
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: [QUERY_KEY, status ?? 'all'],
    queryFn: async () => {
      const query = status ? `?status=${status}` : ''
      const { data, error } = await callWorkersApi<{ data: ProductInquiry[] }>(`/api/v1/product-inquiries${query}`, {
        token: workersTokens?.accessToken,
      })

      if (error) throw new Error(error)

      return data?.data ?? []
    },
    enabled: !!workersTokens?.accessToken,
    staleTime: 60 * 1000,
  })
}

/** 제품 문의 상태와 관리자 메모 변경 (관리자) */
export function useUpdateProductInquiry() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      adminNotes,
    }: {
      id: string
      status?: ProductInquiryStatus
      adminNotes?: string
    }) => {
      const body: { status?: ProductInquiryStatus; admin_notes?: string } = {}
      if (status !== undefined) body.status = status
      if (adminNotes !== undefined) body.admin_notes = adminNotes

      const { data, error } = await callWorkersApi<{ data: ProductInquiry }>(`/api/v1/product-inquiries/${id}`, {
        method: 'PATCH',
        token: workersTokens?.accessToken,
        body,
      })

      if (error) throw new Error(error)

      return data?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
