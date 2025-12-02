/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useDocxExport 훅 유닛 테스트
 *
 * @module tests/unit/skills/useDocxExport
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';
import { useDocxExport } from '@/skills/docx/useDocxExport';
import { useAuth } from '@/hooks/useAuth';
import { fetchEvents } from '@/skills/xlsx/generators/eventsSheet';
import { fetchIssues } from '@/skills/xlsx/generators/issuesSheet';
import React from 'react';

// Mock useAuth
vi.mock('@/hooks/useAuth');

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    })),
  },
}));

// Mock docx library
vi.mock('docx', () => ({
  Document: vi.fn(),
  Packer: {
    toBlob: vi.fn(() => Promise.resolve(new Blob(['mock docx'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }))),
  },
  Paragraph: vi.fn(),
  TextRun: vi.fn(),
  Table: vi.fn(),
  TableRow: vi.fn(),
  TableCell: vi.fn(),
  HeadingLevel: {
    HEADING_1: 1,
    HEADING_2: 2,
    HEADING_3: 3,
  },
  AlignmentType: {
    CENTER: 'center',
    LEFT: 'left',
    RIGHT: 'right',
  },
  WidthType: {
    PERCENTAGE: 'percentage',
  },
}));

// Mock data generators
vi.mock('@/skills/xlsx/generators/eventsSheet', () => ({
  fetchEvents: vi.fn(() => Promise.resolve([
    {
      id: '1',
      service: '테스트 서비스',
      eventType: '진행 상태 업데이트',
      projectId: 'project-1',
      userId: 'user-1',
      createdAt: '2025-12-02 10:00:00',
      payload: '{}',
    },
  ])),
}));

vi.mock('@/skills/xlsx/generators/issuesSheet', () => ({
  fetchIssues: vi.fn(() => Promise.resolve([
    {
      id: '1',
      service: '테스트 서비스',
      severity: '높음',
      title: '테스트 이슈',
      description: '설명',
      status: '미해결',
      assigneeId: 'user-1',
      resolvedAt: '',
      createdAt: '2025-12-02 10:00:00',
    },
  ])),
}));

vi.mock('@/skills/xlsx/generators/healthSheet', () => ({
  fetchHealth: vi.fn(() => Promise.resolve([
    {
      service: '테스트 서비스',
      status: '정상',
      responseTimeMs: '50',
      errorRate: '0.1',
      uptimePercent: '99.9',
      lastPing: '2025-12-02 10:00:00',
      updatedAt: '2025-12-02 10:00:00',
    },
  ])),
}));

describe('useDocxExport', () => {
  const mockUser = {
    id: '123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock document.createElement and related DOM methods
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
        return node; // Don't actually append links
      }
      return originalAppendChild(node);
    });
    document.body.removeChild = vi.fn((node) => {
      if (node.tagName === 'A') {
        return node; // Don't actually remove links
      }
      return originalRemoveChild(node);
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('초기 상태가 올바르게 설정됨', () => {
    // Setup
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as any);

    // Execute
    const { result } = renderHook(() => useDocxExport());

    // Assert
    expect(result.current.isExporting).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.exportDocument).toBe('function');
  });

  it('인증되지 않은 사용자는 에러를 반환해야 함', async () => {
    // Setup
    vi.mocked(useAuth).mockReturnValue({ user: null } as any);

    // Execute
    const { result } = renderHook(() => useDocxExport());

    await act(async () => {
      await result.current.exportDocument();
    });

    // Assert
    expect(result.current.error).toEqual({
      code: 'UNAUTHORIZED',
      message: '로그인이 필요합니다.',
    });
    expect(result.current.isExporting).toBe(false);
  });

  it('문서 내보내기가 성공적으로 실행됨', async () => {
    // Setup
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as any);

    // Execute
    const { result } = renderHook(() => useDocxExport());

    await act(async () => {
      await result.current.exportDocument({
        filename: 'test-report.docx',
      });
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isExporting).toBe(false);
    });

    expect(result.current.progress).toBe(100);
    expect(result.current.error).toBe(null);
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('진행률이 올바르게 업데이트됨', async () => {
    // Setup
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as any);

    // Execute
    const { result } = renderHook(() => useDocxExport());

    await act(async () => {
      await result.current.exportDocument({
        filename: 'test-report.docx',
      });
    });

    // Assert - 최종 진행률이 100%인지만 확인
    await waitFor(() => {
      expect(result.current.progress).toBe(100);
    });

    expect(result.current.isExporting).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('날짜 범위 옵션이 올바르게 적용됨', async () => {
    // Setup
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as any);

    const dateRange = {
      from: new Date('2025-11-01'),
      to: new Date('2025-11-30'),
    };

    // Execute
    const { result } = renderHook(() => useDocxExport());

    await act(async () => {
      await result.current.exportDocument({
        filename: 'test-report.docx',
        dateRange,
      });
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isExporting).toBe(false);
    });

    expect(vi.mocked(fetchEvents)).toHaveBeenCalledWith(expect.anything(), dateRange);
    expect(vi.mocked(fetchIssues)).toHaveBeenCalledWith(expect.anything(), dateRange);
  });

  it('커스텀 설정이 올바르게 적용됨', async () => {
    // Setup
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as any);

    const customConfig = {
      title: '커스텀 보고서',
      author: '테스트 작성자',
      description: '커스텀 설명',
      sections: [
        {
          heading: '커스텀 섹션',
          content: [
            {
              type: 'paragraph' as const,
              text: '커스텀 내용',
            },
          ],
        },
      ],
    };

    // Execute
    const { result } = renderHook(() => useDocxExport());

    await act(async () => {
      await result.current.exportDocument({
        filename: 'custom-report.docx',
        config: customConfig,
      });
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isExporting).toBe(false);
    });

    expect(result.current.error).toBe(null);
    expect(result.current.progress).toBe(100);
  });

  it('데이터 로딩 실패 시 에러를 처리함', async () => {
    // Setup
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as any);
    vi.mocked(fetchEvents).mockRejectedValueOnce(new Error('데이터 조회 실패'));

    // Execute
    const { result } = renderHook(() => useDocxExport());

    await act(async () => {
      await result.current.exportDocument();
    });

    // Assert
    expect(result.current.error).toEqual({
      code: 'EXPORT_FAILED',
      message: 'Word 문서 내보내기에 실패했습니다.',
      details: expect.any(Error),
    });
    expect(result.current.isExporting).toBe(false);
  });

  it('기본 파일명이 올바르게 생성됨', async () => {
    // Setup
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as any);

    let downloadedFilename = '';
    const originalCreateElement = document.createElement.bind(document);
    const mockLink = originalCreateElement('a');
    mockLink.click = vi.fn();
    Object.defineProperty(mockLink, 'download', {
      get: () => downloadedFilename,
      set: (name: string) => { downloadedFilename = name; },
      configurable: true,
    });

    document.createElement = vi.fn((tag) => {
      if (tag === 'a') {
        return mockLink;
      }
      return originalCreateElement(tag);
    });

    // Execute
    const { result } = renderHook(() => useDocxExport());

    await act(async () => {
      await result.current.exportDocument();
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isExporting).toBe(false);
    });

    const today = new Date().toISOString().split('T')[0];
    expect(downloadedFilename).toBe(`central-hub-report-${today}.docx`);
  });
});
