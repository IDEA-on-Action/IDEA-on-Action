/**
 * Minu Keep 운영 보고서 템플릿
 *
 * 시스템 운영 현황 및 SLA 리포트 형식으로,
 * SLA 현황, 장애 이력, 개선 사항, 다음 달 계획을 포함합니다.
 *
 * @module lib/skills/templates/reports/operations-report
 */

import {
  Document,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  TextRun,
  WidthType,
  BorderStyle,
  AlignmentType,
  Packer,
} from 'docx';
import type { TemplateData } from '@/types/documents/docx.types';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * SLA 지표 항목
 */
export interface SLAMetricItem {
  /** 지표명 */
  metric: string;
  /** 목표값 */
  target: string;
  /** 실적값 */
  actual: string;
  /** 달성률 (%) */
  achievement: number;
  /** 비고 (선택) */
  note?: string;
}

/**
 * 장애 이력 항목
 */
export interface IncidentItem {
  /** 발생 일시 */
  datetime: string;
  /** 영향 범위 */
  impact: string;
  /** 원인 */
  cause: string;
  /** 조치 내용 */
  action: string;
  /** 조치 완료 여부 */
  resolved?: boolean;
  /** 담당자 (선택) */
  owner?: string;
}

/**
 * 템플릿 변수 타입
 */
export interface OperationsReportVariable {
  /** 변수 이름 */
  name: string;
  /** 라벨 */
  label: string;
  /** 입력 타입 */
  type: 'text' | 'table' | 'textarea';
  /** 필수 여부 */
  required: boolean;
}

/**
 * 운영 보고서 데이터 인터페이스
 */
export interface OperationsReportData extends TemplateData {
  /** 보고 월 (예: '2025년 11월') */
  reportMonth: string;
  /** SLA 지표 */
  slaMetrics: SLAMetricItem[];
  /** 장애 이력 (선택) */
  incidents?: IncidentItem[];
  /** 개선 사항 (선택) */
  improvements?: string;
  /** 다음 달 계획 */
  nextMonthPlan: string;
  /** 작성자 (선택) */
  author?: string;
  /** 서비스명 (선택, 기본값: Minu Keep) */
  serviceName?: string;
  /** 운영 담당팀 (선택) */
  teamName?: string;
  /** 보고 대상자 (선택) */
  reportTo?: string;
}

// ============================================================================
// DocumentTemplate 형식 (TASK-CS-037 요구사항)
// ============================================================================

/**
 * 운영 보고서 템플릿 정의
 *
 * TASK-CS-037 요구사항에 따른 DocumentTemplate 형식
 */
export const operationsReportTemplate = {
  id: 'operations-report',
  name: '월간 운영 보고서',
  description: '시스템 운영 현황 및 SLA 리포트',
  templateType: 'monthly-report',
  serviceId: 'minu-keep',
  variables: [
    { name: 'reportMonth', label: '보고 월', type: 'text', required: true },
    { name: 'slaMetrics', label: 'SLA 지표', type: 'table', required: true },
    { name: 'incidents', label: '장애 이력', type: 'table', required: false },
    { name: 'improvements', label: '개선 사항', type: 'textarea', required: false },
    { name: 'nextMonthPlan', label: '다음 달 계획', type: 'textarea', required: true },
  ] as OperationsReportVariable[],
  content: {
    sections: [
      { id: '1', type: 'heading', content: '{{reportMonth}} 운영 보고서', style: { level: 1 } },
      { id: '2', type: 'heading', content: '1. SLA 현황', style: { level: 2 } },
      {
        id: '3',
        type: 'table',
        content: {
          headers: ['지표', '목표', '실적', '달성률'],
          dataVariable: 'slaMetrics',
          columns: ['metric', 'target', 'actual', 'achievement'],
        },
      },
      { id: '4', type: 'heading', content: '2. 장애 이력', style: { level: 2 } },
      {
        id: '5',
        type: 'table',
        content: {
          headers: ['일시', '영향', '원인', '조치'],
          dataVariable: 'incidents',
          columns: ['datetime', 'impact', 'cause', 'action'],
        },
      },
      { id: '6', type: 'heading', content: '3. 개선 사항', style: { level: 2 } },
      { id: '7', type: 'paragraph', content: '{{improvements}}' },
      { id: '8', type: 'heading', content: '4. 다음 달 계획', style: { level: 2 } },
      { id: '9', type: 'paragraph', content: '{{nextMonthPlan}}' },
    ],
  },
  version: 1,
  isActive: true,
  createdAt: '2025-11-24',
  updatedAt: '2025-11-24',
} as const;

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 달성률 색상 결정
 */
