/**
 * Changelog Entries API Handler
 * Cloudflare Workers D1 기반
 *
 * GitHub Releases 동기화 데이터 조회
 *
 * @endpoint GET /api/v1/changelog-entries - 목록 조회
 * @endpoint GET /api/v1/changelog-entries/:id - 단일 조회
 */

import { Hono } from 'hono';
import { AppType } from '../../types';

const changelogEntries = new Hono<AppType>();

// =============================================================================
// Types
// =============================================================================

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  description: string | null;
  project_id: string | null;
  github_release_url: string | null;
  released_at: string | null;
  changes: string | null;
  created_at: string;
}

interface ProjectSummary {
  id: string;
  title: string;
  slug: string;
}

// =============================================================================
// GET / - Changelog 목록 조회
// =============================================================================

changelogEntries.get('/', async (c) => {
  const db = c.env.DB;
  const { project_id, limit, offset, order_by, include } = c.req.query();

  // SQL 쿼리 빌드
  let sql = 'SELECT * FROM changelog_entries WHERE 1=1';
  const params: (string | number)[] = [];

  // 프로젝트 필터링
  if (project_id) {
    sql += ' AND project_id = ?';
    params.push(project_id);
  }

  // 정렬 (기본: released_at DESC)
  if (order_by) {
    const [field, direction] = order_by.split(':');
    const allowedFields = ['released_at', 'created_at', 'version'];
    const allowedDir = ['asc', 'desc'];
    if (allowedFields.includes(field) && allowedDir.includes(direction?.toLowerCase() || 'desc')) {
      sql += ` ORDER BY ${field} ${direction?.toUpperCase() || 'DESC'}`;
    } else {
      sql += ' ORDER BY released_at DESC';
    }
  } else {
    sql += ' ORDER BY released_at DESC';
  }

  // 페이지네이션
  const limitNum = Math.min(parseInt(limit as string) || 20, 100);
  const offsetNum = parseInt(offset as string) || 0;
  sql += ' LIMIT ? OFFSET ?';
  params.push(limitNum, offsetNum);

  try {
    const result = await db.prepare(sql).bind(...params).all<ChangelogEntry>();
    let entries = result.results || [];

    // changes 필드 JSON 파싱
    entries = entries.map((entry) => ({
      ...entry,
      changes: entry.changes ? JSON.parse(entry.changes) : [],
    }));

    // include=project인 경우 프로젝트 정보 조인
    if (include === 'project') {
      entries = await Promise.all(
        entries.map(async (entry) => {
          if (entry.project_id) {
            const project = await db
              .prepare('SELECT id, title, slug FROM projects WHERE id = ?')
              .bind(entry.project_id)
              .first<ProjectSummary>();
            return { ...entry, project: project || null };
          }
          return { ...entry, project: null };
        })
      );
    }

    return c.json(entries);
  } catch (error) {
    console.error('Changelog 조회 오류:', error);
    return c.json({ error: 'Changelog 조회에 실패했습니다.' }, 500);
  }
});

// =============================================================================
// GET /:id - 단일 Changelog 조회
// =============================================================================

changelogEntries.get('/:id', async (c) => {
  const db = c.env.DB;
  const { id } = c.req.param();
  const { include } = c.req.query();

  try {
    const entry = await db
      .prepare('SELECT * FROM changelog_entries WHERE id = ?')
      .bind(id)
      .first<ChangelogEntry>();

    if (!entry) {
      return c.json({ error: 'Changelog 항목을 찾을 수 없습니다.' }, 404);
    }

    // changes 필드 JSON 파싱
    const parsed = {
      ...entry,
      changes: entry.changes ? JSON.parse(entry.changes) : [],
    };

    // include=project인 경우 프로젝트 정보 조인
    if (include === 'project' && entry.project_id) {
      const project = await db
        .prepare('SELECT id, title, slug FROM projects WHERE id = ?')
        .bind(entry.project_id)
        .first<ProjectSummary>();
      return c.json({ ...parsed, project: project || null });
    }

    return c.json(parsed);
  } catch (error) {
    console.error('Changelog 조회 오류:', error);
    return c.json({ error: 'Changelog 조회에 실패했습니다.' }, 500);
  }
});

export default changelogEntries;
