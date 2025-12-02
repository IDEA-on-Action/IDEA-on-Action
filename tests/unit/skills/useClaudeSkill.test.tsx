/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useClaudeSkill 훅 유닛 테스트
 *
 * @module tests/unit/skills/useClaudeSkill
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useClaudeSkill,
  useRFPGenerator,
  useRequirementsAnalyzer,
  useProjectPlanner,
  useOpsReportWriter,
  clearSkillCache,
} from '@/hooks/useClaudeSkill';
import { useClaudeStreaming } from '@/hooks/useClaudeStreaming';
import { usePromptTemplates } from '@/hooks/usePromptTemplates';
import type {
  RFPGeneratorInput,
  RFPGeneratorOutput,
  RequirementsAnalyzerInput,
  RequirementsAnalyzerOutput,
  ProjectPlannerInput,
  ProjectPlannerOutput,
  OpsReportInput,
  OpsReportOutput,
} from '@/types/claude-skills.types';

// ============================================================================
// Mock 설정
// ============================================================================

// Mock useClaudeStreaming
vi.mock('@/hooks/useClaudeStreaming');

// Mock usePromptTemplates
vi.mock('@/hooks/usePromptTemplates');

// Mock Supabase (usePromptTemplates가 사용)
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
      })),
    })),
  },
}));

// ============================================================================
// 테스트 유틸리티
// ============================================================================

/**
 * QueryClientProvider Wrapper
 */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// ============================================================================
// Mock 데이터
// ============================================================================

const mockRFPInput: RFPGeneratorInput = {
  projectName: '스마트시티 구축',
  clientName: '서울시',
  background: '도시 인프라 현대화',
  objectives: ['교통 최적화', '에너지 효율화'],
  category: 'government',
  budget: 100000000,
  duration: {
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
  },
};

const mockRFPOutput: RFPGeneratorOutput = {
  rfpData: {
    title: '스마트시티 구축 RFP',
    subtitle: '서울시',
    author: '서울시',
    date: '2025-12-02',
    category: 'government',
  },
  requirements: [
    {
      id: 'REQ-001',
      category: 'functional',
      title: '교통 최적화',
      description: '실시간 교통 데이터 분석',
      priority: 'high',
      mustHave: true,
    },
  ],
  evaluationCriteria: [
    {
      criterion: '기술 역량',
      weight: 40,
      description: '기술적 구현 능력',
    },
  ],
  proposedTimeline: [
    {
      phase: '분석 단계',
      duration: '2개월',
      deliverables: ['요구사항 명세서'],
    },
  ],
  deliverables: ['요구사항 명세서', '설계 문서'],
  risks: [
    {
      risk: '일정 지연',
      severity: 'medium',
      mitigation: '버퍼 기간 확보',
    },
  ],
  summary: 'RFP 생성 완료',
};

const mockRequirementsInput: RequirementsAnalyzerInput = {
  projectName: '프로젝트 A',
  rawRequirements: '사용자는 로그인할 수 있어야 한다',
  analysisDepth: 'detailed',
};

const mockRequirementsOutput: RequirementsAnalyzerOutput = {
  structuredRequirements: [
    {
      id: 'REQ-001',
      type: 'functional',
      title: '사용자 로그인',
      description: '사용자는 로그인할 수 있어야 한다',
      priority: 'high',
      clarityScore: 80,
      completenessScore: 75,
    },
  ],
  gapAnalysis: {
    missingRequirements: ['보안 요구사항 부족'],
    ambiguousRequirements: [],
    conflictingRequirements: [],
    completenessScore: 70,
  },
  dependencyMatrix: [
    {
      from: 'REQ-001',
      to: 'REQ-002',
      type: 'depends-on',
      strength: 'strong',
    },
  ],
  priorityRecommendations: [
    {
      requirementId: 'REQ-001',
      suggestedPriority: 'high',
      rationale: '핵심 기능',
    },
  ],
  riskAnalysis: [
    {
      requirementId: 'REQ-001',
      riskType: 'technical',
      severity: 'medium',
      description: '구현 복잡도',
      mitigation: '프로토타입 선행',
    },
  ],
  summary: '요구사항 분석 완료',
  recommendations: ['보안 요구사항 추가'],
};

const mockProjectPlanInput: ProjectPlannerInput = {
  projectName: '프로젝트 A',
  requirements: ['요구사항1', '요구사항2'],
  startDate: new Date('2025-01-01'),
  teamSize: 5,
  priorityMode: 'balanced',
};

