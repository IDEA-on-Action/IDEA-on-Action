/**
 * PowerPoint Core 라이브러리
 *
 * 프레젠테이션 생성, 슬라이드 추가, 요소 추가 등 핵심 기능
 *
 * @module lib/skills/pptx/core
 */

import type {
  Presentation,
  Slide,
  SlideLayout,
  Position,
  AddSlideOptions,
  AddTextBoxOptions,
  AddImageOptions,
  CreatePresentationOptions,
  ExportPresentationResult,
  SlideContent,
  TextStyle,
  PptxChartData,
} from '@/types/documents/pptx.types';

// ============================================================================
// 동적 import 헬퍼
// ============================================================================

/**
 * pptxgenjs를 동적으로 import
 *
 * 번들 최적화를 위해 필요할 때만 로드
 *
 * @returns pptxgenjs 모듈
 */
async function loadPptxGen() {
  const pptxgen = await import('pptxgenjs');
  return pptxgen.default;
}

// ============================================================================
// 프레젠테이션 생성
// ============================================================================

/**
 * 새로운 프레젠테이션 생성
 *
 * @param options - 프레젠테이션 생성 옵션
 * @returns 프레젠테이션 객체
 *
 * @example
 * ```typescript
 * const presentation = createPresentation({
 *   metadata: {
 *     title: '월간 보고서',
 *     author: '홍길동',
 *   },
 *   styles: {
 *     primaryColor: '#3B82F6',
 *     fontFamily: 'Arial',
 *   },
 * });
 * ```
 */
export function createPresentation(
  options?: CreatePresentationOptions
): Presentation {
  const presentation: Presentation = {
    id: crypto.randomUUID(),
    metadata: {
      title: options?.metadata?.title || '새 프레젠테이션',
      author: options?.metadata?.author,
      company: options?.metadata?.company,
      subject: options?.metadata?.subject,
      keywords: options?.metadata?.keywords,
    },
    slides: [],
    styles: options?.styles,
  };

  return presentation;
}

// ============================================================================
// 슬라이드 추가
// ============================================================================

/**
 * 프레젠테이션에 슬라이드 추가
 *
 * @param presentation - 프레젠테이션 객체
 * @param options - 슬라이드 추가 옵션
 * @returns 추가된 슬라이드
 *
 * @example
 * ```typescript
 * const slide = addSlide(presentation, {
 *   layout: SlideLayout.TITLE,
 *   title: '프로젝트 개요',
 *   content: {
 *     type: 'title',
 *     title: '프로젝트 개요',
 *     subtitle: '2025년 1분기',
 *   },
 * });
 * ```
 */
export function addSlide(
  presentation: Presentation,
  options: AddSlideOptions
): Slide {
  const slide: Slide = {
    id: crypto.randomUUID(),
    layout: options.layout,
    title: options.title,
    elements: [],
    backgroundColor: options.backgroundColor,
    notes: options.notes,
  };

  // 콘텐츠 기반으로 요소 추가
  if (options.content) {
    addContentToSlide(slide, options.content);
  }

  presentation.slides.push(slide);
  return slide;
}

/**
 * 슬라이드에 콘텐츠 추가 (내부 헬퍼)
 *
 * @param slide - 슬라이드 객체
 * @param content - 슬라이드 콘텐츠
 */
