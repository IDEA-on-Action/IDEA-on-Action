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
  ImageRun,
  Header,
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

// ============================================================================
// 이미지 관련 유틸리티 함수
// ============================================================================

/**
 * 이미지 URL을 ImageRun으로 변환
 *
 * @param imageUrl - 이미지 URL (http/https)
 * @param options - 이미지 옵션 (너비, 높이)
 * @returns ImageRun 객체
 *
 * @example
 * ```typescript
 * const imageRun = await createImageRun('https://example.com/logo.png', {
 *   width: 200,
 *   height: 150,
 * });
 * ```
 */
export async function createImageRun(
  imageUrl: string,
  options?: { width?: number; height?: number }
): Promise<ImageRun> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`이미지 로드 실패: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();

    return new ImageRun({
      data: buffer,
      transformation: {
        width: options?.width || 200,
        height: options?.height || 150,
      },
    });
  } catch (error) {
    console.error('[createImageRun] 이미지 생성 실패:', error);
    throw new Error(`이미지 생성 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 로고가 포함된 헤더 생성
 *
 * @param logoUrl - 로고 이미지 URL
 * @param options - 로고 크기 옵션
 * @returns Header 객체
 *
 * @example
 * ```typescript
 * const header = await createHeaderWithLogo('https://example.com/logo.png', {
 *   width: 100,
 *   height: 50,
 * });
 * ```
 */
export async function createHeaderWithLogo(
  logoUrl: string,
  options?: { width?: number; height?: number }
): Promise<Header> {
  try {
    const logo = await createImageRun(logoUrl, options);
    return new Header({
      children: [
        new Paragraph({
          children: [logo],
          alignment: AlignmentType.CENTER,
        }),
      ],
    });
  } catch (error) {
    console.error('[createHeaderWithLogo] 헤더 생성 실패:', error);
    throw new Error(`헤더 생성 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 이미지가 포함된 문단 생성
 *
 * @param imageUrl - 이미지 URL
 * @param options - 이미지 및 문단 옵션
 * @returns Paragraph 객체
 *
 * @example
 * ```typescript
 * const imageParagraph = await createImageParagraph('https://example.com/chart.png', {
 *   width: 400,
 *   height: 300,
 *   caption: '그림 1. 매출 추이',
 *   alignment: AlignmentType.CENTER,
 * });
 * ```
 */
export async function createImageParagraph(
  imageUrl: string,
  options?: {
    width?: number;
    height?: number;
    caption?: string;
    alignment?: AlignmentType;
  }
): Promise<Paragraph[]> {
  try {
    const imageRun = await createImageRun(imageUrl, {
      width: options?.width,
      height: options?.height,
    });

    const paragraphs: Paragraph[] = [
      new Paragraph({
        children: [imageRun],
        alignment: options?.alignment || AlignmentType.CENTER,
        spacing: { before: 120, after: 60 },
      }),
    ];

    // 캡션이 있으면 추가
    if (options?.caption) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: options.caption,
              italics: true,
              size: 20, // 10pt
            }),
          ],
          alignment: options?.alignment || AlignmentType.CENTER,
          spacing: { after: 120 },
        })
      );
    }

    return paragraphs;
  } catch (error) {
    console.error('[createImageParagraph] 이미지 문단 생성 실패:', error);
    throw new Error(`이미지 문단 생성 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}
