/**
 * 월간 보고서 템플릿
 *
 * 월간 KPI 및 성과 보고 형식으로, 요약, KPI 달성 현황,
 * 프로젝트별 진행 현황, 리소스 현황, 리스크 및 다음 달 계획을 포함합니다.
 *
 * @module lib/skills/templates/reports/monthly-report
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
 * KPI 항목
 */
export interface KPIItem {
  /** KPI 명 */
  name: string;
  /** 목표값 */
  target: number;
  /** 실제값 */
  actual: number;
  /** 단위 (%, 건, 원 등) */
  unit: string;
  /** 비고 (선택) */
  note?: string;
}

/**
 * 프로젝트 상태 항목
 */
export interface ProjectStatusItem {
  /** 프로젝트명 */
  name: string;
  /** 상태 (진행중, 완료, 지연, 보류 등) */
  status: '진행중' | '완료' | '지연' | '보류' | '예정' | string;
  /** 진행률 (0-100) */
  progress: number;
  /** 담당자 (선택) */
  owner?: string;
  /** 예상 완료일 (선택) */
  expectedCompletion?: Date;
  /** 비고 (선택) */
  note?: string;
}

/**
 * 리소스 항목
 */
export interface ResourceItem {
  /** 카테고리 (인력, 예산, 장비 등) */
  category: string;
  /** 계획값 */
  planned: number;
  /** 실제값 */
  actual: number;
  /** 단위 (선택) */
  unit?: string;
  /** 비고 (선택) */
  note?: string;
}

/**
 * 리스크 항목
 */
export interface MonthlyRiskItem {
  /** 리스크 설명 */
  description: string;
  /** 심각도 */
  severity: '낮음' | '보통' | '높음' | '심각' | string;
  /** 대응 방안 */
  mitigation: string;
  /** 담당자 (선택) */
  owner?: string;
}

/**
 * 월간 보고서 데이터 인터페이스
 */
