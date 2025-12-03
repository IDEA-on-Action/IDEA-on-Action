/**
 * xlsx 차트 생성 유틸리티
 *
 * Recharts와 html2canvas를 활용하여 차트 이미지를 생성
 *
 * @module lib/skills/xlsx/chartGenerate
 */

import type {
  ChartData,
  ChartDataset,
  ChartGenerateResult,
  BarChartOptions,
  LineChartOptions,
  PieChartOptions,
} from '@/types/xlsx-chart.types';
import { DEFAULT_CHART_COLORS } from '@/types/xlsx-chart.types';

// ============================================================================
// 차트 생성 헬퍼 함수
// ============================================================================

/**
 * Canvas를 Base64 이미지로 변환
 */
async function canvasToBase64(
  canvas: HTMLCanvasElement,
  mimeType: 'image/png' | 'image/jpeg' = 'image/png',
  quality = 0.92
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const dataUrl = canvas.toDataURL(mimeType, quality);
      // "data:image/png;base64," 제거
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    } catch (error) {
      reject(new Error(`Canvas를 Base64로 변환 실패: ${error}`));
    }
  });
}

/**
 * SVG를 Canvas로 렌더링
 */
async function svgToCanvas(
  svgElement: SVGElement,
  width: number,
  height: number
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D 컨텍스트를 가져올 수 없습니다');
      }

      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('SVG 이미지 로딩 실패'));
      };
      img.src = url;
    } catch (error) {
      reject(new Error(`SVG를 Canvas로 변환 실패: ${error}`));
    }
  });
}

/**
 * Recharts 컴포넌트를 렌더링하여 SVG 요소 가져오기
 */
function renderChartToSvg(
  chartElement: React.ReactElement,
  containerId = 'chart-render-container'
): SVGElement {
  // 임시 컨테이너 생성
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);
  }

  // React 컴포넌트 렌더링 (실제 구현에서는 createRoot 사용)
  // 여기서는 간단히 SVG를 직접 생성하는 방식으로 구현
  // 실제로는 Recharts의 renderToStaticMarkup 등을 활용

  const svgElement = container.querySelector('svg');
  if (!svgElement) {
    throw new Error('SVG 요소를 찾을 수 없습니다');
  }

  return svgElement;
}

/**
 * 색상 배열 생성
 */
function getColors(
  customColors?: string[],
  dataLength?: number
): string[] {
  const colors = customColors || (DEFAULT_CHART_COLORS as unknown as string[]);
  if (!dataLength) return colors;

  // 데이터 길이만큼 색상 반복
  const result: string[] = [];
  for (let i = 0; i < dataLength; i++) {
    result.push(colors[i % colors.length]);
  }
  return result;
}

// ============================================================================
// Canvas 기반 차트 생성 (Recharts 대신 직접 그리기)
// ============================================================================

/**
 * Canvas에 막대 차트 그리기
 */
