/**
 * OAuth 2.0 토큰 폐기 엔드포인트
 * Wave 3: 고위험 함수 - RFC 7009
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { requireAuth } from '../../middleware/auth';

const revoke = new Hono<AppType>();

interface RevokeRequest {
  token: string;
  token_type_hint?: 'access_token' | 'refresh_token';
  client_id?: string;
  client_secret?: string;
}

// POST /oauth/revoke - 토큰 폐기
revoke.post('/', async (c) => {
  const db = c.env.DB;
  const contentType = c.req.header('Content-Type');

  let body: RevokeRequest;

  if (contentType?.includes('application/json')) {
    body = await c.req.json<RevokeRequest>();
  } else {
    const formData = await c.req.parseBody();
    body = formData as unknown as RevokeRequest;
  }

  const { token, token_type_hint, client_id } = body;

  if (!token) {
    return c.json({
      error: 'invalid_request',
      error_description: 'token은 필수입니다',
    }, 400);
  }

  try {
    // 리프레시 토큰인지 확인
    if (!token_type_hint || token_type_hint === 'refresh_token') {
      const result = await db
        .prepare(`
          UPDATE oauth_refresh_tokens
          SET is_revoked = 1, updated_at = datetime('now')
          WHERE token = ? ${client_id ? 'AND client_id = ?' : ''}
        `)
        .bind(...(client_id ? [token, client_id] : [token]))
        .run();

      if (result.meta.changes && result.meta.changes > 0) {
        return c.json({ success: true });
      }
    }

    // 액세스 토큰인 경우 (JWT이므로 블랙리스트에 추가)
    if (!token_type_hint || token_type_hint === 'access_token') {
      // JWT 디코딩해서 만료시간 확인
      try {
        const [, payloadBase64] = token.split('.');
        const payload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));

        if (payload.exp) {
          const expiresAt = new Date(payload.exp * 1000);

          // 블랙리스트에 추가 (KV 사용)
          const kv = c.env.CACHE;
          await kv.put(
            `token_blacklist:${token}`,
            JSON.stringify({ revoked_at: new Date().toISOString() }),
            { expirationTtl: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000) + 60) }
          );

          return c.json({ success: true });
        }
      } catch {
        // JWT 파싱 실패 시 무시
      }
    }

    // RFC 7009: 토큰을 찾지 못해도 200 반환
    return c.json({ success: true });
  } catch (error) {
    console.error('토큰 폐기 오류:', error);
    return c.json({
      error: 'server_error',
      error_description: '토큰 폐기 중 오류가 발생했습니다',
    }, 500);
  }
});

// POST /oauth/revoke/all - 사용자의 모든 토큰 폐기
revoke.post('/all', requireAuth, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth')!;
  const body = await c.req.json<{ client_id?: string }>();

  try {
    // 특정 클라이언트 또는 모든 클라이언트의 토큰 폐기
    if (body.client_id) {
      await db
        .prepare(`
          UPDATE oauth_refresh_tokens
          SET is_revoked = 1, updated_at = datetime('now')
          WHERE user_id = ? AND client_id = ?
        `)
        .bind(auth.userId, body.client_id)
        .run();
    } else {
      await db
        .prepare(`
          UPDATE oauth_refresh_tokens
          SET is_revoked = 1, updated_at = datetime('now')
          WHERE user_id = ?
        `)
        .bind(auth.userId)
        .run();
    }

    return c.json({
      success: true,
      message: '모든 토큰이 폐기되었습니다',
    });
  } catch (error) {
    console.error('토큰 일괄 폐기 오류:', error);
    return c.json({
      error: 'server_error',
      error_description: '토큰 폐기 중 오류가 발생했습니다',
    }, 500);
  }
});

// GET /oauth/sessions - 활성 OAuth 세션 조회
revoke.get('/sessions', requireAuth, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth')!;

  try {
    const sessions = await db
      .prepare(`
        SELECT
          rt.id,
          rt.client_id,
          oc.name as client_name,
          rt.scope,
          rt.created_at,
          rt.expires_at
        FROM oauth_refresh_tokens rt
        INNER JOIN oauth_clients oc ON rt.client_id = oc.client_id
        WHERE rt.user_id = ? AND rt.is_revoked = 0 AND rt.expires_at > datetime('now')
        ORDER BY rt.created_at DESC
      `)
      .bind(auth.userId)
      .all();

    return c.json({ sessions: sessions.results });
  } catch (error) {
    console.error('OAuth 세션 조회 오류:', error);
    return c.json({
      error: 'server_error',
      error_description: '세션 조회 중 오류가 발생했습니다',
    }, 500);
  }
});

// DELETE /oauth/sessions/:id - 특정 OAuth 세션 폐기
revoke.delete('/sessions/:id', requireAuth, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth')!;
  const sessionId = c.req.param('id');

  try {
    const result = await db
      .prepare(`
        UPDATE oauth_refresh_tokens
        SET is_revoked = 1, updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `)
      .bind(sessionId, auth.userId)
      .run();

    if (result.meta.changes === 0) {
      return c.json({
        error: 'not_found',
        error_description: '세션을 찾을 수 없습니다',
      }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('OAuth 세션 폐기 오류:', error);
    return c.json({
      error: 'server_error',
      error_description: '세션 폐기 중 오류가 발생했습니다',
    }, 500);
  }
});

export default revoke;
