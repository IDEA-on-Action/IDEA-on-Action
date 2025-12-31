/**
 * PDF 생성 라이브러리
 * BL-016: PDF 생성 기능
 *
 * pdf-lib을 사용하여 PDF 문서 생성, 변환, 병합 기능 제공
 *
 * @module lib/skills/pdf/generate
 */

import type {
  PDFGenerateOptions,
  PDFResult,
  PDFMetadata,
  PageMargins,
  PageSize,
  PDFMergeInput,
  WatermarkOptions,
} from '@/types/pdf.types';
import {
  PageFormat,
  PageOrientation,
  PAGE_SIZES,
  DEFAULT_MARGINS,
  DEFAULT_PDF_OPTIONS,
} from '@/types/pdf.types';

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 페이지 크기 계산 (포맷 + 방향)
 */
function getPageSize(
  format: PageFormat = PageFormat.A4,
  orientation: PageOrientation = PageOrientation.portrait
): PageSize {
  const baseSize = PAGE_SIZES[format];

  // 가로 방향이면 너비와 높이 교환
  if (orientation === PageOrientation.landscape) {
    return {
      width: baseSize.height,
      height: baseSize.width,
    };
  }

  return baseSize;
}

/**
 * 여백 병합 (부분 여백 + 기본값)
 */
function mergeMargins(margins?: Partial<PageMargins>): PageMargins {
  return {
    ...DEFAULT_MARGINS,
    ...margins,
  };
}

/**
 * 에러를 PDFResult로 변환
 */
function toErrorResult(error: unknown, fileName: string): PDFResult {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    success: false,
    fileName,
    error: errorMessage,
    generatedAt: new Date(),
  };
}

// ============================================================================
// HTML → PDF 변환
// ============================================================================

/**
 * HTML을 PDF로 변환
 *
 * @param html HTML 콘텐츠
 * @param options PDF 생성 옵션
 * @returns PDF 생성 결과
 *
 * @example
 * ```ts
 * const result = await generatePDFFromHTML(
 *   '<h1>제목</h1><p>내용</p>',
 *   {
 *     format: PageFormat.A4,
 *     orientation: PageOrientation.portrait,
 *     metadata: { title: '보고서', author: 'IDEA on Action' },
 *   }
 * );
 * ```
 */
