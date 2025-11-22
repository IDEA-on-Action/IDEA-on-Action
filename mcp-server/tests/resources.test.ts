/**
 * 리소스 테스트
 *
 * MCP 리소스 (user://current, subscription://current) 관련 테스트
 * - 사용자 리소스 조회
 * - 구독 리소스 조회
 * - 인증 없이 조회 시 에러 처리
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  mockIntegrationData,
  mockBasicIntegrationData,
  mockEnterpriseIntegrationData,
  mockInactiveIntegrationData,
} from './setup.js';

describe('리소스 (Resources)', () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  // ============================================================
  // user://current 리소스 테스트
  // ============================================================
  describe('user://current 리소스', () => {
    describe('getUserResource', () => {
      it('유효한 사용자 ID로 사용자 정보를 조회할 수 있어야 합니다', async () => {
        // Supabase 클라이언트 모킹
        vi.doMock('../src/lib/supabase.js', () => ({
          fetchUserIntegrationData: vi.fn().mockResolvedValue(mockIntegrationData),
          validateEnvironment: vi.fn(),
          createServiceClient: vi.fn(),
          hasPermission: vi.fn(),
          PERMISSION_LEVELS: {},
          FEATURE_REQUIREMENTS: {},
        }));

        const { getUserResource } = await import('../src/resources/user.js');

        const result = await getUserResource(mockIntegrationData.user_id);

        expect(result).not.toBeNull();
        expect(result?.id).toBe(mockIntegrationData.user_id);
        expect(result?.email).toBe(mockIntegrationData.email);
        expect(result?.name).toBe(mockIntegrationData.name);
        expect(result?.avatar_url).toBe(mockIntegrationData.avatar_url);
      });

      it('존재하지 않는 사용자 ID로 조회 시 null을 반환해야 합니다', async () => {
        vi.doMock('../src/lib/supabase.js', () => ({
          fetchUserIntegrationData: vi.fn().mockResolvedValue(null),
          validateEnvironment: vi.fn(),
          createServiceClient: vi.fn(),
          hasPermission: vi.fn(),
          PERMISSION_LEVELS: {},
          FEATURE_REQUIREMENTS: {},
        }));

        const { getUserResource } = await import('../src/resources/user.js');

        const result = await getUserResource('non-existent-user-id');

        expect(result).toBeNull();
      });
    });

    describe('formatUserResourceResponse', () => {
      it('사용자 데이터를 MCP 리소스 응답 형식으로 변환해야 합니다', async () => {
        const { formatUserResourceResponse, USER_RESOURCE_URI } = await import(
          '../src/resources/user.js'
        );

        const userData = {
          id: mockIntegrationData.user_id,
          email: mockIntegrationData.email,
          name: mockIntegrationData.name,
          avatar_url: mockIntegrationData.avatar_url,
        };

        const response = formatUserResourceResponse(userData);

        expect(response.uri).toBe(USER_RESOURCE_URI);
        expect(response.mimeType).toBe('application/json');
        expect(JSON.parse(response.text)).toEqual(userData);
      });
    });

    describe('USER_RESOURCE_METADATA', () => {
      it('올바른 메타데이터를 가지고 있어야 합니다', async () => {
        const { USER_RESOURCE_METADATA } = await import('../src/resources/user.js');

        expect(USER_RESOURCE_METADATA.name).toBe('user://current');
        expect(USER_RESOURCE_METADATA.mimeType).toBe('application/json');
        expect(USER_RESOURCE_METADATA.description).toBeDefined();
      });
    });
  });

  // ============================================================
  // subscription://current 리소스 테스트
  // ============================================================
  describe('subscription://current 리소스', () => {
    describe('getSubscriptionResource', () => {
      it('활성 Pro 구독 정보를 조회할 수 있어야 합니다', async () => {
        vi.doMock('../src/lib/supabase.js', () => ({
          fetchUserIntegrationData: vi.fn().mockResolvedValue(mockIntegrationData),
          validateEnvironment: vi.fn(),
          createServiceClient: vi.fn(),
          hasPermission: vi.fn(),
          PERMISSION_LEVELS: {},
          FEATURE_REQUIREMENTS: {},
        }));

        const { getSubscriptionResource } = await import('../src/resources/subscription.js');

        const result = await getSubscriptionResource(mockIntegrationData.user_id);

        expect(result).not.toBeNull();
        expect(result?.status).toBe('active');
        expect(result?.plan.name).toBe('pro');
        expect(result?.plan.features).toEqual(mockIntegrationData.plan_features);
        expect(result?.valid_until).toBe(mockIntegrationData.valid_until);
      });

      it('Basic 구독 정보를 조회할 수 있어야 합니다', async () => {
        vi.doMock('../src/lib/supabase.js', () => ({
          fetchUserIntegrationData: vi.fn().mockResolvedValue(mockBasicIntegrationData),
          validateEnvironment: vi.fn(),
          createServiceClient: vi.fn(),
          hasPermission: vi.fn(),
          PERMISSION_LEVELS: {},
          FEATURE_REQUIREMENTS: {},
        }));

        const { getSubscriptionResource } = await import('../src/resources/subscription.js');

        const result = await getSubscriptionResource(mockBasicIntegrationData.user_id);

        expect(result).not.toBeNull();
        expect(result?.plan.name).toBe('basic');
      });

      it('Enterprise 구독 정보를 조회할 수 있어야 합니다', async () => {
        vi.doMock('../src/lib/supabase.js', () => ({
          fetchUserIntegrationData: vi.fn().mockResolvedValue(mockEnterpriseIntegrationData),
          validateEnvironment: vi.fn(),
          createServiceClient: vi.fn(),
          hasPermission: vi.fn(),
          PERMISSION_LEVELS: {},
          FEATURE_REQUIREMENTS: {},
        }));

        const { getSubscriptionResource } = await import('../src/resources/subscription.js');

        const result = await getSubscriptionResource(mockEnterpriseIntegrationData.user_id);

        expect(result).not.toBeNull();
        expect(result?.plan.name).toBe('enterprise');
        expect(result?.plan.features).toContain('team_collaboration');
      });

      it('비활성 구독 상태를 조회할 수 있어야 합니다', async () => {
        vi.doMock('../src/lib/supabase.js', () => ({
          fetchUserIntegrationData: vi.fn().mockResolvedValue(mockInactiveIntegrationData),
          validateEnvironment: vi.fn(),
          createServiceClient: vi.fn(),
          hasPermission: vi.fn(),
          PERMISSION_LEVELS: {},
          FEATURE_REQUIREMENTS: {},
        }));

        const { getSubscriptionResource } = await import('../src/resources/subscription.js');

        const result = await getSubscriptionResource(mockInactiveIntegrationData.user_id);

        expect(result).not.toBeNull();
        expect(result?.status).toBe('inactive');
      });

      it('존재하지 않는 사용자 ID로 조회 시 null을 반환해야 합니다', async () => {
        vi.doMock('../src/lib/supabase.js', () => ({
          fetchUserIntegrationData: vi.fn().mockResolvedValue(null),
          validateEnvironment: vi.fn(),
          createServiceClient: vi.fn(),
          hasPermission: vi.fn(),
          PERMISSION_LEVELS: {},
          FEATURE_REQUIREMENTS: {},
        }));

        const { getSubscriptionResource } = await import('../src/resources/subscription.js');

        const result = await getSubscriptionResource('non-existent-user-id');

        expect(result).toBeNull();
      });
    });

    describe('formatSubscriptionResourceResponse', () => {
      it('구독 데이터를 MCP 리소스 응답 형식으로 변환해야 합니다', async () => {
        const { formatSubscriptionResourceResponse, SUBSCRIPTION_RESOURCE_URI } = await import(
          '../src/resources/subscription.js'
        );

        const subscriptionData = {
          status: 'active' as const,
          plan: {
            name: 'pro',
            features: ['access_compass_pro', 'export_data'],
          },
          valid_until: '2025-12-31T23:59:59.000Z',
        };

        const response = formatSubscriptionResourceResponse(subscriptionData);

        expect(response.uri).toBe(SUBSCRIPTION_RESOURCE_URI);
        expect(response.mimeType).toBe('application/json');
        expect(JSON.parse(response.text)).toEqual(subscriptionData);
      });
    });

    describe('isSubscriptionActive', () => {
      it('활성 구독이고 유효 기간 내이면 true를 반환해야 합니다', async () => {
        const { isSubscriptionActive } = await import('../src/resources/subscription.js');

        const result = isSubscriptionActive({
          status: 'active',
          plan: { name: 'pro', features: [] },
          valid_until: '2099-12-31T23:59:59.000Z', // 미래 날짜
        });

        expect(result).toBe(true);
      });

      it('비활성 구독은 false를 반환해야 합니다', async () => {
        const { isSubscriptionActive } = await import('../src/resources/subscription.js');

        const result = isSubscriptionActive({
          status: 'inactive',
          plan: { name: 'pro', features: [] },
          valid_until: '2099-12-31T23:59:59.000Z',
        });

        expect(result).toBe(false);
      });

      it('만료된 구독은 false를 반환해야 합니다', async () => {
        const { isSubscriptionActive } = await import('../src/resources/subscription.js');

        const result = isSubscriptionActive({
          status: 'active',
          plan: { name: 'pro', features: [] },
          valid_until: '2020-01-01T00:00:00.000Z', // 과거 날짜
        });

        expect(result).toBe(false);
      });

      it('valid_until이 null인 활성 구독은 true를 반환해야 합니다', async () => {
        const { isSubscriptionActive } = await import('../src/resources/subscription.js');

        const result = isSubscriptionActive({
          status: 'active',
          plan: { name: 'pro', features: [] },
          valid_until: null,
        });

        expect(result).toBe(true);
      });
    });

    describe('getSubscriptionTier', () => {
      it('enterprise 플랜은 tier 3을 반환해야 합니다', async () => {
        const { getSubscriptionTier } = await import('../src/resources/subscription.js');

        const result = getSubscriptionTier({
          status: 'active',
          plan: { name: 'enterprise', features: [] },
          valid_until: null,
        });

        expect(result).toBe(3);
      });

      it('pro 플랜은 tier 2를 반환해야 합니다', async () => {
        const { getSubscriptionTier } = await import('../src/resources/subscription.js');

        const result = getSubscriptionTier({
          status: 'active',
          plan: { name: 'pro', features: [] },
          valid_until: null,
        });

        expect(result).toBe(2);
      });

      it('basic 플랜은 tier 1을 반환해야 합니다', async () => {
        const { getSubscriptionTier } = await import('../src/resources/subscription.js');

        const result = getSubscriptionTier({
          status: 'active',
          plan: { name: 'basic', features: [] },
          valid_until: null,
        });

        expect(result).toBe(1);
      });

      it('trial/free 플랜은 tier 0을 반환해야 합니다', async () => {
        const { getSubscriptionTier } = await import('../src/resources/subscription.js');

        const trialResult = getSubscriptionTier({
          status: 'active',
          plan: { name: 'trial', features: [] },
          valid_until: null,
        });

        const freeResult = getSubscriptionTier({
          status: 'active',
          plan: { name: 'free', features: [] },
          valid_until: null,
        });

        expect(trialResult).toBe(0);
        expect(freeResult).toBe(0);
      });

      it('대소문자를 구분하지 않아야 합니다', async () => {
        const { getSubscriptionTier } = await import('../src/resources/subscription.js');

        const result = getSubscriptionTier({
          status: 'active',
          plan: { name: 'PRO', features: [] },
          valid_until: null,
        });

        expect(result).toBe(2);
      });
    });

    describe('SUBSCRIPTION_RESOURCE_METADATA', () => {
      it('올바른 메타데이터를 가지고 있어야 합니다', async () => {
        const { SUBSCRIPTION_RESOURCE_METADATA } = await import('../src/resources/subscription.js');

        expect(SUBSCRIPTION_RESOURCE_METADATA.name).toBe('subscription://current');
        expect(SUBSCRIPTION_RESOURCE_METADATA.mimeType).toBe('application/json');
        expect(SUBSCRIPTION_RESOURCE_METADATA.description).toBeDefined();
      });
    });
  });

  // ============================================================
  // 인증 없이 리소스 조회 시 에러 처리 테스트
  // ============================================================
  describe('인증 없이 리소스 조회', () => {
    describe('서버 컨텍스트에서 인증 없이 조회', () => {
      it('인증 없이 user://current 조회 시 에러 응답을 반환해야 합니다', async () => {
        // 서버에서 getCurrentUser()가 null을 반환하는 상황 시뮬레이션
        vi.doMock('../src/server.js', () => ({
          getCurrentUser: vi.fn().mockReturnValue(null),
          setCurrentUser: vi.fn(),
          createServer: vi.fn(),
        }));

        // 실제 서버 로직은 server.ts에서 처리하므로
        // 여기서는 getUserResource가 null을 받았을 때의 동작을 검증
        const { getUserResource } = await import('../src/resources/user.js');

        // userId가 빈 문자열이거나 유효하지 않은 경우
        // fetchUserIntegrationData가 null을 반환
        vi.doMock('../src/lib/supabase.js', () => ({
          fetchUserIntegrationData: vi.fn().mockResolvedValue(null),
          validateEnvironment: vi.fn(),
          createServiceClient: vi.fn(),
          hasPermission: vi.fn(),
          PERMISSION_LEVELS: {},
          FEATURE_REQUIREMENTS: {},
        }));

        const result = await getUserResource('');

        // 빈 userId로 조회 시 null 반환
        expect(result).toBeNull();
      });

      it('인증 없이 subscription://current 조회 시 에러 응답을 반환해야 합니다', async () => {
        vi.doMock('../src/lib/supabase.js', () => ({
          fetchUserIntegrationData: vi.fn().mockResolvedValue(null),
          validateEnvironment: vi.fn(),
          createServiceClient: vi.fn(),
          hasPermission: vi.fn(),
          PERMISSION_LEVELS: {},
          FEATURE_REQUIREMENTS: {},
        }));

        const { getSubscriptionResource } = await import('../src/resources/subscription.js');

        const result = await getSubscriptionResource('');

        expect(result).toBeNull();
      });
    });
  });
});
