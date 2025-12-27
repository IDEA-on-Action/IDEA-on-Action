/**
 * 차트가 포함된 이벤트 리포트 생성
 *
 * 이벤트 데이터 + 트렌드 차트 + 유형별 분포 차트
 * ExcelJS 기반으로 마이그레이션됨 (보안 취약점 해결)
 *
 * @module skills/xlsx/generators/eventReportWithChart
 */

import ExcelJS from 'exceljs';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ServiceEvent } from '@/types/central-hub.types';
import { SERVICE_INFO } from '@/types/central-hub.types';
import type { DateRange, EventSheetRow } from '@/types/skills.types';
import { EVENT_TYPE_LABELS } from '@/types/skills.types';
import type {
  TrendChartData,
  DistributionChartData,
} from '@/types/xlsx-chart.types';
import {
  createTrendChart,
  createPieChart,
  generateChartImage,
} from '@/skills/xlsx/chart/chart-utils';
import { eventColumns } from './eventsSheet';

/**
 * 차트가 포함된 이벤트 리포트 생성
 *
 * @param supabase - Supabase 클라이언트
 * @param dateRange - 날짜 범위 (선택)
 * @returns Excel 워크북
 *
 * @example
 * ```ts
 * const workbook = await generateEventReportWithChart(supabase, {
 *   from: new Date('2025-11-01'),
 *   to: new Date('2025-11-30'),
 * });
 *
 * const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
 * const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
 * ```
 */
export async function generateEventReportWithChart(
  supabase: SupabaseClient,
  dateRange?: DateRange
): Promise<ExcelJS.Workbook> {
  // 1. 이벤트 데이터 조회
  const events = await fetchEventsForChart(supabase, dateRange);

  // 2. 워크북 생성 (ExcelJS)
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IDEA on Action';
  workbook.created = new Date();

  // 3. 시트 1: 이벤트 로그 (테이블)
  const eventSheet = workbook.addWorksheet('이벤트 로그');
  eventSheet.columns = eventColumns.map((col) => ({
    header: col.header,
    key: col.key || col.header,
    width: col.width || 15,
  }));
  events.forEach(event => eventSheet.addRow(event));

  // 4. 시트 2: 트렌드 차트 데이터 준비
  const trendData = prepareTrendData(events);
  const trendChartConfig = createTrendChart(trendData);

  // 5. 시트 3: 유형별 분포 차트 데이터 준비
  const distributionData = prepareDistributionData(events);
  const pieChartConfig = createPieChart(distributionData);

  // 6. 차트 이미지 생성
  const [trendChartResult, pieChartResult] = await Promise.all([
    generateChartImage(trendChartConfig),
    generateChartImage(pieChartConfig),
  ]);

  // 7. 시트 2: 트렌드 차트 정보
  createChartInfoSheetExcel(
    workbook,
    '트렌드 차트',
    '일별 이벤트 트렌드',
    trendChartResult,
    trendData.data
  );

  // 8. 시트 3: 유형별 분포 차트
  createChartInfoSheetExcel(
    workbook,
    '유형별 분포',
    '유형별 이벤트 분포',
    pieChartResult,
    distributionData.data.map((d) => ({ date: d.category, count: d.count }))
  );

  return workbook;
}

/**
 * 차트용 이벤트 데이터 조회
 */
async function fetchEventsForChart(
  supabase: SupabaseClient,
  dateRange?: DateRange
): Promise<EventSheetRow[]> {
  let query = supabase
    .from('service_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.from.toISOString())
      .lte('created_at', dateRange.to.toISOString());
  }

  const { data, error } = await query;

  if (error) throw error;

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

/**
 * 트렌드 데이터 준비 (일별 집계)
 */
function prepareTrendData(events: EventSheetRow[]): TrendChartData {
  const dateMap = new Map<string, number>();

  events.forEach((event) => {
    const date = event.createdAt.split(' ')[0]; // YYYY. MM. DD 형식
    dateMap.set(date, (dateMap.get(date) || 0) + 1);
  });

  const sortedDates = Array.from(dateMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30); // 최근 30일

  return {
    data: sortedDates.map(([date, count]) => ({ date, count })),
    title: '일별 이벤트 수 (최근 30일)',
  };
}

/**
 * 분포 데이터 준비 (유형별 집계)
 */
function prepareDistributionData(
  events: EventSheetRow[]
): DistributionChartData {
  const typeMap = new Map<string, number>();

  events.forEach((event) => {
    typeMap.set(event.eventType, (typeMap.get(event.eventType) || 0) + 1);
  });

  const sortedTypes = Array.from(typeMap.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  return {
    data: sortedTypes.map(([category, count]) => ({ category, count })),
    title: '유형별 이벤트 분포',
  };
}

/**
 * 차트 정보 시트 생성 (ExcelJS)
 *
 * 차트 데이터와 메타 정보를 포함한 설명 시트를 생성합니다.
 *
 * @param workbook - ExcelJS 워크북
 * @param sheetName - 시트명
 * @param title - 차트 제목
 * @param chartResult - 차트 생성 결과
 * @param data - 차트 원본 데이터
 */
function createChartInfoSheetExcel(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  title: string,
  chartResult: {
    blob: Blob;
    duration: number;
    size: number;
  },
  data: Array<{ date: string; count: number }>
): void {
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = [
    { header: '항목', key: 'item', width: 30 },
    { header: '값', key: 'value', width: 20 },
  ];

  sheet.addRow({ item: '차트 제목', value: title });
  sheet.addRow({ item: '생성 시간', value: `${chartResult.duration.toFixed(2)}ms` });
  sheet.addRow({ item: '이미지 크기', value: `${(chartResult.size / 1024).toFixed(2)} KB` });
  sheet.addRow({ item: '데이터 포인트 수', value: data.length });
  sheet.addRow({ item: '', value: '' });
  sheet.addRow({ item: '데이터 (날짜/카테고리)', value: '개수' });

  // 데이터 추가
  data.forEach((d) => {
    sheet.addRow({ item: d.date, value: d.count });
  });
}

/**
 * 차트 이미지를 Data URL로 변환
 *
 * @param blob - 차트 이미지 Blob
 * @returns Data URL 문자열
 */
export async function chartBlobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 차트 이미지 다운로드
 *
 * @param blob - 차트 이미지 Blob
 * @param filename - 파일명
 */
export function downloadChartImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