function getAchievementColor(rate: number): string {
  if (rate >= 100) return '2E7D32'; // 녹색 (목표 달성)
  if (rate >= 95) return '1565C0'; // 파란색 (양호)
  if (rate >= 90) return 'F57C00'; // 주황색 (주의)
  return 'C62828'; // 빨간색 (미달)
}

/**
 * 달성률 아이콘 결정
 */
function getAchievementIcon(rate: number): string {
  if (rate >= 100) return '✓';
  if (rate >= 95) return '△';
  return '✗';
}

/**
 * 테이블 셀 생성 헬퍼
 */
function createTableCell(
  text: string,
  options?: {
    bold?: boolean;
    shading?: string;
    alignment?: typeof AlignmentType.CENTER | typeof AlignmentType.LEFT | typeof AlignmentType.RIGHT;
    width?: number;
    color?: string;
  }
): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: options?.bold,
            size: 20,
            font: 'Malgun Gothic',
            color: options?.color,
          }),
        ],
        alignment: options?.alignment || AlignmentType.LEFT,
      }),
    ],
    shading: options?.shading ? { fill: options.shading } : undefined,
    width: options?.width
      ? { size: options.width, type: WidthType.PERCENTAGE }
      : undefined,
  });
}

/**
 * 섹션 제목 생성
 */
function createSectionHeading(text: string, level: HeadingLevel = HeadingLevel.HEADING_1): Paragraph {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 400, after: 200 },
    style: 'heading',
  });
}

// ============================================================================
// 운영 보고서 빌더
// ============================================================================

/**
 * 운영 보고서 섹션 빌드
 * @param data 운영 보고서 데이터
 * @returns Paragraph 및 Table 배열
 */
