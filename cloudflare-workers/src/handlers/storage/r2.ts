/**
 * R2 스토리지 핸들러
 * Phase 4: Supabase Storage → R2 마이그레이션
 */

import { Hono } from 'hono';
import type { Env } from '../../types';
import { authMiddleware, adminOnlyMiddleware } from '../../middleware/auth';

const r2 = new Hono<AppType>();

// 허용된 MIME 타입
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/json',
];

// 파일 크기 제한 (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 파일명 생성
function generateFileName(originalName: string): string {
  const ext = originalName.split('.').pop() || '';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
}

// 폴더 경로 생성
function getFolderPath(folder: string, userId?: string): string {
  const baseFolders = ['uploads', 'avatars', 'documents', 'media'];
  if (!baseFolders.includes(folder)) {
    folder = 'uploads';
  }
  return userId ? `${folder}/${userId}` : folder;
}

// GET /storage/files - 파일 목록 조회
r2.get('/files', authMiddleware, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth');
  const { folder = 'uploads', limit = '50', cursor } = c.req.query();

  try {
    let query = `
      SELECT id, filename, original_name, mime_type, size, url, thumbnail_url, folder, created_at
      FROM media_library
      WHERE uploaded_by = ?
    `;
    const params: unknown[] = [auth.userId];

    if (folder !== 'all') {
      query += ' AND folder = ?';
      params.push(folder);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    if (cursor) {
      query = query.replace('ORDER BY', `AND created_at < ? ORDER BY`);
      params.splice(-1, 0, cursor);
    }

    const result = await db.prepare(query).bind(...params).all();

    return c.json({
      files: result.results,
      nextCursor: result.results.length === parseInt(limit)
        ? (result.results[result.results.length - 1] as { created_at: string }).created_at
        : null,
    });
  } catch (error) {
    console.error('파일 목록 조회 오류:', error);
    return c.json({ error: '파일 목록 조회 중 오류가 발생했습니다' }, 500);
  }
});

