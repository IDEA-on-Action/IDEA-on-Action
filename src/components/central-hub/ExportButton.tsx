/**
 * Central Hub Export 버튼 컴포넌트
 *
 * Excel(xlsx) 및 PowerPoint(pptx) 내보내기를 지원하는 드롭다운 버튼
 *
 * @module components/central-hub/ExportButton
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, Presentation, Loader2, ChevronDown } from 'lucide-react';
import { useXlsxExport } from '@/skills/xlsx/useXlsxExport';
import { usePptxGenerate } from '@/hooks/usePptxGenerate';
import type { UseXlsxExportOptions } from '@/types/skills.types';
import type { PptxGenerateOptions } from '@/types/documents/pptx.types';

interface ExportButtonProps {
  /** Excel 내보내기 옵션 */
  xlsxOptions?: UseXlsxExportOptions;
  /** PowerPoint 생성 옵션 */
  pptxOptions?: PptxGenerateOptions;
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
 * Central Hub Export 버튼
 *
 * Central Hub 데이터를 Excel 또는 PowerPoint 파일로 내보내는 드롭다운 버튼 컴포넌트
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <ExportButton />
 *
 * // 옵션 지정
 * <ExportButton
 *   xlsxOptions={{
 *     dateRange: { from: startDate, to: endDate },
 *     filename: 'central-hub-report.xlsx',
 *   }}
 *   pptxOptions={{
 *     slides: [
 *       { type: 'title', title: 'Central Hub Report', subtitle: '상태 보고서' },
 *       { type: 'content', title: '주요 지표', content: ['지표 1', '지표 2'] },
 *     ],
 *     filename: 'central-hub-presentation.pptx',
 *   }}
 * />
 * ```
 */
export function ExportButton({
  xlsxOptions,
  pptxOptions,
  variant = 'outline',
  size = 'default',
  children,
  className,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Excel 내보내기 훅
  const { exportToExcel, isExporting: isExportingXlsx, progress: xlsxProgress, error: xlsxError } = useXlsxExport();

  // PowerPoint 생성 훅
  const {
    generatePresentation,
    isGenerating: isGeneratingPptx,
    progress: pptxProgress,
    error: pptxError,
  } = usePptxGenerate();

  // 전체 로딩 상태
  const isLoading = isExportingXlsx || isGeneratingPptx;

  // 에러 상태
  const error = xlsxError || pptxError;

  /**
   * Excel 내보내기 핸들러
   */
  const handleExportExcel = async () => {
    setIsOpen(false);
    await exportToExcel(xlsxOptions);
  };

  /**
   * PowerPoint 생성 핸들러
   */
  const handleGeneratePowerPoint = async () => {
    setIsOpen(false);

    // 기본 프레젠테이션 옵션
    const defaultOptions: PptxGenerateOptions = {
      slides: [
        {
          type: 'title',
          title: 'Central Hub Dashboard',
          subtitle: 'Minu 서비스 상태 보고서',
        },
        {
          type: 'content',
          title: '주요 기능',
          content: [
            'Find: 아이디어 발굴 및 시장 조사',
            'Frame: 프로젝트 기획 및 설계',
            'Build: 개발 및 구현',
            'Keep: 운영 및 유지보수',
          ],
        },
        {
          type: 'content',
          title: '실시간 모니터링',
          content: [
            '서비스 헬스 체크',
            '이벤트 타임라인',
            '이슈 관리',
            '알림 시스템',
          ],
        },
      ],
      filename: 'central-hub-presentation.pptx',
      metadata: {
        title: 'Central Hub Dashboard',
        author: 'IDEA on Action',
        company: '생각과행동',
        subject: 'Minu 서비스 상태 보고서',
      },
    };

    // 사용자 옵션 병합
    const mergedOptions: PptxGenerateOptions = {
      ...defaultOptions,
      ...pptxOptions,
      metadata: {
        ...defaultOptions.metadata,
        ...pptxOptions?.metadata,
      },
    };

    await generatePresentation(mergedOptions);
  };

  // 진행률 텍스트
  const getProgressText = () => {
    if (isExportingXlsx) {
      return `${xlsxProgress}% Excel 내보내는 중...`;
    }
    if (isGeneratingPptx) {
      return `${pptxProgress}% PowerPoint 생성 중...`;
    }
    return null;
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={isLoading}
            className={className}
            aria-label="파일 내보내기 옵션"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {getProgressText()}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {children || '내보내기'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>내보내기 형식 선택</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleExportExcel}
            disabled={isLoading}
            className="cursor-pointer"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
            <div className="flex flex-col">
              <span>Excel 내보내기</span>
              <span className="text-xs text-muted-foreground">
                데이터를 엑셀 파일로 다운로드
              </span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleGeneratePowerPoint}
            disabled={isLoading}
            className="cursor-pointer"
          >
            <Presentation className="mr-2 h-4 w-4 text-orange-600" />
            <div className="flex flex-col">
              <span>PowerPoint 생성</span>
              <span className="text-xs text-muted-foreground">
                프레젠테이션 파일 생성
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 에러 메시지 */}
      {error && (
        <span className="text-sm text-destructive" role="alert">
          {error.message}
        </span>
      )}
    </div>
  );
}

export default ExportButton;
