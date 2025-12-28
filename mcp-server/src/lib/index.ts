/**
 * Library exports
 */

// Workers API 클라이언트 (Supabase 대체)
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

// 이전 버전 호환성을 위한 deprecated exports
export {
  createServiceClient,
  createAnonClient,
} from './supabase.js';

// JWT 유틸리티
export {
  verifyToken,
  validateJWTEnvironment,
  extractUserIdUnsafe,
  isTokenNearExpiration,
  type SupabaseJWTPayload,
  type TokenVerificationResult,
} from './jwt.js';
