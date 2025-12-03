/**
 * xlsx 차트 삽입 유틸리티 유닛 테스트
 *
 * @module tests/unit/skills/xlsx-chart-insert
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import {
  insertChartImage,
  insertMultipleCharts,
  canInsertChart,
  removeAllCharts,
  getChartCount,
} from '@/lib/skills/xlsx/chartInsert';
import type { ChartInsertOptions } from '@/types/xlsx-chart.types';

describe('xlsx 차트 삽입 유틸리티', () => {
  let worksheet: XLSX.WorkSheet;
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  beforeEach(() => {
    // 테스트용 워크시트 생성
    worksheet = XLSX.utils.aoa_to_sheet([
      ['Header 1', 'Header 2', 'Header 3'],
      ['Data 1', 100, 200],
      ['Data 2', 150, 250],
      ['Data 3', 200, 300],
    ]);
  });

  describe('insertChartImage', () => {
    it('워크시트에 차트 이미지를 삽입해야 함', () => {
      const options: ChartInsertOptions = {
        position: { cell: 'D2' },
        alt: 'Test Chart',
      };

      const result = insertChartImage(worksheet, testImageBase64, options);

      expect(result).toBeDefined();
      expect(result['!images']).toBeDefined();
      expect(result['!images']?.length).toBe(1);
    });

    it('차트 삽입 시 플레이스홀더 텍스트가 추가되어야 함', () => {
      const options: ChartInsertOptions = {
        position: { cell: 'E5' },
        alt: 'Sales Chart',
      };

      const result = insertChartImage(worksheet, testImageBase64, options);

      expect(result['E5']).toBeDefined();
      expect(result['E5'].v).toBe('Sales Chart');
    });

    it('커스텀 크기로 차트를 삽입해야 함', () => {
      const options: ChartInsertOptions = {
        position: { cell: 'F2' },
        size: { width: 800, height: 600 },
        alt: 'Custom Size Chart',
      };

      const result = insertChartImage(worksheet, testImageBase64, options);

      expect(result['!images']?.[0]).toBeDefined();
      expect(result['!images']?.[0].name).toBe('Custom Size Chart');
    });

    it('행/열 오프셋이 적용되어야 함', () => {
      const options: ChartInsertOptions = {
        position: { cell: 'A1', rowOffset: 2, colOffset: 3 },
        alt: 'Offset Chart',
      };

      const result = insertChartImage(worksheet, testImageBase64, options);

      // D3 위치에 삽입되어야 함 (A1 + 3열 + 2행)
      expect(result['D3']).toBeDefined();
    });

    it('잘못된 셀 주소로 에러가 발생해야 함', () => {
      const options: ChartInsertOptions = {
        position: { cell: 'INVALID' },
        alt: 'Invalid Chart',
      };

      expect(() => {
        insertChartImage(worksheet, testImageBase64, options);
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

      const result = insertMultipleCharts(worksheet, charts);

      expect(result['!images']).toBeDefined();
      expect(result['!images']?.length).toBe(3);
    });

    it('빈 배열로 호출 시 변경 없이 반환되어야 함', () => {
      const result = insertMultipleCharts(worksheet, []);

      expect(result).toBe(worksheet);
      expect(result['!images']).toBeUndefined();
    });
  });

  describe('canInsertChart', () => {
    it('유효한 위치는 삽입 가능해야 함', () => {
      expect(canInsertChart(worksheet, { cell: 'A1' })).toBe(true);
      expect(canInsertChart(worksheet, { cell: 'Z100' })).toBe(true);
      expect(canInsertChart(worksheet, { cell: 'AA1' })).toBe(true);
    });

    it('잘못된 위치는 삽입 불가능해야 함', () => {
      expect(canInsertChart(worksheet, { cell: 'INVALID' })).toBe(false);
      expect(canInsertChart(worksheet, { cell: '123' })).toBe(false);
      expect(canInsertChart(worksheet, { cell: '' })).toBe(false);
    });

    it('음수 오프셋은 삽입 불가능해야 함', () => {
      expect(canInsertChart(worksheet, { cell: 'A1', rowOffset: -1 })).toBe(false);
      expect(canInsertChart(worksheet, { cell: 'A1', colOffset: -1 })).toBe(false);
    });
  });

  describe('removeAllCharts', () => {
    it('모든 차트를 제거해야 함', () => {
      // 먼저 차트 삽입
      const options: ChartInsertOptions = {
        position: { cell: 'D2' },
        alt: 'Test Chart',
      };
      let ws = insertChartImage(worksheet, testImageBase64, options);
      expect(ws['!images']).toBeDefined();

      // 차트 제거
      ws = removeAllCharts(ws);
      expect(ws['!images']).toBeUndefined();
    });

    it('차트가 없는 워크시트에서도 에러 없이 동작해야 함', () => {
      const result = removeAllCharts(worksheet);
      expect(result).toBeDefined();
      expect(result['!images']).toBeUndefined();
    });
  });

  describe('getChartCount', () => {
    it('차트 개수를 정확히 반환해야 함', () => {
      expect(getChartCount(worksheet)).toBe(0);

      const options: ChartInsertOptions = {
        position: { cell: 'D2' },
        alt: 'Chart 1',
      };
      let ws = insertChartImage(worksheet, testImageBase64, options);
      expect(getChartCount(ws)).toBe(1);

      const options2: ChartInsertOptions = {
        position: { cell: 'D10' },
        alt: 'Chart 2',
      };
      ws = insertChartImage(ws, testImageBase64, options2);
      expect(getChartCount(ws)).toBe(2);
    });

    it('차트가 없으면 0을 반환해야 함', () => {
      expect(getChartCount(worksheet)).toBe(0);
    });
  });

  describe('셀 주소 변환', () => {
    it('A1 표기법을 행/열 인덱스로 변환해야 함', () => {
      // 내부 함수이므로 간접 테스트
      const options: ChartInsertOptions = {
        position: { cell: 'A1' },
        alt: 'A1 Chart',
      };
      const result = insertChartImage(worksheet, testImageBase64, options);
      expect(result['A1']).toBeDefined();
    });

    it('다중 문자 열 주소를 처리해야 함', () => {
      const options: ChartInsertOptions = {
        position: { cell: 'AA10' },
        alt: 'AA10 Chart',
      };
      const result = insertChartImage(worksheet, testImageBase64, options);
      expect(result['AA10']).toBeDefined();
    });

    it('큰 행 번호를 처리해야 함', () => {
      const options: ChartInsertOptions = {
        position: { cell: 'Z999' },
        alt: 'Z999 Chart',
      };
      const result = insertChartImage(worksheet, testImageBase64, options);
      expect(result['Z999']).toBeDefined();
    });
  });

  describe('Base64 이미지 처리', () => {
    it('유효한 Base64 문자열을 처리해야 함', () => {
      const options: ChartInsertOptions = {
        position: { cell: 'D2' },
        alt: 'Valid Base64 Chart',
      };

      expect(() => {
        insertChartImage(worksheet, testImageBase64, options);
      }).not.toThrow();
    });

    it('빈 Base64 문자열도 처리해야 함', () => {
      const options: ChartInsertOptions = {
        position: { cell: 'D2' },
        alt: 'Empty Base64 Chart',
      };

      // 빈 문자열도 유효한 Base64로 간주됨
      expect(() => {
        insertChartImage(worksheet, '', options);
      }).not.toThrow();
    });
  });
});
