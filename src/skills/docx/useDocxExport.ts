/**
 * docx 내보내기 훅
 *
 * Central Hub 데이터를 Word 문서로 내보내기
 *
 * @module skills/docx/useDocxExport
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type {
  UseDocxExportOptions,
  UseDocxExportResult,
  DocxExportConfig,
  DocxSection,
  DocxContent,
} from '@/types/docx.types';
import type { SkillError } from '@/types/skills.types';
import { fetchEvents } from '../xlsx/generators/eventsSheet';
import { fetchIssues } from '../xlsx/generators/issuesSheet';
import { fetchHealth } from '../xlsx/generators/healthSheet';

/**
 * docx 내보내기 훅
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { exportDocument, isExporting, progress, error } = useDocxExport();
 *
 *   const handleExport = async () => {
 *     await exportDocument({
 *       filename: 'my-report.docx',
 *       dateRange: { from: new Date('2025-01-01'), to: new Date() },
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleExport} disabled={isExporting}>
 *       {isExporting ? `${progress}% 내보내는 중...` : 'Word 내보내기'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDocxExport(): UseDocxExportResult {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<SkillError | null>(null);

  const exportDocument = useCallback(
    async (options?: UseDocxExportOptions) => {
      // 인증 확인
      if (!user) {
        setError({
          code: 'UNAUTHORIZED',
          message: '로그인이 필요합니다.',
        });
        return;
      }

      setIsExporting(true);
      setProgress(0);
      setError(null);

      try {
        // 0. docx 라이브러리 동적 로딩 (0-10%)
        setProgress(5);
        const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType } =
          await import('docx');
        setProgress(10);

        // 1. 데이터 로딩 (10-30%)
        setProgress(15);
        const config = options?.config || (await generateDefaultConfig(options?.dateRange));
        setProgress(30);

        // 2. 문서 생성 (30-70%)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sections: any[] = [];

        for (let i = 0; i < config.sections.length; i++) {
          const section = config.sections[i];
          setProgress(30 + Math.floor(((i + 1) / config.sections.length) * 40));

          // 섹션 제목
          sections.push(
            new Paragraph({
              text: section.heading,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            })
          );

          // 섹션 콘텐츠
          for (const content of section.content) {
            sections.push(...convertContentToDocx(content, { Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType }));
          }

          // 페이지 구분
          if (section.pageBreak && i < config.sections.length - 1) {
            sections.push(
              new Paragraph({
                pageBreakBefore: true,
              })
            );
          }
        }

        setProgress(70);

        // 3. 문서 객체 생성 (70-80%)
        const doc = new Document({
          sections: [
            {
              properties: {},
              children: sections,
            },
          ],
          creator: config.author || '생각과행동',
          title: config.title,
          description: config.description,
        });

        setProgress(80);

        // 4. 파일 생성 및 다운로드 (80-100%)
        const blob = await Packer.toBlob(doc);
        const filename = options?.filename || generateFilename();

        setProgress(90);
        downloadBlob(blob, filename);
        setProgress(100);
      } catch (err) {
        console.error('[useDocxExport] Export failed:', err);
        setError({
          code: 'EXPORT_FAILED',
          message: 'Word 문서 내보내기에 실패했습니다.',
          details: err,
        });
      } finally {
        setIsExporting(false);
      }
    },
    [user]
  );

  return { exportDocument, isExporting, progress, error };
}

/**
 * 기본 문서 설정 생성
 */
