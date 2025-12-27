/**
 * 프로필 동기화 핸들러
 * Cloudflare Workers Migration from Supabase Edge Function
 *
 * ideaonaction ↔ Minu 프로필 실시간 동기화
 *
 * @endpoint POST /profile/sync - 프로필 동기화 트리거
 * @endpoint POST /profile/webhook - Minu 변경 사항 수신
 * @endpoint GET /profile/status/:userId - 동기화 상태 조회
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { requireAuth } from '../../middleware/auth';

const profileSync = new Hono<AppType>();

// =============================================================================
// 타입 정의
// =============================================================================

type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
type SyncDirection = 'ideaonaction_to_minu' | 'minu_to_ideaonaction' | 'bidirectional';
type SyncResult = 'success' | 'partial' | 'conflict' | 'failed';
type TriggeredBy = 'user' | 'webhook' | 'scheduled' | 'manual';

interface IdeaOnActionProfile {
  email: string;
  name?: string;
  avatar_url?: string;
  company?: string;
  job_title?: string;
  updated_at?: string;
}

interface MinuProfile {
  email: string;
  name?: string;
  avatar_url?: string;
  company?: string;
  job_title?: string;
  updated_at?: string;
}

interface SyncRequest {
  user_id: string;
  direction?: SyncDirection;
  force?: boolean;
}

interface WebhookPayload {
  user_id: string;
  profile: MinuProfile;
  event_type: 'profile.updated' | 'profile.created';
  timestamp: string;
}

interface ProfileSyncStatusRecord {
  id: string;
  user_id: string;
  sync_status: SyncStatus;
  last_sync_direction: SyncDirection | null;
  last_synced_at: string | null;
  ideaonaction_updated_at: string | null;
  minu_updated_at: string | null;
  conflict_fields: string | null;
  conflict_resolved_at: string | null;
  error_message: string | null;
  error_count: number;
  last_error_at: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// 상수
// =============================================================================

const SYNC_FIELDS = {
  required: ['email', 'name'] as const,
  optional: ['avatar_url', 'company', 'job_title'] as const,
};

// =============================================================================
// 유틸리티 함수
// =============================================================================

/**
 * HMAC-SHA256 서명 검증
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  timestamp: string | null,
  secret: string
): Promise<{ valid: boolean; error?: string }> {
  if (!signature || !timestamp) {
    return { valid: false, error: 'missing_signature' };
  }

  // 타임스탬프 검증 (5분 이내)
  const now = Math.floor(Date.now() / 1000);
  const webhookTimestamp = parseInt(timestamp, 10);
  if (Math.abs(now - webhookTimestamp) > 300) {
    return { valid: false, error: 'timestamp_expired' };
  }

  // HMAC 서명 계산
  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (signature !== expectedSignature) {
    return { valid: false, error: 'invalid_signature' };
  }

  return { valid: true };
}

/**
 * 충돌 감지
 */
function detectConflicts(
  ideaonactionProfile: IdeaOnActionProfile,
  minuProfile: MinuProfile,
  ideaonactionUpdatedAt: string | null,
  minuUpdatedAt: string | null
): Record<string, { ideaonaction: unknown; minu: unknown }> | null {
  const conflicts: Record<string, { ideaonaction: unknown; minu: unknown }> = {};

  if (ideaonactionUpdatedAt && minuUpdatedAt) {
    const ideaonactionTime = new Date(ideaonactionUpdatedAt).getTime();
    const minuTime = new Date(minuUpdatedAt).getTime();

    // 5초 이내 동시 업데이트 = 충돌 가능성
    if (Math.abs(ideaonactionTime - minuTime) < 5000) {
      const allFields = [...SYNC_FIELDS.required, ...SYNC_FIELDS.optional] as const;
      for (const field of allFields) {
        const ideaonactionValue = ideaonactionProfile[field as keyof IdeaOnActionProfile];
        const minuValue = minuProfile[field as keyof MinuProfile];

        if (ideaonactionValue !== minuValue && ideaonactionValue && minuValue) {
          conflicts[field] = {
            ideaonaction: ideaonactionValue,
            minu: minuValue,
          };
        }
      }
    }
  }

  return Object.keys(conflicts).length > 0 ? conflicts : null;
}

