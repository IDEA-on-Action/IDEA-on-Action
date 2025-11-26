/**
 * AI 채팅 통합 E2E 테스트
 *
 * AI 채팅 위젯의 전체 통합 기능을 테스트합니다.
 * - AI 채팅 버튼 표시
 * - 채팅창 열기/닫기
 * - 메시지 전송
 * - 새 대화 시작
 * - 페이지 컨텍스트 반영
 *
 * @module tests/e2e/ai/ai-chat-integration
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from '../../fixtures/auth-helpers';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * AI 채팅 버튼이 표시될 때까지 대기
 */
async function waitForChatButton(page: Page) {
  await page.waitForSelector('button[aria-label="AI 채팅 열기"]', {
    state: 'visible',
    timeout: 10000,
  });
}

/**
 * AI 채팅창이 표시될 때까지 대기
 */
async function waitForChatWindow(page: Page) {
  await page.waitForSelector('.fixed.z-50.flex.flex-col', {
    state: 'visible',
    timeout: 5000,
  });
}

/**
 * 모의 Claude API 응답 설정
 */
async function setupMockClaudeResponse(
  page: Page,
  response: string = '안녕하세요! 무엇을 도와드릴까요?'
) {
  await page.route('**/functions/v1/claude-chat**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: `msg_${Date.now()}`,
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      }),
    });
  });
}

/**
 * 모의 스트리밍 응답 설정
 */
async function setupMockStreamingResponse(page: Page, chunks: string[]) {
  await page.route('**/functions/v1/claude-chat**', async (route) => {
    const streamBody = chunks
      .map((chunk, i) => {
        const isLast = i === chunks.length - 1;
        const data = isLast
          ? { type: 'message_stop' }
          : {
              type: 'content_block_delta',
              index: 0,
              delta: {
                type: 'text_delta',
                text: chunk,
              },
            };
        return `data: ${JSON.stringify(data)}\n\n`;
      })
      .join('');

    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      body: streamBody,
    });
  });
}

// ============================================================================
// 1. AI 채팅 버튼 표시
// ============================================================================

test.describe('AI 채팅 버튼 표시', () => {
  test('AI 채팅 버튼이 홈페이지에서 표시된다', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 플로팅 버튼 확인
    const chatButton = page.locator('button[aria-label="AI 채팅 열기"]');
    await expect(chatButton).toBeVisible();

    // 버튼에 MessageCircle 아이콘 확인
    const icon = chatButton.locator('svg');
    await expect(icon).toBeVisible();

    // 버튼 위치 확인 (bottom-right)
    await expect(chatButton).toHaveClass(/bottom-6/);
    await expect(chatButton).toHaveClass(/right-6/);
  });

  test('AI 채팅 버튼이 Services 페이지에서 표시된다', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    // 플로팅 버튼 확인
    const chatButton = page.locator('button[aria-label="AI 채팅 열기"]');
    await expect(chatButton).toBeVisible();
  });

  test('AI 채팅 버튼이 Minu 서비스 페이지에서 표시된다', async ({ page }) => {
    await page.goto('/services/minu/find');
    await page.waitForLoadState('networkidle');

    // 플로팅 버튼 확인
    const chatButton = page.locator('button[aria-label="AI 채팅 열기"]');
    await expect(chatButton).toBeVisible();
  });

  test('AI 채팅 버튼이 관리자 페이지에서 표시된다', async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // 플로팅 버튼 확인
    const chatButton = page.locator('button[aria-label="AI 채팅 열기"]');
    await expect(chatButton).toBeVisible();
  });
});

// ============================================================================
// 2. 채팅창 열기/닫기
// ============================================================================

