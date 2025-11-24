/**
 * Chart Slide Template
 * TASK-CS-035: 차트 슬라이드 템플릿
 *
 * 데이터 시각화용 슬라이드
 * - bar, line, pie, doughnut, area 차트 지원
 * - 데이터 레이블 표시
 *
 * @module skills/pptx/templates/chartSlide
 */

import type PptxGenJS from 'pptxgenjs';
import type { SlideContent, BrandColors, ChartType } from '@/types/pptx.types';

/**
 * Chart 슬라이드 옵션
 */
export interface ChartSlideOptions {
  /** pptxgenjs 슬라이드 객체 */
  slide: PptxGenJS.Slide;
  /** 슬라이드 콘텐츠 */
  content: SlideContent;
  /** 브랜드 색상 */
  colors: BrandColors;
  /** 제목 폰트 */
  titleFont: string;
  /** 본문 폰트 */
  bodyFont: string;
}

/**
 * pptxgenjs 차트 타입 매핑
 */
type PptxChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'area';

/**
 * ChartType을 pptxgenjs 차트 타입으로 변환
 */
function mapChartType(type: ChartType): PptxChartType {
  const chartTypeMap: Record<ChartType, PptxChartType> = {
    bar: 'bar',
    line: 'line',
    pie: 'pie',
    doughnut: 'doughnut',
    area: 'area',
  };
  return chartTypeMap[type] || 'bar';
}

/**
 * 차트 색상 팔레트 생성
 */
function generateChartColors(primaryColor: string, count: number): string[] {
  // 기본 색상 팔레트
  const colorPalette = [
    primaryColor,      // Primary
    '10B981',          // Emerald
    'F59E0B',          // Amber
    'EF4444',          // Red
    '8B5CF6',          // Violet
    '06B6D4',          // Cyan
    'F97316',          // Orange
    '84CC16',          // Lime
  ];

  return colorPalette.slice(0, count);
}

/**
 * 차트 슬라이드 생성
 *
 * 데이터 시각화를 위한 차트 슬라이드를 생성합니다.
 *
 * @example
 * ```typescript
 * addChartSlide({
 *   slide: pptx.addSlide(),
 *   content: {
 *     type: 'chart',
 *     title: '월별 매출 현황',
 *     chartData: {
 *       type: 'bar',
 *       labels: ['1월', '2월', '3월', '4월'],
 *       values: [100, 120, 90, 150],
 *       seriesName: '매출 (억원)',
 *     },
 *   },
 *   colors: BRAND_COLORS,
 *   titleFont: 'Pretendard',
 *   bodyFont: 'Pretendard',
 * });
 * ```
 */
export function addChartSlide(options: ChartSlideOptions): void {
  const { slide, content, colors, titleFont, bodyFont } = options;

  // 배경 설정
  slide.background = { color: colors.background };

  // 상단 컬러 바
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: '100%',
    h: 0.08,
    fill: { color: colors.primary },
  });

  // 슬라이드 제목
  if (content.title) {
    slide.addText(content.title, {
      x: 0.5,
      y: 0.4,
      w: '90%',
      h: 0.8,
      fontSize: 32,
      fontFace: titleFont,
      color: colors.text,
      bold: true,
      align: 'left',
      valign: 'middle',
    });

    // 제목 아래 구분선
    slide.addShape('rect', {
      x: 0.5,
      y: 1.25,
      w: 1.5,
      h: 0.05,
      fill: { color: colors.primary },
    });
  }

  // 차트 데이터가 있는 경우
  if (content.chartData) {
    const { type, labels, values, seriesName, title: chartTitle } = content.chartData;
    const chartType = mapChartType(type);

    // 차트 데이터 구성
    const chartDataConfig = [
      {
        name: seriesName || '데이터',
        labels,
        values,
      },
    ];

    // 차트 색상
    const chartColors = content.chartData.color
      ? [content.chartData.color]
      : generateChartColors(colors.primary, labels.length);

    // 차트 옵션 (타입별 설정)
    const isPieOrDoughnut = type === 'pie' || type === 'doughnut';

    // 차트 추가
    slide.addChart(chartType, chartDataConfig, {
      x: 0.8,
      y: 1.6,
      w: 11.5,
      h: 5.2,

      // 차트 제목
      title: chartTitle || '',
      titleFontFace: titleFont,
      titleFontSize: 14,
      titleColor: colors.text,

      // 범례 설정
      showLegend: true,
      legendPos: isPieOrDoughnut ? 'r' : 'b',
      legendFontFace: bodyFont,
      legendFontSize: 10,
      legendColor: colors.text,

      // 데이터 레이블
      showValue: true,
      dataLabelFontFace: bodyFont,
      dataLabelFontSize: 10,
      dataLabelColor: isPieOrDoughnut ? 'FFFFFF' : colors.text,
      dataLabelPosition: isPieOrDoughnut ? 'ctr' : 'outEnd',

      // 축 설정 (pie/doughnut에서는 사용 안 함)
      ...(isPieOrDoughnut
        ? {}
        : {
            catAxisTitle: '',
            valAxisTitle: '',
            catAxisLabelFontFace: bodyFont,
            catAxisLabelFontSize: 10,
            catAxisLabelColor: colors.text,
            valAxisLabelFontFace: bodyFont,
            valAxisLabelFontSize: 10,
            valAxisLabelColor: colors.text,
            catGridLine: { style: 'none' },
            valGridLine: { color: 'E5E7EB', style: 'dash' },
          }),

      // 차트 색상
      chartColors,

      // 3D 효과 비활성화 (깔끔한 플랫 디자인)
      // bar3D: false,
    });
  } else {
    // 차트 데이터가 없는 경우 안내 메시지
    slide.addText('차트 데이터가 없습니다.', {
      x: 0.5,
      y: 3.5,
      w: '90%',
      h: 1,
      fontSize: 18,
      fontFace: bodyFont,
      color: '9CA3AF',
      align: 'center',
      valign: 'middle',
    });
  }

  // 슬라이드 노트 추가
  if (content.notes) {
    slide.addNotes(content.notes);
  }
}

export default addChartSlide;
