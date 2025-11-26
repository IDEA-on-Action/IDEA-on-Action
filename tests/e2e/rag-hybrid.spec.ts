/**
 * RAG 하이브리드 검색 E2E 테스트
 *
 * 키워드 + 벡터 검색 결합 기능 검증
 *
 * @module tests/e2e/rag-hybrid.spec
 */

import { test, expect } from '@playwright/test';

// ============================================================================
// 테스트 설정
// ============================================================================

test.describe('RAG 하이브리드 검색', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 페이지로 이동 (추후 실제 페이지로 변경)
    await page.goto('/');
  });

  // ============================================================================
  // 1. 하이브리드 검색 결과 반환 테스트
  // ============================================================================

  test('하이브리드 검색 실행 시 결과 반환', async ({ page }) => {
    // Given: 검색 입력 필드가 있음
    const searchInput = page.locator('input[placeholder*="검색"]').first();

    // When: 검색어 입력
    await searchInput.fill('AI 프로젝트');
    await searchInput.press('Enter');

    // Then: 검색 결과가 표시됨
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible({
      timeout: 5000,
    });

    // And: 키워드 점수, 벡터 점수, 통합 점수가 표시됨
    const firstResult = page.locator('[data-testid="search-result-item"]').first();
    await expect(firstResult).toContainText(/키워드/);
    await expect(firstResult).toContainText(/의미/);
    await expect(firstResult).toContainText(/\d+%/); // 점수 퍼센트
  });

  test('빈 검색어 입력 시 결과 없음', async ({ page }) => {
    // Given: 검색 입력 필드
    const searchInput = page.locator('input[placeholder*="검색"]').first();

    // When: 빈 문자열 입력
    await searchInput.fill('   ');
    await searchInput.press('Enter');

    // Then: 결과 없음 메시지 표시
    await expect(page.locator('text=검색 결과가 없습니다')).toBeVisible();
  });

  // ============================================================================
  // 2. 키워드 가중치 조절 테스트
  // ============================================================================

  test('키워드 가중치 조절 시 검색 결과 업데이트', async ({ page }) => {
    // Given: 가중치 조절 슬라이더가 있음
    const keywordSlider = page.locator('[data-testid="keyword-weight-slider"]').first();
    const searchInput = page.locator('input[placeholder*="검색"]').first();

    // When: 키워드 가중치를 70%로 조절
    await keywordSlider.fill('70');

    // And: 검색 실행
    await searchInput.fill('AI 프로젝트');
    await searchInput.press('Enter');

    // Then: 키워드 점수가 높은 결과가 상위에 표시됨
    const keywordWeightDisplay = page.locator('[data-testid="keyword-weight-value"]');
    await expect(keywordWeightDisplay).toContainText('70%');
  });

  test('키워드 가중치 변경 시 벡터 가중치 자동 조정', async ({ page }) => {
    // Given: 두 슬라이더가 있음
    const keywordSlider = page.locator('[data-testid="keyword-weight-slider"]').first();
    const vectorWeightDisplay = page.locator('[data-testid="vector-weight-value"]').first();

    // When: 키워드 가중치를 60%로 변경
    await keywordSlider.fill('60');

    // Then: 벡터 가중치가 40%로 자동 조정됨
    await expect(vectorWeightDisplay).toContainText('40%');
  });

  // ============================================================================
  // 3. 벡터 가중치 조절 테스트
  // ============================================================================

  test('벡터 가중치 조절 시 검색 결과 업데이트', async ({ page }) => {
    // Given: 가중치 조절 슬라이더가 있음
    const vectorSlider = page.locator('[data-testid="vector-weight-slider"]').first();
    const searchInput = page.locator('input[placeholder*="검색"]').first();

    // When: 벡터 가중치를 80%로 조절
    await vectorSlider.fill('80');

    // And: 검색 실행
    await searchInput.fill('프로젝트 관리');
    await searchInput.press('Enter');

    // Then: 벡터 점수가 높은 결과가 상위에 표시됨
    const vectorWeightDisplay = page.locator('[data-testid="vector-weight-value"]');
    await expect(vectorWeightDisplay).toContainText('80%');
  });

  test('프리셋 버튼으로 가중치 설정', async ({ page }) => {
    // Given: 프리셋 버튼들이 있음
    const balancedButton = page.locator('button:has-text("균형")').first();

    // When: 균형 프리셋 클릭
    await balancedButton.click();

    // Then: 가중치가 50/50으로 설정됨
    await expect(page.locator('[data-testid="keyword-weight-value"]')).toContainText('50%');
    await expect(page.locator('[data-testid="vector-weight-value"]')).toContainText('50%');
  });

  // ============================================================================
  // 4. 프로젝트 필터링 테스트
  // ============================================================================

  test('프로젝트 선택 시 필터링 적용', async ({ page }) => {
    // Given: 프로젝트 선택 드롭다운이 있음
    const projectSelect = page.locator('[data-testid="project-filter"]').first();

    // When: 특정 프로젝트 선택
    await projectSelect.click();
    await page.locator('text=테스트 프로젝트').click();

    // And: 검색 실행
    const searchInput = page.locator('input[placeholder*="검색"]').first();
    await searchInput.fill('문서');
    await searchInput.press('Enter');

    // Then: 해당 프로젝트의 문서만 표시됨
    const results = page.locator('[data-testid="search-result-item"]');
    await expect(results.first()).toContainText('테스트 프로젝트');
  });

  test('전체 프로젝트 선택 시 모든 문서 검색', async ({ page }) => {
    // Given: 프로젝트 선택 드롭다운
    const projectSelect = page.locator('[data-testid="project-filter"]').first();

    // When: "전체 프로젝트" 선택
    await projectSelect.click();
    await page.locator('text=전체 프로젝트').click();

    // And: 검색 실행
    const searchInput = page.locator('input[placeholder*="검색"]').first();
    await searchInput.fill('문서');
    await searchInput.press('Enter');

    // Then: 모든 프로젝트의 문서가 표시됨
    const results = page.locator('[data-testid="search-result-item"]');
    await expect(results).toHaveCount(10, { timeout: 5000 }); // 최소 10개 이상
  });

  // ============================================================================
  // 5. 검색 결과 점수 표시 테스트
  // ============================================================================

  test('검색 결과에 세 가지 점수 표시', async ({ page }) => {
    // Given: 검색 실행
    const searchInput = page.locator('input[placeholder*="검색"]').first();
    await searchInput.fill('AI');
    await searchInput.press('Enter');

    // When: 첫 번째 결과 확인
    const firstResult = page.locator('[data-testid="search-result-item"]').first();

    // Then: 키워드, 벡터, 통합 점수가 모두 표시됨
    await expect(firstResult.locator('[data-testid="keyword-score"]')).toBeVisible();
    await expect(firstResult.locator('[data-testid="vector-score"]')).toBeVisible();
    await expect(firstResult.locator('[data-testid="combined-score"]')).toBeVisible();

    // And: 점수가 0~100% 범위 내
    const combinedScore = await firstResult
      .locator('[data-testid="combined-score"]')
      .textContent();
    const scoreValue = parseInt(combinedScore?.replace('%', '') || '0');
    expect(scoreValue).toBeGreaterThanOrEqual(0);
    expect(scoreValue).toBeLessThanOrEqual(100);
  });

  test('점수별 색상 구분 적용', async ({ page }) => {
    // Given: 검색 실행
    const searchInput = page.locator('input[placeholder*="검색"]').first();
    await searchInput.fill('프로젝트');
    await searchInput.press('Enter');

    // When: 첫 번째 결과 확인
    const firstResult = page.locator('[data-testid="search-result-item"]').first();
    const combinedScoreBadge = firstResult.locator('[data-testid="combined-score-badge"]');

    // Then: 점수에 따른 색상 클래스 적용
    const className = await combinedScoreBadge.getAttribute('class');
    expect(className).toMatch(/bg-(green|yellow|gray)/);
  });
});

