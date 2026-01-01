/**
 * 프롬프트 템플릿 관리 훅
 *
 * Claude Skills에서 사용하는 프롬프트 템플릿의 CRUD 및 렌더링 기능
 *
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 * @module hooks/usePromptTemplates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callWorkersApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  PromptTemplate,
  PromptTemplateFilters,
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
} from '@/types/ai/prompt-template.types';

// ============================================================================
// 프롬프트 렌더링 (useClaudeSkill의 renderPrompt 재사용)
// ============================================================================

// 렌더링 함수는 타입 파일에서 임포트
import {
  interpolateTemplate as renderPrompt,
} from '@/types/ai/prompt-template.types';

// ============================================================================
// 템플릿 조회 훅
// ============================================================================

/**
 * 프롬프트 템플릿 목록 조회
 *
 * @param filters - 필터 옵션
 * @returns 템플릿 목록 및 전체 개수
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = usePromptTemplates({
 *   category: 'rfp',
 *   limit: 20,
 * });
 * ```
 */
export function usePromptTemplates(filters?: PromptTemplateFilters) {
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: ['prompt-templates', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (filters?.category) queryParams.set('category', filters.category);
      if (filters?.service_id !== undefined) {
        queryParams.set('service_id', filters.service_id === null ? 'null' : filters.service_id);
      }
      if (filters?.is_system !== undefined) queryParams.set('is_system', String(filters.is_system));
      if (filters?.is_public !== undefined) queryParams.set('is_public', String(filters.is_public));
      if (filters?.created_by) queryParams.set('created_by', filters.created_by);
      if (filters?.parent_id !== undefined) {
        queryParams.set('parent_id', filters.parent_id === null ? 'null' : filters.parent_id);
      }
      if (filters?.search) queryParams.set('search', filters.search);
      if (filters?.sortBy) queryParams.set('sort_by', filters.sortBy);
      if (filters?.sortOrder) queryParams.set('sort_order', filters.sortOrder);
      if (filters?.pageSize) queryParams.set('limit', String(filters.pageSize));
      if (filters?.page) queryParams.set('offset', String((filters.page - 1) * (filters.pageSize || 50)));

      const queryString = queryParams.toString();
      const { data, error } = await callWorkersApi<{
        templates: PromptTemplate[];
        total: number;
      }>(`/api/v1/prompt-templates${queryString ? `?${queryString}` : ''}`, {
        token: workersTokens?.accessToken,
      });

      if (error) {
        console.error('Prompt templates query error:', error);
        throw new Error(`템플릿 목록을 불러오는데 실패했습니다: ${error}`);
      }

      const pageSize = filters?.pageSize || 50;
      const page = filters?.page || 1;
      const offset = (page - 1) * pageSize;

      return {
        templates: data?.templates || [],
        totalCount: data?.total || 0,
        isLoading: false,
        error: null,
        hasMore: data?.total ? offset + pageSize < data.total : false,
      };
    },
    staleTime: 30 * 1000, // 30초
  });
}

// ============================================================================
// 템플릿 CRUD 훅
// ============================================================================

/**
 * 프롬프트 템플릿 생성
 *
 * @returns Mutation 객체
 *
 * @example
 * ```tsx
 * const createTemplate = useCreatePromptTemplate();
 * await createTemplate.mutateAsync({
 *   name: '내 RFP 템플릿',
 *   description: '정부 SI 프로젝트용 RFP',
 *   category: 'rfp',
 *   system_prompt: '...',
 *   user_prompt_template: '...',
 *   variables: [{name: 'projectName', type: 'string', required: true, description: '프로젝트명'}],
 * });
 * ```
 */