/**
 * 충돌 해결 (최신 timestamp 우선)
 */
function resolveConflict(
  ideaonactionProfile: IdeaOnActionProfile,
  minuProfile: MinuProfile,
  ideaonactionUpdatedAt: string | null,
  minuUpdatedAt: string | null
): { profile: IdeaOnActionProfile; winner: 'ideaonaction' | 'minu' } {
  if (ideaonactionUpdatedAt && minuUpdatedAt) {
    const ideaonactionTime = new Date(ideaonactionUpdatedAt).getTime();
    const minuTime = new Date(minuUpdatedAt).getTime();

    if (ideaonactionTime >= minuTime) {
      return { profile: ideaonactionProfile, winner: 'ideaonaction' };
    } else {
      return { profile: minuProfile as IdeaOnActionProfile, winner: 'minu' };
    }
  }

  return { profile: ideaonactionProfile, winner: 'ideaonaction' };
}

/**
 * Minu API 호출
 */
async function callMinuAPI(
  endpoint: string,
  method: string,
  apiKey: string,
  baseUrl: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; data?: unknown; error?: string }> {
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok && response.status !== 404) {
      return { ok: false, status: response.status, error: `Minu API 오류: ${response.status}` };
    }

    if (response.status === 404) {
      return { ok: true, status: 404, data: null };
    }

    const data = await response.json();
    return { ok: true, status: response.status, data };
  } catch (error) {
    console.error('Minu API 호출 오류:', error);
    return { ok: false, status: 500, error: String(error) };
  }
}

// =============================================================================
// 핸들러
// =============================================================================

/**
 * POST /sync - 프로필 동기화 트리거
 */
