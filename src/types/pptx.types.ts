/**
 * PowerPoint 생성 타입 정의
 *
 * Minu Frame 서비스를 위한 PowerPoint 발표 자료 생성 타입
 *
 * @module types/pptx
 */

import type { SkillError } from './skills.types';

// ============================================================================
// 슬라이드 기본 타입
// ============================================================================

/**
 * 슬라이드 유형
 */
export type SlideType = 'title' | 'content' | 'twoColumn' | 'chart' | 'image' | 'comparison' | 'quote';

/**
 * 차트 유형
 */
export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'area';

/**
 * 차트 데이터
 */
export interface ChartData {
  /** 차트 유형 */
  type: ChartType;
  /** 레이블 (X축) */
  labels: string[];
  /** 값 (Y축) */
  values: number[];
  /** 차트 제목 */
  title?: string;
  /** 데이터 시리즈 이름 */
  seriesName?: string;
  /** 색상 (hex) */
  color?: string;
}

/**
 * 이미지 레이아웃 타입
 */
export type ImageLayout = 'full' | 'left' | 'right' | 'center';

/**
 * 슬라이드 콘텐츠
 */
export interface SlideContent {
  /** 슬라이드 유형 */
  type: SlideType;
  /** 슬라이드 제목 */
  title?: string;
  /** 부제목 (title 슬라이드용) */
  subtitle?: string;
  /** 콘텐츠 목록 (content 슬라이드용) */
  content?: string[];
  /** 왼쪽 컬럼 콘텐츠 (twoColumn 슬라이드용) */
  leftContent?: string[];
  /** 오른쪽 컬럼 콘텐츠 (twoColumn 슬라이드용) */
  rightContent?: string[];
  /** 왼쪽 컬럼 제목 */
  leftTitle?: string;
  /** 오른쪽 컬럼 제목 */
  rightTitle?: string;
  /** 차트 데이터 (chart 슬라이드용) */
  chartData?: ChartData;
  /** 이미지 URL (image 슬라이드용) */
  imageUrl?: string;
  /** 이미지 Base64 (image 슬라이드용) */
  imageBase64?: string;
  /** 이미지 레이아웃 (image 슬라이드용) */
  imageLayout?: ImageLayout;
  /** 캡션 (image 슬라이드용) */
  caption?: string;
  /** 인용문 텍스트 (quote 슬라이드용) */
  quoteText?: string;
  /** 인용문 출처 (quote 슬라이드용) */
  quoteAuthor?: string;
  /** 범례 표시 여부 (chart 슬라이드용) */
  showLegend?: boolean;
  /** 데이터 레이블 표시 여부 (chart 슬라이드용) */
  showDataLabels?: boolean;
  /** 슬라이드 노트 */
  notes?: string;
}

// ============================================================================
// 프레젠테이션 메타데이터
// ============================================================================

/**
 * 프레젠테이션 메타데이터
 */
export interface PresentationMetadata {
  /** 프레젠테이션 제목 */
  title: string;
  /** 작성자 */
  author: string;
  /** 회사명 */
  company?: string;
  /** 주제 */
  subject?: string;
  /** 키워드 */
  keywords?: string[];
  /** 생성 일시 */
  createdAt: Date;
  /** 수정 일시 */
  modifiedAt?: Date;
}

// ============================================================================
// 스타일 옵션
// ============================================================================

/**
 * 브랜드 색상 테마
 */
export interface BrandColors {
  /** 주요 색상 */
  primary: string;
  /** 보조 색상 */
  secondary: string;
  /** 배경 색상 */
  background: string;
  /** 텍스트 색상 */
  text: string;
  /** 강조 색상 */
  accent: string;
}

/**
 * IDEA on Action 기본 브랜드 색상
 */
export const BRAND_COLORS: BrandColors = {
  primary: '3B82F6',     // Blue 500
  secondary: '1E40AF',   // Blue 800
  background: 'FFFFFF',  // White
  text: '1F2937',        // Gray 800
  accent: '10B981',      // Emerald 500
};

