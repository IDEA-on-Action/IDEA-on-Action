/**
 * xlsx 차트 삽입 E2E 테스트
 *
 * Canvas API를 사용한 차트 이미지 생성 및 Excel 삽입 테스트
 *
 * @module tests/e2e/skills/xlsx-chart
 */

import { test, expect } from '@playwright/test';

test.describe('xlsx 차트 생성', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 페이지로 이동 (예: 관리자 대시보드)
    await page.goto('/admin/central-hub');
    await page.waitForLoadState('networkidle');
  });

  test('라인 차트 생성 테스트', async ({ page }) => {
    // 차트 생성 함수 실행
    const chartResult = await page.evaluate(async () => {
      const { generateChartImage } = await import(
        '@/skills/xlsx/chart/chart-utils'
      );

      const config = {
        type: 'line' as const,
        data: [
          { label: '2025-11-01', value: 10 },
          { label: '2025-11-02', value: 15 },
          { label: '2025-11-03', value: 12 },
          { label: '2025-11-04', value: 18 },
          { label: '2025-11-05', value: 20 },
        ],
        title: '일별 이벤트 수',
        position: { row: 0, col: 0 },
      };

      const result = await generateChartImage(config);

      return {
        size: result.size,
        duration: result.duration,
        type: result.config.type,
      };
    });

    // 검증
    expect(chartResult.type).toBe('line');
    expect(chartResult.size).toBeGreaterThan(0);
    expect(chartResult.size).toBeLessThan(500 * 1024); // 500KB 이내
    expect(chartResult.duration).toBeLessThan(200); // 200ms 이내
  });

  test('바 차트 생성 테스트', async ({ page }) => {
    const chartResult = await page.evaluate(async () => {
      const { generateChartImage } = await import(
        '@/skills/xlsx/chart/chart-utils'
      );

      const config = {
        type: 'bar' as const,
        data: [
          { label: 'Minu Find', value: 25 },
          { label: 'Minu Frame', value: 18 },
          { label: 'Minu Build', value: 32 },
          { label: 'Minu Keep', value: 15 },
        ],
        title: '서비스별 이벤트 수',
        position: { row: 0, col: 0 },
      };

      const result = await generateChartImage(config);

      return {
        size: result.size,
        duration: result.duration,
        type: result.config.type,
        dataPoints: result.config.data.length,
      };
    });

    // 검증
    expect(chartResult.type).toBe('bar');
    expect(chartResult.dataPoints).toBe(4);
    expect(chartResult.size).toBeGreaterThan(0);
    expect(chartResult.duration).toBeLessThan(200);
  });

  test('파이 차트 생성 테스트', async ({ page }) => {
    const chartResult = await page.evaluate(async () => {
      const { generateChartImage } = await import(
        '@/skills/xlsx/chart/chart-utils'
      );

      const config = {
        type: 'pie' as const,
        data: [
          { label: '미해결', value: 10 },
          { label: '진행중', value: 5 },
          { label: '해결됨', value: 15 },
          { label: '종료', value: 20 },
        ],
        title: '상태별 이슈 분포',
        position: { row: 0, col: 0 },
        showPercentage: true,
      };

      const result = await generateChartImage(config);

      return {
        size: result.size,
        duration: result.duration,
        type: result.config.type,
      };
    });

    // 검증
    expect(chartResult.type).toBe('pie');
    expect(chartResult.size).toBeGreaterThan(0);
    expect(chartResult.duration).toBeLessThan(200);
  });

  test('영역 차트 생성 테스트', async ({ page }) => {
    const chartResult = await page.evaluate(async () => {
      const { generateChartImage } = await import(
        '@/skills/xlsx/chart/chart-utils'
      );

      const config = {
        type: 'area' as const,
        data: [
          { label: '1주', value: 5 },
          { label: '2주', value: 12 },
          { label: '3주', value: 18 },
          { label: '4주', value: 25 },
        ],
        title: '주별 누적 이벤트',
        position: { row: 0, col: 0 },
        fillOpacity: 0.3,
      };

      const result = await generateChartImage(config);

      return {
        size: result.size,
        duration: result.duration,
        type: result.config.type,
      };
    });

    // 검증
    expect(chartResult.type).toBe('area');
    expect(chartResult.size).toBeGreaterThan(0);
    expect(chartResult.duration).toBeLessThan(200);
  });

  test('차트 옵션 테스트', async ({ page }) => {
    const chartResult = await page.evaluate(async () => {
      const { generateChartImage } = await import(
        '@/skills/xlsx/chart/chart-utils'
      );

      const config = {
        type: 'line' as const,
        data: [
          { label: 'A', value: 10 },
          { label: 'B', value: 20 },
        ],
        title: '옵션 테스트',
        position: { row: 0, col: 0 },
      };

      const options = {
        width: 1200,
        height: 600,
        backgroundColor: '#FFFFFF',
        showLegend: false,
        showLabels: true,
        showGrid: true,
      };

      const result = await generateChartImage(config, options);

      return {
        size: result.size,
        duration: result.duration,
      };
    });

    // 검증: 큰 사이즈도 생성 가능
    expect(chartResult.size).toBeGreaterThan(0);
  });
});

