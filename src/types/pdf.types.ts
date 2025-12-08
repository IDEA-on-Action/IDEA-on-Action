/**
 * PDF 생성 타입 정의
 *
 * PDF 문서 생성, 변환, 병합 등을 위한 타입
 *
 * @module types/pdf
 */

import type { SkillError } from './skills.types';

// ============================================================================
// 페이지 포맷 및 방향
// ============================================================================

/**
 * 페이지 포맷
 */
export enum PageFormat {
  /** A4 (210 x 297 mm) */
  A4 = 'A4',
  /** Letter (8.5 x 11 inch) */
  Letter = 'Letter',
  /** Legal (8.5 x 14 inch) */
  Legal = 'Legal',
}

/**
 * 페이지 방향
 */
export enum PageOrientation {
  /** 세로 방향 */
  portrait = 'portrait',
  /** 가로 방향 */
  landscape = 'landscape',
}

// ============================================================================
// 페이지 크기 (포인트 단위)
// ============================================================================

/**
 * 페이지 크기 (포인트 단위: 1 inch = 72 points)
 */
export interface PageSize {
  /** 너비 (포인트) */
  width: number;
  /** 높이 (포인트) */
  height: number;
}

/**
 * 페이지 포맷별 크기 맵핑
 */
export const PAGE_SIZES: Record<PageFormat, PageSize> = {
  [PageFormat.A4]: {
    width: 595.28, // 210mm = 595.28pt
    height: 841.89, // 297mm = 841.89pt
  },
  [PageFormat.Letter]: {
    width: 612, // 8.5" = 612pt
    height: 792, // 11" = 792pt
  },
  [PageFormat.Legal]: {
    width: 612, // 8.5" = 612pt
    height: 1008, // 14" = 1008pt
  },
};

// ============================================================================
// 여백 및 메타데이터
// ============================================================================

/**
 * 페이지 여백 (포인트 단위)
 */
export interface PageMargins {
  /** 위쪽 여백 (포인트) */
  top: number;
  /** 오른쪽 여백 (포인트) */
  right: number;
  /** 아래쪽 여백 (포인트) */
  bottom: number;
  /** 왼쪽 여백 (포인트) */
  left: number;
}

/**
 * PDF 메타데이터
 */
export interface PDFMetadata {
  /** 문서 제목 */
  title?: string;
  /** 작성자 */
  author?: string;
  /** 주제 */
  subject?: string;
  /** 키워드 목록 */
  keywords?: string[];
  /** 생성자 (소프트웨어명) */
  creator?: string;
  /** 제작자 */
  producer?: string;
}

// ============================================================================
// PDF 생성 옵션
// ============================================================================

/**
 * PDF 생성 옵션
 */
export interface PDFGenerateOptions {
  /** 페이지 포맷 (기본값: A4) */
  format?: PageFormat;
  /** 페이지 방향 (기본값: portrait) */
  orientation?: PageOrientation;
  /** 페이지 여백 (포인트 단위, 기본값: { top: 72, right: 72, bottom: 72, left: 72 }) */
  margins?: Partial<PageMargins>;
  /** PDF 메타데이터 */
  metadata?: PDFMetadata;
  /** 압축 여부 (기본값: true) */
  compress?: boolean;
  /** 워터마크 텍스트 (선택) */
  watermark?: string;
  /** 워터마크 투명도 (0-1, 기본값: 0.3) */
  watermarkOpacity?: number;
}

// ============================================================================
// PDF 생성 결과
// ============================================================================

/**
 * PDF 생성 결과
 */
export interface PDFResult {
  /** 성공 여부 */
  success: boolean;
  /** Blob 객체 */
  blob?: Blob;
  /** 파일명 */
  fileName: string;
  /** 페이지 수 */
  pageCount?: number;
  /** 에러 메시지 */
  error?: string;
  /** 생성 일시 */
  generatedAt?: Date;
  /** 파일 크기 (bytes) */
  fileSize?: number;
}

// ============================================================================
// HTML → PDF 변환 옵션
// ============================================================================

/**
 * HTML을 PDF로 변환하는 옵션
 */
export interface HTMLToPDFOptions extends PDFGenerateOptions {
  /** HTML 콘텐츠 */
  html: string;
  /** CSS 스타일 (선택) */
  css?: string;
  /** 출력 파일명 */
  fileName?: string;
}

// ============================================================================
// Docx → PDF 변환 옵션
// ============================================================================

/**
 * Word 문서를 PDF로 변환하는 옵션
 */
export interface DocxToPDFOptions extends PDFGenerateOptions {
  /** Word 문서 Blob */
  docxBlob: Blob;
  /** 출력 파일명 */
  fileName?: string;
}

// ============================================================================
// PDF 병합 옵션
// ============================================================================

/**
 * PDF 병합 입력
 */
export interface PDFMergeInput {
  /** PDF Blob */
  blob: Blob;
  /** 파일명 (로깅용) */
  fileName?: string;
}

/**
 * PDF 병합 옵션
 */
export interface PDFMergeOptions {
  /** 병합할 PDF 목록 */
  pdfs: PDFMergeInput[];
  /** 출력 파일명 */
  fileName?: string;
  /** 메타데이터 */
  metadata?: PDFMetadata;
}

// ============================================================================
// 워터마크 옵션
// ============================================================================

/**
 * 워터마크 추가 옵션
 */
export interface WatermarkOptions {
  /** PDF Blob */
  pdfBlob: Blob;
  /** 워터마크 텍스트 */
  text: string;
  /** 투명도 (0-1, 기본값: 0.3) */
  opacity?: number;
  /** 폰트 크기 (포인트, 기본값: 48) */
  fontSize?: number;
  /** 회전 각도 (도, 기본값: 45) */
  rotation?: number;
  /** 색상 (RGB, 기본값: [0.7, 0.7, 0.7]) */
  color?: [number, number, number];
}

// ============================================================================
// 훅 반환 타입
// ============================================================================

/**
 * usePDFGenerate 훅 반환 타입
 */
export interface UsePDFGenerateReturn {
  /** HTML을 PDF로 변환 */
  generateFromHTML: (html: string, options?: Partial<PDFGenerateOptions>) => Promise<PDFResult>;
  /** Word 문서를 PDF로 변환 */
  generateFromDocx: (docxBlob: Blob, options?: Partial<PDFGenerateOptions>) => Promise<PDFResult>;
  /** PDF 병합 */
  mergePDFs: (pdfs: PDFMergeInput[], fileName?: string) => Promise<PDFResult>;
  /** 워터마크 추가 */
  addWatermark: (pdfBlob: Blob, text: string, options?: Partial<WatermarkOptions>) => Promise<PDFResult>;
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
// 기본값 상수
// ============================================================================

/**
 * 기본 페이지 여백 (1 inch = 72 points)
 */
export const DEFAULT_MARGINS: PageMargins = {
  top: 72,
  right: 72,
  bottom: 72,
  left: 72,
};

/**
 * 기본 PDF 생성 옵션
 */
export const DEFAULT_PDF_OPTIONS: Required<Omit<PDFGenerateOptions, 'metadata' | 'watermark'>> = {
  format: PageFormat.A4,
  orientation: PageOrientation.portrait,
  margins: DEFAULT_MARGINS,
  compress: true,
  watermarkOpacity: 0.3,
};