const mockProjectPlanOutput: ProjectPlannerOutput = {
  projectSummary: {
    name: '프로젝트 A',
    description: '프로젝트 설명',
    totalEstimatedHours: 500,
    totalStoryPoints: 50,
    estimatedDuration: '3개월',
  },
  sprintPlan: [
    {
      sprintNumber: 1,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-14'),
      goals: ['스프린트 1 목표'],
      tasks: [],
      totalStoryPoints: 10,
    },
  ],
  milestones: [
    {
      name: 'MVP 완료',
      targetDate: new Date('2025-03-01'),
      deliverables: ['MVP'],
      dependencies: [],
    },
  ],
  resourceAllocation: [
    {
      role: '개발자',
      count: 3,
      allocation: '100%',
      responsibilities: ['개발'],
    },
  ],
  risks: [
    {
      risk: '일정 지연',
      probability: 'medium',
      impact: 'high',
      mitigation: '버퍼 기간 확보',
    },
  ],
  estimatedSchedule: {
    optimistic: '2개월',
    realistic: '3개월',
    pessimistic: '4개월',
  },
  recommendations: ['애자일 방법론 적용'],
};

const mockOpsReportInput: OpsReportInput = {
  serviceName: '서비스 A',
  reportingPeriod: {
    startDate: new Date('2025-11-01'),
    endDate: new Date('2025-11-30'),
  },
  reportType: 'monthly',
  audience: 'executive',
};

const mockOpsReportOutput: OpsReportOutput = {
  reportData: {
    serviceName: '서비스 A',
    reportingPeriod: {
      startDate: new Date('2025-11-01'),
      endDate: new Date('2025-11-30'),
    },
    metrics: {
      availability: 99.9,
      avgResponseTime: 200,
      totalRequests: 1000000,
      errorRate: 0.1,
    },
    incidentsSummary: {
      totalIncidents: 5,
      criticalIncidents: 1,
      resolvedIncidents: 4,
      avgResolutionTime: '2시간',
    },
    changesSummary: {
      totalChanges: 10,
      successfulChanges: 9,
      failedChanges: 1,
      rollbackCount: 1,
    },
  },
  executiveSummary: '운영 보고서 요약',
  highlights: ['가동률 99.9% 달성'],
  recommendations: [
    {
      priority: 'high',
      category: 'performance',
      description: '응답 시간 개선',
      expectedImpact: '응답 속도 20% 향상',
    },
  ],
  nextPeriodPlan: {
    objectives: ['성능 개선'],
    plannedChanges: ['캐시 도입'],
    resourceNeeds: ['개발자 1명'],
  },
};

// ============================================================================
// useClaudeSkill 기본 테스트
// ============================================================================

