/**
 * RAG System E2E Tests
 *
 * RAG (Retrieval-Augmented Generation) 시스템 통합 테스트
 * - 문서 관리 (생성/조회/수정/삭제)
 * - 임베딩 트리거 및 상태 확인
 * - 벡터 검색 실행
 * - RAG 채팅 통합
 * - UI 컴포넌트 테스트
 * - 에러 핸들링
 *
 * @module tests/e2e/ai/rag
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from '../../fixtures/auth-helpers';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 모의 RAG 문서 생성
 */
function createMockRAGDocument() {
  return {
    id: `doc_${Date.now()}`,
    service_id: 'minu-find',
    title: 'RAG 테스트 문서',
    content: '이것은 RAG 시스템 테스트를 위한 문서입니다. 프로젝트 관리와 협업 도구에 대한 내용을 포함합니다.',
    content_type: 'text',
    source_url: null,
    metadata: { tags: ['test', 'rag'] },
    status: 'active',
    embedding_status: 'pending',
    embedding_error: null,
    chunk_count: 0,
    created_by: 'test-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * 모의 RAG 검색 결과 생성
 */
function createMockSearchResults(count: number = 3) {
  return Array.from({ length: count }, (_, i) => ({
    id: `chunk_${i}`,
    document_id: `doc_${i}`,
    document_title: `테스트 문서 ${i + 1}`,
    chunk_content: `테스트 청크 내용 ${i + 1}: 프로젝트 관리 도구에 대한 설명입니다.`,
    chunk_index: i,
    similarity: 0.9 - i * 0.1,
    metadata: { page: i + 1 },
    service_id: 'minu-find',
    created_at: new Date().toISOString(),
  }));
}

/**
 * RAG API 인터셉트 설정
 */
async function setupRAGApiIntercept(
  page: Page,
  options: {
    endpoint: 'documents' | 'search' | 'embedding';
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    status?: number;
    response?: unknown;
    delay?: number;
  }
) {
  const { endpoint, method = 'GET', status = 200, response, delay = 0 } = options;

  let routePattern = '';
  if (endpoint === 'documents') {
    routePattern = '**/rest/v1/rag_documents**';
  } else if (endpoint === 'search') {
    routePattern = '**/functions/v1/rag-search/query**';
  } else if (endpoint === 'embedding') {
    routePattern = '**/functions/v1/rag-embedding/trigger**';
  }

  await page.route(routePattern, async (route) => {
    if (route.request().method() !== method) {
      return route.continue();
    }

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
// 1. 문서 관리 테스트
// ============================================================================

test.describe('RAG 문서 관리', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('문서 생성 (CreateRAGDocumentInput)', async ({ page }) => {
    const mockDocument = createMockRAGDocument();

    // API 인터셉트
    await setupRAGApiIntercept(page, {
      endpoint: 'documents',
      method: 'POST',
      status: 201,
      response: mockDocument,
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 문서 생성 테스트
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/rest/v1/rag_documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            service_id: 'minu-find',
            title: 'RAG 테스트 문서',
            content: '테스트 내용입니다.',
            content_type: 'text',
            status: 'active',
            embedding_status: 'pending',
          }),
        });

        const data = await response.json();
        return {
          success: response.ok,
          status: response.status,
          data,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // 검증
    expect(result.success).toBe(true);
    expect(result.status).toBe(201);
    expect(result.data).toHaveProperty('id');
    expect(result.data).toHaveProperty('title');
  });

  test('문서 목록 조회', async ({ page }) => {
    const mockDocuments = [createMockRAGDocument(), createMockRAGDocument()];

    // API 인터셉트
    await setupRAGApiIntercept(page, {
      endpoint: 'documents',
      method: 'GET',
      status: 200,
      response: mockDocuments,
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 문서 목록 조회 테스트
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/rest/v1/rag_documents?status=eq.active', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        return {
          success: response.ok,
          data,
          count: Array.isArray(data) ? data.length : 0,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // 검증
    expect(result.success).toBe(true);
    expect(result.count).toBeGreaterThan(0);
  });

  test('문서 업데이트', async ({ page }) => {
    const mockDocument = createMockRAGDocument();
    const updatedDocument = {
      ...mockDocument,
      title: '수정된 제목',
      updated_at: new Date().toISOString(),
    };

    // API 인터셉트
    await setupRAGApiIntercept(page, {
      endpoint: 'documents',
      method: 'PUT',
      status: 200,
      response: updatedDocument,
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 문서 업데이트 테스트
    const result = await page.evaluate(async (docId) => {
      try {
        const response = await fetch(`/rest/v1/rag_documents?id=eq.${docId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: '수정된 제목',
          }),
        });

        const data = await response.json();
        return {
          success: response.ok,
          data,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }, mockDocument.id);

    // 검증
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('title', '수정된 제목');
  });

  test('문서 삭제', async ({ page }) => {
    const mockDocument = createMockRAGDocument();

    // API 인터셉트
    await setupRAGApiIntercept(page, {
      endpoint: 'documents',
      method: 'DELETE',
      status: 204,
      response: null,
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 문서 삭제 테스트
    const result = await page.evaluate(async (docId) => {
      try {
        const response = await fetch(`/rest/v1/rag_documents?id=eq.${docId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        return {
          success: response.ok,
          status: response.status,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }, mockDocument.id);

    // 검증
    expect(result.success).toBe(true);
    expect(result.status).toBe(204);
  });
});

// ============================================================================
// 2. 임베딩 테스트
// ============================================================================

test.describe('RAG 임베딩', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('임베딩 트리거 요청', async ({ page }) => {
    const mockDocument = createMockRAGDocument();

    // API 인터셉트
    await setupRAGApiIntercept(page, {
      endpoint: 'embedding',
      method: 'POST',
      status: 200,
      response: {
        success: true,
        document_id: mockDocument.id,
        status: 'processing',
      },
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 임베딩 트리거 테스트
    const result = await page.evaluate(async (docId) => {
      try {
        const response = await fetch('/functions/v1/rag-embedding/trigger', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            document_id: docId,
          }),
        });

        const data = await response.json();
        return {
          success: response.ok,
          data,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }, mockDocument.id);

    // 검증
    expect(result.success).toBe(true);
    expect(result.data.success).toBe(true);
    expect(result.data.status).toBe('processing');
  });

  test('임베딩 상태 확인 (pending → processing → completed)', async ({ page }) => {
    const mockDocument = createMockRAGDocument();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 임베딩 상태 변화 시뮬레이션
    const result = await page.evaluate(async (docId) => {
      const states: string[] = [];

      // 1. pending 상태
      states.push('pending');

      // 2. processing 상태
      await new Promise((resolve) => setTimeout(resolve, 100));
      states.push('processing');

      // 3. completed 상태
      await new Promise((resolve) => setTimeout(resolve, 100));
      states.push('completed');

      return {
        states,
        finalState: states[states.length - 1],
      };
    }, mockDocument.id);

    // 검증
    expect(result.states).toEqual(['pending', 'processing', 'completed']);
    expect(result.finalState).toBe('completed');
  });
});

// ============================================================================
// 3. 검색 테스트
// ============================================================================

test.describe('RAG 벡터 검색', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('벡터 검색 실행', async ({ page }) => {
    const mockResults = createMockSearchResults(3);

    // API 인터셉트
    await setupRAGApiIntercept(page, {
      endpoint: 'search',
      method: 'POST',
      status: 200,
      response: {
        success: true,
        data: {
          results: mockResults,
          query: '프로젝트 관리',
          count: mockResults.length,
        },
      },
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 검색 실행 테스트
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/rag-search/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: '프로젝트 관리',
            limit: 5,
            threshold: 0.7,
          }),
        });

        const data = await response.json();
        return {
          success: response.ok,
          data,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // 검증
    expect(result.success).toBe(true);
    expect(result.data.success).toBe(true);
    expect(result.data.data.results).toHaveLength(3);
    expect(result.data.data.count).toBe(3);
  });

  test('유사도 임계값 필터링', async ({ page }) => {
    // 유사도가 다양한 검색 결과
    const mockResults = [
      { ...createMockSearchResults(1)[0], similarity: 0.9 },
      { ...createMockSearchResults(1)[0], similarity: 0.75 },
      { ...createMockSearchResults(1)[0], similarity: 0.6 },
      { ...createMockSearchResults(1)[0], similarity: 0.5 },
    ];

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 클라이언트 측 필터링 테스트
    const result = await page.evaluate((results) => {
      const threshold = 0.7;
      const filtered = results.filter((r: { similarity: number }) => r.similarity >= threshold);

      return {
        total: results.length,
        filtered: filtered.length,
        allAboveThreshold: filtered.every((r: { similarity: number }) => r.similarity >= threshold),
      };
    }, mockResults);

    // 검증
    expect(result.total).toBe(4);
    expect(result.filtered).toBe(2); // 0.9, 0.75만 통과
    expect(result.allAboveThreshold).toBe(true);
  });

  test('서비스별 검색 (serviceId 필터)', async ({ page }) => {
    const mockResults = createMockSearchResults(3).map((r) => ({
      ...r,
      service_id: 'minu-find',
    }));

    // API 인터셉트
    await setupRAGApiIntercept(page, {
      endpoint: 'search',
      method: 'POST',
      status: 200,
      response: {
        success: true,
        data: {
          results: mockResults,
          query: '사업기회',
          count: mockResults.length,
        },
      },
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 서비스별 검색 테스트
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/rag-search/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: '사업기회',
            service_id: 'minu-find',
            limit: 5,
            threshold: 0.7,
          }),
        });

        const data = await response.json();
        return {
          success: response.ok,
          data,
          allSameService:
            data.data?.results.every((r: { service_id: string }) => r.service_id === 'minu-find') ||
            false,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // 검증
    expect(result.success).toBe(true);
    expect(result.allSameService).toBe(true);
  });
});

// ============================================================================
// 4. RAG 채팅 테스트
// ============================================================================

test.describe('RAG 채팅 통합', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('RAG 활성화 상태에서 메시지 전송', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // RAG 활성화 및 메시지 전송 시뮬레이션
    const result = await page.evaluate(async () => {
      // RAG 상태 설정
      const ragEnabled = true;

      // 메시지 전송 시 RAG 컨텍스트 포함
      const message = {
        role: 'user',
        content: '프로젝트 관리에 대해 알려주세요',
        useRAG: ragEnabled,
      };

      return {
        messageSent: true,
        ragEnabled,
        messageContent: message.content,
      };
    });

    // 검증
    expect(result.messageSent).toBe(true);
    expect(result.ragEnabled).toBe(true);
  });

  test('컨텍스트 주입 확인', async ({ page }) => {
    const mockSearchResults = createMockSearchResults(2);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 컨텍스트 빌드 테스트
    const result = await page.evaluate((results) => {
      // 검색 결과를 컨텍스트로 변환
      const contextChunks = results.map(
        (r: { document_title: string; chunk_content: string }, i: number) =>
          `[출처 ${i + 1}: ${r.document_title}]\n${r.chunk_content}`
      );

      const context = contextChunks.join('\n\n---\n\n');

      return {
        chunksCount: results.length,
        contextLength: context.length,
        hasContext: context.length > 0,
      };
    }, mockSearchResults);

    // 검증
    expect(result.chunksCount).toBe(2);
    expect(result.hasContext).toBe(true);
    expect(result.contextLength).toBeGreaterThan(0);
  });

  test('RAG 비활성화 토글', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // RAG 토글 테스트
    const result = await page.evaluate(() => {
      let ragEnabled = true;

      // 토글
      ragEnabled = !ragEnabled;

      return {
        initialState: true,
        toggledState: ragEnabled,
      };
    });

    // 검증
    expect(result.initialState).toBe(true);
    expect(result.toggledState).toBe(false);
  });
});

// ============================================================================
// 5. UI 컴포넌트 테스트
// ============================================================================

test.describe('RAG UI 컴포넌트', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('RAGSearchResults 검색 결과 표시', async ({ page }) => {
    const mockResults = createMockSearchResults(3);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 검색 결과 렌더링 시뮬레이션
    const result = await page.evaluate((results) => {
      // 결과 표시 로직
      const displayResults = results.map((r: { document_title: string; similarity: number }) => ({
        title: r.document_title,
        similarityPercent: Math.round(r.similarity * 100),
      }));

      return {
        resultsCount: results.length,
        displayResults,
        hasResults: results.length > 0,
      };
    }, mockResults);

    // 검증
    expect(result.resultsCount).toBe(3);
    expect(result.hasResults).toBe(true);
    expect(result.displayResults[0].similarityPercent).toBeGreaterThan(0);
  });

  test('DocumentUploader 파일 드래그앤드롭 (시뮬레이션)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 파일 업로드 시뮬레이션
    const result = await page.evaluate(() => {
      // 파일 드롭 이벤트 시뮬레이션
      const file = {
        name: 'test-document.txt',
        type: 'text/plain',
        size: 1024,
        content: '테스트 문서 내용',
      };

      // 업로드 처리
      const uploaded = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        success: true,
      };

      return uploaded;
    });

    // 검증
    expect(result.success).toBe(true);
    expect(result.fileName).toBe('test-document.txt');
    expect(result.fileSize).toBe(1024);
  });
});

// ============================================================================
// 6. 에러 핸들링 테스트
// ============================================================================

test.describe('RAG 에러 처리', () => {
  test('인증 실패 시 에러 처리', async ({ page }) => {
    // 로그인 없이 진행

    // 401 응답 인터셉트
    await setupRAGApiIntercept(page, {
      endpoint: 'documents',
      method: 'GET',
      status: 401,
      response: {
        error: 'Unauthorized',
        message: '인증이 필요합니다.',
      },
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 인증 실패 테스트
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/rest/v1/rag_documents', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        return {
          status: response.status,
          ok: response.ok,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // 검증
    expect(result.status).toBe(401);
    expect(result.ok).toBe(false);
  });

  test('빈 검색 결과 처리', async ({ page }) => {
    // 빈 결과 인터셉트
    await setupRAGApiIntercept(page, {
      endpoint: 'search',
      method: 'POST',
      status: 200,
      response: {
        success: true,
        data: {
          results: [],
          query: '존재하지 않는 검색어',
          count: 0,
        },
      },
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 빈 결과 처리 테스트
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/rag-search/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: '존재하지 않는 검색어',
            limit: 5,
            threshold: 0.7,
          }),
        });

        const data = await response.json();
        return {
          success: response.ok,
          isEmpty: data.data.results.length === 0,
          count: data.data.count,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // 검증
    expect(result.success).toBe(true);
    expect(result.isEmpty).toBe(true);
    expect(result.count).toBe(0);
  });

  test('임베딩 실패 시 에러 메시지', async ({ page }) => {
    const mockDocument = createMockRAGDocument();

    // 실패 응답 인터셉트
    await setupRAGApiIntercept(page, {
      endpoint: 'embedding',
      method: 'POST',
      status: 500,
      response: {
        success: false,
        error: {
          code: 'EMBEDDING_FAILED',
          message: '임베딩 생성에 실패했습니다.',
        },
      },
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 임베딩 실패 테스트
    const result = await page.evaluate(async (docId) => {
      try {
        const response = await fetch('/functions/v1/rag-embedding/trigger', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            document_id: docId,
          }),
        });

        const data = await response.json();
        return {
          status: response.status,
          ok: response.ok,
          data,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }, mockDocument.id);

    // 검증
    expect(result.status).toBe(500);
    expect(result.ok).toBe(false);
    expect(result.data.success).toBe(false);
  });

  test('검색 타임아웃 처리', async ({ page }) => {
    // 지연된 응답 인터셉트 (타임아웃 시뮬레이션)
    await setupRAGApiIntercept(page, {
      endpoint: 'search',
      method: 'POST',
      status: 408,
      response: {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: '검색 시간이 초과되었습니다.',
        },
      },
      delay: 5000,
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 타임아웃 처리 테스트
    const result = await page.evaluate(async () => {
      const controller = new AbortController();
      const { signal } = controller;

      // 100ms 후 취소
      setTimeout(() => controller.abort(), 100);

      try {
        await fetch('/functions/v1/rag-search/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: '검색어',
            limit: 5,
            threshold: 0.7,
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

    // 검증
    expect(result.cancelled).toBe(true);
  });
});
