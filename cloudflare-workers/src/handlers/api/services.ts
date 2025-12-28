/**
 * Services API 핸들러
 * 서비스 CRUD 및 카테고리 관리
 */

import { Hono } from 'hono';
import { AppType } from '../../types';

const services = new Hono<AppType>();

// 서비스 타입 정의
interface Service {
  id: string;
  slug: string;
  name: string;
  name_ko: string;
  description: string;
  description_ko: string;
  price: number;
  currency: string;
  status: 'active' | 'draft' | 'archived';
  features: string; // JSON string
  metrics: string; // JSON string
  category_id: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  name_ko: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// GET /api/v1/services - 서비스 목록 조회
services.get('/', async (c) => {
  const db = c.env.DB;
  const { status, category_id, sort_by, limit, offset } = c.req.query();

  try {
    let sql = 'SELECT * FROM services WHERE 1=1';
    const params: (string | number)[] = [];

    // 상태 필터 (기본값: active)
    sql += ' AND status = ?';
    params.push(status || 'active');

    // 카테고리 필터
    if (category_id) {
      sql += ' AND category_id = ?';
      params.push(category_id);
    }

    // 정렬
    switch (sort_by) {
      case 'newest':
        sql += ' ORDER BY created_at DESC';
        break;
      case 'oldest':
        sql += ' ORDER BY created_at ASC';
        break;
      case 'price-asc':
        sql += ' ORDER BY price ASC';
        break;
      case 'price-desc':
        sql += ' ORDER BY price DESC';
        break;
      default:
        sql += ' ORDER BY created_at DESC';
    }

    // 페이지네이션
    const limitNum = parseInt(limit as string) || 50;
    const offsetNum = parseInt(offset as string) || 0;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offsetNum);

    const result = await db.prepare(sql).bind(...params).all<Service>();

    // 카테고리 정보 JOIN
    const servicesWithCategory = await Promise.all(
      (result.results || []).map(async (service) => {
        if (service.category_id) {
          const category = await db
            .prepare('SELECT * FROM service_categories WHERE id = ?')
            .bind(service.category_id)
            .first<ServiceCategory>();
          return { ...service, category };
        }
        return { ...service, category: null };
      })
    );

    return c.json({
      data: servicesWithCategory,
      meta: {
        total: result.results?.length || 0,
        limit: limitNum,
        offset: offsetNum,
      },
    });
  } catch (error) {
    console.error('[Services API] 목록 조회 오류:', error);
    return c.json({ error: '서비스 목록을 조회할 수 없습니다' }, 500);
  }
});

// GET /api/v1/services/:id - 서비스 상세 조회 (ID)
services.get('/:id', async (c) => {
  const db = c.env.DB;
  const { id } = c.req.param();

  try {
    const service = await db
      .prepare('SELECT * FROM services WHERE id = ?')
      .bind(id)
      .first<Service>();

    if (!service) {
      return c.json({ error: '서비스를 찾을 수 없습니다' }, 404);
    }

    // 카테고리 정보
    let category = null;
    if (service.category_id) {
      category = await db
        .prepare('SELECT * FROM service_categories WHERE id = ?')
        .bind(service.category_id)
        .first<ServiceCategory>();
    }

    // 패키지 정보
    const packages = await db
      .prepare('SELECT * FROM service_packages WHERE service_id = ? ORDER BY price ASC')
      .bind(id)
      .all();

    return c.json({
      data: {
        ...service,
        category,
        packages: packages.results || [],
      },
    });
  } catch (error) {
    console.error('[Services API] 상세 조회 오류:', error);
    return c.json({ error: '서비스를 조회할 수 없습니다' }, 500);
  }
});

// GET /api/v1/services/slug/:slug - 서비스 상세 조회 (Slug)
services.get('/slug/:slug', async (c) => {
  const db = c.env.DB;
  const { slug } = c.req.param();

  try {
    const service = await db
      .prepare('SELECT * FROM services WHERE slug = ?')
      .bind(slug)
      .first<Service>();

    if (!service) {
      return c.json({ error: '서비스를 찾을 수 없습니다' }, 404);
    }

    // 카테고리 정보
    let category = null;
    if (service.category_id) {
      category = await db
        .prepare('SELECT * FROM service_categories WHERE id = ?')
        .bind(service.category_id)
        .first<ServiceCategory>();
    }

    // 패키지 정보
    const packages = await db
      .prepare('SELECT * FROM service_packages WHERE service_id = ? ORDER BY price ASC')
      .bind(service.id)
      .all();

    return c.json({
      data: {
        ...service,
        category,
        packages: packages.results || [],
      },
    });
  } catch (error) {
    console.error('[Services API] 상세 조회 오류:', error);
    return c.json({ error: '서비스를 조회할 수 없습니다' }, 500);
  }
});

