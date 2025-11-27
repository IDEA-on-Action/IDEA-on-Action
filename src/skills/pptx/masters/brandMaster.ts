/**
 * Brand Master Slide Templates
 * BL-011: 마스터 슬라이드 템플릿
 *
 * IDEA on Action 브랜드 마스터 슬라이드 정의
 * - IDEA_BRAND: 일반 슬라이드용 마스터 (흰색 배경)
 * - IDEA_TITLE: 제목 전용 마스터 (진한 남색 배경)
 *
 * @module skills/pptx/masters/brandMaster
 */

import type PptxGenJS from 'pptxgenjs';

/**
 * IDEA on Action 브랜드 마스터 슬라이드 적용
 *
 * 일반 콘텐츠 슬라이드용 마스터 템플릿입니다.
 * - 흰색 배경
 * - 상단 진한 남색 바
 * - 하단 로고 및 페이지 번호
 *
 * @param pptx - PptxGenJS 인스턴스
 *
 * @example
 * ```typescript
 * const pptx = new PptxGenJS();
 * applyBrandMaster(pptx);
 * const slide = pptx.addSlide({ masterName: 'IDEA_BRAND' });
 * ```
 */
export function applyBrandMaster(pptx: PptxGenJS): void {
  pptx.defineSlideMaster({
    title: 'IDEA_BRAND',
    background: { color: 'FFFFFF' },
    objects: [
      // 상단 바 (진한 남색)
      {
        rect: {
          x: 0,
          y: 0,
          w: '100%',
          h: 0.5,
          fill: { color: '0F172A' },
        },
      },
      // 하단 로고/푸터 영역
      {
        text: {
          text: 'IDEA on Action',
          options: {
            x: 0.5,
            y: 6.9,
            w: 3,
            h: 0.3,
            fontSize: 10,
            color: '64748B',
            fontFace: 'Inter',
          },
        },
      },
      // 페이지 번호
      {
        text: {
          text: '{slideNumber}',
          options: {
            x: 12,
            y: 6.9,
            w: 0.5,
            h: 0.3,
            fontSize: 10,
            color: '64748B',
            align: 'right',
          },
        },
      },
    ],
    slideNumber: { x: 12, y: 6.9, fontSize: 10 },
  });
}

/**
 * 제목 전용 마스터 슬라이드 적용
 *
 * 표지 및 섹션 구분용 제목 슬라이드 마스터입니다.
 * - 진한 남색 배경 (#0F172A)
 * - 중앙 정렬
 * - 하단 로고
 *
 * @param pptx - PptxGenJS 인스턴스
 *
 * @example
 * ```typescript
 * const pptx = new PptxGenJS();
 * applyTitleMaster(pptx);
 * const slide = pptx.addSlide({ masterName: 'IDEA_TITLE' });
 * ```
 */
export function applyTitleMaster(pptx: PptxGenJS): void {
  pptx.defineSlideMaster({
    title: 'IDEA_TITLE',
    background: { color: '0F172A' }, // 진한 남색 배경
    objects: [
      // 중앙 로고 영역
      {
        text: {
          text: 'IDEA on Action',
          options: {
            x: 0,
            y: 5.5,
            w: '100%',
            h: 0.5,
            fontSize: 14,
            color: 'FFFFFF',
            align: 'center',
          },
        },
      },
    ],
  });
}

/**
 * 모든 브랜드 마스터 슬라이드 적용
 *
 * IDEA_BRAND와 IDEA_TITLE 마스터를 모두 적용합니다.
 *
 * @param pptx - PptxGenJS 인스턴스
 *
 * @example
 * ```typescript
 * const pptx = new PptxGenJS();
 * applyAllBrandMasters(pptx);
 * ```
 */
export function applyAllBrandMasters(pptx: PptxGenJS): void {
  applyBrandMaster(pptx);
  applyTitleMaster(pptx);
}

export default applyAllBrandMasters;
