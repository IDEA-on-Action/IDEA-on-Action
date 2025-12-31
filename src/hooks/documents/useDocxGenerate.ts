/**
 * useDocxGenerate Hook
 * TASK-CS-020: Word 문서 생성을 위한 React 커스텀 훅
 *
 * RFP, 보고서, 제안서 등 Word 문서 생성 기능 제공
 * - 진행률 표시
 * - Toast 알림 연동
 * - TanStack Query 통합
 *
 * @module hooks/useDocxGenerate
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import type {
  DocxGenerateOptions,
  DocxGenerateResult,
  UseDocxGenerateReturn,
  TemplateData,
  DocumentMetadata,
  RFPCategory,
  ReportCategory,
} from '@/types/docx.types';
import type { SkillError } from '@/types/skills.types';
import {
  TemplateEngine,
  downloadBlob,
  generateFileName,
} from '@/lib/skills/template-engine';
import {
  buildGovernmentRFP,
  buildStartupRFP,
  buildEnterpriseRFP,
  type GovernmentRFPData,
  type StartupRFPData,
  type EnterpriseRFPData,
} from '@/lib/skills/templates/rfp';
import {
  buildWeeklyReportSections,
  buildMonthlyReportSections,
  type WeeklyReportData,
  type MonthlyReportData,
} from '@/lib/skills/templates/reports';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * RFP 생성 옵션
 */
interface RFPGenerateOptions {
  category: RFPCategory;
  data: GovernmentRFPData | StartupRFPData | EnterpriseRFPData;
  outputFileName?: string;
  metadata?: Partial<DocumentMetadata>;
}

/**
 * 보고서 생성 옵션
 */
interface ReportGenerateOptions {
  category: ReportCategory;
  data: WeeklyReportData | MonthlyReportData;
  outputFileName?: string;
  metadata?: Partial<DocumentMetadata>;
}

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
// useDocxGenerate 훅
// ============================================================================

/**
 * Word 문서 생성 훅
 *
 * @example
 * ```tsx
 * const { generate, isGenerating, progress, error, reset } = useDocxGenerate();
 *
 * const handleExport = async () => {
 *   await generate({
 *     template: 'rfp',
 *     category: 'government',
 *     data: {
 *       projectName: '스마트시티 구축',
 *       clientName: '서울시',
 *       startDate: new Date(),
 *       // ...
 *     },
 *   });
 * };
 * ```
 */
