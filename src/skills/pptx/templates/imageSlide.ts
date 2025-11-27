/**
 * Image Slide Template
 * BL-011: 이미지 슬라이드 템플릿
 *
 * 이미지를 포함한 슬라이드 생성
 * - 4가지 레이아웃: full, left, right, center
 * - 제목 및 캡션 지원
 * - URL 또는 Base64 이미지 모두 지원
 *
 * @module skills/pptx/templates/imageSlide
 */

import type PptxGenJS from 'pptxgenjs';
import type { SlideContent, BrandColors } from '@/types/pptx.types';

/**
 * 이미지 레이아웃 타입
 */
export type ImageLayout = 'full' | 'left' | 'right' | 'center';

/**
 * Image 슬라이드 옵션
 */
export interface ImageSlideOptions {
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
 * 레이아웃별 이미지 위치 계산
 */
function getImagePosition(layout: ImageLayout): { x: number; y: number; w: number; h: number } {
  const positions = {
    full: { x: 0.5, y: 1.5, w: 12, h: 5 },
    left: { x: 0.5, y: 1.5, w: 5.5, h: 4 },
    right: { x: 6.5, y: 1.5, w: 5.5, h: 4 },
    center: { x: 2, y: 1.5, w: 9, h: 4.5 },
  };
  return positions[layout];
}

/**
 * 이미지 슬라이드 생성
 *
 * URL 또는 Base64 형식의 이미지를 포함한 슬라이드를 생성합니다.
 *
 * @example
 * ```typescript
 * addImageSlide({
 *   slide: pptx.addSlide(),
 *   content: {
 *     type: 'image',
 *     title: '제품 스크린샷',
 *     imageUrl: 'https://example.com/image.png',
 *     caption: '그림 1. 메인 화면',
 *     imageLayout: 'center',
 *   },
 *   colors: BRAND_COLORS,
 *   titleFont: 'Pretendard',
 *   bodyFont: 'Pretendard',
 * });
 * ```
 */
export function addImageSlide(options: ImageSlideOptions): void {
  const { slide, content, colors, titleFont, bodyFont } = options;

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

  // 이미지 레이아웃
  const layout = (content.imageLayout as ImageLayout) || 'center';
  const pos = getImagePosition(layout);

  // 이미지 추가
  if (content.imageUrl || content.imageBase64) {
    try {
      const imageOptions: PptxGenJS.ImageProps = {
        x: pos.x,
        y: pos.y,
        w: pos.w,
        h: pos.h,
        sizing: { type: 'contain', w: pos.w, h: pos.h },
      };

      if (content.imageUrl) {
        imageOptions.path = content.imageUrl;
      } else if (content.imageBase64) {
        imageOptions.data = content.imageBase64;
      }

      slide.addImage(imageOptions);
    } catch (error) {
      // 이미지 로드 실패 시 안내 메시지
      slide.addText('이미지를 불러올 수 없습니다.', {
        x: pos.x,
        y: pos.y + pos.h / 2 - 0.3,
        w: pos.w,
        h: 0.6,
        fontSize: 18,
        fontFace: bodyFont,
        color: '9CA3AF',
        align: 'center',
        valign: 'middle',
      });
      console.error('Failed to add image to slide:', error);
    }
  } else {
    // 이미지가 제공되지 않은 경우
    slide.addShape('rect', {
      x: pos.x,
      y: pos.y,
      w: pos.w,
      h: pos.h,
      fill: { color: 'F3F4F6' },
      line: { color: 'D1D5DB', width: 1, dashType: 'dash' },
    });
    slide.addText('이미지 없음', {
      x: pos.x,
      y: pos.y + pos.h / 2 - 0.3,
      w: pos.w,
      h: 0.6,
      fontSize: 18,
      fontFace: bodyFont,
      color: '9CA3AF',
      align: 'center',
      valign: 'middle',
    });
  }

  // 캡션 (있으면)
  if (content.caption) {
    slide.addText(content.caption, {
      x: 0.5,
      y: 6.3,
      w: 12,
      h: 0.4,
      fontSize: 12,
      fontFace: bodyFont,
      color: '64748B',
      align: 'center',
      valign: 'middle',
    });
  }

  // 슬라이드 노트 추가
  if (content.notes) {
    slide.addNotes(content.notes);
  }
}

export default addImageSlide;
