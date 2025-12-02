/**
 * KPI 요약 슬라이드 생성
 *
 * Central Hub의 주요 지표를 요약하여 표시
 *
 * @module lib/skills/pptx/summarySlide
 */

import type pptxgen from 'pptxgenjs';
import type { HealthStatus } from '@/types/central-hub.types';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * KPI 항목
 */
export interface KpiItem {
  /** 지표명 */
  label: string;
  /** 지표값 */
  value: string | number;
  /** 변화율 (선택) */
  change?: string;
  /** 색상 (hex, 선택) */
  color?: string;
}

/**
 * 서비스별 상태
 */
export interface ServiceStatus {
  /** 서비스 ID */
  serviceId: string;
  /** 서비스명 */
  serviceName: string;
  /** 헬스 상태 */
  status: HealthStatus;
  /** 가동률 (%) */
  uptime?: number;
}

/**
 * KPI 요약 데이터
 */
export interface SummarySlideData {
  /** 슬라이드 제목 */
  title: string;
  /** 기간 정보 */
  period?: string;
  /** 주요 KPI 목록 */
  kpis: KpiItem[];
  /** 서비스별 상태 (선택) */
  serviceStatuses?: ServiceStatus[];
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 헬스 상태에 따른 색상 반환
 */
function getHealthColor(status: HealthStatus): string {
  const colors: Record<HealthStatus, string> = {
    healthy: '22C55E',   // green-500
    degraded: 'EAB308',  // yellow-500
    unhealthy: 'EF4444', // red-500
    unknown: '6B7280',   // gray-500
  };
  return colors[status] || colors.unknown;
}

/**
 * 헬스 상태 한글 변환
 */
function getHealthLabel(status: HealthStatus): string {
  const labels: Record<HealthStatus, string> = {
    healthy: '정상',
    degraded: '저하',
    unhealthy: '불량',
    unknown: '알 수 없음',
  };
  return labels[status] || labels.unknown;
}

// ============================================================================
// 슬라이드 생성 함수
// ============================================================================

/**
 * KPI 요약 슬라이드 생성
 *
 * @example
 * ```typescript
 * const pptx = new pptxgen();
 * createSummarySlide(pptx, {
 *   title: '주요 지표 요약',
 *   period: '2025년 11월',
 *   kpis: [
 *     { label: '총 이벤트', value: 1250, change: '+15%' },
 *     { label: '해결된 이슈', value: 45, change: '+8%' },
 *     { label: '활성 프로젝트', value: 12 },
 *   ],
 *   serviceStatuses: [
 *     { serviceId: 'minu-find', serviceName: 'Minu Find', status: 'healthy', uptime: 99.9 },
 *     { serviceId: 'minu-frame', serviceName: 'Minu Frame', status: 'healthy', uptime: 98.5 },
 *   ],
 * });
 * ```
 *
 * @param pptx - pptxgenjs 인스턴스
 * @param data - KPI 요약 데이터
 * @throws pptx 인스턴스가 null인 경우
 */
export function createSummarySlide(
  pptx: pptxgen,
  data: SummarySlideData
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

  // KPI 박스들 (2x2 그리드)
  const kpiStartY = 1.7;
  const kpiWidth = 4.25;
  const kpiHeight = 1.2;
  const kpiGap = 0.5;

  data.kpis.forEach((kpi, index) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const x = 0.5 + col * (kpiWidth + kpiGap);
    const y = kpiStartY + row * (kpiHeight + kpiGap);

    // KPI 배경 박스
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: kpiWidth,
      h: kpiHeight,
      fill: { color: 'F8FAFC' }, // slate-50
      line: { color: 'E2E8F0', width: 1 }, // slate-200
    });

    // KPI 레이블
    slide.addText(kpi.label, {
      x: x + 0.2,
      y: y + 0.2,
      w: kpiWidth - 0.4,
      h: 0.4,
      fontSize: 14,
      color: '64748B', // slate-500
      fontFace: 'Noto Sans KR',
    });

    // KPI 값
    const valueColor = kpi.color ? kpi.color.replace('#', '') : '0F172A';
    slide.addText(String(kpi.value), {
      x: x + 0.2,
      y: y + 0.5,
      w: kpiWidth - 0.4,
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: valueColor,
      fontFace: 'Noto Sans KR',
    });

    // 변화율 (있는 경우)
    if (kpi.change) {
      const changeColor = kpi.change.startsWith('+') ? '22C55E' : 'EF4444';
      slide.addText(kpi.change, {
        x: x + kpiWidth - 1.2,
        y: y + 0.2,
        w: 1.0,
        h: 0.3,
        fontSize: 12,
        color: changeColor,
        align: 'right',
        fontFace: 'Noto Sans KR',
      });
    }
  });

  // 서비스 상태 (있는 경우)
  if (data.serviceStatuses && data.serviceStatuses.length > 0) {
    const statusStartY = 4.5;

    slide.addText('서비스 상태', {
      x: 0.5,
      y: statusStartY,
      w: 9.0,
      h: 0.4,
      fontSize: 18,
      bold: true,
      color: '0F172A', // slate-900
      fontFace: 'Noto Sans KR',
    });

    // 서비스 상태 테이블
    const tableData: Array<Array<{ text: string; options?: pptxgen.TextPropsOptions }>> = [];

    // 헤더
    tableData.push([
      { text: '서비스', options: { bold: true } },
      { text: '상태', options: { bold: true } },
      { text: '가동률', options: { bold: true } },
    ]);

    // 데이터 행
    data.serviceStatuses.forEach((service) => {
      tableData.push([
        { text: service.serviceName },
        {
          text: getHealthLabel(service.status),
          options: { color: getHealthColor(service.status) },
        },
        {
          text: service.uptime ? `${service.uptime}%` : 'N/A',
        },
      ]);
    });

    slide.addTable(tableData, {
      x: 0.5,
      y: statusStartY + 0.6,
      w: 9.0,
      h: 1.5,
      fontSize: 12,
      fontFace: 'Noto Sans KR',
      border: { pt: 1, color: 'E2E8F0' }, // slate-200
      fill: { color: 'FFFFFF' },
      color: '0F172A', // slate-900
    });
  }
}

// ============================================================================
// 기본 내보내기
// ============================================================================

export default createSummarySlide;
