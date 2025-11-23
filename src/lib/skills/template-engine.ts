/**
 * Word 문서 생성 템플릿 엔진
 *
 * RFP, 보고서, 제안서 등 Word 문서 생성을 위한 핵심 엔진 클래스
 *
 * @module lib/skills/template-engine
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  convertMillimetersToTwip,
} from 'docx';
import type {
  TemplateData,
  DocxStyleOptions,
  DocumentMetadata,
  TemplateType,
  TemplateCategory,
  Deliverable,
  TimelineItem,
  RiskItem,
  BudgetItem,
} from '@/types/docx.types';

// ============================================================================
// 내부 스타일 타입 (기존 DocxStyleOptions 확장)
// ============================================================================

/**
 * 내부 스타일 설정 (twips 단위 사용)
 */
interface InternalStyleOptions {
  /** 기본 폰트 패밀리 */
  fontFamily: string;
  /** 기본 폰트 크기 (pt) */
  fontSize: number;
  /** 제목 폰트 크기 (pt) */
  headingFontSize: number;
  /** 줄간격 배수 */
  lineSpacing: number;
  /** 상단 여백 (twips) */
  marginTop: number;
  /** 하단 여백 (twips) */
  marginBottom: number;
  /** 좌측 여백 (twips) */
  marginLeft: number;
  /** 우측 여백 (twips) */
  marginRight: number;
  /** 주요 색상 */
  primaryColor: string;
  /** 보조 색상 */
  secondaryColor: string;
}

// ============================================================================
// 기본 스타일 설정
// ============================================================================

/**
 * 기본 스타일 설정 (한글 문서에 최적화)
 * - 1 inch = 1440 twips
 * - 1 mm ≈ 56.7 twips
 */
const DEFAULT_STYLES: InternalStyleOptions = {
  fontFamily: 'Malgun Gothic',
  fontSize: 11,
  headingFontSize: 16,
  lineSpacing: 1.5,
  marginTop: 720, // 0.5 inch
  marginBottom: 720,
  marginLeft: 1080, // 0.75 inch
  marginRight: 1080,
  primaryColor: '2563EB', // blue-600
  secondaryColor: 'E8E8E8', // gray-200
};

// ============================================================================
// TemplateEngine 클래스
// ============================================================================

/**
 * Word 문서 생성 템플릿 엔진
 *
 * @example
 * ```ts
 * const metadata: DocumentMetadata = {
 *   title: '프로젝트 제안서',
 *   author: '생각과행동',
 *   createdAt: new Date(),
 * };
 *
 * const engine = new TemplateEngine(metadata);
 * const blob = await engine.generateDocument('proposal', 'technical', data);
 * downloadBlob(blob, 'proposal.docx');
 * ```
 */
export class TemplateEngine {
  private styles: InternalStyleOptions;
  private metadata: DocumentMetadata;

  /**
   * TemplateEngine 생성자
   *
   * @param metadata - 문서 메타데이터
   * @param styles - 문서 스타일 옵션 (선택)
   */
  constructor(metadata: DocumentMetadata, styles?: Partial<DocxStyleOptions>) {
    this.metadata = metadata;
    this.styles = this.mergeStyles(styles);
  }

  /**
   * 스타일 옵션 병합
   */
  private mergeStyles(styles?: Partial<DocxStyleOptions>): InternalStyleOptions {
    if (!styles) {
      return { ...DEFAULT_STYLES };
    }

    return {
      fontFamily: styles.bodyFont ?? DEFAULT_STYLES.fontFamily,
      fontSize: styles.fontSize ?? DEFAULT_STYLES.fontSize,
      headingFontSize: DEFAULT_STYLES.headingFontSize,
      lineSpacing: styles.lineSpacing ?? DEFAULT_STYLES.lineSpacing,
      marginTop: styles.margins
        ? convertMillimetersToTwip(styles.margins.top)
        : DEFAULT_STYLES.marginTop,
      marginBottom: styles.margins
        ? convertMillimetersToTwip(styles.margins.bottom)
        : DEFAULT_STYLES.marginBottom,
      marginLeft: styles.margins
        ? convertMillimetersToTwip(styles.margins.left)
        : DEFAULT_STYLES.marginLeft,
      marginRight: styles.margins
        ? convertMillimetersToTwip(styles.margins.right)
        : DEFAULT_STYLES.marginRight,
      primaryColor: styles.primaryColor?.replace('#', '') ?? DEFAULT_STYLES.primaryColor,
      secondaryColor: styles.secondaryColor?.replace('#', '') ?? DEFAULT_STYLES.secondaryColor,
    };
  }

