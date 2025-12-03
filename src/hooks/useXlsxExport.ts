/**
 * xlsx 내보내기 훅
 *
 * Excel 파일 내보내기 및 차트 삽입 기능을 제공하는 React 훅
 *
 * @module hooks/useXlsxExport
 */

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import type {
  UseXlsxExportOptions,
  UseXlsxExportResult,
  SkillError,
  SheetConfig,
} from '@/types/skills.types';
import type {
  ChartData,
  BarChartOptions,
  LineChartOptions,
  PieChartOptions,
} from '@/types/xlsx-chart.types';
import {
  generateBarChartImage,
  generateLineChartImage,
  generatePieChartImage,
} from '@/lib/skills/xlsx/chartGenerate';
import { insertChartImage } from '@/lib/skills/xlsx/chartInsert';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 차트 설정
 */
export interface ChartConfig {
  /** 차트 유형 */
  type: 'bar' | 'line' | 'pie';
  /** 차트 데이터 */
  data: ChartData;
  /** 차트 옵션 */
  options: BarChartOptions | LineChartOptions | PieChartOptions;
  /** 삽입 위치 (셀 주소) */
  position: string;
  /** 대체 텍스트 */
  alt?: string;
}

/**
 * 차트 포함 내보내기 옵션
 */
export interface ExportWithChartOptions extends UseXlsxExportOptions {
  /** 차트 설정 배열 */
  charts?: ChartConfig[];
}

// ============================================================================
// 훅 구현
// ============================================================================

/**
 * xlsx 내보내기 훅
 *
 * @example
 * ```typescript
 * const { exportToExcel, exportWithChart, isExporting, progress, error } = useXlsxExport();
 *
 * // 기본 내보내기
 * await exportToExcel({
 *   filename: 'report.xlsx',
 *   sheets: [
 *     { name: 'Sheet1', data: [{ col1: 'value1', col2: 'value2' }] }
 *   ]
 * });
 *
 * // 차트 포함 내보내기
 * await exportWithChart(
 *   [{ col1: 'A', col2: 100 }, { col1: 'B', col2: 200 }],
 *   {
 *     type: 'bar',
 *     data: { labels: ['A', 'B'], datasets: [{ label: 'Sales', data: [100, 200] }] },
 *     options: { title: 'Sales Chart' },
 *     position: 'D2'
 *   }
 * );
 * ```
 */
