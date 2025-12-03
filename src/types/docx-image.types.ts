/**
 * Word 문서 이미지 삽입 타입 정의
 *
 * PNG, JPEG 이미지 삽입을 위한 타입 및 인터페이스
 *
 * @module types/docx-image
 */

import { AlignmentType } from 'docx';

// ============================================================================
// 이미지 정렬 타입
// ============================================================================

/**
 * 이미지 정렬 타입
 */
export type DocxImageAlignment = 'left' | 'center' | 'right';

// ============================================================================
// 이미지 옵션
// ============================================================================

/**
 * 이미지 삽입 기본 옵션
 */
export interface DocxImageOptions {
  /** 이미지 너비 (픽셀) */
  width?: number;
  /** 이미지 높이 (픽셀) */
  height?: number;
  /** 정렬 */
  alignment?: DocxImageAlignment;
  /** 캡션 텍스트 */
  caption?: string;
}

/**
 * 차트 이미지 삽입 옵션
 */
export interface DocxChartImageOptions extends DocxImageOptions {
  /** 캡션 앞에 그림 번호 추가 여부 (기본값: true) */
  showFigureNumber?: boolean;
  /** 그림 번호 (선택, 자동 증가) */
  figureNumber?: number;
}

/**
 * 일반 이미지 삽입 옵션
 */
export interface DocxGeneralImageOptions extends DocxImageOptions {
  /** 이미지 URL 또는 Base64 데이터 */
  imageData: string;
}

// ============================================================================
// 차트 데이터 타입
// ============================================================================

/**
 * 차트 데이터 포인트
 */
export interface DocxChartDataPoint {
  /** 라벨 (X축) */
  label: string;
  /** 값 (Y축) */
  value: number;
}

/**
 * 차트 데이터셋
 */
export interface DocxChartDataset {
  /** 데이터셋 이름 */
  name: string;
  /** 데이터 포인트 배열 */
  data: DocxChartDataPoint[];
  /** 색상 (hex) */
  color?: string;
}

/**
 * 차트 타입
 */
export type DocxChartType = 'bar' | 'line' | 'pie' | 'doughnut';

/**
 * 차트 설정
 */
export interface DocxChartConfig {
  /** 차트 타입 */
  type: DocxChartType;
  /** 차트 제목 */
  title?: string;
  /** 데이터셋 */
  datasets: DocxChartDataset[];
  /** 차트 너비 (픽셀, 기본값: 600) */
  width?: number;
  /** 차트 높이 (픽셀, 기본값: 400) */
  height?: number;
}

// ============================================================================
// 이미지 삽입 결과
// ============================================================================

/**
 * 이미지 삽입 결과
 */
export interface DocxImageInsertResult {
  /** 성공 여부 */
  success: boolean;
  /** 이미지 크기 (bytes) */
  imageSize?: number;
  /** 생성 시간 (ms) */
  duration?: number;
  /** 에러 메시지 */
  error?: string;
}

/**
 * 차트 삽입 결과 (확장)
 */
export interface DocxChartInsertResult extends DocxImageInsertResult {
  /** 생성된 문단 수 */
  paragraphCount?: number;
}

// ============================================================================
// 이미지 크기 계산
// ============================================================================

/**
 * 이미지 크기
 */
export interface DocxImageSize {
  /** 너비 (픽셀) */
  width: number;
  /** 높이 (픽셀) */
  height: number;
}

/**
 * 이미지 크기 계산 옵션
 */
export interface DocxImageSizeOptions {
  /** 원본 너비 */
  originalWidth: number;
  /** 원본 높이 */
  originalHeight: number;
  /** 최대 너비 */
  maxWidth: number;
  /** 최대 높이 */
  maxHeight: number;
}

// ============================================================================
// docx 라이브러리 AlignmentType 매핑
// ============================================================================

/**
 * 문자열 정렬을 docx AlignmentType으로 변환
 */
export function mapAlignmentType(alignment?: DocxImageAlignment): AlignmentType {
  switch (alignment) {
    case 'left':
      return AlignmentType.LEFT;
    case 'center':
      return AlignmentType.CENTER;
    case 'right':
      return AlignmentType.RIGHT;
    default:
      return AlignmentType.CENTER;
  }
}

// ============================================================================
// 기본값 상수
// ============================================================================

/**
 * 기본 이미지 너비 (픽셀)
 */
export const DEFAULT_IMAGE_WIDTH = 400;

/**
 * 기본 이미지 높이 (픽셀)
 */
export const DEFAULT_IMAGE_HEIGHT = 300;

/**
 * 기본 차트 너비 (픽셀)
 */
export const DEFAULT_CHART_WIDTH = 600;

/**
 * 기본 차트 높이 (픽셀)
 */
export const DEFAULT_CHART_HEIGHT = 400;

/**
 * 지원하는 이미지 MIME 타입
 */
export const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'] as const;

/**
 * 지원하는 이미지 타입
 */
export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];