async function generateDefaultConfig(
  dateRange?: UseDocxExportOptions['dateRange']
): Promise<DocxExportConfig> {
  const [eventsResult, issuesResult, healthResult] = await Promise.all([
    fetchEvents(supabase, dateRange),
    fetchIssues(supabase, dateRange),
    fetchHealth(supabase),
  ]);

  const sections: DocxSection[] = [
    {
      heading: '1. 개요',
      content: [
        {
          type: 'paragraph',
          text: `이 보고서는 Central Hub의 시스템 현황을 요약합니다.`,
        },
        {
          type: 'paragraph',
          text: `생성 일시: ${new Date().toLocaleString('ko-KR')}`,
        },
        dateRange
          ? {
              type: 'paragraph',
              text: `기간: ${dateRange.from.toLocaleDateString('ko-KR')} ~ ${dateRange.to.toLocaleDateString('ko-KR')}`,
            }
          : {
              type: 'paragraph',
              text: '기간: 전체',
            },
      ],
    },
    {
      heading: '2. 이벤트 로그',
      content: [
        {
          type: 'paragraph',
          text: `총 ${eventsResult.length}개의 이벤트가 기록되었습니다.`,
        },
        {
          type: 'table',
          headers: ['서비스', '이벤트 유형', '생성일시'],
          data: eventsResult.slice(0, 50).map((event) => [
            event.service,
            event.eventType,
            event.createdAt,
          ]),
        },
      ],
      pageBreak: true,
    },
    {
      heading: '3. 이슈 현황',
      content: [
        {
          type: 'paragraph',
          text: `총 ${issuesResult.length}개의 이슈가 등록되었습니다.`,
        },
        {
          type: 'table',
          headers: ['서비스', '심각도', '제목', '상태'],
          data: issuesResult.slice(0, 50).map((issue) => [
            issue.service,
            issue.severity,
            issue.title,
            issue.status,
          ]),
        },
      ],
      pageBreak: true,
    },
    {
      heading: '4. 서비스 헬스',
      content: [
        {
          type: 'paragraph',
          text: `${healthResult.length}개 서비스의 상태를 모니터링하고 있습니다.`,
        },
        {
          type: 'table',
          headers: ['서비스', '상태', '응답시간(ms)', '에러율(%)', '가동률(%)'],
          data: healthResult.map((health) => [
            health.service,
            health.status,
            health.responseTimeMs,
            health.errorRate,
            health.uptimePercent,
          ]),
        },
      ],
    },
  ];

  return {
    title: 'Central Hub 시스템 보고서',
    author: '생각과행동',
    description: 'Central Hub 데이터 요약 보고서',
    sections,
  };
}

/**
 * DocxContent를 docx 요소로 변환
 */
function convertContentToDocx(
  content: DocxContent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  docxLib: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  const { Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType } = docxLib;

  switch (content.type) {
    case 'paragraph': {
      return [
        new Paragraph({
          children: [new TextRun(content.text)],
          heading: content.style === 'heading1' ? 1 : content.style === 'heading2' ? 2 : content.style === 'heading3' ? 3 : undefined,
          spacing: { before: 200, after: 200 },
        }),
      ];
    }

    case 'list': {
      return content.items.map(
        (item, index) =>
          new Paragraph({
            text: content.ordered ? `${index + 1}. ${item}` : `• ${item}`,
            spacing: { before: 100, after: 100 },
          })
      );
    }

    case 'table': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: any[] = [];

      // 헤더 행
      if (content.headers) {
        rows.push(
          new TableRow({
            children: content.headers.map(
              (header) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: header,
                          bold: true,
                        }),
                      ],
                    }),
                  ],
                  shading: {
                    fill: 'D3D3D3',
                  },
                })
            ),
          })
        );
      }

      // 데이터 행
      for (const row of content.data) {
        rows.push(
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [new Paragraph(String(cell))],
                })
            ),
          })
        );
      }

      return [
        new Table({
          rows,
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
        }),
        new Paragraph({ text: '' }), // 테이블 다음 공백
      ];
    }

    case 'image': {
      // 이미지는 복잡하므로 placeholder로 대체
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: `[이미지: ${content.caption || content.url}]`,
              italics: true,
            }),
          ],
        }),
      ];
    }

    default:
      return [];
  }
}

/**
 * 파일명 생성
 */
function generateFilename(): string {
  const date = new Date().toISOString().split('T')[0];
  return `central-hub-report-${date}.docx`;
}

/**
 * Blob 다운로드
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default useDocxExport;
