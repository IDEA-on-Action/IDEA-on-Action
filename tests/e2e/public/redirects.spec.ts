import { test, expect } from '@playwright/test';

/**
 * URL 리디렉션 E2E 테스트
 *
 * 테스트 시나리오:
 * - 기존 URL에서 새 URL로 리디렉션 확인
 * - Site Restructure Phase 1의 리디렉션 규칙 검증
 */

test.describe('URL 리디렉션', () => {
  test('/about이 /로 리디렉션됨', async ({ page }) => {
    await page.goto('/about');
    await expect(page).toHaveURL('/');
  });

  test('/roadmap이 /projects?tab=roadmap으로 리디렉션됨', async ({ page }) => {
    await page.goto('/roadmap');
    await expect(page).toHaveURL('/projects?tab=roadmap');
  });

  test('/portfolio가 /projects로 리디렉션됨', async ({ page }) => {
    await page.goto('/portfolio');
    await expect(page).toHaveURL('/projects');
  });

  test('/lab이 /projects?tab=lab으로 리디렉션됨', async ({ page }) => {
    await page.goto('/lab');
    await expect(page).toHaveURL('/projects?tab=lab');
  });

  test('/work-with-us가 /connect/inquiry로 리디렉션됨', async ({ page }) => {
    await page.goto('/work-with-us');
    await expect(page).toHaveURL('/connect/inquiry');
  });

  test('/blog가 /stories/blog로 리디렉션됨', async ({ page }) => {
    await page.goto('/blog');
    await expect(page).toHaveURL('/stories/blog');
  });

  test('/notices가 /stories/notices로 리디렉션됨', async ({ page }) => {
    await page.goto('/notices');
    await expect(page).toHaveURL('/stories/notices');
  });

  test('/community가 /connect/community로 리디렉션됨', async ({ page }) => {
    await page.goto('/community');
    await expect(page).toHaveURL('/connect/community');
  });
});

test.describe('허브 페이지 접근', () => {
  test('/projects 페이지가 정상 로드됨', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL('/projects');

    // 페이지 헤딩 확인
    const heading = page.getByRole('heading', { name: '프로젝트' });
    await expect(heading).toBeVisible();
  });

  test('/stories 페이지가 정상 로드됨', async ({ page }) => {
    await page.goto('/stories');
    await expect(page).toHaveURL('/stories');

    // 페이지 헤딩 확인
    const heading = page.getByRole('heading', { name: '이야기' });
    await expect(heading).toBeVisible();
  });

  test('/connect 페이지가 정상 로드됨', async ({ page }) => {
    await page.goto('/connect');
    await expect(page).toHaveURL('/connect');

    // 페이지 헤딩 확인
    const heading = page.getByRole('heading', { name: '함께하기' });
    await expect(heading).toBeVisible();
  });
});

test.describe('프로젝트 허브 탭 네비게이션', () => {
  test('기본 탭은 in-progress', async ({ page }) => {
    await page.goto('/projects');

    // in-progress 탭이 활성화됨
    const activeTab = page.locator('[data-state="active"]').first();
    await expect(activeTab).toContainText('진행중');
  });

  test('탭 클릭 시 URL 쿼리 파라미터 변경', async ({ page }) => {
    await page.goto('/projects');

    // 로드맵 탭 클릭
    await page.getByRole('tab', { name: '로드맵' }).click();
    await expect(page).toHaveURL('/projects?tab=roadmap');

    // 실험중 탭 클릭
    await page.getByRole('tab', { name: '실험중' }).click();
    await expect(page).toHaveURL('/projects?tab=lab');

    // 출시됨 탭 클릭
    await page.getByRole('tab', { name: '출시됨' }).click();
    await expect(page).toHaveURL('/projects?tab=released');

    // 진행중 탭 클릭
    await page.getByRole('tab', { name: '진행중' }).click();
    await expect(page).toHaveURL('/projects?tab=in-progress');
  });

  test('URL 쿼리 파라미터로 탭 선택 가능', async ({ page }) => {
    // roadmap 탭으로 직접 접근
    await page.goto('/projects?tab=roadmap');

    const activeTab = page.locator('[data-state="active"]').first();
    await expect(activeTab).toContainText('로드맵');
  });

  test('lab 탭으로 직접 접근 가능', async ({ page }) => {
    await page.goto('/projects?tab=lab');

    const activeTab = page.locator('[data-state="active"]').first();
    await expect(activeTab).toContainText('실험중');
  });
});

test.describe('이야기 허브 섹션', () => {
  test('4개 섹션 카드가 표시됨', async ({ page }) => {
    await page.goto('/stories');

    // 4개 섹션 카드 확인
    await expect(page.getByText('블로그')).toBeVisible();
    await expect(page.getByText('뉴스레터')).toBeVisible();
    await expect(page.getByText('변경사항')).toBeVisible();
    await expect(page.getByText('공지사항')).toBeVisible();
  });

  test('블로그 카드 클릭 시 /stories/blog로 이동', async ({ page }) => {
    await page.goto('/stories');

    await page.getByRole('link', { name: /블로그/i }).click();
    await expect(page).toHaveURL('/stories/blog');
  });
});

test.describe('함께하기 허브 섹션', () => {
  test('3개 섹션 카드가 표시됨', async ({ page }) => {
    await page.goto('/connect');

    // 3개 섹션 카드 확인
    await expect(page.getByText('프로젝트 문의')).toBeVisible();
    await expect(page.getByText('채용')).toBeVisible();
    await expect(page.getByText('커뮤니티')).toBeVisible();
  });

  test('프로젝트 문의 카드 클릭 시 /connect/inquiry로 이동', async ({ page }) => {
    await page.goto('/connect');

    await page.getByRole('link', { name: /프로젝트 문의/i }).click();
    await expect(page).toHaveURL('/connect/inquiry');
  });
});