export interface MonthlyReportData extends TemplateData {
  /** 연도 */
  year: number;
  /** 월 (1-12) */
  month: number;
  /** 월간 요약 (Executive Summary) */
  executiveSummary: string;
  /** KPI 달성 현황 */
  kpis: KPIItem[];
  /** 주요 성과 (하이라이트) */
  highlights: string[];
  /** 프로젝트별 진행 현황 */
  projectStatus: ProjectStatusItem[];
  /** 리소스 현황 (인력, 예산) */
  resources: ResourceItem[];
  /** 이슈 및 리스크 */
  risks: MonthlyRiskItem[];
  /** 다음 달 계획 */
  nextMonthPlan: string[];
  /** 작성자 (선택) */
  author?: string;
  /** 부서명 (선택) */
  department?: string;
  /** 보고 대상자 (선택) */
  reportTo?: string;
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 월 이름 반환 (한국어)
 */
function getMonthNameKR(month: number): string {
  return `${month}월`;
}

/**
 * KPI 달성률 계산
 */
function calculateAchievementRate(target: number, actual: number): number {
  if (target === 0) return 0;
  return Math.round((actual / target) * 100);
}

/**
 * 달성률 색상 결정
 */
function getAchievementColor(rate: number): string {
  if (rate >= 100) return '2E7D32'; // 녹색
  if (rate >= 80) return 'F57C00'; // 주황색
  return 'C62828'; // 빨간색
}

/**
 * 상태별 색상 결정
 */
function getStatusColor(status: string): string {
  switch (status) {
    case '완료':
      return '2E7D32';
    case '진행중':
      return '1565C0';
    case '지연':
      return 'C62828';
    case '보류':
      return '757575';
    case '예정':
      return '6A1B9A';
    default:
      return '000000';
  }
}

/**
 * 심각도별 색상 결정
 */
function getSeverityColor(severity: string): string {
  switch (severity) {
    case '심각':
      return 'C62828';
    case '높음':
      return 'E65100';
    case '보통':
      return 'F57C00';
    case '낮음':
      return '2E7D32';
    default:
      return '000000';
  }
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
// 월간 보고서 빌더
// ============================================================================

/**
 * 월간 보고서 섹션 빌드
 * @param data 월간 보고서 데이터
 * @returns Paragraph 및 Table 배열
 */
export function buildMonthlyReportSections(data: MonthlyReportData): (Paragraph | Table)[] {
  const sections: (Paragraph | Table)[] = [];

  // 1. 헤더: 제목
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${data.year}년 ${getMonthNameKR(data.month)} 월간 보고서`,
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

  // 2. 작성자/부서/보고대상 정보
  const metaInfo: string[] = [];
  if (data.department) metaInfo.push(`부서: ${data.department}`);
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

  // 3. Executive Summary
  sections.push(createSectionHeading('1. 월간 요약 (Executive Summary)'));
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: data.executiveSummary,
          size: 22,
          font: 'Malgun Gothic',
        }),
      ],
      spacing: { before: 100, after: 200 },
      indent: { left: 360 },
    })
  );

  // 4. KPI 달성 현황
  sections.push(createSectionHeading('2. KPI 달성 현황'));

  if (data.kpis.length > 0) {
    const kpiTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // 헤더 행
        new TableRow({
          children: [
            createTableCell('KPI 항목', { bold: true, shading: '1565C0', width: 30, color: 'FFFFFF' }),
            createTableCell('목표', {
              bold: true,
              shading: '1565C0',
              width: 17,
              alignment: AlignmentType.CENTER,
              color: 'FFFFFF',
            }),
            createTableCell('실적', {
              bold: true,
              shading: '1565C0',
              width: 17,
              alignment: AlignmentType.CENTER,
              color: 'FFFFFF',
            }),
            createTableCell('달성률', {
              bold: true,
              shading: '1565C0',
              width: 18,
              alignment: AlignmentType.CENTER,
              color: 'FFFFFF',
            }),
            createTableCell('비고', {
              bold: true,
              shading: '1565C0',
              width: 18,
              alignment: AlignmentType.CENTER,
              color: 'FFFFFF',
            }),
          ],
          tableHeader: true,
        }),
        // 데이터 행
        ...data.kpis.map((kpi) => {
          const achievementRate = calculateAchievementRate(kpi.target, kpi.actual);
          return new TableRow({
            children: [
              createTableCell(kpi.name),
              createTableCell(`${kpi.target.toLocaleString()}${kpi.unit}`, {
                alignment: AlignmentType.CENTER,
              }),
              createTableCell(`${kpi.actual.toLocaleString()}${kpi.unit}`, {
                alignment: AlignmentType.CENTER,
              }),
              createTableCell(`${achievementRate}%`, {
                alignment: AlignmentType.CENTER,
                color: getAchievementColor(achievementRate),
                bold: true,
              }),
              createTableCell(kpi.note || '-', { alignment: AlignmentType.CENTER }),
            ],
          });
        }),
      ],
    });
    sections.push(kpiTable);
  }

  // 5. 주요 성과 (하이라이트)
  sections.push(createSectionHeading('3. 주요 성과'));

  if (data.highlights.length > 0) {
    data.highlights.forEach((highlight) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `★ ${highlight}`,
              size: 20,
              font: 'Malgun Gothic',
              color: '1565C0',
            }),
          ],
          spacing: { before: 100, after: 100 },
          indent: { left: 360 },
        })
      );
    });
  } else {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: '• 특이사항 없음', size: 20, font: 'Malgun Gothic' })],
        indent: { left: 360 },
      })
    );
  }

  // 6. 프로젝트별 진행 현황
  sections.push(createSectionHeading('4. 프로젝트별 진행 현황'));

  if (data.projectStatus.length > 0) {
    const projectTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // 헤더 행
        new TableRow({
          children: [
            createTableCell('프로젝트', { bold: true, shading: 'E8EAF6', width: 35 }),
            createTableCell('상태', {
              bold: true,
              shading: 'E8EAF6',
              width: 15,
              alignment: AlignmentType.CENTER,
            }),
            createTableCell('진행률', {
              bold: true,
              shading: 'E8EAF6',
              width: 15,
              alignment: AlignmentType.CENTER,
            }),
            createTableCell('담당자', {
              bold: true,
              shading: 'E8EAF6',
              width: 15,
              alignment: AlignmentType.CENTER,
            }),
            createTableCell('비고', {
              bold: true,
              shading: 'E8EAF6',
              width: 20,
              alignment: AlignmentType.CENTER,
            }),
          ],
          tableHeader: true,
        }),
        // 데이터 행
        ...data.projectStatus.map(
          (project) =>
            new TableRow({
              children: [
                createTableCell(project.name),
                createTableCell(project.status, {
                  alignment: AlignmentType.CENTER,
                  color: getStatusColor(project.status),
                  bold: true,
                }),
                createTableCell(`${project.progress}%`, { alignment: AlignmentType.CENTER }),
                createTableCell(project.owner || '-', { alignment: AlignmentType.CENTER }),
                createTableCell(project.note || '-', { alignment: AlignmentType.CENTER }),
              ],
            })
        ),
      ],
    });
    sections.push(projectTable);
  }

  // 7. 리소스 현황
  sections.push(createSectionHeading('5. 리소스 현황'));

  if (data.resources.length > 0) {
    const resourceTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // 헤더 행
        new TableRow({
          children: [
            createTableCell('항목', { bold: true, shading: 'FFF3E0', width: 30 }),
            createTableCell('계획', {
              bold: true,
              shading: 'FFF3E0',
              width: 20,
              alignment: AlignmentType.CENTER,
            }),
            createTableCell('실적', {
              bold: true,
              shading: 'FFF3E0',
              width: 20,
              alignment: AlignmentType.CENTER,
            }),
            createTableCell('차이', {
              bold: true,
              shading: 'FFF3E0',
              width: 15,
              alignment: AlignmentType.CENTER,
            }),
            createTableCell('비고', {
              bold: true,
              shading: 'FFF3E0',
              width: 15,
              alignment: AlignmentType.CENTER,
            }),
          ],
          tableHeader: true,
        }),
        // 데이터 행
        ...data.resources.map((resource) => {
          const diff = resource.actual - resource.planned;
          const diffText = diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString();
          const diffColor = diff > 0 ? 'C62828' : diff < 0 ? '2E7D32' : '000000';
          const unit = resource.unit || '';

          return new TableRow({
            children: [
              createTableCell(resource.category),
              createTableCell(`${resource.planned.toLocaleString()}${unit}`, {
                alignment: AlignmentType.CENTER,
              }),
              createTableCell(`${resource.actual.toLocaleString()}${unit}`, {
                alignment: AlignmentType.CENTER,
              }),
              createTableCell(`${diffText}${unit}`, {
                alignment: AlignmentType.CENTER,
                color: diffColor,
                bold: true,
              }),
              createTableCell(resource.note || '-', { alignment: AlignmentType.CENTER }),
            ],
          });
        }),
      ],
    });
    sections.push(resourceTable);
  }

  // 8. 이슈 및 리스크
  sections.push(createSectionHeading('6. 이슈 및 리스크'));

  if (data.risks.length > 0) {
    const riskTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // 헤더 행
        new TableRow({
          children: [
            createTableCell('리스크 내용', { bold: true, shading: 'FFEBEE', width: 35 }),
            createTableCell('심각도', {
              bold: true,
              shading: 'FFEBEE',
              width: 15,
              alignment: AlignmentType.CENTER,
            }),
            createTableCell('대응 방안', { bold: true, shading: 'FFEBEE', width: 35 }),
            createTableCell('담당자', {
              bold: true,
              shading: 'FFEBEE',
              width: 15,
              alignment: AlignmentType.CENTER,
            }),
          ],
          tableHeader: true,
        }),
        // 데이터 행
        ...data.risks.map(
          (risk) =>
            new TableRow({
              children: [
                createTableCell(risk.description),
                createTableCell(risk.severity, {
                  alignment: AlignmentType.CENTER,
                  color: getSeverityColor(risk.severity),
                  bold: true,
                }),
                createTableCell(risk.mitigation),
                createTableCell(risk.owner || '-', { alignment: AlignmentType.CENTER }),
              ],
            })
        ),
      ],
    });
    sections.push(riskTable);
  } else {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: '• 특이사항 없음', size: 20, font: 'Malgun Gothic' })],
        indent: { left: 360 },
      })
    );
  }

  // 9. 다음 달 계획
  sections.push(createSectionHeading('7. 다음 달 계획'));

  if (data.nextMonthPlan.length > 0) {
    data.nextMonthPlan.forEach((plan, index) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. ${plan}`,
              size: 20,
              font: 'Malgun Gothic',
            }),
          ],
          spacing: { before: 100, after: 100 },
          indent: { left: 360 },
        })
      );
    });
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
 * 월간 보고서 Document 생성
 * @param data 월간 보고서 데이터
 * @returns Document 객체
 */
export function createMonthlyReportDocument(data: MonthlyReportData): Document {
  const sections = buildMonthlyReportSections(data);

  return new Document({
    creator: data.author || 'IDEA on Action',
    title: `${data.year}년 ${data.month}월 월간 보고서`,
    description: `${data.year}년 ${data.month}월 월간 실적 보고`,
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
 * 월간 보고서 Blob 생성
 * @param data 월간 보고서 데이터
 * @returns Blob Promise
 */
export async function generateMonthlyReportBlob(data: MonthlyReportData): Promise<Blob> {
  const document = createMonthlyReportDocument(data);
  return await Packer.toBlob(document);
}

/**
 * 월간 보고서 다운로드
 * @param data 월간 보고서 데이터
 * @param fileName 파일명 (선택, 기본값: 월간보고서_YYYY년_MM월.docx)
 */
export async function downloadMonthlyReport(
  data: MonthlyReportData,
  fileName?: string
): Promise<void> {
  const blob = await generateMonthlyReportBlob(data);

  const defaultFileName = `월간보고서_${data.year}년_${String(data.month).padStart(2, '0')}월.docx`;
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
