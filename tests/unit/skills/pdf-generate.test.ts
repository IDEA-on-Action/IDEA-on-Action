/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PDF 생성 라이브러리 유닛 테스트
 * BL-016: PDF 생성 기능 테스트
 *
 * @module tests/unit/skills/pdf-generate
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generatePDFFromHTML,
  generatePDFFromDocx,
  mergePDFs,
  addWatermark,
  downloadPDF,
} from '@/lib/skills/pdf/generate';
import type { PDFMetadata, PDFMergeInput } from '@/types/pdf.types';
import { PageFormat, PageOrientation } from '@/types/pdf.types';

// Mock pdf-lib
const mockPDFDocCreate = vi.fn();
const mockPDFDocLoad = vi.fn();
const mockSave = vi.fn();
const mockAddPage = vi.fn();
const mockDrawText = vi.fn();
const mockCopyPages = vi.fn();
const mockGetPageIndices = vi.fn();
const mockEmbedFont = vi.fn();
const mockSetTitle = vi.fn();
const mockSetAuthor = vi.fn();
const mockSetSubject = vi.fn();
const mockSetKeywords = vi.fn();
const mockSetCreator = vi.fn();
const mockSetProducer = vi.fn();
const mockGetPageCount = vi.fn();
const mockGetPages = vi.fn();
const mockGetSize = vi.fn();

const createMockPDFDoc = () => ({
  save: mockSave,
  addPage: mockAddPage,
  embedFont: mockEmbedFont,
  setTitle: mockSetTitle,
  setAuthor: mockSetAuthor,
  setSubject: mockSetSubject,
  setKeywords: mockSetKeywords,
  setCreator: mockSetCreator,
  setProducer: mockSetProducer,
  getPageCount: mockGetPageCount,
  getPages: mockGetPages,
  getPageIndices: mockGetPageIndices,
  copyPages: mockCopyPages,
});

const createMockPage = () => ({
  drawText: mockDrawText,
  getSize: mockGetSize,
});

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: mockPDFDocCreate,
    load: mockPDFDocLoad,
  },
  rgb: vi.fn((r, g, b) => ({ r, g, b })),
  degrees: vi.fn((angle) => angle),
  StandardFonts: {
    Helvetica: 'Helvetica',
    HelveticaBold: 'HelveticaBold',
  },
}));