profileSync.post('/sync', requireAuth, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth')!;
  const requestId = c.req.header('CF-Ray') || crypto.randomUUID();

  let body: SyncRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '유효하지 않은 JSON 페이로드입니다.' }, 400);
  }

  if (!body.user_id) {
    return c.json({ error: 'user_id 필드가 필요합니다.' }, 400);
  }

  // 본인 또는 관리자만 동기화 가능
  if (body.user_id !== auth.userId && !auth.isAdmin) {
    return c.json({ error: '권한이 없습니다.' }, 403);
  }

  const direction: SyncDirection = body.direction || 'bidirectional';
  const force = body.force || false;

  const minuApiKey = c.env.MINU_API_KEY;
  const minuBaseUrl = c.env.MINU_API_BASE_URL || 'https://api.minu.best';

  if (!minuApiKey) {
    return c.json({ error: 'MINU_API_KEY가 설정되지 않았습니다.' }, 500);
  }

  try {
    // 1. 동기화 상태 업데이트 (syncing)
    await db
      .prepare(
        `
        INSERT INTO profile_sync_status (id, user_id, sync_status, last_sync_direction, updated_at)
        VALUES (?, ?, 'syncing', ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          sync_status = 'syncing',
          last_sync_direction = excluded.last_sync_direction,
          updated_at = datetime('now')
      `
      )
      .bind(crypto.randomUUID(), body.user_id, direction)
      .run();

    // 2. ideaonaction 프로필 조회 (profiles.id = user_id)
    const ideaProfile = await db
      .prepare(
        `
        SELECT id, email, display_name, avatar_url, metadata, updated_at
        FROM profiles
        WHERE id = ?
      `
      )
      .bind(body.user_id)
      .first<{
        id: string;
        email: string | null;
        display_name: string | null;
        avatar_url: string | null;
        metadata: string | null;
        updated_at: string | null;
      }>();

    if (!ideaProfile) {
      return c.json({ error: '프로필을 찾을 수 없습니다.' }, 404);
    }

    const metadata = ideaProfile.metadata ? JSON.parse(ideaProfile.metadata) : {};
    const ideaonactionProfile: IdeaOnActionProfile = {
      email: ideaProfile.email || '',
      name: ideaProfile.display_name || '',
      avatar_url: ideaProfile.avatar_url || undefined,
      company: metadata.company || undefined,
      job_title: metadata.job_title || undefined,
      updated_at: ideaProfile.updated_at || undefined,
    };

    // 3. Minu 프로필 조회
    const minuResponse = await callMinuAPI(
      `/v1/profiles/${ideaProfile.email}`,
      'GET',
      minuApiKey,
      minuBaseUrl
    );

    if (!minuResponse.ok) {
      throw new Error(minuResponse.error);
    }

    const minuProfile: MinuProfile | null = minuResponse.data as MinuProfile | null;

    // 4. 충돌 감지
    let syncResult: SyncResult = 'success';
    let conflictFields: Record<string, unknown> | null = null;
    let finalProfile = ideaonactionProfile;

    if (minuProfile && !force) {
      conflictFields = detectConflicts(
        ideaonactionProfile,
        minuProfile,
        ideaonactionProfile.updated_at || null,
        minuProfile.updated_at || null
      );

      if (conflictFields) {
        const resolved = resolveConflict(
          ideaonactionProfile,
          minuProfile,
          ideaonactionProfile.updated_at || null,
          minuProfile.updated_at || null
        );
        finalProfile = resolved.profile;
        syncResult = 'conflict';
        console.log(`Conflict resolved: ${resolved.winner} wins`);
      }
    }

    // 5. 동기화 수행
    const syncedFields: string[] = [];

    // ideaonaction → Minu
    if (direction === 'ideaonaction_to_minu' || direction === 'bidirectional') {
      const updateResult = await callMinuAPI(
        `/v1/profiles/${ideaProfile.email}`,
        'PUT',
        minuApiKey,
        minuBaseUrl,
        finalProfile
      );

      if (!updateResult.ok) {
        throw new Error(`Minu 프로필 업데이트 실패: ${updateResult.error}`);
      }

      syncedFields.push(...Object.keys(finalProfile).filter((k) => finalProfile[k as keyof IdeaOnActionProfile]));
    }

    // Minu → ideaonaction
    if ((direction === 'minu_to_ideaonaction' || direction === 'bidirectional') && minuProfile) {
      const newMetadata = JSON.stringify({
        ...metadata,
        company: finalProfile.company,
        job_title: finalProfile.job_title,
      });

      await db
        .prepare(
          `
          UPDATE profiles
          SET display_name = ?, avatar_url = ?, metadata = ?, updated_at = datetime('now')
          WHERE id = ?
        `
        )
        .bind(finalProfile.name || null, finalProfile.avatar_url || null, newMetadata, body.user_id)
        .run();

      syncedFields.push(...Object.keys(finalProfile).filter((k) => finalProfile[k as keyof IdeaOnActionProfile]));
    }

    // 6. 동기화 상태 업데이트
    await db
      .prepare(
        `
        UPDATE profile_sync_status
        SET sync_status = ?,
            last_synced_at = datetime('now'),
            ideaonaction_updated_at = ?,
            minu_updated_at = ?,
            conflict_fields = ?,
            conflict_resolved_at = ?,
            error_count = 0,
            error_message = NULL,
            updated_at = datetime('now')
        WHERE user_id = ?
      `
      )
      .bind(
        syncResult === 'conflict' ? 'conflict' : 'synced',
        ideaonactionProfile.updated_at || null,
        minuProfile?.updated_at || null,
        conflictFields ? JSON.stringify(conflictFields) : null,
        conflictFields ? new Date().toISOString() : null,
        body.user_id
      )
      .run();

    // 7. 동기화 이력 기록
    await db
      .prepare(
        `
        INSERT INTO profile_sync_history (
          id, user_id, sync_direction, sync_result, synced_fields,
          conflict_fields, before_data, after_data, triggered_by, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user', datetime('now'))
      `
      )
      .bind(
        crypto.randomUUID(),
        body.user_id,
        direction,
        syncResult,
        JSON.stringify([...new Set(syncedFields)]),
        conflictFields ? JSON.stringify(conflictFields) : null,
        JSON.stringify({ ideaonaction: ideaonactionProfile, minu: minuProfile }),
        JSON.stringify(finalProfile),
      )
      .run();

    console.log(`Profile synced: ${body.user_id}, result: ${syncResult}`);

    return c.json({
      synced: true,
      user_id: body.user_id,
      sync_direction: direction,
      sync_result: syncResult,
      synced_fields: [...new Set(syncedFields)],
      conflict_fields: conflictFields,
      synced_at: new Date().toISOString(),
      request_id: requestId,
    });
  } catch (error) {
    console.error('Sync error:', error);

    // 에러 상태 업데이트
    const currentStatus = await db
      .prepare('SELECT error_count FROM profile_sync_status WHERE user_id = ?')
      .bind(body.user_id)
      .first<{ error_count: number }>();

    await db
      .prepare(
        `
        INSERT INTO profile_sync_status (id, user_id, sync_status, error_message, error_count, last_error_at, updated_at)
        VALUES (?, ?, 'failed', ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          sync_status = 'failed',
          error_message = excluded.error_message,
          error_count = excluded.error_count,
          last_error_at = datetime('now'),
          updated_at = datetime('now')
      `
      )
      .bind(
        crypto.randomUUID(),
        body.user_id,
        String(error),
        (currentStatus?.error_count || 0) + 1
      )
      .run();

    return c.json(
      {
        error: '프로필 동기화에 실패했습니다.',
        details: String(error),
        request_id: requestId,
      },
      500
    );
  }
});

