/**
 * MCP Sync Types
 *
 * MCP 캐시 관리 및 상태 동기화 관련 타입 정의
 *
 * @module types/mcp-sync
 */

import type { ServiceId, HealthStatus } from './central-hub.types';

// ============================================================================
// Service State Types
// ============================================================================

/**
 * MCP 서비스 상태
 */
export interface MCPServiceState {
  /** 서비스 이름 (Minu 서비스 ID) */
  service_name: ServiceId;
  /** 서비스 상태 */
  status: HealthStatus;
  /** 마지막 헬스체크 시간 (ISO 8601) */
  last_heartbeat: string;
  /** 서비스 버전 */
  version: string;
  /** 서비스 메트릭 (response_time_ms, error_rate, request_count 등) */
  metrics: Record<string, number>;
}

/**
 * 서비스 상태 업데이트 요청
 */
export interface MCPServiceStateUpdate {
  /** 서비스 이름 */
  service_name: ServiceId;
  /** 업데이트할 상태 (선택) */
  status?: HealthStatus;
  /** 업데이트할 메트릭 (선택) */
  metrics?: Record<string, number>;
}

// ============================================================================
// Sync Result Types
// ============================================================================

/**
 * MCP 동기화 결과 (useMCPSync 반환 타입)
 */
export interface MCPSyncResult {
  /** 모든 서비스 상태 목록 */
  states: MCPServiceState[];
  /** 로딩 중 여부 */
  isLoading: boolean;
  /** 에러 객체 */
  error: Error | null;
  /** 수동 새로고침 함수 */
  refresh: () => void;
  /** 캐시 무효화 함수 */
  invalidate: () => void;
}

/**
 * 단일 서비스 동기화 결과
 */
export interface MCPServiceSyncResult {
  /** 서비스 상태 */
  state: MCPServiceState | null;
  /** 로딩 중 여부 */
  isLoading: boolean;
  /** 에러 객체 */
  error: Error | null;
  /** 수동 새로고침 함수 */
  refresh: () => void;
  /** 캐시 무효화 함수 */
  invalidate: () => void;
}

// ============================================================================
// Cache Types
// ============================================================================

/**
 * MCP 캐시 설정
 */
export interface MCPCacheConfig {
  /** TTL (밀리초, 기본 5분) */
  ttl: number;
  /** stale time (밀리초, 기본 5분) */
  staleTime: number;
  /** gc time (밀리초, 기본 10분) */
  gcTime: number;
}

/**
 * MCP 캐시 결과 (useMCPCache 반환 타입)
 */
export interface MCPCacheResult {
  /** 캐시된 서비스 상태 목록 */
  cachedStates: MCPServiceState[];
  /** 캐시 히트 여부 */
  isCacheHit: boolean;
  /** 마지막 캐시 갱신 시간 */
  lastUpdated: Date | null;
  /** 캐시 무효화 함수 */
  invalidate: () => void;
  /** 캐시 갱신 함수 */
  refresh: () => Promise<void>;
  /** 캐시 만료 여부 */
  isStale: boolean;
}

// ============================================================================
// Hook Options Types
// ============================================================================

/**
 * useMCPSync 옵션
 */
export interface UseMCPSyncOptions {
  /** 자동 갱신 여부 (기본 true) */
  autoRefresh?: boolean;
  /** 자동 갱신 간격 (밀리초, 기본 30초) */
  refreshInterval?: number;
  /** Realtime 구독 여부 (기본 true) */
  enableRealtime?: boolean;
  /** 초기 로드 시 캐시 우선 사용 여부 (기본 true) */
  useCachedFirst?: boolean;
}

/**
 * useMCPServiceSync 옵션
 */
export interface UseMCPServiceSyncOptions extends UseMCPSyncOptions {
  /** 조회할 서비스 ID */
  serviceId: ServiceId;
}

/**
 * useMCPCache 옵션
 */
export interface UseMCPCacheOptions {
  /** TTL (밀리초, 기본 5분) */
  ttl?: number;
  /** 자동 갱신 여부 (기본 false) */
  autoRefresh?: boolean;
  /** 자동 갱신 간격 (밀리초, 기본 5분) */
  refreshInterval?: number;
}

// ============================================================================
// Realtime Types
// ============================================================================

/**
 * Realtime 이벤트 페이로드
 */
export interface MCPRealtimePayload {
  /** 이벤트 유형 */
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  /** 이전 데이터 (UPDATE, DELETE 시) */
  old?: Partial<MCPServiceState>;
  /** 새 데이터 (INSERT, UPDATE 시) */
  new?: MCPServiceState;
}

/**
 * Realtime 구독 상태
 */
export type MCPRealtimeStatus =
  | 'SUBSCRIBED'
  | 'CHANNEL_ERROR'
  | 'TIMED_OUT'
  | 'CLOSED';

// ============================================================================
// Error Types
// ============================================================================

/**
 * MCP Sync 에러 코드
 */
export type MCPSyncErrorCode =
  | 'MCP_SYNC_001' // 상태 조회 실패
  | 'MCP_SYNC_002' // 상태 업데이트 실패
  | 'MCP_SYNC_003' // Realtime 구독 실패
  | 'MCP_SYNC_004' // 캐시 무효화 실패
  | 'MCP_SYNC_005' // 네트워크 오류
  | 'MCP_SYNC_006'; // 알 수 없는 오류

/**
 * 에러 코드별 메시지 매핑
 */
export const MCP_SYNC_ERROR_MESSAGES: Record<MCPSyncErrorCode, string> = {
  MCP_SYNC_001: '서비스 상태 조회에 실패했습니다',
  MCP_SYNC_002: '서비스 상태 업데이트에 실패했습니다',
  MCP_SYNC_003: 'Realtime 구독에 실패했습니다',
  MCP_SYNC_004: '캐시 무효화에 실패했습니다',
  MCP_SYNC_005: '네트워크 연결에 실패했습니다',
  MCP_SYNC_006: '알 수 없는 오류가 발생했습니다',
};

/**
 * MCP Sync 에러
 */
export interface MCPSyncError {
  /** 에러 코드 */
  code: MCPSyncErrorCode;
  /** 에러 메시지 */
  message: string;
  /** 상세 정보 */
  details?: string;
  /** 원본 에러 */
  cause?: Error;
  /** 타임스탬프 */
  timestamp: string;
}

/**
 * MCP Sync 에러 생성 헬퍼
 */
export function createMCPSyncError(
  code: MCPSyncErrorCode,
  details?: string,
  cause?: Error
): MCPSyncError {
  return {
    code,
    message: MCP_SYNC_ERROR_MESSAGES[code],
    details,
    cause,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Constants
// ============================================================================

/**
 * 기본 TTL (밀리초) - 5분
 */
export const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/**
 * 기본 stale time (밀리초) - 5분
 */
export const DEFAULT_STALE_TIME = 5 * 60 * 1000;

/**
 * 기본 gc time (밀리초) - 10분
 */
export const DEFAULT_GC_TIME = 10 * 60 * 1000;

/**
 * 기본 자동 갱신 간격 (밀리초) - 30초
 */
export const DEFAULT_REFRESH_INTERVAL = 30 * 1000;

/**
 * 재시도 횟수
 */
export const DEFAULT_RETRY_COUNT = 3;

/**
 * 재시도 지연 시간 (밀리초)
 */
export const DEFAULT_RETRY_DELAY = 1000;
