/**
 * xlsx 차트 유틸리티
 *
 * Canvas API를 사용하여 차트 이미지를 생성하고 Excel에 삽입
 *
 * @module skills/xlsx/chart/chart-utils
 */

import type {
  ChartConfig,
  ChartGeneratorOptions,
  AnyChartConfig,
  LineChartConfig,
  BarChartConfig,
  PieChartConfig,
  AreaChartConfig,
  ChartRenderContext,
  ChartCoordinates,
  RenderedChart,
  ChartDataPoint,
  TrendChartData,
  DistributionChartData,
  ChartGenerationError,
} from '@/types/xlsx-chart.types';
import {
  CHART_COLORS,
  DEFAULT_CHART_COLORS,
  DEFAULT_FONT_CONFIG,
  DEFAULT_MARGINS,
} from '@/types/xlsx-chart.types';

// ============================================================================
// 차트 이미지 생성
// ============================================================================

/**
 * 차트 데이터를 기반으로 이미지 생성
 *
 * @param config - 차트 설정
 * @param options - 생성 옵션
 * @returns 차트 이미지 Blob
 *
 * @throws {ChartGenerationError} Canvas API 미지원 또는 렌더링 실패
 *
 * @example
 * ```ts
 * const config: ChartConfig = {
 *   type: 'line',
 *   data: [
 *     { label: '2025-11-01', value: 10 },
 *     { label: '2025-11-02', value: 15 },
 *   ],
 *   title: '일별 이벤트 수',
 *   position: { row: 0, col: 0 },
 * };
 *
 * const blob = await generateChartImage(config);
 * ```
 */
export async function generateChartImage(
  config: AnyChartConfig,
  options?: ChartGeneratorOptions
): Promise<RenderedChart> {
  const startTime = performance.now();

  // Canvas 지원 확인
  if (typeof document === 'undefined' || !document.createElement) {
    throw createChartError('CANVAS_NOT_SUPPORTED', config);
  }

  // 데이터 검증
  if (!config.data || config.data.length === 0) {
    throw createChartError('INVALID_DATA', config);
  }

  try {
    // Canvas 생성
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw createChartError('CANVAS_NOT_SUPPORTED', config);
    }

    // 렌더링 컨텍스트 준비
    const renderContext = prepareRenderContext(canvas, ctx, config, options);

    // 차트 타입별 렌더링
    switch (config.type) {
      case 'line':
        renderLineChart(renderContext);
        break;
      case 'bar':
        renderBarChart(renderContext);
        break;
      case 'pie':
        renderPieChart(renderContext);
        break;
      case 'area':
        renderAreaChart(renderContext);
        break;
      default:
        throw createChartError('INVALID_DATA', config);
    }

    // Blob 변환
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // 이미지 크기 확인
            if (blob.size > 500 * 1024) {
              // 500KB
              reject(createChartError('IMAGE_TOO_LARGE', config));
            } else {
              resolve(blob);
            }
          } else {
            reject(createChartError('BLOB_CONVERSION_FAILED', config));
          }
        },
        'image/png',
        0.95
      );
    });

    const duration = performance.now() - startTime;

    return {
      blob,
      config,
      duration,
      size: blob.size,
    };
  } catch (error) {
    if ((error as ChartGenerationError).code) {
      throw error;
    }
    throw createChartError('RENDER_FAILED', config, error);
  }
}

// ============================================================================
// 렌더링 컨텍스트 준비
// ============================================================================