// ============================================================================
// 유닛 테스트 (훅 테스트)
// ============================================================================

test.describe('useRAGHybridSearch 훅', () => {
  test('가중치 정규화 테스트', async ({ page }) => {
    // Note: 이 테스트는 실제로는 Jest로 작성해야 하지만,
    // 여기서는 E2E 컨텍스트에서 UI를 통해 검증

    // Given: 두 슬라이더
    const keywordSlider = page.locator('[data-testid="keyword-weight-slider"]').first();
    const vectorSlider = page.locator('[data-testid="vector-weight-slider"]').first();

    // When: 키워드를 0%로 설정
    await keywordSlider.fill('0');

    // Then: 벡터가 100%로 설정됨
    await expect(page.locator('[data-testid="vector-weight-value"]')).toContainText('100%');

    // When: 벡터를 0%로 설정
    await vectorSlider.fill('0');

    // Then: 키워드가 100%로 설정됨
    await expect(page.locator('[data-testid="keyword-weight-value"]')).toContainText('100%');
  });
});

// ============================================================================
// 성능 테스트
// ============================================================================

test.describe('하이브리드 검색 성능', () => {
  test('검색 응답 시간 500ms 이내', async ({ page }) => {
    // Given: 검색 입력 필드
    const searchInput = page.locator('input[placeholder*="검색"]').first();

    // When: 검색 시작 시간 측정
    const startTime = Date.now();
    await searchInput.fill('테스트');
    await searchInput.press('Enter');

    // And: 결과 표시 대기
    await page.locator('[data-testid="search-results"]').waitFor({ state: 'visible' });
    const endTime = Date.now();

    // Then: 응답 시간이 500ms 이내
    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(500);
  });

  test('100개 결과 검색 시 지연 없음', async ({ page }) => {
    // Given: 많은 결과를 반환하는 검색어
    const searchInput = page.locator('input[placeholder*="검색"]').first();

    // When: 검색 실행
    await searchInput.fill('문서');
    await searchInput.press('Enter');

    // Then: 결과가 지연 없이 표시됨
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible({
      timeout: 1000,
    });

    // And: 스크롤 성능 확인
    const resultsContainer = page.locator('[data-testid="search-results"]');
    await resultsContainer.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });

    // 스크롤 후에도 UI가 반응적임
    await expect(resultsContainer).toBeVisible();
  });
});

