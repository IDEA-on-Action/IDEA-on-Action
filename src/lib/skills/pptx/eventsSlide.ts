/**
 * 이벤트 현황 슬라이드 생성
 *
 * Central Hub의 이벤트 데이터를 차트와 테이블로 시각화
 *
 * @module lib/skills/pptx/eventsSlide
 */

import type pptxgen from 'pptxgenjs';
import type { ServiceEvent, EventType } from '@/types/central-hub.types';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 이벤트 통계
 */
export interface EventStatistics {
  /** 총 이벤트 수 */
  totalCount: number;
  /** 이벤트 타입별 개수 */
  byType: Record<EventType, number>;
  /** 서비스별 개수 */
  byService: Record<string, number>;
}

/**
 * 이벤트 슬라이드 데이터
 */
export interface EventsSlideData {
  /** 슬라이드 제목 */
  title: string;
  /** 기간 정보 */
  period?: string;
  /** 이벤트 통계 */
  statistics: EventStatistics;
  /** 최근 이벤트 목록 (최대 5개) */
  recentEvents?: ServiceEvent[];
  /** 차트 표시 여부 */
  showChart?: boolean;
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 이벤트 타입 한글 변환
 */
function getEventTypeLabel(eventType: EventType): string {
  const labels: Record<EventType, string> = {
    'progress.updated': '진행 상태 업데이트',
    'task.completed': '작업 완료',
    'task.started': '작업 시작',
    'milestone.reached': '마일스톤 달성',
    'issue.created': '이슈 생성',
    'issue.resolved': '이슈 해결',
    'issue.updated': '이슈 업데이트',
    'service.health': '서비스 헬스 체크',
    'user.action': '사용자 액션',
  };
  return labels[eventType] || eventType;
}

/**
 * 날짜 포맷팅 (ISO → 한글)
 */
function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDate;
  }
}

/**
 * Top N 이벤트 타입 추출
 */
