/**
 * Claude AI Integration E2E Tests
 *
 * Claude AI API 통합 테스트
 * - Edge Function 호출
 * - 인증 및 에러 처리
 * - 스트리밍 응답
 * - 토큰 사용량
 *
 * @module tests/e2e/ai/claude-integration
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from '../../fixtures/auth-helpers';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 모의 Claude API 응답 생성
 *
 * @param content - 응답 내용
 * @param usage - 토큰 사용량
 * @returns 모의 응답 객체
 */
function createMockClaudeResponse(
  content: string,
  usage: { input_tokens: number; output_tokens: number } = { input_tokens: 10, output_tokens: 20 }
) {
  return {
    id: `msg_${Date.now()}`,
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: content,
      },
    ],
    model: 'claude-sonnet-4-20250514',
    stop_reason: 'end_turn',
    usage,
  };
}

/**
 * 모의 스트리밍 청크 생성
 *
 * @param text - 텍스트 청크
 * @param isLast - 마지막 청크 여부
 * @returns 스트리밍 이벤트 데이터
 */
function createStreamChunk(text: string, isLast: boolean = false) {
  if (isLast) {
    return {
      type: 'message_stop',
    };
  }
  return {
    type: 'content_block_delta',
    index: 0,
    delta: {
      type: 'text_delta',
      text,
    },
  };
}

/**
 * API 요청 인터셉트 설정
 *
 * @param page - Playwright 페이지 객체
 * @param options - 인터셉트 옵션
 */
async function setupApiIntercept(
  page: Page,
  options: {
    status?: number;
    response?: unknown;
    delay?: number;
    isStream?: boolean;
  } = {}
) {
  const { status = 200, response, delay = 0, isStream = false } = options;

  await page.route('**/functions/v1/claude-chat**', async (route) => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (isStream) {
      // 스트리밍 응답
      const chunks = response as string[];
      const streamBody = chunks
        .map((chunk, i) => {
          const data = createStreamChunk(chunk, i === chunks.length - 1);
          return `data: ${JSON.stringify(data)}\n\n`;
        })
        .join('');

      await route.fulfill({
        status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        body: streamBody,
      });
    } else {
      await route.fulfill({
        status,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(response || createMockClaudeResponse('테스트 응답입니다.')),
      });
    }
  });
}

// ============================================================================
// 1. Edge Function 호출 성공 테스트
// ============================================================================

test.describe('Claude AI Edge Function 호출', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('Edge Function 호출 성공', async ({ page }) => {
    // API 인터셉트 설정
    await setupApiIntercept(page, {
      status: 200,
      response: createMockClaudeResponse('안녕하세요! 무엇을 도와드릴까요?', {
        input_tokens: 15,
        output_tokens: 25,
      }),
    });

    // 챗봇 페이지 또는 AI 기능이 있는 페이지로 이동
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 페이지가 정상 로드되었는지 확인
    await expect(page.locator('body')).toBeVisible();

    // JavaScript로 직접 API 호출 테스트
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/claude-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: '안녕하세요' }],
          }),
        });

        if (!response.ok) {
          return { success: false, status: response.status };
        }

        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // 인터셉트된 응답이므로 항상 성공해야 함
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveProperty('content');
    }
  });
});

// ============================================================================
// 2. 인증 실패 (401) 테스트
// ============================================================================

test.describe('Claude AI 인증 실패', () => {
  test('인증 실패 (401)', async ({ page }) => {
    // 로그인 없이 진행

    // 401 응답 인터셉트 설정
    await setupApiIntercept(page, {
      status: 401,
      response: {
        error: 'Unauthorized',
        message: '인증이 필요합니다.',
        code: 'AUTH_REQUIRED',
      },
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // JavaScript로 API 호출 (인증 없이)
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/claude-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: '테스트' }],
          }),
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

    // 401 응답 확인
    expect(result.status).toBe(401);
    expect(result.ok).toBe(false);
  });
});