export function useDocxGenerate(): UseDocxGenerateReturn {
  const [progress, setProgress] = useState(0);
  const [skillError, setSkillError] = useState<SkillError | null>(null);

  const mutation = useMutation({
    mutationFn: async (options: DocxGenerateOptions): Promise<DocxGenerateResult> => {
      setProgress(5);
      setSkillError(null);

      // docx 라이브러리 동적 로딩
      const docx = await import('docx');
      const { Document, Packer } = docx;
      setProgress(10);

      const { template, category, data, metadata, outputFileName, styles } = options;

      // 메타데이터 기본값
      const docMetadata: DocumentMetadata = {
        title: data.projectName,
        author: metadata?.author || 'IDEA on Action',
        description: metadata?.description,
        subject: metadata?.subject,
        keywords: metadata?.keywords,
        createdAt: new Date(),
        company: metadata?.company || '생각과행동',
        ...metadata,
      };

      setProgress(30);

      // TemplateEngine 생성
      const engine = new TemplateEngine(docMetadata, styles);

      // 템플릿별 처리
      let blob: Blob;
      let fileName: string;

      try {
        switch (template) {
          case 'rfp': {
            // RFP 템플릿: 카테고리별 전용 빌더 사용
            const sections = buildRFPSections(engine, category as RFPCategory, data);
            setProgress(60);
            blob = await createDocumentBlob(docMetadata, sections, Document, Packer);
            fileName = outputFileName || generateFileName(template, data.projectName);
            break;
          }

          case 'report': {
            // 보고서 템플릿: 카테고리별 전용 빌더 사용
            const sections = buildReportSections(category as ReportCategory, data);
            setProgress(60);
            blob = await createDocumentBlob(docMetadata, sections, Document, Packer);
            fileName = outputFileName || generateFileName(template, data.projectName);
            break;
          }

          default: {
            // 기본 문서 생성 (TemplateEngine 사용)
            setProgress(60);
            blob = await engine.generateDocument(
              template,
              category || 'government',
              data
            );
            fileName = outputFileName || generateFileName(template, data.projectName);
          }
        }

        setProgress(80);

        // 다운로드
        downloadBlob(blob, fileName);

        setProgress(100);

        return {
          success: true,
          fileName,
          blob,
          generatedAt: new Date(),
          fileSize: blob.size,
        };
      } catch (err) {
        const skillErr = toSkillError(err);
        setSkillError(skillErr);
        throw err;
      }
    },
    onSuccess: (result) => {
      toast.success(`문서가 생성되었습니다: ${result.fileName}`);
    },
    onError: (error: Error) => {
      toast.error(`문서 생성 실패: ${error.message}`);
      setProgress(0);
    },
  });

  const generate = useCallback(
    async (options: DocxGenerateOptions): Promise<DocxGenerateResult> => {
      setProgress(0);
      setSkillError(null);
      return mutation.mutateAsync(options);
    },
    [mutation]
  );

  const reset = useCallback(() => {
    setProgress(0);
    setSkillError(null);
    mutation.reset();
  }, [mutation]);

  return {
    generate,
    isGenerating: mutation.isPending,
    progress,
    error: skillError,
    reset,
  };
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * RFP 섹션 빌더 (카테고리별 분기)
 */
function buildRFPSections(
  engine: TemplateEngine,
  category: RFPCategory,
  data: TemplateData
): (import('docx').Paragraph | import('docx').Table)[] {
  switch (category) {
    case 'government':
      return buildGovernmentRFP(engine, data as GovernmentRFPData);
    case 'startup':
      return buildStartupRFP(engine, data as StartupRFPData);
    case 'enterprise':
      return buildEnterpriseRFP(engine, data as EnterpriseRFPData);
    default:
      // 기본값: government
      return buildGovernmentRFP(engine, data as GovernmentRFPData);
  }
}

/**
 * 보고서 섹션 빌더 (카테고리별 분기)
 */
function buildReportSections(
  category: ReportCategory,
  data: TemplateData
): (import('docx').Paragraph | import('docx').Table)[] {
  switch (category) {
    case 'weekly':
      return buildWeeklyReportSections(data as WeeklyReportData);
    case 'monthly':
      return buildMonthlyReportSections(data as MonthlyReportData);
    default:
      // 기본값: weekly
      return buildWeeklyReportSections(data as WeeklyReportData);
  }
}

/**
 * Document Blob 생성
 */
async function createDocumentBlob(
  metadata: DocumentMetadata,
  sections: (import('docx').Paragraph | import('docx').Table)[],
  Document: typeof import('docx').Document,
  Packer: typeof import('docx').Packer
): Promise<Blob> {
  const doc = new Document({
    creator: metadata.author,
    title: metadata.title,
    description: metadata.description,
    subject: metadata.subject,
    keywords: metadata.keywords?.join(', '),
    sections: [
      {
        children: sections,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

// ============================================================================
// 편의 훅: useRFPGenerate
// ============================================================================

/**
 * RFP 문서 생성 전용 훅
 *
 * @example
 * ```tsx
 * const { generateRFP, isGenerating, progress, error, reset } = useRFPGenerate();
 *
 * const handleExport = async () => {
 *   await generateRFP('government', {
 *     projectName: '스마트시티 구축',
 *     clientName: '서울시',
 *     startDate: new Date(),
 *     budget: 5000000000,
 *     // ...
 *   });
 * };
 * ```
 */
export function useRFPGenerate() {
  const { generate, ...rest } = useDocxGenerate();

  const generateRFP = useCallback(
    async (
      category: RFPCategory,
      data: GovernmentRFPData | StartupRFPData | EnterpriseRFPData,
      options?: Pick<RFPGenerateOptions, 'outputFileName' | 'metadata'>
    ): Promise<DocxGenerateResult> => {
      return generate({
        template: 'rfp',
        category,
        data: data as TemplateData,
        outputFileName: options?.outputFileName,
        metadata: options?.metadata,
      });
    },
    [generate]
  );

  return { generateRFP, ...rest };
}

// ============================================================================
// 편의 훅: useReportGenerate
// ============================================================================

/**
 * 보고서 문서 생성 전용 훅
 *
 * @example
 * ```tsx
 * const { generateReport, isGenerating, progress, error, reset } = useReportGenerate();
 *
 * const handleExport = async () => {
 *   await generateReport('weekly', {
 *     projectName: '프로젝트 A',
 *     clientName: 'ACME Corp',
 *     startDate: new Date(),
 *     weekNumber: 45,
 *     year: 2025,
 *     // ...
 *   });
 * };
 * ```
 */
export function useReportGenerate() {
  const { generate, ...rest } = useDocxGenerate();

  const generateReport = useCallback(
    async (
      category: 'weekly' | 'monthly',
      data: WeeklyReportData | MonthlyReportData,
      options?: Pick<ReportGenerateOptions, 'outputFileName' | 'metadata'>
    ): Promise<DocxGenerateResult> => {
      return generate({
        template: 'report',
        category,
        data: data as TemplateData,
        outputFileName: options?.outputFileName,
        metadata: options?.metadata,
      });
    },
    [generate]
  );

  return { generateReport, ...rest };
}

// ============================================================================
// 기본 내보내기
// ============================================================================

export default useDocxGenerate;
