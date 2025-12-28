/**
 * Roadmap API 핸들러
 * 로드맵 아이템 조회 (공개 읽기)
 *
 * @migration Supabase → Cloudflare Workers
 */

import { Hono } from 'hono';
import { AppType } from '../../types';

const roadmap = new Hono<AppType>();

// 로드맵 타입 (D1 스키마 매칭)
interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number; // 0-100
  target_date: string | null;
  completed_at: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// GET /api/v1/roadmap - 로드맵 목록 조회
roadmap.get('/', async (c) => {
  const db = c.env.DB;
  const { category, status, priority, limit, offset } = c.req.query();

  try {
    let sql = 'SELECT * FROM roadmap_items WHERE 1=1';
    const params: (string | number)[] = [];

    // 카테고리 필터
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    // 상태 필터
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    // 우선순위 필터
    if (priority) {
      sql += ' AND priority = ?';
      params.push(priority);
    }

    sql += ' ORDER BY display_order ASC, created_at DESC';

    const limitNum = parseInt(limit as string) || 50;
    const offsetNum = parseInt(offset as string) || 0;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offsetNum);

    const result = await db.prepare(sql).bind(...params).all<RoadmapItem>();

    return c.json({
      data: result.results || [],
      meta: {
        total: result.results?.length || 0,
        limit: limitNum,
        offset: offsetNum,
      },
    });
  } catch (error) {
    console.error('[Roadmap API] 목록 조회 오류:', error);
    return c.json({ error: '로드맵을 조회할 수 없습니다' }, 500);
  }
});

// GET /api/v1/roadmap/active - 진행중 로드맵
roadmap.get('/active', async (c) => {
  const db = c.env.DB;

  try {
    const result = await db
      .prepare(`
        SELECT * FROM roadmap_items
        WHERE status IN ('planned', 'in_progress')
        ORDER BY display_order ASC, created_at DESC
      `)
      .all<RoadmapItem>();

    return c.json({ data: result.results || [] });
  } catch (error) {
    console.error('[Roadmap API] 진행중 로드맵 조회 오류:', error);
    return c.json({ error: '로드맵을 조회할 수 없습니다' }, 500);
  }
});

// GET /api/v1/roadmap/category/:category - 카테고리별 로드맵
roadmap.get('/category/:category', async (c) => {
  const db = c.env.DB;
  const { category } = c.req.param();

  try {
    const result = await db
      .prepare(`
        SELECT * FROM roadmap_items
        WHERE category = ?
        ORDER BY display_order ASC, created_at DESC
      `)
      .bind(category)
      .all<RoadmapItem>();

    return c.json({ data: result.results || [] });
  } catch (error) {
    console.error('[Roadmap API] 카테고리별 조회 오류:', error);
    return c.json({ error: '로드맵을 조회할 수 없습니다' }, 500);
  }
});

// GET /api/v1/roadmap/status/:status - 상태별 로드맵
roadmap.get('/status/:status', async (c) => {
  const db = c.env.DB;
  const { status } = c.req.param();

  try {
    const result = await db
      .prepare(`
        SELECT * FROM roadmap_items
        WHERE status = ?
        ORDER BY display_order ASC, created_at DESC
      `)
      .bind(status)
      .all<RoadmapItem>();

    return c.json({ data: result.results || [] });
  } catch (error) {
    console.error('[Roadmap API] 상태별 조회 오류:', error);
    return c.json({ error: '로드맵을 조회할 수 없습니다' }, 500);
  }
});

// GET /api/v1/roadmap/:id - 로드맵 상세 조회
roadmap.get('/:id', async (c) => {
  const db = c.env.DB;
  const { id } = c.req.param();

  try {
    const item = await db
      .prepare('SELECT * FROM roadmap_items WHERE id = ?')
      .bind(id)
      .first<RoadmapItem>();

    if (!item) {
      return c.json({ error: '로드맵 아이템을 찾을 수 없습니다' }, 404);
    }

    return c.json({ data: item });
  } catch (error) {
    console.error('[Roadmap API] 상세 조회 오류:', error);
    return c.json({ error: '로드맵을 조회할 수 없습니다' }, 500);
  }
});

export default roadmap;