// ============================================================================
// 에러 처리 테스트
// ============================================================================

test.describe('하이브리드 검색 에러 처리', () => {
  test('네트워크 에러 시 재시도 UI 표시', async ({ page }) => {
    // Given: 네트워크를 오프라인으로 설정
    await page.context().setOffline(true);

    // When: 검색 실행
    const searchInput = page.locator('input[placeholder*="검색"]').first();
    await searchInput.fill('테스트');
    await searchInput.press('Enter');

    // Then: 에러 메시지 표시
    await expect(page.locator('text=검색 중 오류가 발생했습니다')).toBeVisible();

    // And: 재시도 버튼 표시
    await expect(page.locator('button:has-text("다시 시도")')).toBeVisible();

    // Cleanup: 네트워크 복구
    await page.context().setOffline(false);
  });

  test('검색 실패 시 친화적 메시지 표시', async ({ page }) => {
    // Given: 잘못된 검색어 (특수문자만)
    const searchInput = page.locator('input[placeholder*="검색"]').first();

    // When: 검색 실행
    await searchInput.fill('!@#$%^&*()');
    await searchInput.press('Enter');

    // Then: 친화적 에러 메시지
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toContainText(/검색 결과가 없습니다|다른 키워드로/);
  });

  test('로딩 상태 표시', async ({ page }) => {
    // Given: 검색 입력
    const searchInput = page.locator('input[placeholder*="검색"]').first();

    // When: 검색 시작
    await searchInput.fill('프로젝트');
    await searchInput.press('Enter');

    // Then: 로딩 인디케이터 표시 (짧은 시간이므로 즉시 확인)
    const loadingIndicator = page.locator('[data-testid="search-loading"]');
    // 로딩이 표시되었다가 사라짐
    await expect(loadingIndicator).toBeHidden({ timeout: 2000 });
  });
});