export function useCreatePromptTemplate() {
  const queryClient = useQueryClient();
  const { workersTokens, user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreatePromptTemplateInput) => {
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      // DB 레코드 생성
      const dbRecord = {
        name: input.name,
        description: input.description,
        category: input.category,
        system_prompt: input.system_prompt,
        user_prompt_template: input.user_prompt_template,
        variables: input.variables || [],
        output_schema: input.output_schema || null,
        version: input.version || '1.0.0',
        service_id: input.service_id || null,
        is_system: false, // 사용자가 생성한 템플릿은 시스템 템플릿이 아님
        is_public: input.is_public || false,
        parent_id: input.parent_id || null,
        created_by: user.id,
      };

      const { data, error } = await callWorkersApi<PromptTemplate>(
        '/api/v1/prompt-templates',
        {
          method: 'POST',
          token: workersTokens?.accessToken,
          body: dbRecord,
        }
      );

      if (error) {
        console.error('Create prompt template error:', error);

        if (error.includes('42501') || error.includes('권한')) {
          throw new Error('권한이 없습니다. 관리자 계정으로 로그인해주세요.');
        }

        throw new Error(`템플릿 생성에 실패했습니다: ${error}`);
      }

      return data as PromptTemplate;
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });

      // Success toast
      toast.success(`템플릿 "${data.name}"이(가) 생성되었습니다.`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * 프롬프트 템플릿 업데이트
 *
 * @returns Mutation 객체
 *
 * @example
 * ```tsx
 * const updateTemplate = useUpdatePromptTemplate();
 * await updateTemplate.mutateAsync({
 *   name: '수정된 템플릿명',
 *   is_public: true,
 * }, 'template-uuid');
 * ```
 */
export function useUpdatePromptTemplate() {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdatePromptTemplateInput }) => {
      const { data, error } = await callWorkersApi<PromptTemplate>(
        `/api/v1/prompt-templates/${id}`,
        {
          method: 'PATCH',
          token: workersTokens?.accessToken,
          body: updates,
        }
      );

      if (error) {
        console.error('Update prompt template error:', error);

        if (error.includes('42501') || error.includes('권한')) {
          throw new Error('권한이 없습니다. 템플릿 생성자만 수정할 수 있습니다.');
        }

        throw new Error(`템플릿 수정에 실패했습니다: ${error}`);
      }

      return data as PromptTemplate;
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });

      // Success toast
      toast.success(`템플릿 "${data.name}"이(가) 수정되었습니다.`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * 프롬프트 템플릿 삭제
 *
 * @returns Mutation 객체
 *
 * @example
 * ```tsx
 * const deleteTemplate = useDeletePromptTemplate();
 * await deleteTemplate.mutateAsync('template-uuid');
 * ```
 */
export function useDeletePromptTemplate() {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await callWorkersApi(
        `/api/v1/prompt-templates/${id}`,
        {
          method: 'DELETE',
          token: workersTokens?.accessToken,
        }
      );

      if (error) {
        console.error('Delete prompt template error:', error);

        if (error.includes('42501') || error.includes('권한')) {
          throw new Error('권한이 없습니다. 템플릿 생성자만 삭제할 수 있습니다.');
        }

        throw new Error(`템플릿 삭제에 실패했습니다: ${error}`);
      }
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });

      // Success toast
      toast.success('템플릿이 삭제되었습니다.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ============================================================================
// 사용 횟수 증가 훅
// ============================================================================

/**
 * 프롬프트 템플릿 사용 횟수 증가
 *
 * @returns Mutation 객체
 *
 * @example
 * ```tsx
 * const incrementUsage = useIncrementTemplateUsage();
 * await incrementUsage.mutateAsync('template-uuid');
 * ```
 */
export function useIncrementTemplateUsage() {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await callWorkersApi(
        `/api/v1/prompt-templates/${templateId}/increment-usage`,
        {
          method: 'POST',
          token: workersTokens?.accessToken,
        }
      );

      if (error) {
        console.error('Increment template usage error:', error);
        // 에러가 발생해도 사용자에게는 알리지 않음 (silent fail)
        // 사용 횟수는 critical한 기능이 아니므로
        return;
      }
    },
    onSuccess: () => {
      // Invalidate queries (통계 업데이트)
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
    },
  });
}

// ============================================================================
// 내보내기
// ============================================================================

export default usePromptTemplates;
