/**
 * usePptxGenerate Hook
 * TASK-CS-035: PowerPoint 생성을 위한 React 커스텀 훅
 *
 * Minu Frame 서비스를 위한 발표 자료 생성 기능 제공
 * - 16:9 레이아웃
 * - 브랜드 스타일 적용
 * - 4종 슬라이드 템플릿 지원
 *
 * @module skills/pptx/usePptxGenerate
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import PptxGenJS from 'pptxgenjs';
import { toast } from 'sonner';

import type {
  PptxGenerateOptions,
  PptxGenerateResult,
  UsePptxGenerateReturn,
  SlideContent,
  BrandColors,
  PptxStyleOptions,
} from '@/types/pptx.types';
import { BRAND_COLORS, DEFAULT_STYLE } from '@/types/pptx.types';
import type { SkillError } from '@/types/skills.types';

import { addTitleSlide } from './templates/titleSlide';
import { addContentSlide } from './templates/contentSlide';
import { addTwoColumnSlide } from './templates/twoColumnSlide';
import { addChartSlide } from './templates/chartSlide';

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * Error를 SkillError로 변환
 */
function toSkillError(error: unknown): SkillError {
  if (error instanceof Error) {
    return {
      code: 'EXPORT_FAILED',
      message: error.message,
      details: error,
    };
  }
  return {
    code: 'UNKNOWN',
    message: String(error),
  };
}

/**
 * 파일 다운로드
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

/**
 * 파일명 생성
 */
function generateFileName(baseName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const sanitized = baseName.replace(/[^a-zA-Z0-9가-힣]/g, '_');
  return `${sanitized}_${date}.pptx`;
}

/**
 * 스타일 옵션 병합
 */
function mergeStyles(userStyles?: PptxStyleOptions): Required<PptxStyleOptions> {
  return {
    ...DEFAULT_STYLE,
    ...userStyles,
    colors: {
      ...BRAND_COLORS,
      ...userStyles?.colors,
    },
  };
}

// ============================================================================
// 슬라이드 빌더
// ============================================================================

/**
 * 슬라이드 타입별 빌더 호출
 */
function buildSlide(
  pptx: PptxGenJS,
  content: SlideContent,
  styles: Required<PptxStyleOptions>
): void {
  const slide = pptx.addSlide();
  const colors = styles.colors as BrandColors;

  switch (content.type) {
    case 'title':
      addTitleSlide({
        slide,
        content,
        colors,
        titleFont: styles.titleFont,
        bodyFont: styles.bodyFont,
      });
      break;

    case 'content':
      addContentSlide({
        slide,
        content,
        colors,
        titleFont: styles.titleFont,
        bodyFont: styles.bodyFont,
        bodyFontSize: styles.bodyFontSize,
      });
      break;

    case 'twoColumn':
      addTwoColumnSlide({
        slide,
        content,
        colors,
        titleFont: styles.titleFont,
        bodyFont: styles.bodyFont,
        bodyFontSize: styles.bodyFontSize,
      });
      break;

    case 'chart':
      addChartSlide({
        slide,
        content,
        colors,
        titleFont: styles.titleFont,
        bodyFont: styles.bodyFont,
      });
      break;

    default:
      // 기본값: content 슬라이드로 처리
      addContentSlide({
        slide,
        content,
        colors,
        titleFont: styles.titleFont,
        bodyFont: styles.bodyFont,
        bodyFontSize: styles.bodyFontSize,
      });
  }
}

// ============================================================================
// usePptxGenerate 훅
// ============================================================================

/**
 * PowerPoint 생성 훅
 *
 * @example
 * ```tsx
 * const { generatePresentation, isGenerating, progress, error, reset } = usePptxGenerate();
 *
 * const handleExport = async () => {
 *   await generatePresentation({
 *     slides: [
 *       { type: 'title', title: '프로젝트 제안서', subtitle: '2025.11' },
 *       { type: 'content', title: '목차', content: ['개요', '범위', '일정'] },
 *       { type: 'twoColumn', title: '비교', leftContent: ['A'], rightContent: ['B'] },
 *       { type: 'chart', title: '매출', chartData: { type: 'bar', labels: ['Q1'], values: [100] } },
 *     ],
 *     filename: 'proposal.pptx',
 *   });
 * };
 * ```
 */
