/**
 * Notices API 핸들러
 * 공지사항 CRUD
 */

import { Hono } from 'hono';
import { AppType } from '../../types';

const notices = new Hono<AppType>();

// 공지사항 타입 (D1 스키마 매칭)
interface Notice {
  id: string;
  title: string;
  slug: string;
  content: string;
  type: string;
  priority: string;
  status: string;  // 'draft' | 'published' | 'archived'
  is_pinned: number;
  view_count: number;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// GET /api/v1/notices - 공지사항 목록 조회
notices.get('/', async (c) => {
  const db = c.env.DB;
  const { type, include_expired, limit, offset } = c.req.query();

  try {
    let sql = "SELECT * FROM notices WHERE status = 'published'";
    const params: (string | number)[] = [];

    // 타입 필터
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    // 만료된 공지 제외 (기본값)
    if (include_expired !== 'true') {
      sql += ' AND (expires_at IS NULL OR expires_at > ?)';
      params.push(new Date().toISOString());
    }

    // 고정 공지 먼저, 그 다음 발행일 순
    sql += ' ORDER BY is_pinned DESC, published_at DESC';

    const limitNum = parseInt(limit as string) || 20;
    const offsetNum = parseInt(offset as string) || 0;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offsetNum);

    const result = await db.prepare(sql).bind(...params).all<Notice>();

    return c.json({
      data: result.results || [],
      meta: {
        total: result.results?.length || 0,
        limit: limitNum,
        offset: offsetNum,
      },
    });
  } catch (error) {
    console.error('[Notices API] 목록 조회 오류:', error);
    return c.json({ error: '공지사항을 조회할 수 없습니다' }, 500);
  }
});

// GET /api/v1/notices/pinned - 고정 공지사항
notices.get('/pinned', async (c) => {
  const db = c.env.DB;

  try {
    const result = await db
      .prepare(`
        SELECT * FROM notices
        WHERE status = 'published' AND is_pinned = 1
        AND (expires_at IS NULL OR expires_at > ?)
        ORDER BY published_at DESC
        LIMIT 5
      `)
      .bind(new Date().toISOString())
      .all<Notice>();

    return c.json({ data: result.results || [] });
  } catch (error) {
    console.error('[Notices API] 고정 공지 조회 오류:', error);
    return c.json({ error: '공지사항을 조회할 수 없습니다' }, 500);
  }
});

// GET /api/v1/notices/:id - 공지사항 상세 조회
notices.get('/:id', async (c) => {
  const db = c.env.DB;
  const { id } = c.req.param();

  try {
    const notice = await db
      .prepare('SELECT * FROM notices WHERE id = ?')
      .bind(id)
      .first<Notice>();

    if (!notice) {
      return c.json({ error: '공지사항을 찾을 수 없습니다' }, 404);
    }

    // 조회수 증가
    await db
      .prepare('UPDATE notices SET view_count = view_count + 1 WHERE id = ?')
      .bind(id)
      .run();

    return c.json({
      data: {
        ...notice,
        view_count: notice.view_count + 1,
      },
    });
  } catch (error) {
    console.error('[Notices API] 상세 조회 오류:', error);
    return c.json({ error: '공지사항을 조회할 수 없습니다' }, 500);
  }
});

// POST /api/v1/notices - 공지사항 생성 (관리자)
notices.post('/', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  try {
    const body = await c.req.json();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // slug 생성 (title 기반 또는 직접 제공)
    const slug = body.slug || body.title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '');

    // status 결정 (published이면 published_at 설정)
    const status = body.status || (body.is_published ? 'published' : 'draft');
    const publishedAt = status === 'published' ? now : null;

    await db
      .prepare(`
        INSERT INTO notices (id, title, slug, content, type, priority, status, is_pinned, view_count, published_at, expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
      `)
      .bind(
        id,
        body.title,
        slug,
        body.content || '',
        body.type || 'general',
        body.priority || 'normal',
        status,
        body.is_pinned ? 1 : 0,
        publishedAt,
        body.expires_at || null,
        now,
        now
      )
      .run();

    const notice = await db
      .prepare('SELECT * FROM notices WHERE id = ?')
      .bind(id)
      .first<Notice>();

    return c.json({ data: notice }, 201);
  } catch (error) {
    console.error('[Notices API] 생성 오류:', error);
    return c.json({ error: '공지사항을 생성할 수 없습니다' }, 500);
  }
});

// PATCH /api/v1/notices/:id - 공지사항 수정 (관리자)
notices.patch('/:id', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { id } = c.req.param();

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  try {
    const body = await c.req.json();
    const now = new Date().toISOString();

    const updates: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    const allowedFields = [
      'title', 'slug', 'content', 'type', 'priority', 'status', 'is_pinned', 'expires_at'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        if (field === 'is_pinned') {
          values.push(body[field] ? 1 : 0);
        } else {
          values.push(body[field]);
        }
      }
    }

    // status가 'published'로 변경되면 published_at 설정
    if (body.status === 'published') {
      const existing = await db
        .prepare('SELECT published_at FROM notices WHERE id = ?')
        .bind(id)
        .first<{ published_at: string | null }>();

      if (!existing?.published_at) {
        updates.push('published_at = ?');
        values.push(now);
      }
    }

    values.push(id);

    await db
      .prepare(`UPDATE notices SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const notice = await db
      .prepare('SELECT * FROM notices WHERE id = ?')
      .bind(id)
      .first<Notice>();

    return c.json({ data: notice });
  } catch (error) {
    console.error('[Notices API] 수정 오류:', error);
    return c.json({ error: '공지사항을 수정할 수 없습니다' }, 500);
  }
});

// DELETE /api/v1/notices/:id - 공지사항 삭제
notices.delete('/:id', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { id } = c.req.param();

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  try {
    await db.prepare('DELETE FROM notices WHERE id = ?').bind(id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('[Notices API] 삭제 오류:', error);
    return c.json({ error: '공지사항을 삭제할 수 없습니다' }, 500);
  }
});

export default notices;
