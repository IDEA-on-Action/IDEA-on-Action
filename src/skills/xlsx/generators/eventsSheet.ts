/**
 * 이벤트 시트 생성
 *
 * @module skills/xlsx/generators/eventsSheet
 */

import { serviceEventsApi } from '@/integrations/cloudflare/client';
import type { ServiceEvent } from '@/types/services/central-hub.types';
import { SERVICE_INFO } from '@/types/services/central-hub.types';
import type {
  EventSheetRow,
  DateRange,
  ColumnConfig,
} from '@/types/ai/skills.types';
import { EVENT_TYPE_LABELS } from '@/types/ai/skills.types';

/**
 * 이벤트 시트 컬럼 설정
 */
export const eventColumns: ColumnConfig[] = [
  { key: 'id', header: 'ID', width: 36 },
  { key: 'service', header: '서비스', width: 15 },
  { key: 'eventType', header: '이벤트 유형', width: 25 },
  { key: 'projectId', header: '프로젝트 ID', width: 36 },
  { key: 'userId', header: '사용자 ID', width: 36 },
  { key: 'createdAt', header: '생성일시', width: 20 },
  { key: 'payload', header: '페이로드', width: 50 },
];

/**
 * 이벤트 데이터 조회
 *
 * @param dateRange - 날짜 필터 (선택)
 * @returns 이벤트 시트 행 배열
 */
export async function fetchEvents(
  dateRange?: DateRange
): Promise<EventSheetRow[]> {
  const { data, error } = await serviceEventsApi.list({
    limit: 1000,
    date_from: dateRange?.from?.toISOString(),
    date_to: dateRange?.to?.toISOString(),
  });

  if (error) throw new Error(error);

  return ((data || []) as ServiceEvent[]).map((event) => ({
    id: event.id,
    service: SERVICE_INFO[event.service_id]?.name || event.service_id,
    eventType: EVENT_TYPE_LABELS[event.event_type] || event.event_type,
    projectId: event.project_id || '',
    userId: event.user_id || '',
    createdAt: new Date(event.created_at).toLocaleString('ko-KR'),
    payload: JSON.stringify(event.payload),
  }));
}
