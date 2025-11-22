/**
 * Library exports
 */

export {
  createServiceClient,
  createAnonClient,
  validateEnvironment,
  fetchUserIntegrationData,
  hasPermission,
  PERMISSION_LEVELS,
  FEATURE_REQUIREMENTS,
  type CompassIntegrationData,
} from './supabase.js';

export {
  verifyToken,
  validateJWTEnvironment,
  extractUserIdUnsafe,
  isTokenNearExpiration,
  type SupabaseJWTPayload,
  type TokenVerificationResult,
} from './jwt.js';
