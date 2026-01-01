/**
 * usePptxGenerate Hook
 * PowerPoint 프레젠테이션 생성을 위한 React 커스텀 훅
 *
 * pptxgenjs를 사용하여 동적 프레젠테이션 생성 기능 제공
 * - 진행률 표시
 * - Toast 알림 연동
 * - TanStack Query 통합
 * - 다양한 슬라이드 레이아웃 지원
 *
 * @module hooks/usePptxGenerate
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import type {
  PptxGenerateOptions,
  PptxGenerateResult,
  UsePptxGenerateReturn,
  SlideContent,
  TitleSlide,
  ContentSlide,
  TwoColumnSlide,
  ChartSlide,
  ImageSlide,
  QuoteSlide,
  PptxStyleOptions,
  PresentationMetadata,
  PPTX_BRAND_COLORS,
} from '@/types/documents/pptx.types';
import type { SkillError } from '@/types/ai/skills.types';

// ============================================================================
// 타입 가드
// ============================================================================

/**
 * TitleSlide 타입 가드
 */
function isTitleSlide(slide: SlideContent): slide is TitleSlide {
  return slide.type === 'title';
}

/**
 * ContentSlide 타입 가드
 */
function isContentSlide(slide: SlideContent): slide is ContentSlide {
  return slide.type === 'content';
}

/**
 * TwoColumnSlide 타입 가드
 */
function isTwoColumnSlide(slide: SlideContent): slide is TwoColumnSlide {
  return slide.type === 'twoColumn';
}

/**
 * ChartSlide 타입 가드
 */
function isChartSlide(slide: SlideContent): slide is ChartSlide {
  return slide.type === 'chart';
}

/**
 * ImageSlide 타입 가드
 */
function isImageSlide(slide: SlideContent): slide is ImageSlide {
  return slide.type === 'image';
}

/**
 * QuoteSlide 타입 가드
 */
function isQuoteSlide(slide: SlideContent): slide is QuoteSlide {
  return slide.type === 'quote';
}

// ============================================================================
// 에러 변환 유틸리티
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

// ============================================================================
// usePptxGenerate 훅
// ============================================================================

/**
 * PowerPoint 프레젠테이션 생성 훅
 *
 * @example
 * ```tsx
 * const { generatePresentation, isGenerating, progress, error, reset } = usePptxGenerate();
 *
 * const handleExport = async () => {
 *   await generatePresentation({
 *     slides: [
 *       {
 *         type: 'title',
 *         title: 'IDEA on Action',
 *         subtitle: '혁신적인 솔루션 제안',
 *       },
 *       {
 *         type: 'content',
 *         title: '주요 기능',
 *         content: ['AI 기반 분석', 'Real-time 협업', '자동화된 워크플로우'],
 *       },
 *     ],
 *     filename: 'proposal.pptx',
 *     metadata: {
 *       title: '제안서',
 *       author: 'IDEA on Action',
 *       company: '생각과행동',
 *     },
 *   });
 * };
 * ```
 */
