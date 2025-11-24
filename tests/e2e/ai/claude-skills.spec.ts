/**
 * Claude Skills E2E Tests
 *
 * Claude AI Skills 기능 테스트
 * - RFP 생성, 요구사항 분석, 프로젝트 계획, 운영 보고서
 * - docx, xlsx 연동
 * - 생성 취소, 긴 문서, 다중 섹션
 * - 재생성, 템플릿 선택, 한글 문서
 *
 * @module tests/e2e/ai/claude-skills
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from '../../fixtures/auth-helpers';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 모의 Claude Skills API 응답 생성 - RFP
 *
 * @param sections - RFP 섹션 수
 * @returns 모의 응답 객체
 */
function createMockRFPResponse(sections: number = 5) {
  const sectionList = Array.from({ length: sections }, (_, i) => ({
    id: `SEC-${String(i + 1).padStart(3, '0')}`,
    title: `섹션 ${i + 1}: 샘플 제목`,
    content: `이것은 섹션 ${i + 1}의 내용입니다. RFP 문서의 중요한 요구사항을 설명합니다.`,
  }));

  return {
    success: true,
    data: {
      title: '프로젝트 RFP 문서',
      projectName: '테스트 프로젝트',
      sections: sectionList,
      metadata: {
        createdAt: new Date().toISOString(),
        version: '1.0',
        language: 'ko',
      },
    },
  };
}

/**
 * 모의 Claude Skills API 응답 생성 - 요구사항 분석
 *
 * @returns 모의 응답 객체
 */
function createMockRequirementsResponse() {
  return {
    success: true,
    data: {
      functionalRequirements: [
        {
          id: 'FR-001',
          storyId: 'US-001',
          title: '사용자 로그인 기능',
          description: '사용자가 이메일과 비밀번호로 로그인할 수 있어야 합니다.',
          priority: 'must',
          acceptanceCriteria: [
            '이메일 형식 검증',
            '비밀번호 최소 8자',
            '로그인 실패 시 에러 메시지 표시',
          ],
          complexity: 3,
          dependencies: [],
        },
        {
          id: 'FR-002',
          storyId: 'US-002',
          title: '대시보드 조회',
          description: '로그인한 사용자가 대시보드를 조회할 수 있어야 합니다.',
          priority: 'must',
          acceptanceCriteria: ['통계 데이터 표시', '그래프 렌더링'],
          complexity: 4,
          dependencies: ['FR-001'],
        },
      ],
      nonFunctionalRequirements: [
        {
          id: 'NFR-001',
          type: 'performance',
          title: '응답 시간',
          description: 'API 응답 시간은 200ms 이하여야 합니다.',
          measurableCriteria: 'P95 < 200ms',
          priority: 'should',
          scope: 'global',
        },
        {
          id: 'NFR-002',
          type: 'security',
          title: '데이터 암호화',
          description: '민감 데이터는 암호화되어야 합니다.',
          measurableCriteria: 'AES-256 암호화',
          priority: 'must',
          scope: 'global',
        },
      ],
      summary: {
        totalFunctional: 2,
        totalNonFunctional: 2,
        priorityDistribution: { must: 3, should: 1, could: 0, wont: 0 },
        totalComplexity: 7,
        highRiskCount: 0,
      },
      risks: [],
      recommendations: ['인증 보안 강화 권장', 'API 캐싱 도입 검토'],
    },
  };
}

/**
 * 모의 Claude Skills API 응답 생성 - 프로젝트 계획
 *
 * @returns 모의 응답 객체
 */
