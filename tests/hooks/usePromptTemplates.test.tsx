/**
 * usePromptTemplates 훅 테스트
 *
 * @group unit
 * @group hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePromptTemplates, renderPrompt, renderPromptTemplate } from '@/hooks/ai/usePromptTemplates';
import type { PromptTemplate } from '@/types/prompt-templates.types';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            range: vi.fn(() => ({
              then: vi.fn(),
            })),
          })),
        })),
      })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } } })),
    },
  },
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('usePromptTemplates', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('필터 없이 템플릿 목록을 조회할 수 있다', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => usePromptTemplates(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('skillType 필터로 템플릿을 조회할 수 있다', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => usePromptTemplates({ skillType: 'rfp-generator' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe('renderPrompt', () => {
  it('일반 변수를 치환할 수 있다', () => {
    const template = '안녕하세요, {{name}}님!';
    const variables = { name: '홍길동' };
    const result = renderPrompt(template, variables);
    expect(result).toBe('안녕하세요, 홍길동님!');
  });

  it('조건부 블록을 처리할 수 있다', () => {
    const template = '{{#if hasEmail}}이메일: {{email}}{{/if}}';

    // 조건 true
    const result1 = renderPrompt(template, { hasEmail: true, email: 'test@example.com' });
    expect(result1).toBe('이메일: test@example.com');

    // 조건 false
    const result2 = renderPrompt(template, { hasEmail: false, email: 'test@example.com' });
    expect(result2).toBe('');
  });

  it('중첩 객체 변수를 처리할 수 있다', () => {
    const template = '프로젝트: {{project.name}}';
    const variables = { project: { name: '테스트 프로젝트' } };
    const result = renderPrompt(template, variables);
    expect(result).toBe('프로젝트: 테스트 프로젝트');
  });

  it('배열을 번호 매긴 목록으로 변환한다', () => {
    const template = '목표:\n{{objectives}}';
    const variables = { objectives: ['목표1', '목표2', '목표3'] };
    const result = renderPrompt(template, variables);
    expect(result).toContain('1. 목표1');
    expect(result).toContain('2. 목표2');
    expect(result).toContain('3. 목표3');
  });

  it('객체를 JSON으로 변환한다', () => {
    const template = '설정: {{config}}';
    const variables = { config: { debug: true, timeout: 5000 } };
    const result = renderPrompt(template, variables);
    expect(result).toContain('"debug"');
    expect(result).toContain('true');
  });
});

describe('renderPromptTemplate', () => {
  it('템플릿 전체를 렌더링할 수 있다', () => {
    const template: PromptTemplate = {
      id: 'test-template',
      name: '테스트 템플릿',
      description: '테스트용',
      skillType: 'rfp-generator',
      systemPrompt: '당신은 {{role}}입니다.',
      userPromptTemplate: '프로젝트: {{projectName}}',
      variables: ['role', 'projectName'],
      version: '1.0.0',
      serviceId: null,
      isSystem: false,
      isPublic: false,
      isActive: true,
      createdBy: 'test-user',
      createdAt: '2025-11-25T00:00:00Z',
      updatedAt: '2025-11-25T00:00:00Z',
      usageCount: 0,
      metadata: null,
    };

    const variables = {
      role: '전문가',
      projectName: '테스트 프로젝트',
    };

    const result = renderPromptTemplate(template, variables);

    expect(result.systemPrompt).toBe('당신은 전문가입니다.');
    expect(result.userPrompt).toBe('프로젝트: 테스트 프로젝트');
    expect(result.variables).toEqual(variables);
  });
});
