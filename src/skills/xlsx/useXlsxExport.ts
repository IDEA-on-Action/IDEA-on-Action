/**
 * xlsx 내보내기 훅
 *
 * Central Hub 데이터를 Excel 파일로 내보내기
 *
 * @module skills/xlsx/useXlsxExport
 */

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type {
  UseXlsxExportOptions,
  UseXlsxExportResult,
  SheetConfig,
  SkillError,
} from '@/types/skills.types';
import { fetchEvents, eventColumns } from './generators/eventsSheet';
import { fetchIssues, issueColumns } from './generators/issuesSheet';
import { fetchHealth, healthColumns } from './generators/healthSheet';
import { calculateKPI, kpiColumns } from './generators/kpiSheet';

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

        // 2. 워크북 생성 (30-60%)
        const workbook = XLSX.utils.book_new();

        for (let i = 0; i < sheets.length; i++) {
          const sheet = sheets[i];
          const worksheet = XLSX.utils.json_to_sheet(sheet.data);

          // 컬럼 너비 설정
          if (sheet.columns) {
            worksheet['!cols'] = sheet.columns.map((col) => ({
              wch: col.width || 15,
            }));
          }

          XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
          setProgress(30 + Math.floor(((i + 1) / sheets.length) * 30));
        }
        setProgress(60);

        // 3. 파일 생성 (60-80%)
        const buffer = XLSX.write(workbook, {
          type: 'array',
          bookType: 'xlsx',
        });
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        setProgress(80);

        // 4. 다운로드 (80-100%)
        const filename = options?.filename || generateFilename();
        downloadBlob(blob, filename);
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
    fetchEvents(supabase, dateRange),
    fetchIssues(supabase, dateRange),
    fetchHealth(supabase),
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
