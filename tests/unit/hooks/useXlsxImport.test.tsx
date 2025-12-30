import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useXlsxImport } from '@/hooks/useXlsxImport';
import type { ParsedExcelData, ImportResult } from '@/types/xlsx-import.types';

// Mock dependencies
vi.mock('@/lib/skills/xlsx/import', () => ({
  parseExcelFile: vi.fn().mockResolvedValue({
    sheetName: 'Sheet1',
    headers: ['이름', '나이', '이메일'],
    rows: [
      { '이름': '홍길동', '나이': 30, '이메일': 'hong@example.com' },
      { '이름': '김철수', '나이': 25, '이메일': 'kim@example.com' },
    ],
    metadata: {
      filename: 'test.xlsx',
      totalRows: 2,
      totalColumns: 3,
    },
  } as ParsedExcelData),
  validateData: vi.fn().mockReturnValue({
    isValid: true,
    errors: [],
    warnings: [],
    validRowCount: 2,
    invalidRowCount: 0,
  }),
  mapColumns: vi.fn().mockReturnValue([]),
  importExcelToDatabase: vi.fn().mockResolvedValue({
    success: true,
    totalRows: 2,
    successCount: 2,
    errorCount: 0,
    errors: [],
    duration: 100,
  } as ImportResult),
}));

