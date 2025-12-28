/**
 * Content Versions Hooks
 *
 * 컨텐츠 버전 관리 (변경 이력 추적, 복원) 훅
 *
 * @module useContentVersions
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { callWorkersApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

// ============================================
// 타입 정의
// ============================================

export type ContentType = 'blog_post' | 'notice' | 'service' | 'portfolio' | 'page'

export interface ContentVersion {
  id: string
  content_type: ContentType
  content_id: string
  version_number: number
  title: string | null
  content: string | null
  metadata: Record<string, unknown>
  change_summary: string | null
  changed_fields: string[] | null
  created_by: string | null
  created_at: string
  is_current: boolean
  restored_from: string | null
}

export interface ContentVersionSummary {
  id: string
  version_number: number
  title: string | null
  change_summary: string | null
  changed_fields: string[] | null
  created_by: string | null
  created_at: string
  is_current: boolean
}

export interface VersionComparison {
  field_name: string
  old_value: string | null
  new_value: string | null
}

export interface CreateVersionRequest {
  content_type: ContentType
  content_id: string
  title: string
  content: string
  metadata?: Record<string, unknown>
  change_summary?: string
  changed_fields?: string[]
}

// ============================================
// 버전 목록 조회
// ============================================

/**
 * 특정 컨텐츠의 버전 히스토리 조회
 */
export function useContentVersions(
  contentType: ContentType | undefined,
  contentId: string | undefined,
  limit = 20
) {
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['content-versions', contentType, contentId, limit],
    queryFn: async () => {
      if (!contentType || !contentId) {
        throw new Error('content_type과 content_id가 필요합니다')
      }

      const response = await callWorkersApi<ContentVersionSummary[]>(
        `/api/v1/versions/${contentType}/${contentId}?limit=${limit}`,
        { token: workersTokens?.accessToken }
      )

      if (response.error) {
        console.error('Content versions query error:', response.error)
        throw new Error(`버전 히스토리 조회 실패: ${response.error}`)
      }

      return (response.data || []) as ContentVersionSummary[]
    },
    enabled: !!contentType && !!contentId,
    staleTime: 60 * 1000, // 1분
  })
}

// ============================================
// 버전 상세 조회
// ============================================

/**
 * 특정 버전의 상세 내용 조회
 */
export function useContentVersionDetail(versionId: string | undefined) {
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['content-version-detail', versionId],
    queryFn: async () => {
      if (!versionId) {
        throw new Error('version_id가 필요합니다')
      }

      const response = await callWorkersApi<ContentVersion>(
        `/api/v1/versions/detail/${versionId}`,
        { token: workersTokens?.accessToken }
      )

      if (response.error) {
        console.error('Content version detail error:', response.error)
        throw new Error(`버전 상세 조회 실패: ${response.error}`)
      }

      if (!response.data) {
        throw new Error('버전을 찾을 수 없습니다')
      }

      return response.data as ContentVersion
    },
    enabled: !!versionId,
    staleTime: 5 * 60 * 1000, // 5분 (버전 데이터는 불변)
  })
}

// ============================================
// 버전 생성
// ============================================

/**
 * 새 버전 수동 생성 (자동 트리거 외 수동 스냅샷)
 */
