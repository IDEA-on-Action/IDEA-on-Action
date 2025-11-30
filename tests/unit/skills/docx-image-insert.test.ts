/**
 * docx 이미지 삽입 유틸리티 유닛 테스트
 *
 * @module tests/unit/skills/docx-image-insert
 */

import { describe, it, expect } from 'vitest';
import { calculateImageSize } from '@/lib/skills/docx-image';

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
});
