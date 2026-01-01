/**
 * 이슈 현황 슬라이드 생성
 *
 * Central Hub의 이슈 데이터를 차트와 테이블로 시각화
 *
 * @module lib/skills/pptx/issuesSlide
 */

import type pptxgen from 'pptxgenjs';
import type {
  ServiceIssue,
  IssueSeverity,
  IssueStatus,
} from '@/types/services/central-hub.types';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 이슈 통계
 */
export interface IssueStatistics {
  /** 총 이슈 수 */
  totalCount: number;
  /** 심각도별 개수 */
  bySeverity: Record<IssueSeverity, number>;
  /** 상태별 개수 */
  byStatus: Record<IssueStatus, number>;
  /** 해결률 (%) */
  resolutionRate?: number;
}

/**
 * 이슈 슬라이드 데이터
 */
export interface IssuesSlideData {
  /** 슬라이드 제목 */
  title: string;
  /** 기간 정보 */
  period?: string;
  /** 이슈 통계 */
  statistics: IssueStatistics;
  /** 주요 이슈 목록 (최대 5개) */
  criticalIssues?: ServiceIssue[];
  /** 차트 표시 여부 */
  showChart?: boolean;
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 심각도 한글 변환
 */
function getSeverityLabel(severity: IssueSeverity): string {
  const labels: Record<IssueSeverity, string> = {
    critical: '심각',
    high: '높음',
    medium: '보통',
    low: '낮음',
  };
  return labels[severity] || severity;
}

/**
 * 심각도별 색상
 */
function getSeverityColor(severity: IssueSeverity): string {
  const colors: Record<IssueSeverity, string> = {
    critical: 'EF4444', // red-500
    high: 'F97316',     // orange-500
    medium: 'EAB308',   // yellow-500
    low: '22C55E',      // green-500
  };
  return colors[severity] || '6B7280';
}

/**
 * 상태 한글 변환
 */
function getStatusLabel(status: IssueStatus): string {
  const labels: Record<IssueStatus, string> = {
    open: '오픈',
    in_progress: '진행중',
    resolved: '해결됨',
    closed: '종료됨',
  };
  return labels[status] || status;
}

/**
 * 상태별 색상
 */
function getStatusColor(status: IssueStatus): string {
  const colors: Record<IssueStatus, string> = {
    open: 'EF4444',       // red-500
    in_progress: '3B82F6', // blue-500
    resolved: '22C55E',   // green-500
    closed: '6B7280',     // gray-500
  };
  return colors[status] || '6B7280';
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
    });
  } catch {
    return isoDate;
  }
}

// ============================================================================
// 슬라이드 생성 함수
// ============================================================================

/**
 * 이슈 현황 슬라이드 생성
 *
 * @example
 * ```typescript
 * const pptx = new pptxgen();
 * createIssuesSlide(pptx, {
 *   title: '이슈 현황',
 *   period: '2025년 11월',
 *   statistics: {
 *     totalCount: 68,
 *     bySeverity: {
 *       critical: 5,
 *       high: 15,
 *       medium: 30,
 *       low: 18,
 *     },
 *     byStatus: {
 *       open: 20,
 *       in_progress: 25,
 *       resolved: 20,
 *       closed: 3,
 *     },
 *     resolutionRate: 85.5,
 *   },
 *   showChart: true,
 * });
 * ```
 *
 * @param pptx - pptxgenjs 인스턴스
 * @param data - 이슈 슬라이드 데이터
 * @throws pptx 인스턴스가 null인 경우
 */
