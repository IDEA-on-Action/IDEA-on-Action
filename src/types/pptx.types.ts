/**
 * PowerPoint 프레젠테이션 생성 타입 정의
 *
 * 프레젠테이션, 슬라이드, 차트 등 PowerPoint 문서 생성을 위한 타입
 *
 * @module types/pptx
 */

import type { SkillError } from './skills.types';

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
  author?: string;
  /** 회사명 */
  company?: string;
  /** 주제 */
  subject?: string;
  /** 키워드 목록 */
  keywords?: string[];
}

// ============================================================================
// 슬라이드 타입
// ============================================================================

/**
 * 슬라이드 콘텐츠 타입
 */
export type SlideContent =
  | TitleSlide
  | ContentSlide
  | TwoColumnSlide
  | ChartSlide
  | ImageSlide
  | QuoteSlide;

/**
 * 타이틀 슬라이드
 */
export interface TitleSlide {
  /** 슬라이드 타입 */
  type: 'title';
  /** 제목 */
  title: string;
  /** 부제목 */
  subtitle?: string;
  /** 배경색 (hex) */
  backgroundColor?: string;
  /** 발표자 노트 */
  notes?: string;
}

/**
 * 콘텐츠 슬라이드
 */
export interface ContentSlide {
  /** 슬라이드 타입 */
  type: 'content';
  /** 제목 */
  title: string;
  /** 콘텐츠 목록 (bullet points) */
  content: string[];
  /** 발표자 노트 */
  notes?: string;
}

/**
 * 2단 슬라이드
 */
export interface TwoColumnSlide {
  /** 슬라이드 타입 */
  type: 'twoColumn';
  /** 제목 */
  title?: string;
  /** 왼쪽 제목 */
  leftTitle?: string;
  /** 오른쪽 제목 */
  rightTitle?: string;
  /** 왼쪽 콘텐츠 */
  leftContent: string[];
  /** 오른쪽 콘텐츠 */
  rightContent: string[];
  /** 발표자 노트 */
  notes?: string;
}

/**
 * 차트 슬라이드
 */
export interface ChartSlide {
  /** 슬라이드 타입 */
  type: 'chart';
  /** 제목 */
  title?: string;
  /** 차트 데이터 */
  chartData: PptxChartData;
  /** 범례 표시 여부 */
  showLegend?: boolean;
  /** 데이터 레이블 표시 여부 */
  showDataLabels?: boolean;
  /** 발표자 노트 */
  notes?: string;
}

/**
 * 이미지 슬라이드
 */
export interface ImageSlide {
  /** 슬라이드 타입 */
  type: 'image';
  /** 제목 */
  title?: string;
  /** 이미지 URL */
  imageUrl?: string;
  /** 이미지 Base64 */
  imageBase64?: string;
  /** 이미지 레이아웃 */
  imageLayout?: 'full' | 'left' | 'right' | 'center';
  /** 캡션 */
  caption?: string;
  /** 발표자 노트 */
  notes?: string;
}

/**
 * 인용 슬라이드
 */
export interface QuoteSlide {
  /** 슬라이드 타입 */
  type: 'quote';
  /** 인용 텍스트 */
  quoteText: string;
  /** 인용 출처 */
  quoteAuthor?: string;
  /** 발표자 노트 */
  notes?: string;
}

// ============================================================================
// 차트 데이터
// ============================================================================

/**
 * 차트 데이터
 */
export interface PptxChartData {
  /** 차트 타입 */
  type: 'line' | 'bar' | 'pie' | 'area';
  /** 레이블 목록 */
  labels: string[];
  /** 데이터 값 */
  values: number[];
  /** 시리즈명 */
  seriesName?: string;
}

// ============================================================================
// 스타일 옵션
// ============================================================================

/**
 * 프레젠테이션 스타일 옵션
 */
export interface PptxStyleOptions {
  /** 주요 색상 (hex) */
  primaryColor?: string;
  /** 보조 색상 (hex) */
  secondaryColor?: string;
  /** 폰트 패밀리 */
  fontFamily?: string;
  /** 기본 폰트 크기 (pt) */
  fontSize?: number;
}

// ============================================================================
// 생성 옵션
// ============================================================================

/**
 * 프레젠테이션 생성 옵션
 */
export interface PptxGenerateOptions {
  /** 슬라이드 목록 */
  slides: SlideContent[];
  /** 파일명 */
  filename: string;
  /** 메타데이터 */
  metadata?: Partial<PresentationMetadata>;
  /** 스타일 옵션 */
  styles?: PptxStyleOptions;
}

// ============================================================================
// 생성 결과
// ============================================================================

/**
 * 프레젠테이션 생성 결과
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
// 브랜드 색상 상수
// ============================================================================

/**
 * 브랜드 색상
 */
export const PPTX_BRAND_COLORS = {
  primary: '#3B82F6',
  secondary: '#0F172A',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
} as const;