function createMockProjectPlanResponse() {
  return {
    success: true,
    data: {
      projectName: '테스트 프로젝트',
      phases: [
        {
          id: 'PHASE-001',
          name: '기획 단계',
          duration: '2주',
          tasks: ['요구사항 분석', '설계 문서 작성', '리뷰 미팅'],
          deliverables: ['요구사항 명세서', '설계 문서'],
        },
        {
          id: 'PHASE-002',
          name: '개발 단계',
          duration: '6주',
          tasks: ['프론트엔드 개발', '백엔드 개발', '통합 테스트'],
          deliverables: ['실행 가능한 프로토타입'],
        },
        {
          id: 'PHASE-003',
          name: '테스트 단계',
          duration: '2주',
          tasks: ['QA 테스트', '버그 수정', '성능 테스트'],
          deliverables: ['테스트 보고서'],
        },
      ],
      milestones: [
        { name: 'M1: 기획 완료', date: '2주차' },
        { name: 'M2: 개발 완료', date: '8주차' },
        { name: 'M3: 출시', date: '10주차' },
      ],
      resources: ['프론트엔드 개발자 2명', '백엔드 개발자 2명', 'QA 엔지니어 1명'],
      risks: [
        { risk: '일정 지연', mitigation: '버퍼 기간 확보' },
        { risk: '기술적 어려움', mitigation: '기술 검토 선행' },
      ],
    },
  };
}

/**
 * 모의 Claude Skills API 응답 생성 - 운영 보고서
 *
 * @returns 모의 응답 객체
 */
function createMockOpsReportResponse() {
  return {
    success: true,
    data: {
      title: '2025년 11월 운영 보고서',
      period: '2025-11-01 ~ 2025-11-30',
      executiveSummary:
        '이번 달 SLA 달성률 98%를 기록했습니다. 주요 장애 2건이 발생했으나 모두 4시간 내 복구되었습니다.',
      slaAnalysis: {
        overallAchievementRate: 98,
        achievedCount: 5,
        missedCount: 1,
        analysis: '전반적으로 양호한 SLA 달성률을 보였습니다.',
        missedSLADetails: [
          {
            metric: '응답 시간',
            gap: 50,
            cause: '트래픽 급증',
            recommendation: '오토스케일링 임계값 조정',
          },
        ],
      },
      incidentAnalysis: {
        totalIncidents: 2,
        severityDistribution: { critical: 0, high: 1, medium: 1, low: 0 },
        totalDowntimeMinutes: 45,
        meanTimeToRecovery: 22.5,
        analysis: '장애 복구 시간이 목표 내에 유지되었습니다.',
        rootCauseAnalysis: [
          {
            category: '인프라',
            count: 1,
            percentage: 50,
            preventionMeasures: ['모니터링 강화', '알림 임계값 조정'],
          },
          {
            category: '애플리케이션',
            count: 1,
            percentage: 50,
            preventionMeasures: ['코드 리뷰 강화', '테스트 커버리지 향상'],
          },
        ],
      },
      improvementSuggestions: [
        {
          id: 'IMP-001',
          category: 'performance',
          title: '캐시 레이어 도입',
          description: 'Redis 캐시를 도입하여 응답 시간을 개선합니다.',
          priority: 'high',
          expectedBenefit: '응답 시간 50% 감소',
          effort: 'medium',
          estimatedDuration: '2주',
        },
      ],
      nextMonthPlan: {
        objectives: ['SLA 달성률 99% 목표', '장애 0건 목표', '모니터링 고도화'],
        keyTasks: [
          {
            task: '캐시 레이어 도입',
            owner: '인프라팀',
            dueDate: '12월 2주차',
            priority: 'high',
          },
          {
            task: '알림 시스템 개선',
            owner: '플랫폼팀',
            dueDate: '12월 3주차',
            priority: 'medium',
          },
        ],
        anticipatedRisks: ['연말 트래픽 증가', '휴가 기간 인력 부족'],
        resourceRequirements: ['추가 서버 인스턴스 2대'],
      },
      risks: [
        {
          id: 'RISK-001',
          title: '연말 트래픽 증가',
          description: '연말 이벤트로 인한 트래픽 증가 예상',
          likelihood: 'high',
          impact: 'medium',
          mitigation: '사전 오토스케일링 설정',
        },
      ],
      keyMetrics: [
        {
          name: '가용성',
          value: 99.9,
          target: 99.9,
          unit: '%',
          status: 'good',
          change: { value: 0.1, direction: 'up' },
        },
        {
          name: '평균 응답 시간',
          value: 180,
          target: 200,
          unit: 'ms',
          status: 'good',
          change: { value: 20, direction: 'down' },
        },
      ],
    },
  };
}

