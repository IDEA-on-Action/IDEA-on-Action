/**
 * Blog API 핸들러
 * 블로그 포스트 및 카테고리 CRUD
 */

import { Hono } from 'hono';
import { AppType } from '../../types';

const blog = new Hono<AppType>();

// 블로그 포스트 타입
interface BlogPost {
  id: string;
  slug: string;
  title: string;
  title_ko: string;
  content: string;
  content_ko: string;
  excerpt: string | null;
  excerpt_ko: string | null;
  featured_image: string | null;
  status: 'draft' | 'published' | 'archived';
  category_id: string | null;
  author_id: string;
  published_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

// GET /api/v1/blog/posts - 블로그 목록 조회
blog.get('/posts', async (c) => {
  const db = c.env.DB;
  const { status, category_id, tag, limit, offset, search } = c.req.query();

  try {
    let sql = 'SELECT * FROM blog_posts WHERE 1=1';
    const params: (string | number)[] = [];

    // 상태 필터 (기본값: published)
    sql += ' AND status = ?';
    params.push(status || 'published');

    // 카테고리 필터
    if (category_id) {
      sql += ' AND category_id = ?';
      params.push(category_id);
    }

    // 검색
    if (search) {
      sql += ' AND (title LIKE ? OR title_ko LIKE ? OR content LIKE ? OR content_ko LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY published_at DESC, created_at DESC';

    const limitNum = parseInt(limit as string) || 20;
    const offsetNum = parseInt(offset as string) || 0;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offsetNum);

    const result = await db.prepare(sql).bind(...params).all<BlogPost>();

    // 작성자 정보 추가
    const postsWithAuthor = await Promise.all(
      (result.results || []).map(async (post) => {
        const author = await db
          .prepare('SELECT id, name, email, avatar_url FROM users WHERE id = ?')
          .bind(post.author_id)
          .first();

        const category = post.category_id
          ? await db
              .prepare('SELECT * FROM blog_categories WHERE id = ?')
              .bind(post.category_id)
              .first()
          : null;

        // 태그 조회
        const tags = await db
          .prepare(`
            SELECT t.* FROM tags t
            JOIN blog_post_tags bpt ON t.id = bpt.tag_id
            WHERE bpt.post_id = ?
          `)
          .bind(post.id)
          .all();

        return { ...post, author, category, tags: tags.results || [] };
      })
    );

    // 전체 개수 조회
    let countSql = 'SELECT COUNT(*) as count FROM blog_posts WHERE status = ?';
    const countParams: (string | number)[] = [status || 'published'];
    if (category_id) {
      countSql += ' AND category_id = ?';
      countParams.push(category_id);
    }
    const countResult = await db.prepare(countSql).bind(...countParams).first<{ count: number }>();

    return c.json({
      data: postsWithAuthor,
      meta: {
        total: countResult?.count || 0,
        limit: limitNum,
        offset: offsetNum,
      },
    });
  } catch (error) {
    console.error('[Blog API] 목록 조회 오류:', error);
    return c.json({ error: '블로그 목록을 조회할 수 없습니다' }, 500);
  }
});

// GET /api/v1/blog/posts/:slug - 블로그 상세 조회
blog.get('/posts/:slug', async (c) => {
  const db = c.env.DB;
  const { slug } = c.req.param();

  try {
    const post = await db
      .prepare('SELECT * FROM blog_posts WHERE slug = ?')
      .bind(slug)
      .first<BlogPost>();

    if (!post) {
      return c.json({ error: '포스트를 찾을 수 없습니다' }, 404);
    }

    // 조회수 증가
    await db
      .prepare('UPDATE blog_posts SET view_count = view_count + 1 WHERE id = ?')
      .bind(post.id)
      .run();

    // 작성자 정보
    const author = await db
      .prepare('SELECT id, name, email, avatar_url FROM users WHERE id = ?')
      .bind(post.author_id)
      .first();

    // 카테고리 정보
    const category = post.category_id
      ? await db
          .prepare('SELECT * FROM blog_categories WHERE id = ?')
          .bind(post.category_id)
          .first()
      : null;

    // 태그 조회
    const tags = await db
      .prepare(`
        SELECT t.* FROM tags t
        JOIN blog_post_tags bpt ON t.id = bpt.tag_id
        WHERE bpt.post_id = ?
      `)
      .bind(post.id)
      .all();

    // 관련 포스트 (같은 카테고리)
    const relatedPosts = post.category_id
      ? await db
          .prepare(`
            SELECT id, slug, title, title_ko, featured_image, published_at
            FROM blog_posts
            WHERE category_id = ? AND id != ? AND status = 'published'
            ORDER BY published_at DESC
            LIMIT 3
          `)
          .bind(post.category_id, post.id)
          .all()
      : { results: [] };

    return c.json({
      data: {
        ...post,
        view_count: post.view_count + 1,
        author,
        category,
        tags: tags.results || [],
        related_posts: relatedPosts.results || [],
      },
    });
  } catch (error) {
    console.error('[Blog API] 상세 조회 오류:', error);
    return c.json({ error: '포스트를 조회할 수 없습니다' }, 500);
  }
});

// GET /api/v1/blog/categories - 카테고리 목록
blog.get('/categories', async (c) => {
  const db = c.env.DB;

  try {
    const result = await db
      .prepare('SELECT * FROM blog_categories WHERE is_active = 1 ORDER BY display_order ASC')
      .all();

    // 각 카테고리의 포스트 개수
    const categoriesWithCount = await Promise.all(
      (result.results || []).map(async (category: Record<string, unknown>) => {
        const countResult = await db
          .prepare('SELECT COUNT(*) as count FROM blog_posts WHERE category_id = ? AND status = ?')
          .bind(category.id, 'published')
          .first<{ count: number }>();

        return { ...category, post_count: countResult?.count || 0 };
      })
    );

    return c.json({ data: categoriesWithCount });
  } catch (error) {
    console.error('[Blog API] 카테고리 조회 오류:', error);
    return c.json({ error: '카테고리를 조회할 수 없습니다' }, 500);
  }
});

// GET /api/v1/blog/tags - 태그 목록
blog.get('/tags', async (c) => {
  const db = c.env.DB;

  try {
    const result = await db
      .prepare(`
        SELECT t.*, COUNT(bpt.post_id) as post_count
        FROM tags t
        LEFT JOIN blog_post_tags bpt ON t.id = bpt.tag_id
        GROUP BY t.id
        ORDER BY post_count DESC
        LIMIT 50
      `)
      .all();

    return c.json({ data: result.results || [] });
  } catch (error) {
    console.error('[Blog API] 태그 조회 오류:', error);
    return c.json({ error: '태그를 조회할 수 없습니다' }, 500);
  }
});

// POST /api/v1/blog/posts - 포스트 생성 (관리자)
blog.post('/posts', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  try {
    const body = await c.req.json();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await db
      .prepare(`
        INSERT INTO blog_posts (id, slug, title, title_ko, content, content_ko, excerpt, excerpt_ko, featured_image, status, category_id, author_id, published_at, view_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `)
      .bind(
        id,
        body.slug,
        body.title,
        body.title_ko || body.title,
        body.content || '',
        body.content_ko || body.content || '',
        body.excerpt || null,
        body.excerpt_ko || body.excerpt || null,
        body.featured_image || null,
        body.status || 'draft',
        body.category_id || null,
        user.id,
        body.status === 'published' ? now : null,
        now,
        now
      )
      .run();

    // 태그 연결
    if (body.tag_ids && Array.isArray(body.tag_ids)) {
      for (const tagId of body.tag_ids) {
        await db
          .prepare('INSERT INTO blog_post_tags (post_id, tag_id) VALUES (?, ?)')
          .bind(id, tagId)
          .run();
      }
    }

    const post = await db
      .prepare('SELECT * FROM blog_posts WHERE id = ?')
      .bind(id)
      .first<BlogPost>();

    return c.json({ data: post }, 201);
  } catch (error) {
    console.error('[Blog API] 생성 오류:', error);
    return c.json({ error: '포스트를 생성할 수 없습니다' }, 500);
  }
});

