/**
 * 권한 시스템 테스트
 *
 * 플랜별 권한 매핑 및 Feature Requirements 검증
 * - PERMISSION_LEVELS 상수 검증
 * - FEATURE_REQUIREMENTS 매핑 검증
 * - hasPermission 함수 로직 검증
 * - 플랜 계층 구조 검증
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupTestEnvironment, cleanupTestEnvironment } from './setup.js';

describe('권한 시스템 (Permission System)', () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  // ============================================================
  // PERMISSION_LEVELS 상수 테스트
  // ============================================================
  describe('PERMISSION_LEVELS 상수', () => {
    it('모든 플랜 레벨이 정의되어 있어야 합니다', async () => {
      const { PERMISSION_LEVELS } = await import('../src/lib/supabase.js');

      expect(PERMISSION_LEVELS).toHaveProperty('trial');
      expect(PERMISSION_LEVELS).toHaveProperty('basic');
      expect(PERMISSION_LEVELS).toHaveProperty('pro');
      expect(PERMISSION_LEVELS).toHaveProperty('enterprise');
    });

    it('플랜 레벨이 올바른 계층 구조를 가져야 합니다', async () => {
      const { PERMISSION_LEVELS } = await import('../src/lib/supabase.js');

      // 계층 구조: trial(0) < basic(1) < pro(2) < enterprise(3)
      expect(PERMISSION_LEVELS.trial).toBeLessThan(PERMISSION_LEVELS.basic);
      expect(PERMISSION_LEVELS.basic).toBeLessThan(PERMISSION_LEVELS.pro);
      expect(PERMISSION_LEVELS.pro).toBeLessThan(PERMISSION_LEVELS.enterprise);
    });

    it('trial 플랜이 최하위 레벨(0)이어야 합니다', async () => {
      const { PERMISSION_LEVELS } = await import('../src/lib/supabase.js');

      expect(PERMISSION_LEVELS.trial).toBe(0);
    });

    it('enterprise 플랜이 최상위 레벨(3)이어야 합니다', async () => {
      const { PERMISSION_LEVELS } = await import('../src/lib/supabase.js');

      expect(PERMISSION_LEVELS.enterprise).toBe(3);
    });

    it('각 플랜 레벨이 정수여야 합니다', async () => {
      const { PERMISSION_LEVELS } = await import('../src/lib/supabase.js');

      Object.values(PERMISSION_LEVELS).forEach((level) => {
        expect(Number.isInteger(level)).toBe(true);
      });
    });
  });

  // ============================================================
  // FEATURE_REQUIREMENTS 매핑 테스트
  // ============================================================
  describe('FEATURE_REQUIREMENTS 매핑', () => {
    it('모든 기본 기능이 정의되어 있어야 합니다', async () => {
      const { FEATURE_REQUIREMENTS } = await import('../src/lib/supabase.js');

      // 필수 기능 목록
      const requiredFeatures = [
        'access_compass_basic',
        'access_compass_pro',
        'access_compass_enterprise',
        'export_data',
        'advanced_analytics',
        'team_collaboration',
        'priority_support',
        'api_access',
        'custom_integrations',
      ];

      requiredFeatures.forEach((feature) => {
        expect(FEATURE_REQUIREMENTS).toHaveProperty(feature);
      });
    });

    describe('Basic 플랜 기능', () => {
      it('access_compass_basic은 basic 플랜이 필요합니다', async () => {
        const { FEATURE_REQUIREMENTS } = await import('../src/lib/supabase.js');

        expect(FEATURE_REQUIREMENTS.access_compass_basic).toBe('basic');
      });
    });

    describe('Pro 플랜 기능', () => {
      it('access_compass_pro는 pro 플랜이 필요합니다', async () => {
        const { FEATURE_REQUIREMENTS } = await import('../src/lib/supabase.js');

        expect(FEATURE_REQUIREMENTS.access_compass_pro).toBe('pro');
      });

      it('export_data는 pro 플랜이 필요합니다', async () => {
        const { FEATURE_REQUIREMENTS } = await import('../src/lib/supabase.js');

        expect(FEATURE_REQUIREMENTS.export_data).toBe('pro');
      });

      it('advanced_analytics는 pro 플랜이 필요합니다', async () => {
        const { FEATURE_REQUIREMENTS } = await import('../src/lib/supabase.js');

        expect(FEATURE_REQUIREMENTS.advanced_analytics).toBe('pro');
      });

      it('api_access는 pro 플랜이 필요합니다', async () => {
        const { FEATURE_REQUIREMENTS } = await import('../src/lib/supabase.js');

        expect(FEATURE_REQUIREMENTS.api_access).toBe('pro');
      });
    });

    describe('Enterprise 플랜 기능', () => {
      it('access_compass_enterprise는 enterprise 플랜이 필요합니다', async () => {
        const { FEATURE_REQUIREMENTS } = await import('../src/lib/supabase.js');

        expect(FEATURE_REQUIREMENTS.access_compass_enterprise).toBe('enterprise');
      });

      it('team_collaboration은 enterprise 플랜이 필요합니다', async () => {
        const { FEATURE_REQUIREMENTS } = await import('../src/lib/supabase.js');

        expect(FEATURE_REQUIREMENTS.team_collaboration).toBe('enterprise');
      });

      it('priority_support는 enterprise 플랜이 필요합니다', async () => {
        const { FEATURE_REQUIREMENTS } = await import('../src/lib/supabase.js');

        expect(FEATURE_REQUIREMENTS.priority_support).toBe('enterprise');
      });

      it('custom_integrations은 enterprise 플랜이 필요합니다', async () => {
        const { FEATURE_REQUIREMENTS } = await import('../src/lib/supabase.js');

        expect(FEATURE_REQUIREMENTS.custom_integrations).toBe('enterprise');
      });
    });

    it('모든 기능의 필요 플랜이 유효한 플랜이어야 합니다', async () => {
      const { FEATURE_REQUIREMENTS, PERMISSION_LEVELS } = await import(
        '../src/lib/supabase.js'
      );

      const validPlans = Object.keys(PERMISSION_LEVELS);

      Object.values(FEATURE_REQUIREMENTS).forEach((requiredPlan) => {
        expect(validPlans).toContain(requiredPlan);
      });
    });
  });

  // ============================================================
  // hasPermission 함수 테스트
  // ============================================================
  describe('hasPermission 함수', () => {
    describe('동일 플랜 접근', () => {
      it('basic 플랜 사용자가 basic 기능에 접근 가능해야 합니다', async () => {
        const { hasPermission } = await import('../src/lib/supabase.js');

        const result = hasPermission('basic', 'access_compass_basic');

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('pro 플랜 사용자가 pro 기능에 접근 가능해야 합니다', async () => {
        const { hasPermission } = await import('../src/lib/supabase.js');

        const result = hasPermission('pro', 'access_compass_pro');

        expect(result.allowed).toBe(true);
      });

      it('enterprise 플랜 사용자가 enterprise 기능에 접근 가능해야 합니다', async () => {
        const { hasPermission } = await import('../src/lib/supabase.js');

        const result = hasPermission('enterprise', 'access_compass_enterprise');

        expect(result.allowed).toBe(true);
      });
    });

    describe('상위 플랜으로 하위 기능 접근', () => {
      it('pro 플랜 사용자가 basic 기능에 접근 가능해야 합니다', async () => {
        const { hasPermission } = await import('../src/lib/supabase.js');

        const result = hasPermission('pro', 'access_compass_basic');

        expect(result.allowed).toBe(true);
      });

      it('enterprise 플랜 사용자가 pro 기능에 접근 가능해야 합니다', async () => {
        const { hasPermission } = await import('../src/lib/supabase.js');

        const result = hasPermission('enterprise', 'access_compass_pro');

        expect(result.allowed).toBe(true);
      });

      it('enterprise 플랜 사용자가 basic 기능에 접근 가능해야 합니다', async () => {
        const { hasPermission } = await import('../src/lib/supabase.js');

        const result = hasPermission('enterprise', 'access_compass_basic');

        expect(result.allowed).toBe(true);
      });

      it('enterprise 플랜 사용자가 모든 기능에 접근 가능해야 합니다', async () => {
        const { hasPermission, FEATURE_REQUIREMENTS } = await import('../src/lib/supabase.js');

        // 모든 기능에 대해 enterprise 사용자 접근 테스트
        Object.keys(FEATURE_REQUIREMENTS).forEach((feature) => {
          const result = hasPermission('enterprise', feature);
          expect(result.allowed).toBe(true);
        });
      });
    });

    describe('하위 플랜으로 상위 기능 접근 불가', () => {
      it('trial 플랜 사용자가 basic 기능에 접근 불가해야 합니다', async () => {
        const { hasPermission } = await import('../src/lib/supabase.js');

        const result = hasPermission('trial', 'access_compass_basic');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Requires basic plan');
        expect(result.reason).toContain('Current plan: trial');
      });

      it('basic 플랜 사용자가 pro 기능에 접근 불가해야 합니다', async () => {
        const { hasPermission } = await import('../src/lib/supabase.js');

        const result = hasPermission('basic', 'access_compass_pro');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Requires pro plan');
      });

      it('pro 플랜 사용자가 enterprise 기능에 접근 불가해야 합니다', async () => {
        const { hasPermission } = await import('../src/lib/supabase.js');

        const result = hasPermission('pro', 'team_collaboration');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Requires enterprise plan');
      });

      it('basic 플랜 사용자가 enterprise 기능에 접근 불가해야 합니다', async () => {
        const { hasPermission } = await import('../src/lib/supabase.js');

        const result = hasPermission('basic', 'team_collaboration');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Requires enterprise plan');
      });
    });

    describe('null/undefined 플랜 처리', () => {
      it('null 플랜은 trial로 처리되어야 합니다', async () => {
        const { hasPermission } = await import('../src/lib/supabase.js');

        const result = hasPermission(null, 'access_compass_basic');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Current plan: trial');
      });
    });

    describe('대소문자 처리', () => {
      it('플랜명 대문자를 소문자로 정규화해야 합니다', async () => {
        const { hasPermission } = await import('../src/lib/supabase.js');

        const result = hasPermission('PRO', 'access_compass_pro');

        expect(result.allowed).toBe(true);
      });

      it('혼합 대소문자 플랜명을 처리해야 합니다', async () => {
        const { hasPermission } = await import('../src/lib/supabase.js');

        const result = hasPermission('EnTerPrise', 'team_collaboration');

        expect(result.allowed).toBe(true);
      });
    });

    describe('알 수 없는 권한 처리', () => {
      it('존재하지 않는 권한에 대해 접근 거부해야 합니다', async () => {
        const { hasPermission } = await import('../src/lib/supabase.js');

        const result = hasPermission('enterprise', 'unknown_feature');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Unknown permission');
        expect(result.reason).toContain('unknown_feature');
      });
    });

    describe('알 수 없는 플랜 처리', () => {
      it('존재하지 않는 플랜은 trial(0) 레벨로 처리되어야 합니다', async () => {
        const { hasPermission } = await import('../src/lib/supabase.js');

        const result = hasPermission('unknown_plan', 'access_compass_basic');

        expect(result.allowed).toBe(false);
        // 알 수 없는 플랜은 trial(0) 레벨로 처리되므로 basic 기능 접근 불가
      });
    });
  });

  // ============================================================
  // 플랜 계층 구조 종합 테스트
  // ============================================================
  describe('플랜 계층 구조 종합 검증', () => {
    it('모든 플랜의 접근 권한 매트릭스가 올바라야 합니다', async () => {
      const { hasPermission, FEATURE_REQUIREMENTS, PERMISSION_LEVELS } = await import(
        '../src/lib/supabase.js'
      );

      const plans = ['trial', 'basic', 'pro', 'enterprise'];

      // 각 플랜별 접근 가능한 기능 수 계산
      const accessCounts = plans.map((plan) => {
        let count = 0;
        Object.keys(FEATURE_REQUIREMENTS).forEach((feature) => {
          if (hasPermission(plan, feature).allowed) {
            count++;
          }
        });
        return count;
      });

      // 상위 플랜일수록 더 많은 기능에 접근 가능해야 함
      for (let i = 0; i < accessCounts.length - 1; i++) {
        expect(accessCounts[i]).toBeLessThanOrEqual(accessCounts[i + 1]);
      }
    });

    it('trial 플랜은 어떤 유료 기능에도 접근할 수 없어야 합니다', async () => {
      const { hasPermission, FEATURE_REQUIREMENTS } = await import('../src/lib/supabase.js');

      Object.keys(FEATURE_REQUIREMENTS).forEach((feature) => {
        const result = hasPermission('trial', feature);
        expect(result.allowed).toBe(false);
      });
    });

    it('플랜 레벨 값이 연속적이어야 합니다 (0, 1, 2, 3)', async () => {
      const { PERMISSION_LEVELS } = await import('../src/lib/supabase.js');

      const levels = Object.values(PERMISSION_LEVELS).sort((a, b) => a - b);

      expect(levels).toEqual([0, 1, 2, 3]);
    });
  });
});