describe('useClaudeSkill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSkillCache();

    // Mock usePromptTemplates - DB 템플릿 없음 (하드코딩 템플릿 사용)
    vi.mocked(usePromptTemplates).mockReturnValue({
      data: { data: [], count: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    // Mock useClaudeStreaming
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: null,
        totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
      sendMessage: vi.fn(),
      startNewConversation: vi.fn(),
      stopStreaming: vi.fn(),
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // 초기 상태 확인
  // --------------------------------------------------------------------------

  it('초기 상태가 올바르게 설정됨', () => {
    // Execute
    const { result } = renderHook(
      () => useClaudeSkill<RFPGeneratorInput, RFPGeneratorOutput>('rfp-generator'),
      { wrapper: createWrapper() }
    );

    // Assert
    expect(result.current.status).toBe('idle');
    expect(result.current.progress).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.lastResult).toBe(null);
    expect(result.current.isExecuting).toBe(false);
    expect(result.current.cachedResult).toBe(null);
    expect(typeof result.current.execute).toBe('function');
    expect(typeof result.current.cancel).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('isExecuting 상태가 올바르게 계산됨', async () => {
    // Setup
    const mockSendMessage = vi.fn().mockResolvedValue(
      JSON.stringify({ rfpData: mockRFPOutput.rfpData })
    );
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        totalUsage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      },
      sendMessage: mockSendMessage,
      startNewConversation: vi.fn(),
      stopStreaming: vi.fn(),
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);

    // Execute
    const { result } = renderHook(
      () => useClaudeSkill<RFPGeneratorInput, RFPGeneratorOutput>('rfp-generator'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isExecuting).toBe(false);

    act(() => {
      result.current.execute(mockRFPInput);
    });

    // Assert - 실행 중
    await waitFor(() => {
      expect(result.current.status).toBe('generating');
    });

    // Assert - 완료
    await waitFor(() => {
      expect(result.current.status).toBe('completed');
      expect(result.current.isExecuting).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 실행 성공
  // --------------------------------------------------------------------------

  it('RFP 생성이 성공적으로 실행됨', async () => {
    // Setup
    const mockSendMessage = vi.fn().mockResolvedValue(
      JSON.stringify(mockRFPOutput)
    );
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        totalUsage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      },
      sendMessage: mockSendMessage,
      startNewConversation: vi.fn(),
      stopStreaming: vi.fn(),
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);

    // Execute
    const { result } = renderHook(
      () => useClaudeSkill<RFPGeneratorInput, RFPGeneratorOutput>('rfp-generator'),
      { wrapper: createWrapper() }
    );

    let executionResult: any;
    await act(async () => {
      executionResult = await result.current.execute(mockRFPInput);
    });

    // Assert
    expect(executionResult.success).toBe(true);
    expect(executionResult.data).toBeDefined();
    expect(result.current.status).toBe('completed');
    expect(result.current.error).toBe(null);
    expect(result.current.lastResult?.success).toBe(true);
  });

  it('프롬프트 렌더링이 올바르게 수행됨', async () => {
    // Setup
    const mockSendMessage = vi.fn().mockResolvedValue(
      JSON.stringify(mockRFPOutput)
    );
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: null,
        totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
      sendMessage: mockSendMessage,
      startNewConversation: vi.fn(),
      stopStreaming: vi.fn(),
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);

    // Execute
    const { result } = renderHook(
      () => useClaudeSkill<RFPGeneratorInput, RFPGeneratorOutput>('rfp-generator'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.execute(mockRFPInput);
    });

    // Assert - sendMessage가 호출되었는지 확인
    expect(mockSendMessage).toHaveBeenCalled();
    const userPrompt = mockSendMessage.mock.calls[0][0];
    expect(userPrompt).toContain('스마트시티 구축');
    expect(userPrompt).toContain('서울시');
  });

  it('진행 상태가 올바르게 업데이트됨', async () => {
    // Setup
    const mockSendMessage = vi.fn().mockResolvedValue(
      JSON.stringify(mockRFPOutput)
    );
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: null,
        totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
      sendMessage: mockSendMessage,
      startNewConversation: vi.fn(),
      stopStreaming: vi.fn(),
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);

    const progressUpdates: any[] = [];
    const onProgress = vi.fn((progress) => {
      progressUpdates.push(progress);
    });

    // Execute
    const { result } = renderHook(
      () => useClaudeSkill<RFPGeneratorInput, RFPGeneratorOutput>('rfp-generator'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.execute(mockRFPInput, { onProgress });
    });

    // Assert
    expect(result.current.progress).toBeDefined();
    expect(result.current.progress?.percent).toBe(100);
    expect(onProgress).toHaveBeenCalled();
  });

  it('토큰 사용량이 올바르게 기록됨', async () => {
    // Setup
    const mockUsage = { inputTokens: 100, outputTokens: 200, totalTokens: 300 };
    const mockSendMessage = vi.fn().mockResolvedValue(
      JSON.stringify(mockRFPOutput)
    );
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: mockUsage,
        totalUsage: mockUsage,
      },
      sendMessage: mockSendMessage,
      startNewConversation: vi.fn(),
      stopStreaming: vi.fn(),
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);

    // Execute
    const { result } = renderHook(
      () => useClaudeSkill<RFPGeneratorInput, RFPGeneratorOutput>('rfp-generator'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.execute(mockRFPInput);
    });

    // Assert
    expect(result.current.lastResult?.usage).toEqual(mockUsage);
  });

  // --------------------------------------------------------------------------
  // 에러 처리
  // --------------------------------------------------------------------------

  it('Claude API 호출 실패 시 에러를 처리함', async () => {
    // Setup
    const mockSendMessage = vi.fn().mockRejectedValue(new Error('API 호출 실패'));
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: null,
        totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
      sendMessage: mockSendMessage,
      startNewConversation: vi.fn(),
      stopStreaming: vi.fn(),
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);

    // Execute
    const { result } = renderHook(
      () => useClaudeSkill<RFPGeneratorInput, RFPGeneratorOutput>('rfp-generator'),
      { wrapper: createWrapper() }
    );

    let executionResult: any;
    await act(async () => {
      executionResult = await result.current.execute(mockRFPInput);
    });

    // Assert
    expect(executionResult.success).toBe(false);
    expect(executionResult.error).toBeDefined();
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.code).toBe('SKILL_008');
  });

  it('JSON 파싱 실패 시 에러를 처리함', async () => {
    // Setup - 잘못된 JSON 응답
    const mockSendMessage = vi.fn().mockResolvedValue('잘못된 JSON 응답');
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: null,
        totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
      sendMessage: mockSendMessage,
      startNewConversation: vi.fn(),
      stopStreaming: vi.fn(),
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);

    // Execute
    const { result } = renderHook(
      () => useClaudeSkill<RFPGeneratorInput, RFPGeneratorOutput>('rfp-generator'),
      { wrapper: createWrapper() }
    );

    let executionResult: any;
    await act(async () => {
      executionResult = await result.current.execute(mockRFPInput);
    });

    // Assert
    expect(executionResult.success).toBe(false);
    expect(executionResult.error?.code).toBe('SKILL_003');
    expect(result.current.status).toBe('error');
  });

  it('타임아웃 시 에러를 처리함', async () => {
    // Setup - 지연된 응답
    const mockSendMessage = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(JSON.stringify(mockRFPOutput)), 5000))
    );
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: null,
        totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
      sendMessage: mockSendMessage,
      startNewConversation: vi.fn(),
      stopStreaming: vi.fn(),
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);

    // Execute
    const { result } = renderHook(
      () => useClaudeSkill<RFPGeneratorInput, RFPGeneratorOutput>('rfp-generator'),
      { wrapper: createWrapper() }
    );

    let executionResult: any;
    await act(async () => {
      executionResult = await result.current.execute(mockRFPInput, { timeout: 100 });
    });

    // Assert
    await waitFor(() => {
      expect(executionResult.success).toBe(false);
      expect(result.current.error?.code).toMatch(/SKILL_005|SKILL_006/);
      expect(result.current.status).toMatch(/error|cancelled/);
    }, { timeout: 200 });
  });

  // --------------------------------------------------------------------------
  // 캐시
  // --------------------------------------------------------------------------

  it('캐시가 활성화되면 두 번째 호출 시 캐시를 사용함', async () => {
    // Setup
    const mockSendMessage = vi.fn().mockResolvedValue(
      JSON.stringify(mockRFPOutput)
    );
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: null,
        totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
      sendMessage: mockSendMessage,
      startNewConversation: vi.fn(),
      stopStreaming: vi.fn(),
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);

    // Execute
    const { result } = renderHook(
      () => useClaudeSkill<RFPGeneratorInput, RFPGeneratorOutput>('rfp-generator'),
      { wrapper: createWrapper() }
    );

    // 첫 번째 호출
    await act(async () => {
      await result.current.execute(mockRFPInput, { useCache: true });
    });

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(result.current.lastResult?.cached).toBe(false);

    // 두 번째 호출 (캐시 사용)
    await act(async () => {
      await result.current.execute(mockRFPInput, { useCache: true });
    });

    // Assert - API는 한 번만 호출, 두 번째는 캐시 사용
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(result.current.lastResult?.cached).toBe(true);
  });

  it('캐시가 비활성화되면 매번 API를 호출함', async () => {
    // Setup
    const mockSendMessage = vi.fn().mockResolvedValue(
      JSON.stringify(mockRFPOutput)
    );
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: null,
        totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
      sendMessage: mockSendMessage,
      startNewConversation: vi.fn(),
      stopStreaming: vi.fn(),
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);

    // Execute
    const { result } = renderHook(
      () => useClaudeSkill<RFPGeneratorInput, RFPGeneratorOutput>('rfp-generator'),
      { wrapper: createWrapper() }
    );

    // 첫 번째 호출
    await act(async () => {
      await result.current.execute(mockRFPInput, { useCache: false });
    });

    // 두 번째 호출
    await act(async () => {
      await result.current.execute(mockRFPInput, { useCache: false });
    });

    // Assert - API가 두 번 호출됨
    expect(mockSendMessage).toHaveBeenCalledTimes(2);
  });

  it('clearSkillCache가 올바르게 동작함', async () => {
    // Setup
    const mockSendMessage = vi.fn().mockResolvedValue(
      JSON.stringify(mockRFPOutput)
    );
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: null,
        totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
      sendMessage: mockSendMessage,
      startNewConversation: vi.fn(),
      stopStreaming: vi.fn(),
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);

    // Execute
    const { result } = renderHook(
      () => useClaudeSkill<RFPGeneratorInput, RFPGeneratorOutput>('rfp-generator'),
      { wrapper: createWrapper() }
    );

    // 첫 번째 호출 (캐시 저장)
    await act(async () => {
      await result.current.execute(mockRFPInput, { useCache: true });
    });

    // 캐시 삭제
    clearSkillCache('rfp-generator');

    // 두 번째 호출 (캐시 없음)
    await act(async () => {
      await result.current.execute(mockRFPInput, { useCache: true });
    });

    // Assert - 캐시가 삭제되어 API가 두 번 호출됨
    expect(mockSendMessage).toHaveBeenCalledTimes(2);
  });

  // --------------------------------------------------------------------------
  // 취소 및 리셋
  // --------------------------------------------------------------------------

  it('cancel을 호출하면 실행이 취소됨', async () => {
    // Setup
    const mockStopStreaming = vi.fn();
    const mockSendMessage = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(JSON.stringify(mockRFPOutput)), 1000))
    );
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: null,
        totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
      sendMessage: mockSendMessage,
      startNewConversation: vi.fn(),
      stopStreaming: mockStopStreaming,
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);

    // Execute
    const { result } = renderHook(
      () => useClaudeSkill<RFPGeneratorInput, RFPGeneratorOutput>('rfp-generator'),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.execute(mockRFPInput);
    });

    // 실행 중 취소
    act(() => {
      result.current.cancel();
    });

    // Assert
    await waitFor(() => {
      expect(result.current.status).toBe('cancelled');
      expect(mockStopStreaming).toHaveBeenCalled();
    });
  });

  it('reset을 호출하면 상태가 초기화됨', async () => {
    // Setup
    const mockSendMessage = vi.fn().mockResolvedValue(
      JSON.stringify(mockRFPOutput)
    );
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: null,
        totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
      sendMessage: mockSendMessage,
      startNewConversation: vi.fn(),
      stopStreaming: vi.fn(),
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);

    // Execute
    const { result } = renderHook(
      () => useClaudeSkill<RFPGeneratorInput, RFPGeneratorOutput>('rfp-generator'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.execute(mockRFPInput);
    });

    expect(result.current.status).toBe('completed');

    // 리셋
    act(() => {
      result.current.reset();
    });

    // Assert
    expect(result.current.status).toBe('idle');
    expect(result.current.progress).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.lastResult).toBe(null);
  });

  // --------------------------------------------------------------------------
  // JSON 응답 포맷
  // --------------------------------------------------------------------------

  it('JSON 블록으로 감싸진 응답을 파싱함', async () => {
    // Setup - ```json ... ``` 형식
    const wrappedJson = '```json\n' + JSON.stringify(mockRFPOutput) + '\n```';
    const mockSendMessage = vi.fn().mockResolvedValue(wrappedJson);
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: null,
        totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
      sendMessage: mockSendMessage,
      startNewConversation: vi.fn(),
      stopStreaming: vi.fn(),
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);

    // Execute
    const { result } = renderHook(
      () => useClaudeSkill<RFPGeneratorInput, RFPGeneratorOutput>('rfp-generator'),
      { wrapper: createWrapper() }
    );

    let executionResult: any;
    await act(async () => {
      executionResult = await result.current.execute(mockRFPInput);
    });

    // Assert
    expect(executionResult.success).toBe(true);
    expect(executionResult.data).toEqual(mockRFPOutput);
  });

  it('텍스트와 함께 섞인 JSON 응답을 파싱함', async () => {
    // Setup - 텍스트 + JSON 형식
    const mixedResponse = '여기 RFP 결과입니다:\n' + JSON.stringify(mockRFPOutput) + '\n\n완료되었습니다.';
    const mockSendMessage = vi.fn().mockResolvedValue(mixedResponse);
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: null,
        totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
      sendMessage: mockSendMessage,
      startNewConversation: vi.fn(),
      stopStreaming: vi.fn(),
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);

    // Execute
    const { result } = renderHook(
      () => useClaudeSkill<RFPGeneratorInput, RFPGeneratorOutput>('rfp-generator'),
      { wrapper: createWrapper() }
    );

    let executionResult: any;
    await act(async () => {
      executionResult = await result.current.execute(mockRFPInput);
    });

    // Assert
    expect(executionResult.success).toBe(true);
    expect(executionResult.data).toEqual(mockRFPOutput);
  });
});

