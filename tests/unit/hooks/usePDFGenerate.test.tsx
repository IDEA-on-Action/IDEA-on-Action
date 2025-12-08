/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * usePDFGenerate 훅 유닛 테스트
 * BL-016: PDF 생성 훅 테스트
 *
 * @module tests/unit/hooks/usePDFGenerate
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePDFGenerate } from '@/hooks/usePDFGenerate';
import type { PDFMergeInput } from '@/types/pdf.types';
import { PageFormat, PageOrientation } from '@/types/pdf.types';

// Mock generate 함수들
vi.mock('@/lib/skills/pdf/generate', () => ({
  generatePDFFromHTML: vi.fn(async () => ({
    success: true,
    blob: new Blob(['mock pdf'], { type: 'application/pdf' }),
    fileName: 'document.pdf',
    pageCount: 1,
    generatedAt: new Date(),
    fileSize: 1024,
  })),
  generatePDFFromDocx: vi.fn(async () => ({
    success: true,
    blob: new Blob(['mock pdf'], { type: 'application/pdf' }),
    fileName: 'document.pdf',
    pageCount: 1,
    generatedAt: new Date(),
    fileSize: 1024,
  })),
  mergePDFs: vi.fn(async () => ({
    success: true,
    blob: new Blob(['merged pdf'], { type: 'application/pdf' }),
    fileName: 'merged.pdf',
    pageCount: 3,
    generatedAt: new Date(),
    fileSize: 3072,
  })),
  addWatermark: vi.fn(async () => ({
    success: true,
    blob: new Blob(['watermarked pdf'], { type: 'application/pdf' }),
    fileName: 'watermarked.pdf',
    pageCount: 1,
    generatedAt: new Date(),
    fileSize: 1024,
  })),
  downloadPDF: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('usePDFGenerate', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // DOM mocks
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // ============================================================================
  // 초기 상태 테스트
  // ============================================================================

  it('초기 상태가 올바른지 확인', () => {
    const { result } = renderHook(() => usePDFGenerate(), { wrapper });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.generateFromHTML).toBe('function');
    expect(typeof result.current.generateFromDocx).toBe('function');
    expect(typeof result.current.mergePDFs).toBe('function');
    expect(typeof result.current.addWatermark).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  // ============================================================================
  // generateFromHTML 테스트
  // ============================================================================

  describe('generateFromHTML', () => {
    it('HTML에서 PDF를 생성', async () => {
      const { result } = renderHook(() => usePDFGenerate(), { wrapper });

      let pdfResult: any;
      await act(async () => {
        pdfResult = await result.current.generateFromHTML('<h1>제목</h1><p>본문</p>');
      });

      await waitFor(() => {
        expect(pdfResult.success).toBe(true);
        expect(pdfResult.blob).toBeInstanceOf(Blob);
        expect(pdfResult.fileName).toBe('document.pdf');
      });
    });

    it('옵션과 함께 HTML에서 PDF 생성', async () => {
      const { result } = renderHook(() => usePDFGenerate(), { wrapper });

      let pdfResult: any;
      await act(async () => {
        pdfResult = await result.current.generateFromHTML('<p>테스트</p>', {
          format: PageFormat.A4,
          orientation: PageOrientation.portrait,
          metadata: {
            title: '보고서',
            author: 'IDEA on Action',
          },
        });
      });

      await waitFor(() => {
        expect(pdfResult.success).toBe(true);
      });
    });

    it('성공 시 toast 알림 표시', async () => {
      const { toast } = await import('sonner');
      const { result } = renderHook(() => usePDFGenerate(), { wrapper });

      await act(async () => {
        await result.current.generateFromHTML('<p>테스트</p>');
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('PDF가 생성되었습니다: document.pdf');
      });
    });
  });

  // ============================================================================
  // generateFromDocx 테스트
  // ============================================================================

  describe('generateFromDocx', () => {
    it('Word 문서에서 PDF 생성', async () => {
      const { result } = renderHook(() => usePDFGenerate(), { wrapper });

      const docxBlob = new Blob(['mock docx'], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      let pdfResult: any;
      await act(async () => {
        pdfResult = await result.current.generateFromDocx(docxBlob);
      });

      await waitFor(() => {
        expect(pdfResult.success).toBe(true);
        expect(pdfResult.blob).toBeInstanceOf(Blob);
      });
    });

    it('옵션과 함께 Word 문서에서 PDF 생성', async () => {
      const { result } = renderHook(() => usePDFGenerate(), { wrapper });

      const docxBlob = new Blob(['mock docx'], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      let pdfResult: any;
      await act(async () => {
        pdfResult = await result.current.generateFromDocx(docxBlob, {
          format: PageFormat.Letter,
          metadata: { title: '제안서' },
        });
      });

      await waitFor(() => {
        expect(pdfResult.success).toBe(true);
      });
    });
  });

  // ============================================================================
  // mergePDFs 테스트
  // ============================================================================

  describe('mergePDFs', () => {
    it('여러 PDF 병합', async () => {
      const { result } = renderHook(() => usePDFGenerate(), { wrapper });

      const pdfs: PDFMergeInput[] = [
        { blob: new Blob(['pdf1'], { type: 'application/pdf' }), fileName: 'part1.pdf' },
        { blob: new Blob(['pdf2'], { type: 'application/pdf' }), fileName: 'part2.pdf' },
      ];

      let pdfResult: any;
      await act(async () => {
        pdfResult = await result.current.mergePDFs(pdfs);
      });

      await waitFor(() => {
        expect(pdfResult.success).toBe(true);
        expect(pdfResult.fileName).toBe('merged.pdf');
        expect(pdfResult.pageCount).toBe(3);
      });
    });

    it('커스텀 파일명으로 PDF 병합', async () => {
      const { result } = renderHook(() => usePDFGenerate(), { wrapper });

      const pdfs: PDFMergeInput[] = [
        { blob: new Blob(['pdf1'], { type: 'application/pdf' }) },
      ];

      let pdfResult: any;
      await act(async () => {
        pdfResult = await result.current.mergePDFs(pdfs, 'combined.pdf');
      });

      await waitFor(() => {
        expect(pdfResult.success).toBe(true);
      });
    });

    it('성공 시 toast 알림 표시', async () => {
      const { toast } = await import('sonner');
      const { result } = renderHook(() => usePDFGenerate(), { wrapper });

      const pdfs: PDFMergeInput[] = [
        { blob: new Blob(['pdf1'], { type: 'application/pdf' }) },
      ];

      await act(async () => {
        await result.current.mergePDFs(pdfs);
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('PDF가 병합되었습니다: merged.pdf');
      });
    });
  });

  // ============================================================================
  // addWatermark 테스트
  // ============================================================================

  describe('addWatermark', () => {
    it('PDF에 워터마크 추가', async () => {
      const { result } = renderHook(() => usePDFGenerate(), { wrapper });

      const pdfBlob = new Blob(['mock pdf'], { type: 'application/pdf' });

      let pdfResult: any;
      await act(async () => {
        pdfResult = await result.current.addWatermark(pdfBlob, 'CONFIDENTIAL');
      });

      await waitFor(() => {
        expect(pdfResult.success).toBe(true);
        expect(pdfResult.fileName).toBe('watermarked.pdf');
      });
    });

    it('커스텀 옵션으로 워터마크 추가', async () => {
      const { result } = renderHook(() => usePDFGenerate(), { wrapper });

      const pdfBlob = new Blob(['mock pdf'], { type: 'application/pdf' });

      let pdfResult: any;
      await act(async () => {
        pdfResult = await result.current.addWatermark(pdfBlob, 'DRAFT', {
          opacity: 0.2,
          fontSize: 60,
          rotation: 30,
        });
      });

      await waitFor(() => {
        expect(pdfResult.success).toBe(true);
      });
    });

    it('성공 시 toast 알림 표시', async () => {
      const { toast } = await import('sonner');
      const { result } = renderHook(() => usePDFGenerate(), { wrapper });

      const pdfBlob = new Blob(['mock pdf'], { type: 'application/pdf' });

      await act(async () => {
        await result.current.addWatermark(pdfBlob, 'TEST');
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('워터마크가 추가되었습니다: watermarked.pdf');
      });
    });
  });

  // ============================================================================
  // reset 테스트
  // ============================================================================

  describe('reset', () => {
    it('상태를 초기화', async () => {
      const { result } = renderHook(() => usePDFGenerate(), { wrapper });

      // PDF 생성
      await act(async () => {
        await result.current.generateFromHTML('<p>테스트</p>');
      });

      // 상태 초기화
      act(() => {
        result.current.reset();
      });

      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.isGenerating).toBe(false);
    });
  });

  // ============================================================================
  // 진행률 추적 테스트
  // ============================================================================

  describe('진행률 추적', () => {
    it('진행률이 0에서 100까지 증가', async () => {
      const { result } = renderHook(() => usePDFGenerate(), { wrapper });

      const progressValues: number[] = [];

      await act(async () => {
        const promise = result.current.generateFromHTML('<p>테스트</p>');
        progressValues.push(result.current.progress);
        await promise;
      });

      await waitFor(() => {
        expect(result.current.progress).toBeGreaterThanOrEqual(0);
        expect(result.current.progress).toBeLessThanOrEqual(100);
      });
    });
  });
});
