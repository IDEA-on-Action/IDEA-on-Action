/**
 * Skills 통합 Export Hook
 *
 * xlsx/docx 내보내기를 통합 관리하는 훅
 *
 * @module hooks/useSkillExport
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import type { SkillError } from '@/types/ai/skills.types';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * Export 타입
 */
export type ExportType = 'xlsx' | 'docx';

/**
 * Export 옵션
 */
export interface SkillExportOptions {
  /** Export 타입 */
  type: ExportType;
  /** 파일명 */
  fileName?: string;
  /** xlsx 옵션 */
  xlsxOptions?: {
    dateRange?: { from: Date; to: Date };
    sheets?: { name: string; data: Record<string, unknown>[]; columns?: unknown[] }[];
    includeCharts?: boolean;
    chartRefs?: React.RefObject<HTMLCanvasElement>[];
  };
  /** docx 옵션 */
  docxOptions?: {
    templateId?: string;
    variables?: Record<string, unknown>;
    styles?: Record<string, unknown>;
  };
}

/**
 * Export 결과
 */
export interface SkillExportResult {
  /** 성공 여부 */
  success: boolean;
  /** 파일명 */
  fileName: string;
  /** 에러 메시지 */
  error?: string;
}

/**
 * Hook 반환 타입
 */
export interface UseSkillExportReturn {
  /** Export 실행 함수 */
  exportFile: (options: SkillExportOptions) => Promise<SkillExportResult>;
  /** Export 진행 중 여부 */
  isExporting: boolean;
  /** 진행률 (0-100) */
  progress: number;
  /** 에러 정보 */
  error: SkillError | null;
  /** 상태 초기화 */
  reset: () => void;
}

// ============================================================================
// Hook 구현
// ============================================================================

/**
 * Skills 통합 Export Hook
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { exportFile, isExporting, progress } = useSkillExport();
 *
 *   const handleExportExcel = async () => {
 *     const result = await exportFile({
 *       type: 'xlsx',
 *       fileName: 'report.xlsx',
 *       xlsxOptions: {
 *         dateRange: { from: new Date('2025-01-01'), to: new Date() },
 *       },
 *     });
 *
 *     if (result.success) {
 *       toast.success('Excel 파일이 다운로드되었습니다.');
 *     }
 *   };
 *
 *   const handleExportDocx = async () => {
 *     const result = await exportFile({
 *       type: 'docx',
 *       fileName: 'rfp.docx',
 *       docxOptions: {
 *         templateId: 'rfp-startup-mvp',
 *         variables: {
 *           projectName: '프로젝트명',
 *           // ...
 *         },
 *       },
 *     });
 *
 *     if (result.success) {
 *       toast.success('Word 문서가 다운로드되었습니다.');
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleExportExcel} disabled={isExporting}>
 *         {isExporting ? `${progress}% 내보내는 중...` : 'Excel 내보내기'}
 *       </button>
 *       <button onClick={handleExportDocx} disabled={isExporting}>
 *         Word 문서 생성
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSkillExport(): UseSkillExportReturn {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<SkillError | null>(null);

  /**
   * Export 실행
   */
  const exportFile = useCallback(
    async (options: SkillExportOptions): Promise<SkillExportResult> => {
      // 인증 확인
      if (!user) {
        const authError: SkillError = {
          code: 'UNAUTHORIZED',
          message: '로그인이 필요합니다.',
        };
        setError(authError);
        return {
          success: false,
          fileName: '',
          error: authError.message,
        };
      }

      setIsExporting(true);
      setProgress(0);
      setError(null);

      try {
        if (options.type === 'xlsx') {
          return await exportXlsx(options, setProgress);
        } else if (options.type === 'docx') {
          return await exportDocx(options, setProgress);
        } else {
          throw new Error(`지원하지 않는 Export 타입: ${options.type}`);
        }
      } catch (err) {
        console.error('[useSkillExport] Export failed:', err);
        const exportError: SkillError = {
          code: 'EXPORT_FAILED',
          message: 'Export에 실패했습니다.',
          details: err,
        };
        setError(exportError);
        return {
          success: false,
          fileName: '',
          error: exportError.message,
        };
      } finally {
        setIsExporting(false);
        setProgress(100);
      }
    },
    [user]
  );

  /**
   * 상태 초기화
   */
  const reset = useCallback(() => {
    setIsExporting(false);
    setProgress(0);
    setError(null);
  }, []);

  return {
    exportFile,
    isExporting,
    progress,
    error,
    reset,
  };
}

// ============================================================================
// 내부 함수
// ============================================================================

/**
 * Excel 내보내기
 */
async function exportXlsx(
  options: SkillExportOptions,
  setProgress: (p: number) => void
): Promise<SkillExportResult> {
  setProgress(10);

  // useXlsxExport 훅을 직접 사용하지 않고 함수로 분리
  const { useXlsxExport } = await import('@/skills/xlsx');
  const XLSX = await import('xlsx');

  setProgress(30);

  // 데이터 생성 로직 (useXlsxExport의 로직을 재사용)
  const workbook = XLSX.utils.book_new();

  // 기본 시트 또는 커스텀 시트 생성
  if (options.xlsxOptions?.sheets) {
    for (let i = 0; i < options.xlsxOptions.sheets.length; i++) {
      const sheet = options.xlsxOptions.sheets[i];
      const worksheet = XLSX.utils.json_to_sheet(sheet.data);

      if (sheet.columns) {
        worksheet['!cols'] = sheet.columns.map((col: unknown) => {
          const column = col as { width?: number };
          return { wch: column.width || 15 };
        });
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
      setProgress(30 + Math.floor(((i + 1) / options.xlsxOptions.sheets.length) * 40));
    }
  }

  setProgress(70);

  // 파일 생성 및 다운로드
  const fileName = options.fileName || `export-${Date.now()}.xlsx`;
  const buffer = XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
  });

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  setProgress(90);
  downloadBlob(blob, fileName);
  setProgress(100);

  return {
    success: true,
    fileName,
  };
}

/**
 * Word 문서 내보내기
 */
async function exportDocx(
  options: SkillExportOptions,
  setProgress: (p: number) => void
): Promise<SkillExportResult> {
  setProgress(10);

  if (!options.docxOptions?.templateId) {
    throw new Error('docx 내보내기에는 templateId가 필요합니다.');
  }

  setProgress(20);

  // docx 렌더러 동적 로딩
  const { renderTemplate } = await import('@/skills/docx/renderer');

  setProgress(40);

  // 템플릿 렌더링
  const result = await renderTemplate({
    templateId: options.docxOptions.templateId,
    variables: options.docxOptions.variables || {},
    fileName: options.fileName,
    styles: options.docxOptions.styles,
  });

  setProgress(80);

  if (!result.success || !result.blob) {
    throw new Error(result.error || 'Word 문서 생성 실패');
  }

  // 다운로드
  downloadBlob(result.blob, result.fileName);
  setProgress(100);

  return {
    success: true,
    fileName: result.fileName,
  };
}

/**
 * Blob 다운로드 유틸리티
 */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