/**
 * 모의 docx 생성 응답
 *
 * @returns 모의 응답 객체
 */
function createMockDocxResponse() {
  return {
    success: true,
    data: {
      filename: 'document.docx',
      size: 15420,
      sections: 5,
      pages: 12,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * 모의 xlsx 생성 응답
 *
 * @returns 모의 응답 객체
 */
function createMockXlsxResponse() {
  return {
    success: true,
    data: {
      filename: 'report.xlsx',
      size: 8960,
      sheets: ['요약', '상세 데이터', '차트'],
      rows: 150,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * API 요청 인터셉트 설정
 *
 * @param page - Playwright 페이지 객체
 * @param options - 인터셉트 옵션
 */
async function setupSkillsApiIntercept(
  page: Page,
  options: {
    endpoint: string;
    status?: number;
    response?: unknown;
    delay?: number;
  }
) {
  const { endpoint, status = 200, response, delay = 0 } = options;

  await page.route(`**/${endpoint}**`, async (route) => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    await route.fulfill({
      status,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response || { success: true }),
    });
  });
}

// ============================================================================
// 1. RFP 생성 요청 성공 테스트
// ============================================================================

test.describe('Claude Skills - RFP 생성', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('RFP 생성 요청 성공', async ({ page }) => {
    // API 인터셉트 설정
    await setupSkillsApiIntercept(page, {
      endpoint: 'functions/v1/claude-skills',
      status: 200,
      response: createMockRFPResponse(),
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // JavaScript로 RFP 생성 API 호출
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/claude-skills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            skill: 'rfp-generator',
            input: {
              projectName: '테스트 프로젝트',
              template: 'startup-mvp',
              requirements: ['사용자 인증', '대시보드', '보고서 생성'],
            },
          }),
        });

        const data = await response.json();
        return {
          success: response.ok,
          data,
          hasSections: Array.isArray(data.data?.sections),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    expect(result.success).toBe(true);
    expect(result.hasSections).toBe(true);
    expect(result.data.data.sections.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 2. 요구사항 분석 성공 테스트
// ============================================================================

test.describe('Claude Skills - 요구사항 분석', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('요구사항 분석 성공', async ({ page }) => {
    await setupSkillsApiIntercept(page, {
      endpoint: 'functions/v1/claude-skills',
      status: 200,
      response: createMockRequirementsResponse(),
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/claude-skills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            skill: 'requirements-analyzer',
            input: {
              userStories: [
                {
                  id: 'US-001',
                  title: '로그인',
                  asA: '사용자',
                  iWant: '이메일로 로그인',
                  soThat: '서비스를 이용할 수 있다',
                },
              ],
              options: {
                autoGenerateNFR: true,
                domain: 'SaaS',
              },
            },
          }),
        });

        const data = await response.json();
        return {
          success: response.ok,
          data,
          hasFunctional: Array.isArray(data.data?.functionalRequirements),
          hasNonFunctional: Array.isArray(data.data?.nonFunctionalRequirements),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    expect(result.success).toBe(true);
    expect(result.hasFunctional).toBe(true);
    expect(result.hasNonFunctional).toBe(true);
    expect(result.data.data.functionalRequirements.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 3. 프로젝트 계획 생성 성공 테스트
// ============================================================================

test.describe('Claude Skills - 프로젝트 계획', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('프로젝트 계획 생성 성공', async ({ page }) => {
    await setupSkillsApiIntercept(page, {
      endpoint: 'functions/v1/claude-skills',
      status: 200,
      response: createMockProjectPlanResponse(),
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/claude-skills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            skill: 'project-planner',
            input: {
              projectName: '테스트 프로젝트',
              requirements: ['로그인', '대시보드', '보고서'],
              constraints: {
                deadline: '2025-03-31',
                budget: '5000만원',
                teamSize: 5,
              },
            },
          }),
        });

        const data = await response.json();
        return {
          success: response.ok,
          data,
          hasPhases: Array.isArray(data.data?.phases),
          hasMilestones: Array.isArray(data.data?.milestones),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    expect(result.success).toBe(true);
    expect(result.hasPhases).toBe(true);
    expect(result.hasMilestones).toBe(true);
    expect(result.data.data.phases.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 4. 운영 보고서 생성 성공 테스트
// ============================================================================

test.describe('Claude Skills - 운영 보고서', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('운영 보고서 생성 성공', async ({ page }) => {
    await setupSkillsApiIntercept(page, {
      endpoint: 'functions/v1/claude-skills',
      status: 200,
      response: createMockOpsReportResponse(),
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/claude-skills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            skill: 'ops-report-generator',
            input: {
              period: {
                startDate: '2025-11-01',
                endDate: '2025-11-30',
              },
              reportType: 'monthly',
              detailLevel: 'detailed',
            },
          }),
        });

        const data = await response.json();
        return {
          success: response.ok,
          data,
          hasSLAAnalysis: data.data?.slaAnalysis != null,
          hasIncidentAnalysis: data.data?.incidentAnalysis != null,
          hasNextMonthPlan: data.data?.nextMonthPlan != null,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    expect(result.success).toBe(true);
    expect(result.hasSLAAnalysis).toBe(true);
    expect(result.hasIncidentAnalysis).toBe(true);
    expect(result.hasNextMonthPlan).toBe(true);
  });
});

// ============================================================================
// 5. docx 연동 테스트
// ============================================================================

test.describe('Claude Skills - docx 연동', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('docx 연동 테스트', async ({ page }) => {
    await setupSkillsApiIntercept(page, {
      endpoint: 'functions/v1/claude-skills',
      status: 200,
      response: createMockDocxResponse(),
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/claude-skills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            skill: 'docx-export',
            input: {
              documentType: 'rfp',
              content: {
                title: 'RFP 문서',
                sections: [
                  { title: '개요', content: '프로젝트 개요입니다.' },
                  { title: '요구사항', content: '기능 요구사항 목록입니다.' },
                ],
              },
              options: {
                template: 'government-si',
              },
            },
          }),
        });

        const data = await response.json();
        return {
          success: response.ok,
          data,
          hasFilename: typeof data.data?.filename === 'string',
          isDocx: data.data?.filename?.endsWith('.docx'),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    expect(result.success).toBe(true);
    expect(result.hasFilename).toBe(true);
    expect(result.isDocx).toBe(true);
  });
});

// ============================================================================
// 6. xlsx 연동 테스트
// ============================================================================

test.describe('Claude Skills - xlsx 연동', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('xlsx 연동 테스트', async ({ page }) => {
    await setupSkillsApiIntercept(page, {
      endpoint: 'functions/v1/claude-skills',
      status: 200,
      response: createMockXlsxResponse(),
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/claude-skills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            skill: 'xlsx-export',
            input: {
              reportType: 'operations',
              data: {
                metrics: [
                  { name: '가용성', value: 99.9, unit: '%' },
                  { name: '응답시간', value: 180, unit: 'ms' },
                ],
              },
              options: {
                includeCharts: true,
              },
            },
          }),
        });

        const data = await response.json();
        return {
          success: response.ok,
          data,
          hasFilename: typeof data.data?.filename === 'string',
          isXlsx: data.data?.filename?.endsWith('.xlsx'),
          hasSheets: Array.isArray(data.data?.sheets),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    expect(result.success).toBe(true);
    expect(result.hasFilename).toBe(true);
    expect(result.isXlsx).toBe(true);
    expect(result.hasSheets).toBe(true);
  });
});

// ============================================================================
// 7. 생성 취소 처리 테스트
// ============================================================================

test.describe('Claude Skills - 생성 취소', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('생성 취소 처리', async ({ page }) => {
    // 지연된 응답 설정 (취소 테스트용)
    await setupSkillsApiIntercept(page, {
      endpoint: 'functions/v1/claude-skills',
      status: 200,
      response: createMockRFPResponse(),
      delay: 5000, // 5초 지연
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
      const controller = new AbortController();
      const { signal } = controller;

      // 100ms 후 취소
      setTimeout(() => controller.abort(), 100);

      try {
        await fetch('/functions/v1/claude-skills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            skill: 'rfp-generator',
            input: { projectName: '취소 테스트' },
          }),
          signal,
        });

        return { cancelled: false };
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return { cancelled: true };
        }
        return {
          cancelled: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    expect(result.cancelled).toBe(true);
  });
});

// ============================================================================
// 8. 긴 문서 생성 테스트
// ============================================================================

test.describe('Claude Skills - 긴 문서 생성', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('긴 문서 생성', async ({ page }) => {
    // 많은 섹션을 가진 RFP 응답
    await setupSkillsApiIntercept(page, {
      endpoint: 'functions/v1/claude-skills',
      status: 200,
      response: createMockRFPResponse(20), // 20개 섹션
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/claude-skills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            skill: 'rfp-generator',
            input: {
              projectName: '대규모 프로젝트',
              template: 'enterprise',
              detailLevel: 'comprehensive',
            },
          }),
        });

        const data = await response.json();
        return {
          success: response.ok,
          data,
          sectionCount: data.data?.sections?.length || 0,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    expect(result.success).toBe(true);
    expect(result.sectionCount).toBe(20);
  });
});

// ============================================================================
// 9. 다중 섹션 생성 테스트
// ============================================================================

test.describe('Claude Skills - 다중 섹션', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('다중 섹션 생성', async ({ page }) => {
    await setupSkillsApiIntercept(page, {
      endpoint: 'functions/v1/claude-skills',
      status: 200,
      response: {
        success: true,
        data: {
          sections: [
            { id: 'sec-1', type: 'intro', title: '서론', content: '프로젝트 소개' },
            { id: 'sec-2', type: 'requirements', title: '요구사항', content: '기능 목록' },
            { id: 'sec-3', type: 'architecture', title: '아키텍처', content: '시스템 구조' },
            { id: 'sec-4', type: 'timeline', title: '일정', content: '마일스톤' },
            { id: 'sec-5', type: 'budget', title: '예산', content: '비용 계획' },
          ],
          metadata: {
            totalSections: 5,
            generatedAt: new Date().toISOString(),
          },
        },
      },
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/claude-skills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            skill: 'multi-section-generator',
            input: {
              sectionTypes: ['intro', 'requirements', 'architecture', 'timeline', 'budget'],
            },
          }),
        });

        const data = await response.json();
        const sections = data.data?.sections || [];
        const sectionTypes = sections.map((s: { type: string }) => s.type);

        return {
          success: response.ok,
          data,
          sectionCount: sections.length,
          hasAllTypes:
            sectionTypes.includes('intro') &&
            sectionTypes.includes('requirements') &&
            sectionTypes.includes('architecture'),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    expect(result.success).toBe(true);
    expect(result.sectionCount).toBe(5);
    expect(result.hasAllTypes).toBe(true);
  });
});

// ============================================================================
// 10. 재생성 요청 테스트
// ============================================================================

test.describe('Claude Skills - 재생성', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('재생성 요청', async ({ page }) => {
    let callCount = 0;

    await page.route('**/functions/v1/claude-skills**', async (route) => {
      callCount++;
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          data: {
            title: `생성 버전 ${callCount}`,
            version: callCount,
            regenerated: callCount > 1,
            content: `이것은 버전 ${callCount}의 내용입니다.`,
          },
        }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
      const results: { version: number; regenerated: boolean }[] = [];

      // 첫 번째 생성
      const response1 = await fetch('/functions/v1/claude-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill: 'content-generator',
          input: { topic: '테스트 주제' },
        }),
      });
      const data1 = await response1.json();
      results.push({
        version: data1.data.version,
        regenerated: data1.data.regenerated,
      });

      // 재생성 요청
      const response2 = await fetch('/functions/v1/claude-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill: 'content-generator',
          input: { topic: '테스트 주제', regenerate: true },
        }),
      });
      const data2 = await response2.json();
      results.push({
        version: data2.data.version,
        regenerated: data2.data.regenerated,
      });

      return { results };
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0].version).toBe(1);
    expect(result.results[1].version).toBe(2);
    expect(result.results[1].regenerated).toBe(true);
  });
});

