/**
 * xlsx 내보내기 훅
 *
 * Excel 파일 내보내기 및 차트 삽입 기능을 제공하는 React 훅
 * ExcelJS 기반으로 마이그레이션됨 (보안 취약점 해결)
 *
 * @module hooks/useXlsxExport
 */

import { useState, useCallback } from 'react';
import ExcelJS from 'exceljs';
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

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 셀 주소를 행/열 인덱스로 변환
 * @example 'A1' -> { row: 0, col: 0 }
 * @example 'D5' -> { row: 4, col: 3 }
 */
function cellToRowCol(cell: string): { row: number; col: number } {
  const match = cell.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`잘못된 셀 주소: ${cell}`);
  }

  const colStr = match[1];
  const rowStr = match[2];

  // 열 문자를 숫자로 변환 (A=0, B=1, ..., Z=25, AA=26, ...)
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 65 + 1);
  }
  col -= 1; // 0-based index

  // 행 숫자를 0-based로 변환
  const row = parseInt(rowStr, 10) - 1;

  return { row, col };
}

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
        // 워크북 생성 (ExcelJS)
        const wb = new ExcelJS.Workbook();
        wb.creator = 'IDEA on Action';
        wb.created = new Date();

        // 시트 추가
        if (options.sheets && options.sheets.length > 0) {
          for (let index = 0; index < options.sheets.length; index++) {
            const sheet = options.sheets[index];
            setProgress(((index + 1) / options.sheets.length) * 50);

            // 워크시트 생성
            const ws = wb.addWorksheet(sheet.name);

            // 컬럼 설정 적용
            if (sheet.columns) {
              ws.columns = sheet.columns.map(col => ({
                header: col.header,
                key: col.key || col.header,
                width: col.width || 15,
              }));
            } else {
              // 데이터에서 컬럼 추론
              const firstRow = sheet.data[0];
              if (firstRow) {
                const keys = Object.keys(firstRow);
                ws.columns = keys.map(key => ({
                  header: key,
                  key: key,
                  width: 15,
                }));
              }
            }

            // 데이터 행 추가
            sheet.data.forEach(row => {
              ws.addRow(row);
            });
          }
        } else {
          // 기본 시트 추가
          const ws = wb.addWorksheet('Sheet1');
          ws.addRow(['No Data']);
        }

        setProgress(75);

        // 파일명 생성
        const filename =
          options.filename ||
          `report-${new Date().toISOString().split('T')[0]}.xlsx`;

        // 파일 다운로드 (ExcelJS)
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

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
        // 워크북 생성 (ExcelJS)
        const wb = new ExcelJS.Workbook();
        wb.creator = 'IDEA on Action';
        wb.created = new Date();

        // 데이터 시트 생성
        setProgress(10);
        const ws = wb.addWorksheet('Data');

        // 데이터에서 컬럼 추론
        if (data.length > 0) {
          const keys = Object.keys(data[0]);
          ws.columns = keys.map(key => ({
            header: key,
            key: key,
            width: 15,
          }));
          data.forEach(row => ws.addRow(row));
        }

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

        // 차트 삽입 (ExcelJS 공식 API)
        setProgress(60);
        const { row, col } = cellToRowCol(chartConfig.position);
        const imageId = wb.addImage({
          base64: chartResult.imageBase64,
          extension: 'png',
        });
        ws.addImage(imageId, {
          tl: { col, row },
          ext: { width: 600, height: 400 },
        });

        setProgress(80);

        // 파일명 생성
        const filename =
          options.filename ||
          `report-with-chart-${new Date().toISOString().split('T')[0]}.xlsx`;

        // 파일 다운로드 (ExcelJS)
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

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
        // 워크북 생성 (ExcelJS)
        const wb = new ExcelJS.Workbook();
        wb.creator = 'IDEA on Action';
        wb.created = new Date();

        // 시트별로 처리
        for (let i = 0; i < sheets.length; i++) {
          const sheet = sheets[i];
          setProgress((i / sheets.length) * 50);

          // 워크시트 생성
          const ws = wb.addWorksheet(sheet.name);

          // 데이터에서 컬럼 추론
          if (sheet.data.length > 0) {
            const keys = Object.keys(sheet.data[0]);
            ws.columns = keys.map(key => ({
              header: key,
              key: key,
              width: 15,
            }));
            sheet.data.forEach(row => ws.addRow(row));
          }

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
              // 차트 삽입 (ExcelJS 공식 API)
              const { row, col } = cellToRowCol(chartConfig.position);
              const imageId = wb.addImage({
                base64: chartResult.imageBase64,
                extension: 'png',
              });
              ws.addImage(imageId, {
                tl: { col, row },
                ext: { width: 600, height: 400 },
              });
            }
          }
        }

        setProgress(80);

        // 파일명 생성
        const filename =
          options.filename ||
          `report-${new Date().toISOString().split('T')[0]}.xlsx`;

        // 파일 다운로드 (ExcelJS)
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

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