export function buildOperationsReportSections(data: OperationsReportData): (Paragraph | Table)[] {
  const sections: (Paragraph | Table)[] = [];
  const serviceName = data.serviceName || 'Minu Keep';

  // =========================================================================
  // 1. 헤더: 제목
  // =========================================================================
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${data.reportMonth} 운영 보고서`,
          bold: true,
          size: 40, // 20pt
          font: 'Malgun Gothic',
        }),
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // 서비스명
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: serviceName,
          size: 28,
          font: 'Malgun Gothic',
          color: '1565C0',
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  // =========================================================================
  // 2. 작성자/팀/보고대상 정보
  // =========================================================================
  const metaInfo: string[] = [];
  if (data.teamName) metaInfo.push(`운영팀: ${data.teamName}`);
  if (data.author) metaInfo.push(`작성자: ${data.author}`);
  if (data.reportTo) metaInfo.push(`보고 대상: ${data.reportTo}`);

  if (metaInfo.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: metaInfo.join(' | '),
            size: 20,
            font: 'Malgun Gothic',
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    );
  }

  // 작성일
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `작성일: ${new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}`,
          size: 18,
          font: 'Malgun Gothic',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // 구분선
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: '' })],
      border: { bottom: { style: BorderStyle.DOUBLE, size: 6, color: '1565C0' } },
      spacing: { after: 400 },
    })
  );

  // =========================================================================
  // 3. SLA 현황
  // =========================================================================
  sections.push(createSectionHeading('1. SLA 현황'));

  if (data.slaMetrics.length > 0) {
    // SLA 요약 통계
    const totalMetrics = data.slaMetrics.length;
    const achievedCount = data.slaMetrics.filter(m => m.achievement >= 100).length;
    const overallRate = Math.round(
      data.slaMetrics.reduce((sum, m) => sum + m.achievement, 0) / totalMetrics
    );

    // 요약 문구
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `총 ${totalMetrics}개 지표 중 ${achievedCount}개 달성 (평균 달성률: ${overallRate}%)`,
            size: 20,
            font: 'Malgun Gothic',
            bold: true,
            color: getAchievementColor(overallRate),
          }),
        ],
        spacing: { before: 100, after: 200 },
        indent: { left: 360 },
      })
    );

    // SLA 테이블
    const slaTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // 헤더 행
        new TableRow({
          children: [
            createTableCell('지표', { bold: true, shading: '1565C0', width: 35, color: 'FFFFFF' }),
            createTableCell('목표', {
              bold: true,
              shading: '1565C0',
              width: 20,
              alignment: AlignmentType.CENTER,
              color: 'FFFFFF',
            }),
            createTableCell('실적', {
              bold: true,
              shading: '1565C0',
              width: 20,
              alignment: AlignmentType.CENTER,
              color: 'FFFFFF',
            }),
            createTableCell('달성률', {
              bold: true,
              shading: '1565C0',
              width: 25,
              alignment: AlignmentType.CENTER,
              color: 'FFFFFF',
            }),
          ],
          tableHeader: true,
        }),
        // 데이터 행
        ...data.slaMetrics.map((metric) => {
          const icon = getAchievementIcon(metric.achievement);
          const color = getAchievementColor(metric.achievement);
          return new TableRow({
            children: [
              createTableCell(metric.metric),
              createTableCell(metric.target, { alignment: AlignmentType.CENTER }),
              createTableCell(metric.actual, { alignment: AlignmentType.CENTER }),
              createTableCell(`${icon} ${metric.achievement}%`, {
                alignment: AlignmentType.CENTER,
                color: color,
                bold: true,
              }),
            ],
          });
        }),
      ],
    });
    sections.push(slaTable);
  } else {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: '• SLA 지표 데이터 없음', size: 20, font: 'Malgun Gothic' })],
        indent: { left: 360 },
      })
    );
  }

  // =========================================================================
  // 4. 장애 이력
  // =========================================================================
  sections.push(createSectionHeading('2. 장애 이력'));

  if (data.incidents && data.incidents.length > 0) {
    // 장애 건수 요약
    const totalIncidents = data.incidents.length;
    const resolvedCount = data.incidents.filter(i => i.resolved !== false).length;

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `총 ${totalIncidents}건 발생, ${resolvedCount}건 조치 완료`,
            size: 20,
            font: 'Malgun Gothic',
            bold: true,
            color: totalIncidents === 0 ? '2E7D32' : 'C62828',
          }),
        ],
        spacing: { before: 100, after: 200 },
        indent: { left: 360 },
      })
    );

    // 장애 이력 테이블
    const incidentTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // 헤더 행
        new TableRow({
          children: [
            createTableCell('일시', { bold: true, shading: 'FFEBEE', width: 20 }),
            createTableCell('영향', { bold: true, shading: 'FFEBEE', width: 25 }),
            createTableCell('원인', { bold: true, shading: 'FFEBEE', width: 25 }),
            createTableCell('조치', { bold: true, shading: 'FFEBEE', width: 30 }),
          ],
          tableHeader: true,
        }),
        // 데이터 행
        ...data.incidents.map(
          (incident) =>
            new TableRow({
              children: [
                createTableCell(incident.datetime),
                createTableCell(incident.impact),
                createTableCell(incident.cause),
                createTableCell(incident.action),
              ],
            })
        ),
      ],
    });
    sections.push(incidentTable);
  } else {
    // 장애 없음 - 긍정적 메시지
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '✓ 금월 장애 발생 없음',
            size: 22,
            font: 'Malgun Gothic',
            color: '2E7D32',
            bold: true,
          }),
        ],
        spacing: { before: 100, after: 200 },
        indent: { left: 360 },
      })
    );
  }

  // =========================================================================
  // 5. 개선 사항
  // =========================================================================
  sections.push(createSectionHeading('3. 개선 사항'));

  if (data.improvements && data.improvements.trim()) {
    // 개선 사항을 줄 단위로 분리
    const improvementLines = data.improvements.split('\n').filter(line => line.trim());

    if (improvementLines.length > 1) {
      // 여러 줄인 경우 각각 bullet point로
      improvementLines.forEach((line) => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${line.trim()}`,
                size: 20,
                font: 'Malgun Gothic',
              }),
            ],
            spacing: { before: 80, after: 80 },
            indent: { left: 360 },
          })
        );
      });
    } else {
      // 한 줄인 경우 일반 문단
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: data.improvements.trim(),
              size: 20,
              font: 'Malgun Gothic',
            }),
          ],
          spacing: { before: 100, after: 200 },
          indent: { left: 360 },
        })
      );
    }
  } else {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: '• 특이사항 없음', size: 20, font: 'Malgun Gothic' })],
        indent: { left: 360 },
      })
    );
  }

  // =========================================================================
  // 6. 다음 달 계획
  // =========================================================================
  sections.push(createSectionHeading('4. 다음 달 계획'));

  if (data.nextMonthPlan && data.nextMonthPlan.trim()) {
    // 계획을 줄 단위로 분리
    const planLines = data.nextMonthPlan.split('\n').filter(line => line.trim());

    if (planLines.length > 1) {
      // 여러 줄인 경우 번호 매기기
      planLines.forEach((line, index) => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${index + 1}. ${line.trim()}`,
                size: 20,
                font: 'Malgun Gothic',
              }),
            ],
            spacing: { before: 80, after: 80 },
            indent: { left: 360 },
          })
        );
      });
    } else {
      // 한 줄인 경우 일반 문단
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: data.nextMonthPlan.trim(),
              size: 20,
              font: 'Malgun Gothic',
            }),
          ],
          spacing: { before: 100, after: 200 },
          indent: { left: 360 },
        })
      );
    }
  } else {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: '• 계획된 업무 없음', size: 20, font: 'Malgun Gothic' })],
        indent: { left: 360 },
      })
    );
  }

  return sections;
}

/**
 * 운영 보고서 Document 생성
 * @param data 운영 보고서 데이터
 * @returns Document 객체
 */
export function createOperationsReportDocument(data: OperationsReportData): Document {
  const sections = buildOperationsReportSections(data);
  const serviceName = data.serviceName || 'Minu Keep';

  return new Document({
    creator: data.author || 'IDEA on Action',
    title: `${data.reportMonth} ${serviceName} 운영 보고서`,
    description: `${data.reportMonth} 시스템 운영 현황 및 SLA 리포트`,
    styles: {
      paragraphStyles: [
        {
          id: 'heading',
          name: 'Heading',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: 'Malgun Gothic',
            bold: true,
            size: 24,
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: sections,
      },
    ],
  });
}

/**
 * 운영 보고서 Blob 생성
 * @param data 운영 보고서 데이터
 * @returns Blob Promise
 */
export async function generateOperationsReportBlob(data: OperationsReportData): Promise<Blob> {
  const document = createOperationsReportDocument(data);
  return await Packer.toBlob(document);
}

/**
 * 운영 보고서 다운로드
 * @param data 운영 보고서 데이터
 * @param fileName 파일명 (선택, 기본값: 운영보고서_YYYY년_MM월.docx)
 */
export async function downloadOperationsReport(
  data: OperationsReportData,
  fileName?: string
): Promise<void> {
  const blob = await generateOperationsReportBlob(data);

  const defaultFileName = `운영보고서_${data.reportMonth.replace(/\s/g, '_')}.docx`;
  const finalFileName = fileName || defaultFileName;

  // 다운로드 트리거
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// 기본 템플릿 데이터
// ============================================================================

/**
 * 운영 보고서 기본 SLA 지표
 */
export const defaultSLAMetrics: SLAMetricItem[] = [
  { metric: '서비스 가용률', target: '99.9%', actual: '99.95%', achievement: 100 },
  { metric: '평균 응답 시간', target: '200ms', actual: '180ms', achievement: 110 },
  { metric: '에러율', target: '0.1%', actual: '0.08%', achievement: 125 },
  { metric: '장애 복구 시간(MTTR)', target: '30분', actual: '25분', achievement: 120 },
  { metric: '보안 취약점 해결률', target: '100%', actual: '100%', achievement: 100 },
];

/**
 * 운영 보고서 기본 데이터
 */
export const operationsReportDefaults: Partial<OperationsReportData> = {
  serviceName: 'Minu Keep',
  slaMetrics: defaultSLAMetrics,
  improvements: '시스템 모니터링 대시보드 개선\n알림 임계값 최적화\n로그 보존 기간 확대',
  nextMonthPlan: '인프라 업그레이드 계획\n보안 패치 적용\n성능 최적화 작업',
};