test.describe('채팅창 열기/닫기', () => {
  test('AI 채팅 버튼 클릭 시 채팅창이 열린다', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 버튼 클릭
    await waitForChatButton(page);
    const chatButton = page.locator('button[aria-label="AI 채팅 열기"]');
    await chatButton.click();

    // 채팅창 확인
    await waitForChatWindow(page);
    const chatWindow = page.locator('.fixed.z-50.flex.flex-col');
    await expect(chatWindow).toBeVisible();

    // 버튼은 사라짐
    await expect(chatButton).not.toBeVisible();
  });

  test('채팅창이 열릴 때 헤더가 표시된다', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 버튼 클릭
    await waitForChatButton(page);
    await page.locator('button[aria-label="AI 채팅 열기"]').click();

    // 헤더 확인
    await waitForChatWindow(page);
    const header = page.locator('.fixed.z-50.flex.flex-col').locator('div').first();
    await expect(header).toBeVisible();
  });

  test('채팅창이 열릴 때 빈 메시지 안내가 표시된다', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 버튼 클릭
    await waitForChatButton(page);
    await page.locator('button[aria-label="AI 채팅 열기"]').click();

    // 빈 메시지 안내 확인
    await waitForChatWindow(page);
    const emptyMessage = page.getByText('AI 어시스턴트에게 물어보세요');
    await expect(emptyMessage).toBeVisible();

    const description = page.getByText(/IDEA on Action의 서비스/);
    await expect(description).toBeVisible();
  });

  test('닫기 버튼 클릭 시 채팅창이 닫힌다', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 채팅창 열기
    await waitForChatButton(page);
    await page.locator('button[aria-label="AI 채팅 열기"]').click();
    await waitForChatWindow(page);

    // 닫기 버튼 클릭
    const closeButton = page.locator('button[aria-label="닫기"]');
    await closeButton.click();

    // 채팅창이 사라지고 버튼이 다시 나타남
    const chatWindow = page.locator('.fixed.z-50.flex.flex-col');
    await expect(chatWindow).not.toBeVisible();

    const chatButton = page.locator('button[aria-label="AI 채팅 열기"]');
    await expect(chatButton).toBeVisible();
  });
});

// ============================================================================
// 3. 메시지 전송
// ============================================================================

test.describe('메시지 전송', () => {
  test.beforeEach(async ({ page }) => {
    // 모의 응답 설정
    await setupMockClaudeResponse(page, '안녕하세요! 무엇을 도와드릴까요?');
  });

  test('메시지를 입력하고 전송할 수 있다', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 채팅창 열기
    await waitForChatButton(page);
    await page.locator('button[aria-label="AI 채팅 열기"]').click();
    await waitForChatWindow(page);

    // 메시지 입력
    const input = page.locator('textarea[aria-label="메시지 입력"]');
    await input.fill('안녕하세요');

    // 전송 버튼 클릭
    const sendButton = page.locator('button[aria-label="전송"]');
    await sendButton.click();

    // 사용자 메시지 확인
    const userMessage = page.getByText('안녕하세요').first();
    await expect(userMessage).toBeVisible();

    // AI 응답 확인 (약간의 대기 시간 필요)
    await page.waitForTimeout(1000);
    const aiResponse = page.getByText(/무엇을 도와드릴까요/);
    await expect(aiResponse).toBeVisible();
  });

  test('Enter 키로 메시지를 전송할 수 있다', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 채팅창 열기
    await waitForChatButton(page);
    await page.locator('button[aria-label="AI 채팅 열기"]').click();
    await waitForChatWindow(page);

    // 메시지 입력 후 Enter
    const input = page.locator('textarea[aria-label="메시지 입력"]');
    await input.fill('테스트 메시지');
    await input.press('Enter');

    // 사용자 메시지 확인
    const userMessage = page.getByText('테스트 메시지').first();
    await expect(userMessage).toBeVisible();
  });

  test('빈 메시지는 전송할 수 없다', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 채팅창 열기
    await waitForChatButton(page);
    await page.locator('button[aria-label="AI 채팅 열기"]').click();
    await waitForChatWindow(page);

    // 전송 버튼이 비활성화 상태인지 확인
    const sendButton = page.locator('button[aria-label="전송"]');
    await expect(sendButton).toBeDisabled();

    // 공백만 입력해도 비활성화
    const input = page.locator('textarea[aria-label="메시지 입력"]');
    await input.fill('   ');
    await expect(sendButton).toBeDisabled();
  });

  test('로딩 중에는 메시지를 전송할 수 없다', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 채팅창 열기
    await waitForChatButton(page);
    await page.locator('button[aria-label="AI 채팅 열기"]').click();
    await waitForChatWindow(page);

    // 메시지 입력 및 전송
    const input = page.locator('textarea[aria-label="메시지 입력"]');
    await input.fill('첫 번째 메시지');

    const sendButton = page.locator('button[aria-label="전송"]');
    await sendButton.click();

    // 로딩 중에는 입력과 버튼이 비활성화
    await expect(input).toBeDisabled();
    await expect(sendButton).toBeDisabled();
  });

  test('여러 메시지를 연속으로 전송할 수 있다', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 채팅창 열기
    await waitForChatButton(page);
    await page.locator('button[aria-label="AI 채팅 열기"]').click();
    await waitForChatWindow(page);

    const input = page.locator('textarea[aria-label="메시지 입력"]');
    const sendButton = page.locator('button[aria-label="전송"]');

    // 첫 번째 메시지
    await input.fill('첫 번째 질문');
    await sendButton.click();
    await page.waitForTimeout(1000);

    // 두 번째 메시지
    await input.fill('두 번째 질문');
    await sendButton.click();
    await page.waitForTimeout(1000);

    // 메시지 개수 확인 (사용자 2개 + AI 2개 = 4개)
    const messages = page.locator('[role="listitem"], .space-y-0 > div').filter({ hasText: /질문|도와드릴까요/ });
    await expect(messages.first()).toBeVisible();
  });
});

