/**
 * Issues Tool - 서비스 이슈 조회 도구
 *
 * Claude AI가 서비스 이슈를 조회할 수 있도록 하는 도구
 *
 * @module lib/claude/tools/issues
 */

import type { ToolHandler } from '../tools';
import { serviceIssuesApi } from '@/integrations/cloudflare/client';
import type { ServiceId, IssueStatus } from '@/types/central-hub.types';

// ============================================================================
// Types
// ============================================================================

interface GetIssuesInput {
  /** 서비스 ID (선택) */
  service_id?: ServiceId;
  /** 이슈 상태 (선택) */
  status?: IssueStatus;
  /** 조회 개수 (기본 10) */
  limit?: number;
}

// ============================================================================
// Tool Handler
// ============================================================================

/**
 * 서비스 이슈 조회 도구
 *
 * @example
 * ```typescript
 * // Claude 요청 예시
 * {
 *   "name": "get_issues",
 *   "input": {
 *     "service_id": "minu-find",
 *     "status": "open",
 *     "limit": 5
 *   }
 * }
 * ```
 */
export const issuesTool: ToolHandler = {
  name: 'get_issues',
  description: `서비스 이슈 목록을 조회합니다. 서비스 ID나 상태로 필터링할 수 있습니다.
서비스 ID: minu-find, minu-frame, minu-build, minu-keep
상태: open(열림), in_progress(진행중), resolved(해결됨), closed(닫힘)`,

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
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        description: '이슈 상태',
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
    const { service_id, status, limit = 10 } = input as GetIssuesInput;

    // Workers API를 통해 이슈 조회
    const { data, error } = await serviceIssuesApi.list({
      service_id,
      status,
      limit: Math.min(limit, 50),
    });

    if (error) {
      throw new Error(`이슈 조회 실패: ${error}`);
    }

    return {
      total: data?.length || 0,
      issues: data || [],
    };
  },
};
