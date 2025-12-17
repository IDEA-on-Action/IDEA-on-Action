/**
 * Edge Functions 스키마 검증 테스트
 *
 * @module tests/unit/edge-functions/schemas
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ============================================================================
// 스키마 정의 (Deno 모듈은 Node.js에서 import 불가하므로 로컬 정의)
// ============================================================================

const VALID_SERVICE_IDS = [
  'minu-find',
  'minu-frame',
  'minu-build',
  'minu-keep',
  'minu-portal',
] as const;

const ENVIRONMENTS = ['development', 'staging', 'production'] as const;

const EventMetadataSchema = z.object({
  userId: z.string().optional(),
  tenantId: z.string().optional(),
  sessionId: z.string().optional(),
  correlationId: z.string().optional(),
  environment: z.enum(ENVIRONMENTS),
});

const BaseEventSchema = z.object({
  id: z.string().min(1, '이벤트 ID는 필수입니다'),
  type: z.string().min(1, '이벤트 타입은 필수입니다'),
  service: z.enum(VALID_SERVICE_IDS),
  timestamp: z.string().datetime({ message: '유효한 ISO 8601 타임스탬프가 필요합니다' }),
  version: z.string().min(1, '버전은 필수입니다'),
  metadata: EventMetadataSchema,
  data: z.record(z.unknown()),
});

const LegacyPayloadSchema = z.object({
  event_type: z.string().min(1, '이벤트 타입은 필수입니다'),
  payload: z.record(z.unknown()).optional(),
  project_id: z.string().optional(),
  user_id: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// BaseEvent 스키마 테스트
// ============================================================================

describe('BaseEvent Schema', () => {
  const validBaseEvent = {
    id: 'event-123',
    type: 'user.created',
    service: 'minu-find',
    timestamp: '2025-12-17T10:00:00.000Z',
    version: '1.0',
    metadata: {
      userId: 'user-456',
      environment: 'production',
    },
    data: {
      name: 'Test User',
      email: 'test@example.com',
    },
  };

  it('should validate correct BaseEvent', () => {
    const result = BaseEventSchema.safeParse(validBaseEvent);
    expect(result.success).toBe(true);
  });

  it('should reject missing id', () => {
    const { id, ...withoutId } = validBaseEvent;
    const result = BaseEventSchema.safeParse(withoutId);
    expect(result.success).toBe(false);
  });

  it('should reject empty id', () => {
    const result = BaseEventSchema.safeParse({ ...validBaseEvent, id: '' });
    expect(result.success).toBe(false);
  });

  it('should reject missing type', () => {
    const { type, ...withoutType } = validBaseEvent;
    const result = BaseEventSchema.safeParse(withoutType);
    expect(result.success).toBe(false);
  });

  it('should reject invalid service', () => {
    const result = BaseEventSchema.safeParse({
      ...validBaseEvent,
      service: 'invalid-service',
    });
    expect(result.success).toBe(false);
  });

  it('should accept all valid services', () => {
    VALID_SERVICE_IDS.forEach((service) => {
      const result = BaseEventSchema.safeParse({ ...validBaseEvent, service });
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid timestamp format', () => {
    const result = BaseEventSchema.safeParse({
      ...validBaseEvent,
      timestamp: 'not-a-timestamp',
    });
    expect(result.success).toBe(false);
  });

  it('should accept ISO 8601 timestamp with Z suffix', () => {
    // Zod의 datetime()은 기본적으로 UTC (Z suffix)만 지원
    const timestamps = [
      '2025-12-17T10:00:00Z',
      '2025-12-17T10:00:00.000Z',
    ];

    timestamps.forEach((timestamp) => {
      const result = BaseEventSchema.safeParse({ ...validBaseEvent, timestamp });
      expect(result.success).toBe(true);
    });
  });

  it('should handle timezone offset format', () => {
    // Zod datetime()은 기본적으로 오프셋을 지원하지 않음
    // 실제 Edge Function에서는 moment/dayjs로 변환 후 사용 필요
    const result = BaseEventSchema.safeParse({
      ...validBaseEvent,
      timestamp: '2025-12-17T10:00:00+09:00',
    });
    // 타임존 오프셋은 Zod 기본 datetime에서 지원하지 않음
    expect(result.success).toBe(false);
  });

  it('should reject missing metadata.environment', () => {
    const result = BaseEventSchema.safeParse({
      ...validBaseEvent,
      metadata: { userId: 'user-456' },
    });
    expect(result.success).toBe(false);
  });

  it('should accept all valid environments', () => {
    ENVIRONMENTS.forEach((environment) => {
      const result = BaseEventSchema.safeParse({
        ...validBaseEvent,
        metadata: { ...validBaseEvent.metadata, environment },
      });
      expect(result.success).toBe(true);
    });
  });

  it('should accept optional metadata fields', () => {
    const result = BaseEventSchema.safeParse({
      ...validBaseEvent,
      metadata: {
        environment: 'production',
        // userId, tenantId, sessionId, correlationId 모두 생략
      },
    });
    expect(result.success).toBe(true);
  });

  it('should accept any data structure', () => {
    const dataVariants = [
      { simple: 'value' },
      { nested: { deep: { value: 123 } } },
      { array: [1, 2, 3] },
      {},
    ];

    dataVariants.forEach((data) => {
      const result = BaseEventSchema.safeParse({ ...validBaseEvent, data });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Legacy Payload 스키마 테스트
// ============================================================================

describe('Legacy Payload Schema', () => {
  const validLegacyPayload = {
    event_type: 'user.created',
    payload: { name: 'Test User' },
    project_id: 'project-123',
    user_id: 'user-456',
    metadata: { source: 'api' },
  };

  it('should validate correct Legacy Payload', () => {
    const result = LegacyPayloadSchema.safeParse(validLegacyPayload);
    expect(result.success).toBe(true);
  });

  it('should reject missing event_type', () => {
    const { event_type, ...withoutEventType } = validLegacyPayload;
    const result = LegacyPayloadSchema.safeParse(withoutEventType);
    expect(result.success).toBe(false);
  });

  it('should reject empty event_type', () => {
    const result = LegacyPayloadSchema.safeParse({
      ...validLegacyPayload,
      event_type: '',
    });
    expect(result.success).toBe(false);
  });

  it('should accept minimal payload (event_type only)', () => {
    const result = LegacyPayloadSchema.safeParse({
      event_type: 'simple.event',
    });
    expect(result.success).toBe(true);
  });

  it('should accept payload without optional fields', () => {
    const result = LegacyPayloadSchema.safeParse({
      event_type: 'simple.event',
      // payload, project_id, user_id, metadata 모두 생략
    });
    expect(result.success).toBe(true);
  });

  it('should accept any payload structure', () => {
    const payloadVariants = [
      undefined,
      { simple: 'value' },
      { nested: { deep: { value: 123 } } },
      { array: [1, 2, 3] },
      {},
    ];

    payloadVariants.forEach((payload) => {
      const result = LegacyPayloadSchema.safeParse({
        event_type: 'test.event',
        payload,
      });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// 스키마 구분 테스트
// ============================================================================

describe('Schema Detection', () => {
  const isBaseEventFormat = (raw: unknown): boolean => {
    const result = BaseEventSchema.safeParse(raw);
    return result.success;
  };

  const isLegacyFormat = (raw: unknown): boolean => {
    const result = LegacyPayloadSchema.safeParse(raw);
    return result.success;
  };

  it('should identify BaseEvent format', () => {
    const baseEvent = {
      id: 'event-123',
      type: 'user.created',
      service: 'minu-find',
      timestamp: '2025-12-17T10:00:00Z',
      version: '1.0',
      metadata: { environment: 'production' },
      data: {},
    };

    expect(isBaseEventFormat(baseEvent)).toBe(true);
    // BaseEvent는 Legacy 형식과 호환되지 않음 (event_type 없음)
    expect(isLegacyFormat(baseEvent)).toBe(false);
  });

  it('should identify Legacy format', () => {
    const legacyPayload = {
      event_type: 'user.created',
      payload: { name: 'Test' },
    };

    expect(isLegacyFormat(legacyPayload)).toBe(true);
    // Legacy는 BaseEvent 형식과 호환되지 않음 (id, service 등 없음)
    expect(isBaseEventFormat(legacyPayload)).toBe(false);
  });

  it('should reject invalid format', () => {
    const invalidPayloads = [
      null,
      undefined,
      '',
      123,
      [],
      { random: 'data' },
      { type: 'missing-other-fields' },
    ];

    invalidPayloads.forEach((payload) => {
      expect(isBaseEventFormat(payload)).toBe(false);
      expect(isLegacyFormat(payload)).toBe(false);
    });
  });
});

// ============================================================================
// 에러 메시지 테스트
// ============================================================================

describe('Schema Error Messages', () => {
  it('should provide meaningful error for missing id', () => {
    const result = BaseEventSchema.safeParse({
      type: 'test',
      service: 'minu-find',
      timestamp: '2025-12-17T10:00:00Z',
      version: '1.0',
      metadata: { environment: 'production' },
      data: {},
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const idError = result.error.issues.find((i) => i.path.includes('id'));
      expect(idError).toBeDefined();
    }
  });

  it('should provide meaningful error for invalid timestamp', () => {
    const result = BaseEventSchema.safeParse({
      id: 'event-123',
      type: 'test',
      service: 'minu-find',
      timestamp: 'invalid-timestamp',
      version: '1.0',
      metadata: { environment: 'production' },
      data: {},
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const timestampError = result.error.issues.find((i) =>
        i.path.includes('timestamp')
      );
      expect(timestampError).toBeDefined();
    }
  });
});