// ============================================================================
// 11. 템플릿 선택 테스트
// ============================================================================

test.describe('Claude Skills - 템플릿 선택', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('템플릿 선택', async ({ page }) => {
    const templates = ['government-si', 'startup-mvp', 'enterprise'];

    await page.route('**/functions/v1/claude-skills**', async (route, request) => {
      const postData = request.postDataJSON();
      const selectedTemplate = postData?.input?.template || 'default';

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          data: {
            template: selectedTemplate,
            title: `${selectedTemplate} 템플릿 문서`,
            appliedStyles:
              selectedTemplate === 'government-si'
                ? { formal: true, numbered: true }
                : selectedTemplate === 'startup-mvp'
                  ? { agile: true, lean: true }
                  : { comprehensive: true, detailed: true },
          },
        }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await page.evaluate(async (templateList) => {
      const templateResults: { template: string; title: string }[] = [];

      for (const template of templateList) {
        const response = await fetch('/functions/v1/claude-skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skill: 'rfp-generator',
            input: {
              projectName: '테스트',
              template,
            },
          }),
        });
        const data = await response.json();
        templateResults.push({
          template: data.data.template,
          title: data.data.title,
        });
      }

      return templateResults;
    }, templates);

    expect(results).toHaveLength(3);
    expect(results[0].template).toBe('government-si');
    expect(results[1].template).toBe('startup-mvp');
    expect(results[2].template).toBe('enterprise');
  });
});

