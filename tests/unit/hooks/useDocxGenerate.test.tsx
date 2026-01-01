import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDocxGenerate, useRFPGenerate, useReportGenerate } from '@/hooks/useDocxGenerate';
import type { DocxGenerateOptions } from '@/types/documents/docx.types';

// Mock dependencies
vi.mock('docx', () => ({
  Document: vi.fn(),
  Packer: {
    toBlob: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })),
  },
  Paragraph: vi.fn(),
  TextRun: vi.fn(),
  Table: vi.fn(),
  TableRow: vi.fn(),
  TableCell: vi.fn(),
}));

vi.mock('@/lib/skills/template-engine', () => ({
  TemplateEngine: vi.fn().mockImplementation(() => ({
    generateDocument: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })),
  })),
  downloadBlob: vi.fn(),
  generateFileName: vi.fn().mockReturnValue('test-document.docx'),
}));

vi.mock('@/lib/skills/templates/rfp', () => ({
  buildGovernmentRFP: vi.fn().mockReturnValue([]),
  buildStartupRFP: vi.fn().mockReturnValue([]),
  buildEnterpriseRFP: vi.fn().mockReturnValue([]),
}));

vi.mock('@/lib/skills/templates/reports', () => ({
  buildWeeklyReportSections: vi.fn().mockReturnValue([]),
  buildMonthlyReportSections: vi.fn().mockReturnValue([]),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useDocxGenerate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('초기 상태', () => {
    it('초기 상태가 올바르게 설정되어야 함', () => {
      const { result } = renderHook(() => useDocxGenerate(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBeNull();
    });

    it('generate 함수가 정의되어야 함', () => {
      const { result } = renderHook(() => useDocxGenerate(), {
        wrapper: createWrapper(),
      });

      expect(result.current.generate).toBeDefined();
      expect(typeof result.current.generate).toBe('function');
    });

    it('reset 함수가 정의되어야 함', () => {
      const { result } = renderHook(() => useDocxGenerate(), {
        wrapper: createWrapper(),
      });

      expect(result.current.reset).toBeDefined();
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('RFP 문서 생성', () => {
    it('정부 RFP 문서를 생성해야 함', async () => {
      const { result } = renderHook(() => useDocxGenerate(), {
        wrapper: createWrapper(),
      });

      const options: DocxGenerateOptions = {
        template: 'rfp',
        category: 'government',
        data: {
          projectName: '스마트시티 구축',
          clientName: '서울시',
          startDate: new Date('2025-01-01'),
        },
      };

      await result.current.generate(options);

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
        expect(result.current.progress).toBe(100);
      });
    });

    it('스타트업 RFP 문서를 생성해야 함', async () => {
      const { result } = renderHook(() => useDocxGenerate(), {
        wrapper: createWrapper(),
      });

      const options: DocxGenerateOptions = {
        template: 'rfp',
        category: 'startup',
        data: {
          projectName: 'AI 플랫폼 개발',
          clientName: '테크스타트업',
          startDate: new Date('2025-02-01'),
        },
      };

      await result.current.generate(options);

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    });

    it('엔터프라이즈 RFP 문서를 생성해야 함', async () => {
      const { result } = renderHook(() => useDocxGenerate(), {
        wrapper: createWrapper(),
      });

      const options: DocxGenerateOptions = {
        template: 'rfp',
        category: 'enterprise',
        data: {
          projectName: 'ERP 시스템 구축',
          clientName: '대기업',
          startDate: new Date('2025-03-01'),
        },
      };

      await result.current.generate(options);

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    });
  });

  describe('보고서 문서 생성', () => {
    it('주간 보고서를 생성해야 함', async () => {
      const { result } = renderHook(() => useDocxGenerate(), {
        wrapper: createWrapper(),
      });

      const options: DocxGenerateOptions = {
        template: 'report',
        category: 'weekly',
        data: {
          projectName: '프로젝트 A',
          startDate: new Date('2025-11-01'),
        },
      };

      await result.current.generate(options);

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    });

    it('월간 보고서를 생성해야 함', async () => {
      const { result } = renderHook(() => useDocxGenerate(), {
        wrapper: createWrapper(),
      });

      const options: DocxGenerateOptions = {
        template: 'report',
        category: 'monthly',
        data: {
          projectName: '프로젝트 B',
          startDate: new Date('2025-11-01'),
        },
      };

      await result.current.generate(options);

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    });
  });

  describe('useRFPGenerate', () => {
    it('RFP를 생성해야 함', async () => {
      const { result } = renderHook(() => useRFPGenerate(), {
        wrapper: createWrapper(),
      });

      await result.current.generateRFP('government', {
        projectName: '스마트시티',
        clientName: '서울시',
        startDate: new Date(),
        budget: 5000000000,
        endDate: new Date('2026-01-01'),
      } as never);

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    });

    it('커스텀 파일명으로 RFP를 생성해야 함', async () => {
      const { result } = renderHook(() => useRFPGenerate(), {
        wrapper: createWrapper(),
      });

      await result.current.generateRFP(
        'startup',
        {
          projectName: 'AI 플랫폼',
          clientName: '스타트업',
          startDate: new Date(),
        } as never,
        {
          outputFileName: 'custom-rfp.docx',
        }
      );

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    });
  });

  describe('useReportGenerate', () => {
    it('주간 보고서를 생성해야 함', async () => {
      const { result } = renderHook(() => useReportGenerate(), {
        wrapper: createWrapper(),
      });

      await result.current.generateReport('weekly', {
        projectName: '프로젝트 A',
        clientName: 'ACME Corp',
        startDate: new Date(),
        weekNumber: 45,
        year: 2025,
      } as never);

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    });

    it('월간 보고서를 생성해야 함', async () => {
      const { result } = renderHook(() => useReportGenerate(), {
        wrapper: createWrapper(),
      });

      await result.current.generateReport('monthly', {
        projectName: '프로젝트 B',
        clientName: 'Tech Inc',
        startDate: new Date(),
        month: 11,
        year: 2025,
      } as never);

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    });
  });

  describe('진행 상태', () => {
    it('생성 중 진행률이 업데이트되어야 함', async () => {
      const { result } = renderHook(() => useDocxGenerate(), {
        wrapper: createWrapper(),
      });

      const promise = result.current.generate({
        template: 'rfp',
        category: 'government',
        data: {
          projectName: '테스트',
          startDate: new Date(),
        },
      });

      await waitFor(() => {
        expect(result.current.progress).toBeGreaterThan(0);
      });

      await promise;
    });

    it('완료 시 진행률이 100%가 되어야 함', async () => {
      const { result } = renderHook(() => useDocxGenerate(), {
        wrapper: createWrapper(),
      });

      await result.current.generate({
        template: 'rfp',
        category: 'startup',
        data: {
          projectName: '테스트',
          startDate: new Date(),
        },
      });

      await waitFor(() => {
        expect(result.current.progress).toBe(100);
      });
    });
  });

  describe('에러 처리', () => {
    it('생성 중 에러를 처리해야 함', async () => {
      // Packer.toBlob을 에러 발생하도록 모킹
      const docx = await import('docx');
      vi.mocked(docx.Packer.toBlob).mockRejectedValueOnce(new Error('생성 실패'));

      const { result } = renderHook(() => useDocxGenerate(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.generate({
          template: 'rfp',
          category: 'government',
          data: {
            projectName: '테스트',
            startDate: new Date(),
          },
        })
      ).rejects.toThrow('생성 실패');
    });
  });

  describe('reset 기능', () => {
    it('상태를 초기화해야 함', async () => {
      const { result } = renderHook(() => useDocxGenerate(), {
        wrapper: createWrapper(),
      });

      await result.current.generate({
        template: 'rfp',
        category: 'government',
        data: {
          projectName: '테스트',
          startDate: new Date(),
        },
      });

      // 생성 완료 확인
      await waitFor(() => {
        expect(result.current.progress).toBe(100);
      });

      // reset 호출
      act(() => {
        result.current.reset();
      });

      // 상태 초기화 확인
      await waitFor(() => {
        expect(result.current.progress).toBe(0);
        expect(result.current.error).toBeNull();
      });
    });
  });
});
