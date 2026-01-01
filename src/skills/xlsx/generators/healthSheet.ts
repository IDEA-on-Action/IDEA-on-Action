/**
 * 서비스 헬스 시트 생성
 *
 * @module skills/xlsx/generators/healthSheet
 */

import { serviceHealthApi } from '@/integrations/cloudflare/client';
import type { ServiceHealth } from '@/types/services/central-hub.types';
import { SERVICE_INFO } from '@/types/services/central-hub.types';
import type { HealthSheetRow, ColumnConfig } from '@/types/ai/skills.types';
import { HEALTH_LABELS } from '@/types/ai/skills.types';

/**
 * 헬스 시트 컬럼 설정
 */
export const healthColumns: ColumnConfig[] = [
  { key: 'service', header: '서비스', width: 15 },
  { key: 'status', header: '상태', width: 12 },
  { key: 'responseTimeMs', header: '응답시간 (ms)', width: 15, format: 'number' },
  { key: 'errorRate', header: '에러율 (%)', width: 12, format: 'percent' },
  { key: 'uptimePercent', header: '가동률 (%)', width: 12, format: 'percent' },
  { key: 'lastPing', header: '마지막 핑', width: 20 },
  { key: 'updatedAt', header: '업데이트 시각', width: 20 },
];

/**
 * 서비스 헬스 데이터 조회
 *
 * @returns 헬스 시트 행 배열
 */
export async function fetchHealth(): Promise<HealthSheetRow[]> {
  const { data, error } = await serviceHealthApi.list();

  if (error) throw new Error(error);

  return ((data || []) as ServiceHealth[]).map((health) => ({
    service: SERVICE_INFO[health.service_id]?.name || health.service_id,
    status: HEALTH_LABELS[health.status] || health.status,
    responseTimeMs: health.metrics?.response_time_ms?.toString() || '-',
    errorRate: health.metrics?.error_rate?.toFixed(2) || '-',
    uptimePercent: health.metrics?.uptime_percent?.toFixed(2) || '-',
    lastPing: health.last_ping
      ? new Date(health.last_ping).toLocaleString('ko-KR')
      : '-',
    updatedAt: new Date(health.updated_at).toLocaleString('ko-KR'),
  }));
}
