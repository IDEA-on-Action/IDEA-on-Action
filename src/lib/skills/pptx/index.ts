/**
 * pptx Skill - PowerPoint 슬라이드 생성 라이브러리 (동적 로딩 최적화)
 *
 * Central Hub 데이터를 PowerPoint 프레젠테이션으로 변환
 * pptxgenjs 라이브러리를 동적으로 로드하여 번들 크기를 최적화합니다.
 *
 * @module lib/skills/pptx
 */

import { loadPptx, getPptxLoadingState } from '../lazy-loader';

// ============================================================================
// 슬라이드 생성 함수
// ============================================================================

export {
  createTitleSlide,
  type TitleSlideData,
} from './titleSlide';

export {
  createSummarySlide,
  type SummarySlideData,
  type KpiItem,
  type ServiceStatus,
} from './summarySlide';

export {
  createEventsSlide,
  type EventsSlideData,
  type EventStatistics,
} from './eventsSlide';

export {
  createIssuesSlide,
  type IssuesSlideData,
  type IssueStatistics,
} from './issuesSlide';

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 전체 프레젠테이션 생성 헬퍼
 *
 * 제목, 요약, 이벤트, 이슈 슬라이드를 한 번에 생성
 *
 * @example
 * ```typescript
 * import pptxgen from 'pptxgenjs';
 * import { createFullPresentation } from '@/lib/skills/pptx';
 *
 * const pptx = new pptxgen();
 * createFullPresentation(pptx, {
 *   title: {
 *     title: 'Central Hub 보고서',
 *     subtitle: '월간 현황',
 *     date: '2025-12-02',
 *   },
 *   summary: {
 *     title: '주요 지표',
 *     kpis: [...],
 *   },
 *   events: {
 *     title: '이벤트 현황',
 *     statistics: {...},
 *   },
 *   issues: {
 *     title: '이슈 현황',
 *     statistics: {...},
 *   },
 * });
 *
 * await pptx.writeFile('report.pptx');
 * ```
 */
export interface FullPresentationData {
  /** 제목 슬라이드 데이터 */
  title: import('./titleSlide').TitleSlideData;
  /** 요약 슬라이드 데이터 */
  summary?: import('./summarySlide').SummarySlideData;
  /** 이벤트 슬라이드 데이터 */
  events?: import('./eventsSlide').EventsSlideData;
  /** 이슈 슬라이드 데이터 */
  issues?: import('./issuesSlide').IssuesSlideData;
}

/**
 * 전체 프레젠테이션 생성
 *
 * @param pptx - pptxgenjs 인스턴스
 * @param data - 전체 프레젠테이션 데이터
 * @throws pptx 인스턴스가 null인 경우
 */
export async function createFullPresentation(
  pptx: import('pptxgenjs').default,
  data: FullPresentationData
): Promise<void> {
  if (!pptx) {
    throw new Error('pptx 인스턴스가 필요합니다');
  }

  const {
    createTitleSlide: title,
  } = await import('./titleSlide');
  const {
    createSummarySlide: summary,
  } = await import('./summarySlide');
  const {
    createEventsSlide: events,
  } = await import('./eventsSlide');
  const {
    createIssuesSlide: issues,
  } = await import('./issuesSlide');

  // 제목 슬라이드
  title(pptx, data.title);

  // 요약 슬라이드 (선택)
  if (data.summary) {
    summary(pptx, data.summary);
  }

  // 이벤트 슬라이드 (선택)
  if (data.events) {
    events(pptx, data.events);
  }

  // 이슈 슬라이드 (선택)
  if (data.issues) {
    issues(pptx, data.issues);
  }
}

// ============================================================================
// 동적 로딩 유틸리티
// ============================================================================

/**
 * pptxgenjs 라이브러리 동적 로드
 *
 * PowerPoint 프레젠테이션 생성을 위한 pptxgenjs 라이브러리를 동적으로 로드합니다.
 * 이 함수는 lazy-loader를 래핑하여 일관된 API를 제공합니다.
 *
 * @returns pptxgenjs 모듈
 *
 * @example
 * ```ts
 * import { loadPptxModule } from '@/lib/skills/pptx';
 *
 * const { default: PptxGenJs } = await loadPptxModule();
 * const pptx = new PptxGenJs();
 * ```
 */
export async function loadPptxModule() {
  return loadPptx();
}

/**
 * pptx 모듈이 이미 로드되었는지 확인
 *
 * @returns 로드 여부
 *
 * @example
 * ```ts
 * import { isPptxLoaded } from '@/lib/skills/pptx';
 *
 * if (!isPptxLoaded()) {
 *   console.log('pptxgenjs를 로드해야 합니다');
 * }
 * ```
 */
export function isPptxLoaded(): boolean {
  const state = getPptxLoadingState();
  return state.module !== null;
}

// ============================================================================
// 기본 내보내기
// ============================================================================

export default {
  createTitleSlide,
  createSummarySlide,
  createEventsSlide,
  createIssuesSlide,
  createFullPresentation,
  loadPptxModule,
  isPptxLoaded,
};