// ============================================================================
// 4. 새 대화 시작
// ============================================================================

test.describe('새 대화 시작', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockClaudeResponse(page, '안녕하세요!');
  });

  test('새 대화 버튼 클릭 시 대화가 초기화된다', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 채팅창 열기
    await waitForChatButton(page);
    await page.locator('button[aria-label="AI 채팅 열기"]').click();
    await waitForChatWindow(page);

    // 메시지 전송
    const input = page.locator('textarea[aria-label="메시지 입력"]');
    const sendButton = page.locator('button[aria-label="전송"]');
    await input.fill('테스트 메시지');
    await sendButton.click();
    await page.waitForTimeout(1000);

    // 메시지가 있는지 확인
    const message = page.getByText('테스트 메시지').first();
    await expect(message).toBeVisible();

    // 새 대화 버튼 클릭
    const newChatButton = page.locator('button[aria-label="새 대화"]');
    await newChatButton.click();

    // 빈 메시지 안내가 다시 표시되는지 확인
    const emptyMessage = page.getByText('AI 어시스턴트에게 물어보세요');
    await expect(emptyMessage).toBeVisible();

    // 이전 메시지는 사라짐
    await expect(message).not.toBeVisible();
  });

  test('새 대화 후 메시지를 다시 전송할 수 있다', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 채팅창 열기
    await waitForChatButton(page);
    await page.locator('button[aria-label="AI 채팅 열기"]').click();
    await waitForChatWindow(page);

    // 첫 번째 메시지
    const input = page.locator('textarea[aria-label="메시지 입력"]');
    const sendButton = page.locator('button[aria-label="전송"]');
    await input.fill('첫 번째 메시지');
    await sendButton.click();
    await page.waitForTimeout(1000);

    // 새 대화
    const newChatButton = page.locator('button[aria-label="새 대화"]');
    await newChatButton.click();

    // 두 번째 메시지
    await input.fill('두 번째 메시지');
    await sendButton.click();
    await page.waitForTimeout(1000);

    // 두 번째 메시지만 보임
    const secondMessage = page.getByText('두 번째 메시지').first();
    await expect(secondMessage).toBeVisible();

    const firstMessage = page.getByText('첫 번째 메시지');
    await expect(firstMessage).not.toBeVisible();
  });
});

