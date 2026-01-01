/**
 * Events Tool - 서비스 이벤트 조회 도구
 *
 * Claude AI가 서비스 이벤트를 조회할 수 있도록 하는 도구
 *
 * @module lib/claude/tools/events
 */

import type { ToolHandler } from '../tools';
import { serviceEventsApi } from '@/integrations/cloudflare/client';
import type { ServiceId, EventType } from '@/types/services/central-hub.types';

// ============================================================================
// Types
// ============================================================================

interface GetEventsInput {
  /** 서비스 ID (선택) */
  service_id?: ServiceId;
  /** 이벤트 타입 (선택) */
  event_type?: EventType;
  /** 프로젝트 ID (선택) */
  project_id?: string;
  /** 조회 개수 (기본 10) */
  limit?: number;
}

// ============================================================================
// Tool Handler
// ============================================================================

/**
 * 서비스 이벤트 조회 도구
 *
 * @example
 * ```typescript
 * // Claude 요청 예시
 * {
 *   "name": "get_events",
 *   "input": {
 *     "service_id": "minu-build",
 *     "event_type": "deployment",
 *     "limit": 10
 *   }
 * }
 * ```
 */
export const eventsTool: ToolHandler = {
  name: 'get_events',
  description: `서비스 이벤트 목록을 조회합니다. 서비스 ID, 이벤트 타입, 프로젝트 ID로 필터링할 수 있습니다.
서비스 ID: minu-find, minu-frame, minu-build, minu-keep
이벤트 타입: deployment(배포), api_call(API 호출), error(에러), performance(성능), user_action(사용자 액션)`,

  inputSchema: {
    type: 'object',
    properties: {
      service_id: {
        type: 'string',
        enum: ['minu-find', 'minu-frame', 'minu-build', 'minu-keep'],
        description: '서비스 ID',
      },
      event_type: {
        type: 'string',
        enum: ['deployment', 'api_call', 'error', 'performance', 'user_action'],
        description: '이벤트 타입',
      },
      project_id: {
        type: 'string',
        description: '프로젝트 ID',
      },
      limit: {
        type: 'number',
        description: '조회 개수 (기본 10, 최대 100)',
        minimum: 1,
        maximum: 100,
      },
    },
  },

  execute: async (input: Record<string, unknown>) => {
    const { service_id, event_type, project_id, limit = 10 } = input as GetEventsInput;

    // Workers API를 통해 이벤트 조회
    const { data, error } = await serviceEventsApi.list({
      service_id,
      event_type,
      project_id,
      limit: Math.min(limit, 100),
    });

    if (error) {
      throw new Error(`이벤트 조회 실패: ${error}`);
    }

    return {
      total: data?.length || 0,
      events: data || [],
    };
  },
};
