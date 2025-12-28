/**
 * Health Tool - 서비스 헬스 조회 도구
 *
 * Claude AI가 서비스 헬스 상태를 조회할 수 있도록 하는 도구
 *
 * @module lib/claude/tools/health
 */

import type { ToolHandler } from '../tools';
import { serviceHealthApi } from '@/integrations/cloudflare/client';
import type { ServiceId, HealthStatus } from '@/types/central-hub.types';

// ============================================================================
// Types
// ============================================================================

interface GetHealthInput {
  /** 서비스 ID (선택) */
  service_id?: ServiceId;
  /** 헬스 상태 (선택) */
  status?: HealthStatus;
  /** 조회 개수 (기본 10) */
  limit?: number;
}

// ============================================================================
// Tool Handler
// ============================================================================

/**
 * 서비스 헬스 조회 도구
 *
 * @example
 * ```typescript
 * // Claude 요청 예시
 * {
 *   "name": "get_health",
 *   "input": {
 *     "service_id": "minu-keep",
 *     "status": "healthy",
 *     "limit": 5
 *   }
 * }
 * ```
 */
export const healthTool: ToolHandler = {
  name: 'get_health',
  description: `서비스 헬스 상태를 조회합니다. 서비스 ID나 상태로 필터링할 수 있습니다.
서비스 ID: minu-find, minu-frame, minu-build, minu-keep
상태: healthy(정상), degraded(저하), unhealthy(비정상)`,

  inputSchema: {
    type: 'object',
    properties: {
      service_id: {
        type: 'string',
        enum: ['minu-find', 'minu-frame', 'minu-build', 'minu-keep'],
        description: '서비스 ID',
      },
      status: {
        type: 'string',
        enum: ['healthy', 'degraded', 'unhealthy'],
        description: '헬스 상태',
      },
      limit: {
        type: 'number',
        description: '조회 개수 (기본 10, 최대 50)',
        minimum: 1,
        maximum: 50,
      },
    },
  },

  execute: async (input: Record<string, unknown>) => {
    const { service_id, status, limit = 10 } = input as GetHealthInput;

    // Workers API를 통해 헬스 조회
    const { data, error } = await serviceHealthApi.list({
      service_id,
      status,
      limit: Math.min(limit, 50),
    });

    if (error) {
      throw new Error(`헬스 조회 실패: ${error}`);
    }

    return {
      total: data?.length || 0,
      health_records: data || [],
    };
  },
};
