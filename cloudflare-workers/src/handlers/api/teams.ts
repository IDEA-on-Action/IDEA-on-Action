/**
 * 팀 API 핸들러
 * Wave 2: 중위험 함수 - 팀 관리
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { requireAuth, requireAdmin, requirePermission } from '../../middleware/auth';

const teams = new Hono<AppType>();

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

// 팀 목록 조회
teams.get('/', requireAuth, async (c) => {
  const auth = c.get('auth');
  const db = c.env.DB;

  try {
    // 사용자가 속한 팀 목록 조회
    const result = await db
      .prepare(`
        SELECT t.*, tm.role as my_role
        FROM teams t
        INNER JOIN team_members tm ON t.id = tm.team_id
        WHERE tm.user_id = ?
        ORDER BY t.created_at DESC
      `)
      .bind(auth!.userId)
      .all();

    return c.json({ teams: result.results });
  } catch (error) {
    console.error('팀 목록 조회 오류:', error);
    return c.json({ error: '팀 목록 조회 중 오류가 발생했습니다' }, 500);
  }
});

// 팀 생성
teams.post('/', requireAuth, async (c) => {
  const auth = c.get('auth');
  const db = c.env.DB;
  const body = await c.req.json<{
    name: string;
    description?: string;
    avatar_url?: string;
  }>();

  try {
    const teamId = crypto.randomUUID();
    const memberId = crypto.randomUUID();

    // 트랜잭션으로 팀 + 멤버 생성
    await db.batch([
      db.prepare(`
        INSERT INTO teams (id, name, description, avatar_url, owner_id)
        VALUES (?, ?, ?, ?, ?)
      `).bind(teamId, body.name, body.description || null, body.avatar_url || null, auth!.userId),
      db.prepare(`
        INSERT INTO team_members (id, team_id, user_id, role)
        VALUES (?, ?, ?, 'owner')
      `).bind(memberId, teamId, auth!.userId),
    ]);

    return c.json({
      success: true,
      team: {
        id: teamId,
        name: body.name,
        description: body.description,
        avatar_url: body.avatar_url,
        owner_id: auth!.userId,
      },
    }, 201);
  } catch (error) {
    console.error('팀 생성 오류:', error);
    return c.json({ error: '팀 생성 중 오류가 발생했습니다' }, 500);
  }
});

// 팀 상세 조회
teams.get('/:id', requireAuth, async (c) => {
  const auth = c.get('auth');
  const db = c.env.DB;
  const teamId = c.req.param('id');

  try {
    // 팀 조회 + 멤버십 확인
    const team = await db
      .prepare(`
        SELECT t.*, tm.role as my_role
        FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.user_id = ?
        WHERE t.id = ?
      `)
      .bind(auth!.userId, teamId)
      .first();

    if (!team) {
      return c.json({ error: '팀을 찾을 수 없습니다' }, 404);
    }

    // 비멤버는 공개 정보만
    if (!team.my_role && !auth!.isAdmin) {
      return c.json({
        id: team.id,
        name: team.name,
        description: team.description,
        avatar_url: team.avatar_url,
      });
    }

    // 멤버 목록 조회
    const members = await db
      .prepare(`
        SELECT tm.*, u.name as user_name, u.email as user_email, u.avatar_url as user_avatar
        FROM team_members tm
        INNER JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = ?
        ORDER BY tm.role, tm.joined_at
      `)
      .bind(teamId)
      .all();

    return c.json({
      ...team,
      members: members.results,
    });
  } catch (error) {
    console.error('팀 상세 조회 오류:', error);
    return c.json({ error: '팀 조회 중 오류가 발생했습니다' }, 500);
  }
});

// 팀 정보 수정
teams.patch('/:id', requireAuth, async (c) => {
  const auth = c.get('auth');
  const db = c.env.DB;
  const teamId = c.req.param('id');
  const body = await c.req.json<{
    name?: string;
    description?: string;
    avatar_url?: string;
  }>();

  try {
    // 권한 확인 (owner 또는 admin만)
    const membership = await db
      .prepare('SELECT role FROM team_members WHERE team_id = ? AND user_id = ?')
      .bind(teamId, auth!.userId)
      .first<{ role: string }>();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      if (!auth!.isAdmin) {
        return c.json({ error: '팀 수정 권한이 없습니다' }, 403);
      }
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
    if (body.avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      values.push(body.avatar_url);
    }

    if (updates.length === 0) {
      return c.json({ error: '수정할 필드가 없습니다' }, 400);
    }

    updates.push("updated_at = datetime('now')");
    values.push(teamId);

    await db
      .prepare(`UPDATE teams SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('팀 수정 오류:', error);
    return c.json({ error: '팀 수정 중 오류가 발생했습니다' }, 500);
  }
});

// 팀 삭제
teams.delete('/:id', requireAuth, async (c) => {
  const auth = c.get('auth');
  const db = c.env.DB;
  const teamId = c.req.param('id');

  try {
    // owner 확인
    const team = await db
      .prepare('SELECT owner_id FROM teams WHERE id = ?')
      .bind(teamId)
      .first<{ owner_id: string }>();

    if (!team) {
      return c.json({ error: '팀을 찾을 수 없습니다' }, 404);
    }

    if (team.owner_id !== auth!.userId && !auth!.isAdmin) {
      return c.json({ error: '팀 삭제 권한이 없습니다' }, 403);
    }

    // 팀 및 관련 데이터 삭제
    await db.batch([
      db.prepare('DELETE FROM team_members WHERE team_id = ?').bind(teamId),
      db.prepare('DELETE FROM teams WHERE id = ?').bind(teamId),
    ]);

    return c.json({ success: true });
  } catch (error) {
    console.error('팀 삭제 오류:', error);
    return c.json({ error: '팀 삭제 중 오류가 발생했습니다' }, 500);
  }
});

// 팀 멤버 초대
teams.post('/:id/members', requireAuth, async (c) => {
  const auth = c.get('auth');
  const db = c.env.DB;
  const teamId = c.req.param('id');
  const body = await c.req.json<{
    user_id?: string;
    email?: string;
    role?: 'admin' | 'member';
  }>();

  try {
    // 초대 권한 확인
    const membership = await db
      .prepare('SELECT role FROM team_members WHERE team_id = ? AND user_id = ?')
      .bind(teamId, auth!.userId)
      .first<{ role: string }>();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      if (!auth!.isAdmin) {
        return c.json({ error: '멤버 초대 권한이 없습니다' }, 403);
      }
    }

    // 사용자 찾기
    let userId = body.user_id;
    if (!userId && body.email) {
      const user = await db
        .prepare('SELECT id FROM users WHERE email = ?')
        .bind(body.email)
        .first<{ id: string }>();

      if (!user) {
        return c.json({ error: '사용자를 찾을 수 없습니다' }, 404);
      }
      userId = user.id;
    }

    if (!userId) {
      return c.json({ error: 'user_id 또는 email이 필요합니다' }, 400);
    }

    // 중복 확인
    const existing = await db
      .prepare('SELECT id FROM team_members WHERE team_id = ? AND user_id = ?')
      .bind(teamId, userId)
      .first();

    if (existing) {
      return c.json({ error: '이미 팀 멤버입니다' }, 409);
    }

    // 멤버 추가
    const memberId = crypto.randomUUID();
    await db
      .prepare(`
        INSERT INTO team_members (id, team_id, user_id, role)
        VALUES (?, ?, ?, ?)
      `)
      .bind(memberId, teamId, userId, body.role || 'member')
      .run();

    return c.json({
      success: true,
      member: {
        id: memberId,
        team_id: teamId,
        user_id: userId,
        role: body.role || 'member',
      },
    }, 201);
  } catch (error) {
    console.error('멤버 초대 오류:', error);
    return c.json({ error: '멤버 초대 중 오류가 발생했습니다' }, 500);
  }
});

// 멤버 역할 변경
teams.patch('/:id/members/:memberId', requireAuth, async (c) => {
  const auth = c.get('auth');
  const db = c.env.DB;
  const teamId = c.req.param('id');
  const memberId = c.req.param('memberId');
  const body = await c.req.json<{ role: 'admin' | 'member' }>();

  try {
    // owner만 역할 변경 가능
    const team = await db
      .prepare('SELECT owner_id FROM teams WHERE id = ?')
      .bind(teamId)
      .first<{ owner_id: string }>();

    if (!team) {
      return c.json({ error: '팀을 찾을 수 없습니다' }, 404);
    }

    if (team.owner_id !== auth!.userId && !auth!.isAdmin) {
      return c.json({ error: '역할 변경 권한이 없습니다' }, 403);
    }

    await db
      .prepare("UPDATE team_members SET role = ?, updated_at = datetime('now') WHERE id = ? AND team_id = ?")
      .bind(body.role, memberId, teamId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('역할 변경 오류:', error);
    return c.json({ error: '역할 변경 중 오류가 발생했습니다' }, 500);
  }
});

// 멤버 제거
teams.delete('/:id/members/:memberId', requireAuth, async (c) => {
  const auth = c.get('auth');
  const db = c.env.DB;
  const teamId = c.req.param('id');
  const memberId = c.req.param('memberId');

  try {
    // 권한 확인 (owner/admin 또는 본인)
    const [membership, targetMember] = await Promise.all([
      db.prepare('SELECT role FROM team_members WHERE team_id = ? AND user_id = ?')
        .bind(teamId, auth!.userId)
        .first<{ role: string }>(),
      db.prepare('SELECT user_id, role FROM team_members WHERE id = ? AND team_id = ?')
        .bind(memberId, teamId)
        .first<{ user_id: string; role: string }>(),
    ]);

    if (!targetMember) {
      return c.json({ error: '멤버를 찾을 수 없습니다' }, 404);
    }

    // owner는 제거 불가
    if (targetMember.role === 'owner') {
      return c.json({ error: '소유자는 제거할 수 없습니다' }, 400);
    }

    const isSelf = targetMember.user_id === auth!.userId;
    const isAdmin = membership && ['owner', 'admin'].includes(membership.role);

    if (!isSelf && !isAdmin && !auth!.isAdmin) {
      return c.json({ error: '멤버 제거 권한이 없습니다' }, 403);
    }

    await db
      .prepare('DELETE FROM team_members WHERE id = ? AND team_id = ?')
      .bind(memberId, teamId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('멤버 제거 오류:', error);
    return c.json({ error: '멤버 제거 중 오류가 발생했습니다' }, 500);
  }
});

export default teams;