export function usePptxGenerate(): UsePptxGenerateReturn {
  const [progress, setProgress] = useState(0);
  const [skillError, setSkillError] = useState<SkillError | null>(null);

  const mutation = useMutation({
    mutationFn: async (options: PptxGenerateOptions): Promise<PptxGenerateResult> => {
      setProgress(10);
      setSkillError(null);

      const { slides, filename, metadata, styles: userStyles } = options;

      // 스타일 병합
      const styles = mergeStyles(userStyles);

      // pptxgenjs 인스턴스 생성
      const pptx = new PptxGenJS();

      // 프레젠테이션 설정
      pptx.layout = styles.layout;
      pptx.author = metadata?.author || 'IDEA on Action';
      pptx.company = metadata?.company || '생각과행동';
      pptx.title = metadata?.title || filename.replace('.pptx', '');
      pptx.subject = metadata?.subject || '';

      setProgress(20);

      try {
        // 슬라이드 생성
        const totalSlides = slides.length;
        for (let i = 0; i < totalSlides; i++) {
          buildSlide(pptx, slides[i], styles);
          // 진행률 업데이트 (20 ~ 80)
          setProgress(20 + Math.round((i + 1) / totalSlides * 60));
        }

        setProgress(85);

        // Blob 생성
        const blob = await pptx.write({ outputType: 'blob' }) as Blob;

        setProgress(95);

        // 파일 다운로드
        const outputFileName = filename.endsWith('.pptx')
          ? filename
          : `${filename}.pptx`;
        downloadBlob(blob, outputFileName);

        setProgress(100);

        return {
          success: true,
          fileName: outputFileName,
          blob,
          generatedAt: new Date(),
          fileSize: blob.size,
          slideCount: totalSlides,
        };
      } catch (err) {
        const skillErr = toSkillError(err);
        setSkillError(skillErr);
        throw err;
      }
    },
    onSuccess: (result) => {
      toast.success(`프레젠테이션이 생성되었습니다: ${result.fileName}`);
    },
    onError: (error: Error) => {
      toast.error(`프레젠테이션 생성 실패: ${error.message}`);
      setProgress(0);
    },
  });

  const generatePresentation = useCallback(
    async (options: PptxGenerateOptions): Promise<PptxGenerateResult> => {
      setProgress(0);
      setSkillError(null);
      return mutation.mutateAsync(options);
    },
    [mutation]
  );

  const reset = useCallback(() => {
    setProgress(0);
    setSkillError(null);
    mutation.reset();
  }, [mutation]);

  return {
    generatePresentation,
    isGenerating: mutation.isPending,
    progress,
    error: skillError,
    reset,
  };
}

// ============================================================================
// 편의 훅: useMinuFramePresentation
// ============================================================================

/**
 * Minu Frame 발표 자료 생성 전용 훅
 *
 * 제안서, 기획서, 발표 자료 등 Minu Frame 서비스에 최적화된 훅입니다.
 *
 * @example
 * ```tsx
 * const { generateProposal, isGenerating } = useMinuFramePresentation();
 *
 * const handleExport = async () => {
 *   await generateProposal({
 *     title: '스마트시티 구축 제안',
 *     subtitle: 'IDEA on Action | 2025.11',
 *     sections: [
 *       { title: '프로젝트 개요', points: ['배경', '목적', '범위'] },
 *       { title: '추진 일정', points: ['1단계: 분석', '2단계: 설계', '3단계: 구현'] },
 *     ],
 *   });
 * };
 * ```
 */
export interface ProposalSection {
  title: string;
  points: string[];
}

export interface ProposalOptions {
  /** 발표 자료 제목 */
  title: string;
  /** 부제목 */
  subtitle?: string;
  /** 섹션 목록 */
  sections: ProposalSection[];
  /** 출력 파일명 */
  filename?: string;
}

export function useMinuFramePresentation() {
  const { generatePresentation, ...rest } = usePptxGenerate();

  const generateProposal = useCallback(
    async (options: ProposalOptions): Promise<PptxGenerateResult> => {
      const { title, subtitle, sections, filename } = options;

      // 슬라이드 배열 구성
      const slides: SlideContent[] = [
        // 표지
        {
          type: 'title',
          title,
          subtitle: subtitle || `IDEA on Action | ${new Date().toLocaleDateString('ko-KR')}`,
        },
        // 목차
        {
          type: 'content',
          title: '목차',
          content: sections.map((s, i) => `${i + 1}. ${s.title}`),
        },
        // 각 섹션
        ...sections.map((section) => ({
          type: 'content' as const,
          title: section.title,
          content: section.points,
        })),
        // 마지막 슬라이드
        {
          type: 'title',
          title: '감사합니다',
          subtitle: 'Q&A',
        },
      ];

      return generatePresentation({
        slides,
        filename: filename || generateFileName(title),
        metadata: {
          title,
          author: 'IDEA on Action',
          company: '생각과행동',
          subject: '발표 자료',
        },
      });
    },
    [generatePresentation]
  );

  return { generateProposal, ...rest };
}

// ============================================================================
// 기본 내보내기
// ============================================================================

export default usePptxGenerate;