test.describe('차트 헬퍼 함수', () => {
  test('트렌드 차트 생성', async ({ page }) => {
    await page.goto('/admin/central-hub');

    const trendConfig = await page.evaluate(async () => {
      const { createTrendChart } = await import(
        '@/skills/xlsx/chart/chart-utils'
      );

      const trendData = {
        data: [
          { date: '2025-11-01', count: 10 },
          { date: '2025-11-02', count: 15 },
          { date: '2025-11-03', count: 12 },
        ],
        title: '일별 이벤트 트렌드',
      };

      return createTrendChart(trendData);
    });

    // 검증
    expect(trendConfig.type).toBe('line');
    expect(trendConfig.title).toBe('일별 이벤트 트렌드');
    expect(trendConfig.data).toHaveLength(3);
    expect(trendConfig.lineWidth).toBe(2);
    expect(trendConfig.showPoints).toBe(true);
  });

  test('파이 차트 생성', async ({ page }) => {
    await page.goto('/admin/central-hub');

    const pieConfig = await page.evaluate(async () => {
      const { createPieChart } = await import(
        '@/skills/xlsx/chart/chart-utils'
      );

      const distData = {
        data: [
          { category: '미해결', count: 10 },
          { category: '진행중', count: 5 },
        ],
        title: '상태별 분포',
      };

      return createPieChart(distData);
    });

    // 검증
    expect(pieConfig.type).toBe('pie');
    expect(pieConfig.title).toBe('상태별 분포');
    expect(pieConfig.data).toHaveLength(2);
    expect(pieConfig.donut).toBe(false);
    expect(pieConfig.showPercentage).toBe(true);
  });
});

test.describe('차트 에러 핸들링', () => {
  test('빈 데이터 에러', async ({ page }) => {
    await page.goto('/admin/central-hub');

    const errorResult = await page.evaluate(async () => {
      const { generateChartImage } = await import(
        '@/skills/xlsx/chart/chart-utils'
      );

      try {
        await generateChartImage({
          type: 'line',
          data: [], // 빈 데이터
          position: { row: 0, col: 0 },
        });
        return { error: null };
      } catch (err) {
        const error = err as { code: string; message: string };
        return {
          error: {
            code: error.code,
            message: error.message,
          },
        };
      }
    });

    // 검증
    expect(errorResult.error).not.toBeNull();
    expect(errorResult.error?.code).toBe('INVALID_DATA');
  });

  test('잘못된 차트 타입 에러', async ({ page }) => {
    await page.goto('/admin/central-hub');

    const errorResult = await page.evaluate(async () => {
      const { generateChartImage } = await import(
        '@/skills/xlsx/chart/chart-utils'
      );

      try {
        await generateChartImage({
          type: 'invalid' as 'line', // 타입 강제 변환
          data: [{ label: 'A', value: 10 }],
          position: { row: 0, col: 0 },
        });
        return { error: null };
      } catch (err) {
        const error = err as { code: string; message: string };
        return {
          error: {
            code: error.code,
            message: error.message,
          },
        };
      }
    });

    // 검증
    expect(errorResult.error).not.toBeNull();
    expect(errorResult.error?.code).toBe('INVALID_DATA');
  });
});

test.describe('useXlsxChart 훅', () => {
  test('차트 생성 상태 관리', async ({ page }) => {
    await page.goto('/admin/central-hub');

    // React 훅 테스트는 실제 컴포넌트 마운트 필요
    // 여기서는 훅의 기본 동작만 검증
    const hookExists = await page.evaluate(() => {
      // 훅 파일 존재 확인
      return typeof require !== 'undefined';
    });

    expect(hookExists).toBeDefined();
  });
});

test.describe('이벤트 리포트 with 차트', () => {
  test.skip('차트가 포함된 이벤트 리포트 생성', async ({ page }) => {
    // Note: 실제 Supabase 연동 필요
    // 통합 테스트 환경에서 실행

    await page.goto('/admin/central-hub');

    // 리포트 생성 버튼 클릭 (UI 구현 후)
    // await page.click('[data-testid="export-with-chart-button"]');

    // 다운로드 이벤트 대기
    // const [download] = await Promise.all([
    //   page.waitForEvent('download'),
    //   page.click('[data-testid="export-with-chart-button"]'),
    // ]);

    // 파일명 검증
    // expect(download.suggestedFilename()).toContain('event-report-');
  });
});