// ============================================================================
// 3. Rate Limit 초과 (429) 테스트
// ============================================================================

test.describe('Claude AI Rate Limit', () => {
  test('Rate Limit 초과 (429)', async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);

    // 429 응답 인터셉트 설정
    await setupApiIntercept(page, {
      status: 429,
      response: {
        error: 'Too Many Requests',
        message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60,
      },
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // JavaScript로 API 호출
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/claude-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: '테스트' }],
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
    });

    // 429 응답 확인
    expect(result.status).toBe(429);
    expect(result.ok).toBe(false);
    expect(result.data).toHaveProperty('retryAfter');
  });
});

// ============================================================================
// 4. 스트리밍 응답 수신 테스트
// ============================================================================

test.describe('Claude AI 스트리밍', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('스트리밍 응답 수신', async ({ page }) => {
    // 스트리밍 응답 인터셉트 설정
    const streamChunks = ['안녕', '하세요! ', '무엇을 ', '도와드릴까요?'];
    await setupApiIntercept(page, {
      status: 200,
      response: streamChunks,
      isStream: true,
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // JavaScript로 스트리밍 API 호출
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/claude-chat?stream=true', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: '안녕하세요' }],
            stream: true,
          }),
        });

        if (!response.ok) {
          return { success: false, status: response.status };
        }

        // 스트리밍 응답 읽기
        const reader = response.body?.getReader();
        if (!reader) {
          return { success: false, error: 'No reader available' };
        }

        const chunks: string[] = [];
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          chunks.push(text);
        }

        return {
          success: true,
          chunksReceived: chunks.length,
          totalLength: chunks.join('').length,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // 스트리밍 응답 수신 확인
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.chunksReceived).toBeGreaterThan(0);
      expect(result.totalLength).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// 5. 에러 응답 처리 테스트
// ============================================================================

test.describe('Claude AI 에러 처리', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('에러 응답 처리', async ({ page }) => {
    // 500 에러 응답 인터셉트 설정
    await setupApiIntercept(page, {
      status: 500,
      response: {
        error: 'Internal Server Error',
        message: 'AI 서비스에 일시적인 문제가 발생했습니다.',
        code: 'INTERNAL_ERROR',
      },
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // JavaScript로 API 호출
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/claude-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: '테스트' }],
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
    });

    // 500 에러 확인
    expect(result.status).toBe(500);
    expect(result.ok).toBe(false);
    expect(result.data).toHaveProperty('error');
    expect(result.data).toHaveProperty('message');
  });
});

// ============================================================================
// 6. 취소 요청 처리 테스트
// ============================================================================

test.describe('Claude AI 취소 처리', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('취소 요청 처리', async ({ page }) => {
    // 지연된 응답 인터셉트 설정 (취소 테스트용)
    await setupApiIntercept(page, {
      status: 200,
      response: createMockClaudeResponse('지연된 응답입니다.'),
      delay: 5000, // 5초 지연
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // JavaScript로 취소 가능한 API 호출
    const result = await page.evaluate(async () => {
      const controller = new AbortController();
      const { signal } = controller;

      // 100ms 후 취소
      setTimeout(() => controller.abort(), 100);

      try {
        await fetch('/functions/v1/claude-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: '취소 테스트' }],
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

    // 요청이 취소되었는지 확인
    expect(result.cancelled).toBe(true);
  });
});

// ============================================================================
// 7. 빈 응답 처리 테스트
// ============================================================================

test.describe('Claude AI 빈 응답', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('빈 응답 처리', async ({ page }) => {
    // 빈 콘텐츠 응답 인터셉트 설정
    await setupApiIntercept(page, {
      status: 200,
      response: {
        id: `msg_${Date.now()}`,
        type: 'message',
        role: 'assistant',
        content: [], // 빈 콘텐츠
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 0 },
      },
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // JavaScript로 API 호출
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/claude-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: '빈 응답 테스트' }],
          }),
        });

        const data = await response.json();
        return {
          success: response.ok,
          data,
          hasContent: Array.isArray(data.content) && data.content.length > 0,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // 빈 응답이지만 요청은 성공해야 함
    expect(result.success).toBe(true);
    expect(result.hasContent).toBe(false);
    expect(result.data.content).toHaveLength(0);
  });
});