export function useCreateContentVersion() {
  const queryClient = useQueryClient()
  const { workersTokens, user } = useAuth()

  return useMutation({
    mutationFn: async (request: CreateVersionRequest) => {
      const response = await callWorkersApi<string>(
        '/api/v1/versions',
        {
          method: 'POST',
          token: workersTokens?.accessToken,
          body: {
            content_type: request.content_type,
            content_id: request.content_id,
            title: request.title,
            content: request.content,
            metadata: request.metadata || {},
            change_summary: request.change_summary || null,
            changed_fields: request.changed_fields || null,
            user_id: user?.id || null,
          },
        }
      )

      if (response.error) {
        console.error('Create content version error:', response.error)
        throw new Error(`버전 생성 실패: ${response.error}`)
      }

      return response.data as string // 새 버전 ID 반환
    },
    onSuccess: (_, request) => {
      queryClient.invalidateQueries({
        queryKey: ['content-versions', request.content_type, request.content_id],
      })
      toast.success('버전이 저장되었습니다.')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================
// 버전 복원
// ============================================

/**
 * 이전 버전으로 복원 (새 버전으로 생성됨)
 */
export function useRestoreContentVersion() {
  const queryClient = useQueryClient()
  const { workersTokens, user } = useAuth()

  return useMutation({
    mutationFn: async ({
      versionId,
      contentType,
      contentId,
    }: {
      versionId: string
      contentType: ContentType
      contentId: string
    }) => {
      const response = await callWorkersApi<string>(
        `/api/v1/versions/${versionId}/restore`,
        {
          method: 'POST',
          token: workersTokens?.accessToken,
          body: { user_id: user?.id || null },
        }
      )

      if (response.error) {
        console.error('Restore content version error:', response.error)
        throw new Error(`버전 복원 실패: ${response.error}`)
      }

      return { newVersionId: response.data as string, contentType, contentId }
    },
    onSuccess: ({ contentType, contentId }) => {
      queryClient.invalidateQueries({
        queryKey: ['content-versions', contentType, contentId],
      })
      toast.success('이전 버전으로 복원되었습니다.')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================
// 버전 비교
// ============================================

/**
 * 두 버전 간 차이 비교
 */
export function useCompareVersions(versionId1: string | undefined, versionId2: string | undefined) {
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['compare-versions', versionId1, versionId2],
    queryFn: async () => {
      if (!versionId1 || !versionId2) {
        throw new Error('비교할 두 버전 ID가 필요합니다')
      }

      const response = await callWorkersApi<VersionComparison[]>(
        `/api/v1/versions/compare?v1=${versionId1}&v2=${versionId2}`,
        { token: workersTokens?.accessToken }
      )

      if (response.error) {
        console.error('Compare versions error:', response.error)
        throw new Error(`버전 비교 실패: ${response.error}`)
      }

      return (response.data || []) as VersionComparison[]
    },
    enabled: !!versionId1 && !!versionId2,
    staleTime: 5 * 60 * 1000, // 5분
  })
}

// ============================================
// 통계
// ============================================

export interface ContentVersionStats {
  content_type: ContentType
  content_count: number
  total_versions: number
  avg_versions_per_content: number
  last_version_at: string | null
}

/**
 * 컨텐츠 버전 통계 조회
 */
export function useContentVersionStats() {
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['content-version-stats'],
    queryFn: async () => {
      const response = await callWorkersApi<ContentVersionStats[]>(
        '/api/v1/versions/stats',
        { token: workersTokens?.accessToken }
      )

      if (response.error) {
        console.error('Content version stats error:', response.error)
        throw new Error(`통계 조회 실패: ${response.error}`)
      }

      return (response.data || []) as ContentVersionStats[]
    },
    staleTime: 5 * 60 * 1000, // 5분
  })
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 변경 필드를 한글로 표시
 */
export function getFieldDisplayName(field: string): string {
  const fieldNames: Record<string, string> = {
    title: '제목',
    content: '내용',
    excerpt: '요약',
    status: '상태',
    slug: 'URL 슬러그',
    category_id: '카테고리',
    metadata: '메타데이터',
    description: '설명',
    price: '가격',
    image_url: '이미지',
  }
  return fieldNames[field] || field
}

/**
 * 컨텐츠 타입을 한글로 표시
 */
export function getContentTypeDisplayName(type: ContentType): string {
  const typeNames: Record<ContentType, string> = {
    blog_post: '블로그 글',
    notice: '공지사항',
    service: '서비스',
    portfolio: '포트폴리오',
    page: '페이지',
  }
  return typeNames[type] || type
}

/**
 * 버전 번호 포맷 (v1, v2, ...)
 */
export function formatVersionNumber(version: number): string {
  return `v${version}`
}
