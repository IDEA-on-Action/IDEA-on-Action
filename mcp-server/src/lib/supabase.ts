/**
 * Supabase Client Utility (Workers API로 마이그레이션됨)
 *
 * 이 파일은 이전 버전과의 호환성을 위해 유지됩니다.
 * 실제 구현은 workers-api.ts로 이동되었습니다.
 *
 * 주요 변경사항:
 * - Supabase 직접 연결 → Cloudflare Workers API 사용
 * - createServiceClient/createAnonClient 제거 (Workers API 사용)
 * - fetchUserIntegrationData는 Workers API를 통해 데이터 조회
 *
 * @deprecated 새로운 코드에서는 './workers-api.js'를 직접 import하세요
 */

// Workers API 클라이언트에서 모든 기능 re-export
export {
  validateEnvironment,
  fetchUserIntegrationData,
  hasPermission,
  PERMISSION_LEVELS,
  FEATURE_REQUIREMENTS,
  type CompassIntegrationData,
  usersApi,
  subscriptionsApi,
  permissionsApi,
  healthApi,
} from './workers-api.js';

// 기본 내보내기
export { default } from './workers-api.js';

/**
 * @deprecated Supabase 직접 연결은 더 이상 사용되지 않습니다.
 * Workers API를 통해 데이터에 접근합니다.
 */
export function createServiceClient(): never {
  throw new Error(
    'createServiceClient는 더 이상 지원되지 않습니다. ' +
    'Workers API (workers-api.ts)를 사용하세요.'
  );
}

/**
 * @deprecated Supabase 직접 연결은 더 이상 사용되지 않습니다.
 * Workers API를 통해 데이터에 접근합니다.
 */
export function createAnonClient(): never {
  throw new Error(
    'createAnonClient는 더 이상 지원되지 않습니다. ' +
    'Workers API (workers-api.ts)를 사용하세요.'
  );
}
