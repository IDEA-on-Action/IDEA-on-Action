/**
 * xlsx 차트 생성 훅
 *
 * Canvas API를 사용하여 차트 이미지를 생성하는 React 훅
 *
 * @module hooks/useXlsxChart
 */

import { useState, useCallback } from 'react';
import type {
  AnyChartConfig,
  ChartGeneratorOptions,
  RenderedChart,
  ChartGenerationError,
} from '@/types/documents/xlsx-chart.types';
import { generateChartImage } from '@/skills/xlsx/chart/chart-utils';

/**
 * useXlsxChart 훅 결과
 */
export interface UseXlsxChartResult {
  /** 차트 이미지 생성 */
  generateChart: (
    config: AnyChartConfig,
    options?: ChartGeneratorOptions
  ) => Promise<RenderedChart>;
  /** 생성 중 여부 */
  isGenerating: boolean;
  /** 에러 정보 */
  error: ChartGenerationError | null;
  /** 마지막 생성 결과 */
  lastResult: RenderedChart | null;
}

/**
 * xlsx 차트 생성 훅
 *
 * Canvas API를 사용하여 차트 이미지를 생성합니다.
 * SheetJS는 네이티브 차트를 지원하지 않으므로 이미지로 삽입합니다.
 *
 * @returns {UseXlsxChartResult} 차트 생성 함수 및 상태
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { generateChart, isGenerating, error } = useXlsxChart();
 *
 *   const handleGenerate = async () => {
 *     const config: LineChartConfig = {
 *       type: 'line',
 *       data: [
 *         { label: '2025-11-01', value: 10 },
 *         { label: '2025-11-02', value: 15 },
 *       ],
 *       title: '일별 이벤트 수',
 *       position: { row: 0, col: 0 },
 *     };
 *
 *     const result = await generateChart(config);
 *     console.log('Chart blob:', result.blob);
 *   };
 *
 *   return (
 *     <button onClick={handleGenerate} disabled={isGenerating}>
 *       {isGenerating ? '생성 중...' : '차트 생성'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useXlsxChart(): UseXlsxChartResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<ChartGenerationError | null>(null);
  const [lastResult, setLastResult] = useState<RenderedChart | null>(null);

  const generateChart = useCallback(
    async (
      config: AnyChartConfig,
      options?: ChartGeneratorOptions
    ): Promise<RenderedChart> => {
      setIsGenerating(true);
      setError(null);

      try {
        const result = await generateChartImage(config, options);
        setLastResult(result);
        return result;
      } catch (err) {
        const chartError = err as ChartGenerationError;
        setError(chartError);
        throw chartError;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return {
    generateChart,
    isGenerating,
    error,
    lastResult,
  };
}

export default useXlsxChart;
