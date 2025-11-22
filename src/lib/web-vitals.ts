/**
 * Web Vitals 측정 및 분석 통합
 *
 * Core Web Vitals:
 * - LCP (Largest Contentful Paint): < 2.5s
 * - FID (First Input Delay): < 100ms
 * - CLS (Cumulative Layout Shift): < 0.1
 *
 * Additional Metrics:
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 * - INP (Interaction to Next Paint)
 *
 * Created: 2025-11-22
 * Related: TASK-075 Core Web Vitals 개선
 */

import { trackEvent } from '@/lib/analytics';

// Web Vitals 타입 정의
interface WebVitalMetric {
  name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

// Web Vitals 임계값 (Google 권장)
const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // ms
  FID: { good: 100, poor: 300 }, // ms
  CLS: { good: 0.1, poor: 0.25 }, // unitless
  FCP: { good: 1800, poor: 3000 }, // ms
  TTFB: { good: 800, poor: 1800 }, // ms
  INP: { good: 200, poor: 500 }, // ms
};

/**
 * Web Vitals 측정값의 등급을 결정
 */
function getRating(name: WebVitalMetric['name'], value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = WEB_VITALS_THRESHOLDS[name];
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Web Vitals 측정값을 GA4로 전송
 */
function sendToAnalytics(metric: WebVitalMetric) {
  // GA4 이벤트로 전송
  trackEvent('web_vitals', {
    metric_name: metric.name,
    metric_value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    metric_rating: metric.rating,
    metric_delta: Math.round(metric.delta),
    metric_id: metric.id,
    navigation_type: metric.navigationType,
  });

  // 개발 환경에서는 콘솔에도 출력
  if (import.meta.env.DEV) {
    const color = metric.rating === 'good' ? 'green' : metric.rating === 'needs-improvement' ? 'orange' : 'red';
    console.log(
      `%c[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`,
      `color: ${color}; font-weight: bold;`
    );
  }
}

/**
 * Web Vitals 측정 초기화
 *
 * 사용법:
 * ```tsx
 * // src/App.tsx 또는 main.tsx에서
 * import { initWebVitals } from '@/lib/web-vitals';
 *
 * // 앱 시작 시 초기화
 * initWebVitals();
 * ```
 */
export async function initWebVitals() {
  // web-vitals 라이브러리가 설치되어 있지 않은 경우 PerformanceObserver 직접 사용
  if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
    try {
      // LCP (Largest Contentful Paint)
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        if (lastEntry) {
          const value = lastEntry.startTime;
          sendToAnalytics({
            name: 'LCP',
            value,
            rating: getRating('LCP', value),
            delta: value,
            id: `lcp-${Date.now()}`,
            navigationType: 'navigate',
          });
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // FCP (First Contentful Paint)
      const fcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const fcpEntry = entries.find((entry) => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          const value = fcpEntry.startTime;
          sendToAnalytics({
            name: 'FCP',
            value,
            rating: getRating('FCP', value),
            delta: value,
            id: `fcp-${Date.now()}`,
            navigationType: 'navigate',
          });
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });

      // CLS (Cumulative Layout Shift)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // 페이지 unload 시 CLS 전송
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          sendToAnalytics({
            name: 'CLS',
            value: clsValue,
            rating: getRating('CLS', clsValue),
            delta: clsValue,
            id: `cls-${Date.now()}`,
            navigationType: 'navigate',
          });
        }
      });

      // FID (First Input Delay)
      const fidObserver = new PerformanceObserver((entryList) => {
        const firstEntry = entryList.getEntries()[0] as PerformanceEntry & { processingStart: number; startTime: number };
        if (firstEntry) {
          const value = firstEntry.processingStart - firstEntry.startTime;
          sendToAnalytics({
            name: 'FID',
            value,
            rating: getRating('FID', value),
            delta: value,
            id: `fid-${Date.now()}`,
            navigationType: 'navigate',
          });
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // TTFB (Time to First Byte)
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navEntries.length > 0) {
        const navEntry = navEntries[0];
        const ttfb = navEntry.responseStart - navEntry.requestStart;
        if (ttfb > 0) {
          sendToAnalytics({
            name: 'TTFB',
            value: ttfb,
            rating: getRating('TTFB', ttfb),
            delta: ttfb,
            id: `ttfb-${Date.now()}`,
            navigationType: navEntry.type || 'navigate',
          });
        }
      }

      console.log('[Web Vitals] 측정 초기화 완료');
    } catch (error) {
      console.warn('[Web Vitals] 초기화 실패:', error);
    }
  }
}

/**
 * 성능 마크 및 측정 헬퍼
 */
export const performanceMarks = {
  /**
   * 성능 마크 시작
   */
  start: (markName: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${markName}-start`);
    }
  },

  /**
   * 성능 마크 종료 및 측정
   */
  end: (markName: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${markName}-end`);
      try {
        performance.measure(markName, `${markName}-start`, `${markName}-end`);
        const measures = performance.getEntriesByName(markName, 'measure');
        if (measures.length > 0) {
          const duration = measures[measures.length - 1].duration;
          if (import.meta.env.DEV) {
            console.log(`[Performance] ${markName}: ${duration.toFixed(2)}ms`);
          }
          return duration;
        }
      } catch {
        // 마크가 없는 경우 무시
      }
    }
    return 0;
  },
};

/**
 * 리소스 로딩 성능 분석
 */
export function analyzeResourcePerformance() {
  if (typeof performance === 'undefined') return;

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

  const analysis = {
    total: resources.length,
    byType: {} as Record<string, { count: number; totalSize: number; totalDuration: number }>,
    slowResources: [] as Array<{ name: string; duration: number; type: string }>,
  };

  resources.forEach((resource) => {
    const type = getResourceType(resource.name);
    const duration = resource.responseEnd - resource.startTime;
    const size = resource.transferSize || 0;

    if (!analysis.byType[type]) {
      analysis.byType[type] = { count: 0, totalSize: 0, totalDuration: 0 };
    }
    analysis.byType[type].count++;
    analysis.byType[type].totalSize += size;
    analysis.byType[type].totalDuration += duration;

    // 500ms 이상 걸린 리소스 기록
    if (duration > 500) {
      analysis.slowResources.push({
        name: resource.name.split('/').pop() || resource.name,
        duration: Math.round(duration),
        type,
      });
    }
  });

  if (import.meta.env.DEV) {
    console.group('[Resource Performance Analysis]');
    console.table(analysis.byType);
    if (analysis.slowResources.length > 0) {
      console.warn('Slow resources (>500ms):', analysis.slowResources);
    }
    console.groupEnd();
  }

  return analysis;
}

function getResourceType(url: string): string {
  if (url.endsWith('.js') || url.includes('.js?')) return 'JavaScript';
  if (url.endsWith('.css') || url.includes('.css?')) return 'CSS';
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico)(\?|$)/i.test(url)) return 'Image';
  if (/\.(woff|woff2|ttf|otf|eot)(\?|$)/i.test(url)) return 'Font';
  if (url.includes('api') || url.includes('supabase')) return 'API';
  return 'Other';
}
