/**
 * docx 이미지 삽입 유틸리티
 *
 * Word 문서에 차트 이미지, 로고, 스크린샷 등을 삽입하는 헬퍼 함수를 제공합니다.
 * Canvas API로 생성한 차트를 Base64로 변환하여 문서에 삽입합니다.
 *
 * @module lib/skills/docx-image
 */

import {
  Paragraph,
  ImageRun,
  AlignmentType,
  TextRun,
} from 'docx';
import type { AnyChartConfig } from '@/types/documents/xlsx-chart.types';
import { generateChartImage } from '@/skills/xlsx/chart/chart-utils';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 차트 이미지 삽입 옵션
 */
export interface ChartImageOptions {
  /** 이미지 너비 (기본값: 600) */
  width?: number;
  /** 이미지 높이 (기본값: 400) */
  height?: number;
  /** 정렬 (기본값: CENTER) */
  alignment?: AlignmentType;
  /** 캡션 (선택) */
  caption?: string;
  /** 캡션 앞에 그림 번호 추가 여부 (기본값: true) */
  showFigureNumber?: boolean;
  /** 그림 번호 (선택, 자동 증가) */
  figureNumber?: number;
}

/**
 * 일반 이미지 삽입 옵션
 */
export interface ImageInsertOptions {
  /** 이미지 URL 또는 Base64 데이터 */
  imageData: string;
  /** 이미지 너비 */
  width?: number;
  /** 이미지 높이 */
  height?: number;
  /** 정렬 */
  alignment?: AlignmentType;
  /** 캡션 */
  caption?: string;
}

/**
 * 차트 삽입 결과
 */
export interface ChartInsertResult {
  /** 생성된 문단 배열 */
  paragraphs: Paragraph[];
  /** 차트 이미지 크기 (bytes) */
  imageSize: number;
  /** 생성 시간 (ms) */
  duration: number;
}

// ============================================================================
// 차트 이미지 생성 및 삽입
// ============================================================================

/**
 * 차트를 Word 문서에 삽입 가능한 Paragraph 배열로 변환
 *
 * Canvas로 생성한 차트를 Base64로 변환하여 ImageRun으로 삽입합니다.
 *
 * @param chart - 차트 설정
 * @param options - 이미지 옵션
 * @returns 차트 삽입 결과 (문단 배열, 크기, 시간)
 *
 * @example
 * ```typescript
 * import { Document, Packer } from 'docx';
 *
 * const chartConfig: LineChartConfig = {
 *   type: 'line',
 *   data: [
 *     { label: '2025-11-01', value: 10 },
 *     { label: '2025-11-02', value: 15 },
 *   ],
 *   title: '일별 이벤트 수',
 *   position: { row: 0, col: 0 },
 * };
 *
 * const result = await insertChartToDocx(chartConfig, {
 *   width: 600,
 *   height: 400,
 *   caption: '일별 이벤트 트렌드',
 *   figureNumber: 1,
 * });
 *
 * const doc = new Document({
 *   sections: [
 *     {
 *       children: [
 *         new Paragraph({ text: '## 데이터 분석' }),
 *         ...result.paragraphs,
 *       ],
 *     },
 *   ],
 * });
 *
 * const blob = await Packer.toBlob(doc);
 * ```
 */
export async function insertChartToDocx(
  chart: AnyChartConfig,
  options?: ChartImageOptions
): Promise<ChartInsertResult> {
  const {
    width = 600,
    height = 400,
    alignment = AlignmentType.CENTER,
    caption,
    showFigureNumber = true,
    figureNumber,
  } = options || {};

  // 차트 이미지 생성
  const rendered = await generateChartImage(chart, { width, height });

  // Blob → ArrayBuffer 변환
  const arrayBuffer = await rendered.blob.arrayBuffer();

  // ImageRun 생성
  const imageRun = new ImageRun({
    data: arrayBuffer,
    transformation: {
      width,
      height,
    },
  });

  const paragraphs: Paragraph[] = [];

  // 이미지 문단
  paragraphs.push(
    new Paragraph({
      children: [imageRun],
      alignment,
      spacing: { before: 240, after: 120 },
    })
  );

  // 캡션 추가
  if (caption) {
    const captionText = showFigureNumber && figureNumber
      ? `그림 ${figureNumber}. ${caption}`
      : caption;

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: captionText,
            italics: true,
            size: 20, // 10pt
          }),
        ],
        alignment,
        spacing: { after: 240 },
      })
    );
  }

  return {
    paragraphs,
    imageSize: rendered.size,
    duration: rendered.duration,
  };
}

