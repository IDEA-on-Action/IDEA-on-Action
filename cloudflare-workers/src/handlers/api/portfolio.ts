/**
 * Portfolio API 핸들러
 * 포트폴리오 아이템 조회 (공개 읽기)
 *
 * @migration Supabase → Cloudflare Workers
 */

import { Hono } from 'hono';
import { AppType } from '../../types';

const portfolio = new Hono<AppType>();

// 포트폴리오 타입 (D1 스키마 매칭)
interface PortfolioItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  client_name: string | null;
  category: string | null;
  technologies: string; // JSON 배열 문자열
  featured_image: string | null;
  images: string; // JSON 배열 문자열
  project_url: string | null;
  github_url: string | null;
  status: 'draft' | 'published' | 'archived';
  is_featured: number;
  display_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// GET /api/v1/portfolio - 포트폴리오 목록 조회
portfolio.get('/', async (c) => {
  const db = c.env.DB;
  const { category, featured, status, limit, offset } = c.req.query();

  try {
    let sql = 'SELECT * FROM portfolio_items WHERE 1=1';
    const params: (string | number)[] = [];

    // 카테고리 필터
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    // 피처드 필터
    if (featured === 'true') {
      sql += ' AND is_featured = 1';
    }

    // 상태 필터 (기본값: published만)
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    } else {
      sql += " AND status = 'published'";
    }

    sql += ' ORDER BY display_order ASC, created_at DESC';

    const limitNum = parseInt(limit as string) || 50;
    const offsetNum = parseInt(offset as string) || 0;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offsetNum);

    const result = await db.prepare(sql).bind(...params).all<PortfolioItem>();

    return c.json({
      data: result.results || [],
      meta: {
        total: result.results?.length || 0,
        limit: limitNum,
        offset: offsetNum,
      },
    });
  } catch (error) {
    console.error('[Portfolio API] 목록 조회 오류:', error);
    return c.json({ error: '포트폴리오를 조회할 수 없습니다' }, 500);
  }
});

// GET /api/v1/portfolio/featured - 피처드 포트폴리오
portfolio.get('/featured', async (c) => {
  const db = c.env.DB;

  try {
    const result = await db
      .prepare(`
        SELECT * FROM portfolio_items
        WHERE status = 'published' AND is_featured = 1
        ORDER BY display_order ASC, created_at DESC
        LIMIT 10
      `)
      .all<PortfolioItem>();

    return c.json({ data: result.results || [] });
  } catch (error) {
    console.error('[Portfolio API] 피처드 조회 오류:', error);
    return c.json({ error: '포트폴리오를 조회할 수 없습니다' }, 500);
  }
});

// GET /api/v1/portfolio/category/:category - 카테고리별 포트폴리오
portfolio.get('/category/:category', async (c) => {
  const db = c.env.DB;
  const { category } = c.req.param();

  try {
    const result = await db
      .prepare(`
        SELECT * FROM portfolio_items
        WHERE status = 'published' AND category = ?
        ORDER BY display_order ASC, created_at DESC
      `)
      .bind(category)
      .all<PortfolioItem>();

    return c.json({ data: result.results || [] });
  } catch (error) {
    console.error('[Portfolio API] 카테고리별 조회 오류:', error);
    return c.json({ error: '포트폴리오를 조회할 수 없습니다' }, 500);
  }
});

// GET /api/v1/portfolio/:id - 포트폴리오 상세 조회 (ID)
portfolio.get('/:id', async (c) => {
  const db = c.env.DB;
  const { id } = c.req.param();

  try {
    const item = await db
      .prepare('SELECT * FROM portfolio_items WHERE id = ?')
      .bind(id)
      .first<PortfolioItem>();

    if (!item) {
      return c.json({ error: '포트폴리오를 찾을 수 없습니다' }, 404);
    }

    return c.json({ data: item });
  } catch (error) {
    console.error('[Portfolio API] 상세 조회 오류:', error);
    return c.json({ error: '포트폴리오를 조회할 수 없습니다' }, 500);
  }
});

// GET /api/v1/portfolio/slug/:slug - 포트폴리오 상세 조회 (Slug)
portfolio.get('/slug/:slug', async (c) => {
  const db = c.env.DB;
  const { slug } = c.req.param();

  try {
    const item = await db
      .prepare('SELECT * FROM portfolio_items WHERE slug = ?')
      .bind(slug)
      .first<PortfolioItem>();

    if (!item) {
      return c.json({ error: '포트폴리오를 찾을 수 없습니다' }, 404);
    }

    return c.json({ data: item });
  } catch (error) {
    console.error('[Portfolio API] 상세 조회 오류:', error);
    return c.json({ error: '포트폴리오를 조회할 수 없습니다' }, 500);
  }
});

export default portfolio;
