/**
 * xlsx 차트 내보내기 유틸리티
 *
 * Excel 파일과 차트 이미지를 ZIP 파일로 함께 내보내기
 * ExcelJS 기반으로 마이그레이션됨 (보안 취약점 해결)
 *
 * @module lib/skills/xlsx/chart-exporter
 */

import JSZip from 'jszip';
import ExcelJS from 'exceljs';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 차트 내보내기 설정
 */
export interface ChartExportConfig {
  /** 차트 고유 ID */
  chartId: string;
  /** Canvas 요소 (null이면 건너뜀) */
  chartElement: HTMLCanvasElement | null;
  /** 저장될 파일명 (확장자 제외) */
  fileName: string;
}

/**
 * ZIP 내보내기 옵션
 */
export interface ExportWithChartsOptions {
  /** Excel 워크북 (ExcelJS) */
  workbook: ExcelJS.Workbook;
  /** 기본 파일명 (확장자 제외) */
  fileName: string;
  /** 차트 설정 배열 (선택) */
  charts?: ChartExportConfig[];
}

/**
 * 내보내기 결과
 */
export interface ExportWithChartsResult {
  /** 성공 여부 */
  success: boolean;
  /** 에러 메시지 (실패 시) */
  error?: string;
  /** 생성된 파일 개수 */
  fileCount?: number;
  /** ZIP 파일 크기 (bytes) */
  zipSize?: number;
}

// ============================================================================
// Canvas → Blob 변환
// ============================================================================

/**
 * Canvas 요소를 PNG Blob으로 변환
 *
 * @param canvas - 변환할 Canvas 요소
 * @returns PNG Blob
 * @throws Canvas to Blob 변환 실패 시
 */
export async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, 'image/png');
  });
}

// ============================================================================
// ZIP 내보내기
// ============================================================================

/**
 * Excel 워크북과 차트 이미지를 ZIP 파일로 내보내기
 *
 * @example
 * ```typescript
 * const workbook = XLSX.utils.book_new();
 * // ... 워크북 생성
 *
 * const chartRefs = [canvasRef1, canvasRef2];
 * const charts = chartRefs.map((ref, i) => ({
 *   chartId: `chart-${i}`,
 *   chartElement: ref.current,
 *   fileName: `chart-${i + 1}`,
 * }));
 *
 * const result = await exportWithCharts({
 *   workbook,
 *   fileName: 'my-report',
 *   charts,
 * });
 *
 * if (result.success) {
 *   console.log('Export successful!');
 * }
 * ```
 *
 * @param options - 내보내기 옵션
 * @returns 내보내기 결과
 */
export async function exportWithCharts(
  options: ExportWithChartsOptions
): Promise<ExportWithChartsResult> {
  const { workbook, fileName, charts = [] } = options;

  try {
    const zip = new JSZip();
    let fileCount = 0;

    // 1. Excel 파일 추가 (ExcelJS)
    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    zip.file(`${fileName}.xlsx`, xlsxBuffer);
    fileCount++;

    // 2. 차트 이미지 추가
    if (charts.length > 0) {
      const chartFolder = zip.folder('charts');
      if (chartFolder) {
        for (const chart of charts) {
          if (chart.chartElement) {
            try {
              const blob = await canvasToBlob(chart.chartElement);
              chartFolder.file(`${chart.fileName}.png`, blob);
              fileCount++;
            } catch (err) {
              console.warn(
                `[chart-exporter] 차트 ${chart.chartId} 변환 실패:`,
                err
              );
              // 에러가 발생해도 다른 차트는 계속 처리
            }
          }
        }
      }
    }

    // 3. ZIP 파일 생성 및 다운로드
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipSize = zipBlob.size;
    downloadBlob(zipBlob, `${fileName}.zip`);

    return {
      success: true,
      fileCount,
      zipSize,
    };
  } catch (error) {
    console.error('[chart-exporter] ZIP 내보내기 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// 다운로드 헬퍼
// ============================================================================

/**
 * Blob 다운로드 헬퍼
 *
 * 브라우저에서 Blob을 파일로 다운로드합니다.
 *
 * @param blob - 다운로드할 Blob
 * @param fileName - 저장될 파일명
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