// ============================================================================
// 다중 차트 삽입
// ============================================================================

/**
 * 여러 차트를 순차적으로 삽입
 *
 * @param charts - 차트 설정 배열
 * @param options - 공통 이미지 옵션
 * @returns 모든 차트의 문단 배열
 *
 * @example
 * ```typescript
 * const charts = [lineChart, barChart, pieChart];
 * const results = await insertMultipleChartsToDocx(charts, {
 *   width: 600,
 *   height: 400,
 *   showFigureNumber: true,
 * });
 *
 * const allParagraphs = results.flatMap(r => r.paragraphs);
 * ```
 */
export async function insertMultipleChartsToDocx(
  charts: AnyChartConfig[],
  options?: ChartImageOptions
): Promise<ChartInsertResult[]> {
  const results: ChartInsertResult[] = [];

  for (let i = 0; i < charts.length; i++) {
    const chart = charts[i];
    const result = await insertChartToDocx(chart, {
      ...options,
      caption: options?.caption || chart.title,
      figureNumber: options?.figureNumber ?? i + 1,
    });
    results.push(result);
  }

  return results;
}

// ============================================================================
// URL/Base64 이미지 삽입
// ============================================================================

/**
 * URL 또는 Base64 이미지를 Word 문서에 삽입
 *
 * @param options - 이미지 삽입 옵션
 * @returns 이미지 문단 배열
 *
 * @example
 * ```typescript
 * // URL 이미지
 * const urlParagraphs = await insertImageToDocx({
 *   imageData: 'https://example.com/logo.png',
 *   width: 200,
 *   height: 100,
 *   caption: '회사 로고',
 * });
 *
 * // Base64 이미지
 * const base64Paragraphs = await insertImageToDocx({
 *   imageData: 'data:image/png;base64,iVBORw0KGgoAAAA...',
 *   width: 400,
 *   height: 300,
 * });
 * ```
 */
export async function insertImageToDocx(
  options: ImageInsertOptions
): Promise<Paragraph[]> {
  const {
    imageData,
    width = 400,
    height = 300,
    alignment = AlignmentType.CENTER,
    caption,
  } = options;

  let arrayBuffer: ArrayBuffer;

  // URL인 경우 fetch
  if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
    const response = await fetch(imageData);
    if (!response.ok) {
      throw new Error(`이미지 로드 실패: ${response.statusText}`);
    }
    arrayBuffer = await response.arrayBuffer();
  }
  // Base64인 경우 디코딩
  else if (imageData.startsWith('data:image/')) {
    const base64 = imageData.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    arrayBuffer = bytes.buffer;
  } else {
    throw new Error('지원하지 않는 이미지 형식입니다. URL 또는 Base64 데이터를 제공하세요.');
  }

  // ImageRun 생성
  const imageRun = new ImageRun({
    data: arrayBuffer,
    transformation: {
      width,
      height,
    },
  });

  const paragraphs: Paragraph[] = [];

  // 이미지 문단
  paragraphs.push(
    new Paragraph({
      children: [imageRun],
      alignment,
      spacing: { before: 240, after: 120 },
    })
  );

  // 캡션 추가
  if (caption) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: caption,
            italics: true,
            size: 20, // 10pt
          }),
        ],
        alignment,
        spacing: { after: 240 },
      })
    );
  }

  return paragraphs;
}

// ============================================================================
// 이미지 크기 자동 조정
// ============================================================================

/**
 * 이미지 비율을 유지하면서 최대 크기에 맞게 조정
 *
 * @param originalWidth - 원본 너비
 * @param originalHeight - 원본 높이
 * @param maxWidth - 최대 너비
 * @param maxHeight - 최대 높이
 * @returns 조정된 크기
 *
 * @example
 * ```typescript
 * const size = calculateImageSize(1920, 1080, 600, 400);
 * // { width: 600, height: 337 } (16:9 비율 유지)
 * ```
 */
export function calculateImageSize(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;

  let width = maxWidth;
  let height = maxWidth / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = maxHeight * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}
