/**
 * Projects Tool - 프로젝트 조회 도구
 *
 * Claude AI가 프로젝트 정보를 조회할 수 있도록 하는 도구
 *
 * @module lib/claude/tools/projects
 */

import type { ToolHandler } from '../tools';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types
// ============================================================================

type ProjectStatus = 'planned' | 'in-progress' | 'completed' | 'on-hold';

interface GetProjectsInput {
  /** 프로젝트 상태 (선택) */
  status?: ProjectStatus;
  /** 조회 개수 (기본 10) */
  limit?: number;
  /** 검색 키워드 (제목, 설명) */
  search?: string;
}

// ============================================================================
// Tool Handler
// ============================================================================

/**
 * 프로젝트 조회 도구
 *
 * @example
 * ```typescript
 * // Claude 요청 예시
 * {
 *   "name": "get_projects",
 *   "input": {
 *     "status": "in-progress",
 *     "limit": 5,
 *     "search": "AI"
 *   }
 * }
 * ```
 */
export const projectsTool: ToolHandler = {
  name: 'get_projects',
  description: `프로젝트 목록을 조회합니다. 상태나 검색어로 필터링할 수 있습니다.
상태: planned(계획), in-progress(진행중), completed(완료), on-hold(보류)`,

  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['planned', 'in-progress', 'completed', 'on-hold'],
        description: '프로젝트 상태',
      },
      limit: {
        type: 'number',
        description: '조회 개수 (기본 10, 최대 50)',
        minimum: 1,
        maximum: 50,
      },
      search: {
        type: 'string',
        description: '검색 키워드 (제목, 설명에서 검색)',
      },
    },
  },

  execute: async (input: Record<string, unknown>) => {
    const { status, limit = 10, search } = input as GetProjectsInput;

    // 쿼리 빌드
    let query = supabase.from('projects').select('*');

    // 상태 필터
    if (status) {
      query = query.eq('status', status);
    }

    // 검색 필터
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // 정렬 및 제한
    query = query.order('created_at', { ascending: false }).limit(Math.min(limit, 50));

    // 실행
    const { data, error } = await query;

    if (error) {
      throw new Error(`프로젝트 조회 실패: ${error.message}`);
    }

    return {
      total: data?.length || 0,
      projects: data || [],
    };
  },
};
