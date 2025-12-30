/**
 * xlsx 차트 삽입 유틸리티 유닛 테스트
 *
 * ExcelJS 기반 구현 테스트 (레거시 호환 모드)
 * - insertChartImage는 __pendingImages에 이미지 정보 저장
 * - getChartCount는 __pendingImages 배열 길이 반환
 *
 * @module tests/unit/skills/xlsx-chart-insert
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  insertChartImage,
  insertMultipleCharts,
  canInsertChart,
  getChartCount,
} from '@/lib/skills/xlsx/chartInsert';
import type { ChartInsertOptions } from '@/types/xlsx-chart.types';

// 테스트용 워크시트 타입 (레거시 호환)
type TestWorksheet = Record<string, unknown> & {
  __pendingImages?: Array<{
    base64: string;
    position: { row: number; col: number };
    size: { width: number; height: number };
    alt: string;
  }>;
};

describe('xlsx 차트 삽입 유틸리티', () => {
  let worksheet: TestWorksheet;
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  beforeEach(() => {
    // 테스트용 빈 워크시트 생성 (레거시 호환)
    worksheet = {};
  });

  describe('insertChartImage', () => {
    it('워크시트에 차트 이미지를 삽입해야 함', () => {
      const options: ChartInsertOptions = {
        position: { cell: 'D2' },
        alt: 'Test Chart',
      };

      const result = insertChartImage(worksheet as never, testImageBase64, options) as TestWorksheet;

      expect(result).toBeDefined();
      expect(result.__pendingImages).toBeDefined();
      expect(result.__pendingImages?.length).toBe(1);
    });

    it('차트 삽입 시 alt 텍스트가 저장되어야 함', () => {
      const options: ChartInsertOptions = {
        position: { cell: 'E5' },
        alt: 'Sales Chart',
      };

      const result = insertChartImage(worksheet as never, testImageBase64, options) as TestWorksheet;

      expect(result.__pendingImages?.[0].alt).toBe('Sales Chart');
    });

    it('커스텀 크기로 차트를 삽입해야 함', () => {
      const options: ChartInsertOptions = {
        position: { cell: 'F2' },
        size: { width: 800, height: 600 },
        alt: 'Custom Size Chart',
      };

      const result = insertChartImage(worksheet as never, testImageBase64, options) as TestWorksheet;

      expect(result.__pendingImages?.[0]).toBeDefined();
      expect(result.__pendingImages?.[0].size.width).toBe(800);
      expect(result.__pendingImages?.[0].size.height).toBe(600);
    });

    it('행/열 오프셋이 적용되어야 함', () => {
      const options: ChartInsertOptions = {
        position: { cell: 'A1', rowOffset: 2, colOffset: 3 },
        alt: 'Offset Chart',
      };

      const result = insertChartImage(worksheet as never, testImageBase64, options) as TestWorksheet;

      // A1 + 3열 + 2행 = D3 (row: 2, col: 3)
      expect(result.__pendingImages?.[0].position.row).toBe(2);
      expect(result.__pendingImages?.[0].position.col).toBe(3);
    });

    it('잘못된 셀 주소로 에러가 발생해야 함', () => {
      const options: ChartInsertOptions = {
        position: { cell: 'INVALID' },
        alt: 'Invalid Chart',
      };

      expect(() => {
        insertChartImage(worksheet as never, testImageBase64, options);
      }).toThrow();
    });
  });

  describe('insertMultipleCharts', () => {
    it('여러 차트를 동시에 삽입해야 함', () => {
      const charts = [
        {
          imageBase64: testImageBase64,
          options: { position: { cell: 'D2' }, alt: 'Chart 1' } as ChartInsertOptions,
        },
        {
          imageBase64: testImageBase64,
          options: { position: { cell: 'D10' }, alt: 'Chart 2' } as ChartInsertOptions,
        },
        {
          imageBase64: testImageBase64,
          options: { position: { cell: 'D18' }, alt: 'Chart 3' } as ChartInsertOptions,
        },
      ];

      const result = insertMultipleCharts(worksheet as never, charts) as TestWorksheet;

      expect(result.__pendingImages).toBeDefined();
      expect(result.__pendingImages?.length).toBe(3);
    });

    it('빈 배열로 호출 시 변경 없이 반환되어야 함', () => {
      const result = insertMultipleCharts(worksheet as never, []) as TestWorksheet;

      expect(result).toBe(worksheet);
      expect(result.__pendingImages).toBeUndefined();
    });
  });

  describe('canInsertChart', () => {
    it('유효한 위치는 삽입 가능해야 함', () => {
      expect(canInsertChart(worksheet as never, { cell: 'A1' })).toBe(true);
      expect(canInsertChart(worksheet as never, { cell: 'Z100' })).toBe(true);
      expect(canInsertChart(worksheet as never, { cell: 'AA1' })).toBe(true);
    });

    it('잘못된 위치는 삽입 불가능해야 함', () => {
      expect(canInsertChart(worksheet as never, { cell: 'INVALID' })).toBe(false);
      expect(canInsertChart(worksheet as never, { cell: '123' })).toBe(false);
      expect(canInsertChart(worksheet as never, { cell: '' })).toBe(false);
    });

    it('음수 오프셋은 삽입 불가능해야 함', () => {
      expect(canInsertChart(worksheet as never, { cell: 'A1', rowOffset: -1 })).toBe(false);
      expect(canInsertChart(worksheet as never, { cell: 'A1', colOffset: -1 })).toBe(false);
    });
  });

  describe('getChartCount', () => {
    it('차트 개수를 정확히 반환해야 함', () => {
      expect(getChartCount(worksheet as never)).toBe(0);

      const options: ChartInsertOptions = {
        position: { cell: 'D2' },
        alt: 'Chart 1',
      };
      let ws = insertChartImage(worksheet as never, testImageBase64, options);
      expect(getChartCount(ws)).toBe(1);

      const options2: ChartInsertOptions = {
        position: { cell: 'D10' },
        alt: 'Chart 2',
      };
      ws = insertChartImage(ws, testImageBase64, options2);
      expect(getChartCount(ws)).toBe(2);
    });

    it('차트가 없으면 0을 반환해야 함', () => {
      expect(getChartCount(worksheet as never)).toBe(0);
    });
  });

  describe('셀 주소 변환', () => {
    it('A1 표기법을 행/열 인덱스로 변환해야 함', () => {
      const options: ChartInsertOptions = {
        position: { cell: 'A1' },
        alt: 'A1 Chart',
      };
      const result = insertChartImage(worksheet as never, testImageBase64, options) as TestWorksheet;
      // A1 = row: 0, col: 0
      expect(result.__pendingImages?.[0].position.row).toBe(0);
      expect(result.__pendingImages?.[0].position.col).toBe(0);
    });

    it('다중 문자 열 주소를 처리해야 함', () => {
      const options: ChartInsertOptions = {
        position: { cell: 'AA10' },
        alt: 'AA10 Chart',
      };
      const result = insertChartImage(worksheet as never, testImageBase64, options) as TestWorksheet;
      // AA = 26, 10 = row 9
      expect(result.__pendingImages?.[0].position.col).toBe(26);
      expect(result.__pendingImages?.[0].position.row).toBe(9);
    });

    it('큰 행 번호를 처리해야 함', () => {
      const options: ChartInsertOptions = {
        position: { cell: 'Z999' },
        alt: 'Z999 Chart',
      };
      const result = insertChartImage(worksheet as never, testImageBase64, options) as TestWorksheet;
      // Z = 25, 999 = row 998
      expect(result.__pendingImages?.[0].position.col).toBe(25);
      expect(result.__pendingImages?.[0].position.row).toBe(998);
    });
  });

  describe('Base64 이미지 처리', () => {
    it('유효한 Base64 문자열을 처리해야 함', () => {
      const options: ChartInsertOptions = {
        position: { cell: 'D2' },
        alt: 'Valid Base64 Chart',
      };

      expect(() => {
        insertChartImage(worksheet as never, testImageBase64, options);
      }).not.toThrow();
    });

    it('빈 Base64 문자열도 처리해야 함', () => {
      const options: ChartInsertOptions = {
        position: { cell: 'D2' },
        alt: 'Empty Base64 Chart',
      };

      // 빈 문자열도 유효한 Base64로 간주됨
      expect(() => {
        insertChartImage(worksheet as never, '', options);
      }).not.toThrow();
    });
  });
});