// POST /storage/upload - 파일 업로드
r2.post('/upload', authMiddleware, async (c) => {
  const bucket = c.env.MEDIA_BUCKET;
  const db = c.env.DB;
  const auth = c.get('auth');

  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'uploads';

    if (!file) {
      return c.json({ error: '파일이 필요합니다' }, 400);
    }

    // MIME 타입 검증
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return c.json({
        error: `허용되지 않는 파일 형식입니다. 허용: ${ALLOWED_MIME_TYPES.join(', ')}`
      }, 400);
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return c.json({
        error: `파일 크기가 너무 큽니다. 최대: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      }, 400);
    }

    // 파일명 생성
    const filename = generateFileName(file.name);
    const folderPath = getFolderPath(folder, auth.userId);
    const key = `${folderPath}/${filename}`;

    // R2에 업로드
    const arrayBuffer = await file.arrayBuffer();
    await bucket.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        uploadedBy: auth.userId || '',
      },
    });

    // 공개 URL 생성
    const publicUrl = `https://media.ideaonaction.ai/${key}`;

    // 썸네일 URL (이미지인 경우)
    let thumbnailUrl: string | null = null;
    if (file.type.startsWith('image/')) {
      thumbnailUrl = `https://media.ideaonaction.ai/${key}?width=200&height=200&fit=cover`;
    }

    // DB에 메타데이터 저장
    const mediaId = crypto.randomUUID();
    await db
      .prepare(`
        INSERT INTO media_library (id, filename, original_name, mime_type, size, url, thumbnail_url, folder, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        mediaId,
        filename,
        file.name,
        file.type,
        file.size,
        publicUrl,
        thumbnailUrl,
        folder,
        auth.userId
      )
      .run();

    return c.json({
      id: mediaId,
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      url: publicUrl,
      thumbnailUrl,
      folder,
    }, 201);
  } catch (error) {
    console.error('파일 업로드 오류:', error);
    return c.json({ error: '파일 업로드 중 오류가 발생했습니다' }, 500);
  }
});

// POST /storage/upload-url - 서명된 업로드 URL 생성
r2.post('/upload-url', authMiddleware, async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json<{
    filename: string;
    mimeType: string;
    folder?: string;
  }>();

  const { filename, mimeType, folder = 'uploads' } = body;

  if (!filename || !mimeType) {
    return c.json({ error: 'filename, mimeType는 필수입니다' }, 400);
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return c.json({ error: '허용되지 않는 파일 형식입니다' }, 400);
  }

  try {
    const newFilename = generateFileName(filename);
    const folderPath = getFolderPath(folder, auth.userId);
    const key = `${folderPath}/${newFilename}`;

    // Note: R2는 현재 서명된 URL을 직접 지원하지 않음
    // 대안: Workers를 통한 업로드 프록시 또는 presigned URL 시뮬레이션

    return c.json({
      key,
      uploadUrl: `/api/storage/upload-direct?key=${encodeURIComponent(key)}`,
      publicUrl: `https://media.ideaonaction.ai/${key}`,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('업로드 URL 생성 오류:', error);
    return c.json({ error: '업로드 URL 생성 중 오류가 발생했습니다' }, 500);
  }
});

// PUT /storage/upload-direct - 직접 업로드 (서명된 URL 대안)
r2.put('/upload-direct', authMiddleware, async (c) => {
  const bucket = c.env.MEDIA_BUCKET;
  const db = c.env.DB;
  const auth = c.get('auth');
  const { key } = c.req.query();

  if (!key) {
    return c.json({ error: 'key 파라미터가 필요합니다' }, 400);
  }

  // 권한 검증 (자신의 폴더인지 확인)
  if (!key.includes(`/${auth.userId}/`) && !auth.isAdmin) {
    return c.json({ error: '권한이 없습니다' }, 403);
  }

  try {
    const contentType = c.req.header('Content-Type') || 'application/octet-stream';
    const body = await c.req.arrayBuffer();

    if (body.byteLength > MAX_FILE_SIZE) {
      return c.json({ error: '파일 크기가 너무 큽니다' }, 400);
    }

    await bucket.put(key, body, {
      httpMetadata: {
        contentType,
      },
      customMetadata: {
        uploadedBy: auth.userId || '',
      },
    });

    const publicUrl = `https://media.ideaonaction.ai/${key}`;

    // DB에 메타데이터 저장
    const filename = key.split('/').pop() || key;
    const folder = key.split('/')[0];
    const mediaId = crypto.randomUUID();

    await db
      .prepare(`
        INSERT INTO media_library (id, filename, original_name, mime_type, size, url, folder, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        mediaId,
        filename,
        filename,
        contentType,
        body.byteLength,
        publicUrl,
        folder,
        auth.userId
      )
      .run();

    return c.json({
      id: mediaId,
      url: publicUrl,
    });
  } catch (error) {
    console.error('직접 업로드 오류:', error);
    return c.json({ error: '업로드 중 오류가 발생했습니다' }, 500);
  }
});

// DELETE /storage/files/:id - 파일 삭제
r2.delete('/files/:id', authMiddleware, async (c) => {
  const bucket = c.env.MEDIA_BUCKET;
  const db = c.env.DB;
  const auth = c.get('auth');
  const fileId = c.req.param('id');

  try {
    // 파일 정보 조회
    const file = await db
      .prepare('SELECT * FROM media_library WHERE id = ?')
      .bind(fileId)
      .first();

    if (!file) {
      return c.json({ error: '파일을 찾을 수 없습니다' }, 404);
    }

    // 권한 확인
    if (file.uploaded_by !== auth.userId && !auth.isAdmin) {
      return c.json({ error: '권한이 없습니다' }, 403);
    }

    // R2에서 삭제
    const url = new URL(file.url as string);
    const key = url.pathname.substring(1); // 앞의 / 제거
    await bucket.delete(key);

    // DB에서 삭제
    await db.prepare('DELETE FROM media_library WHERE id = ?').bind(fileId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('파일 삭제 오류:', error);
    return c.json({ error: '파일 삭제 중 오류가 발생했습니다' }, 500);
  }
});

// GET /storage/files/:id/download - 파일 다운로드
r2.get('/files/:id/download', authMiddleware, async (c) => {
  const bucket = c.env.MEDIA_BUCKET;
  const db = c.env.DB;
  const auth = c.get('auth');
  const fileId = c.req.param('id');

  try {
    const file = await db
      .prepare('SELECT * FROM media_library WHERE id = ?')
      .bind(fileId)
      .first();

    if (!file) {
      return c.json({ error: '파일을 찾을 수 없습니다' }, 404);
    }

    // 비공개 폴더 권한 확인
    if (file.folder === 'private' && file.uploaded_by !== auth.userId && !auth.isAdmin) {
      return c.json({ error: '권한이 없습니다' }, 403);
    }

    const url = new URL(file.url as string);
    const key = url.pathname.substring(1);
    const object = await bucket.get(key);

    if (!object) {
      return c.json({ error: '파일을 찾을 수 없습니다' }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', file.mime_type as string);
    headers.set('Content-Disposition', `attachment; filename="${file.original_name}"`);
    headers.set('Content-Length', String(file.size));

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('파일 다운로드 오류:', error);
    return c.json({ error: '파일 다운로드 중 오류가 발생했습니다' }, 500);
  }
});

// 관리자: 스토리지 통계
r2.get('/stats', adminOnlyMiddleware, async (c) => {
  const db = c.env.DB;

  try {
    const stats = await db
      .prepare(`
        SELECT
          folder,
          COUNT(*) as file_count,
          SUM(size) as total_size,
          AVG(size) as avg_size
        FROM media_library
        GROUP BY folder
      `)
      .all();

    const totalStats = await db
      .prepare(`
        SELECT
          COUNT(*) as total_files,
          SUM(size) as total_size,
          COUNT(DISTINCT uploaded_by) as unique_uploaders
        FROM media_library
      `)
      .first();

    return c.json({
      byFolder: stats.results,
      total: totalStats,
    });
  } catch (error) {
    console.error('스토리지 통계 조회 오류:', error);
    return c.json({ error: '통계 조회 중 오류가 발생했습니다' }, 500);
  }
});

export default r2;