function addContentToSlide(slide: Slide, content: SlideContent): void {
  switch (content.type) {
    case 'title':
      // 제목 슬라이드
      if (content.title) {
        slide.elements.push({
          type: 'text',
          text: content.title,
          position: { x: 0.5, y: 2.5, w: 9, h: 1 },
          style: { fontSize: 44, bold: true, align: 'center' },
        });
      }
      if (content.subtitle) {
        slide.elements.push({
          type: 'text',
          text: content.subtitle,
          position: { x: 0.5, y: 3.7, w: 9, h: 0.5 },
          style: { fontSize: 24, align: 'center' },
        });
      }
      break;

    case 'content':
      // 콘텐츠 슬라이드
      if (content.title) {
        slide.elements.push({
          type: 'text',
          text: content.title,
          position: { x: 0.5, y: 0.5, w: 9, h: 0.75 },
          style: { fontSize: 32, bold: true },
        });
      }
      // 콘텐츠 목록 추가
      content.content.forEach((item, index) => {
        slide.elements.push({
          type: 'text',
          text: `• ${item}`,
          position: { x: 1, y: 1.5 + index * 0.5, w: 8, h: 0.4 },
          style: { fontSize: 18 },
        });
      });
      break;

    case 'twoColumn':
      // 2단 레이아웃
      if (content.title) {
        slide.elements.push({
          type: 'text',
          text: content.title,
          position: { x: 0.5, y: 0.5, w: 9, h: 0.75 },
          style: { fontSize: 32, bold: true },
        });
      }
      // 왼쪽 컬럼
      if (content.leftTitle) {
        slide.elements.push({
          type: 'text',
          text: content.leftTitle,
          position: { x: 0.5, y: 1.5, w: 4, h: 0.5 },
          style: { fontSize: 24, bold: true },
        });
      }
      content.leftContent.forEach((item, index) => {
        slide.elements.push({
          type: 'text',
          text: `• ${item}`,
          position: { x: 0.75, y: 2.2 + index * 0.4, w: 3.5, h: 0.3 },
          style: { fontSize: 16 },
        });
      });
      // 오른쪽 컬럼
      if (content.rightTitle) {
        slide.elements.push({
          type: 'text',
          text: content.rightTitle,
          position: { x: 5.5, y: 1.5, w: 4, h: 0.5 },
          style: { fontSize: 24, bold: true },
        });
      }
      content.rightContent.forEach((item, index) => {
        slide.elements.push({
          type: 'text',
          text: `• ${item}`,
          position: { x: 5.75, y: 2.2 + index * 0.4, w: 3.5, h: 0.3 },
          style: { fontSize: 16 },
        });
      });
      break;

    case 'chart':
      // 차트 슬라이드
      if (content.title) {
        slide.elements.push({
          type: 'text',
          text: content.title,
          position: { x: 0.5, y: 0.5, w: 9, h: 0.75 },
          style: { fontSize: 32, bold: true },
        });
      }
      slide.elements.push({
        type: 'chart',
        chartData: content.chartData,
        position: { x: 1, y: 1.5, w: 8, h: 4 },
        showLegend: content.showLegend ?? true,
        showDataLabels: content.showDataLabels ?? false,
      });
      break;

    case 'image':
      // 이미지 슬라이드
      if (content.title) {
        slide.elements.push({
          type: 'text',
          text: content.title,
          position: { x: 0.5, y: 0.5, w: 9, h: 0.75 },
          style: { fontSize: 32, bold: true },
        });
      }
      if (content.imageUrl || content.imageBase64) {
        const imageData = content.imageUrl || content.imageBase64 || '';
        let imagePosition: Position;

        switch (content.imageLayout) {
          case 'full':
            imagePosition = { x: 0, y: 0, w: 10, h: 5.625 };
            break;
          case 'left':
            imagePosition = { x: 0.5, y: 1.5, w: 4, h: 4 };
            break;
          case 'right':
            imagePosition = { x: 5.5, y: 1.5, w: 4, h: 4 };
            break;
          case 'center':
          default:
            imagePosition = { x: 2, y: 1.5, w: 6, h: 4 };
            break;
        }

        slide.elements.push({
          type: 'image',
          imageData,
          position: imagePosition,
          altText: content.caption,
        });
      }
      if (content.caption) {
        slide.elements.push({
          type: 'text',
          text: content.caption,
          position: { x: 0.5, y: 5.5, w: 9, h: 0.3 },
          style: { fontSize: 14, italic: true, align: 'center' },
        });
      }
      break;

    case 'quote':
      // 인용 슬라이드
      slide.elements.push({
        type: 'text',
        text: `"${content.quoteText}"`,
        position: { x: 1, y: 2, w: 8, h: 2 },
        style: { fontSize: 32, italic: true, align: 'center' },
      });
      if (content.quoteAuthor) {
        slide.elements.push({
          type: 'text',
          text: `— ${content.quoteAuthor}`,
          position: { x: 1, y: 4.2, w: 8, h: 0.5 },
          style: { fontSize: 20, align: 'center' },
        });
      }
      break;
  }
}

// ============================================================================
// 요소 추가
// ============================================================================

/**
 * 슬라이드에 텍스트 박스 추가
 *
 * @param slide - 슬라이드 객체
 * @param options - 텍스트 박스 옵션
 *
 * @example
 * ```typescript
 * addTextBox(slide, {
 *   text: '프로젝트 개요',
 *   position: { x: 1, y: 2, w: 8, h: 1 },
 *   style: { fontSize: 24, bold: true },
 * });
 * ```
 */
export function addTextBox(slide: Slide, options: AddTextBoxOptions): void {
  slide.elements.push({
    type: 'text',
    text: options.text,
    position: options.position,
    style: options.style,
  });
}

/**
 * 슬라이드에 이미지 추가
 *
 * @param slide - 슬라이드 객체
 * @param options - 이미지 옵션
 *
 * @example
 * ```typescript
 * addImage(slide, {
 *   imageData: 'https://example.com/image.png',
 *   position: { x: 2, y: 2, w: 6, h: 3 },
 *   altText: '프로젝트 로고',
 * });
 * ```
 */