// ============================================================================
// 특화 훅 테스트
// ============================================================================

describe('useRFPGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePromptTemplates).mockReturnValue({
      data: { data: [], count: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const mockSendMessage = vi.fn().mockResolvedValue(
      JSON.stringify(mockRFPOutput)
    );
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: null,
        totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
      sendMessage: mockSendMessage,
      startNewConversation: vi.fn(),
      stopStreaming: vi.fn(),
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('RFP 생성이 올바르게 동작함', async () => {
    // Execute
    const { result } = renderHook(() => useRFPGenerator(), {
      wrapper: createWrapper(),
    });

    let rfpResult: any;
    await act(async () => {
      rfpResult = await result.current.generateRFP(mockRFPInput);
    });

    // Assert
    expect(rfpResult.success).toBe(true);
    expect(rfpResult.data).toBeDefined();
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.result?.success).toBe(true);
  });

});

describe('useRequirementsAnalyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePromptTemplates).mockReturnValue({
      data: { data: [], count: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const mockSendMessage = vi.fn().mockResolvedValue(
      JSON.stringify(mockRequirementsOutput)
    );
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: null,
        totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
      sendMessage: mockSendMessage,
      startNewConversation: vi.fn(),
      stopStreaming: vi.fn(),
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('요구사항 분석이 올바르게 동작함', async () => {
    // Execute
    const { result } = renderHook(() => useRequirementsAnalyzer(), {
      wrapper: createWrapper(),
    });

    let analysisResult: any;
    await act(async () => {
      analysisResult = await result.current.analyzeRequirements(mockRequirementsInput);
    });

    // Assert
    expect(analysisResult.success).toBe(true);
    expect(analysisResult.data?.structuredRequirements).toBeDefined();
    expect(result.current.isAnalyzing).toBe(false);
  });
});

