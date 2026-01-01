/**
 * 이슈 시트 생성
 *
 * @module skills/xlsx/generators/issuesSheet
 */

import { serviceIssuesApi } from '@/integrations/cloudflare/client';
import type { ServiceIssue } from '@/types/services/central-hub.types';
import { SERVICE_INFO } from '@/types/services/central-hub.types';
import type {
  IssueSheetRow,
  DateRange,
  ColumnConfig,
} from '@/types/ai/skills.types';
import { SEVERITY_LABELS, STATUS_LABELS } from '@/types/ai/skills.types';

/**
 * 이슈 시트 컬럼 설정
 */
export const issueColumns: ColumnConfig[] = [
  { key: 'id', header: 'ID', width: 36 },
  { key: 'service', header: '서비스', width: 15 },
  { key: 'severity', header: '심각도', width: 10 },
  { key: 'title', header: '제목', width: 40 },
  { key: 'description', header: '설명', width: 60 },
  { key: 'status', header: '상태', width: 12 },
  { key: 'assigneeId', header: '담당자', width: 36 },
  { key: 'resolvedAt', header: '해결일시', width: 20 },
  { key: 'createdAt', header: '생성일시', width: 20 },
];

/**
 * 이슈 데이터 조회
 *
 * @param dateRange - 날짜 필터 (선택)
 * @returns 이슈 시트 행 배열
 */
export async function fetchIssues(
  dateRange?: DateRange
): Promise<IssueSheetRow[]> {
  const { data, error } = await serviceIssuesApi.list({
    limit: 1000,
    date_from: dateRange?.from?.toISOString(),
    date_to: dateRange?.to?.toISOString(),
  });

  if (error) throw new Error(error);

  return ((data || []) as ServiceIssue[]).map((issue) => ({
    id: issue.id,
    service: SERVICE_INFO[issue.service_id]?.name || issue.service_id,
    severity: SEVERITY_LABELS[issue.severity] || issue.severity,
    title: issue.title,
    description: issue.description || '',
    status: STATUS_LABELS[issue.status] || issue.status,
    assigneeId: issue.assigned_to || '',
    resolvedAt: issue.resolved_at
      ? new Date(issue.resolved_at).toLocaleString('ko-KR')
      : '',
    createdAt: new Date(issue.created_at).toLocaleString('ko-KR'),
  }));
}
