/**
 * Compass Navigator MCP 클라이언트 훅
 *
 * MCP (Model Context Protocol) 서버와 통신하기 위한 React 훅 모음
 * HTTP 전송 모드를 통해 MCP 서버에 연결하여 사용자 인증, 구독 정보,
 * 권한 확인 등의 기능을 제공합니다.
 *
 * @see mcp-server/README.md - MCP 서버 문서
 * @see mcp-server/src/index.ts - MCP 서버 HTTP 엔드포인트
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { cacheConfig, createQueryKeys } from '@/lib/react-query'

// ===================================================================
// 타입 정의
// ===================================================================

/**
 * Compass 구독 정보
 * MCP 서버의 subscription://current 리소스 응답 형식
 */
export interface CompassSubscription {
  /** 사용자 UUID */
  userId: string
  /** 사용자 이메일 */
  email: string
  /** 사용자 이름 */
  name: string
  /** 프로필 이미지 URL */
  avatarUrl?: string
  /** 구독 상태 */
  status: 'active' | 'inactive' | 'past_due'
  /** 플랜 이름 (trial, basic, pro, enterprise) */
  planName: string
  /** 플랜 기능 목록 */
  planFeatures: Record<string, unknown>
  /** 구독 유효 기간 (ISO 8601 형식) */
  validUntil: string
}

/**
 * 권한 확인 결과
 * MCP 서버의 check_permission 도구 응답 형식
 */
export interface PermissionCheck {
  /** 권한 보유 여부 */
  hasPermission: boolean
  /** 필요한 플랜 (권한 없을 때) */
  requiredPlan?: string
  /** 현재 플랜 (권한 없을 때) */
  currentPlan?: string
  /** 거부 사유 (권한 없을 때) */
  reason?: string
}

/**
 * MCP 서버 정보
 * /info 엔드포인트 응답 형식
 */
export interface MCPServerInfo {
  name: string
  version: string
  description: string
  resources: string[]
  tools: string[]
}

/**
 * MCP 서버 헬스 체크 응답
 */
export interface MCPHealthCheck {
  status: 'ok' | 'error'
  service: string
  version: string
  timestamp: string
}

/**
 * MCP JSON-RPC 요청 형식
 */
interface MCPRequest {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
  id: number | string
}

/**
 * MCP JSON-RPC 응답 형식
 */
interface MCPResponse<T = unknown> {
  jsonrpc: '2.0'
  result?: T
  error?: {
    code: number
    message: string
    data?: unknown
  }
  id: number | string
}

/**
 * MCP 도구 호출 결과
 */
interface MCPToolResult {
  content: Array<{
    type: 'text'
    text: string
  }>
}

/**
 * MCP 리소스 읽기 결과
 */
interface MCPResourceResult {
  contents: Array<{
    uri: string
    text: string
    mimeType: string
  }>
}

/**
 * 구독 리소스 응답 타입
 */
interface SubscriptionResourceResponse {
  status?: string
  plan?: {
    name?: string
    features?: unknown
  }
  valid_until?: string
  error?: string
}

/**
 * 사용자 리소스 응답 타입
 */
interface UserResourceResponse {
  id?: string
  email?: string
  name?: string
  avatar_url?: string
  error?: string
}

/**
 * 권한 확인 도구 응답 타입
 */
interface CheckPermissionToolResponse {
  allowed?: boolean
  reason?: string
}

/**
 * 권한 목록 도구 응답 타입
 */
interface ListPermissionsToolResponse {
  permissions: Array<{ permission: string }>
  message: string
}

// ===================================================================
// 환경 설정
// ===================================================================

/**
 * MCP 서버 URL
 * 환경 변수가 없으면 기본 로컬 개발 서버 사용
 */
const MCP_SERVER_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MCP_SERVER_URL) ||
  'http://localhost:3001'

// ===================================================================
// Query Key 팩토리
// ===================================================================

