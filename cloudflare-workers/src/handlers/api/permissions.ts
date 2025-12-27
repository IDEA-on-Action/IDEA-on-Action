/**
 * 권한 API 핸들러
 * Wave 2: 중위험 함수 - RLS 대체 권한 관리
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { requireAuth, requireAdmin } from '../../middleware/auth';

const permissions = new Hono<AppType>();

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
}

interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  granted_by: string;
  granted_at: string;
}

// 기본 시스템 역할
const SYSTEM_ROLES: Record<string, string[]> = {
  super_admin: ['*'],
  admin: ['users:read', 'users:write', 'content:*', 'orders:*', 'analytics:read'],
  editor: ['content:read', 'content:write', 'media:*'],
  viewer: ['content:read', 'analytics:read'],
};

// 현재 사용자 권한 조회
permissions.get('/me', requireAuth, async (c) => {
  const auth = c.get('auth');
  const db = c.env.DB;

  try {
    // 사용자의 역할 조회
    const roles = await db
      .prepare(`
        SELECT r.*
        FROM roles r
        INNER JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
      `)
      .bind(auth!.userId)
      .all();

    // 모든 권한 수집
    const allPermissions = new Set<string>();
    for (const role of roles.results as unknown as Role[]) {
      const perms = typeof role.permissions === 'string'
        ? JSON.parse(role.permissions)
        : role.permissions;
      perms.forEach((p: string) => allPermissions.add(p));
    }

    return c.json({
      userId: auth!.userId,
      isAdmin: auth!.isAdmin,
      roles: roles.results,
      permissions: Array.from(allPermissions),
    });
  } catch (error) {
    console.error('권한 조회 오류:', error);
    return c.json({ error: '권한 조회 중 오류가 발생했습니다' }, 500);
  }
});

// 권한 확인 (특정 권한 보유 여부)
permissions.post('/check', requireAuth, async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json<{
    permission: string;
    resource_id?: string;
  }>();

  try {
    // 관리자는 모든 권한 허용
    if (auth!.isAdmin) {
      return c.json({ allowed: true, reason: 'admin' });
    }

    const { permission } = body;

    // 와일드카드 체크
    const hasPermission = auth!.permissions.some(p => {
      if (p === '*') return true;
      if (p === permission) return true;
      if (p.endsWith(':*')) {
        const prefix = p.slice(0, -1);
        return permission.startsWith(prefix);
      }
      return false;
    });

    return c.json({
      allowed: hasPermission,
      reason: hasPermission ? 'permission_granted' : 'permission_denied',
    });
  } catch (error) {
    console.error('권한 확인 오류:', error);
    return c.json({ error: '권한 확인 중 오류가 발생했습니다' }, 500);
  }
});

// 역할 목록 조회 (관리자)
permissions.get('/roles', requireAuth, requireAdmin, async (c) => {
  const db = c.env.DB;

  try {
    const result = await db
      .prepare('SELECT * FROM roles ORDER BY is_system DESC, name')
      .all();

    return c.json({ roles: result.results });
  } catch (error) {
    console.error('역할 목록 조회 오류:', error);
    return c.json({ error: '역할 목록 조회 중 오류가 발생했습니다' }, 500);
  }
});

// 역할 생성 (관리자)
permissions.post('/roles', requireAuth, requireAdmin, async (c) => {
  const auth = c.get('auth');
  const db = c.env.DB;
  const body = await c.req.json<{
    name: string;
    description?: string;
    permissions: string[];
  }>();

  try {
    // 시스템 역할명 중복 체크
    if (SYSTEM_ROLES[body.name]) {
      return c.json({ error: '시스템 역할명은 사용할 수 없습니다' }, 400);
    }

    const roleId = crypto.randomUUID();
    await db
      .prepare(`
        INSERT INTO roles (id, name, description, permissions, is_system, created_by)
        VALUES (?, ?, ?, ?, 0, ?)
      `)
      .bind(
        roleId,
        body.name,
        body.description || null,
        JSON.stringify(body.permissions),
        auth!.userId
      )
      .run();

    return c.json({
      success: true,
      role: {
        id: roleId,
        name: body.name,
        description: body.description,
        permissions: body.permissions,
        is_system: false,
      },
    }, 201);
  } catch (error) {
    console.error('역할 생성 오류:', error);
    return c.json({ error: '역할 생성 중 오류가 발생했습니다' }, 500);
  }
});

// 역할 수정 (관리자)
permissions.patch('/roles/:id', requireAuth, requireAdmin, async (c) => {
  const db = c.env.DB;
  const roleId = c.req.param('id');
  const body = await c.req.json<{
    name?: string;
    description?: string;
    permissions?: string[];
  }>();

  try {
    // 시스템 역할 수정 불가
    const role = await db
      .prepare('SELECT is_system FROM roles WHERE id = ?')
      .bind(roleId)
      .first<{ is_system: number }>();

    if (!role) {
      return c.json({ error: '역할을 찾을 수 없습니다' }, 404);
    }

    if (role.is_system) {
      return c.json({ error: '시스템 역할은 수정할 수 없습니다' }, 403);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name);
    }
    if (body.description !== undefined) {
      updates.push('description = ?');
      values.push(body.description);
    }
    if (body.permissions !== undefined) {
      updates.push('permissions = ?');
      values.push(JSON.stringify(body.permissions));
    }

    if (updates.length === 0) {
      return c.json({ error: '수정할 필드가 없습니다' }, 400);
    }

    updates.push("updated_at = datetime('now')");
    values.push(roleId);

    await db
      .prepare(`UPDATE roles SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('역할 수정 오류:', error);
    return c.json({ error: '역할 수정 중 오류가 발생했습니다' }, 500);
  }
});

// 역할 삭제 (관리자)
permissions.delete('/roles/:id', requireAuth, requireAdmin, async (c) => {
  const db = c.env.DB;
  const roleId = c.req.param('id');

  try {
    // 시스템 역할 삭제 불가
    const role = await db
      .prepare('SELECT is_system FROM roles WHERE id = ?')
      .bind(roleId)
      .first<{ is_system: number }>();

    if (!role) {
      return c.json({ error: '역할을 찾을 수 없습니다' }, 404);
    }

    if (role.is_system) {
      return c.json({ error: '시스템 역할은 삭제할 수 없습니다' }, 403);
    }

    // 역할 및 할당 삭제
    await db.batch([
      db.prepare('DELETE FROM user_roles WHERE role_id = ?').bind(roleId),
      db.prepare('DELETE FROM roles WHERE id = ?').bind(roleId),
    ]);

    return c.json({ success: true });
  } catch (error) {
    console.error('역할 삭제 오류:', error);
    return c.json({ error: '역할 삭제 중 오류가 발생했습니다' }, 500);
  }
});

// 사용자에게 역할 부여 (관리자)
permissions.post('/users/:userId/roles', requireAuth, requireAdmin, async (c) => {
  const auth = c.get('auth');
  const db = c.env.DB;
  const userId = c.req.param('userId');
  const body = await c.req.json<{ role_id: string }>();

  try {
    // 역할 존재 확인
    const role = await db
      .prepare('SELECT id FROM roles WHERE id = ?')
      .bind(body.role_id)
      .first();

    if (!role) {
      return c.json({ error: '역할을 찾을 수 없습니다' }, 404);
    }

    // 중복 확인
    const existing = await db
      .prepare('SELECT id FROM user_roles WHERE user_id = ? AND role_id = ?')
      .bind(userId, body.role_id)
      .first();

    if (existing) {
      return c.json({ error: '이미 부여된 역할입니다' }, 409);
    }

    const id = crypto.randomUUID();
    await db
      .prepare(`
        INSERT INTO user_roles (id, user_id, role_id, granted_by)
        VALUES (?, ?, ?, ?)
      `)
      .bind(id, userId, body.role_id, auth!.userId)
      .run();

    return c.json({ success: true }, 201);
  } catch (error) {
    console.error('역할 부여 오류:', error);
    return c.json({ error: '역할 부여 중 오류가 발생했습니다' }, 500);
  }
});

// 사용자 역할 조회 (관리자)
permissions.get('/users/:userId/roles', requireAuth, requireAdmin, async (c) => {
  const db = c.env.DB;
  const userId = c.req.param('userId');

  try {
    const result = await db
      .prepare(`
        SELECT r.*, ur.granted_at, ur.granted_by,
               (SELECT name FROM users WHERE id = ur.granted_by) as granted_by_name
        FROM roles r
        INNER JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
        ORDER BY ur.granted_at DESC
      `)
      .bind(userId)
      .all();

    return c.json({ roles: result.results });
  } catch (error) {
    console.error('사용자 역할 조회 오류:', error);
    return c.json({ error: '역할 조회 중 오류가 발생했습니다' }, 500);
  }
});

// 사용자 역할 제거 (관리자)
permissions.delete('/users/:userId/roles/:roleId', requireAuth, requireAdmin, async (c) => {
  const db = c.env.DB;
  const userId = c.req.param('userId');
  const roleId = c.req.param('roleId');

  try {
    const result = await db
      .prepare('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?')
      .bind(userId, roleId)
      .run();

    if (result.meta.changes === 0) {
      return c.json({ error: '역할 할당을 찾을 수 없습니다' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('역할 제거 오류:', error);
    return c.json({ error: '역할 제거 중 오류가 발생했습니다' }, 500);
  }
});

// 리소스별 권한 확인 (RLS 대체)
permissions.post('/check-resource', requireAuth, async (c) => {
  const auth = c.get('auth');
  const db = c.env.DB;
  const body = await c.req.json<{
    resource_type: string;
    resource_id: string;
    action: 'read' | 'write' | 'delete';
  }>();

  try {
    // 관리자는 모든 권한 허용
    if (auth!.isAdmin) {
      return c.json({ allowed: true, reason: 'admin' });
    }

    const { resource_type, resource_id, action } = body;

    // 리소스별 소유권/접근권 확인
    let allowed = false;
    let reason = 'permission_denied';

    switch (resource_type) {
      case 'order': {
        const order = await db
          .prepare('SELECT user_id FROM orders WHERE id = ?')
          .bind(resource_id)
          .first<{ user_id: string }>();

        if (order?.user_id === auth!.userId) {
          allowed = action !== 'delete'; // 삭제는 관리자만
          reason = 'owner';
        }
        break;
      }

      case 'subscription': {
        const sub = await db
          .prepare('SELECT user_id FROM subscriptions WHERE id = ?')
          .bind(resource_id)
          .first<{ user_id: string }>();

        if (sub?.user_id === auth!.userId) {
          allowed = action === 'read';
          reason = 'owner';
        }
        break;
      }

      case 'team': {
        const membership = await db
          .prepare('SELECT role FROM team_members WHERE team_id = ? AND user_id = ?')
          .bind(resource_id, auth!.userId)
          .first<{ role: string }>();

        if (membership) {
          if (action === 'read') {
            allowed = true;
            reason = 'team_member';
          } else if (['owner', 'admin'].includes(membership.role)) {
            allowed = true;
            reason = 'team_admin';
          }
        }
        break;
      }

      case 'blog_post': {
        // 공개 게시물은 누구나 읽기 가능
        const post = await db
          .prepare('SELECT author_id, status FROM blog_posts WHERE id = ?')
          .bind(resource_id)
          .first<{ author_id: string; status: string }>();

        if (post) {
          if (action === 'read' && post.status === 'published') {
            allowed = true;
            reason = 'public';
          } else if (post.author_id === auth!.userId) {
            allowed = true;
            reason = 'author';
          }
        }
        break;
      }

      default: {
        // 권한 테이블에서 확인
        const permission = `${resource_type}:${action}`;
        allowed = auth!.permissions.some(p => {
          if (p === '*') return true;
          if (p === permission) return true;
          if (p === `${resource_type}:*`) return true;
          return false;
        });
        reason = allowed ? 'permission_granted' : 'permission_denied';
        break;
      }
    }

    return c.json({ allowed, reason });
  } catch (error) {
    console.error('리소스 권한 확인 오류:', error);
    return c.json({ error: '권한 확인 중 오류가 발생했습니다' }, 500);
  }
});

export default permissions;
