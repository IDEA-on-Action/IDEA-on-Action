/**
 * 주간 보고서 템플릿
 *
 * 간결한 주간 업무 보고 형식으로, 금주 완료/진행 업무,
 * 다음 주 계획, 이슈 및 지원 요청 사항을 포함합니다.
 *
 * @module lib/skills/templates/reports/weekly-report
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
import type { TemplateData, TimelineItem } from '@/types/docx.types';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 완료 업무 항목
 */
export interface CompletedTask {
  /** 업무명 */
  task: string;
  /** 완료 여부 */
  completed: boolean;
  /** 담당자 (선택) */
  assignee?: string;
  /** 비고 (선택) */
  note?: string;
}

/**
 * 진행 중 업무 항목
 */
export interface InProgressTask {
  /** 업무명 */
  task: string;
  /** 진행률 (0-100) */
  progress: number;
  /** 담당자 (선택) */
  assignee?: string;
  /** 예상 완료일 (선택) */
  expectedCompletion?: Date;
  /** 비고 (선택) */
  note?: string;
}

/**
 * 주간 보고서 데이터 인터페이스
 */
export interface WeeklyReportData extends TemplateData {
  /** 주차 번호 */
  weekNumber: number;
  /** 보고 기간 */
  reportPeriod: {
    /** 시작일 */
    start: Date;
    /** 종료일 */
    end: Date;
  };
  /** 금주 완료 사항 */
  completedTasks: CompletedTask[];
  /** 진행 중 업무 */
  inProgressTasks: InProgressTask[];
  /** 다음 주 계획 */
  nextWeekPlan: string[];
  /** 이슈 및 리스크 */
  issues: string[];
  /** 지원 요청 사항 (선택) */
  supportRequests?: string[];
  /** 작성자 (선택) */
  author?: string;
  /** 부서명 (선택) */
  department?: string;
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 날짜를 한국어 형식으로 포맷팅
 */
function formatDateKR(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 진행률 바 텍스트 생성
 */
function createProgressBar(progress: number): string {
  const filled = Math.round(progress / 10);
  const empty = 10 - filled;
  return `[${'■'.repeat(filled)}${'□'.repeat(empty)}] ${progress}%`;
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
  }
): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: options?.bold,
            size: 20, // 10pt
            font: 'Malgun Gothic',
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

/**
 * 불릿 리스트 항목 생성
 */
function createBulletItem(text: string, level: number = 0): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `• ${text}`,
        size: 20,
        font: 'Malgun Gothic',
      }),
    ],
    spacing: { before: 100, after: 100 },
    indent: { left: 720 + level * 360 },
  });
}

// ============================================================================
// 주간 보고서 빌더
// ============================================================================

/**
 * 주간 보고서 섹션 빌드
 * @param data 주간 보고서 데이터
 * @returns Paragraph 및 Table 배열
 */
