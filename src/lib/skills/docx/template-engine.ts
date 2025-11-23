/**
 * Word 문서 생성을 위한 TemplateEngine
 *
 * docx 라이브러리를 사용하여 문서 요소들을 생성합니다.
 *
 * @module lib/skills/docx/template-engine
 */

import {
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  convertInchesToTwip,
} from 'docx';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 테이블 설정
 */
export interface TableConfig {
  /** 헤더 행 */
  headers: string[];
  /** 데이터 변수명 */
  dataVariable?: string;
  /** 컬럼 키 목록 */
  columns?: string[];
  /** 직접 데이터 */
  data?: string[][];
}

/**
 * 리스트 설정
 */
export interface ListConfig {
  /** 순서 리스트 여부 */
  ordered?: boolean;
  /** 아이템 변수명 */
  itemsVariable?: string;
  /** 직접 아이템 */
  items?: string[];
}

/**
 * 섹션 스타일
 */
export interface SectionStyle {
  /** 제목 레벨 (1-3) */
  level?: number;
  /** 굵게 */
  bold?: boolean;
  /** 이탤릭 */
  italic?: boolean;
  /** 정렬 */
  alignment?: 'left' | 'center' | 'right' | 'justify';
}

// ============================================================================
// TemplateEngine 클래스
// ============================================================================

/**
 * 문서 템플릿 엔진
 *
 * 변수 치환 및 문서 요소 생성을 담당합니다.
 */
export class TemplateEngine {
  private variables: Record<string, unknown>;

  constructor(variables: Record<string, unknown> = {}) {
    this.variables = variables;
  }

  // ==========================================================================
  // 변수 관리
  // ==========================================================================

  /**
   * 변수 값 설정
   */
  setVariable(key: string, value: unknown): void {
    this.variables[key] = value;
  }

  /**
   * 변수 값 조회
   */
  getVariable<T = unknown>(key: string): T | undefined {
    return this.variables[key] as T;
  }

  /**
   * 텍스트 내 변수를 실제 값으로 치환
   *
   * @example
   * replaceVariables('안녕하세요, {{name}}님') => '안녕하세요, 홍길동님'
   */
  replaceVariables(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = this.variables[key];
      if (value === undefined || value === null) return '';
      if (typeof value === 'object') {
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return JSON.stringify(value);
      }
      return String(value);
    });
  }

  // ==========================================================================
  // 문서 요소 생성 헬퍼
  // ==========================================================================

  /**
   * 제목(Heading) 생성
   */
  createHeading(
    text: string,
    level: HeadingLevel = HeadingLevel.HEADING_1
  ): Paragraph {
    return new Paragraph({
      text: this.replaceVariables(text),
      heading: level,
      spacing: {
        before: 240,
        after: 120,
      },
    });
  }

  /**
   * 일반 문단 생성
   */
  createParagraph(
    text: string,
    options?: {
      bold?: boolean;
      italic?: boolean;
      alignment?: AlignmentType;
      spacing?: { before?: number; after?: number };
    }
  ): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text: this.replaceVariables(text),
          bold: options?.bold,
          italics: options?.italic,
        }),
      ],
      alignment: options?.alignment,
      spacing: options?.spacing ?? { after: 120 },
    });
  }

  /**
   * 번호/글머리 목록 생성
   */
  createList(
    items: string[],
    options?: {
      ordered?: boolean;
      bulletChar?: string;
    }
  ): Paragraph[] {
    const bullet = options?.bulletChar ?? '•';

    return items.map((item, index) => {
      const prefix = options?.ordered ? `${index + 1}.` : bullet;
      return new Paragraph({
        children: [
          new TextRun({
            text: `${prefix} ${this.replaceVariables(item)}`,
          }),
        ],
        indent: { left: convertInchesToTwip(0.5) },
        spacing: { after: 60 },
      });
    });
  }

  /**
   * 테이블 생성
   */
  createTable(config: {
    headers: string[];
    rows: (string | number)[][];
    headerBgColor?: string;
    widths?: number[];
  }): Table {
    const { headers, rows, headerBgColor = 'E7E6E6', widths } = config;

    // 컬럼 너비 계산
    const colWidths = widths ?? headers.map(() => 100 / headers.length);

    return new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [
        // 헤더 행
        new TableRow({
          tableHeader: true,
          children: headers.map(
            (header, idx) =>
              new TableCell({
                width: {
                  size: colWidths[idx],
                  type: WidthType.PERCENTAGE,
                },
                shading: {
                  fill: headerBgColor,
                  type: ShadingType.CLEAR,
                },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: header,
                        bold: true,
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
              })
          ),
        }),
        // 데이터 행
        ...rows.map(
          (row) =>
            new TableRow({
              children: row.map(
                (cell, idx) =>
                  new TableCell({
                    width: {
                      size: colWidths[idx],
                      type: WidthType.PERCENTAGE,
                    },
                    children: [
                      new Paragraph({
                        text: String(cell),
                      }),
                    ],
                  })
              ),
            })
        ),
      ],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      },
    });
  }

  /**
   * 빈 줄 생성
   */
  createEmptyLine(): Paragraph {
    return new Paragraph({
      text: '',
      spacing: { after: 120 },
    });
  }

  /**
   * 구분선 생성
   */
  createSeparator(): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text: '─'.repeat(80),
          color: 'CCCCCC',
        }),
      ],
      spacing: { before: 120, after: 120 },
    });
  }

  // ==========================================================================
  // 데이터 변환 헬퍼
  // ==========================================================================

  /**
   * 테이블 데이터 변환
   *
   * 변수에서 테이블 데이터를 추출하여 2차원 배열로 변환
   */
  resolveTableData(config: TableConfig): string[][] {
    if (config.dataVariable) {
      const data = this.variables[config.dataVariable];
      if (Array.isArray(data)) {
        return data.map((row) => {
          if (config.columns) {
            return config.columns.map((col) => String(row[col] ?? ''));
          }
          if (Array.isArray(row)) {
            return row.map((cell) => String(cell));
          }
          return Object.values(row).map((val) => String(val));
        });
      }
    }
    return config.data ?? [];
  }

  /**
   * 리스트 아이템 변환
   */
  resolveListItems(config: ListConfig): string[] {
    if (config.itemsVariable) {
      const items = this.variables[config.itemsVariable];
      if (Array.isArray(items)) {
        return items.map((item) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) {
            // 객체인 경우 name 또는 title 필드 사용
            return String(
              (item as Record<string, unknown>).name ??
                (item as Record<string, unknown>).title ??
                JSON.stringify(item)
            );
          }
          return String(item);
        });
      }
    }
    return config.items ?? [];
  }

  /**
   * 날짜 포맷팅
   */
  formatDate(date: Date | string, format = 'YYYY-MM-DD'): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day);
  }

  /**
   * 통화 포맷팅
   */
  formatCurrency(amount: number, currency = 'KRW'): string {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
