import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useXlsxChart } from '@/hooks/documents/useXlsxChart';
import type { LineChartConfig, BarChartConfig, PieChartConfig } from '@/types/documents/xlsx-chart.types';

// Mock dependencies
vi.mock('@/skills/xlsx/chart/chart-utils', () => ({
  generateChartImage: vi.fn().mockResolvedValue({
    blob: new Blob(['chart'], { type: 'image/png' }),
    dataUrl: 'data:image/png;base64,test',
    width: 600,
    height: 400,
  }),
}));

describe('useXlsxChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('초기 상태', () => {
    it('초기 상태가 올바르게 설정되어야 함', () => {
      const { result } = renderHook(() => useXlsxChart());

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastResult).toBeNull();
    });

    it('generateChart 함수가 정의되어야 함', () => {
      const { result } = renderHook(() => useXlsxChart());

      expect(result.current.generateChart).toBeDefined();
      expect(typeof result.current.generateChart).toBe('function');
    });
  });

  describe('라인 차트 생성', () => {
    it('라인 차트를 생성해야 함', async () => {
      const { result } = renderHook(() => useXlsxChart());

      const config: LineChartConfig = {
        type: 'line',
        data: [
          { label: '2025-11-01', value: 10 },
          { label: '2025-11-02', value: 15 },
          { label: '2025-11-03', value: 12 },
        ],
        title: '일별 이벤트 수',
        position: { row: 0, col: 0 },
      };

      await result.current.generateChart(config);

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
        expect(result.current.lastResult).not.toBeNull();
      });
    });

    it('여러 시리즈 라인 차트를 생성해야 함', async () => {
      const { result } = renderHook(() => useXlsxChart());

      const config: LineChartConfig = {
        type: 'line',
        data: [
          { label: '2025-11-01', value: 10, series: 'A' },
          { label: '2025-11-01', value: 8, series: 'B' },
          { label: '2025-11-02', value: 15, series: 'A' },
          { label: '2025-11-02', value: 12, series: 'B' },
        ],
        title: '시리즈별 비교',
        position: { row: 0, col: 0 },
      };

      await result.current.generateChart(config);

      await waitFor(() => {
        expect(result.current.lastResult).not.toBeNull();
      });
    });
  });

  describe('바 차트 생성', () => {
    it('바 차트를 생성해야 함', async () => {
      const { result } = renderHook(() => useXlsxChart());

      const config: BarChartConfig = {
        type: 'bar',
        data: [
          { label: 'A', value: 100 },
          { label: 'B', value: 150 },
          { label: 'C', value: 120 },
        ],
        title: '카테고리별 판매량',
        position: { row: 5, col: 0 },
      };

      await result.current.generateChart(config);

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
        expect(result.current.lastResult?.blob).toBeDefined();
      });
    });

    it('수평 바 차트를 생성해야 함', async () => {
      const { result } = renderHook(() => useXlsxChart());

      const config: BarChartConfig = {
        type: 'bar',
        data: [
          { label: '제품 A', value: 500 },
          { label: '제품 B', value: 300 },
        ],
        title: '제품별 매출',
        position: { row: 0, col: 5 },
        orientation: 'horizontal',
      };

      await result.current.generateChart(config);

      await waitFor(() => {
        expect(result.current.lastResult).not.toBeNull();
      });
    });
  });

  describe('파이 차트 생성', () => {
    it('파이 차트를 생성해야 함', async () => {
      const { result } = renderHook(() => useXlsxChart());

      const config: PieChartConfig = {
        type: 'pie',
        data: [
          { label: '항목 A', value: 30 },
          { label: '항목 B', value: 50 },
          { label: '항목 C', value: 20 },
        ],
        title: '비율 분포',
        position: { row: 10, col: 0 },
      };

      await result.current.generateChart(config);

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
        expect(result.current.lastResult).not.toBeNull();
      });
    });

    it('도넛 차트를 생성해야 함', async () => {
      const { result } = renderHook(() => useXlsxChart());

      const config: PieChartConfig = {
        type: 'pie',
        data: [
          { label: '카테고리 1', value: 40 },
          { label: '카테고리 2', value: 60 },
        ],
        title: '도넛 차트',
        position: { row: 0, col: 0 },
        innerRadius: 0.5,
      };

      await result.current.generateChart(config);

      await waitFor(() => {
        expect(result.current.lastResult).not.toBeNull();
      });
    });
  });

  describe('차트 옵션', () => {
    it('커스텀 크기로 차트를 생성해야 함', async () => {
      const { result } = renderHook(() => useXlsxChart());

      const config: LineChartConfig = {
        type: 'line',
        data: [{ label: 'A', value: 10 }],
        title: '커스텀 크기',
        position: { row: 0, col: 0 },
      };

      await result.current.generateChart(config, {
        width: 800,
        height: 600,
      });

      await waitFor(() => {
        expect(result.current.lastResult).not.toBeNull();
      });
    });

    it('커스텀 색상으로 차트를 생성해야 함', async () => {
      const { result } = renderHook(() => useXlsxChart());

      const config: BarChartConfig = {
        type: 'bar',
        data: [{ label: 'A', value: 100 }],
        title: '커스텀 색상',
        position: { row: 0, col: 0 },
        colors: ['#FF0000', '#00FF00', '#0000FF'],
      };

      await result.current.generateChart(config);

      await waitFor(() => {
        expect(result.current.lastResult).not.toBeNull();
      });
    });
  });

  describe('에러 처리', () => {
    it('차트 생성 실패 시 에러를 처리해야 함', async () => {
      const { generateChartImage } = await import('@/skills/xlsx/chart/chart-utils');
      vi.mocked(generateChartImage).mockRejectedValueOnce({
        code: 'CHART_001',
        message: '차트 생성 실패',
      });

      const { result } = renderHook(() => useXlsxChart());

      const config: LineChartConfig = {
        type: 'line',
        data: [],
        title: '빈 데이터',
        position: { row: 0, col: 0 },
      };

      await expect(result.current.generateChart(config)).rejects.toMatchObject({
        code: 'CHART_001',
      });
    });

    it('잘못된 데이터 형식 에러를 처리해야 함', async () => {
      const { generateChartImage } = await import('@/skills/xlsx/chart/chart-utils');
      vi.mocked(generateChartImage).mockRejectedValueOnce({
        code: 'CHART_002',
        message: '잘못된 데이터 형식',
      });

      const { result } = renderHook(() => useXlsxChart());

      const invalidConfig = {
        type: 'line',
        data: null,
        title: '잘못된 데이터',
        position: { row: 0, col: 0 },
      } as never;

      await expect(result.current.generateChart(invalidConfig)).rejects.toMatchObject({
        code: 'CHART_002',
      });
    });
  });
});
