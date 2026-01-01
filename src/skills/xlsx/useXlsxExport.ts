/**
 * xlsx 내보내기 훅
 *
 * Central Hub 데이터를 Excel 파일로 내보내기
 * ExcelJS 기반으로 마이그레이션됨 (보안 취약점 해결)
 *
 * @module skills/xlsx/useXlsxExport
 */

import { useState, useCallback } from 'react';
import ExcelJS from 'exceljs';
import { useAuth } from '@/hooks/auth/useAuth';
// Workers API는 generators에서 직접 사용됨
import type {
  UseXlsxExportOptions,
  UseXlsxExportResult,
  SheetConfig,
  SkillError,
  ChartExportConfig,
} from '@/types/ai/skills.types';
import { fetchEvents, eventColumns } from './generators/eventsSheet';
import { fetchIssues, issueColumns } from './generators/issuesSheet';
import { fetchHealth, healthColumns } from './generators/healthSheet';
import { calculateKPI, kpiColumns } from './generators/kpiSheet';
import { exportWithCharts } from '@/lib/skills/xlsx/chart-exporter';

/**
 * xlsx 내보내기 훅
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { exportToExcel, isExporting, progress, error } = useXlsxExport();
 *
 *   const handleExport = async () => {
 *     await exportToExcel({
 *       filename: 'my-report.xlsx',
 *       dateRange: { from: new Date('2025-01-01'), to: new Date() },
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleExport} disabled={isExporting}>
 *       {isExporting ? `${progress}% 내보내는 중...` : 'Excel 내보내기'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useXlsxExport(): UseXlsxExportResult {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<SkillError | null>(null);

  const exportToExcel = useCallback(
    async (options?: UseXlsxExportOptions) => {
      // 인증 확인
      if (!user) {
        setError({
          code: 'UNAUTHORIZED',
          message: '로그인이 필요합니다.',
        });
        return;
      }

      setIsExporting(true);
      setProgress(0);
      setError(null);

      try {
        // 1. 데이터 로딩 (0-30%)
        setProgress(10);
        const sheets =
          options?.sheets ||
          (await fetchDefaultSheets(options?.dateRange));
        setProgress(30);

        // 2. 워크북 생성 (30-60%) - ExcelJS
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'IDEA on Action';
        workbook.created = new Date();

        for (let i = 0; i < sheets.length; i++) {
          const sheet = sheets[i];
          const worksheet = workbook.addWorksheet(sheet.name);

          // 컬럼 설정
          if (sheet.columns) {
            worksheet.columns = sheet.columns.map((col) => ({
              header: col.header,
              key: col.key || col.header,
              width: col.width || 15,
            }));
          } else if (sheet.data.length > 0) {
            // 데이터에서 컬럼 추론
            const keys = Object.keys(sheet.data[0]);
            worksheet.columns = keys.map((key) => ({
              header: key,
              key: key,
              width: 15,
            }));
          }

          // 데이터 행 추가
          sheet.data.forEach((row) => worksheet.addRow(row));

          setProgress(30 + Math.floor(((i + 1) / sheets.length) * 30));
        }
        setProgress(60);

        // 3. 파일 생성 및 다운로드 (60-100%)
        const filename = options?.filename || generateFilename();

        // 차트 포함 여부에 따라 분기
        if (options?.includeCharts && options?.chartRefs?.length) {
          setProgress(70);

          // 차트 설정 생성
          const charts: ChartExportConfig[] = options.chartRefs
            .map((ref, i) => ({
              chartId: `chart-${i}`,
              chartElement: ref.current,
              fileName: `chart-${i + 1}`,
            }))
            .filter(c => c.chartElement);

          setProgress(80);

          // ZIP 방식으로 내보내기
          await exportWithCharts({
            workbook,
            fileName: filename.replace('.xlsx', ''), // 확장자 제거
            charts,
          });
        } else {
          // 기존 xlsx만 내보내기
          setProgress(70);

          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });

          setProgress(80);
          downloadBlob(blob, filename);
        }

        setProgress(100);
      } catch (err) {
        console.error('[useXlsxExport] Export failed:', err);
        setError({
          code: 'EXPORT_FAILED',
          message: 'Excel 내보내기에 실패했습니다.',
          details: err,
        });
      } finally {
        setIsExporting(false);
      }
    },
    [user]
  );

  return { exportToExcel, isExporting, progress, error };
}

/**
 * 기본 시트 데이터 로딩
 */
async function fetchDefaultSheets(
  dateRange?: UseXlsxExportOptions['dateRange']
): Promise<SheetConfig[]> {
  const [eventsResult, issuesResult, healthResult] = await Promise.all([
    fetchEvents(dateRange),
    fetchIssues(dateRange),
    fetchHealth(),
  ]);

  const kpiResult = calculateKPI(eventsResult, issuesResult);

  return [
    { name: '이벤트 로그', data: eventsResult, columns: eventColumns },
    { name: '이슈 현황', data: issuesResult, columns: issueColumns },
    { name: '서비스 헬스', data: healthResult, columns: healthColumns },
    { name: 'KPI 요약', data: kpiResult, columns: kpiColumns },
  ];
}

/**
 * 파일명 생성
 */
function generateFilename(): string {
  const date = new Date().toISOString().split('T')[0];
  return `central-hub-report-${date}.xlsx`;
}

/**
 * Blob 다운로드
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default useXlsxExport;