/**
 * 프레젠테이션 스타일 옵션
 */
export interface PptxStyleOptions {
  /** 브랜드 색상 */
  colors?: Partial<BrandColors>;
  /** 제목 폰트 */
  titleFont?: string;
  /** 본문 폰트 */
  bodyFont?: string;
  /** 제목 폰트 크기 (pt) */
  titleFontSize?: number;
  /** 본문 폰트 크기 (pt) */
  bodyFontSize?: number;
  /** 레이아웃 (16:9 또는 4:3) */
  layout?: 'LAYOUT_16x9' | 'LAYOUT_4x3';
}

/**
 * 기본 스타일 설정
 */
export const DEFAULT_STYLE: Required<PptxStyleOptions> = {
  colors: BRAND_COLORS,
  titleFont: 'Pretendard',
  bodyFont: 'Pretendard',
  titleFontSize: 44,
  bodyFontSize: 18,
  layout: 'LAYOUT_16x9',
};

// ============================================================================
// 생성 옵션 및 결과
// ============================================================================

/**
 * PowerPoint 생성 옵션
 */
export interface PptxGenerateOptions {
  /** 슬라이드 목록 */
  slides: SlideContent[];
  /** 출력 파일명 */
  filename: string;
  /** 메타데이터 */
  metadata?: Partial<PresentationMetadata>;
  /** 스타일 옵션 */
  styles?: PptxStyleOptions;
}

/**
 * PowerPoint 생성 결과
 */
export interface PptxGenerateResult {
  /** 성공 여부 */
  success: boolean;
  /** 파일명 */
  fileName: string;
  /** Blob 객체 */
  blob?: Blob;
  /** 에러 메시지 */
  error?: string;
  /** 생성 일시 */
  generatedAt: Date;
  /** 파일 크기 (bytes) */
  fileSize?: number;
  /** 슬라이드 개수 */
  slideCount?: number;
}

// ============================================================================
// 훅 반환 타입
// ============================================================================

/**
 * usePptxGenerate 훅 반환 타입
 */
export interface UsePptxGenerateReturn {
  /** 프레젠테이션 생성 함수 */
  generatePresentation: (options: PptxGenerateOptions) => Promise<PptxGenerateResult>;
  /** 생성 중 여부 */
  isGenerating: boolean;
  /** 진행률 (0-100) */
  progress: number;
  /** 에러 정보 */
  error: SkillError | null;
  /** 상태 초기화 */
  reset: () => void;
}

// ============================================================================
// 슬라이드 빌더 타입
// ============================================================================

/**
 * 슬라이드 빌더 옵션 (공통)
 */
export interface SlideBuilderOptions {
  /** 슬라이드 객체 (pptxgenjs Slide) */
  slide: unknown;
  /** 슬라이드 콘텐츠 */
  content: SlideContent;
  /** 스타일 옵션 */
  styles: Required<PptxStyleOptions>;
}

/**
 * 슬라이드 빌더 함수 타입
 */
export type SlideBuilder = (options: SlideBuilderOptions) => void;

// ============================================================================
// 라벨 상수
// ============================================================================

/**
 * 슬라이드 유형 라벨
 */
export const SLIDE_TYPE_LABELS: Record<SlideType, string> = {
  title: '제목 슬라이드',
  content: '내용 슬라이드',
  twoColumn: '2단 레이아웃',
  chart: '차트 슬라이드',
  image: '이미지 슬라이드',
  comparison: '비교 슬라이드',
  quote: '인용문 슬라이드',
};

/**
 * 차트 유형 라벨
 */
export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: '막대 차트',
  line: '선 차트',
  pie: '파이 차트',
  doughnut: '도넛 차트',
  area: '영역 차트',
};

/**
 * 레이아웃 라벨
 */
export const LAYOUT_LABELS: Record<string, string> = {
  'LAYOUT_16x9': '16:9 (와이드)',
  'LAYOUT_4x3': '4:3 (표준)',
};
