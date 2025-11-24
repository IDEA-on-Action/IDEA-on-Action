/**
 * Two Column Slide Template
 * TASK-CS-035: 2단 레이아웃 슬라이드 템플릿
 *
 * 좌우 2단 레이아웃 슬라이드
 * - 비교 분석
 * - 장단점 정리
 * - Before/After 표현
 *
 * @module skills/pptx/templates/twoColumnSlide
 */

import type PptxGenJS from 'pptxgenjs';
import type { SlideContent, BrandColors } from '@/types/pptx.types';

/**
 * Two Column 슬라이드 옵션
 */
export interface TwoColumnSlideOptions {
  /** pptxgenjs 슬라이드 객체 */
  slide: PptxGenJS.Slide;
  /** 슬라이드 콘텐츠 */
  content: SlideContent;
  /** 브랜드 색상 */
  colors: BrandColors;
  /** 제목 폰트 */
  titleFont: string;
  /** 본문 폰트 */
  bodyFont: string;
  /** 본문 폰트 크기 */
  bodyFontSize: number;
}

/**
 * 2단 레이아웃 슬라이드 생성
 *
 * 좌우 2단 레이아웃으로 콘텐츠를 비교하거나 나열하는 슬라이드를 생성합니다.
 *
 * @example
 * ```typescript
 * addTwoColumnSlide({
 *   slide: pptx.addSlide(),
 *   content: {
 *     type: 'twoColumn',
 *     title: '현재 vs 미래',
 *     leftTitle: '현재 상태',
 *     leftContent: ['수동 프로세스', '낮은 효율성', '데이터 분산'],
 *     rightTitle: '목표 상태',
 *     rightContent: ['자동화 시스템', '높은 생산성', '통합 데이터'],
 *   },
 *   colors: BRAND_COLORS,
 *   titleFont: 'Pretendard',
 *   bodyFont: 'Pretendard',
 *   bodyFontSize: 16,
 * });
 * ```
 */
export function addTwoColumnSlide(options: TwoColumnSlideOptions): void {
  const { slide, content, colors, titleFont, bodyFont, bodyFontSize } = options;

  // 배경 설정
  slide.background = { color: colors.background };

  // 상단 컬러 바
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: '100%',
    h: 0.08,
    fill: { color: colors.primary },
  });

  // 슬라이드 제목
  if (content.title) {
    slide.addText(content.title, {
      x: 0.5,
      y: 0.4,
      w: '90%',
      h: 0.8,
      fontSize: 32,
      fontFace: titleFont,
      color: colors.text,
      bold: true,
      align: 'left',
      valign: 'middle',
    });

    // 제목 아래 구분선
    slide.addShape('rect', {
      x: 0.5,
      y: 1.25,
      w: 1.5,
      h: 0.05,
      fill: { color: colors.primary },
    });
  }

  // 좌측 컬럼
  const leftX = 0.5;
  const columnWidth = 5.8;

  // 좌측 컬럼 제목
  if (content.leftTitle) {
    slide.addText(content.leftTitle, {
      x: leftX,
      y: 1.6,
      w: columnWidth,
      h: 0.5,
      fontSize: 20,
      fontFace: titleFont,
      color: colors.primary,
      bold: true,
      align: 'left',
      valign: 'middle',
    });
  }

  // 좌측 컬럼 콘텐츠
  if (content.leftContent && content.leftContent.length > 0) {
    const leftItems = content.leftContent.map((item) => ({
      text: item,
      options: {
        bullet: { type: 'bullet' as const, color: colors.primary },
        indentLevel: 0,
      },
    }));

    slide.addText(leftItems, {
      x: leftX,
      y: 2.2,
      w: columnWidth,
      h: 4.5,
      fontSize: bodyFontSize,
      fontFace: bodyFont,
      color: colors.text,
      align: 'left',
      valign: 'top',
      lineSpacing: 28,
      paraSpaceAfter: 10,
    });
  }

  // 중앙 구분선
  slide.addShape('rect', {
    x: 6.5,
    y: 1.6,
    w: 0.03,
    h: 5.0,
    fill: { color: 'E5E7EB' }, // Gray 200
  });

  // 우측 컬럼
  const rightX = 6.8;

  // 우측 컬럼 제목
  if (content.rightTitle) {
    slide.addText(content.rightTitle, {
      x: rightX,
      y: 1.6,
      w: columnWidth,
      h: 0.5,
      fontSize: 20,
      fontFace: titleFont,
      color: colors.secondary,
      bold: true,
      align: 'left',
      valign: 'middle',
    });
  }

  // 우측 컬럼 콘텐츠
  if (content.rightContent && content.rightContent.length > 0) {
    const rightItems = content.rightContent.map((item) => ({
      text: item,
      options: {
        bullet: { type: 'bullet' as const, color: colors.secondary },
        indentLevel: 0,
      },
    }));

    slide.addText(rightItems, {
      x: rightX,
      y: 2.2,
      w: columnWidth,
      h: 4.5,
      fontSize: bodyFontSize,
      fontFace: bodyFont,
      color: colors.text,
      align: 'left',
      valign: 'top',
      lineSpacing: 28,
      paraSpaceAfter: 10,
    });
  }

  // 슬라이드 노트 추가
  if (content.notes) {
    slide.addNotes(content.notes);
  }
}

export default addTwoColumnSlide;
