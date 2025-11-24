/**
 * Title Slide Template
 * TASK-CS-035: 제목 슬라이드 템플릿
 *
 * 프레젠테이션 표지용 슬라이드
 * - 중앙 정렬 제목
 * - 부제목
 * - 브랜드 색상 적용
 *
 * @module skills/pptx/templates/titleSlide
 */

import type PptxGenJS from 'pptxgenjs';
import type { SlideContent, BrandColors } from '@/types/pptx.types';

/**
 * Title 슬라이드 옵션
 */
export interface TitleSlideOptions {
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
}

/**
 * 제목 슬라이드 생성
 *
 * 프레젠테이션 첫 페이지로 사용되는 제목 슬라이드를 생성합니다.
 *
 * @example
 * ```typescript
 * addTitleSlide({
 *   slide: pptx.addSlide(),
 *   content: {
 *     type: 'title',
 *     title: '스마트시티 구축 제안',
 *     subtitle: 'IDEA on Action | 2025.11',
 *   },
 *   colors: BRAND_COLORS,
 *   titleFont: 'Pretendard',
 *   bodyFont: 'Pretendard',
 * });
 * ```
 */
export function addTitleSlide(options: TitleSlideOptions): void {
  const { slide, content, colors, titleFont, bodyFont } = options;

  // 배경색 설정 (그라데이션 효과)
  slide.background = { color: colors.background };

  // 상단 장식 바
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: '100%',
    h: 0.15,
    fill: { color: colors.primary },
  });

  // 메인 제목
  if (content.title) {
    slide.addText(content.title, {
      x: 0.5,
      y: 2.5,
      w: '90%',
      h: 1.5,
      fontSize: 48,
      fontFace: titleFont,
      color: colors.text,
      bold: true,
      align: 'center',
      valign: 'middle',
    });
  }

  // 부제목
  if (content.subtitle) {
    slide.addText(content.subtitle, {
      x: 0.5,
      y: 4.2,
      w: '90%',
      h: 0.8,
      fontSize: 24,
      fontFace: bodyFont,
      color: colors.secondary,
      align: 'center',
      valign: 'middle',
    });
  }

  // 하단 브랜드 정보
  slide.addText('IDEA on Action | 생각과행동', {
    x: 0.5,
    y: 6.8,
    w: '90%',
    h: 0.4,
    fontSize: 12,
    fontFace: bodyFont,
    color: '9CA3AF', // Gray 400
    align: 'center',
    valign: 'bottom',
  });

  // 하단 장식 바
  slide.addShape('rect', {
    x: 0,
    y: 7.35,
    w: '100%',
    h: 0.15,
    fill: { color: colors.primary },
  });

  // 슬라이드 노트 추가
  if (content.notes) {
    slide.addNotes(content.notes);
  }
}

export default addTitleSlide;
