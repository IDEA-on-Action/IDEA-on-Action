/**
 * usePDFGenerate Hook
 * BL-016: PDF 생성을 위한 React 커스텀 훅
 *
 * HTML/Docx → PDF 변환, PDF 병합, 워터마크 추가 기능 제공
 * - 진행률 표시
 * - Toast 알림 연동
 * - TanStack Query 통합
 *
 * @module hooks/usePDFGenerate
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import type {
  PDFGenerateOptions,
  PDFResult,
  UsePDFGenerateReturn,
  PDFMergeInput,
  WatermarkOptions,
} from '@/types/documents/pdf.types';
import type { SkillError } from '@/types/ai/skills.types';
import {
  generatePDFFromHTML,
  generatePDFFromDocx,
  mergePDFs as mergePDFsLib,
  addWatermark as addWatermarkLib,
  downloadPDF,
} from '@/lib/skills/pdf/generate';

// ============================================================================
// 에러 변환 유틸리티
// ============================================================================

/**
 * Error를 SkillError로 변환
 */
function toSkillError(error: unknown): SkillError {
  if (error instanceof Error) {
    return {
      code: 'EXPORT_FAILED',
      message: error.message,
      details: error,
    };
  }
  return {
    code: 'UNKNOWN',
    message: String(error),
  };
}

// ============================================================================
// usePDFGenerate 훅
// ============================================================================

/**
 * PDF 생성 훅
 *
 * @example
 * ```tsx
 * const { generateFromHTML, isGenerating, progress, error, reset } = usePDFGenerate();
 *
 * const handleExport = async () => {
 *   const result = await generateFromHTML(
 *     '<h1>보고서</h1><p>내용</p>',
 *     {
 *       format: PageFormat.A4,
 *       metadata: { title: '보고서', author: 'IDEA on Action' },
 *     }
 *   );
 *
 *   if (result.success && result.blob) {
 *     downloadPDF(result.blob, 'report.pdf');
 *   }
 * };
 * ```
 */
export function usePDFGenerate(): UsePDFGenerateReturn {
  const [progress, setProgress] = useState(0);
  const [skillError, setSkillError] = useState<SkillError | null>(null);

  // ============================================================================
  // HTML → PDF 변환
  // ============================================================================

  const htmlMutation = useMutation({
    mutationFn: async ({
      html,
      options,
    }: {
      html: string;
      options?: Partial<PDFGenerateOptions>;
    }): Promise<PDFResult> => {
      setProgress(5);
      setSkillError(null);

      const result = await generatePDFFromHTML(html, options);

      setProgress(80);

      if (result.success && result.blob) {
        downloadPDF(result.blob, result.fileName);
      }

      setProgress(100);
      return result;
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`PDF가 생성되었습니다: ${result.fileName}`);
      } else {
        toast.error(`PDF 생성 실패: ${result.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`PDF 생성 실패: ${error.message}`);
      setProgress(0);
    },
  });

  // ============================================================================
  // Docx → PDF 변환
  // ============================================================================

  const docxMutation = useMutation({
    mutationFn: async ({
      docxBlob,
      options,
    }: {
      docxBlob: Blob;
      options?: Partial<PDFGenerateOptions>;
    }): Promise<PDFResult> => {
      setProgress(5);
      setSkillError(null);

      const result = await generatePDFFromDocx(docxBlob, options);

      setProgress(80);

      if (result.success && result.blob) {
        downloadPDF(result.blob, result.fileName);
      }

      setProgress(100);
      return result;
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`PDF가 생성되었습니다: ${result.fileName}`);
      } else {
        toast.error(`PDF 생성 실패: ${result.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`PDF 생성 실패: ${error.message}`);
      setProgress(0);
    },
  });

  // ============================================================================
  // PDF 병합
  // ============================================================================

  const mergeMutation = useMutation({
    mutationFn: async ({
      pdfs,
      fileName,
    }: {
      pdfs: PDFMergeInput[];
      fileName?: string;
    }): Promise<PDFResult> => {
      setProgress(5);
      setSkillError(null);

      const result = await mergePDFsLib(pdfs);

      setProgress(80);

      if (result.success && result.blob) {
        downloadPDF(result.blob, fileName || result.fileName);
      }

      setProgress(100);
      return result;
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`PDF가 병합되었습니다: ${result.fileName}`);
      } else {
        toast.error(`PDF 병합 실패: ${result.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`PDF 병합 실패: ${error.message}`);
      setProgress(0);
    },
  });

  // ============================================================================
  // 워터마크 추가
  // ============================================================================

  const watermarkMutation = useMutation({
    mutationFn: async ({
      pdfBlob,
      text,
      options,
    }: {
      pdfBlob: Blob;
      text: string;
      options?: Partial<WatermarkOptions>;
    }): Promise<PDFResult> => {
      setProgress(5);
      setSkillError(null);

      const result = await addWatermarkLib(pdfBlob, text, options);

      setProgress(80);

      if (result.success && result.blob) {
        downloadPDF(result.blob, result.fileName);
      }

      setProgress(100);
      return result;
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`워터마크가 추가되었습니다: ${result.fileName}`);
      } else {
        toast.error(`워터마크 추가 실패: ${result.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`워터마크 추가 실패: ${error.message}`);
      setProgress(0);
    },
  });

  // ============================================================================
  // 공개 API
  // ============================================================================

  const generateFromHTML = useCallback(
    async (html: string, options?: Partial<PDFGenerateOptions>): Promise<PDFResult> => {
      setProgress(0);
      setSkillError(null);
      return htmlMutation.mutateAsync({ html, options });
    },
    [htmlMutation]
  );

  const generateFromDocx = useCallback(
    async (docxBlob: Blob, options?: Partial<PDFGenerateOptions>): Promise<PDFResult> => {
      setProgress(0);
      setSkillError(null);
      return docxMutation.mutateAsync({ docxBlob, options });
    },
    [docxMutation]
  );

  const mergePDFs = useCallback(
    async (pdfs: PDFMergeInput[], fileName?: string): Promise<PDFResult> => {
      setProgress(0);
      setSkillError(null);
      return mergeMutation.mutateAsync({ pdfs, fileName });
    },
    [mergeMutation]
  );

  const addWatermark = useCallback(
    async (
      pdfBlob: Blob,
      text: string,
      options?: Partial<WatermarkOptions>
    ): Promise<PDFResult> => {
      setProgress(0);
      setSkillError(null);
      return watermarkMutation.mutateAsync({ pdfBlob, text, options });
    },
    [watermarkMutation]
  );

  const reset = useCallback(() => {
    setProgress(0);
    setSkillError(null);
    htmlMutation.reset();
    docxMutation.reset();
    mergeMutation.reset();
    watermarkMutation.reset();
  }, [htmlMutation, docxMutation, mergeMutation, watermarkMutation]);

  return {
    generateFromHTML,
    generateFromDocx,
    mergePDFs,
    addWatermark,
    isGenerating:
      htmlMutation.isPending ||
      docxMutation.isPending ||
      mergeMutation.isPending ||
      watermarkMutation.isPending,
    progress,
    error: skillError,
    reset,
  };
}

// ============================================================================
// 기본 내보내기
// ============================================================================

export default usePDFGenerate;
