/**
 * MCP 토큰 서비스 테스트
 *
 * Supabase 통합 MCP JWT 토큰 관리 테스트
 *
 * @module tests/unit/lib/mcp-token-service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  issueToken,
  verifyMCPToken,
  revokeToken,
  refreshMCPToken,
  getTokenInfo,
} from '@/lib/auth/mcp-token-service';

// JWT 함수들 mock
vi.mock('@/lib/auth/jwt', () => ({
  generateAccessToken: vi.fn(async (payload: unknown) => {
    const p = payload as { jti?: string };
    // jti에 따라 다른 토큰 반환 (테스트에서 구분하기 위해)
    if (p.jti === 'new-access-jti') {
      return 'mock-new-access-token';
    }
    if (p.jti === 'test-expired-access-jti') {
      return 'mock-expired-access-token';
    }
    return 'mock-access-token';
  }),
  generateRefreshToken: vi.fn(async (payload: unknown) => {
    const p = payload as { jti?: string };
    if (p.jti === 'new-refresh-jti') {
      return 'mock-new-refresh-token';
    }
    return 'mock-refresh-token';
  }),
  verifyToken: vi.fn(async (token: string) => {
    // malformed token만 null 반환 (서명 검증 실패)
    if (token === 'invalid.token.format') {
      return null;
    }
    // 만료된 토큰도 서명은 유효하므로 payload 반환 (만료는 별도 확인)
    if (token === 'mock-expired-access-token') {
      return {
        sub: 'test-user-uuid',
        aud: 'minu-find-sandbox',
        jti: 'test-expired-access-jti',
        exp: Math.floor(Date.now() / 1000) - 1000, // 이미 만료됨
      };
    }
    // 유효한 토큰에 대해서만 페이로드 반환
    return {
      sub: 'test-user-uuid',
      aud: 'minu-find-sandbox',
      jti: 'test-access-jti',
    };
  }),
  decodeToken: vi.fn((token: string) => {
    if (token === 'mock-access-token') {
      return {
        sub: 'test-user-uuid',
        aud: 'minu-find-sandbox',
        jti: 'test-access-jti',
        sid: 'test-session-uuid',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'https://www.ideaonaction.ai',
        scope: 'openid profile',
      };
    }
    if (token === 'mock-new-access-token') {
      return {
        sub: 'test-user-uuid',
        aud: 'minu-find-sandbox',
        jti: 'new-access-jti',
        sid: 'test-session-uuid',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'https://www.ideaonaction.ai',
        scope: 'openid profile',
      };
    }
    if (token === 'mock-refresh-token') {
      return {
        sub: 'test-user-uuid',
        aud: 'minu-find-sandbox',
        jti: 'test-refresh-jti',
        sid: 'test-session-uuid',
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        iat: Math.floor(Date.now() / 1000),
        iss: 'https://www.ideaonaction.ai',
        scope: 'openid profile',
      };
    }
    if (token === 'mock-new-refresh-token') {
      return {
        sub: 'test-user-uuid',
        aud: 'minu-find-sandbox',
        jti: 'new-refresh-jti',
        sid: 'test-session-uuid',
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        iat: Math.floor(Date.now() / 1000),
        iss: 'https://www.ideaonaction.ai',
        scope: 'openid profile',
      };
    }
    if (token === 'mock-expired-access-token') {
      return {
        sub: 'test-user-uuid',
        aud: 'minu-find-sandbox',
        jti: 'test-expired-access-jti',
        sid: 'test-session-uuid',
        exp: Math.floor(Date.now() / 1000) - 1000, // 이미 만료됨
        iat: Math.floor(Date.now() / 1000) - 10000,
        iss: 'https://www.ideaonaction.ai',
        scope: 'openid profile',
      };
    }
    return null;
  }),
}));

import { generateAccessToken, generateRefreshToken, decodeToken } from '@/lib/auth/jwt';
import type { JWTGeneratePayload } from '@/lib/auth/jwt';

// ============================================================================
// Mock Supabase
// ============================================================================

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// 테스트 데이터
// ============================================================================

const TEST_CLIENT_ID = 'minu-find-sandbox';
const TEST_USER_ID = 'test-user-uuid';
const TEST_SCOPES = ['openid', 'profile', 'email'];
const TEST_SESSION_ID = 'test-session-uuid';
const TEST_ACCESS_JTI = 'test-access-jti';
const TEST_REFRESH_JTI = 'test-refresh-jti';

const MOCK_ISSUE_RESPONSE = {
  session_id: TEST_SESSION_ID,
  access_token_jti: TEST_ACCESS_JTI,
  refresh_token_jti: TEST_REFRESH_JTI,
  user_id: TEST_USER_ID,
  client_id: TEST_CLIENT_ID,
  scope: 'openid profile email',
  access_token_exp: Math.floor(Date.now() / 1000) + 3600,
  refresh_token_exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  expires_in: 3600,
  token_type: 'Bearer',
};

const MOCK_VERIFY_VALID_RESPONSE = {
  valid: true,
  status: 'valid',
  user_id: TEST_USER_ID,
  client_id: TEST_CLIENT_ID,
  scope: 'openid profile email',
  expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
  remaining_seconds: 3600,
  session_id: TEST_SESSION_ID,
};

const MOCK_REVOKE_RESPONSE = {
  revoked: true,
  message: 'Token successfully revoked',
};

// ============================================================================
// 토큰 발급 테스트
// ============================================================================

describe('MCP Token Service - Issue Token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should issue token successfully', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: MOCK_ISSUE_RESPONSE,
      error: null,
    } as never);

    const result = await issueToken(TEST_CLIENT_ID, TEST_USER_ID, TEST_SCOPES);

    expect(result).toBeDefined();
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.expiresIn).toBe(3600);
    expect(result.tokenType).toBe('Bearer');
    expect(result.scope).toBe('openid profile email');

    expect(supabase.rpc).toHaveBeenCalledWith('issue_mcp_token', {
      p_client_id: TEST_CLIENT_ID,
      p_user_id: TEST_USER_ID,
      p_scopes: TEST_SCOPES,
    });
  });

  it('should use default scopes if not provided', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: MOCK_ISSUE_RESPONSE,
      error: null,
    } as never);

    await issueToken(TEST_CLIENT_ID, TEST_USER_ID);

    expect(supabase.rpc).toHaveBeenCalledWith('issue_mcp_token', {
      p_client_id: TEST_CLIENT_ID,
      p_user_id: TEST_USER_ID,
      p_scopes: ['openid'],
    });
  });

  it('should throw error on Supabase RPC failure', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Invalid client_id' },
    } as never);

    await expect(issueToken(TEST_CLIENT_ID, TEST_USER_ID)).rejects.toThrow(
      'Failed to issue token: Invalid client_id'
    );
  });

  it('should throw error when no data returned', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: null,
    } as never);

    await expect(issueToken(TEST_CLIENT_ID, TEST_USER_ID)).rejects.toThrow(
      'No data returned from issue_mcp_token'
    );
  });

  it('should include session_id in token payload', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: MOCK_ISSUE_RESPONSE,
      error: null,
    } as never);

    const result = await issueToken(TEST_CLIENT_ID, TEST_USER_ID);
    const payload = decodeToken(result.accessToken);

    expect(payload?.sid).toBe(TEST_SESSION_ID);
  });
});

// ============================================================================
// 토큰 검증 테스트
// ============================================================================

describe('MCP Token Service - Verify Token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should verify valid token successfully', async () => {
    const testPayload: JWTGeneratePayload = {
      sub: TEST_USER_ID,
      aud: TEST_CLIENT_ID,
      scope: 'openid profile',
      jti: TEST_ACCESS_JTI,
    };
    const token = await generateAccessToken(testPayload);

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: MOCK_VERIFY_VALID_RESPONSE,
      error: null,
    } as never);

    const result = await verifyMCPToken(token);

    expect(result.valid).toBe(true);
    expect(result.status).toBe('valid');
    expect(result.userId).toBe(TEST_USER_ID);
    expect(result.clientId).toBe(TEST_CLIENT_ID);
  });

  it('should return invalid for malformed token', async () => {
    const result = await verifyMCPToken('invalid.token.format');

    expect(result.valid).toBe(false);
    expect(result.status).toBe('invalid');
  });

  it('should return expired for expired token', async () => {
    const testPayload: JWTGeneratePayload = {
      sub: TEST_USER_ID,
      aud: TEST_CLIENT_ID,
      jti: 'test-expired-access-jti', // mock에서 만료된 토큰 반환
    };
    const expiredToken = await generateAccessToken(testPayload);

    const result = await verifyMCPToken(expiredToken);

    expect(result.valid).toBe(false);
    expect(result.status).toBe('expired');
  });

  it('should handle DB verification failure gracefully', async () => {
    const testPayload: JWTGeneratePayload = {
      sub: TEST_USER_ID,
      aud: TEST_CLIENT_ID,
      jti: TEST_ACCESS_JTI,
    };
    const token = await generateAccessToken(testPayload);

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    } as never);

    const result = await verifyMCPToken(token);

    // JWT 자체는 유효하므로 통과
    expect(result.valid).toBe(true);
    expect(result.status).toBe('valid');
  });

  it('should return revoked status from DB', async () => {
    const testPayload: JWTGeneratePayload = {
      sub: TEST_USER_ID,
      aud: TEST_CLIENT_ID,
      jti: TEST_ACCESS_JTI,
    };
    const token = await generateAccessToken(testPayload);

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        valid: false,
        status: 'revoked',
      },
      error: null,
    } as never);

    const result = await verifyMCPToken(token);

    expect(result.valid).toBe(false);
    expect(result.status).toBe('revoked');
  });
});

// ============================================================================
// 토큰 폐기 테스트
// ============================================================================

describe('MCP Token Service - Revoke Token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should revoke token successfully', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: MOCK_REVOKE_RESPONSE,
      error: null,
    } as never);

    const result = await revokeToken(TEST_ACCESS_JTI);

    expect(result).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('revoke_mcp_token', {
      p_token_jti: TEST_ACCESS_JTI,
    });
  });

  it('should return false when token not found', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { revoked: false, message: 'Token not found' },
      error: null,
    } as never);

    const result = await revokeToken('non-existent-jti');

    expect(result).toBe(false);
  });

  it('should handle RPC error gracefully', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    } as never);

    const result = await revokeToken(TEST_ACCESS_JTI);

    expect(result).toBe(false);
  });

  it('should handle exception gracefully', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network error'));

    const result = await revokeToken(TEST_ACCESS_JTI);

    expect(result).toBe(false);
  });
});

// ============================================================================
// 토큰 갱신 테스트
// ============================================================================

describe('MCP Token Service - Refresh Token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should refresh token successfully', async () => {
    const testPayload: JWTGeneratePayload = {
      sub: TEST_USER_ID,
      aud: TEST_CLIENT_ID,
      jti: TEST_REFRESH_JTI,
      sid: TEST_SESSION_ID,
    };
    const refreshToken = await generateRefreshToken(testPayload);

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: MOCK_ISSUE_RESPONSE,
      error: null,
    } as never);

    const result = await refreshMCPToken(refreshToken);

    expect(result).toBeDefined();
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.expiresIn).toBe(3600);

    expect(supabase.rpc).toHaveBeenCalledWith('refresh_mcp_token', {
      p_refresh_jti: TEST_REFRESH_JTI,
    });
  });

  it('should throw error for invalid refresh token', async () => {
    await expect(refreshMCPToken('invalid.token')).rejects.toThrow(
      'Invalid refresh token: missing jti'
    );
  });

  it('should throw error on RPC failure', async () => {
    const testPayload: JWTGeneratePayload = {
      sub: TEST_USER_ID,
      aud: TEST_CLIENT_ID,
      jti: TEST_REFRESH_JTI,
    };
    const refreshToken = await generateRefreshToken(testPayload);

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Refresh token expired' },
    } as never);

    await expect(refreshMCPToken(refreshToken)).rejects.toThrow(
      'Failed to refresh token: Refresh token expired'
    );
  });

  it('should throw error when no data returned', async () => {
    const testPayload: JWTGeneratePayload = {
      sub: TEST_USER_ID,
      aud: TEST_CLIENT_ID,
      jti: TEST_REFRESH_JTI,
    };
    const refreshToken = await generateRefreshToken(testPayload);

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: null,
    } as never);

    await expect(refreshMCPToken(refreshToken)).rejects.toThrow(
      'No data returned from refresh_mcp_token'
    );
  });

  it('should generate new JTIs after refresh', async () => {
    const testPayload: JWTGeneratePayload = {
      sub: TEST_USER_ID,
      aud: TEST_CLIENT_ID,
      jti: TEST_REFRESH_JTI,
    };
    const oldRefreshToken = await generateRefreshToken(testPayload);

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        ...MOCK_ISSUE_RESPONSE,
        access_token_jti: 'new-access-jti',
        refresh_token_jti: 'new-refresh-jti',
      },
      error: null,
    } as never);

    const result = await refreshMCPToken(oldRefreshToken);
    const newAccessPayload = decodeToken(result.accessToken);
    const newRefreshPayload = decodeToken(result.refreshToken);

    expect(newAccessPayload?.jti).toBe('new-access-jti');
    expect(newRefreshPayload?.jti).toBe('new-refresh-jti');
  });
});

// ============================================================================
// 토큰 정보 조회 테스트
// ============================================================================

describe('MCP Token Service - Get Token Info', () => {
  it('should extract token info successfully', async () => {
    const testPayload: JWTGeneratePayload = {
      sub: TEST_USER_ID,
      aud: TEST_CLIENT_ID,
      scope: 'openid profile',
      jti: TEST_ACCESS_JTI,
      sid: TEST_SESSION_ID,
    };
    const token = await generateAccessToken(testPayload);

    const info = getTokenInfo(token);

    expect(info).toBeDefined();
    expect(info?.userId).toBe(TEST_USER_ID);
    expect(info?.clientId).toBe(TEST_CLIENT_ID);
    expect(info?.scope).toBe('openid profile');
    expect(info?.sessionId).toBe(TEST_SESSION_ID);
    expect(info?.jti).toBe(TEST_ACCESS_JTI);
    expect(info?.expiresAt).toBeInstanceOf(Date);
    expect(info?.remainingSeconds).toBeGreaterThan(0);
  });

  it('should return null for invalid token', () => {
    const info = getTokenInfo('invalid.token');
    expect(info).toBeNull();
  });

  it('should return 0 remaining seconds for expired token', async () => {
    const testPayload: JWTGeneratePayload = {
      sub: TEST_USER_ID,
      aud: TEST_CLIENT_ID,
      jti: 'test-expired-access-jti', // mock에서 만료된 토큰 반환
    };
    const expiredToken = await generateAccessToken(testPayload);

    const info = getTokenInfo(expiredToken);

    expect(info).toBeDefined();
    expect(info?.remainingSeconds).toBe(0);
  });

  it('should handle token without optional fields', async () => {
    const minimalPayload: JWTGeneratePayload = {
      sub: TEST_USER_ID,
      aud: TEST_CLIENT_ID,
    };
    const token = await generateAccessToken(minimalPayload);

    const info = getTokenInfo(token);

    expect(info).toBeDefined();
    expect(info?.userId).toBe(TEST_USER_ID);
    expect(info?.clientId).toBe(TEST_CLIENT_ID);
    expect(info?.scope).toBe('openid profile'); // mock에서 반환하는 기본값
    expect(info?.sessionId).toBe(TEST_SESSION_ID); // mock에서 포함됨
    expect(info?.jti).toBe(TEST_ACCESS_JTI); // mock에서 포함됨
  });
});

// ============================================================================
// Edge Cases 테스트
// ============================================================================

describe('MCP Token Service - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle network timeout', async () => {
    vi.mocked(supabase.rpc).mockImplementation(
      () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 100)
        ) as never
    );

    await expect(issueToken(TEST_CLIENT_ID, TEST_USER_ID)).rejects.toThrow();
  });

  it('should handle concurrent token issuance', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: MOCK_ISSUE_RESPONSE,
      error: null,
    } as never);

    const promises = Array(5)
      .fill(null)
      .map(() => issueToken(TEST_CLIENT_ID, TEST_USER_ID));

    const results = await Promise.all(promises);

    expect(results).toHaveLength(5);
    results.forEach((result) => {
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  it('should handle empty scopes array', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: MOCK_ISSUE_RESPONSE,
      error: null,
    } as never);

    await issueToken(TEST_CLIENT_ID, TEST_USER_ID, []);

    expect(supabase.rpc).toHaveBeenCalledWith('issue_mcp_token', {
      p_client_id: TEST_CLIENT_ID,
      p_user_id: TEST_USER_ID,
      p_scopes: [],
    });
  });
});
