/**
 * Admin API 핸들러
 * MCP Server 등 내부 서비스에서 사용하는 관리자 전용 엔드포인트
 *
 * X-Service-Key 인증 필수
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { requireServiceKey } from '../../middleware/service-key';

const admin = new Hono<AppType>();

// 모든 Admin API는 서비스 키 인증 필수
admin.use('*', requireServiceKey);

/**
 * 사용자 통합 데이터 조회
 *
 * MCP Server의 compass_integration_view 대체
 * 사용자 정보 + 구독 정보를 통합하여 반환
 */
admin.get('/users/:userId/integration', async (c) => {
  const db = c.env.DB;
  const userId = c.req.param('userId');

  try {
    // 사용자 기본 정보 조회
    const user = await db
      .prepare(`
        SELECT
          id as user_id,
          email,
          name,
          avatar_url
        FROM users
        WHERE id = ?
      `)
      .bind(userId)
      .first<{
        user_id: string;
        email: string;
        name: string | null;
        avatar_url: string | null;
      }>();

    if (!user) {
      return c.json({
        error: 'Not Found',
        message: '사용자를 찾을 수 없습니다.',
        success: false,
      }, 404);
    }

    // 활성 구독 정보 조회
    const subscription = await db
      .prepare(`
        SELECT
          s.status,
          sp.name as plan_name,
          sp.features as plan_features,
          s.valid_until
        FROM subscriptions s
        LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE s.user_id = ?
          AND s.status IN ('active', 'trialing', 'past_due')
        ORDER BY s.created_at DESC
        LIMIT 1
      `)
      .bind(userId)
      .first<{
        status: string;
        plan_name: string | null;
        plan_features: string | null;
        valid_until: string | null;
      }>();

    // 구독 상태 결정
    let subscriptionStatus: 'active' | 'inactive' | 'past_due' = 'inactive';
    if (subscription) {
      if (subscription.status === 'past_due') {
        subscriptionStatus = 'past_due';
      } else if (subscription.status === 'active' || subscription.status === 'trialing') {
        subscriptionStatus = 'active';
      }
    }

    // plan_features JSON 파싱
    let planFeatures: string[] | null = null;
    if (subscription?.plan_features) {
      try {
        planFeatures = JSON.parse(subscription.plan_features);
      } catch {
        planFeatures = null;
      }
    }

    return c.json({
      user_id: user.user_id,
      email: user.email,
      name: user.name ?? '',
      avatar_url: user.avatar_url,
      subscription_status: subscriptionStatus,
      plan_name: subscription?.plan_name ?? null,
      plan_features: planFeatures,
      valid_until: subscription?.valid_until ?? null,
    });
  } catch (error) {
    console.error('[Admin API] 사용자 통합 데이터 조회 오류:', error);
    return c.json({
      error: 'Internal Server Error',
      message: '데이터 조회 중 오류가 발생했습니다.',
      success: false,
    }, 500);
  }
});

/**
 * 사용자 정보 조회 (관리자용)
 */
admin.get('/users/:userId', async (c) => {
  const db = c.env.DB;
  const userId = c.req.param('userId');

  try {
    const user = await db
      .prepare(`
        SELECT
          id,
          email,
          name,
          avatar_url,
          is_active as is_admin,
          created_at,
          updated_at
        FROM users
        WHERE id = ?
      `)
      .bind(userId)
      .first();

    if (!user) {
      return c.json({
        error: 'Not Found',
        message: '사용자를 찾을 수 없습니다.',
        success: false,
      }, 404);
    }

    return c.json(user);
  } catch (error) {
    console.error('[Admin API] 사용자 조회 오류:', error);
    return c.json({
      error: 'Internal Server Error',
      message: '사용자 조회 중 오류가 발생했습니다.',
      success: false,
    }, 500);
  }
});

/**
 * 사용자 구독 정보 조회 (관리자용)
 */