describe('useXlsxImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('초기 상태', () => {
    it('초기 상태가 올바르게 설정되어야 함', () => {
      const { result } = renderHook(() => useXlsxImport());

      expect(result.current.parsedData).toBeNull();
      expect(result.current.previewData).toBeNull();
      expect(result.current.columnMapping).toEqual([]);
      expect(result.current.validationResult).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.progress.stage).toBe('idle');
    });

    it('Hook 함수들이 정의되어야 함', () => {
      const { result } = renderHook(() => useXlsxImport());

      expect(result.current.uploadFile).toBeDefined();
      expect(result.current.setColumnMapping).toBeDefined();
      expect(result.current.validate).toBeDefined();
      expect(result.current.executeImport).toBeDefined();
      expect(result.current.reset).toBeDefined();
    });
  });

  describe('파일 업로드', () => {
    it('파일을 업로드하고 파싱해야 함', async () => {
      const { result } = renderHook(() => useXlsxImport());

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await result.current.uploadFile(file);

      await waitFor(() => {
        expect(result.current.parsedData).not.toBeNull();
        expect(result.current.previewData).not.toBeNull();
      });
    });

    it('파싱 후 자동 컬럼 매핑이 생성되어야 함', async () => {
      const { result } = renderHook(() => useXlsxImport());

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await result.current.uploadFile(file);

      await waitFor(() => {
        expect(result.current.columnMapping.length).toBeGreaterThan(0);
      });
    });

    it('미리보기 데이터가 생성되어야 함', async () => {
      const { result } = renderHook(() => useXlsxImport());

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await result.current.uploadFile(file);

      await waitFor(() => {
        expect(result.current.previewData).not.toBeNull();
        expect(result.current.previewData?.columns).toBeDefined();
        expect(result.current.previewData?.sampleRows).toBeDefined();
      });
    });
  });

  describe('컬럼 매핑', () => {
    it('컬럼 매핑을 설정할 수 있어야 함', async () => {
      const { result } = renderHook(() => useXlsxImport());

      const mapping = [
        { excelColumn: '이름', dbField: 'name', type: 'string' as const, required: true },
        { excelColumn: '나이', dbField: 'age', type: 'number' as const, required: false },
      ];

      act(() => {
        result.current.setColumnMapping(mapping);
      });

      await waitFor(() => {
        expect(result.current.columnMapping).toEqual(mapping);
      });
    });

    it('필수 필드를 표시할 수 있어야 함', async () => {
      const { result } = renderHook(() => useXlsxImport());

      const mapping = [
        { excelColumn: '이메일', dbField: 'email', type: 'string' as const, required: true },
      ];

      act(() => {
        result.current.setColumnMapping(mapping);
      });

      await waitFor(() => {
        expect(result.current.columnMapping[0]?.required).toBe(true);
      });
    });
  });

  describe('데이터 검증', () => {
    it('데이터를 검증할 수 있어야 함', async () => {
      const { result } = renderHook(() => useXlsxImport());

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await result.current.uploadFile(file);

      await waitFor(() => {
        expect(result.current.parsedData).not.toBeNull();
      });

      const validationResult = result.current.validate();

      expect(validationResult).not.toBeNull();
      expect(validationResult?.isValid).toBeDefined();
    });

    it('검증 결과가 저장되어야 함', async () => {
      const { result } = renderHook(() => useXlsxImport());

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await result.current.uploadFile(file);

      await waitFor(() => {
        expect(result.current.parsedData).not.toBeNull();
      });

      result.current.validate();

      expect(result.current.validationResult).not.toBeNull();
    });
  });

  describe('가져오기 실행', () => {
    it('데이터를 데이터베이스로 가져와야 함', async () => {
      const { result } = renderHook(() => useXlsxImport());

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await result.current.uploadFile(file);

      await waitFor(() => {
        expect(result.current.parsedData).not.toBeNull();
      });

      result.current.setColumnMapping([
        { excelColumn: '이름', dbField: 'name', type: 'string', required: true },
      ]);

      const importResult = await result.current.executeImport('users');

      expect(importResult.success).toBe(true);
      expect(importResult.successCount).toBeGreaterThan(0);
    });

    it('배치 크기를 설정할 수 있어야 함', async () => {
      const { result } = renderHook(() =>
        useXlsxImport({
          defaultBatchSize: 50,
        })
      );

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await result.current.uploadFile(file);

      await waitFor(() => {
        expect(result.current.parsedData).not.toBeNull();
      });

      result.current.setColumnMapping([
        { excelColumn: '이름', dbField: 'name', type: 'string', required: true },
      ]);

      const importResult = await result.current.executeImport('users', {
        batchSize: 50,
      });

      expect(importResult).toBeDefined();
    });
  });

  describe('진행 상태', () => {
    it('파싱 중 진행 상태가 업데이트되어야 함', async () => {
      const { result } = renderHook(() => useXlsxImport());

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const promise = result.current.uploadFile(file);

      await waitFor(() => {
        expect(result.current.progress.stage).toBe('parsing');
      });

      await promise;
    });

    it('가져오기 완료 콜백이 호출되어야 함', async () => {
      const onComplete = vi.fn();

      const { result } = renderHook(() =>
        useXlsxImport({
          onComplete,
        })
      );

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await result.current.uploadFile(file);

      await waitFor(() => {
        expect(result.current.parsedData).not.toBeNull();
      });

      result.current.setColumnMapping([
        { excelColumn: '이름', dbField: 'name', type: 'string', required: true },
      ]);

      await result.current.executeImport('users');

      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('에러 처리', () => {
    it('파일이 없으면 가져오기 실패해야 함', async () => {
      const { result } = renderHook(() => useXlsxImport());

      await expect(result.current.executeImport('users')).rejects.toThrow(
        '파일을 먼저 업로드해주세요'
      );
    });

    it('컬럼 매핑이 없으면 가져오기 실패해야 함', async () => {
      const { result } = renderHook(() => useXlsxImport());

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await result.current.uploadFile(file);

      await waitFor(() => {
        expect(result.current.parsedData).not.toBeNull();
      });

      result.current.setColumnMapping([]);

      await expect(result.current.executeImport('users')).rejects.toThrow(
        '컬럼 매핑을 설정해주세요'
      );
    });

    it('파싱 에러를 처리해야 함', async () => {
      const { parseExcelFile } = await import('@/lib/skills/xlsx/import');
      vi.mocked(parseExcelFile).mockRejectedValueOnce(new Error('파싱 실패'));

      const onError = vi.fn();

      const { result } = renderHook(() =>
        useXlsxImport({
          onError,
        })
      );

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await result.current.uploadFile(file);

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe('상태 초기화', () => {
    it('reset이 모든 상태를 초기화해야 함', async () => {
      const { result } = renderHook(() => useXlsxImport());

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await result.current.uploadFile(file);

      await waitFor(() => {
        expect(result.current.parsedData).not.toBeNull();
      });

      result.current.reset();

      expect(result.current.parsedData).toBeNull();
      expect(result.current.previewData).toBeNull();
      expect(result.current.columnMapping).toEqual([]);
      expect(result.current.validationResult).toBeNull();
      expect(result.current.progress.stage).toBe('idle');
    });
  });
});
