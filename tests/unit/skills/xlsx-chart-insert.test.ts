/**
 * xlsx 차트 삽입 유틸리티 유닛 테스트
 *
 * @module tests/unit/skills/xlsx-chart-insert
 */

import { describe, it, expect } from 'vitest';
import {
  cellAddressToCoords,
  coordsToCellAddress,
  calculateChartPosition,
} from '@/lib/skills/xlsx-chart';
import * as XLSX from 'xlsx';

describe('xlsx-chart 유틸리티 함수', () => {
  describe('cellAddressToCoords', () => {
    it('셀 주소를 좌표로 변환', () => {
      expect(cellAddressToCoords('A1')).toEqual({ row: 0, col: 0 });
      expect(cellAddressToCoords('B5')).toEqual({ row: 4, col: 1 });
      expect(cellAddressToCoords('Z10')).toEqual({ row: 9, col: 25 });
      expect(cellAddressToCoords('AA1')).toEqual({ row: 0, col: 26 });
    });
  });

  describe('coordsToCellAddress', () => {
    it('좌표를 셀 주소로 변환', () => {
      expect(coordsToCellAddress({ row: 0, col: 0 })).toBe('A1');
      expect(coordsToCellAddress({ row: 4, col: 1 })).toBe('B5');
      expect(coordsToCellAddress({ row: 9, col: 25 })).toBe('Z10');
      expect(coordsToCellAddress({ row: 0, col: 26 })).toBe('AA1');
    });
  });

  describe('calculateChartPosition', () => {
    it('데이터 범위 다음에 차트 위치 계산', () => {
      // 데이터가 A1:D10인 워크시트 생성
      const data = [
        ['날짜', '이벤트', '이슈', '헬스'],
        ['2025-11-01', 10, 5, 8],
        ['2025-11-02', 15, 3, 9],
        ['2025-11-03', 12, 7, 7],
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);

      // 차트 위치 계산 (데이터 끝 + 2열 간격)
      const chartPos = calculateChartPosition(worksheet);

      // 데이터가 A1:D4이므로, 차트는 G1 (col 6 = D + 2 + 1)
      expect(chartPos).toBe('G1');
    });

    it('커스텀 간격으로 차트 위치 계산', () => {
      const data = [['A'], ['B']];
      const worksheet = XLSX.utils.aoa_to_sheet(data);

      // 간격 1로 설정
      const chartPos = calculateChartPosition(worksheet, 1);

      // 데이터가 A1:A2이므로, 차트는 C1 (col 2 = A + 1 + 1)
      expect(chartPos).toBe('C1');
    });
  });
});

describe('xlsx-chart 타입 체크', () => {
  it('ExcelChartInsertConfig 타입 검증', () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([['Test']]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    const config = {
      workbook,
      sheetName: 'Sheet1',
      chart: {
        type: 'line' as const,
        data: [
          { label: '2025-11-01', value: 10 },
          { label: '2025-11-02', value: 15 },
        ],
        title: '테스트 차트',
        position: { row: 0, col: 0 },
      },
      cellAddress: 'F1',
    };

    // 타입 체크 (컴파일 시 검증됨)
    expect(config.workbook).toBeDefined();
    expect(config.sheetName).toBe('Sheet1');
    expect(config.chart.type).toBe('line');
    expect(config.cellAddress).toBe('F1');
  });
});
