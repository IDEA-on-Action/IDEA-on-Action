/**
 * PowerPoint Skills Module
 * TASK-CS-035: Minu Frame 발표 자료 생성 스킬
 *
 * @module skills/pptx
 */

// 메인 훅
export {
  usePptxGenerate,
  useMinuFramePresentation,
  type ProposalSection,
  type ProposalOptions,
} from './usePptxGenerate';

// 템플릿
export * from './templates';

// 타입 re-export
export type {
  SlideType,
  SlideContent,
  ChartType,
  ChartData,
  PresentationMetadata,
  BrandColors,
  PptxStyleOptions,
  PptxGenerateOptions,
  PptxGenerateResult,
  UsePptxGenerateReturn,
} from '@/types/pptx.types';

export {
  BRAND_COLORS,
  DEFAULT_STYLE,
  SLIDE_TYPE_LABELS,
  CHART_TYPE_LABELS,
  LAYOUT_LABELS,
} from '@/types/pptx.types';