describe('useProjectPlanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePromptTemplates).mockReturnValue({
      data: { data: [], count: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const mockSendMessage = vi.fn().mockResolvedValue(
      JSON.stringify(mockProjectPlanOutput)
    );
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: null,
        totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
      sendMessage: mockSendMessage,
      startNewConversation: vi.fn(),
      stopStreaming: vi.fn(),
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('프로젝트 계획이 올바르게 생성됨', async () => {
    // Execute
    const { result } = renderHook(() => useProjectPlanner(), {
      wrapper: createWrapper(),
    });

    let planResult: any;
    await act(async () => {
      planResult = await result.current.createPlan(mockProjectPlanInput);
    });

    // Assert
    expect(planResult.success).toBe(true);
    expect(planResult.data?.sprintPlan).toBeDefined();
    expect(result.current.isPlanning).toBe(false);
  });
});

describe('useOpsReportWriter', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePromptTemplates).mockReturnValue({
      data: { data: [], count: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const mockSendMessage = vi.fn().mockResolvedValue(
      JSON.stringify(mockOpsReportOutput)
    );
    vi.mocked(useClaudeStreaming).mockReturnValue({
      state: {
        conversationId: null,
        messages: [],
        streamingText: '',
        isStreaming: false,
        isLoading: false,
        error: null,
        lastUsage: null,
        totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
      sendMessage: mockSendMessage,
      startNewConversation: vi.fn(),
      stopStreaming: vi.fn(),
      reset: vi.fn(),
      addToolResult: vi.fn(),
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('운영 보고서가 올바르게 생성됨', async () => {
    // Execute
    const { result } = renderHook(() => useOpsReportWriter(), {
      wrapper: createWrapper(),
    });

    let reportResult: any;
    await act(async () => {
      reportResult = await result.current.writeReport(mockOpsReportInput);
    });

    // Assert
    expect(reportResult.success).toBe(true);
    expect(reportResult.data?.executiveSummary).toBeDefined();
    expect(result.current.isWriting).toBe(false);
  });
});