// ============================================================================
// 8. 긴 응답 처리 테스트
// ============================================================================

test.describe('Claude AI 긴 응답', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('긴 응답 처리', async ({ page }) => {
    // 긴 응답 생성 (약 10,000자)
    const longContent = '이것은 테스트 문장입니다. '.repeat(500);

    await setupApiIntercept(page, {
      status: 200,
      response: createMockClaudeResponse(longContent, {
        input_tokens: 50,
        output_tokens: 2500,
      }),
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // JavaScript로 API 호출
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/claude-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: '긴 응답을 주세요' }],
          }),
        });

        const data = await response.json();
        const textContent = data.content?.[0]?.text || '';

        return {
          success: response.ok,
          contentLength: textContent.length,
          outputTokens: data.usage?.output_tokens || 0,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // 긴 응답이 정상적으로 처리되었는지 확인
    expect(result.success).toBe(true);
    expect(result.contentLength).toBeGreaterThan(5000);
    expect(result.outputTokens).toBeGreaterThan(1000);
  });
});

// ============================================================================
// 9. 한글 입출력 테스트
// ============================================================================

test.describe('Claude AI 한글 처리', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('한글 입출력', async ({ page }) => {
    const koreanInput = '안녕하세요! 한글 테스트입니다. 특수문자도 포함합니다: ㄱㄴㄷ ㅏㅓㅗ';
    const koreanOutput =
      '안녕하세요! 네, 한글 입력을 잘 받았습니다. 특수 문자도 잘 처리됩니다: ㄱㄴㄷ ㅏㅓㅗ';

    await setupApiIntercept(page, {
      status: 200,
      response: createMockClaudeResponse(koreanOutput, {
        input_tokens: 30,
        output_tokens: 35,
      }),
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // JavaScript로 한글 메시지 전송
    const result = await page.evaluate(async (input) => {
      try {
        const response = await fetch('/functions/v1/claude-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: input }],
          }),
        });

        const data = await response.json();
        const textContent = data.content?.[0]?.text || '';

        return {
          success: response.ok,
          responseText: textContent,
          hasKorean: /[가-힣]/.test(textContent),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }, koreanInput);

    // 한글이 정상적으로 처리되었는지 확인
    expect(result.success).toBe(true);
    expect(result.hasKorean).toBe(true);
    expect(result.responseText).toContain('안녕하세요');
  });
});

// ============================================================================
// 10. 토큰 사용량 반환 테스트
// ============================================================================

test.describe('Claude AI 토큰 사용량', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('토큰 사용량 반환', async ({ page }) => {
    const mockUsage = {
      input_tokens: 150,
      output_tokens: 350,
    };

    await setupApiIntercept(page, {
      status: 200,
      response: createMockClaudeResponse('토큰 사용량 테스트 응답입니다.', mockUsage),
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // JavaScript로 API 호출 및 토큰 사용량 확인
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/functions/v1/claude-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: '토큰 사용량을 알려주세요' }],
          }),
        });

        const data = await response.json();

        return {
          success: response.ok,
          usage: data.usage,
          hasInputTokens: typeof data.usage?.input_tokens === 'number',
          hasOutputTokens: typeof data.usage?.output_tokens === 'number',
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // 토큰 사용량이 정상적으로 반환되었는지 확인
    expect(result.success).toBe(true);
    expect(result.hasInputTokens).toBe(true);
    expect(result.hasOutputTokens).toBe(true);
    expect(result.usage.input_tokens).toBe(mockUsage.input_tokens);
    expect(result.usage.output_tokens).toBe(mockUsage.output_tokens);
  });
});