export function addImage(slide: Slide, options: AddImageOptions): void {
  slide.elements.push({
    type: 'image',
    imageData: options.imageData,
    position: options.position,
    altText: options.altText,
  });
}

// ============================================================================
// 프레젠테이션 내보내기
// ============================================================================

/**
 * 프레젠테이션을 PPTX 파일로 내보내기
 *
 * @param presentation - 프레젠테이션 객체
 * @param fileName - 파일명 (확장자 제외)
 * @returns 내보내기 결과
 *
 * @example
 * ```typescript
 * const result = await exportPresentation(presentation, 'monthly-report');
 * if (result.success && result.blob) {
 *   // Blob 다운로드 처리
 * }
 * ```
 */
export async function exportPresentation(
  presentation: Presentation,
  fileName: string = 'presentation'
): Promise<ExportPresentationResult> {
  try {
    // pptxgenjs 동적 로드
    const PptxGenJs = await loadPptxGen();
    const pptx = new PptxGenJs();

    // 메타데이터 설정
    pptx.author = presentation.metadata.author || 'Unknown';
    pptx.company = presentation.metadata.company || '';
    pptx.subject = presentation.metadata.subject || '';
    pptx.title = presentation.metadata.title;

    // 슬라이드 생성
    for (const slideData of presentation.slides) {
      const slide = pptx.addSlide();

      // 배경색 설정
      if (slideData.backgroundColor) {
        slide.background = { color: slideData.backgroundColor };
      }

      // 요소 추가
      for (const element of slideData.elements) {
        switch (element.type) {
          case 'text':
            slide.addText(element.text, {
              x: element.position.x,
              y: element.position.y,
              w: element.position.w,
              h: element.position.h,
              fontSize: element.style?.fontSize || 18,
              fontFace: element.style?.fontFace || 'Arial',
              color: element.style?.color || '000000',
              bold: element.style?.bold || false,
              italic: element.style?.italic || false,
              underline: element.style?.underline ? { style: 'single' } : undefined,
              align: element.style?.align || 'left',
            });
            break;

          case 'image':
            slide.addImage({
              data: element.imageData,
              x: element.position.x,
              y: element.position.y,
              w: element.position.w,
              h: element.position.h,
            });
            break;

          case 'chart':
            addChartToSlide(slide, element.chartData, element.position, {
              showLegend: element.showLegend,
              showDataLabels: element.showDataLabels,
            });
            break;

          case 'table':
            slide.addTable(element.tableData, {
              x: element.position.x,
              y: element.position.y,
              w: element.position.w,
              h: element.position.h,
            });
            break;
        }
      }

      // 발표자 노트 추가
      if (slideData.notes) {
        slide.addNotes(slideData.notes);
      }
    }

    // Blob 생성
    const blob = (await pptx.write({ outputType: 'blob' })) as Blob;
    const fileSize = blob.size;

    return {
      success: true,
      fileName: `${fileName}.pptx`,
      blob,
      fileSize,
    };
  } catch (error) {
    return {
      success: false,
      fileName: `${fileName}.pptx`,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}

/**
 * pptxgenjs 슬라이드 타입 (동적 import로 인한 타입 정의)
 */
interface PptxSlide {
  addChart: (type: string, data: unknown[], options: unknown) => void;
  pptx: {
    ChartType: {
      line: string;
      bar: string;
      pie: string;
      area: string;
    };
  };
}

/**
 * 슬라이드에 차트 추가 (내부 헬퍼)
 *
 * @param slide - pptxgenjs 슬라이드 객체
 * @param chartData - 차트 데이터
 * @param position - 차트 위치
 * @param options - 차트 옵션
 */
function addChartToSlide(
  slide: PptxSlide,
  chartData: PptxChartData,
  position: Position,
  options: { showLegend?: boolean; showDataLabels?: boolean }
): void {
  const chartOptions = {
    x: position.x,
    y: position.y,
    w: position.w,
    h: position.h,
    showLegend: options.showLegend ?? true,
    showLabel: options.showDataLabels ?? false,
    showValue: options.showDataLabels ?? false,
  };

  const data = [
    {
      name: chartData.seriesName || 'Series',
      labels: chartData.labels,
      values: chartData.values,
    },
  ];

  switch (chartData.type) {
    case 'line':
      slide.addChart(slide.pptx.ChartType.line, data, chartOptions);
      break;
    case 'bar':
      slide.addChart(slide.pptx.ChartType.bar, data, chartOptions);
      break;
    case 'pie':
      slide.addChart(slide.pptx.ChartType.pie, data, chartOptions);
      break;
    case 'area':
      slide.addChart(slide.pptx.ChartType.area, data, chartOptions);
      break;
  }
}

// ============================================================================
// 기본 내보내기
// ============================================================================

export default {
  createPresentation,
  addSlide,
  addTextBox,
  addImage,
  exportPresentation,
};
