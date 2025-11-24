/**
 * Content Slide Template
 * TASK-CS-035: 내용 슬라이드 템플릿
 *
 * 불릿 포인트 콘텐츠용 슬라이드
 * - 제목 + 불릿 리스트
 * - 최대 8개 항목 권장
 *
 * @module skills/pptx/templates/contentSlide
 */

import type PptxGenJS from 'pptxgenjs';
import type { SlideContent, BrandColors } from '@/types/pptx.types';

/**
 * Content 슬라이드 옵션
 */
export interface ContentSlideOptions {
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
 * 내용 슬라이드 생성
 *
 * 제목과 불릿 포인트 목록으로 구성된 표준 콘텐츠 슬라이드를 생성합니다.
 *
 * @example
 * ```typescript
 * addContentSlide({
 *   slide: pptx.addSlide(),
 *   content: {
 *     type: 'content',
 *     title: '프로젝트 범위',
 *     content: [
 *       '시스템 설계 및 개발',
 *       '데이터 마이그레이션',
 *       '사용자 교육 및 지원',
 *     ],
 *   },
 *   colors: BRAND_COLORS,
 *   titleFont: 'Pretendard',
 *   bodyFont: 'Pretendard',
 *   bodyFontSize: 18,
 * });
 * ```
 */
export function addContentSlide(options: ContentSlideOptions): void {
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

  // 불릿 포인트 콘텐츠
  if (content.content && content.content.length > 0) {
    const bulletItems = content.content.map((item) => ({
      text: item,
      options: {
        bullet: { type: 'bullet' as const, color: colors.primary },
        indentLevel: 0,
      },
    }));

    slide.addText(bulletItems, {
      x: 0.5,
      y: 1.6,
      w: '90%',
      h: 5.2,
      fontSize: bodyFontSize,
      fontFace: bodyFont,
      color: colors.text,
      align: 'left',
      valign: 'top',
      lineSpacing: 32,
      paraSpaceAfter: 12,
    });
  }

  // 페이지 번호 영역 (나중에 전체 프레젠테이션에서 추가)
  slide.addText('', {
    x: '90%',
    y: 6.9,
    w: 0.8,
    h: 0.3,
    fontSize: 10,
    fontFace: bodyFont,
    color: '9CA3AF',
    align: 'right',
  });

  // 슬라이드 노트 추가
  if (content.notes) {
    slide.addNotes(content.notes);
  }
}

export default addContentSlide;
