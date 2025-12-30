import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useXlsxExport } from '@/hooks/useXlsxExport';

// DOM API Mock - beforeEach/afterEach로 관리
const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
const mockRevokeObjectURL = vi.fn();
const mockClick = vi.fn();
let originalCreateObjectURL: typeof URL.createObjectURL;
let originalRevokeObjectURL: typeof URL.revokeObjectURL;

// ExcelJS Mock 설정 - vi.hoisted 사용으로 호이스팅 문제 해결
const { mockWriteBuffer, MockWorkbook } = vi.hoisted(() => {
  const mockWriteBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
  const mockAddImage = vi.fn().mockReturnValue(1);

  // Mock Workbook 클래스 - addWorksheet를 메서드로 정의
  class MockWorkbook {
    creator = '';
    created: Date | null = null;

    addWorksheet() {
      return {
        columns: [] as unknown[],
        addRow: vi.fn(),
        addImage: vi.fn(),
        getCell: vi.fn().mockReturnValue({ value: null }),
      };
    }

    addImage = mockAddImage;
    xlsx = {
      writeBuffer: mockWriteBuffer,
    };
  }

  return { mockWriteBuffer, MockWorkbook };
});

vi.mock('exceljs', () => ({
  default: {
    Workbook: MockWorkbook,
  },
}));

// 차트 생성 Mock - vi.hoisted 사용
const { mockGenerateBarChartImage, mockGenerateLineChartImage, mockGeneratePieChartImage } = vi.hoisted(() => ({
  mockGenerateBarChartImage: vi.fn().mockResolvedValue({ imageBase64: 'base64string' }),
  mockGenerateLineChartImage: vi.fn().mockResolvedValue({ imageBase64: 'base64string' }),
  mockGeneratePieChartImage: vi.fn().mockResolvedValue({ imageBase64: 'base64string' }),
}));

vi.mock('@/lib/skills/xlsx/chartGenerate', () => ({
  generateBarChartImage: mockGenerateBarChartImage,
  generateLineChartImage: mockGenerateLineChartImage,
  generatePieChartImage: mockGeneratePieChartImage,
}));

vi.mock('@/lib/skills/xlsx/chartInsert', () => ({
  insertChartImage: vi.fn(),
}));