export function buildWeeklyReportSections(data: WeeklyReportData): (Paragraph | Table)[] {
  const sections: (Paragraph | Table)[] = [];

  // 1. 헤더: 제목
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `주간 업무 보고 - ${data.weekNumber}주차`,
          bold: true,
          size: 36, // 18pt
          font: 'Malgun Gothic',
        }),
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // 2. 보고 기간
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `보고 기간: ${formatDateKR(data.reportPeriod.start)} ~ ${formatDateKR(data.reportPeriod.end)}`,
          size: 22,
          font: 'Malgun Gothic',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  // 3. 작성자/부서 정보 (있는 경우)
  if (data.author || data.department) {
    const infoText = [data.department, data.author].filter(Boolean).join(' / ');
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: infoText,
            size: 20,
            font: 'Malgun Gothic',
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );
  }

  // 구분선
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: '' })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' } },
      spacing: { after: 400 },
    })
  );

  // 4. 금주 완료 사항
  sections.push(createSectionHeading('1. 금주 완료 사항'));

  const completedItems = data.completedTasks.filter((t) => t.completed);
  const notCompletedItems = data.completedTasks.filter((t) => !t.completed);

  if (completedItems.length > 0) {
    completedItems.forEach((task) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `✓ ${task.task}`,
              size: 20,
              font: 'Malgun Gothic',
              color: '2E7D32', // 녹색
            }),
            task.assignee
              ? new TextRun({
                  text: ` (${task.assignee})`,
                  size: 18,
                  font: 'Malgun Gothic',
                  italics: true,
                })
              : new TextRun({ text: '' }),
          ],
          spacing: { before: 100, after: 100 },
          indent: { left: 360 },
        })
      );
    });
  }

  if (notCompletedItems.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '미완료 항목:',
            size: 20,
            font: 'Malgun Gothic',
            bold: true,
            color: 'C62828',
          }),
        ],
        spacing: { before: 200, after: 100 },
        indent: { left: 360 },
      })
    );
    notCompletedItems.forEach((task) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `☐ ${task.task}`,
              size: 20,
              font: 'Malgun Gothic',
              color: 'C62828',
            }),
            task.note
              ? new TextRun({
                  text: ` - ${task.note}`,
                  size: 18,
                  font: 'Malgun Gothic',
                  italics: true,
                })
              : new TextRun({ text: '' }),
          ],
          spacing: { before: 50, after: 50 },
          indent: { left: 720 },
        })
      );
    });
  }

  // 5. 진행 중 업무 (테이블)
  sections.push(createSectionHeading('2. 진행 중 업무'));

  if (data.inProgressTasks.length > 0) {
    const progressTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // 헤더 행
        new TableRow({
          children: [
            createTableCell('업무', { bold: true, shading: 'E3F2FD', width: 50 }),
            createTableCell('진행률', {
              bold: true,
              shading: 'E3F2FD',
              width: 25,
              alignment: AlignmentType.CENTER,
            }),
            createTableCell('담당자', {
              bold: true,
              shading: 'E3F2FD',
              width: 25,
              alignment: AlignmentType.CENTER,
            }),
          ],
          tableHeader: true,
        }),
        // 데이터 행
        ...data.inProgressTasks.map(
          (task) =>
            new TableRow({
              children: [
                createTableCell(task.task),
                createTableCell(createProgressBar(task.progress), {
                  alignment: AlignmentType.CENTER,
                }),
                createTableCell(task.assignee || '-', { alignment: AlignmentType.CENTER }),
              ],
            })
        ),
      ],
    });
    sections.push(progressTable);
  } else {
    sections.push(createBulletItem('진행 중인 업무 없음'));
  }

  // 6. 다음 주 계획
  sections.push(createSectionHeading('3. 다음 주 계획'));

  if (data.nextWeekPlan.length > 0) {
    data.nextWeekPlan.forEach((plan, index) => {
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
    sections.push(createBulletItem('계획된 업무 없음'));
  }

  // 7. 이슈 및 리스크
  sections.push(createSectionHeading('4. 이슈 및 리스크'));

  if (data.issues.length > 0) {
    data.issues.forEach((issue) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `⚠ ${issue}`,
              size: 20,
              font: 'Malgun Gothic',
              color: 'E65100',
            }),
          ],
          spacing: { before: 100, after: 100 },
          indent: { left: 360 },
        })
      );
    });
  } else {
    sections.push(createBulletItem('특이사항 없음'));
  }

  // 8. 지원 요청 사항 (선택)
  if (data.supportRequests && data.supportRequests.length > 0) {
    sections.push(createSectionHeading('5. 지원 요청 사항'));

    data.supportRequests.forEach((request) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `➤ ${request}`,
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
  }

  return sections;
}

/**
 * 주간 보고서 Document 생성
 * @param data 주간 보고서 데이터
 * @returns Document 객체
 */
export function createWeeklyReportDocument(data: WeeklyReportData): Document {
  const sections = buildWeeklyReportSections(data);

  return new Document({
    creator: data.author || 'IDEA on Action',
    title: `주간 업무 보고 - ${data.weekNumber}주차`,
    description: `${formatDateKR(data.reportPeriod.start)} ~ ${formatDateKR(data.reportPeriod.end)} 주간 업무 보고`,
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
              top: 1440, // 1 inch
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
 * 주간 보고서 Blob 생성
 * @param data 주간 보고서 데이터
 * @returns Blob Promise
 */
export async function generateWeeklyReportBlob(data: WeeklyReportData): Promise<Blob> {
  const document = createWeeklyReportDocument(data);
  return await Packer.toBlob(document);
}

/**
 * 주간 보고서 다운로드
 * @param data 주간 보고서 데이터
 * @param fileName 파일명 (선택, 기본값: 주간보고서_YYYY-MM-DD.docx)
 */
export async function downloadWeeklyReport(
  data: WeeklyReportData,
  fileName?: string
): Promise<void> {
  const blob = await generateWeeklyReportBlob(data);

  const defaultFileName = `주간보고서_${data.reportPeriod.start.toISOString().split('T')[0]}.docx`;
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
