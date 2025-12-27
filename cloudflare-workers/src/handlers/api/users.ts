/**
 * 사용자 API 핸들러
 * Wave 2: 중위험 함수
 */

import { Hono } from 'hono';
import type { Env } from '../../types';
import { authMiddleware, adminOnlyMiddleware } from '../../middleware/auth';
import { applyRLSToQuery } from '../../middleware/rls-guard';

const users = new Hono<AppType>();

// 현재 사용자 정보 조회
users.get('/me', authMiddleware, async (c) => {
  const auth = c.get('auth');
  const db = c.env.DB;

  try {
    const user = await db
      .prepare('SELECT id, email, name, avatar_url, created_at FROM users WHERE id = ?')
      .bind(auth.userId)
      .first();

    if (!user) {
      return c.json({ error: '사용자를 찾을 수 없습니다' }, 404);
    }

    // 프로필 정보 조회
    const profile = await db
      .prepare('SELECT * FROM user_profiles WHERE user_id = ?')
      .bind(auth.userId)
      .first();

    return c.json({
      ...user,
      profile,
    });
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    return c.json({ error: '사용자 조회 중 오류가 발생했습니다' }, 500);
  }
});

// 사용자 정보 업데이트
users.patch('/me', authMiddleware, async (c) => {
  const auth = c.get('auth');
  const db = c.env.DB;
  const body = await c.req.json<{
    name?: string;
    avatar_url?: string;
  }>();

  try {
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name);
    }
    if (body.avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      values.push(body.avatar_url);
    }

    if (updates.length === 0) {
      return c.json({ error: '업데이트할 필드가 없습니다' }, 400);
    }

    updates.push("updated_at = datetime('now')");
    values.push(auth.userId!);

    await db
      .prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('사용자 업데이트 오류:', error);
    return c.json({ error: '사용자 업데이트 중 오류가 발생했습니다' }, 500);
  }
});

// 사용자 프로필 업데이트
users.patch('/me/profile', authMiddleware, async (c) => {
  const auth = c.get('auth');
  const db = c.env.DB;
  const body = await c.req.json<{
    bio?: string;
    phone?: string;
    company?: string;
    job_title?: string;
    website?: string;
    social_links?: Record<string, string>;
    preferences?: Record<string, unknown>;
  }>();

  try {
    // 기존 프로필 확인
    const existingProfile = await db
      .prepare('SELECT id FROM user_profiles WHERE user_id = ?')
      .bind(auth.userId)
      .first();

    if (existingProfile) {
      // 업데이트
      const updates: string[] = [];
      const values: unknown[] = [];

      if (body.bio !== undefined) {
        updates.push('bio = ?');
        values.push(body.bio);
      }
      if (body.phone !== undefined) {
        updates.push('phone = ?');
        values.push(body.phone);
      }
      if (body.company !== undefined) {
        updates.push('company = ?');
        values.push(body.company);
      }
      if (body.job_title !== undefined) {
        updates.push('job_title = ?');
        values.push(body.job_title);
      }
      if (body.website !== undefined) {
        updates.push('website = ?');
        values.push(body.website);
      }
      if (body.social_links !== undefined) {
        updates.push('social_links = ?');
        values.push(JSON.stringify(body.social_links));
      }
      if (body.preferences !== undefined) {
        updates.push('preferences = ?');
        values.push(JSON.stringify(body.preferences));
      }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        values.push(auth.userId);

        await db
          .prepare(`UPDATE user_profiles SET ${updates.join(', ')} WHERE user_id = ?`)
          .bind(...values)
          .run();
      }
    } else {
      // 신규 생성
      const id = crypto.randomUUID();
      await db
        .prepare(`
          INSERT INTO user_profiles (id, user_id, bio, phone, company, job_title, website, social_links, preferences)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          id,
          auth.userId,
          body.bio || null,
          body.phone || null,
          body.company || null,
          body.job_title || null,
          body.website || null,
          body.social_links ? JSON.stringify(body.social_links) : null,
          body.preferences ? JSON.stringify(body.preferences) : null
        )
        .run();
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('프로필 업데이트 오류:', error);
    return c.json({ error: '프로필 업데이트 중 오류가 발생했습니다' }, 500);
  }
});

// 관리자: 사용자 목록 조회
users.get('/', adminOnlyMiddleware, async (c) => {
  const db = c.env.DB;
  const { limit = '50', offset = '0', search } = c.req.query();

  try {
    let query = 'SELECT id, email, name, avatar_url, is_active, created_at FROM users';
    const params: unknown[] = [];

    if (search) {
      query += ' WHERE email LIKE ? OR name LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.prepare(query).bind(...params).all();

    // 총 개수 조회
    let countQuery = 'SELECT COUNT(*) as count FROM users';
    if (search) {
      countQuery += ' WHERE email LIKE ? OR name LIKE ?';
    }
    const countResult = await db
      .prepare(countQuery)
      .bind(...(search ? [`%${search}%`, `%${search}%`] : []))
      .first<{ count: number }>();

    return c.json({
      users: result.results,
      total: countResult?.count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    return c.json({ error: '사용자 목록 조회 중 오류가 발생했습니다' }, 500);
  }
});

// 관리자: 특정 사용자 조회
users.get('/:id', adminOnlyMiddleware, async (c) => {
  const db = c.env.DB;
  const userId = c.req.param('id');

  try {
    const user = await db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!user) {
      return c.json({ error: '사용자를 찾을 수 없습니다' }, 404);
    }

    const profile = await db
      .prepare('SELECT * FROM user_profiles WHERE user_id = ?')
      .bind(userId)
      .first();

    const subscriptions = await db
      .prepare(`
        SELECT s.*, sp.name as plan_name
        FROM subscriptions s
        LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE s.user_id = ?
        ORDER BY s.created_at DESC
      `)
      .bind(userId)
      .all();

    return c.json({
      ...user,
      profile,
      subscriptions: subscriptions.results,
    });
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    return c.json({ error: '사용자 조회 중 오류가 발생했습니다' }, 500);
  }
});

// 관리자: 사용자 상태 변경
users.patch('/:id/status', adminOnlyMiddleware, async (c) => {
  const db = c.env.DB;
  const userId = c.req.param('id');
  const { is_active } = await c.req.json<{ is_active: boolean }>();

  try {
    await db
      .prepare("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(is_active ? 1 : 0, userId)
      .run();

    // 비활성화 시 모든 세션 종료
    if (!is_active) {
      await db
        .prepare("UPDATE user_sessions SET is_active = 0, updated_at = datetime('now') WHERE user_id = ?")
        .bind(userId)
        .run();
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('사용자 상태 변경 오류:', error);
    return c.json({ error: '사용자 상태 변경 중 오류가 발생했습니다' }, 500);
  }
});

export default users;
