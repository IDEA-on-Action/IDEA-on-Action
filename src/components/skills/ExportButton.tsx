/**
 * Excel 내보내기 버튼 컴포넌트
 *
 * @module components/skills/ExportButton
 */

import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useXlsxExport } from '@/skills/xlsx/useXlsxExport';
import type { UseXlsxExportOptions } from '@/types/skills.types';

interface ExportButtonProps {
  /** 내보내기 옵션 */
  options?: UseXlsxExportOptions;
  /** 버튼 스타일 */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  /** 버튼 크기 */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** 버튼 텍스트 */
  children?: React.ReactNode;
  /** 추가 클래스 */
  className?: string;
}

/**
 * Excel 내보내기 버튼
 *
 * Central Hub 데이터를 Excel 파일로 내보내는 버튼 컴포넌트
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <ExportButton />
 *
 * // 날짜 필터 적용
 * <ExportButton
 *   options={{
 *     dateRange: { from: startDate, to: endDate },
 *     filename: 'custom-report.xlsx',
 *   }}
 * />
 *
 * // 커스텀 스타일
 * <ExportButton variant="default" size="lg">
 *   보고서 다운로드
 * </ExportButton>
 * ```
 */
export function ExportButton({
  options,
  variant = 'outline',
  size = 'default',
  children,
  className,
}: ExportButtonProps) {
  const { exportToExcel, isExporting, progress, error } = useXlsxExport();

  const handleClick = async () => {
    await exportToExcel(options);
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isExporting}
        className={className}
      >
        {isExporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {progress}% 내보내는 중...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            {children || 'Excel 내보내기'}
          </>
        )}
      </Button>

      {error && (
        <span className="text-sm text-destructive">{error.message}</span>
      )}
    </div>
  );
}

export default ExportButton;