// GET /api/v1/services/categories - 카테고리 목록 조회
services.get('/categories/list', async (c) => {
  const db = c.env.DB;

  try {
    const result = await db
      .prepare('SELECT * FROM service_categories WHERE is_active = 1 ORDER BY display_order ASC')
      .all<ServiceCategory>();

    return c.json({
      data: result.results || [],
    });
  } catch (error) {
    console.error('[Services API] 카테고리 조회 오류:', error);
    return c.json({ error: '카테고리를 조회할 수 없습니다' }, 500);
  }
});

// GET /api/v1/services/categories/:id/count - 카테고리별 서비스 개수
services.get('/categories/:id/count', async (c) => {
  const db = c.env.DB;
  const { id } = c.req.param();

  try {
    const result = await db
      .prepare('SELECT COUNT(*) as count FROM services WHERE category_id = ? AND status = ?')
      .bind(id, 'active')
      .first<{ count: number }>();

    return c.json({
      data: { count: result?.count || 0 },
    });
  } catch (error) {
    console.error('[Services API] 개수 조회 오류:', error);
    return c.json({ error: '개수를 조회할 수 없습니다' }, 500);
  }
});

// POST /api/v1/services - 서비스 생성 (관리자 전용)
services.post('/', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  // TODO: 관리자 권한 확인

  try {
    const body = await c.req.json();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await db
      .prepare(`
        INSERT INTO services (id, slug, name, name_ko, description, description_ko, price, currency, status, features, metrics, category_id, image_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        body.slug,
        body.name,
        body.name_ko || body.name,
        body.description || '',
        body.description_ko || body.description || '',
        body.price || 0,
        body.currency || 'KRW',
        body.status || 'draft',
        JSON.stringify(body.features || []),
        JSON.stringify(body.metrics || {}),
        body.category_id || null,
        body.image_url || null,
        now,
        now
      )
      .run();

    const service = await db
      .prepare('SELECT * FROM services WHERE id = ?')
      .bind(id)
      .first<Service>();

    return c.json({ data: service }, 201);
  } catch (error) {
    console.error('[Services API] 생성 오류:', error);
    return c.json({ error: '서비스를 생성할 수 없습니다' }, 500);
  }
});

// PATCH /api/v1/services/:id - 서비스 수정 (관리자 전용)
services.patch('/:id', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { id } = c.req.param();

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  try {
    const body = await c.req.json();
    const now = new Date().toISOString();

    // 동적 UPDATE 쿼리 생성
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    const allowedFields = [
      'slug', 'name', 'name_ko', 'description', 'description_ko',
      'price', 'currency', 'status', 'features', 'metrics',
      'category_id', 'image_url'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        if (field === 'features' || field === 'metrics') {
          values.push(JSON.stringify(body[field]));
        } else {
          values.push(body[field]);
        }
      }
    }

    if (updates.length === 0) {
      return c.json({ error: '수정할 필드가 없습니다' }, 400);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await db
      .prepare(`UPDATE services SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const service = await db
      .prepare('SELECT * FROM services WHERE id = ?')
      .bind(id)
      .first<Service>();

    return c.json({ data: service });
  } catch (error) {
    console.error('[Services API] 수정 오류:', error);
    return c.json({ error: '서비스를 수정할 수 없습니다' }, 500);
  }
});

// DELETE /api/v1/services/:id - 서비스 삭제 (관리자 전용)
services.delete('/:id', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { id } = c.req.param();

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  try {
    // Soft delete (status를 archived로 변경)
    await db
      .prepare('UPDATE services SET status = ?, updated_at = ? WHERE id = ?')
      .bind('archived', new Date().toISOString(), id)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('[Services API] 삭제 오류:', error);
    return c.json({ error: '서비스를 삭제할 수 없습니다' }, 500);
  }
});

export default services;