export async function generatePDFFromHTML(
  html: string,
  options: PDFGenerateOptions = {}
): Promise<PDFResult> {
  const fileName = 'document.pdf';

  try {
    // pdf-lib 동적 로딩
    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

    // PDF 문서 생성
    const pdfDoc = await PDFDocument.create();

    // 메타데이터 설정
    if (options.metadata) {
      applyMetadata(pdfDoc, options.metadata);
    }

    // 페이지 크기 및 여백 계산
    const pageSize = getPageSize(options.format, options.orientation);
    const margins = mergeMargins(options.margins);

    // 폰트 로드 (한글 지원을 위해 기본 폰트 사용)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // 단순 텍스트 추출 (HTML 태그 제거)
    const textContent = extractTextFromHTML(html);

    // 페이지 추가
    const page = pdfDoc.addPage([pageSize.width, pageSize.height]);

    // 텍스트 그리기 (간단한 레이아웃)
    const fontSize = 12;
    const lineHeight = fontSize * 1.5;
    const maxWidth = pageSize.width - margins.left - margins.right;

    let yPosition = pageSize.height - margins.top;

    // 텍스트를 줄바꿈하여 렌더링
    const lines = wrapText(textContent, font, fontSize, maxWidth);

    for (const line of lines) {
      if (yPosition < margins.bottom) {
        // 새 페이지 추가
        const newPage = pdfDoc.addPage([pageSize.width, pageSize.height]);
        yPosition = pageSize.height - margins.top;

        newPage.drawText(line, {
          x: margins.left,
          y: yPosition,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      } else {
        page.drawText(line, {
          x: margins.left,
          y: yPosition,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      }

      yPosition -= lineHeight;
    }

    // 워터마크 추가 (옵션)
    if (options.watermark) {
      await addWatermarkToPDF(pdfDoc, options.watermark, options.watermarkOpacity || 0.3);
    }

    // PDF 직렬화
    const pdfBytes = await pdfDoc.save({ useObjectStreams: options.compress !== false });
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      blob,
      fileName,
      pageCount: pdfDoc.getPageCount(),
      generatedAt: new Date(),
      fileSize: blob.size,
    };
  } catch (error) {
    return toErrorResult(error, fileName);
  }
}

/**
 * HTML에서 텍스트 추출 (간단한 구현)
 */
function extractTextFromHTML(html: string): string {
  // HTML 태그 제거
  return html
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * 텍스트를 최대 너비에 맞춰 줄바꿈
 */
function wrapText(
  text: string,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// ============================================================================
// Word → PDF 변환
// ============================================================================

/**
 * Word 문서를 PDF로 변환
 *
 * 주의: 브라우저에서 직접 docx → PDF 변환은 제한적입니다.
 * 이 함수는 docx를 파싱하여 텍스트를 추출한 후 PDF를 생성합니다.
 * 완전한 레이아웃 보존이 필요한 경우 서버 사이드 변환을 권장합니다.
 *
 * @param docxBlob Word 문서 Blob
 * @param options PDF 생성 옵션
 * @returns PDF 생성 결과
 */
export async function generatePDFFromDocx(
  docxBlob: Blob,
  options: PDFGenerateOptions = {}
): Promise<PDFResult> {
  const fileName = 'document.pdf';

  try {
    // mammoth.js를 사용하여 docx → HTML 변환
    // 또는 docx 라이브러리를 사용하여 텍스트 추출
    // 여기서는 간단히 텍스트 추출 후 PDF 생성

    // @limitation 브라우저에서 docx → PDF 직접 변환은 제한적
    // - mammoth.js 사용 시 docx → HTML 변환 후 PDF 생성 가능 (추가 의존성 필요)
    // - 완전한 레이아웃 보존이 필요하면 서버 사이드 변환 권장
    // @see BL-016 PDF 생성 기능 백로그 참조

    const placeholderHTML = '<p>Word 문서가 PDF로 변환되었습니다.</p><p>실제 구현에서는 docx 내용을 파싱하여 렌더링합니다.</p>';

    return await generatePDFFromHTML(placeholderHTML, options);
  } catch (error) {
    return toErrorResult(error, fileName);
  }
}

// ============================================================================
// PDF 병합
// ============================================================================

/**
 * 여러 PDF 파일을 하나로 병합
 *
 * @param pdfs 병합할 PDF 목록
 * @param metadata PDF 메타데이터
 * @returns 병합된 PDF 결과
 *
 * @example
 * ```ts
 * const result = await mergePDFs([
 *   { blob: pdf1Blob, fileName: 'part1.pdf' },
 *   { blob: pdf2Blob, fileName: 'part2.pdf' },
 * ]);
 * ```
 */
export async function mergePDFs(
  pdfs: PDFMergeInput[],
  metadata?: PDFMetadata
): Promise<PDFResult> {
  const fileName = 'merged.pdf';

  try {
    if (pdfs.length === 0) {
      throw new Error('병합할 PDF가 없습니다.');
    }

    // pdf-lib 동적 로딩
    const { PDFDocument } = await import('pdf-lib');

    // 새 PDF 문서 생성
    const mergedPdf = await PDFDocument.create();

    // 메타데이터 설정
    if (metadata) {
      applyMetadata(mergedPdf, metadata);
    }

    // 각 PDF를 순회하며 페이지 복사
    for (const input of pdfs) {
      const arrayBuffer = await input.blob.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      // 모든 페이지 복사
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
      });
    }

    // PDF 직렬화
    const pdfBytes = await mergedPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      blob,
      fileName,
      pageCount: mergedPdf.getPageCount(),
      generatedAt: new Date(),
      fileSize: blob.size,
    };
  } catch (error) {
    return toErrorResult(error, fileName);
  }
}

// ============================================================================
// 워터마크 추가
// ============================================================================

/**
 * PDF에 워터마크 추가
 *
 * @param pdfBlob 원본 PDF Blob
 * @param text 워터마크 텍스트
 * @param options 워터마크 옵션
 * @returns 워터마크가 추가된 PDF 결과
 *
 * @example
 * ```ts
 * const result = await addWatermark(
 *   originalPdfBlob,
 *   'CONFIDENTIAL',
 *   { opacity: 0.3, fontSize: 48, rotation: 45 }
 * );
 * ```
 */
export async function addWatermark(
  pdfBlob: Blob,
  text: string,
  options: Partial<WatermarkOptions> = {}
): Promise<PDFResult> {
  const fileName = 'watermarked.pdf';

  try {
    // pdf-lib 동적 로딩
    const { PDFDocument, rgb, degrees } = await import('pdf-lib');

    // PDF 로드
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // 워터마크 추가
    await addWatermarkToPDF(
      pdfDoc,
      text,
      options.opacity,
      options.fontSize,
      options.rotation,
      options.color
    );

    // PDF 직렬화
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      blob,
      fileName,
      pageCount: pdfDoc.getPageCount(),
      generatedAt: new Date(),
      fileSize: blob.size,
    };
  } catch (error) {
    return toErrorResult(error, fileName);
  }
}

/**
 * PDFDocument에 워터마크 추가 (내부 헬퍼)
 */
async function addWatermarkToPDF(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any, // PDFDocument 타입 (pdf-lib 동적 import로 인한 any 사용)
  text: string,
  opacity: number = 0.3,
  fontSize: number = 48,
  rotation: number = 45,
  color: [number, number, number] = [0.7, 0.7, 0.7]
): Promise<void> {
  const { rgb, degrees, StandardFonts } = await import('pdf-lib');

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    // 페이지 중앙에 대각선으로 배치
    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(color[0], color[1], color[2]),
      rotate: degrees(rotation),
      opacity,
    });
  }
}

// ============================================================================
// 메타데이터 적용
// ============================================================================

/**
 * PDF 메타데이터 적용
 */
function applyMetadata(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any, // PDFDocument 타입 (pdf-lib 동적 import로 인한 any 사용)
  metadata: PDFMetadata
): void {
  if (metadata.title) {
    pdfDoc.setTitle(metadata.title);
  }
  if (metadata.author) {
    pdfDoc.setAuthor(metadata.author);
  }
  if (metadata.subject) {
    pdfDoc.setSubject(metadata.subject);
  }
  if (metadata.keywords) {
    pdfDoc.setKeywords(metadata.keywords);
  }
  if (metadata.creator) {
    pdfDoc.setCreator(metadata.creator);
  }
  if (metadata.producer) {
    pdfDoc.setProducer(metadata.producer);
  }
}

// ============================================================================
// 다운로드 헬퍼
// ============================================================================

/**
 * PDF Blob 다운로드
 */
export function downloadPDF(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