export function useXlsxExport(): UseXlsxExportResult & {
  exportWithChart: (
    data: Record<string, unknown>[],
    chartConfig: ChartConfig,
    options?: Omit<ExportWithChartOptions, 'charts'>
  ) => Promise<void>;
  exportMultipleCharts: (
    sheets: SheetConfig[],
    charts: ChartConfig[],
    options?: Omit<ExportWithChartOptions, 'sheets' | 'charts'>
  ) => Promise<void>;
} {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<SkillError | null>(null);

  /**
   * 기본 Excel 내보내기
   */
  const exportToExcel = useCallback(
    async (options: UseXlsxExportOptions = {}): Promise<void> => {
      setIsExporting(true);
      setProgress(0);
      setError(null);

      try {
        // 워크북 생성
        const wb = XLSX.utils.book_new();

        // 시트 추가
        if (options.sheets && options.sheets.length > 0) {
          options.sheets.forEach((sheet, index) => {
            setProgress(((index + 1) / options.sheets!.length) * 50);

            // 데이터를 워크시트로 변환
            const ws = XLSX.utils.json_to_sheet(sheet.data);

            // 컬럼 설정 적용
            if (sheet.columns) {
              const colWidths = sheet.columns.map(col => ({
                wch: col.width || 10,
              }));
              ws['!cols'] = colWidths;

              // 헤더 설정
              const headers = sheet.columns.map(col => col.header);
              XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A1' });
            }

            // 워크북에 시트 추가
            XLSX.utils.book_append_sheet(wb, ws, sheet.name);
          });
        } else {
          // 기본 시트 추가
          const ws = XLSX.utils.aoa_to_sheet([['No Data']]);
          XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        }

        setProgress(75);

        // 파일명 생성
        const filename =
          options.filename ||
          `report-${new Date().toISOString().split('T')[0]}.xlsx`;

        // 파일 다운로드
        XLSX.writeFile(wb, filename);

        setProgress(100);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError({
          code: 'EXPORT_FAILED',
          message: `Excel 내보내기 실패: ${errorMessage}`,
          details: err,
        });
        throw err;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  /**
   * 차트 포함 Excel 내보내기 (단일 차트)
   */
  const exportWithChart = useCallback(
    async (
      data: Record<string, unknown>[],
      chartConfig: ChartConfig,
      options: Omit<ExportWithChartOptions, 'charts'> = {}
    ): Promise<void> => {
      setIsExporting(true);
      setProgress(0);
      setError(null);

      try {
        // 워크북 생성
        const wb = XLSX.utils.book_new();

        // 데이터 시트 생성
        setProgress(10);
        const ws = XLSX.utils.json_to_sheet(data);

        // 차트 이미지 생성
        setProgress(30);
        let chartResult;
        switch (chartConfig.type) {
          case 'bar':
            chartResult = await generateBarChartImage(
              chartConfig.data,
              chartConfig.options as BarChartOptions
            );
            break;
          case 'line':
            chartResult = await generateLineChartImage(
              chartConfig.data,
              chartConfig.options as LineChartOptions
            );
            break;
          case 'pie':
            chartResult = await generatePieChartImage(
              chartConfig.data,
              chartConfig.options as PieChartOptions
            );
            break;
          default:
            throw new Error(`지원하지 않는 차트 유형: ${chartConfig.type}`);
        }

        // 차트 삽입
        setProgress(60);
        insertChartImage(ws, chartResult.imageBase64, {
          position: { cell: chartConfig.position },
          alt: chartConfig.alt || 'Chart',
        });

        // 워크북에 시트 추가
        XLSX.utils.book_append_sheet(wb, ws, 'Data');

        setProgress(80);

        // 파일명 생성
        const filename =
          options.filename ||
          `report-with-chart-${new Date().toISOString().split('T')[0]}.xlsx`;

        // 파일 다운로드
        XLSX.writeFile(wb, filename);

        setProgress(100);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError({
          code: 'EXPORT_FAILED',
          message: `차트 포함 내보내기 실패: ${errorMessage}`,
          details: err,
        });
        throw err;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  /**
   * 여러 차트 포함 Excel 내보내기
   */
  const exportMultipleCharts = useCallback(
    async (
      sheets: SheetConfig[],
      charts: ChartConfig[],
      options: Omit<ExportWithChartOptions, 'sheets' | 'charts'> = {}
    ): Promise<void> => {
      setIsExporting(true);
      setProgress(0);
      setError(null);

      try {
        // 워크북 생성
        const wb = XLSX.utils.book_new();

        // 시트별로 처리
        for (let i = 0; i < sheets.length; i++) {
          const sheet = sheets[i];
          setProgress((i / sheets.length) * 50);

          // 워크시트 생성
          const ws = XLSX.utils.json_to_sheet(sheet.data);

          // 해당 시트의 차트 필터링 (시트 이름 기반)
          const sheetCharts = charts.filter(
            chart => chart.alt?.includes(sheet.name) || i === 0
          );

          // 차트 생성 및 삽입
          for (const chartConfig of sheetCharts) {
            let chartResult;
            switch (chartConfig.type) {
              case 'bar':
                chartResult = await generateBarChartImage(
                  chartConfig.data,
                  chartConfig.options as BarChartOptions
                );
                break;
              case 'line':
                chartResult = await generateLineChartImage(
                  chartConfig.data,
                  chartConfig.options as LineChartOptions
                );
                break;
              case 'pie':
                chartResult = await generatePieChartImage(
                  chartConfig.data,
                  chartConfig.options as PieChartOptions
                );
                break;
            }

            if (chartResult) {
              insertChartImage(ws, chartResult.imageBase64, {
                position: { cell: chartConfig.position },
                alt: chartConfig.alt || 'Chart',
              });
            }
          }

          // 워크북에 시트 추가
          XLSX.utils.book_append_sheet(wb, ws, sheet.name);
        }

        setProgress(80);

        // 파일명 생성
        const filename =
          options.filename ||
          `report-${new Date().toISOString().split('T')[0]}.xlsx`;

        // 파일 다운로드
        XLSX.writeFile(wb, filename);

        setProgress(100);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError({
          code: 'EXPORT_FAILED',
          message: `여러 차트 내보내기 실패: ${errorMessage}`,
          details: err,
        });
        throw err;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  return {
    exportToExcel,
    exportWithChart,
    exportMultipleCharts,
    isExporting,
    progress,
    error,
  };
}
