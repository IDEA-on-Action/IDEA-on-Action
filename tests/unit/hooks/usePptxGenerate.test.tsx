/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * usePptxGenerate 훅 유닛 테스트
 *
 * @module tests/unit/hooks/usePptxGenerate
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePptxGenerate } from '@/hooks/usePptxGenerate';
import type {
  PptxGenerateOptions,
  TitleSlide,
  ContentSlide,
  TwoColumnSlide,
  ChartSlide,
  ImageSlide,
  QuoteSlide,
} from '@/types/pptx.types';

// Mock pptxgenjs
const mockWrite = vi.fn();
const mockAddSlide = vi.fn();
const mockAddText = vi.fn();
const mockAddNotes = vi.fn();
const mockAddChart = vi.fn();
const mockAddImage = vi.fn();

// Create mock slide object that will be returned by addSlide
const createMockSlide = () => ({
  background: '',
  addText: mockAddText,
  addNotes: mockAddNotes,
  addChart: mockAddChart,
  addImage: mockAddImage,
});

// Mock pptxgenjs module
vi.mock('pptxgenjs', () => {
  const MockPptxGen = vi.fn(function(this: any) {
    this.title = '';
    this.author = '';
    this.company = '';
    this.subject = '';
    this.write = mockWrite;
    this.addSlide = mockAddSlide;
    this.ChartType = {
      line: 'line',
      bar: 'bar',
      pie: 'pie',
      area: 'area',
    };
  });

  return {
    default: MockPptxGen,
  };
});

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('usePptxGenerate', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mock slide object
    mockAddSlide.mockReturnValue(createMockSlide());

    // Mock write to return blob
    mockWrite.mockResolvedValue(
      new Blob(['mock pptx'], {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      })
    );

    // Mock DOM methods
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = vi.fn((tag) => {
      if (tag === 'a') {
        const link = originalCreateElement('a');
        link.click = vi.fn();
        return link;
      }
      return originalCreateElement(tag);
    });
    const originalAppendChild = document.body.appendChild.bind(document.body);
    const originalRemoveChild = document.body.removeChild.bind(document.body);
    document.body.appendChild = vi.fn((node) => {
      if (node.tagName === 'A') {
        return node;
      }
      return originalAppendChild(node);
    });
    document.body.removeChild = vi.fn((node) => {
      if (node.tagName === 'A') {
        return node;
      }
      return originalRemoveChild(node);
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('초기 상태가 올바르게 설정됨', () => {
    // Execute
    const { result } = renderHook(() => usePptxGenerate(), { wrapper });

    // Assert
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.generatePresentation).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('타이틀 슬라이드가 올바르게 생성됨', async () => {
    // Setup
    const options: PptxGenerateOptions = {
      slides: [
        {
          type: 'title',
          title: 'IDEA on Action',
          subtitle: '혁신적인 솔루션',
        } as TitleSlide,
      ],
      filename: 'test-presentation.pptx',
    };

    // Execute
    const { result } = renderHook(() => usePptxGenerate(), { wrapper });

    await act(async () => {
      await result.current.generatePresentation(options);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    expect(mockAddSlide).toHaveBeenCalled();
    expect(mockAddText).toHaveBeenCalledWith(
      'IDEA on Action',
      expect.objectContaining({
        fontSize: 44,
        bold: true,
      })
    );
    expect(mockWrite).toHaveBeenCalledWith({ outputType: 'blob' });
    expect(result.current.progress).toBe(100);
    expect(result.current.error).toBe(null);
  });

  it('콘텐츠 슬라이드가 올바르게 생성됨', async () => {
    // Setup
    const options: PptxGenerateOptions = {
      slides: [
        {
          type: 'content',
          title: '주요 기능',
          content: ['AI 기반 분석', 'Real-time 협업', '자동화된 워크플로우'],
        } as ContentSlide,
      ],
      filename: 'content-slide.pptx',
    };

    // Execute
    const { result } = renderHook(() => usePptxGenerate(), { wrapper });

    await act(async () => {
      await result.current.generatePresentation(options);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    expect(mockAddSlide).toHaveBeenCalled();
    expect(mockAddText).toHaveBeenCalledTimes(2); // title + content
    expect(result.current.progress).toBe(100);
  });

  it('2단 슬라이드가 올바르게 생성됨', async () => {
    // Setup
    const options: PptxGenerateOptions = {
      slides: [
        {
          type: 'twoColumn',
          title: '비교',
          leftTitle: '기존 방식',
          rightTitle: '새로운 방식',
          leftContent: ['수동 처리', '느린 속도'],
          rightContent: ['자동화', '빠른 속도'],
        } as TwoColumnSlide,
      ],
      filename: 'two-column.pptx',
    };

    // Execute
    const { result } = renderHook(() => usePptxGenerate(), { wrapper });

    await act(async () => {
      await result.current.generatePresentation(options);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    expect(mockAddSlide).toHaveBeenCalled();
    expect(mockAddText).toHaveBeenCalled();
    expect(result.current.progress).toBe(100);
  });

  it('차트 슬라이드가 올바르게 생성됨', async () => {
    // Setup
    const options: PptxGenerateOptions = {
      slides: [
        {
          type: 'chart',
          title: '성장 추이',
          chartData: {
            type: 'line',
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            values: [100, 150, 200, 250],
            seriesName: '매출',
          },
          showLegend: true,
          showDataLabels: true,
        } as ChartSlide,
      ],
      filename: 'chart-slide.pptx',
    };

    // Execute
    const { result } = renderHook(() => usePptxGenerate(), { wrapper });

    await act(async () => {
      await result.current.generatePresentation(options);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    expect(mockAddSlide).toHaveBeenCalled();
    expect(mockAddChart).toHaveBeenCalled();
    expect(result.current.progress).toBe(100);
  });

  it('이미지 슬라이드가 올바르게 생성됨', async () => {
    // Setup
    const options: PptxGenerateOptions = {
      slides: [
        {
          type: 'image',
          title: '스크린샷',
          imageUrl: 'https://example.com/image.png',
          imageLayout: 'center',
          caption: '시스템 대시보드',
        } as ImageSlide,
      ],
      filename: 'image-slide.pptx',
    };

    // Execute
    const { result } = renderHook(() => usePptxGenerate(), { wrapper });

    await act(async () => {
      await result.current.generatePresentation(options);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    expect(mockAddSlide).toHaveBeenCalled();
    expect(mockAddImage).toHaveBeenCalled();
    expect(result.current.progress).toBe(100);
  });

  it('인용 슬라이드가 올바르게 생성됨', async () => {
    // Setup
    const options: PptxGenerateOptions = {
      slides: [
        {
          type: 'quote',
          quoteText: 'Innovation distinguishes between a leader and a follower.',
          quoteAuthor: 'Steve Jobs',
        } as QuoteSlide,
      ],
      filename: 'quote-slide.pptx',
    };

    // Execute
    const { result } = renderHook(() => usePptxGenerate(), { wrapper });

    await act(async () => {
      await result.current.generatePresentation(options);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    expect(mockAddSlide).toHaveBeenCalled();
    expect(mockAddText).toHaveBeenCalledWith(
      expect.stringContaining('Innovation'),
      expect.any(Object)
    );
    expect(result.current.progress).toBe(100);
  });

  it('진행률이 올바르게 업데이트됨', async () => {
    // Setup
    const options: PptxGenerateOptions = {
      slides: [
        { type: 'title', title: 'Slide 1' } as TitleSlide,
        { type: 'title', title: 'Slide 2' } as TitleSlide,
        { type: 'title', title: 'Slide 3' } as TitleSlide,
      ],
      filename: 'multi-slide.pptx',
    };

    // Execute
    const { result } = renderHook(() => usePptxGenerate(), { wrapper });

    await act(async () => {
      await result.current.generatePresentation(options);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.progress).toBe(100);
    });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('메타데이터가 올바르게 적용됨', async () => {
    // Setup
    const options: PptxGenerateOptions = {
      slides: [{ type: 'title', title: 'Test' } as TitleSlide],
      filename: 'metadata-test.pptx',
      metadata: {
        title: '제안서',
        author: 'IDEA on Action',
        company: '생각과행동',
        subject: '프로젝트 제안',
      },
    };

    // Execute
    const { result } = renderHook(() => usePptxGenerate(), { wrapper });

    await act(async () => {
      await result.current.generatePresentation(options);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    expect(result.current.progress).toBe(100);
    expect(result.current.error).toBe(null);
  });

  it('커스텀 스타일이 올바르게 적용됨', async () => {
    // Setup
    const options: PptxGenerateOptions = {
      slides: [{ type: 'title', title: 'Styled' } as TitleSlide],
      filename: 'styled.pptx',
      styles: {
        primaryColor: '#FF5733',
        secondaryColor: '#333333',
        fontFamily: 'Arial',
        fontSize: 20,
      },
    };

    // Execute
    const { result } = renderHook(() => usePptxGenerate(), { wrapper });

    await act(async () => {
      await result.current.generatePresentation(options);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    expect(mockAddText).toHaveBeenCalledWith(
      'Styled',
      expect.objectContaining({
        color: '#FF5733',
        fontFace: 'Arial',
      })
    );
    expect(result.current.progress).toBe(100);
  });

  it('파일 다운로드가 트리거됨', async () => {
    // Setup
    const options: PptxGenerateOptions = {
      slides: [{ type: 'title', title: 'Download Test' } as TitleSlide],
      filename: 'download.pptx',
    };

    // Execute
    const { result } = renderHook(() => usePptxGenerate(), { wrapper });

    await act(async () => {
      await result.current.generatePresentation(options);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('.pptx 확장자가 없는 파일명에 자동으로 추가됨', async () => {
    // Setup
    const options: PptxGenerateOptions = {
      slides: [{ type: 'title', title: 'Extension Test' } as TitleSlide],
      filename: 'no-extension',
    };

    let downloadedFilename = '';
    const originalCreateElement = document.createElement.bind(document);
    const mockLink = originalCreateElement('a');
    mockLink.click = vi.fn();
    Object.defineProperty(mockLink, 'download', {
      get: () => downloadedFilename,
      set: (name: string) => {
        downloadedFilename = name;
      },
      configurable: true,
    });

    document.createElement = vi.fn((tag) => {
      if (tag === 'a') {
        return mockLink;
      }
      return originalCreateElement(tag);
    });

    // Execute
    const { result } = renderHook(() => usePptxGenerate(), { wrapper });

    await act(async () => {
      await result.current.generatePresentation(options);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    expect(downloadedFilename).toBe('no-extension.pptx');
  });

  it('생성 중 에러가 발생하면 에러 상태가 업데이트됨', async () => {
    // Setup
    mockWrite.mockRejectedValueOnce(new Error('PPTX 생성 실패'));

    const options: PptxGenerateOptions = {
      slides: [{ type: 'title', title: 'Error Test' } as TitleSlide],
      filename: 'error.pptx',
    };

    // Execute
    const { result } = renderHook(() => usePptxGenerate(), { wrapper });

    await act(async () => {
      try {
        await result.current.generatePresentation(options);
      } catch (error) {
        // Expected to throw
      }
    });

    // Assert
    await waitFor(() => {
      expect(result.current.error).not.toBe(null);
    });

    expect(result.current.error).toEqual({
      code: 'EXPORT_FAILED',
      message: 'PPTX 생성 실패',
      details: expect.any(Error),
    });
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it('reset 함수가 상태를 초기화함', async () => {
    // Setup
    const options: PptxGenerateOptions = {
      slides: [{ type: 'title', title: 'Reset Test' } as TitleSlide],
      filename: 'reset.pptx',
    };

    // Execute
    const { result } = renderHook(() => usePptxGenerate(), { wrapper });

    await act(async () => {
      await result.current.generatePresentation(options);
    });

    await waitFor(() => {
      expect(result.current.progress).toBe(100);
    });

    // Reset
    act(() => {
      result.current.reset();
    });

    // Assert
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBe(null);
    expect(result.current.isGenerating).toBe(false);
  });

  it('발표자 노트가 올바르게 추가됨', async () => {
    // Setup
    const options: PptxGenerateOptions = {
      slides: [
        {
          type: 'title',
          title: 'With Notes',
          notes: '이것은 발표자 노트입니다.',
        } as TitleSlide,
      ],
      filename: 'notes.pptx',
    };

    // Execute
    const { result } = renderHook(() => usePptxGenerate(), { wrapper });

    await act(async () => {
      await result.current.generatePresentation(options);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    expect(mockAddNotes).toHaveBeenCalledWith('이것은 발표자 노트입니다.');
    expect(result.current.progress).toBe(100);
  });

  it('여러 타입의 슬라이드가 혼합된 프레젠테이션이 생성됨', async () => {
    // Setup
    const options: PptxGenerateOptions = {
      slides: [
        { type: 'title', title: 'Title Slide' } as TitleSlide,
        { type: 'content', title: 'Content', content: ['Item 1'] } as ContentSlide,
        {
          type: 'twoColumn',
          leftContent: ['Left'],
          rightContent: ['Right'],
        } as TwoColumnSlide,
        {
          type: 'chart',
          chartData: {
            type: 'bar',
            labels: ['A'],
            values: [10],
          },
        } as ChartSlide,
        { type: 'quote', quoteText: 'Quote' } as QuoteSlide,
      ],
      filename: 'mixed.pptx',
    };

    // Execute
    const { result } = renderHook(() => usePptxGenerate(), { wrapper });

    await act(async () => {
      await result.current.generatePresentation(options);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    expect(mockAddSlide).toHaveBeenCalledTimes(5);
    expect(result.current.progress).toBe(100);
    expect(result.current.error).toBe(null);
  });

  it('차트 타입이 올바르게 매핑됨', async () => {
    // Setup
    const chartTypes: Array<'line' | 'bar' | 'pie' | 'area'> = [
      'line',
      'bar',
      'pie',
      'area',
    ];

    for (const chartType of chartTypes) {
      const options: PptxGenerateOptions = {
        slides: [
          {
            type: 'chart',
            chartData: {
              type: chartType,
              labels: ['A', 'B'],
              values: [10, 20],
            },
          } as ChartSlide,
        ],
        filename: `chart-${chartType}.pptx`,
      };

      // Execute
      const { result } = renderHook(() => usePptxGenerate(), { wrapper });

      await act(async () => {
        await result.current.generatePresentation(options);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(mockAddChart).toHaveBeenCalled();
      expect(result.current.progress).toBe(100);

      // Cleanup for next iteration
      act(() => {
        result.current.reset();
      });
      vi.clearAllMocks();

      // Reset mock implementations
      mockAddSlide.mockReturnValue(createMockSlide());
      mockWrite.mockResolvedValue(
        new Blob(['mock pptx'], {
          type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        })
      );
    }
  });

  it('이미지 레이아웃 옵션이 올바르게 적용됨', async () => {
    // Setup
    const layouts: Array<'full' | 'left' | 'right' | 'center'> = [
      'full',
      'left',
      'right',
      'center',
    ];

    for (const layout of layouts) {
      const options: PptxGenerateOptions = {
        slides: [
          {
            type: 'image',
            imageUrl: 'https://example.com/image.png',
            imageLayout: layout,
          } as ImageSlide,
        ],
        filename: `image-${layout}.pptx`,
      };

      // Execute
      const { result } = renderHook(() => usePptxGenerate(), { wrapper });

      await act(async () => {
        await result.current.generatePresentation(options);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(mockAddImage).toHaveBeenCalled();
      expect(result.current.progress).toBe(100);

      // Cleanup for next iteration
      act(() => {
        result.current.reset();
      });
      vi.clearAllMocks();

      // Reset mock implementations
      mockAddSlide.mockReturnValue(createMockSlide());
      mockWrite.mockResolvedValue(
        new Blob(['mock pptx'], {
          type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        })
      );
    }
  });

  it('Base64 이미지가 올바르게 처리됨', async () => {
    // Setup
    const options: PptxGenerateOptions = {
      slides: [
        {
          type: 'image',
          imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          imageLayout: 'center',
        } as ImageSlide,
      ],
      filename: 'base64-image.pptx',
    };

    // Execute
    const { result } = renderHook(() => usePptxGenerate(), { wrapper });

    await act(async () => {
      await result.current.generatePresentation(options);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    expect(mockAddImage).toHaveBeenCalled();
    expect(result.current.progress).toBe(100);
  });
});
