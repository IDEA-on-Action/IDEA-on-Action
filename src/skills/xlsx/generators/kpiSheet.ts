/**
 * KPI 요약 시트 생성
 *
 * @module skills/xlsx/generators/kpiSheet
 */

import type {
  EventSheetRow,
  IssueSheetRow,
  KPISheetRow,
  ColumnConfig,
} from '@/types/ai/skills.types';

/**
 * KPI 시트 컬럼 설정
 */
export const kpiColumns: ColumnConfig[] = [
  { key: 'metric', header: '지표', width: 30 },
  { key: 'value', header: '값', width: 15 },
  { key: 'change', header: '변화', width: 15 },
  { key: 'period', header: '기간', width: 20 },
];

/**
 * KPI 계산
 *
 * @param events - 이벤트 데이터
 * @param issues - 이슈 데이터
 * @returns KPI 시트 행 배열
 */
export function calculateKPI(
  events: EventSheetRow[],
  issues: IssueSheetRow[]
): KPISheetRow[] {
  const today = new Date();
  const period = `${today.getFullYear()}년 ${today.getMonth() + 1}월`;

  // 이벤트 통계
  const totalEvents = events.length;
  const eventsByType = events.reduce((acc, e) => {
    acc[e.eventType] = (acc[e.eventType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 서비스별 이벤트 수
  const eventsByService = events.reduce((acc, e) => {
    acc[e.service] = (acc[e.service] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 이슈 통계
  const totalIssues = issues.length;
  const openIssues = issues.filter((i) => i.status !== '해결됨' && i.status !== '종료').length;
  const criticalIssues = issues.filter((i) => i.severity === '치명적').length;
  const highIssues = issues.filter((i) => i.severity === '높음').length;
  const resolvedIssues = issues.filter((i) => i.status === '해결됨' || i.status === '종료').length;
  const resolutionRate =
    totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;

  // 서비스별 이슈 수
  const issuesByService = issues.reduce((acc, i) => {
    acc[i.service] = (acc[i.service] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const result: KPISheetRow[] = [
    // 핵심 지표
    { metric: '=== 핵심 지표 ===', value: '', change: '', period: '' },
    { metric: '총 이벤트 수', value: totalEvents, change: '-', period },
    { metric: '총 이슈 수', value: totalIssues, change: '-', period },
    { metric: '미해결 이슈', value: openIssues, change: '-', period },
    { metric: '치명적 이슈', value: criticalIssues, change: '-', period },
    { metric: '높은 심각도 이슈', value: highIssues, change: '-', period },
    { metric: '이슈 해결률', value: `${resolutionRate}%`, change: '-', period },
    { metric: '', value: '', change: '', period: '' },

    // 서비스별 이벤트
    { metric: '=== 서비스별 이벤트 ===', value: '', change: '', period: '' },
    ...Object.entries(eventsByService).map(([service, count]) => ({
      metric: service,
      value: count,
      change: '-',
      period,
    })),
    { metric: '', value: '', change: '', period: '' },

    // 서비스별 이슈
    { metric: '=== 서비스별 이슈 ===', value: '', change: '', period: '' },
    ...Object.entries(issuesByService).map(([service, count]) => ({
      metric: service,
      value: count,
      change: '-',
      period,
    })),
    { metric: '', value: '', change: '', period: '' },

    // 이벤트 유형별
    { metric: '=== 이벤트 유형별 ===', value: '', change: '', period: '' },
    ...Object.entries(eventsByType).map(([type, count]) => ({
      metric: type,
      value: count,
      change: '-',
      period,
    })),
  ];

  return result;
}