  // ==========================================================================
  // 문서 생성 메서드
  // ==========================================================================

  /**
   * 문서 생성
   *
   * @param type - 템플릿 유형 (rfp, report, proposal, contract)
   * @param category - 템플릿 카테고리
   * @param data - 템플릿 데이터
   * @returns 생성된 Word 문서 Blob
   */
  async generateDocument(
    type: TemplateType,
    category: TemplateCategory,
    data: TemplateData
  ): Promise<Blob> {
    const sections = this.buildSections(type, category, data);

    const doc = new Document({
      creator: this.metadata.author,
      title: this.metadata.title,
      description: this.metadata.description,
      subject: this.metadata.subject,
      keywords: this.metadata.keywords?.join(', '),
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: this.styles.marginTop,
                bottom: this.styles.marginBottom,
                left: this.styles.marginLeft,
                right: this.styles.marginRight,
              },
            },
          },
          children: sections,
        },
      ],
    });

    return await Packer.toBlob(doc);
  }

  // ==========================================================================
  // 섹션 빌더 메서드
  // ==========================================================================

  /**
   * 템플릿 유형에 따른 섹션 빌드
   */
  private buildSections(
    type: TemplateType,
    category: TemplateCategory,
    data: TemplateData
  ): (Paragraph | Table)[] {
    switch (type) {
      case 'rfp':
        return this.buildRFPSections(category, data);
      case 'report':
        return this.buildReportSections(category, data);
      case 'proposal':
        return this.buildProposalSections(category, data);
      case 'contract':
        return this.buildContractSections(category, data);
      default:
        return this.buildGenericSections(data);
    }
  }

  /**
   * RFP(제안요청서) 섹션 빌더
   */
  private buildRFPSections(category: TemplateCategory, data: TemplateData): (Paragraph | Table)[] {
    const sections: (Paragraph | Table)[] = [];

    // 제목
    sections.push(this.createHeading(data.projectName, HeadingLevel.TITLE));
    sections.push(this.createParagraph(`고객: ${data.clientName}`));
    sections.push(this.createEmptyParagraph());

    // 1. 사업 개요
    sections.push(this.createHeading('1. 사업 개요', HeadingLevel.HEADING_1));
    if (data.background) {
      sections.push(this.createParagraph(data.background));
    }

    // 2. 사업 목표
    if (data.objectives && data.objectives.length > 0) {
      sections.push(this.createHeading('2. 사업 목표', HeadingLevel.HEADING_1));
      sections.push(...this.createBulletList(data.objectives));
    }

    // 3. 사업 범위
    if (data.scope && data.scope.length > 0) {
      sections.push(this.createHeading('3. 사업 범위', HeadingLevel.HEADING_1));
      sections.push(...this.createBulletList(data.scope));
    }

    // 4. 요구사항
    if (data.requirements && data.requirements.length > 0) {
      sections.push(this.createHeading('4. 요구사항', HeadingLevel.HEADING_1));
      sections.push(...this.createBulletList(data.requirements));
    }

    // 5. 일정
    if (data.startDate) {
      sections.push(this.createHeading('5. 추진 일정', HeadingLevel.HEADING_1));
      const dateRange = data.endDate
        ? `${this.formatDate(data.startDate)} ~ ${this.formatDate(data.endDate)}`
        : this.formatDate(data.startDate);
      sections.push(this.createParagraph(`사업 기간: ${dateRange}`));

      if (data.timeline && data.timeline.length > 0) {
        sections.push(this.createTimelineTable(data.timeline));
      }
    }

    // 6. 산출물
    if (data.deliverables && data.deliverables.length > 0) {
      sections.push(this.createHeading('6. 산출물', HeadingLevel.HEADING_1));
      sections.push(this.createDeliverablesTable(data.deliverables));
    }

    // 7. 예산
    if (data.budget || (data.budgetItems && data.budgetItems.length > 0)) {
      sections.push(this.createHeading('7. 예산', HeadingLevel.HEADING_1));
      if (data.budget) {
        sections.push(this.createParagraph(`총 예산: ${this.formatCurrency(data.budget)}`));
      }
      if (data.budgetItems && data.budgetItems.length > 0) {
        sections.push(this.createBudgetTable(data.budgetItems));
      }
    }

    // 8. 제약사항
    if (data.constraints && data.constraints.length > 0) {
      sections.push(this.createHeading('8. 제약사항', HeadingLevel.HEADING_1));
      sections.push(...this.createBulletList(data.constraints));
    }

    return sections;
  }

  /**
   * 보고서 섹션 빌더
   */
  private buildReportSections(
    category: TemplateCategory,
    data: TemplateData
  ): (Paragraph | Table)[] {
    const sections: (Paragraph | Table)[] = [];

    // 제목
    sections.push(this.createHeading(data.projectName, HeadingLevel.TITLE));
    sections.push(this.createParagraph(`작성일: ${this.formatDate(data.startDate)}`));
    if (data.clientName) {
      sections.push(this.createParagraph(`고객: ${data.clientName}`));
    }
    sections.push(this.createEmptyParagraph());

    // 1. 개요
    sections.push(this.createHeading('1. 개요', HeadingLevel.HEADING_1));
    if (data.background) {
      sections.push(this.createParagraph(data.background));
    }

    // 2. 진행 현황
    if (data.timeline && data.timeline.length > 0) {
      sections.push(this.createHeading('2. 진행 현황', HeadingLevel.HEADING_1));
      sections.push(this.createTimelineTable(data.timeline));
    }

    // 3. 주요 성과
    if (data.deliverables && data.deliverables.length > 0) {
      sections.push(this.createHeading('3. 주요 성과', HeadingLevel.HEADING_1));
      const completedItems = this.getDeliverableNames(data.deliverables).filter((_, i) => {
        const item = data.deliverables![i];
        return typeof item !== 'string' && item.completed;
      });
      if (completedItems.length > 0) {
        sections.push(...this.createBulletList(completedItems));
      } else {
        sections.push(this.createDeliverablesTable(data.deliverables));
      }
    }

    // 4. 이슈 및 리스크
    if (data.risks && data.risks.length > 0) {
      sections.push(this.createHeading('4. 이슈 및 리스크', HeadingLevel.HEADING_1));
      sections.push(this.createRiskTable(data.risks));
    }

    // 5. 다음 단계
    if (data.objectives && data.objectives.length > 0) {
      sections.push(this.createHeading('5. 다음 단계', HeadingLevel.HEADING_1));
      sections.push(...this.createBulletList(data.objectives));
    }

    return sections;
  }

  /**
   * 제안서 섹션 빌더
   */
  private buildProposalSections(
    category: TemplateCategory,
    data: TemplateData
  ): (Paragraph | Table)[] {
    const sections: (Paragraph | Table)[] = [];

    // 제목
    sections.push(this.createHeading(data.projectName, HeadingLevel.TITLE));
    sections.push(this.createParagraph(`제안 대상: ${data.clientName}`));
    sections.push(this.createEmptyParagraph());

    // 1. 제안 배경
    sections.push(this.createHeading('1. 제안 배경', HeadingLevel.HEADING_1));
    if (data.background) {
      sections.push(this.createParagraph(data.background));
    }

    // 2. 제안 내용
    if (data.scope && data.scope.length > 0) {
      sections.push(this.createHeading('2. 제안 내용', HeadingLevel.HEADING_1));
      sections.push(...this.createBulletList(data.scope));
    }

    // 3. 기대 효과
    if (data.objectives && data.objectives.length > 0) {
      sections.push(this.createHeading('3. 기대 효과', HeadingLevel.HEADING_1));
      sections.push(...this.createBulletList(data.objectives));
    }

    // 4. 추진 일정
    if (data.startDate) {
      sections.push(this.createHeading('4. 추진 일정', HeadingLevel.HEADING_1));
      const dateRange = data.endDate
        ? `${this.formatDate(data.startDate)} ~ ${this.formatDate(data.endDate)}`
        : this.formatDate(data.startDate);
      sections.push(this.createParagraph(`제안 기간: ${dateRange}`));

      if (data.timeline && data.timeline.length > 0) {
        sections.push(this.createTimelineTable(data.timeline));
      }
    }

    // 5. 산출물
    if (data.deliverables && data.deliverables.length > 0) {
      sections.push(this.createHeading('5. 산출물', HeadingLevel.HEADING_1));
      sections.push(this.createDeliverablesTable(data.deliverables));
    }

    // 6. 투입 인력
    if (data.team && data.team.length > 0) {
      sections.push(this.createHeading('6. 투입 인력', HeadingLevel.HEADING_1));
      sections.push(this.createTeamTable(data.team));
    }

    // 7. 비용
    if (data.budget || (data.budgetItems && data.budgetItems.length > 0)) {
      sections.push(this.createHeading('7. 비용', HeadingLevel.HEADING_1));
      if (data.budget) {
        sections.push(this.createParagraph(`총 비용: ${this.formatCurrency(data.budget)}`));
      }
      if (data.budgetItems && data.budgetItems.length > 0) {
        sections.push(this.createBudgetTable(data.budgetItems));
      }
    }

    return sections;
  }

  /**
   * 계약서 섹션 빌더
   */
  private buildContractSections(
    category: TemplateCategory,
    data: TemplateData
  ): (Paragraph | Table)[] {
    return this.buildGenericSections(data);
  }

  /**
   * 기본 섹션 빌더
   */
  private buildGenericSections(data: TemplateData): (Paragraph | Table)[] {
    const sections: (Paragraph | Table)[] = [];

    // 프로젝트명
    sections.push(this.createHeading(data.projectName, HeadingLevel.TITLE));

    // 고객명
    if (data.clientName) {
      sections.push(this.createParagraph(`고객: ${data.clientName}`));
    }

    // 일정
    if (data.startDate) {
      const dateRange = data.endDate
        ? `${this.formatDate(data.startDate)} ~ ${this.formatDate(data.endDate)}`
        : this.formatDate(data.startDate);
      sections.push(this.createParagraph(`기간: ${dateRange}`));
    }

    sections.push(this.createEmptyParagraph());

    // 배경
    if (data.background) {
      sections.push(this.createHeading('배경', HeadingLevel.HEADING_1));
      sections.push(this.createParagraph(data.background));
    }

    // 목표
    if (data.objectives && data.objectives.length > 0) {
      sections.push(this.createHeading('목표', HeadingLevel.HEADING_1));
      sections.push(...this.createBulletList(data.objectives));
    }

    // 범위
    if (data.scope && data.scope.length > 0) {
      sections.push(this.createHeading('범위', HeadingLevel.HEADING_1));
      sections.push(...this.createBulletList(data.scope));
    }

    // 산출물
    if (data.deliverables && data.deliverables.length > 0) {
      sections.push(this.createHeading('산출물', HeadingLevel.HEADING_1));
      sections.push(
        ...this.createBulletList(this.getDeliverableNames(data.deliverables))
      );
    }

    // 예산
    if (data.budget) {
      sections.push(this.createHeading('예산', HeadingLevel.HEADING_1));
      sections.push(this.createParagraph(`총 예산: ${this.formatCurrency(data.budget)}`));
    }

    return sections;
  }

  // ==========================================================================
  // 요소 생성 메서드
  // ==========================================================================

  /**
   * 제목 생성
   *
   * @param text - 제목 텍스트
   * @param level - 제목 레벨 (기본: HEADING_1)
   * @returns Paragraph 객체
   */
  createHeading(text: string, level: HeadingLevel = HeadingLevel.HEADING_1): Paragraph {
    return new Paragraph({
      text,
      heading: level,
      spacing: { before: 400, after: 200 },
    });
  }

  /**
   * 본문 텍스트 생성
   *
   * @param text - 본문 텍스트
   * @param options - 텍스트 옵션 (bold, italic, alignment)
   * @returns Paragraph 객체
   */
  createParagraph(
    text: string,
    options?: { bold?: boolean; italic?: boolean; alignment?: AlignmentType }
  ): Paragraph {
    return new Paragraph({
      alignment: options?.alignment ?? AlignmentType.LEFT,
      children: [
        new TextRun({
          text,
          bold: options?.bold,
          italics: options?.italic,
          font: this.styles.fontFamily,
          size: this.styles.fontSize * 2, // half-points (pt * 2)
        }),
      ],
      spacing: { after: 200 },
    });
  }

  /**
   * 빈 줄 생성
   */
  createEmptyParagraph(): Paragraph {
    return new Paragraph({
      children: [],
      spacing: { after: 200 },
    });
  }

  /**
   * 불릿 목록 생성
   *
   * @param items - 목록 아이템 배열
   * @returns Paragraph 배열
   */
  createBulletList(items: string[]): Paragraph[] {
    return items.map(
      (item) =>
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: item,
              font: this.styles.fontFamily,
              size: this.styles.fontSize * 2,
            }),
          ],
        })
    );
  }

  /**
   * 테이블 생성
   *
   * @param headers - 헤더 배열
   * @param rows - 행 데이터 2차원 배열
   * @returns Table 객체
   */
  createTable(headers: string[], rows: string[][]): Table {
    const borderStyle = {
      style: BorderStyle.SINGLE,
      size: 1,
      color: 'CCCCCC',
    };

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // 헤더 행
        new TableRow({
          tableHeader: true,
          children: headers.map(
            (header) =>
              new TableCell({
                children: [this.createParagraph(header, { bold: true })],
                shading: { fill: this.styles.secondaryColor },
                borders: {
                  top: borderStyle,
                  bottom: borderStyle,
                  left: borderStyle,
                  right: borderStyle,
                },
              })
          ),
        }),
        // 데이터 행
        ...rows.map(
          (row) =>
            new TableRow({
              children: row.map(
                (cell) =>
                  new TableCell({
                    children: [this.createParagraph(cell)],
                    borders: {
                      top: borderStyle,
                      bottom: borderStyle,
                      left: borderStyle,
                      right: borderStyle,
                    },
                  })
              ),
            })
        ),
      ],
    });
  }

  // ==========================================================================
  // 특화 테이블 생성 메서드
  // ==========================================================================

  /**
   * 타임라인 테이블 생성
   */
  private createTimelineTable(timeline: TimelineItem[]): Table {
    const headers = ['단계', '기간', '설명', '담당자'];
    const rows = timeline.map((item) => [
      item.phase,
      `${this.formatDate(item.startDate)} ~ ${this.formatDate(item.endDate)}`,
      item.description,
      item.owner ?? '-',
    ]);
    return this.createTable(headers, rows);
  }

  /**
   * 산출물 테이블 생성
   */
  private createDeliverablesTable(deliverables: Deliverable[] | string[]): Table {
    const headers = ['산출물', '설명', '예정일'];
    const rows = deliverables.map((item) => {
      if (typeof item === 'string') {
        return [item, '-', '-'];
      }
      return [
        item.name,
        item.description ?? '-',
        item.dueDate ? this.formatDate(item.dueDate) : '-',
      ];
    });
    return this.createTable(headers, rows);
  }

  /**
   * 팀 테이블 생성
   */
  private createTeamTable(
    team: { name: string; role: string; responsibilities?: string[] }[]
  ): Table {
    const headers = ['이름', '역할', '담당 업무'];
    const rows = team.map((member) => [
      member.name,
      member.role,
      member.responsibilities?.join(', ') ?? '-',
    ]);
    return this.createTable(headers, rows);
  }

  /**
   * 예산 테이블 생성
   */
  private createBudgetTable(budgetItems: BudgetItem[]): Table {
    const headers = ['항목', '금액', '비고'];
    const rows = budgetItems.map((item) => [
      item.name,
      this.formatCurrency(item.amount, item.currency),
      item.note ?? '-',
    ]);
    return this.createTable(headers, rows);
  }

  /**
   * 리스크 테이블 생성
   */
  private createRiskTable(risks: RiskItem[]): Table {
    const headers = ['리스크', '심각도', '발생확률', '대응방안'];
    const severityLabels = { low: '낮음', medium: '보통', high: '높음', critical: '치명적' };
    const probabilityLabels = { low: '낮음', medium: '보통', high: '높음' };

    const rows = risks.map((risk) => [
      risk.name,
      severityLabels[risk.severity],
      probabilityLabels[risk.probability],
      risk.mitigation ?? '-',
    ]);
    return this.createTable(headers, rows);
  }

  // ==========================================================================
  // 유틸리티 메서드
  // ==========================================================================

  /**
   * 날짜 포맷팅 (한국어)
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * 통화 포맷팅
   */
  private formatCurrency(amount: number, currency: string = 'KRW'): string {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Deliverable 배열에서 이름 추출
   */
  private getDeliverableNames(deliverables: Deliverable[] | string[]): string[] {
    return deliverables.map((d) => (typeof d === 'string' ? d : d.name));
  }
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * Blob 다운로드 유틸리티
 *
 * @param blob - 다운로드할 Blob 객체
 * @param fileName - 파일명
 *
 * @example
 * ```ts
 * const blob = await engine.generateDocument('rfp', 'government', data);
 * downloadBlob(blob, 'RFP_프로젝트명_2025-11-23.docx');
 * ```
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 파일명 생성 유틸리티
 *
 * @param type - 템플릿 유형
 * @param projectName - 프로젝트명
 * @returns 생성된 파일명
 *
 * @example
 * ```ts
 * const fileName = generateFileName('rfp', '스마트시티 구축');
 * // => 'rfp_스마트시티_구축_2025-11-23.docx'
 * ```
 */
export function generateFileName(type: TemplateType, projectName: string): string {
  const date = new Date().toISOString().split('T')[0];
  // 파일명에 사용할 수 없는 문자 제거 (영문, 한글, 숫자만 허용)
  const sanitizedName = projectName.replace(/[^a-zA-Z0-9가-힣\s]/g, '').replace(/\s+/g, '_');
  return `${type}_${sanitizedName}_${date}.docx`;
}

/**
 * 템플릿 유형 라벨 반환
 */
export function getTemplateTypeLabel(type: TemplateType): string {
  const labels: Record<TemplateType, string> = {
    rfp: '제안요청서',
    report: '보고서',
    proposal: '제안서',
    contract: '계약서',
  };
  return labels[type];
}
