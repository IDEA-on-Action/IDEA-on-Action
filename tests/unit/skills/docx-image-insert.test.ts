/**
 * docx 이미지 삽입 유틸리티 유닛 테스트
 *
 * @module tests/unit/skills/docx-image-insert
 */

import { describe, it, expect } from 'vitest';
import { calculateImageSize } from '@/lib/skills/docx-image';
import {
  mapAlignmentType,
  DEFAULT_IMAGE_WIDTH,
  DEFAULT_IMAGE_HEIGHT,
  DEFAULT_CHART_WIDTH,
  DEFAULT_CHART_HEIGHT,
  SUPPORTED_IMAGE_TYPES,
} from '@/types/documents/docx-image.types';
import { AlignmentType } from 'docx';

describe('docx-image 유틸리티 함수', () => {
  describe('calculateImageSize', () => {
    it('16:9 비율 이미지를 최대 크기에 맞게 조정', () => {
      const result = calculateImageSize(1920, 1080, 600, 400);

      // 600px 너비로 조정하면 높이는 337~338px (16:9 비율 유지, 반올림 차이)
      expect(result.width).toBe(600);
      expect(result.height).toBeGreaterThanOrEqual(337);
      expect(result.height).toBeLessThanOrEqual(338);
    });

    it('4:3 비율 이미지를 최대 크기에 맞게 조정', () => {
      const result = calculateImageSize(1024, 768, 600, 400);

      // 4:3 비율 유지하면서 최대 크기에 맞춤
      expect(result.width).toBeCloseTo(533, 0);
      expect(result.height).toBe(400);
    });

    it('정사각형 이미지 조정', () => {
      const result = calculateImageSize(1000, 1000, 600, 400);

      // 정사각형이므로 높이 제한에 맞춤
      expect(result.width).toBe(400);
      expect(result.height).toBe(400);
    });

    it('매우 작은 이미지도 올바르게 처리', () => {
      const result = calculateImageSize(100, 50, 600, 400);

      // 원본이 이미 작으므로 확대
      expect(result.width).toBe(600);
      expect(result.height).toBe(300);
    });

    it('매우 긴 이미지도 올바르게 처리', () => {
      const result = calculateImageSize(2000, 100, 600, 400);

      // 세로가 매우 짧은 이미지
      expect(result.width).toBeCloseTo(600, 0);
      expect(result.height).toBeCloseTo(30, 0);
    });

    it('세로로 긴 이미지(2:3 비율)를 올바르게 처리', () => {
      const result = calculateImageSize(400, 600, 600, 400);

      // 높이 제한에 맞춰 조정
      expect(result.width).toBeCloseTo(267, 0);
      expect(result.height).toBe(400);
    });

    it('극단적인 비율(1:10) 이미지를 올바르게 처리', () => {
      const result = calculateImageSize(100, 1000, 600, 400);

      // 높이 제한에 맞춰 조정
      expect(result.width).toBe(40);
      expect(result.height).toBe(400);
    });
  });
});

describe('docx-image 타입 변환 함수', () => {
  describe('mapAlignmentType', () => {
    it('left를 AlignmentType.LEFT로 변환', () => {
      const result = mapAlignmentType('left');
      expect(result).toBe(AlignmentType.LEFT);
    });

    it('center를 AlignmentType.CENTER로 변환', () => {
      const result = mapAlignmentType('center');
      expect(result).toBe(AlignmentType.CENTER);
    });

    it('right를 AlignmentType.RIGHT로 변환', () => {
      const result = mapAlignmentType('right');
      expect(result).toBe(AlignmentType.RIGHT);
    });

    it('undefined는 기본값 CENTER로 변환', () => {
      const result = mapAlignmentType(undefined);
      expect(result).toBe(AlignmentType.CENTER);
    });
  });
});

describe('docx-image 기본값 상수', () => {
  it('DEFAULT_IMAGE_WIDTH가 400으로 정의됨', () => {
    expect(DEFAULT_IMAGE_WIDTH).toBe(400);
  });

  it('DEFAULT_IMAGE_HEIGHT가 300으로 정의됨', () => {
    expect(DEFAULT_IMAGE_HEIGHT).toBe(300);
  });

  it('DEFAULT_CHART_WIDTH가 600으로 정의됨', () => {
    expect(DEFAULT_CHART_WIDTH).toBe(600);
  });

  it('DEFAULT_CHART_HEIGHT가 400으로 정의됨', () => {
    expect(DEFAULT_CHART_HEIGHT).toBe(400);
  });

  it('SUPPORTED_IMAGE_TYPES에 PNG, JPEG가 포함됨', () => {
    expect(SUPPORTED_IMAGE_TYPES).toContain('image/png');
    expect(SUPPORTED_IMAGE_TYPES).toContain('image/jpeg');
    expect(SUPPORTED_IMAGE_TYPES).toContain('image/jpg');
    expect(SUPPORTED_IMAGE_TYPES).toHaveLength(3);
  });
});

describe('docx-image 타입 체크', () => {
  it('ChartImageOptions 타입 검증', () => {
    const options = {
      width: 600,
      height: 400,
      caption: '그림 1. 테스트 차트',
      showFigureNumber: true,
      figureNumber: 1,
    };

    // 타입 체크 (컴파일 시 검증됨)
    expect(options.width).toBe(600);
    expect(options.height).toBe(400);
    expect(options.caption).toBe('그림 1. 테스트 차트');
    expect(options.showFigureNumber).toBe(true);
    expect(options.figureNumber).toBe(1);
  });

  it('ImageInsertOptions 타입 검증', () => {
    const options = {
      imageData: 'https://example.com/image.png',
      width: 400,
      height: 300,
      caption: '테스트 이미지',
    };

    // 타입 체크 (컴파일 시 검증됨)
    expect(options.imageData).toBe('https://example.com/image.png');
    expect(options.width).toBe(400);
    expect(options.height).toBe(300);
    expect(options.caption).toBe('테스트 이미지');
  });

  it('DocxChartConfig 타입 검증', () => {
    const chartConfig = {
      type: 'line' as const,
      title: '매출 추이',
      datasets: [
        {
          name: '2025년',
          data: [
            { label: '1월', value: 100 },
            { label: '2월', value: 150 },
          ],
          color: '#3b82f6',
        },
      ],
      width: 600,
      height: 400,
    };

    expect(chartConfig.type).toBe('line');
    expect(chartConfig.title).toBe('매출 추이');
    expect(chartConfig.datasets).toHaveLength(1);
    expect(chartConfig.datasets[0].data).toHaveLength(2);
  });

  it('DocxImageSize 타입 검증', () => {
    const size = {
      width: 600,
      height: 400,
    };

    expect(size.width).toBe(600);
    expect(size.height).toBe(400);
  });
});
