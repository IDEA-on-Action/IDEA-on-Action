/**
 * E2E 테스트: 프롬프트 템플릿 관리
 *
 * 프롬프트 템플릿 CRUD 및 TemplateEditor 컴포넌트 검증
 * - 템플릿 목록 조회 및 필터링
 * - 신규 템플릿 생성 및 편집
 * - 변수 동적 추가/제거
 * - 프롬프트 미리보기
 * - 공개/비공개 토글
 *
 * @module tests/e2e/admin/prompt-templates
 */

import { test, expect } from '@playwright/test';

// ============================================================================
// 테스트 설정
// ============================================================================

test.describe('프롬프트 템플릿 관리', () => {
  // 각 테스트 전에 Admin 로그인
  test.beforeEach(async ({ page }) => {
    // Admin 로그인 페이지로 이동
    await page.goto('/admin/login');

    // 로그인 폼 입력 (환경 변수에서 관리자 계정 정보 가져오기)
    await page.fill('input[type="email"]', process.env.TEST_ADMIN_EMAIL || 'admin@ideaonaction.ai');
    await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || 'admin123');

    // 로그인 버튼 클릭
    await page.click('button[type="submit"]');

    // 대시보드로 리다이렉트 대기
    await page.waitForURL('/admin/dashboard', { timeout: 10000 });
  });

  // ============================================================================
  // 테스트 케이스 1: 템플릿 목록 페이지 로드
  // ============================================================================

  test('TC-001: 템플릿 목록 페이지가 정상적으로 로드된다', async ({ page }) => {
    // 프롬프트 템플릿 페이지로 이동
    await page.goto('/admin/prompt-templates');

    // 페이지 제목 확인
    await expect(page.locator('h1')).toContainText('프롬프트 템플릿');

    // 템플릿 테이블이 표시되는지 확인
    await expect(page.locator('table')).toBeVisible();

    // 필터 UI 확인
    await expect(page.getByTestId('search-input')).toBeVisible();
    await expect(page.getByTestId('category-filter')).toBeVisible();
  });

  // ============================================================================
  // 테스트 케이스 2: 검색 필터 동작
  // ============================================================================

  test('TC-002: 검색 필터가 정상 작동한다', async ({ page }) => {
    await page.goto('/admin/prompt-templates');

    // 검색어 입력
    const searchInput = page.getByTestId('search-input');
    await searchInput.fill('RFP');

    // 디바운스 대기 (300ms)
    await page.waitForTimeout(500);

    // 검색 결과에 'RFP'가 포함된 템플릿만 표시되는지 확인
    const templateNames = page.locator('table tbody tr td:first-child');
    const count = await templateNames.count();

    for (let i = 0; i < count; i++) {
      const text = await templateNames.nth(i).textContent();
      expect(text?.toLowerCase()).toContain('rfp');
    }
  });

  // ============================================================================
  // 테스트 케이스 3: 카테고리 필터 동작
  // ============================================================================

  test('TC-003: 카테고리 필터가 정상 작동한다', async ({ page }) => {
    await page.goto('/admin/prompt-templates');

    // 카테고리 필터 선택
    const categoryFilter = page.getByTestId('category-filter');
    await categoryFilter.click();
    await page.getByRole('option', { name: 'RFP 생성' }).click();

    // 필터링된 결과 대기
    await page.waitForTimeout(500);

    // 'rfp' 카테고리만 표시되는지 확인
    const categoryBadges = page.locator('table tbody tr td:nth-child(3)');
    const count = await categoryBadges.count();

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const text = await categoryBadges.nth(i).textContent();
        expect(text?.toLowerCase()).toContain('rfp');
      }
    }
  });

  // ============================================================================
  // 테스트 케이스 4: 신규 템플릿 생성
  // ============================================================================

  test('TC-004: 신규 템플릿을 생성할 수 있다', async ({ page }) => {
    await page.goto('/admin/prompt-templates');

    // 신규 생성 버튼 클릭
    await page.click('button:has-text("새 템플릿")');

    // 생성 모달 또는 폼 표시 확인
    await expect(page.getByTestId('template-form')).toBeVisible();

    // 템플릿 정보 입력
    await page.fill('input[name="name"]', 'E2E 테스트 템플릿');
    await page.fill('textarea[name="description"]', 'E2E 테스트용 템플릿입니다.');

    // 카테고리 선택
    await page.click('select[name="category"]');
    await page.selectOption('select[name="category"]', 'custom');

    // 프롬프트 입력
    await page.fill('textarea[name="system_prompt"]', '당신은 E2E 테스트 어시스턴트입니다.');
    await page.fill('textarea[name="user_prompt_template"]', '{{input}}에 대해 설명해주세요.');

    // 저장 버튼 클릭
    await page.click('button[type="submit"]');

    // 성공 토스트 확인
    await expect(page.locator('.sonner-toast')).toContainText('생성되었습니다');

    // 목록으로 돌아가서 새 템플릿 확인
    await expect(page.locator('table tbody')).toContainText('E2E 테스트 템플릿');
  });

  // ============================================================================
  // 테스트 케이스 5: 템플릿 수정
  // ============================================================================

  test('TC-005: 기존 템플릿을 수정할 수 있다', async ({ page }) => {
    await page.goto('/admin/prompt-templates');

    // 첫 번째 템플릿의 수정 버튼 클릭
    await page.click('table tbody tr:first-child button:has-text("수정")');

    // 수정 폼 표시 확인
    await expect(page.getByTestId('template-form')).toBeVisible();

    // 템플릿명 수정
    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill('수정된 템플릿명');

    // 저장 버튼 클릭
    await page.click('button[type="submit"]');

    // 성공 토스트 확인
    await expect(page.locator('.sonner-toast')).toContainText('수정되었습니다');

    // 목록에서 수정된 템플릿명 확인
    await expect(page.locator('table tbody')).toContainText('수정된 템플릿명');
  });

  // ============================================================================
  // 테스트 케이스 6: 템플릿 삭제
  // ============================================================================

  test('TC-006: 템플릿을 삭제할 수 있다', async ({ page }) => {
    await page.goto('/admin/prompt-templates');

    // 삭제할 템플릿명 저장
    const firstTemplateName = await page.locator('table tbody tr:first-child td:first-child').textContent();

    // 삭제 버튼 클릭
    await page.click('table tbody tr:first-child button:has-text("삭제")');

    // 확인 다이얼로그 대기
    await expect(page.getByRole('alertdialog')).toBeVisible();

    // 삭제 확인 버튼 클릭
    await page.click('button:has-text("삭제 확인")');

    // 성공 토스트 확인
    await expect(page.locator('.sonner-toast')).toContainText('삭제되었습니다');

    // 목록에서 삭제된 템플릿이 사라졌는지 확인
    if (firstTemplateName) {
      await expect(page.locator('table tbody')).not.toContainText(firstTemplateName);
    }
  });

  // ============================================================================
  // 테스트 케이스 7: 변수 동적 추가/제거
  // ============================================================================

  test('TC-007: 템플릿 변수를 동적으로 추가/제거할 수 있다', async ({ page }) => {
    await page.goto('/admin/prompt-templates');

    // 신규 생성 모드로 진입
    await page.click('button:has-text("새 템플릿")');

    // 변수 추가 버튼 클릭
    await page.click('button:has-text("변수 추가")');

    // 변수 입력 필드 표시 확인
    await expect(page.getByTestId('variable-input-0')).toBeVisible();

    // 변수 정보 입력
    await page.fill('input[name="variables.0.name"]', 'projectName');
    await page.fill('input[name="variables.0.description"]', '프로젝트명');
    await page.check('input[name="variables.0.required"]');

    // 변수 추가 (2번째)
    await page.click('button:has-text("변수 추가")');
    await expect(page.getByTestId('variable-input-1')).toBeVisible();

    // 첫 번째 변수 제거 버튼 클릭
    await page.click('[data-testid="variable-input-0"] button:has-text("제거")');

    // 첫 번째 변수가 제거되었는지 확인
    await expect(page.getByTestId('variable-input-0')).not.toBeVisible();
  });

  // ============================================================================
  // 테스트 케이스 8: 프롬프트 미리보기
  // ============================================================================

  test('TC-008: 프롬프트 미리보기가 정상 작동한다', async ({ page }) => {
    await page.goto('/admin/prompt-templates');

    // PromptTemplateSelector 컴포넌트가 있는 페이지로 이동 (예: AI 채팅 페이지)
    await page.goto('/ai/chat');

    // 템플릿 선택
    await page.click('[data-testid="template-selector"]');
    await page.click('[data-testid="template-item-system-template-1"]');

    // 변수 폼이 표시되는지 확인
    await expect(page.getByTestId('variable-form')).toBeVisible();

    // 변수 값 입력
    await page.fill('[data-testid="variable-input-projectName"]', '스마트시티 구축');

    // 미리보기 버튼 클릭
    await page.click('[data-testid="preview-toggle"]');

    // 미리보기 다이얼로그 표시 확인
    await expect(page.getByTestId('preview-dialog')).toBeVisible();

    // 미리보기 텍스트에 변수가 치환되었는지 확인
    const previewText = await page.getByTestId('preview-text').textContent();
    expect(previewText).toContain('스마트시티 구축');

    // 닫기 버튼 클릭
    await page.click('[data-testid="preview-close"]');

    // 다이얼로그가 닫혔는지 확인
    await expect(page.getByTestId('preview-dialog')).not.toBeVisible();
  });

  // ============================================================================
  // 테스트 케이스 9: 공개/비공개 토글
  // ============================================================================

  test('TC-009: 템플릿 공개/비공개를 토글할 수 있다', async ({ page }) => {
    await page.goto('/admin/prompt-templates');

    // 첫 번째 템플릿의 공개 토글 버튼 클릭
    const toggleButton = page.locator('table tbody tr:first-child [data-testid="public-toggle"]');
    const initialState = await toggleButton.getAttribute('aria-checked');

    // 토글 클릭
    await toggleButton.click();

    // 성공 토스트 확인
    await expect(page.locator('.sonner-toast')).toContainText('업데이트되었습니다');

    // 상태가 변경되었는지 확인
    const newState = await toggleButton.getAttribute('aria-checked');
    expect(newState).not.toBe(initialState);
  });

  // ============================================================================
  // 테스트 케이스 10: 페이지네이션 동작
  // ============================================================================

  test('TC-010: 페이지네이션이 정상 작동한다', async ({ page }) => {
    await page.goto('/admin/prompt-templates');

    // 페이지네이션 컨트롤 확인
    const pagination = page.getByTestId('pagination');
    await expect(pagination).toBeVisible();

    // 현재 페이지 확인
    const currentPage = await page.getByTestId('current-page').textContent();
    expect(currentPage).toBe('1');

    // 다음 페이지 버튼 클릭
    await page.click('button:has-text("다음")');

    // 페이지 변경 대기
    await page.waitForTimeout(500);

    // 페이지 번호 확인
    const nextPage = await page.getByTestId('current-page').textContent();
    expect(nextPage).toBe('2');

    // URL 파라미터 확인
    expect(page.url()).toContain('page=2');

    // 이전 페이지 버튼 클릭
    await page.click('button:has-text("이전")');

    // 페이지가 1로 돌아갔는지 확인
    await page.waitForTimeout(500);
    const backToFirstPage = await page.getByTestId('current-page').textContent();
    expect(backToFirstPage).toBe('1');
  });
});