function getTopEventTypes(
  byType: Record<EventType, number>,
  limit: number = 5
): Array<{ type: EventType; count: number }> {
  return Object.entries(byType)
    .map(([type, count]) => ({ type: type as EventType, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ============================================================================
// 슬라이드 생성 함수
// ============================================================================

/**
 * 이벤트 현황 슬라이드 생성
 *
 * @example
 * ```typescript
 * const pptx = new pptxgen();
 * createEventsSlide(pptx, {
 *   title: '이벤트 현황',
 *   period: '2025년 11월',
 *   statistics: {
 *     totalCount: 1250,
 *     byType: {
 *       'progress.updated': 450,
 *       'task.completed': 320,
 *       'issue.created': 180,
 *       // ...
 *     },
 *     byService: {
 *       'minu-find': 300,
 *       'minu-frame': 400,
 *       'minu-build': 350,
 *       'minu-keep': 200,
 *     },
 *   },
 *   showChart: true,
 * });
 * ```
 *
 * @param pptx - pptxgenjs 인스턴스
 * @param data - 이벤트 슬라이드 데이터
 * @throws pptx 인스턴스가 null인 경우
 */
export function createEventsSlide(
  pptx: pptxgen,
  data: EventsSlideData
): void {
  if (!pptx) {
    throw new Error('pptx 인스턴스가 필요합니다');
  }

  const slide = pptx.addSlide();

  // 제목
  slide.addText(data.title, {
    x: 0.5,
    y: 0.5,
    w: 9.0,
    h: 0.75,
    fontSize: 32,
    bold: true,
    color: '3B82F6', // blue-500
    fontFace: 'Noto Sans KR',
  });

  // 기간 정보
  if (data.period) {
    slide.addText(data.period, {
      x: 0.5,
      y: 1.0,
      w: 9.0,
      h: 0.4,
      fontSize: 14,
      color: '64748B', // slate-500
      fontFace: 'Noto Sans KR',
    });
  }

  // 총 이벤트 수 표시
  const totalStartY = 1.7;
  slide.addText(`총 이벤트: ${data.statistics.totalCount.toLocaleString()}건`, {
    x: 0.5,
    y: totalStartY,
    w: 9.0,
    h: 0.5,
    fontSize: 20,
    bold: true,
    color: '0F172A', // slate-900
    fontFace: 'Noto Sans KR',
  });

  // 차트 표시
  if (data.showChart !== false) {
    const chartStartY = 2.4;
    const topEvents = getTopEventTypes(data.statistics.byType);

    if (topEvents.length > 0) {
      // 차트 데이터 준비
      const chartData = [
        {
          name: '이벤트 수',
          labels: topEvents.map((e) => getEventTypeLabel(e.type)),
          values: topEvents.map((e) => e.count),
        },
      ];

      // 막대 차트 추가
      slide.addChart(pptx.ChartType.bar, chartData, {
        x: 0.5,
        y: chartStartY,
        w: 4.5,
        h: 3.0,
        showLegend: false,
        showLabel: true,
        chartColors: ['3B82F6'], // blue-500
        barDir: 'bar', // 수평 막대
        valAxisMaxVal: Math.max(...topEvents.map((e) => e.count)) * 1.2,
      });
    }
  }

  // 최근 이벤트 테이블
  if (data.recentEvents && data.recentEvents.length > 0) {
    const tableStartY = 2.4;
    const tableX = data.showChart !== false ? 5.5 : 0.5;
    const tableW = data.showChart !== false ? 4.0 : 9.0;

    slide.addText('최근 이벤트', {
      x: tableX,
      y: tableStartY,
      w: tableW,
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: '0F172A', // slate-900
      fontFace: 'Noto Sans KR',
    });

    // 테이블 데이터
    const tableData: Array<Array<{ text: string; options?: pptxgen.TextPropsOptions }>> = [];

    // 헤더
    tableData.push([
      { text: '시간', options: { bold: true, fontSize: 10 } },
      { text: '타입', options: { bold: true, fontSize: 10 } },
      { text: '서비스', options: { bold: true, fontSize: 10 } },
    ]);

    // 데이터 행 (최대 8개)
    data.recentEvents.slice(0, 8).forEach((event) => {
      tableData.push([
        { text: formatDate(event.created_at), options: { fontSize: 9 } },
        {
          text: getEventTypeLabel(event.event_type),
          options: { fontSize: 9 },
        },
        { text: event.service_id, options: { fontSize: 9 } },
      ]);
    });

    slide.addTable(tableData, {
      x: tableX,
      y: tableStartY + 0.5,
      w: tableW,
      colW: [1.0, 1.8, 1.2],
      fontSize: 10,
      fontFace: 'Noto Sans KR',
      border: { pt: 1, color: 'E2E8F0' }, // slate-200
      fill: { color: 'FFFFFF' },
      color: '0F172A', // slate-900
    });
  }

  // 서비스별 이벤트 수 (하단)
  const serviceStartY = 5.8;
  slide.addText('서비스별 이벤트', {
    x: 0.5,
    y: serviceStartY,
    w: 9.0,
    h: 0.4,
    fontSize: 16,
    bold: true,
    color: '0F172A', // slate-900
    fontFace: 'Noto Sans KR',
  });

  const serviceEntries = Object.entries(data.statistics.byService);
  const serviceBoxWidth = 9.0 / serviceEntries.length - 0.1;

  serviceEntries.forEach(([serviceId, count], index) => {
    const x = 0.5 + index * (serviceBoxWidth + 0.1);
    const y = serviceStartY + 0.5;

    // 서비스 박스
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: serviceBoxWidth,
      h: 0.8,
      fill: { color: 'F8FAFC' }, // slate-50
      line: { color: '3B82F6', width: 2 }, // blue-500
    });

    // 서비스명
    slide.addText(serviceId, {
      x,
      y: y + 0.1,
      w: serviceBoxWidth,
      h: 0.3,
      fontSize: 11,
      color: '64748B', // slate-500
      align: 'center',
      fontFace: 'Noto Sans KR',
    });

    // 이벤트 수
    slide.addText(String(count), {
      x,
      y: y + 0.4,
      w: serviceBoxWidth,
      h: 0.3,
      fontSize: 18,
      bold: true,
      color: '3B82F6', // blue-500
      align: 'center',
      fontFace: 'Noto Sans KR',
    });
  });
}

// ============================================================================
// 기본 내보내기
// ============================================================================

export default createEventsSlide;
