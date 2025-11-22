/**
 * JWT Utility
 *
 * Provides JWT token verification for Supabase tokens
 * using the jose library for modern JWT handling.
 */

import * as jose from 'jose';

// Environment variables
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? '';

/**
 * Supabase JWT payload structure
 */
export interface SupabaseJWTPayload extends jose.JWTPayload {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  email?: string;
  phone?: string;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  user_metadata?: Record<string, unknown>;
  role?: string;
  aal?: string;
  amr?: Array<{ method: string; timestamp: number }>;
  session_id?: string;
}

/**
 * Token verification result
 */
export interface TokenVerificationResult {
  valid: boolean;
  userId?: string;
  email?: string;
  error?: string;
  payload?: SupabaseJWTPayload;
}

/**
 * Validates that JWT secret is configured
 */
export function validateJWTEnvironment(): void {
  if (!SUPABASE_JWT_SECRET) {
    throw new Error('SUPABASE_JWT_SECRET environment variable is required');
  }
}

/**
 * Verifies a Supabase JWT token
 *
 * @param token - The JWT token to verify
 * @returns TokenVerificationResult with validity status and user info
 */
export async function verifyToken(
  token: string
): Promise<TokenVerificationResult> {
  if (!token) {
    return {
      valid: false,
      error: 'Token is required',
    };
  }

  // Check if JWT secret is configured
  if (!SUPABASE_JWT_SECRET) {
    return {
      valid: false,
      error: 'JWT verification is not configured',
    };
  }

  try {
    // Encode the secret
    const secret = new TextEncoder().encode(SUPABASE_JWT_SECRET);

    // Verify the token
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });

    const jwtPayload = payload as SupabaseJWTPayload;

    // Check if token has expired
    if (jwtPayload.exp && jwtPayload.exp * 1000 < Date.now()) {
      return {
        valid: false,
        error: 'Token has expired',
      };
    }

    // Check if token has required fields
    if (!jwtPayload.sub) {
      return {
        valid: false,
        error: 'Token is missing subject (user ID)',
      };
    }

    return {
      valid: true,
      userId: jwtPayload.sub,
      email: jwtPayload.email,
      payload: jwtPayload,
    };
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      return {
        valid: false,
        error: 'Token has expired',
      };
    }

    if (error instanceof jose.errors.JWTInvalid) {
      return {
        valid: false,
        error: 'Invalid token format',
      };
    }

    if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
      return {
        valid: false,
        error: 'Invalid token signature',
      };
    }

    console.error('JWT verification error:', error);
    return {
      valid: false,
      error: 'Token verification failed',
    };
  }
}

/**
 * Extracts user ID from token without full verification
 * Useful for logging or debugging, but should NOT be used for authentication
 *
 * @param token - The JWT token
 * @returns User ID if extractable, null otherwise
 */
export function extractUserIdUnsafe(token: string): string | null {
  try {
    const payload = jose.decodeJwt(token);
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/**
 * Checks if a token is close to expiration
 *
 * @param token - The JWT token
 * @param thresholdMinutes - Minutes before expiration to consider "close"
 * @returns true if token expires within threshold
 */
export function isTokenNearExpiration(
  token: string,
  thresholdMinutes: number = 5
): boolean {
  try {
    const payload = jose.decodeJwt(token);
    if (!payload.exp) {
      return true; // No expiration = consider expired
    }

    const expirationTime = payload.exp * 1000;
    const thresholdMs = thresholdMinutes * 60 * 1000;

    return Date.now() + thresholdMs > expirationTime;
  } catch {
    return true; // Invalid token = consider expired
  }
}