export function usePptxGenerate(): UsePptxGenerateReturn {
  const [progress, setProgress] = useState(0);
  const [skillError, setSkillError] = useState<SkillError | null>(null);

  const mutation = useMutation({
    mutationFn: async (options: PptxGenerateOptions): Promise<PptxGenerateResult> => {
      setProgress(5);
      setSkillError(null);

      try {
        // pptxgenjs 라이브러리 동적 로딩
        const pptxgenjs = await import('pptxgenjs');
        const pptx = new pptxgenjs.default();
        setProgress(10);

        const { slides, filename, metadata, styles } = options;

        // 메타데이터 설정
        applyMetadata(pptx, metadata);
        setProgress(20);

        // 스타일 설정
        const styleOptions = getStyleOptions(styles);

        // 슬라이드 생성
        const totalSlides = slides.length;
        for (let i = 0; i < totalSlides; i++) {
          const slide = slides[i];
          const slideProgress = 20 + ((i + 1) / totalSlides) * 60;

          createSlide(pptx, slide, styleOptions);
          setProgress(Math.round(slideProgress));
        }

        setProgress(85);

        // Blob 생성
        const blob = (await pptx.write({
          outputType: 'blob',
        })) as Blob;

        setProgress(95);

        // 다운로드 트리거
        downloadBlob(blob, filename);

        setProgress(100);

        return {
          success: true,
          fileName: filename,
          blob,
          generatedAt: new Date(),
          fileSize: blob.size,
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
// 헬퍼 함수
// ============================================================================

/**
 * 메타데이터 적용
 */
function applyMetadata(
  pptx: InstanceType<typeof import('pptxgenjs').default>,
  metadata?: Partial<PresentationMetadata>
): void {
  if (!metadata) return;

  if (metadata.title) {
    pptx.title = metadata.title;
  }
  if (metadata.author) {
    pptx.author = metadata.author;
  }
  if (metadata.company) {
    pptx.company = metadata.company;
  }
  if (metadata.subject) {
    pptx.subject = metadata.subject;
  }
}

/**
 * 스타일 옵션 가져오기
 */
function getStyleOptions(styles?: PptxStyleOptions): Required<PptxStyleOptions> {
  const BRAND_COLORS = {
    primary: '#3B82F6',
    secondary: '#0F172A',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#06B6D4',
  } as const;

  return {
    primaryColor: styles?.primaryColor || BRAND_COLORS.primary,
    secondaryColor: styles?.secondaryColor || BRAND_COLORS.secondary,
    fontFamily: styles?.fontFamily || 'Noto Sans KR',
    fontSize: styles?.fontSize || 18,
  };
}

/**
 * 슬라이드 생성 (타입별 분기)
 */
function createSlide(
  pptx: InstanceType<typeof import('pptxgenjs').default>,
  slideContent: SlideContent,
  styles: Required<PptxStyleOptions>
): void {
  if (isTitleSlide(slideContent)) {
    createTitleSlide(pptx, slideContent, styles);
  } else if (isContentSlide(slideContent)) {
    createContentSlide(pptx, slideContent, styles);
  } else if (isTwoColumnSlide(slideContent)) {
    createTwoColumnSlide(pptx, slideContent, styles);
  } else if (isChartSlide(slideContent)) {
    createChartSlide(pptx, slideContent, styles);
  } else if (isImageSlide(slideContent)) {
    createImageSlide(pptx, slideContent, styles);
  } else if (isQuoteSlide(slideContent)) {
    createQuoteSlide(pptx, slideContent, styles);
  }
}

/**
 * 타이틀 슬라이드 생성
 */
function createTitleSlide(
  pptx: InstanceType<typeof import('pptxgenjs').default>,
  slide: TitleSlide,
  styles: Required<PptxStyleOptions>
): void {
  const newSlide = pptx.addSlide();

  // 배경색 설정
  if (slide.backgroundColor) {
    newSlide.background = { color: slide.backgroundColor };
  }

  // 제목
  newSlide.addText(slide.title, {
    x: 0.5,
    y: 2.0,
    w: 9.0,
    h: 1.5,
    fontSize: 44,
    bold: true,
    color: styles.primaryColor,
    align: 'center',
    fontFace: styles.fontFamily,
  });

  // 부제목
  if (slide.subtitle) {
    newSlide.addText(slide.subtitle, {
      x: 0.5,
      y: 3.5,
      w: 9.0,
      h: 0.8,
      fontSize: 24,
      color: styles.secondaryColor,
      align: 'center',
      fontFace: styles.fontFamily,
    });
  }

  // 발표자 노트
  if (slide.notes) {
    newSlide.addNotes(slide.notes);
  }
}

/**
 * 콘텐츠 슬라이드 생성
 */
function createContentSlide(
  pptx: InstanceType<typeof import('pptxgenjs').default>,
  slide: ContentSlide,
  styles: Required<PptxStyleOptions>
): void {
  const newSlide = pptx.addSlide();

  // 제목
  newSlide.addText(slide.title, {
    x: 0.5,
    y: 0.5,
    w: 9.0,
    h: 0.75,
    fontSize: 32,
    bold: true,
    color: styles.primaryColor,
    fontFace: styles.fontFamily,
  });

  // 콘텐츠 (bullet points)
  newSlide.addText(
    slide.content.map((text) => ({ text, options: { bullet: true } })),
    {
      x: 1.0,
      y: 1.5,
      w: 8.0,
      h: 4.0,
      fontSize: styles.fontSize,
      color: styles.secondaryColor,
      fontFace: styles.fontFamily,
    }
  );

  // 발표자 노트
  if (slide.notes) {
    newSlide.addNotes(slide.notes);
  }
}

/**
 * 2단 슬라이드 생성
 */
function createTwoColumnSlide(
  pptx: InstanceType<typeof import('pptxgenjs').default>,
  slide: TwoColumnSlide,
  styles: Required<PptxStyleOptions>
): void {
  const newSlide = pptx.addSlide();

  // 제목
  if (slide.title) {
    newSlide.addText(slide.title, {
      x: 0.5,
      y: 0.5,
      w: 9.0,
      h: 0.75,
      fontSize: 32,
      bold: true,
      color: styles.primaryColor,
      fontFace: styles.fontFamily,
    });
  }

  const contentY = slide.title ? 1.5 : 0.5;

  // 왼쪽 제목
  if (slide.leftTitle) {
    newSlide.addText(slide.leftTitle, {
      x: 0.5,
      y: contentY,
      w: 4.25,
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: styles.primaryColor,
      fontFace: styles.fontFamily,
    });
  }

  // 오른쪽 제목
  if (slide.rightTitle) {
    newSlide.addText(slide.rightTitle, {
      x: 5.25,
      y: contentY,
      w: 4.25,
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: styles.primaryColor,
      fontFace: styles.fontFamily,
    });
  }

  const bulletY = contentY + (slide.leftTitle || slide.rightTitle ? 0.75 : 0);

  // 왼쪽 콘텐츠
  newSlide.addText(
    slide.leftContent.map((text) => ({ text, options: { bullet: true } })),
    {
      x: 0.5,
      y: bulletY,
      w: 4.25,
      h: 4.0,
      fontSize: styles.fontSize,
      color: styles.secondaryColor,
      fontFace: styles.fontFamily,
    }
  );

  // 오른쪽 콘텐츠
  newSlide.addText(
    slide.rightContent.map((text) => ({ text, options: { bullet: true } })),
    {
      x: 5.25,
      y: bulletY,
      w: 4.25,
      h: 4.0,
      fontSize: styles.fontSize,
      color: styles.secondaryColor,
      fontFace: styles.fontFamily,
    }
  );

  // 발표자 노트
  if (slide.notes) {
    newSlide.addNotes(slide.notes);
  }
}

/**
 * 차트 슬라이드 생성
 */
function createChartSlide(
  pptx: InstanceType<typeof import('pptxgenjs').default>,
  slide: ChartSlide,
  styles: Required<PptxStyleOptions>
): void {
  const newSlide = pptx.addSlide();

  // 제목
  if (slide.title) {
    newSlide.addText(slide.title, {
      x: 0.5,
      y: 0.5,
      w: 9.0,
      h: 0.75,
      fontSize: 32,
      bold: true,
      color: styles.primaryColor,
      fontFace: styles.fontFamily,
    });
  }

  const chartY = slide.title ? 1.5 : 0.5;

  // 차트 데이터 변환
  const chartData = [
    {
      name: slide.chartData.seriesName || 'Data',
      labels: slide.chartData.labels,
      values: slide.chartData.values,
    },
  ];

  // 차트 타입 매핑
  const chartTypeMap = {
    line: pptx.ChartType.line,
    bar: pptx.ChartType.bar,
    pie: pptx.ChartType.pie,
    area: pptx.ChartType.area,
  } as const;

  // 차트 추가
  newSlide.addChart(chartTypeMap[slide.chartData.type], chartData, {
    x: 1.0,
    y: chartY,
    w: 8.0,
    h: 4.5,
    showLegend: slide.showLegend !== false,
    showLabel: slide.showDataLabels || false,
    chartColors: [styles.primaryColor],
  });

  // 발표자 노트
  if (slide.notes) {
    newSlide.addNotes(slide.notes);
  }
}

/**
 * 이미지 슬라이드 생성
 */
function createImageSlide(
  pptx: InstanceType<typeof import('pptxgenjs').default>,
  slide: ImageSlide,
  styles: Required<PptxStyleOptions>
): void {
  const newSlide = pptx.addSlide();

  // 제목
  if (slide.title) {
    newSlide.addText(slide.title, {
      x: 0.5,
      y: 0.5,
      w: 9.0,
      h: 0.75,
      fontSize: 32,
      bold: true,
      color: styles.primaryColor,
      fontFace: styles.fontFamily,
    });
  }

  const imageY = slide.title ? 1.5 : 0.5;
  const imageSource = slide.imageUrl || slide.imageBase64;

  if (imageSource) {
    // 레이아웃별 이미지 위치 설정
    const imageOptions = getImageOptions(slide.imageLayout || 'center', imageY);

    newSlide.addImage({
      path: imageSource,
      ...imageOptions,
    });
  }

  // 캡션
  if (slide.caption) {
    newSlide.addText(slide.caption, {
      x: 0.5,
      y: 6.0,
      w: 9.0,
      h: 0.5,
      fontSize: 14,
      italic: true,
      color: styles.secondaryColor,
      align: 'center',
      fontFace: styles.fontFamily,
    });
  }

  // 발표자 노트
  if (slide.notes) {
    newSlide.addNotes(slide.notes);
  }
}

/**
 * 인용 슬라이드 생성
 */
function createQuoteSlide(
  pptx: InstanceType<typeof import('pptxgenjs').default>,
  slide: QuoteSlide,
  styles: Required<PptxStyleOptions>
): void {
  const newSlide = pptx.addSlide();

  // 인용 텍스트
  newSlide.addText(`"${slide.quoteText}"`, {
    x: 1.0,
    y: 2.5,
    w: 8.0,
    h: 2.0,
    fontSize: 28,
    italic: true,
    color: styles.secondaryColor,
    align: 'center',
    fontFace: styles.fontFamily,
  });

  // 인용 출처
  if (slide.quoteAuthor) {
    newSlide.addText(`— ${slide.quoteAuthor}`, {
      x: 1.0,
      y: 4.5,
      w: 8.0,
      h: 0.5,
      fontSize: 18,
      color: styles.primaryColor,
      align: 'center',
      fontFace: styles.fontFamily,
    });
  }

  // 발표자 노트
  if (slide.notes) {
    newSlide.addNotes(slide.notes);
  }
}

/**
 * 이미지 레이아웃 옵션 가져오기
 */
function getImageOptions(
  layout: 'full' | 'left' | 'right' | 'center',
  y: number
): { x: number; y: number; w: number; h: number } {
  switch (layout) {
    case 'full':
      return { x: 0.5, y, w: 9.0, h: 5.0 };
    case 'left':
      return { x: 0.5, y, w: 4.5, h: 4.0 };
    case 'right':
      return { x: 5.0, y, w: 4.5, h: 4.0 };
    case 'center':
    default:
      return { x: 2.0, y, w: 6.0, h: 4.0 };
  }
}

/**
 * Blob 다운로드
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pptx') ? filename : `${filename}.pptx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// 기본 내보내기
// ============================================================================

export default usePptxGenerate;
