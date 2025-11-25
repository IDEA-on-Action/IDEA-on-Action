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
  PromptTemplateDB,
  PromptTemplateFilters,
  PromptTemplatesResponse,
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
  RenderedPrompt,
  dbToPromptTemplate,
  promptTemplateToDb,
} from '@/types/prompt-templates.types';

// ============================================================================
// 유틸리티 함수 임포트
// ============================================================================

// dbToPromptTemplate, promptTemplateToDb는 타입 파일에서 정의되어 있음
import {
  dbToPromptTemplate as convertDbToPromptTemplate,
  promptTemplateToDb as convertPromptTemplateToDb,
} from '@/types/prompt-templates.types';

// ============================================================================
// 프롬프트 렌더링 (useClaudeSkill의 renderPrompt 재사용)
// ============================================================================

/**
 * 프롬프트 변수 치환
 *
 * Handlebars 스타일 템플릿 렌더링:
 * - {{variable}}: 일반 변수
 * - {{#if variable}}...{{/if}}: 조건부 블록
 * - {{variable.nested}}: 중첩 객체
 *
 * @param template - 템플릿 문자열
 * @param variables - 변수 맵
 * @returns 렌더링된 문자열
 */
export function renderPrompt(template: string, variables: Record<string, unknown>): string {
  let result = template;

  // 조건부 블록 처리 {{#if variable}}...{{/if}}
  const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(conditionalRegex, (_, varName, content) => {
    const value = variables[varName];
    if (value !== undefined && value !== null && value !== '') {
      return content;
    }
    return '';
  });

  // 일반 변수 치환 {{variable}} 또는 {{variable.nested}}
  const variableRegex = /\{\{(\w+(?:\.\w+)*)\}\}/g;
  result = result.replace(variableRegex, (_, path) => {
    const parts = path.split('.');
    let value: unknown = variables;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return '';
      }
    }

    // 배열은 번호 매긴 목록으로 변환
    if (Array.isArray(value)) {
      return value.map((item, i) => `${i + 1}. ${typeof item === 'string' ? item : JSON.stringify(item)}`).join('\n');
    }

    // 객체는 JSON으로 변환
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }

    return String(value ?? '');
  });

  return result;
}

/**
 * 템플릿 렌더링
 *
 * @param template - 프롬프트 템플릿
 * @param variables - 변수 맵
 * @returns 렌더링된 프롬프트
 */
export function renderPromptTemplate(
  template: PromptTemplate,
  variables: Record<string, unknown>
): RenderedPrompt {
  return {
    systemPrompt: renderPrompt(template.systemPrompt, variables),
    userPrompt: renderPrompt(template.userPromptTemplate, variables),
    variables,
  };
}

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
 * const { templates, totalCount, isLoading, error } = usePromptTemplates({
 *   skillType: 'rfp-generator',
 *   isActive: true,
 *   limit: 20,
 * });
 * ```
 */
export function usePromptTemplates(filters?: PromptTemplateFilters) {
  return useQuery<PromptTemplatesResponse>({
    queryKey: ['prompt-templates', filters],
    queryFn: async () => {
      // Base query
      let query = supabase
        .from('prompt_templates')
        .select('*', { count: 'exact' });

      // Filters
      if (filters?.skillType) {
        query = query.eq('skill_type', filters.skillType);
      }
      if (filters?.serviceId) {
        query = query.eq('service_id', filters.serviceId);
      }
      if (filters?.isSystem !== undefined) {
        query = query.eq('is_system', filters.isSystem);
      }
      if (filters?.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      if (filters?.createdBy) {
        query = query.eq('created_by', filters.createdBy);
      }

      // Search (name 또는 description)
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Ordering
      const orderBy = filters?.orderBy || 'created_at';
      const orderDirection = filters?.orderDirection || 'desc';
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });

      // Pagination
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;
      query = query.range(offset, offset + limit - 1);

      // Execute query
      const { data, error, count } = await query;

      if (error) {
        console.error('Prompt templates query error:', error);
        throw new Error(`템플릿 목록을 불러오는데 실패했습니다: ${error.message}`);
      }

      // DB 레코드를 클라이언트 객체로 변환
      const templates = (data as PromptTemplateDB[]).map(convertDbToPromptTemplate);

      return {
        data: templates,
        count,
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
 *   skillType: 'rfp-generator',
 *   systemPrompt: '...',
 *   userPromptTemplate: '...',
 *   variables: ['projectName', 'clientName'],
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
      const dbRecord: Partial<PromptTemplateDB> = {
        name: input.name,
        description: input.description,
        skill_type: input.skillType,
        system_prompt: input.systemPrompt,
        user_prompt_template: input.userPromptTemplate,
        variables: input.variables,
        version: input.version || '1.0.0',
        service_id: input.serviceId || null,
        is_system: false, // 사용자가 생성한 템플릿은 시스템 템플릿이 아님
        is_public: input.isPublic || false,
        is_active: true,
        created_by: user.id,
        usage_count: 0,
        metadata: input.metadata || null,
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

      return convertDbToPromptTemplate(data as PromptTemplateDB);
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
 *   id: 'template-uuid',
 *   name: '수정된 템플릿명',
 *   isPublic: true,
 * });
 * ```
 */
export function useUpdatePromptTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePromptTemplateInput) => {
      const { id, ...updates } = input;

      // 클라이언트 객체를 DB 레코드로 변환
      const dbUpdates = convertPromptTemplateToDb(updates as Partial<PromptTemplate>);

      // Update
      const { data, error } = await supabase
        .from('prompt_templates')
        .update(dbUpdates)
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

      return convertDbToPromptTemplate(data as PromptTemplateDB);
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
        template_id: templateId,
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