describe('useXlsxExport', () => {
  let mockAnchorElement: Partial<HTMLAnchorElement>;

  beforeEach(() => {
    vi.clearAllMocks();

    // 차트 생성 Mock 재설정
    mockGenerateBarChartImage.mockResolvedValue({ imageBase64: 'base64string' });
    mockGenerateLineChartImage.mockResolvedValue({ imageBase64: 'base64string' });
    mockGeneratePieChartImage.mockResolvedValue({ imageBase64: 'base64string' });

    // writeBuffer Mock 재설정
    mockWriteBuffer.mockResolvedValue(new ArrayBuffer(8));

    // DOM API Mock 설정
    originalCreateObjectURL = globalThis.URL.createObjectURL;
    originalRevokeObjectURL = globalThis.URL.revokeObjectURL;
    globalThis.URL.createObjectURL = mockCreateObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock anchor element
    mockAnchorElement = {
      href: '',
      download: '',
      click: mockClick,
      style: {} as CSSStyleDeclaration,
    };

    // createElement spy - 'a' 태그만 가로채기
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return mockAnchorElement as HTMLAnchorElement;
      }
      // 다른 태그는 원래 구현 사용
      return document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as HTMLElement;
    });

    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
  });

  afterEach(() => {
    // DOM API 복원
    globalThis.URL.createObjectURL = originalCreateObjectURL;
    globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  describe('초기 상태', () => {
    it('초기 상태가 올바르게 설정되어야 함', () => {
      const { result } = renderHook(() => useXlsxExport());

      expect(result.current.isExporting).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBeNull();
    });

    it('export 함수들이 정의되어야 함', () => {
      const { result } = renderHook(() => useXlsxExport());

      expect(result.current.exportToExcel).toBeDefined();
      expect(result.current.exportWithChart).toBeDefined();
      expect(result.current.exportMultipleCharts).toBeDefined();
    });
  });

  describe('기본 Excel 내보내기', () => {
    it('단일 시트를 내보내야 함', async () => {
      const { result } = renderHook(() => useXlsxExport());

      const data = [
        { name: '홍길동', age: 30 },
        { name: '김철수', age: 25 },
      ];

      await result.current.exportToExcel({
        filename: 'test.xlsx',
        sheets: [{ name: 'Sheet1', data }],
      });

      await waitFor(() => {
        expect(result.current.isExporting).toBe(false);
        expect(result.current.progress).toBe(100);
      });
    });

    it('여러 시트를 내보내야 함', async () => {
      const { result } = renderHook(() => useXlsxExport());

      await result.current.exportToExcel({
        filename: 'multi-sheet.xlsx',
        sheets: [
          {
            name: 'Users',
            data: [
              { id: 1, name: '사용자1' },
              { id: 2, name: '사용자2' },
            ],
          },
          {
            name: 'Products',
            data: [
              { id: 1, name: '제품1', price: 1000 },
              { id: 2, name: '제품2', price: 2000 },
            ],
          },
        ],
      });

      await waitFor(() => {
        expect(result.current.isExporting).toBe(false);
      });
    });

    it('컬럼 설정을 적용해야 함', async () => {
      const { result } = renderHook(() => useXlsxExport());

      await result.current.exportToExcel({
        filename: 'with-columns.xlsx',
        sheets: [
          {
            name: 'Data',
            data: [{ col1: 'A', col2: 'B' }],
            columns: [
              { header: '컬럼 1', width: 15 },
              { header: '컬럼 2', width: 20 },
            ],
          },
        ],
      });

      await waitFor(() => {
        expect(result.current.isExporting).toBe(false);
      });
    });
  });

  describe('차트 포함 내보내기', () => {
    it('바 차트를 포함해서 내보내야 함', async () => {
      const { result } = renderHook(() => useXlsxExport());

      const data = [
        { category: 'A', value: 100 },
        { category: 'B', value: 200 },
      ];

      await result.current.exportWithChart(data, {
        type: 'bar',
        data: {
          labels: ['A', 'B'],
          datasets: [{ label: 'Sales', data: [100, 200] }],
        },
        options: { title: 'Sales Chart' },
        position: 'D2',
      });

      await waitFor(() => {
        expect(result.current.isExporting).toBe(false);
      });
    });

    it('라인 차트를 포함해서 내보내야 함', async () => {
      const { result } = renderHook(() => useXlsxExport());

      const data = [
        { date: '2025-11-01', value: 10 },
        { date: '2025-11-02', value: 15 },
      ];

      await result.current.exportWithChart(data, {
        type: 'line',
        data: {
          labels: ['2025-11-01', '2025-11-02'],
          datasets: [{ label: 'Daily', data: [10, 15] }],
        },
        options: { title: 'Trend' },
        position: 'D5',
      });

      await waitFor(() => {
        expect(result.current.isExporting).toBe(false);
      });
    });

    it('파이 차트를 포함해서 내보내야 함', async () => {
      const { result } = renderHook(() => useXlsxExport());

      const data = [
        { category: 'A', value: 30 },
        { category: 'B', value: 70 },
      ];

      await result.current.exportWithChart(data, {
        type: 'pie',
        data: {
          labels: ['A', 'B'],
          datasets: [{ label: 'Distribution', data: [30, 70] }],
        },
        options: { title: 'Distribution' },
        position: 'F2',
      });

      await waitFor(() => {
        expect(result.current.isExporting).toBe(false);
      });
    });
  });

  describe('여러 차트 내보내기', () => {
    it('여러 차트를 포함해서 내보내야 함', async () => {
      const { result } = renderHook(() => useXlsxExport());

      const sheets = [
        {
          name: 'Dashboard',
          data: [
            { metric: 'Users', value: 1000 },
            { metric: 'Revenue', value: 50000 },
          ],
        },
      ];

      const charts = [
        {
          type: 'bar' as const,
          data: {
            labels: ['Users', 'Revenue'],
            datasets: [{ label: 'Metrics', data: [1000, 50000] }],
          },
          options: { title: 'Metrics' },
          position: 'D2',
          alt: 'Dashboard metrics',
        },
        {
          type: 'line' as const,
          data: {
            labels: ['Day 1', 'Day 2'],
            datasets: [{ label: 'Trend', data: [100, 150] }],
          },
          options: { title: 'Trend' },
          position: 'D10',
          alt: 'Dashboard trend',
        },
      ];

      await result.current.exportMultipleCharts(sheets, charts);

      await waitFor(() => {
        expect(result.current.isExporting).toBe(false);
      });
    });
  });

  describe('진행 상태', () => {
    it('내보내기 중 진행률이 업데이트되어야 함', async () => {
      const { result } = renderHook(() => useXlsxExport());

      const promise = result.current.exportToExcel({
        sheets: [{ name: 'Test', data: [{ a: 1 }] }],
      });

      await waitFor(() => {
        expect(result.current.progress).toBeGreaterThan(0);
      });

      await promise;
    });

    it('완료 시 진행률이 100%가 되어야 함', async () => {
      const { result } = renderHook(() => useXlsxExport());

      await result.current.exportToExcel({
        sheets: [{ name: 'Test', data: [{ a: 1 }] }],
      });

      await waitFor(() => {
        expect(result.current.progress).toBe(100);
      });
    });
  });

  describe('에러 처리', () => {
    it('내보내기 실패 시 에러를 처리해야 함', async () => {
      // ExcelJS writeBuffer 에러 발생 모킹
      mockWriteBuffer.mockRejectedValueOnce(new Error('Write failed'));

      const { result } = renderHook(() => useXlsxExport());

      await expect(
        result.current.exportToExcel({
          sheets: [{ name: 'Test', data: [{ a: 1 }] }],
        })
      ).rejects.toThrow();
    });

    it('차트 생성 실패 시 에러를 처리해야 함', async () => {
      const { generateBarChartImage } = await import('@/lib/skills/xlsx/chartGenerate');
      vi.mocked(generateBarChartImage).mockRejectedValueOnce(new Error('Chart generation failed'));

      const { result } = renderHook(() => useXlsxExport());

      await expect(
        result.current.exportWithChart(
          [{ a: 1 }],
          {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: {},
            position: 'A1',
          }
        )
      ).rejects.toThrow();
    });
  });
});