/**
 * POST /webhook - Minu 변경 사항 수신
 */
profileSync.post('/webhook', async (c) => {
  const db = c.env.DB;
  const requestId = c.req.header('CF-Ray') || crypto.randomUUID();

  const webhookSecret = c.env.WEBHOOK_SECRET_MINU || '';
  if (!webhookSecret) {
    console.error('WEBHOOK_SECRET_MINU가 설정되지 않았습니다.');
    return c.json({ error: '서버 설정 오류입니다.' }, 500);
  }

  // 서명 검증
  const signature = c.req.header('x-webhook-signature') || null;
  const timestamp = c.req.header('x-webhook-timestamp') || null;
  const payload = await c.req.text();

  const verification = await verifyWebhookSignature(payload, signature, timestamp, webhookSecret || '');

  if (!verification.valid) {
    return c.json(
      {
        error: 'Webhook 서명 검증 실패',
        code: verification.error,
        request_id: requestId,
      },
      401
    );
  }

  // 페이로드 파싱
  let webhookPayload: WebhookPayload;
  try {
    webhookPayload = JSON.parse(payload);
  } catch {
    return c.json({ error: '유효하지 않은 JSON 페이로드입니다.' }, 400);
  }

  if (!webhookPayload.user_id || !webhookPayload.profile) {
    return c.json({ error: 'user_id와 profile 필드가 필요합니다.' }, 400);
  }

  try {
    const minuProfile = webhookPayload.profile;

    // Minu → ideaonaction 동기화 (profiles.id = user_id)
    const existingProfile = await db
      .prepare('SELECT metadata FROM profiles WHERE id = ?')
      .bind(webhookPayload.user_id)
      .first<{ metadata: string | null }>();

    const existingMetadata = existingProfile?.metadata ? JSON.parse(existingProfile.metadata) : {};
    const newMetadata = JSON.stringify({
      ...existingMetadata,
      company: minuProfile.company,
      job_title: minuProfile.job_title,
    });

    await db
      .prepare(
        `
        UPDATE profiles
        SET display_name = ?, avatar_url = ?, metadata = ?, updated_at = datetime('now')
        WHERE id = ?
      `
      )
      .bind(
        minuProfile.name || null,
        minuProfile.avatar_url || null,
        newMetadata,
        webhookPayload.user_id
      )
      .run();

    // 동기화 상태 업데이트
    await db
      .prepare(
        `
        INSERT INTO profile_sync_status (id, user_id, sync_status, last_sync_direction, last_synced_at, minu_updated_at, error_count, updated_at)
        VALUES (?, ?, 'synced', 'minu_to_ideaonaction', datetime('now'), ?, 0, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          sync_status = 'synced',
          last_sync_direction = 'minu_to_ideaonaction',
          last_synced_at = datetime('now'),
          minu_updated_at = excluded.minu_updated_at,
          error_count = 0,
          error_message = NULL,
          updated_at = datetime('now')
      `
      )
      .bind(crypto.randomUUID(), webhookPayload.user_id, minuProfile.updated_at || null)
      .run();

    // 동기화 이력 기록
    await db
      .prepare(
        `
        INSERT INTO profile_sync_history (
          id, user_id, sync_direction, sync_result, synced_fields,
          after_data, triggered_by, metadata, created_at
        )
        VALUES (?, ?, 'minu_to_ideaonaction', 'success', ?, ?, 'webhook', ?, datetime('now'))
      `
      )
      .bind(
        crypto.randomUUID(),
        webhookPayload.user_id,
        JSON.stringify(Object.keys(minuProfile)),
        JSON.stringify(minuProfile),
        JSON.stringify({
          event_type: webhookPayload.event_type,
          webhook_timestamp: webhookPayload.timestamp,
        })
      )
      .run();

    console.log(`Webhook processed: ${webhookPayload.user_id}`);

    return c.json({
      received: true,
      user_id: webhookPayload.user_id,
      event_type: webhookPayload.event_type,
      processed_at: new Date().toISOString(),
      request_id: requestId,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return c.json(
      {
        error: 'Webhook 처리에 실패했습니다.',
        details: String(error),
        request_id: requestId,
      },
      500
    );
  }
});

/**
 * GET /status/:userId - 동기화 상태 조회
 */
profileSync.get('/status/:userId', requireAuth, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth')!;
  const userId = c.req.param('userId');
  const requestId = c.req.header('CF-Ray') || crypto.randomUUID();

  // 본인 또는 관리자만 조회 가능
  if (userId !== auth.userId && !auth.isAdmin) {
    return c.json({ error: '권한이 없습니다.' }, 403);
  }

  try {
    const status = await db
      .prepare('SELECT * FROM profile_sync_status WHERE user_id = ?')
      .bind(userId)
      .first<ProfileSyncStatusRecord>();

    if (!status) {
      return c.json(
        {
          error: '동기화 상태를 찾을 수 없습니다.',
          request_id: requestId,
        },
        404
      );
    }

    return c.json({
      user_id: userId,
      sync_status: status.sync_status,
      last_sync_direction: status.last_sync_direction,
      last_synced_at: status.last_synced_at,
      conflict_fields: status.conflict_fields ? JSON.parse(status.conflict_fields) : null,
      error_message: status.error_message,
      error_count: status.error_count,
      request_id: requestId,
    });
  } catch (error) {
    console.error('Get status error:', error);
    return c.json(
      {
        error: '동기화 상태 조회에 실패했습니다.',
        details: String(error),
        request_id: requestId,
      },
      500
    );
  }
});

/**
 * GET /history/:userId - 동기화 이력 조회
 */
profileSync.get('/history/:userId', requireAuth, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth')!;
  const userId = c.req.param('userId');
  const { limit = '20', offset = '0' } = c.req.query();

  // 본인 또는 관리자만 조회 가능
  if (userId !== auth.userId && !auth.isAdmin) {
    return c.json({ error: '권한이 없습니다.' }, 403);
  }

  try {
    const history = await db
      .prepare(
        `
        SELECT * FROM profile_sync_history
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `
      )
      .bind(userId, parseInt(limit), parseInt(offset))
      .all();

    const total = await db
      .prepare('SELECT COUNT(*) as count FROM profile_sync_history WHERE user_id = ?')
      .bind(userId)
      .first<{ count: number }>();

    return c.json({
      history: history.results.map((h) => ({
        ...h,
        synced_fields: h.synced_fields ? JSON.parse(h.synced_fields as string) : null,
        conflict_fields: h.conflict_fields ? JSON.parse(h.conflict_fields as string) : null,
        before_data: h.before_data ? JSON.parse(h.before_data as string) : null,
        after_data: h.after_data ? JSON.parse(h.after_data as string) : null,
        metadata: h.metadata ? JSON.parse(h.metadata as string) : null,
      })),
      total: total?.count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Get history error:', error);
    return c.json({ error: '동기화 이력 조회에 실패했습니다.' }, 500);
  }
});

export default profileSync;