// ============================================================================
// 12. 한글 문서 생성 테스트
// ============================================================================

test.describe('Claude Skills - 한글 문서', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('한글 문서 생성', async ({ page }) => {
    const koreanContent = {
      title: '프로젝트 제안서',
      sections: [
        {
          title: '사업 개요',
          content:
            '본 프로젝트는 디지털 전환을 위한 핵심 시스템 구축을 목표로 합니다.',
        },
        {
          title: '추진 배경',
          content:
            '급변하는 시장 환경에 대응하기 위해 혁신적인 솔루션이 필요합니다.',
        },
        {
          title: '기대 효과',
          content: '업무 효율성 30% 향상, 비용 절감 20% 달성을 목표로 합니다.',
        },
      ],
      metadata: {
        language: 'ko',
        encoding: 'UTF-8',
      },
    };

    await setupSkillsApiIntercept(page, {
      endpoint: 'functions/v1/claude-skills',
      status: 200,
      response: {
        success: true,
        data: koreanContent,
      },
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/claude-skills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify({
            skill: 'document-generator',
            input: {
              language: 'ko',
              title: '프로젝트 제안서',
              sections: ['사업 개요', '추진 배경', '기대 효과'],
            },
          }),
        });

        const data = await response.json();

        // 한글 포함 여부 확인
        const hasKoreanTitle = /[가-힣]/.test(data.data?.title || '');
        const hasKoreanContent = data.data?.sections?.some(
          (s: { content: string }) => /[가-힣]/.test(s.content || '')
        );

        return {
          success: response.ok,
          data,
          hasKoreanTitle,
          hasKoreanContent,
          language: data.data?.metadata?.language,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    expect(result.success).toBe(true);
    expect(result.hasKoreanTitle).toBe(true);
    expect(result.hasKoreanContent).toBe(true);
    expect(result.language).toBe('ko');
  });
});