describe('PDF Generate Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock 설정
    const mockDoc = createMockPDFDoc();
    const mockPage = createMockPage();
    const mockFont = {
      widthOfTextAtSize: vi.fn(() => 100),
    };

    mockPDFDocCreate.mockResolvedValue(mockDoc);
    mockPDFDocLoad.mockResolvedValue(mockDoc);
    mockAddPage.mockReturnValue(mockPage);
    mockEmbedFont.mockResolvedValue(mockFont);
    mockGetPageCount.mockReturnValue(1);
    mockGetPageIndices.mockReturnValue([0]);
    mockGetPages.mockReturnValue([mockPage]);
    mockGetSize.mockReturnValue({ width: 595.28, height: 841.89 });
    mockCopyPages.mockResolvedValue([mockPage]);
    mockSave.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46])); // %PDF

    // DOM mocks
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Blob arrayBuffer mock
    if (!Blob.prototype.arrayBuffer) {
      Blob.prototype.arrayBuffer = vi.fn(async function(this: Blob) {
        const buffer = new ArrayBuffer(this.size);
        return buffer;
      });
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // generatePDFFromHTML 테스트
  // ============================================================================

  describe('generatePDFFromHTML', () => {
    it('기본 옵션으로 HTML에서 PDF 생성', async () => {
      const html = '<h1>제목</h1><p>본문 내용입니다.</p>';
      const result = await generatePDFFromHTML(html);

      expect(result.success).toBe(true);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.fileName).toBe('document.pdf');
      expect(mockPDFDocCreate).toHaveBeenCalledTimes(1);
      expect(mockAddPage).toHaveBeenCalled();
    });

    it('A4 포맷 Portrait 방향으로 PDF 생성', async () => {
      const html = '<p>테스트</p>';
      const result = await generatePDFFromHTML(html, {
        format: PageFormat.A4,
        orientation: PageOrientation.portrait,
      });

      expect(result.success).toBe(true);
      expect(mockAddPage).toHaveBeenCalledWith([595.28, 841.89]);
    });

    it('Letter 포맷 Landscape 방향으로 PDF 생성', async () => {
      const html = '<p>테스트</p>';
      const result = await generatePDFFromHTML(html, {
        format: PageFormat.Letter,
        orientation: PageOrientation.landscape,
      });

      expect(result.success).toBe(true);
      // Landscape: width와 height 교환
      expect(mockAddPage).toHaveBeenCalledWith([792, 612]);
    });

    it('메타데이터가 올바르게 적용되는지 확인', async () => {
      const html = '<p>테스트</p>';
      const metadata: PDFMetadata = {
        title: '보고서',
        author: 'IDEA on Action',
        subject: '주간 보고서',
        keywords: ['보고서', 'PDF'],
      };

      const result = await generatePDFFromHTML(html, { metadata });

      expect(result.success).toBe(true);
      expect(mockSetTitle).toHaveBeenCalledWith('보고서');
      expect(mockSetAuthor).toHaveBeenCalledWith('IDEA on Action');
      expect(mockSetSubject).toHaveBeenCalledWith('주간 보고서');
      expect(mockSetKeywords).toHaveBeenCalledWith(['보고서', 'PDF']);
    });

    it('HTML 태그가 제거되고 텍스트만 추출되는지 확인', async () => {
      const html = '<div><h1>제목</h1><p>본문 <strong>강조</strong> 내용</p></div>';
      const result = await generatePDFFromHTML(html);

      expect(result.success).toBe(true);
      expect(mockDrawText).toHaveBeenCalled();
    });

    it('빈 HTML로 PDF 생성', async () => {
      const html = '';
      const result = await generatePDFFromHTML(html);

      expect(result.success).toBe(true);
      expect(mockAddPage).toHaveBeenCalled();
    });

    it('워터마크가 추가되는지 확인', async () => {
      const html = '<p>테스트</p>';
      const result = await generatePDFFromHTML(html, {
        watermark: 'CONFIDENTIAL',
        watermarkOpacity: 0.5,
      });

      expect(result.success).toBe(true);
      expect(mockGetPages).toHaveBeenCalled();
    });

    it('에러 발생 시 에러 결과 반환', async () => {
      mockPDFDocCreate.mockRejectedValueOnce(new Error('PDF 생성 실패'));

      const html = '<p>테스트</p>';
      const result = await generatePDFFromHTML(html);

      expect(result.success).toBe(false);
      expect(result.error).toBe('PDF 생성 실패');
    });
  });

  // ============================================================================
  // generatePDFFromDocx 테스트
  // ============================================================================

  describe('generatePDFFromDocx', () => {
    it('Word 문서에서 PDF 생성 (플레이스홀더)', async () => {
      const docxBlob = new Blob(['mock docx'], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const result = await generatePDFFromDocx(docxBlob);

      expect(result.success).toBe(true);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.fileName).toBe('document.pdf');
    });

    it('메타데이터가 올바르게 적용되는지 확인', async () => {
      const docxBlob = new Blob(['mock docx'], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const metadata: PDFMetadata = {
        title: '제안서',
        author: '생각과행동',
      };

      const result = await generatePDFFromDocx(docxBlob, { metadata });

      expect(result.success).toBe(true);
      expect(mockSetTitle).toHaveBeenCalledWith('제안서');
      expect(mockSetAuthor).toHaveBeenCalledWith('생각과행동');
    });
  });

  // ============================================================================
  // mergePDFs 테스트
  // ============================================================================

  describe('mergePDFs', () => {
    it('여러 PDF를 병합', async () => {
      const pdfs: PDFMergeInput[] = [
        { blob: new Blob(['pdf1'], { type: 'application/pdf' }), fileName: 'part1.pdf' },
        { blob: new Blob(['pdf2'], { type: 'application/pdf' }), fileName: 'part2.pdf' },
      ];

      const result = await mergePDFs(pdfs);

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('merged.pdf');
      expect(mockPDFDocLoad).toHaveBeenCalledTimes(2);
      expect(mockCopyPages).toHaveBeenCalledTimes(2);
    });

    it('단일 PDF 병합', async () => {
      const pdfs: PDFMergeInput[] = [
        { blob: new Blob(['pdf1'], { type: 'application/pdf' }), fileName: 'single.pdf' },
      ];

      const result = await mergePDFs(pdfs);

      expect(result.success).toBe(true);
      expect(mockPDFDocLoad).toHaveBeenCalledTimes(1);
    });

    it('빈 배열로 병합 시도 시 에러 발생', async () => {
      const pdfs: PDFMergeInput[] = [];

      const result = await mergePDFs(pdfs);

      expect(result.success).toBe(false);
      expect(result.error).toContain('병합할 PDF가 없습니다');
    });

    it('메타데이터가 올바르게 적용되는지 확인', async () => {
      const pdfs: PDFMergeInput[] = [
        { blob: new Blob(['pdf1'], { type: 'application/pdf' }) },
      ];
      const metadata: PDFMetadata = {
        title: '병합된 문서',
        author: 'IDEA on Action',
      };

      const result = await mergePDFs(pdfs, metadata);

      expect(result.success).toBe(true);
      expect(mockSetTitle).toHaveBeenCalledWith('병합된 문서');
      expect(mockSetAuthor).toHaveBeenCalledWith('IDEA on Action');
    });
  });

  // ============================================================================
  // addWatermark 테스트
  // ============================================================================

  describe('addWatermark', () => {
    it('PDF에 워터마크 추가', async () => {
      const pdfBlob = new Blob(['mock pdf'], { type: 'application/pdf' });
      const result = await addWatermark(pdfBlob, 'CONFIDENTIAL');

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('watermarked.pdf');
      expect(mockPDFDocLoad).toHaveBeenCalled();
      expect(mockGetPages).toHaveBeenCalled();
    });

    it('커스텀 워터마크 옵션 적용', async () => {
      const pdfBlob = new Blob(['mock pdf'], { type: 'application/pdf' });
      const result = await addWatermark(pdfBlob, 'DRAFT', {
        opacity: 0.2,
        fontSize: 60,
        rotation: 30,
        color: [0.5, 0.5, 0.5],
      });

      expect(result.success).toBe(true);
      expect(mockDrawText).toHaveBeenCalled();
    });

    it('에러 발생 시 에러 결과 반환', async () => {
      mockPDFDocLoad.mockRejectedValueOnce(new Error('PDF 로드 실패'));

      const pdfBlob = new Blob(['mock pdf'], { type: 'application/pdf' });
      const result = await addWatermark(pdfBlob, 'TEST');

      expect(result.success).toBe(false);
      expect(result.error).toBe('PDF 로드 실패');
    });
  });

  // ============================================================================
  // downloadPDF 테스트
  // ============================================================================

  describe('downloadPDF', () => {
    it('PDF Blob을 다운로드', () => {
      const mockClick = vi.fn();
      const mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
      const mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);

      const originalCreateElement = document.createElement.bind(document);
      document.createElement = vi.fn((tag) => {
        if (tag === 'a') {
          const link = originalCreateElement('a');
          link.click = mockClick;
          return link;
        }
        return originalCreateElement(tag);
      }) as any;

      const blob = new Blob(['test pdf'], { type: 'application/pdf' });
      downloadPDF(blob, 'test.pdf');

      expect(mockClick).toHaveBeenCalledTimes(1);
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');

      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
    });

    it('.pdf 확장자가 없으면 자동 추가', () => {
      const mockClick = vi.fn();
      const mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
      const mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);

      let linkElement: HTMLAnchorElement | null = null;
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = vi.fn((tag) => {
        if (tag === 'a') {
          const link = originalCreateElement('a') as HTMLAnchorElement;
          link.click = mockClick;
          linkElement = link;
          return link;
        }
        return originalCreateElement(tag);
      }) as any;

      const blob = new Blob(['test pdf'], { type: 'application/pdf' });
      downloadPDF(blob, 'test');

      expect(linkElement?.download).toBe('test.pdf');

      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
    });
  });
});