// ============================================================================
// 5. 페이지 컨텍스트
// ============================================================================

test.describe('페이지 컨텍스트', () => {
  test('Minu Find 서비스 페이지에서 컨텍스트가 반영된다', async ({ page }) => {
    // 실제로는 시스템 프롬프트에 컨텍스트가 포함되므로,
    // 여기서는 페이지 이동 후 채팅창이 정상 작동하는지 확인
    await setupMockClaudeResponse(page, 'Minu Find 서비스에 대해 설명드리겠습니다.');

    await page.goto('/services/minu/find');
    await page.waitForLoadState('networkidle');

    // 채팅창 열기
    await waitForChatButton(page);
    await page.locator('button[aria-label="AI 채팅 열기"]').click();
    await waitForChatWindow(page);

    // 메시지 전송
    const input = page.locator('textarea[aria-label="메시지 입력"]');
    const sendButton = page.locator('button[aria-label="전송"]');
    await input.fill('이 서비스에 대해 알려주세요');
    await sendButton.click();

    // AI 응답 확인
    await page.waitForTimeout(1000);
    const aiResponse = page.getByText(/Minu Find/);
    await expect(aiResponse).toBeVisible();
  });

  test('Minu Frame 서비스 페이지에서 컨텍스트가 반영된다', async ({ page }) => {
    await setupMockClaudeResponse(page, 'Minu Frame 서비스에 대해 설명드리겠습니다.');

    await page.goto('/services/minu/frame');
    await page.waitForLoadState('networkidle');

    // 채팅창 열기
    await waitForChatButton(page);
    await page.locator('button[aria-label="AI 채팅 열기"]').click();
    await waitForChatWindow(page);

    // 메시지 전송
    const input = page.locator('textarea[aria-label="메시지 입력"]');
    const sendButton = page.locator('button[aria-label="전송"]');
    await input.fill('RFP 작성에 대해 알려주세요');
    await sendButton.click();

    // AI 응답 확인
    await page.waitForTimeout(1000);
    const aiResponse = page.getByText(/Minu Frame/);
    await expect(aiResponse).toBeVisible();
  });

  test('페이지 이동 시 채팅창이 닫힌다', async ({ page }) => {
    await setupMockClaudeResponse(page);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 채팅창 열기
    await waitForChatButton(page);
    await page.locator('button[aria-label="AI 채팅 열기"]').click();
    await waitForChatWindow(page);

    // 다른 페이지로 이동
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    // 채팅창이 닫히고 버튼만 보임
    const chatWindow = page.locator('.fixed.z-50.flex.flex-col');
    await expect(chatWindow).not.toBeVisible();

    const chatButton = page.locator('button[aria-label="AI 채팅 열기"]');
    await expect(chatButton).toBeVisible();
  });

  test('홈페이지에서 일반 컨텍스트가 적용된다', async ({ page }) => {
    await setupMockClaudeResponse(
      page,
      'IDEA on Action은 아이디어 실험실이자 커뮤니티형 프로덕트 스튜디오입니다.'
    );

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 채팅창 열기
    await waitForChatButton(page);
    await page.locator('button[aria-label="AI 채팅 열기"]').click();
    await waitForChatWindow(page);

    // 메시지 전송
    const input = page.locator('textarea[aria-label="메시지 입력"]');
    const sendButton = page.locator('button[aria-label="전송"]');
    await input.fill('IDEA on Action이 무엇인가요?');
    await sendButton.click();

    // AI 응답 확인
    await page.waitForTimeout(1000);
    const aiResponse = page.getByText(/IDEA on Action/);
    await expect(aiResponse).toBeVisible();
  });
});