function prepareRenderContext(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  config: AnyChartConfig,
  options?: ChartGeneratorOptions
): ChartRenderContext {
  const mergedOptions: ChartGeneratorOptions = {
    width: options?.width ?? config.size?.width ?? 800,
    height: options?.height ?? config.size?.height ?? 400,
    backgroundColor: options?.backgroundColor ?? 'transparent',
    showLegend: options?.showLegend ?? true,
    showLabels: options?.showLabels ?? true,
    showGrid: options?.showGrid ?? true,
    colorPalette: options?.colorPalette ?? [...DEFAULT_CHART_COLORS],
  };

  // Canvas 크기 설정
  canvas.width = mergedOptions.width!;
  canvas.height = mergedOptions.height!;

  // 배경색 설정
  if (mergedOptions.backgroundColor !== 'transparent') {
    ctx.fillStyle = mergedOptions.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 고품질 렌더링 설정
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  return { canvas, ctx, config, options: mergedOptions };
}

// ============================================================================
// 라인 차트 렌더링
// ============================================================================

function renderLineChart(context: ChartRenderContext): void {
  const { ctx, config, options } = context;
  const lineConfig = config as LineChartConfig;
  const coords = calculateCoordinates(context);

  // 제목
  if (config.title) {
    drawTitle(ctx, config.title, coords);
  }

  // 그리드
  if (options.showGrid) {
    drawGrid(ctx, coords);
  }

  // 축
  drawAxes(ctx, coords);

  // 라인
  const lineWidth = lineConfig.lineWidth ?? 2;
  const showPoints = lineConfig.showPoints ?? true;
  const color = options.colorPalette![0];

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();

  config.data.forEach((point, index) => {
    const x =
      DEFAULT_MARGINS.left +
      (index / (config.data.length - 1)) * coords.width;
    const y =
      DEFAULT_MARGINS.top +
      coords.height -
      (point.value / coords.maxY) * coords.height;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // 데이터 포인트
  if (showPoints) {
    config.data.forEach((point, index) => {
      const x =
        DEFAULT_MARGINS.left +
        (index / (config.data.length - 1)) * coords.width;
      const y =
        DEFAULT_MARGINS.top +
        coords.height -
        (point.value / coords.maxY) * coords.height;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 레이블
  if (options.showLabels) {
    drawLabels(ctx, config.data, coords);
  }
}

// ============================================================================
// 바 차트 렌더링
// ============================================================================

function renderBarChart(context: ChartRenderContext): void {
  const { ctx, config, options } = context;
  const barConfig = config as BarChartConfig;
  const coords = calculateCoordinates(context);

  // 제목
  if (config.title) {
    drawTitle(ctx, config.title, coords);
  }

  // 그리드
  if (options.showGrid) {
    drawGrid(ctx, coords);
  }

  // 축
  drawAxes(ctx, coords);

  // 바
  const barWidthRatio = barConfig.barWidthRatio ?? 0.8;
  const barWidth = (coords.width / config.data.length) * barWidthRatio;
  const barGap = coords.width / config.data.length;

  config.data.forEach((point, index) => {
    const x = DEFAULT_MARGINS.left + index * barGap + barGap * 0.1;
    const barHeight = (point.value / coords.maxY) * coords.height;
    const y = DEFAULT_MARGINS.top + coords.height - barHeight;

    ctx.fillStyle =
      point.color || options.colorPalette![index % options.colorPalette!.length];
    ctx.fillRect(x, y, barWidth, barHeight);
  });

  // 레이블
  if (options.showLabels) {
    drawLabels(ctx, config.data, coords);
  }
}

// ============================================================================
// 파이 차트 렌더링
// ============================================================================

function renderPieChart(context: ChartRenderContext): void {
  const { ctx, config, options } = context;
  const pieConfig = config as PieChartConfig;
  const coords = calculateCoordinates(context);

  // 제목
  if (config.title) {
    drawTitle(ctx, config.title, coords);
  }

  // 중심점 및 반지름
  const centerX = DEFAULT_MARGINS.left + coords.width / 2;
  const centerY = DEFAULT_MARGINS.top + coords.height / 2;
  const radius = Math.min(coords.width, coords.height) / 2 - 20;

  // 전체 값 계산
  const total = config.data.reduce((sum, point) => sum + point.value, 0);

  // 섹션 그리기
  let currentAngle = -Math.PI / 2; // 12시 방향부터 시작

  config.data.forEach((point, index) => {
    const sliceAngle = (point.value / total) * Math.PI * 2;
    const color =
      point.color || options.colorPalette![index % options.colorPalette!.length];

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();

    // 퍼센트 레이블
    if (pieConfig.showPercentage !== false && options.showLabels) {
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelRadius = radius * 0.7;
      const labelX = centerX + Math.cos(labelAngle) * labelRadius;
      const labelY = centerY + Math.sin(labelAngle) * labelRadius;

      const percentage = ((point.value / total) * 100).toFixed(1);
      ctx.fillStyle = CHART_COLORS.white;
      ctx.font = `${DEFAULT_FONT_CONFIG.labelSize}px ${DEFAULT_FONT_CONFIG.family}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${percentage}%`, labelX, labelY);
    }

    currentAngle += sliceAngle;
  });

  // 도넛 효과
  if (pieConfig.donut) {
    const holeRatio = pieConfig.donutHoleRatio ?? 0.5;
    ctx.fillStyle = options.backgroundColor || CHART_COLORS.white;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * holeRatio, 0, Math.PI * 2);
    ctx.fill();
  }

  // 범례
  if (options.showLegend) {
    drawLegend(ctx, config.data, coords, options.colorPalette!);
  }
}

// ============================================================================
// 영역 차트 렌더링
// ============================================================================

function renderAreaChart(context: ChartRenderContext): void {
  const { ctx, config, options } = context;
  const areaConfig = config as AreaChartConfig;
  const coords = calculateCoordinates(context);

  // 제목
  if (config.title) {
    drawTitle(ctx, config.title, coords);
  }

  // 그리드
  if (options.showGrid) {
    drawGrid(ctx, coords);
  }

  // 축
  drawAxes(ctx, coords);

  // 영역
  const fillOpacity = areaConfig.fillOpacity ?? 0.3;
  const color = options.colorPalette![0];

  // 영역 채우기
  ctx.fillStyle = hexToRgba(color, fillOpacity);
  ctx.beginPath();
  ctx.moveTo(DEFAULT_MARGINS.left, DEFAULT_MARGINS.top + coords.height);

  config.data.forEach((point, index) => {
    const x =
      DEFAULT_MARGINS.left +
      (index / (config.data.length - 1)) * coords.width;
    const y =
      DEFAULT_MARGINS.top +
      coords.height -
      (point.value / coords.maxY) * coords.height;
    ctx.lineTo(x, y);
  });

  ctx.lineTo(
    DEFAULT_MARGINS.left + coords.width,
    DEFAULT_MARGINS.top + coords.height
  );
  ctx.closePath();
  ctx.fill();

  // 상단 라인
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  config.data.forEach((point, index) => {
    const x =
      DEFAULT_MARGINS.left +
      (index / (config.data.length - 1)) * coords.width;
    const y =
      DEFAULT_MARGINS.top +
      coords.height -
      (point.value / coords.maxY) * coords.height;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // 레이블
  if (options.showLabels) {
    drawLabels(ctx, config.data, coords);
  }
}

// ============================================================================
// 좌표 계산
// ============================================================================

function calculateCoordinates(context: ChartRenderContext): ChartCoordinates {
  const { config, options } = context;

  const maxY = Math.max(...config.data.map((d) => d.value)) * 1.1; // 10% 여유

  return {
    minX: 0,
    maxX: config.data.length - 1,
    minY: 0,
    maxY,
    width: options.width! - DEFAULT_MARGINS.left - DEFAULT_MARGINS.right,
    height: options.height! - DEFAULT_MARGINS.top - DEFAULT_MARGINS.bottom,
  };
}

// ============================================================================
// 그리기 헬퍼 함수
// ============================================================================

function drawTitle(
  ctx: CanvasRenderingContext2D,
  title: string,
  coords: ChartCoordinates
): void {
  ctx.fillStyle = CHART_COLORS.primary;
  ctx.font = `bold ${DEFAULT_FONT_CONFIG.titleSize}px ${DEFAULT_FONT_CONFIG.family}`;
  ctx.textAlign = 'center';
  ctx.fillText(
    title,
    DEFAULT_MARGINS.left + coords.width / 2,
    DEFAULT_MARGINS.top - 15
  );
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  coords: ChartCoordinates
): void {
  ctx.strokeStyle = CHART_COLORS.neutral + '20'; // 20% 투명도
  ctx.lineWidth = 1;

  // 수평선 (5개)
  for (let i = 0; i <= 5; i++) {
    const y = DEFAULT_MARGINS.top + (coords.height / 5) * i;
    ctx.beginPath();
    ctx.moveTo(DEFAULT_MARGINS.left, y);
    ctx.lineTo(DEFAULT_MARGINS.left + coords.width, y);
    ctx.stroke();
  }
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  coords: ChartCoordinates
): void {
  ctx.strokeStyle = CHART_COLORS.neutral;
  ctx.lineWidth = 2;

  // X축
  ctx.beginPath();
  ctx.moveTo(DEFAULT_MARGINS.left, DEFAULT_MARGINS.top + coords.height);
  ctx.lineTo(
    DEFAULT_MARGINS.left + coords.width,
    DEFAULT_MARGINS.top + coords.height
  );
  ctx.stroke();

  // Y축
  ctx.beginPath();
  ctx.moveTo(DEFAULT_MARGINS.left, DEFAULT_MARGINS.top);
  ctx.lineTo(DEFAULT_MARGINS.left, DEFAULT_MARGINS.top + coords.height);
  ctx.stroke();
}

function drawLabels(
  ctx: CanvasRenderingContext2D,
  data: ChartDataPoint[],
  coords: ChartCoordinates
): void {
  ctx.fillStyle = CHART_COLORS.neutral;
  ctx.font = `${DEFAULT_FONT_CONFIG.labelSize}px ${DEFAULT_FONT_CONFIG.family}`;
  ctx.textAlign = 'center';

  data.forEach((point, index) => {
    const x =
      DEFAULT_MARGINS.left + (index / (data.length - 1)) * coords.width;
    const y = DEFAULT_MARGINS.top + coords.height + 20;
    ctx.fillText(point.label, x, y);
  });
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  data: ChartDataPoint[],
  coords: ChartCoordinates,
  colorPalette: string[]
): void {
  const legendX = DEFAULT_MARGINS.left + coords.width + 20;
  let legendY = DEFAULT_MARGINS.top;

  ctx.font = `${DEFAULT_FONT_CONFIG.legendSize}px ${DEFAULT_FONT_CONFIG.family}`;
  ctx.textAlign = 'left';

  data.forEach((point, index) => {
    const color = point.color || colorPalette[index % colorPalette.length];

    // 색상 박스
    ctx.fillStyle = color;
    ctx.fillRect(legendX, legendY, 12, 12);

    // 레이블
    ctx.fillStyle = CHART_COLORS.primary;
    ctx.fillText(point.label, legendX + 16, legendY + 10);

    legendY += 20;
  });
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function createChartError(
  code: ChartGenerationError['code'],
  config?: AnyChartConfig,
  details?: unknown
): ChartGenerationError {
  const messages: Record<ChartGenerationError['code'], string> = {
    CANVAS_NOT_SUPPORTED: 'Canvas API가 지원되지 않습니다.',
    INVALID_DATA: '차트 데이터가 유효하지 않습니다.',
    RENDER_FAILED: '차트 렌더링에 실패했습니다.',
    BLOB_CONVERSION_FAILED: 'Blob 변환에 실패했습니다.',
    IMAGE_TOO_LARGE: '이미지 크기가 500KB를 초과했습니다.',
    UNKNOWN: '알 수 없는 에러가 발생했습니다.',
  };

  const error = new Error(messages[code]) as ChartGenerationError;
  error.code = code;
  error.config = config;
  error.details = details;
  return error;
}

// ============================================================================
// 트렌드 차트 생성
// ============================================================================

/**
 * 트렌드 라인 차트 생성 (이벤트/이슈 시계열)
 *
 * @param data - 트렌드 데이터
 * @returns 차트 설정
 *
 * @example
 * ```ts
 * const trendData = {
 *   data: [
 *     { date: '2025-11-01', count: 10 },
 *     { date: '2025-11-02', count: 15 },
 *   ],
 *   title: '일별 이벤트 수',
 * };
 *
 * const chartConfig = createTrendChart(trendData);
 * ```
 */
export function createTrendChart(data: TrendChartData): LineChartConfig {
  return {
    type: 'line',
    data: data.data.map((d) => ({
      label: d.date,
      value: d.count,
    })),
    title: data.title,
    position: { row: 0, col: 0 },
    size: { width: 800, height: 400 },
    lineWidth: 2,
    showPoints: true,
    curved: false,
  };
}

/**
 * 파이 차트 생성 (상태별 분포)
 *
 * @param data - 분포 데이터
 * @returns 차트 설정
 *
 * @example
 * ```ts
 * const distData = {
 *   data: [
 *     { category: '미해결', count: 10 },
 *     { category: '진행중', count: 5 },
 *     { category: '해결됨', count: 15 },
 *   ],
 *   title: '상태별 이슈 분포',
 * };
 *
 * const chartConfig = createPieChart(distData);
 * ```
 */
export function createPieChart(data: DistributionChartData): PieChartConfig {
  return {
    type: 'pie',
    data: data.data.map((d) => ({
      label: d.category,
      value: d.count,
    })),
    title: data.title,
    position: { row: 0, col: 0 },
    size: { width: 800, height: 400 },
    donut: false,
    showPercentage: true,
  };
}
