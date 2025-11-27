/**
 * 프롬프트 템플릿 관리 훅
 *
 * Claude Skills에서 사용하는 프롬프트 템플릿의 CRUD 및 렌더링 기능
 *
 * @module hooks/usePromptTemplates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  PromptTemplate,
  PromptTemplateFilters,
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
  RenderPromptInput,
  RenderPromptResult,
  interpolateTemplate,
  extractVariables,
} from '@/types/prompt-template.types';

// ============================================================================
// 프롬프트 렌더링 (useClaudeSkill의 renderPrompt 재사용)
// ============================================================================

// 렌더링 함수는 타입 파일에서 임포트
import {
  interpolateTemplate as renderPrompt,
} from '@/types/prompt-template.types';

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
  return useQuery({
    queryKey: ['prompt-templates', filters],
    queryFn: async () => {
      // Base query
      let query = supabase
        .from('prompt_templates')
        .select('*', { count: 'exact' });

      // Filters
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.service_id !== undefined) {
        if (filters.service_id === null) {
          query = query.is('service_id', null);
        } else {
          query = query.eq('service_id', filters.service_id);
        }
      }
      if (filters?.is_system !== undefined) {
        query = query.eq('is_system', filters.is_system);
      }
      if (filters?.is_public !== undefined) {
        query = query.eq('is_public', filters.is_public);
      }
      if (filters?.created_by) {
        query = query.eq('created_by', filters.created_by);
      }
      if (filters?.parent_id !== undefined) {
        if (filters.parent_id === null) {
          query = query.is('parent_id', null);
        } else {
          query = query.eq('parent_id', filters.parent_id);
        }
      }

      // Search (name 또는 description)
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Ordering
      const sortBy = filters?.sortBy || 'created_at';
      const sortOrder = filters?.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination
      const pageSize = filters?.pageSize || 50;
      const page = filters?.page || 1;
      const offset = (page - 1) * pageSize;
      query = query.range(offset, offset + pageSize - 1);

      // Execute query
      const { data, error, count } = await query;

      if (error) {
        console.error('Prompt templates query error:', error);
        throw new Error(`템플릿 목록을 불러오는데 실패했습니다: ${error.message}`);
      }

      // DB 레코드는 이미 올바른 형식 (camelCase 변환 불필요)
      const templates = (data || []) as PromptTemplate[];

      return {
        templates,
        totalCount: count || 0,
        isLoading: false,
        error: null,
        hasMore: count ? offset + pageSize < count : false,
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

  return useMutation({
    mutationFn: async (input: CreatePromptTemplateInput) => {
      // 현재 사용자 확인
      const { data: { user } } = await supabase.auth.getUser();
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

      // Insert
      const { data, error } = await supabase
        .from('prompt_templates')
        .insert(dbRecord)
        .select()
        .single();

      if (error) {
        console.error('Create prompt template error:', error);

        if (error.code === '42501') {
          throw new Error('권한이 없습니다. 관리자 계정으로 로그인해주세요.');
        }

        throw new Error(`템플릿 생성에 실패했습니다: ${error.message}`);
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

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdatePromptTemplateInput }) => {
      // Update
      const { data, error } = await supabase
        .from('prompt_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update prompt template error:', error);

        if (error.code === '42501') {
          throw new Error('권한이 없습니다. 템플릿 생성자만 수정할 수 있습니다.');
        }

        throw new Error(`템플릿 수정에 실패했습니다: ${error.message}`);
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

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('prompt_templates')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete prompt template error:', error);

        if (error.code === '42501') {
          throw new Error('권한이 없습니다. 템플릿 생성자만 삭제할 수 있습니다.');
        }

        throw new Error(`템플릿 삭제에 실패했습니다: ${error.message}`);
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

  return useMutation({
    mutationFn: async (templateId: string) => {
      // RPC 함수 호출 (increment_template_usage)
      const { error } = await supabase.rpc('increment_template_usage', {
        p_template_id: templateId,
      });

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