function drawBarChart(
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  options: BarChartOptions,
  width: number,
  height: number
): void {
  // 기본 차트 여백
  const DEFAULT_MARGIN = { top: 40, right: 40, bottom: 40, left: 40 };
  const margin = DEFAULT_MARGIN;
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // 배경 채우기
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 제목 그리기
  if (options.title) {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(options.title, width / 2, margin.top / 2);
  }

  // 데이터 최대값 계산
  const maxValue = Math.max(
    ...data.datasets.flatMap(ds => ds.data),
    options.yAxisMax || 0
  );
  const minValue = options.yAxisMin || 0;
  const valueRange = maxValue - minValue;

  const barWidth = chartWidth / data.labels.length;
  const barPercentage = options.barPercentage || 0.8;
  const categoryPercentage = options.categoryPercentage || 0.9;
  const actualBarWidth = barWidth * barPercentage * categoryPercentage;

  // 막대 그리기
  data.datasets.forEach((dataset, datasetIndex) => {
    const colors = getColors(
      dataset.backgroundColor as string[],
      dataset.data.length
    );

    dataset.data.forEach((value, index) => {
      const barHeight = ((value - minValue) / valueRange) * chartHeight;
      const x = margin.left + index * barWidth + (barWidth - actualBarWidth) / 2;
      const y = margin.top + chartHeight - barHeight;

      ctx.fillStyle = Array.isArray(colors) ? colors[index] : (colors as unknown as string);
      ctx.fillRect(x, y, actualBarWidth, barHeight);

      // 테두리
      if (dataset.borderWidth) {
        ctx.strokeStyle = Array.isArray(dataset.borderColor)
          ? dataset.borderColor[index]
          : (dataset.borderColor || '#000000');
        ctx.lineWidth = dataset.borderWidth;
        ctx.strokeRect(x, y, actualBarWidth, barHeight);
      }
    });
  });

  // X축 라벨
  ctx.fillStyle = '#666666';
  ctx.font = '12px Inter, sans-serif';
  ctx.textAlign = 'center';
  data.labels.forEach((label, index) => {
    const x = margin.left + index * barWidth + barWidth / 2;
    const y = height - margin.bottom / 2;
    ctx.fillText(label, x, y);
  });

  // Y축 그리드 라인
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = margin.top + (chartHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + chartWidth, y);
    ctx.stroke();

    // Y축 값
    const value = maxValue - (valueRange / 5) * i;
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'right';
    ctx.fillText(value.toFixed(0), margin.left - 10, y + 5);
  }
}

/**
 * Canvas에 라인 차트 그리기
 */