/**
 * MCP 관련 쿼리 키 정의
 */
export const mcpQueryKeys = {
  ...createQueryKeys('mcp'),
  health: () => ['mcp', 'health'] as const,
  info: () => ['mcp', 'info'] as const,
  subscription: () => ['mcp', 'subscription'] as const,
  permission: (permission: string) => ['mcp', 'permission', permission] as const,
  user: () => ['mcp', 'user'] as const,
}

// ===================================================================
// MCP 클라이언트 유틸리티
// ===================================================================

/**
 * 현재 인증된 사용자의 JWT 토큰 가져오기
 */
async function getAuthToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

/**
 * MCP 서버에 JSON-RPC 요청 보내기
 *
 * @param method - JSON-RPC 메서드 (예: 'tools/call', 'resources/read')
 * @param params - 메서드 파라미터
 * @param token - 선택적 JWT 토큰 (인증 필요시)
 */
async function mcpRequest<T>(
  method: string,
  params?: Record<string, unknown>,
  token?: string | null
): Promise<T> {
  const request: MCPRequest = {
    jsonrpc: '2.0',
    method,
    params,
    id: Date.now(),
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`MCP 서버 요청 실패: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as MCPResponse<T>

  if (data.error) {
    throw new Error(`MCP 에러 (${data.error.code}): ${data.error.message}`)
  }

  if (data.result === undefined) {
    throw new Error('MCP 응답에 결과가 없습니다')
  }

  return data.result
}

/**
 * MCP 도구 호출
 *
 * @param name - 도구 이름 (예: 'check_permission', 'verify_token')
 * @param args - 도구 인자
 * @param token - 선택적 JWT 토큰
 */
async function callToolInternal<T = unknown>(
  name: string,
  args: Record<string, unknown> = {},
  token?: string | null
): Promise<T> {
  const result = await mcpRequest<MCPToolResult>(
    'tools/call',
    { name, arguments: args },
    token
  )

  // 도구 결과에서 JSON 파싱
  const textContent = result.content.find((c) => c.type === 'text')
  if (textContent) {
    try {
      return JSON.parse(textContent.text) as T
    } catch {
      return textContent.text as T
    }
  }

  return result as T
}

/**
 * MCP 리소스 읽기
 *
 * @param uri - 리소스 URI (예: 'user://current', 'subscription://current')
 * @param token - 선택적 JWT 토큰
 */
async function readResourceInternal<T = unknown>(
  uri: string,
  token?: string | null
): Promise<T> {
  const result = await mcpRequest<MCPResourceResult>(
    'resources/read',
    { uri },
    token
  )

  // 리소스 결과에서 JSON 파싱
  const content = result.contents.find((c) => c.uri === uri)
  if (content) {
    try {
      return JSON.parse(content.text) as T
    } catch {
      return content.text as T
    }
  }

  return result as T
}

// ===================================================================
// React Query 훅들
// ===================================================================

/**
 * MCP 클라이언트 기본 훅
 *
 * MCP 서버와의 통신을 위한 기본 기능을 제공합니다.
 * - 헬스 체크
 * - 서버 정보 조회
 * - 도구 호출
 * - 리소스 읽기
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isHealthy, serverInfo, callTool, readResource } = useMCPClient()
 *
 *   if (!isHealthy) {
 *     return <div>MCP 서버 연결 실패</div>
 *   }
 *
 *   return <div>서버: {serverInfo?.name}</div>
 * }
 * ```
 */
export function useMCPClient() {
  // 헬스 체크 쿼리
  const healthQuery = useQuery({
    queryKey: mcpQueryKeys.health(),
    queryFn: async (): Promise<MCPHealthCheck> => {
      const response = await fetch(`${MCP_SERVER_URL}/health`)
      if (!response.ok) {
        throw new Error('MCP 서버 헬스 체크 실패')
      }
      return response.json() as Promise<MCPHealthCheck>
    },
    // 헬스 체크는 자주 확인
    ...cacheConfig.short,
    retry: 2,
    refetchInterval: 30000, // 30초마다 자동 재확인
  })

  // 서버 정보 쿼리
  const infoQuery = useQuery({
    queryKey: mcpQueryKeys.info(),
    queryFn: async (): Promise<MCPServerInfo> => {
      const response = await fetch(`${MCP_SERVER_URL}/info`)
      if (!response.ok) {
        throw new Error('MCP 서버 정보 조회 실패')
      }
      return response.json() as Promise<MCPServerInfo>
    },
    // 서버 정보는 거의 변하지 않음
    ...cacheConfig.static,
    enabled: healthQuery.data?.status === 'ok',
  })

  // 도구 호출 뮤테이션
  const callToolMutation = useMutation({
    mutationFn: async ({
      name,
      args,
    }: {
      name: string
      args?: Record<string, unknown>
    }) => {
      const token = await getAuthToken()
      return callToolInternal(name, args, token)
    },
  })

  // 리소스 읽기 뮤테이션
  const readResourceMutation = useMutation({
    mutationFn: async ({ uri }: { uri: string }) => {
      const token = await getAuthToken()
      return readResourceInternal(uri, token)
    },
  })

  return {
    // 상태
    isHealthy: healthQuery.data?.status === 'ok',
    isLoading: healthQuery.isLoading,
    isError: healthQuery.isError,
    error: healthQuery.error,

    // 데이터
    healthData: healthQuery.data,
    serverInfo: infoQuery.data,

    // 액션
    callTool: callToolMutation.mutateAsync,
    readResource: readResourceMutation.mutateAsync,

    // 뮤테이션 상태
    isToolCalling: callToolMutation.isPending,
    isResourceReading: readResourceMutation.isPending,

    // 재시도
    refetchHealth: healthQuery.refetch,
  }
}

/**
 * Compass 구독 정보 조회 훅
 *
 * 현재 인증된 사용자의 Compass 구독 정보를 조회합니다.
 * MCP 서버의 subscription://current 리소스를 사용합니다.
 *
 * @example
 * ```tsx
 * function SubscriptionStatus() {
 *   const { subscription, isLoading, error } = useCompassSubscription()
 *
 *   if (isLoading) return <Spinner />
 *   if (error) return <Error message={error.message} />
 *   if (!subscription) return <div>구독 정보 없음</div>
 *
 *   return (
 *     <div>
 *       <p>플랜: {subscription.planName}</p>
 *       <p>상태: {subscription.status}</p>
 *       <p>만료일: {subscription.validUntil}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function useCompassSubscription() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: mcpQueryKeys.subscription(),
    queryFn: async (): Promise<CompassSubscription | null> => {
      const token = await getAuthToken()

      if (!token) {
        // 인증되지 않은 경우 null 반환
        return null
      }

      try {
        // 먼저 인증 수행
        await callToolInternal('authenticate', { token }, token)

        // 구독 리소스 읽기
        const result = await readResourceInternal<SubscriptionResourceResponse>(
          'subscription://current',
          token
        )

        if (result.error) {
          console.warn('Compass 구독 조회 오류:', result.error)
          return null
        }

        // 사용자 정보도 함께 조회
        const userResult = await readResourceInternal<UserResourceResponse>(
          'user://current',
          token
        )

        if (userResult.error) {
          console.warn('Compass 사용자 조회 오류:', userResult.error)
        }

        return {
          userId: userResult.id ?? '',
          email: userResult.email ?? '',
          name: userResult.name ?? '',
          avatarUrl: userResult.avatar_url,
          status: (result.status as CompassSubscription['status']) ?? 'inactive',
          planName: result.plan?.name ?? 'trial',
          planFeatures: (result.plan?.features as Record<string, unknown>) ?? {},
          validUntil: result.valid_until ?? '',
        }
      } catch (error) {
        console.error('Compass 구독 조회 실패:', error)
        throw error
      }
    },
    // 구독 정보는 일반 캐시 시간 적용
    ...cacheConfig.default,
    retry: 1,
  })

  return {
    // 데이터
    subscription: query.data,

    // 상태
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetched: query.isFetched,

    // 액션
    refetch: query.refetch,

    // 캐시 무효화
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: mcpQueryKeys.subscription() }),
  }
}

/**
 * Compass 권한 확인 훅
 *
 * 현재 사용자가 특정 권한을 가지고 있는지 확인합니다.
 * MCP 서버의 check_permission 도구를 사용합니다.
 *
 * 사용 가능한 권한:
 * - access_compass_basic: Basic 플랜 이상
 * - access_compass_pro: Pro 플랜 이상
 * - access_compass_enterprise: Enterprise 플랜
 * - export_data: Pro 플랜 이상
 * - advanced_analytics: Pro 플랜 이상
 * - team_collaboration: Enterprise 플랜
 * - priority_support: Enterprise 플랜
 * - api_access: Pro 플랜 이상
 * - custom_integrations: Enterprise 플랜
 *
 * @param permission - 확인할 권한 이름
 * @param options - 추가 옵션
 *
 * @example
 * ```tsx
 * function ProFeature() {
 *   const { hasPermission, isLoading, requiredPlan } = useCompassPermission('export_data')
 *
 *   if (isLoading) return <Spinner />
 *
 *   if (!hasPermission) {
 *     return (
 *       <UpgradePrompt
 *         message={`이 기능은 ${requiredPlan} 플랜 이상에서 사용 가능합니다.`}
 *       />
 *     )
 *   }
 *
 *   return <ExportButton />
 * }
 * ```
 */
export function useCompassPermission(
  permission: string,
  options?: {
    /** 쿼리 활성화 여부 (기본값: true) */
    enabled?: boolean
  }
) {
  const query = useQuery({
    queryKey: mcpQueryKeys.permission(permission),
    queryFn: async (): Promise<PermissionCheck> => {
      const token = await getAuthToken()

      if (!token) {
        // 인증되지 않은 경우 권한 없음
        return {
          hasPermission: false,
          reason: '로그인이 필요합니다',
        }
      }

      try {
        const result = await callToolInternal<CheckPermissionToolResponse>(
          'check_permission',
          { permission },
          token
        )

        // 결과 파싱
        const hasPermission = result.allowed ?? false

        // reason에서 플랜 정보 추출 (형식: "Requires pro plan or higher. Current plan: basic")
        let requiredPlan: string | undefined
        let currentPlan: string | undefined

        if (result.reason) {
          const requiresMatch = result.reason.match(/Requires (\w+) plan/)
          const currentMatch = result.reason.match(/Current plan: (\w+)/)

          if (requiresMatch) requiredPlan = requiresMatch[1]
          if (currentMatch) currentPlan = currentMatch[1]
        }

        return {
          hasPermission,
          requiredPlan,
          currentPlan,
          reason: result.reason,
        }
      } catch (error) {
        console.error(`권한 확인 실패 (${permission}):`, error)
        return {
          hasPermission: false,
          reason: error instanceof Error ? error.message : '권한 확인 중 오류 발생',
        }
      }
    },
    // 권한 정보는 일반 캐시 시간 적용
    ...cacheConfig.default,
    retry: 1,
    enabled: options?.enabled ?? true,
  })

  return {
    // 권한 여부 (간편 접근)
    hasPermission: query.data?.hasPermission ?? false,

    // 상세 정보
    permissionData: query.data,
    requiredPlan: query.data?.requiredPlan,
    currentPlan: query.data?.currentPlan,
    reason: query.data?.reason,

    // 상태
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetched: query.isFetched,

    // 액션
    refetch: query.refetch,
  }
}

// ===================================================================
// 추가 유틸리티 훅
// ===================================================================

/**
 * 여러 권한을 한 번에 확인하는 훅
 *
 * 주의: 이 훅은 권한 목록이 변경되지 않는 경우에만 사용해야 합니다.
 * React Hooks 규칙상, 조건부로 훅을 호출하면 안 됩니다.
 *
 * @param permissions - 확인할 권한 목록 (불변이어야 함)
 *
 * @example
 * ```tsx
 * // 권한 목록은 컴포넌트 외부에 정의하거나 useMemo로 메모이제이션
 * const REQUIRED_PERMISSIONS = ['export_data', 'advanced_analytics', 'api_access'] as const
 *
 * function AdminPanel() {
 *   const { results, allGranted, isLoading } = useCompassPermissions(REQUIRED_PERMISSIONS)
 *
 *   if (isLoading) return <Spinner />
 *
 *   if (!allGranted) {
 *     return <div>일부 권한이 없습니다</div>
 *   }
 *
 *   return <AdminDashboard />
 * }
 * ```
 */
export function useCompassPermissions(permissions: readonly string[]) {
  // 각 권한에 대해 개별 쿼리 생성
  // 주의: permissions 배열 길이가 변경되면 훅 규칙 위반이 됨
  const perm0 = useCompassPermission(permissions[0] ?? '', { enabled: !!permissions[0] })
  const perm1 = useCompassPermission(permissions[1] ?? '', { enabled: !!permissions[1] })
  const perm2 = useCompassPermission(permissions[2] ?? '', { enabled: !!permissions[2] })
  const perm3 = useCompassPermission(permissions[3] ?? '', { enabled: !!permissions[3] })
  const perm4 = useCompassPermission(permissions[4] ?? '', { enabled: !!permissions[4] })
  const perm5 = useCompassPermission(permissions[5] ?? '', { enabled: !!permissions[5] })
  const perm6 = useCompassPermission(permissions[6] ?? '', { enabled: !!permissions[6] })
  const perm7 = useCompassPermission(permissions[7] ?? '', { enabled: !!permissions[7] })
  const perm8 = useCompassPermission(permissions[8] ?? '', { enabled: !!permissions[8] })
  const perm9 = useCompassPermission(permissions[9] ?? '', { enabled: !!permissions[9] })

  const allQueries = [perm0, perm1, perm2, perm3, perm4, perm5, perm6, perm7, perm8, perm9]
  const activeQueries = allQueries.slice(0, permissions.length)

  const isLoading = activeQueries.some((q) => q.isLoading)
  const isError = activeQueries.some((q) => q.isError)
  const allGranted = activeQueries.every((q) => q.hasPermission)

  const results = permissions.reduce(
    (acc, permission, index) => {
      acc[permission] = activeQueries[index]?.hasPermission ?? false
      return acc
    },
    {} as Record<string, boolean>
  )

  return {
    results,
    allGranted,
    isLoading,
    isError,
    refetchAll: () => activeQueries.forEach((q) => q.refetch()),
  }
}

/**
 * 사용 가능한 모든 권한 목록 조회 훅
 *
 * @example
 * ```tsx
 * function PermissionsList() {
 *   const { permissions, isLoading } = useAvailablePermissions()
 *
 *   if (isLoading) return <Spinner />
 *
 *   return (
 *     <ul>
 *       {permissions.map(p => (
 *         <li key={p.permission}>{p.permission}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useAvailablePermissions() {
  const { callTool, isHealthy } = useMCPClient()

  const query = useQuery({
    queryKey: ['mcp', 'permissions', 'list'] as const,
    queryFn: async (): Promise<ListPermissionsToolResponse> => {
      const result = await callTool({ name: 'list_permissions', args: {} })
      return result as ListPermissionsToolResponse
    },
    ...cacheConfig.static,
    enabled: isHealthy,
  })

  return {
    permissions: query.data?.permissions ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