admin.get('/users/:userId/subscription', async (c) => {
  const db = c.env.DB;
  const userId = c.req.param('userId');

  try {
    const subscription = await db
      .prepare(`
        SELECT
          s.id,
          s.user_id,
          s.plan_id,
          sp.name as plan_name,
          s.status,
          s.valid_until,
          sp.features
        FROM subscriptions s
        LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE s.user_id = ?
        ORDER BY s.created_at DESC
        LIMIT 1
      `)
      .bind(userId)
      .first<{
        id: string;
        user_id: string;
        plan_id: string;
        plan_name: string | null;
        status: string;
        valid_until: string | null;
        features: string | null;
      }>();

    if (!subscription) {
      return c.json({
        error: 'Not Found',
        message: '구독 정보를 찾을 수 없습니다.',
        success: false,
      }, 404);
    }

    // features JSON 파싱
    let features: string[] = [];
    if (subscription.features) {
      try {
        features = JSON.parse(subscription.features);
      } catch {
        features = [];
      }
    }

    return c.json({
      id: subscription.id,
      user_id: subscription.user_id,
      plan_id: subscription.plan_id,
      plan_name: subscription.plan_name,
      status: subscription.status,
      valid_until: subscription.valid_until,
      features,
    });
  } catch (error) {
    console.error('[Admin API] 구독 조회 오류:', error);
    return c.json({
      error: 'Internal Server Error',
      message: '구독 조회 중 오류가 발생했습니다.',
      success: false,
    }, 500);
  }
});

/**
 * 권한 확인 (관리자용)
 */
admin.post('/permissions/check', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json<{
    user_id: string;
    permission: string;
  }>();

  if (!body.user_id || !body.permission) {
    return c.json({
      error: 'Bad Request',
      message: 'user_id와 permission이 필요합니다.',
      success: false,
    }, 400);
  }

  try {
    // 사용자 구독 정보 조회
    const subscription = await db
      .prepare(`
        SELECT
          sp.name as plan_name,
          sp.features as plan_features,
          s.status
        FROM subscriptions s
        LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE s.user_id = ?
          AND s.status IN ('active', 'trialing')
        ORDER BY s.created_at DESC
        LIMIT 1
      `)
      .bind(body.user_id)
      .first<{
        plan_name: string | null;
        plan_features: string | null;
        status: string;
      }>();

    // 플랜 레벨 정의
    const PERMISSION_LEVELS: Record<string, number> = {
      trial: 0,
      basic: 1,
      pro: 2,
      enterprise: 3,
    };

    // 기능별 필요 플랜
    const FEATURE_REQUIREMENTS: Record<string, string> = {
      access_compass_basic: 'basic',
      access_compass_pro: 'pro',
      access_compass_enterprise: 'enterprise',
      export_data: 'pro',
      advanced_analytics: 'pro',
      team_collaboration: 'enterprise',
      priority_support: 'enterprise',
      api_access: 'pro',
      custom_integrations: 'enterprise',
    };

    const userPlan = subscription?.plan_name?.toLowerCase() ?? 'trial';
    const requiredPlan = FEATURE_REQUIREMENTS[body.permission];

    if (!requiredPlan) {
      return c.json({
        allowed: false,
        reason: `알 수 없는 권한: ${body.permission}`,
      });
    }

    const userLevel = PERMISSION_LEVELS[userPlan] ?? 0;
    const requiredLevel = PERMISSION_LEVELS[requiredPlan] ?? 0;

    if (userLevel >= requiredLevel) {
      return c.json({ allowed: true });
    }

    return c.json({
      allowed: false,
      reason: `${requiredPlan} 플랜 이상이 필요합니다. 현재 플랜: ${userPlan}`,
    });
  } catch (error) {
    console.error('[Admin API] 권한 확인 오류:', error);
    return c.json({
      error: 'Internal Server Error',
      message: '권한 확인 중 오류가 발생했습니다.',
      success: false,
    }, 500);
  }
});

export default admin;