function drawLineChart(
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  options: LineChartOptions,
  width: number,
  height: number
): void {
  // 기본 차트 여백
  const DEFAULT_MARGIN = { top: 40, right: 40, bottom: 40, left: 40 };
  const margin = DEFAULT_MARGIN;
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // 배경 채우기
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 제목 그리기
  if (options.title) {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(options.title, width / 2, margin.top / 2);
  }

  // 데이터 최대값 계산
  const maxValue = Math.max(...data.datasets.flatMap(ds => ds.data));
  const minValue = 0;
  const valueRange = maxValue - minValue;

  const pointSpacing = chartWidth / (data.labels.length - 1);

  // 그리드 라인
  if (options.showGrid !== false) {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();
    }
  }

  // 라인 그리기
  data.datasets.forEach((dataset, datasetIndex) => {
    const color = Array.isArray(dataset.backgroundColor)
      ? dataset.backgroundColor[0]
      : (dataset.backgroundColor || '#3b82f6');

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    dataset.data.forEach((value, index) => {
      const x = margin.left + index * pointSpacing;
      const y = margin.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // 데이터 포인트
    if (options.showPoints !== false) {
      dataset.data.forEach((value, index) => {
        const x = margin.left + index * pointSpacing;
        const y = margin.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // 영역 채우기
    if (options.fill) {
      ctx.fillStyle = color + '40'; // 투명도 추가
      ctx.beginPath();
      ctx.moveTo(margin.left, margin.top + chartHeight);
      dataset.data.forEach((value, index) => {
        const x = margin.left + index * pointSpacing;
        const y = margin.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
      ctx.closePath();
      ctx.fill();
    }
  });

  // X축 라벨
  ctx.fillStyle = '#666666';
  ctx.font = '12px Inter, sans-serif';
  ctx.textAlign = 'center';
  data.labels.forEach((label, index) => {
    const x = margin.left + index * pointSpacing;
    const y = height - margin.bottom / 2;
    ctx.fillText(label, x, y);
  });
}

/**
 * Canvas에 파이 차트 그리기
 */
function drawPieChart(
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  options: PieChartOptions,
  width: number,
  height: number
): void {
  // 기본 차트 여백
  const DEFAULT_MARGIN = { top: 40, right: 40, bottom: 40, left: 40 };
  const margin = DEFAULT_MARGIN;

  // 배경 채우기
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 제목 그리기
  if (options.title) {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(options.title, width / 2, margin.top);
  }

  // 파이 차트 중심 및 반지름
  const centerX = width / 2;
  const centerY = height / 2 + margin.top / 2;
  const radius = Math.min(width, height) / 2 - Math.max(margin.left, margin.right) - 40;

  // 데이터 합계
  const total = data.datasets[0].data.reduce((sum, val) => sum + val, 0);
  const colors = getColors(
    data.datasets[0].backgroundColor as string[],
    data.datasets[0].data.length
  );

  let currentAngle = options.startAngle
    ? (options.startAngle * Math.PI) / 180
    : -Math.PI / 2;

  // 각 섹션 그리기
  data.datasets[0].data.forEach((value, index) => {
    const sliceAngle = (value / total) * 2 * Math.PI;
    const endAngle = currentAngle + sliceAngle;

    // 섹션 그리기
    ctx.fillStyle = colors[index];
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    // 테두리
    if (data.datasets[0].borderWidth) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = data.datasets[0].borderWidth;
      ctx.stroke();
    }

    // 퍼센트 라벨
    if (options.showPercentage !== false) {
      const percentage = ((value / total) * 100).toFixed(1);
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelRadius = radius * 0.7;
      const labelX = centerX + labelRadius * Math.cos(labelAngle);
      const labelY = centerY + labelRadius * Math.sin(labelAngle);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${percentage}%`, labelX, labelY);
    }

    currentAngle = endAngle;
  });

  // 도넛 차트인 경우 중앙 원 그리기
  if (options.isDoughnut) {
    const innerRadius = radius * (options.innerRadius || 0.6);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fill();
  }

  // 범례 그리기
  if (options.showLegend !== false) {
    const legendX = width - margin.right - 100;
    let legendY = margin.top + 40;

    data.labels.forEach((label, index) => {
      // 색상 박스
      ctx.fillStyle = colors[index];
      ctx.fillRect(legendX, legendY, 15, 15);

      // 라벨
      ctx.fillStyle = '#333333';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, legendX + 20, legendY + 12);

      legendY += 20;
    });
  }
}

// ============================================================================
// 공개 API
// ============================================================================

/**
 * 막대 차트 이미지 생성
 */
export async function generateBarChartImage(
  data: ChartData,
  options: BarChartOptions = {}
): Promise<ChartGenerateResult> {
  // 기본 차트 크기
  const DEFAULT_WIDTH = 800;
  const DEFAULT_HEIGHT = 400;

  const width = options.width || DEFAULT_WIDTH;
  const height = options.height || DEFAULT_HEIGHT;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D 컨텍스트를 가져올 수 없습니다');
  }

  drawBarChart(ctx, data, options, width, height);

  const imageBase64 = await canvasToBase64(canvas, 'image/png', options.quality);

  return {
    imageBase64,
    mimeType: 'image/png',
    width,
    height,
  };
}

/**
 * 라인 차트 이미지 생성
 */
export async function generateLineChartImage(
  data: ChartData,
  options: LineChartOptions = {}
): Promise<ChartGenerateResult> {
  // 기본 차트 크기
  const DEFAULT_WIDTH = 800;
  const DEFAULT_HEIGHT = 400;

  const width = options.width || DEFAULT_WIDTH;
  const height = options.height || DEFAULT_HEIGHT;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D 컨텍스트를 가져올 수 없습니다');
  }

  drawLineChart(ctx, data, options, width, height);

  const imageBase64 = await canvasToBase64(canvas, 'image/png', options.quality);

  return {
    imageBase64,
    mimeType: 'image/png',
    width,
    height,
  };
}

/**
 * 파이 차트 이미지 생성
 */
export async function generatePieChartImage(
  data: ChartData,
  options: PieChartOptions = {}
): Promise<ChartGenerateResult> {
  // 기본 차트 크기
  const DEFAULT_WIDTH = 800;
  const DEFAULT_HEIGHT = 400;

  const width = options.width || DEFAULT_WIDTH;
  const height = options.height || DEFAULT_HEIGHT;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D 컨텍스트를 가져올 수 없습니다');
  }

  drawPieChart(ctx, data, options, width, height);

  const imageBase64 = await canvasToBase64(canvas, 'image/png', options.quality);

  return {
    imageBase64,
    mimeType: 'image/png',
    width,
    height,
  };
}