// PATCH /api/v1/blog/posts/:id - 포스트 수정 (관리자)
blog.patch('/posts/:id', async (c) => {
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
      'slug', 'title', 'title_ko', 'content', 'content_ko',
      'excerpt', 'excerpt_ko', 'featured_image', 'status', 'category_id'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    // 상태가 published로 변경되면 published_at 설정
    if (body.status === 'published') {
      const existing = await db
        .prepare('SELECT published_at FROM blog_posts WHERE id = ?')
        .bind(id)
        .first<{ published_at: string | null }>();

      if (!existing?.published_at) {
        updates.push('published_at = ?');
        values.push(now);
      }
    }

    values.push(id);

    await db
      .prepare(`UPDATE blog_posts SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    // 태그 업데이트
    if (body.tag_ids !== undefined) {
      await db.prepare('DELETE FROM blog_post_tags WHERE post_id = ?').bind(id).run();
      if (Array.isArray(body.tag_ids)) {
        for (const tagId of body.tag_ids) {
          await db
            .prepare('INSERT INTO blog_post_tags (post_id, tag_id) VALUES (?, ?)')
            .bind(id, tagId)
            .run();
        }
      }
    }

    const post = await db
      .prepare('SELECT * FROM blog_posts WHERE id = ?')
      .bind(id)
      .first<BlogPost>();

    return c.json({ data: post });
  } catch (error) {
    console.error('[Blog API] 수정 오류:', error);
    return c.json({ error: '포스트를 수정할 수 없습니다' }, 500);
  }
});

// DELETE /api/v1/blog/posts/:id - 포스트 삭제
blog.delete('/posts/:id', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { id } = c.req.param();

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  try {
    // Soft delete
    await db
      .prepare('UPDATE blog_posts SET status = ?, updated_at = ? WHERE id = ?')
      .bind('archived', new Date().toISOString(), id)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('[Blog API] 삭제 오류:', error);
    return c.json({ error: '포스트를 삭제할 수 없습니다' }, 500);
  }
});

export default blog;
