/**
 * 제목 슬라이드 생성
 *
 * Central Hub 데이터를 기반으로 표지 슬라이드 생성
 *
 * @module lib/skills/pptx/titleSlide
 */

import type pptxgen from 'pptxgenjs';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 제목 슬라이드 데이터
 */
export interface TitleSlideData {
  /** 메인 제목 */
  title: string;
  /** 부제목 */
  subtitle?: string;
  /** 발표자 */
  presenter?: string;
  /** 날짜 */
  date?: string;
  /** 회사명 */
  company?: string;
}

// ============================================================================
// 슬라이드 생성 함수
// ============================================================================

/**
 * 제목 슬라이드 생성
 *
 * @example
 * ```typescript
 * const pptx = new pptxgen();
 * createTitleSlide(pptx, {
 *   title: 'Central Hub 월간 보고서',
 *   subtitle: 'Minu 서비스 통합 현황',
 *   presenter: '생각과행동',
 *   date: '2025-12-02',
 *   company: 'IDEA on Action',
 * });
 * ```
 *
 * @param pptx - pptxgenjs 인스턴스
 * @param data - 제목 슬라이드 데이터
 * @throws pptx 인스턴스가 null인 경우
 */
export function createTitleSlide(
  pptx: pptxgen,
  data: TitleSlideData
): void {
  if (!pptx) {
    throw new Error('pptx 인스턴스가 필요합니다');
  }

  const slide = pptx.addSlide();

  // 배경 그라데이션 설정
  slide.background = {
    color: 'FFFFFF',
  };

  // 메인 제목
  slide.addText(data.title, {
    x: 0.5,
    y: 2.0,
    w: 9.0,
    h: 1.5,
    fontSize: 44,
    bold: true,
    color: '3B82F6', // blue-500
    align: 'center',
    fontFace: 'Noto Sans KR',
  });

  // 부제목
  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: 0.5,
      y: 3.5,
      w: 9.0,
      h: 0.8,
      fontSize: 24,
      color: '0F172A', // slate-900
      align: 'center',
      fontFace: 'Noto Sans KR',
    });
  }

  // 하단 정보 영역 (발표자, 날짜, 회사)
  const bottomY = 5.5;
  const infoTexts: string[] = [];

  if (data.presenter) {
    infoTexts.push(`발표자: ${data.presenter}`);
  }
  if (data.date) {
    infoTexts.push(`일시: ${data.date}`);
  }
  if (data.company) {
    infoTexts.push(`회사: ${data.company}`);
  }

  if (infoTexts.length > 0) {
    slide.addText(infoTexts.join('\n'), {
      x: 0.5,
      y: bottomY,
      w: 9.0,
      h: 1.0,
      fontSize: 14,
      color: '64748B', // slate-500
      align: 'center',
      fontFace: 'Noto Sans KR',
    });
  }
}

// ============================================================================
// 기본 내보내기
// ============================================================================

export default createTitleSlide;