export function createIssuesSlide(
  pptx: pptxgen,
  data: IssuesSlideData
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

  // 상단 KPI 박스들
  const kpiStartY = 1.7;
  const kpiBoxWidth = 2.8;
  const kpiBoxHeight = 0.9;
  const kpiGap = 0.3;

  // 총 이슈 수
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.5,
    y: kpiStartY,
    w: kpiBoxWidth,
    h: kpiBoxHeight,
    fill: { color: 'F8FAFC' }, // slate-50
    line: { color: 'E2E8F0', width: 1 }, // slate-200
  });
  slide.addText('총 이슈', {
    x: 0.7,
    y: kpiStartY + 0.2,
    w: kpiBoxWidth - 0.4,
    h: 0.3,
    fontSize: 12,
    color: '64748B', // slate-500
    fontFace: 'Noto Sans KR',
  });
  slide.addText(String(data.statistics.totalCount), {
    x: 0.7,
    y: kpiStartY + 0.5,
    w: kpiBoxWidth - 0.4,
    h: 0.3,
    fontSize: 20,
    bold: true,
    color: '0F172A', // slate-900
    fontFace: 'Noto Sans KR',
  });

  // 해결률
  if (data.statistics.resolutionRate !== undefined) {
    const resolutionX = 0.5 + kpiBoxWidth + kpiGap;
    slide.addShape(pptx.ShapeType.rect, {
      x: resolutionX,
      y: kpiStartY,
      w: kpiBoxWidth,
      h: kpiBoxHeight,
      fill: { color: 'F8FAFC' }, // slate-50
      line: { color: 'E2E8F0', width: 1 }, // slate-200
    });
    slide.addText('해결률', {
      x: resolutionX + 0.2,
      y: kpiStartY + 0.2,
      w: kpiBoxWidth - 0.4,
      h: 0.3,
      fontSize: 12,
      color: '64748B', // slate-500
      fontFace: 'Noto Sans KR',
    });
    slide.addText(`${data.statistics.resolutionRate.toFixed(1)}%`, {
      x: resolutionX + 0.2,
      y: kpiStartY + 0.5,
      w: kpiBoxWidth - 0.4,
      h: 0.3,
      fontSize: 20,
      bold: true,
      color: '22C55E', // green-500
      fontFace: 'Noto Sans KR',
    });
  }

  // 심각도별 이슈 차트
  if (data.showChart !== false) {
    const chartStartY = 3.0;

    // 심각도별 차트 데이터
    const severityData = Object.entries(data.statistics.bySeverity)
      .sort((a, b) => {
        const order: Record<IssueSeverity, number> = {
          critical: 0,
          high: 1,
          medium: 2,
          low: 3,
        };
        return order[a[0] as IssueSeverity] - order[b[0] as IssueSeverity];
      });

    const chartData = [
      {
        name: '이슈 수',
        labels: severityData.map(([severity]) =>
          getSeverityLabel(severity as IssueSeverity)
        ),
        values: severityData.map(([, count]) => count),
      },
    ];

    // 파이 차트 추가
    slide.addChart(pptx.ChartType.pie, chartData, {
      x: 0.5,
      y: chartStartY,
      w: 4.0,
      h: 3.0,
      showLegend: true,
      showLabel: true,
      legendPos: 'r',
      chartColors: [
        getSeverityColor('critical'),
        getSeverityColor('high'),
        getSeverityColor('medium'),
        getSeverityColor('low'),
      ],
    });
  }

  // 주요 이슈 테이블
  if (data.criticalIssues && data.criticalIssues.length > 0) {
    const tableStartY = 3.0;
    const tableX = data.showChart !== false ? 5.0 : 0.5;
    const tableW = data.showChart !== false ? 4.5 : 9.0;

    slide.addText('주요 이슈', {
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
      { text: '심각도', options: { bold: true, fontSize: 9 } },
      { text: '제목', options: { bold: true, fontSize: 9 } },
      { text: '상태', options: { bold: true, fontSize: 9 } },
      { text: '생성일', options: { bold: true, fontSize: 9 } },
    ]);

    // 데이터 행 (최대 6개)
    data.criticalIssues.slice(0, 6).forEach((issue) => {
      tableData.push([
        {
          text: getSeverityLabel(issue.severity),
          options: {
            fontSize: 8,
            color: getSeverityColor(issue.severity),
          },
        },
        {
          text: issue.title.length > 30 ? `${issue.title.slice(0, 27)}...` : issue.title,
          options: { fontSize: 8 },
        },
        {
          text: getStatusLabel(issue.status),
          options: {
            fontSize: 8,
            color: getStatusColor(issue.status),
          },
        },
        {
          text: formatDate(issue.created_at),
          options: { fontSize: 8 },
        },
      ]);
    });

    slide.addTable(tableData, {
      x: tableX,
      y: tableStartY + 0.5,
      w: tableW,
      colW: [0.8, 2.0, 0.8, 0.9],
      fontSize: 9,
      fontFace: 'Noto Sans KR',
      border: { pt: 1, color: 'E2E8F0' }, // slate-200
      fill: { color: 'FFFFFF' },
      color: '0F172A', // slate-900
    });
  }

  // 상태별 이슈 분포 (하단)
  const statusStartY = 6.3;
  slide.addText('상태별 분포', {
    x: 0.5,
    y: statusStartY,
    w: 9.0,
    h: 0.3,
    fontSize: 14,
    bold: true,
    color: '0F172A', // slate-900
    fontFace: 'Noto Sans KR',
  });

  const statusEntries = Object.entries(data.statistics.byStatus);
  const statusBoxWidth = 9.0 / statusEntries.length - 0.1;

  statusEntries.forEach(([status, count], index) => {
    const x = 0.5 + index * (statusBoxWidth + 0.1);
    const y = statusStartY + 0.4;

    // 상태 박스
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: statusBoxWidth,
      h: 0.7,
      fill: { color: 'F8FAFC' }, // slate-50
      line: {
        color: getStatusColor(status as IssueStatus),
        width: 2,
      },
    });

    // 상태명
    slide.addText(getStatusLabel(status as IssueStatus), {
      x,
      y: y + 0.1,
      w: statusBoxWidth,
      h: 0.25,
      fontSize: 10,
      color: '64748B', // slate-500
      align: 'center',
      fontFace: 'Noto Sans KR',
    });

    // 이슈 수
    slide.addText(String(count), {
      x,
      y: y + 0.35,
      w: statusBoxWidth,
      h: 0.25,
      fontSize: 16,
      bold: true,
      color: getStatusColor(status as IssueStatus),
      align: 'center',
      fontFace: 'Noto Sans KR',
    });
  });
}

// ============================================================================
// 기본 내보내기
// ============================================================================

export default createIssuesSlide;
