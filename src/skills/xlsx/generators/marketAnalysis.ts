/**
 * 시장 분석 Excel 생성기
 *
 * Minu Find 서비스를 위한 시장 분석 Excel 템플릿 생성
 *
 * @module skills/xlsx/generators/marketAnalysis
 */

import type { SheetConfig, ColumnConfig } from '@/types/ai/skills.types';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 경쟁사 데이터
 */
export interface CompetitorData {
  /** 경쟁사명 */
  name: string;
  /** 시장 점유율 (%) */
  marketShare: number;
  /** 강점 목록 */
  strengths: string[];
  /** 약점 목록 */
  weaknesses: string[];
  /** 종합 점수 (1-100) */
  score: number;
}

/**
 * 트렌드 데이터
 */
export interface TrendData {
  /** 월 (YYYY-MM 형식) */
  month: string;
  /** 값 (시장 규모, 검색량 등) */
  value: number;
  /** 성장률 (%) */
  growth: number;
}

/**
 * 사업기회 데이터
 */
export interface OpportunityData {
  /** 고유 ID */
  id: string;
  /** 기회명 */
  title: string;
  /** 점수 (1-100) */
  score: number;
  /** 우선순위 */
  priority: 'high' | 'medium' | 'low';
  /** 근거/설명 */
  rationale: string;
}

/**
 * 시장 분석 데이터
 */
export interface MarketAnalysisData {
  /** 경쟁사 목록 */
  competitors: CompetitorData[];
  /** 트렌드 데이터 */
  trends: TrendData[];
  /** 사업기회 목록 */
  opportunities: OpportunityData[];
  /** 메타데이터 (선택) */
  metadata?: MarketAnalysisMetadata;
}

/**
 * 시장 분석 메타데이터
 */
export interface MarketAnalysisMetadata {
  /** 분석 대상 산업 */
  industry?: string;
  /** 분석 대상 지역 */
  region?: string;
  /** 분석 기간 */
  period?: string;
  /** 분석 일자 */
  analyzedAt?: string;
  /** 분석가 */
  analyst?: string;
}

// ============================================================================
// 컬럼 설정
// ============================================================================

/**
 * 경쟁사 분석 시트 컬럼 설정
 */
export const competitorColumns: ColumnConfig[] = [
  { key: '경쟁사', header: '경쟁사', width: 20 },
  { key: '시장점유율', header: '시장점유율', width: 12, format: 'percent' },
  { key: '강점', header: '강점', width: 40 },
  { key: '약점', header: '약점', width: 40 },
  { key: '종합점수', header: '종합점수', width: 12, format: 'number' },
];

/**
 * 트렌드 분석 시트 컬럼 설정
 */
export const trendColumns: ColumnConfig[] = [
  { key: '월', header: '월', width: 12 },
  { key: '값', header: '값', width: 15, format: 'number' },
  { key: '성장률', header: '성장률', width: 12, format: 'percent' },
];

/**
 * 사업기회 시트 컬럼 설정
 */
export const opportunityColumns: ColumnConfig[] = [
  { key: 'ID', header: 'ID', width: 12 },
  { key: '기회명', header: '기회명', width: 30 },
  { key: '점수', header: '점수', width: 10, format: 'number' },
  { key: '우선순위', header: '우선순위', width: 12 },
  { key: '근거', header: '근거', width: 50 },
];

// ============================================================================
// 우선순위 라벨
// ============================================================================

/**
 * 우선순위 한글 라벨
 */
export const PRIORITY_LABELS: Record<OpportunityData['priority'], string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

// ============================================================================
// 시트 생성 함수
// ============================================================================

/**
 * 경쟁사 분석 시트 데이터 변환
 *
 * @param competitors - 경쟁사 데이터 배열
 * @returns 시트에 사용할 행 데이터
 */
export function transformCompetitors(competitors: CompetitorData[]): Record<string, unknown>[] {
  return competitors.map((c) => ({
    '경쟁사': c.name,
    '시장점유율': `${c.marketShare}%`,
    '강점': c.strengths.join(', '),
    '약점': c.weaknesses.join(', '),
    '종합점수': c.score,
  }));
}

/**
 * 트렌드 분석 시트 데이터 변환
 *
 * @param trends - 트렌드 데이터 배열
 * @returns 시트에 사용할 행 데이터
 */
export function transformTrends(trends: TrendData[]): Record<string, unknown>[] {
  return trends.map((t) => ({
    '월': t.month,
    '값': t.value,
    '성장률': `${t.growth > 0 ? '+' : ''}${t.growth}%`,
  }));
}

/**
 * 사업기회 시트 데이터 변환
 *
 * @param opportunities - 사업기회 데이터 배열
 * @returns 시트에 사용할 행 데이터
 */
export function transformOpportunities(opportunities: OpportunityData[]): Record<string, unknown>[] {
  return opportunities.map((o) => ({
    'ID': o.id,
    '기회명': o.title,
    '점수': o.score,
    '우선순위': PRIORITY_LABELS[o.priority],
    '근거': o.rationale,
  }));
}

/**
 * 시장 분석 요약 시트 데이터 생성
 *
 * @param data - 시장 분석 데이터
 * @returns 요약 시트 행 데이터
 */
export function generateSummary(data: MarketAnalysisData): Record<string, unknown>[] {
  const { competitors, trends, opportunities, metadata } = data;

  // 통계 계산
  const avgMarketShare = competitors.length > 0
    ? competitors.reduce((sum, c) => sum + c.marketShare, 0) / competitors.length
    : 0;
  const topCompetitor = competitors.length > 0
    ? competitors.reduce((max, c) => c.score > max.score ? c : max)
    : null;
  const latestTrend = trends.length > 0 ? trends[trends.length - 1] : null;
  const avgGrowth = trends.length > 0
    ? trends.reduce((sum, t) => sum + t.growth, 0) / trends.length
    : 0;
  const highPriorityCount = opportunities.filter((o) => o.priority === 'high').length;
  const topOpportunity = opportunities.length > 0
    ? opportunities.reduce((max, o) => o.score > max.score ? o : max)
    : null;

  const summary: Record<string, unknown>[] = [
    { '항목': '분석 산업', '값': metadata?.industry || '-' },
    { '항목': '분석 지역', '값': metadata?.region || '-' },
    { '항목': '분석 기간', '값': metadata?.period || '-' },
    { '항목': '분석 일자', '값': metadata?.analyzedAt || new Date().toLocaleDateString('ko-KR') },
    { '항목': '분석가', '값': metadata?.analyst || '-' },
    { '항목': '', '값': '' },
    { '항목': '=== 경쟁사 분석 ===', '값': '' },
    { '항목': '분석 경쟁사 수', '값': competitors.length },
    { '항목': '평균 시장점유율', '값': `${avgMarketShare.toFixed(1)}%` },
    { '항목': '최고 점수 경쟁사', '값': topCompetitor ? `${topCompetitor.name} (${topCompetitor.score}점)` : '-' },
    { '항목': '', '값': '' },
    { '항목': '=== 트렌드 분석 ===', '값': '' },
    { '항목': '분석 기간 수', '값': trends.length },
    { '항목': '최근 값', '값': latestTrend ? latestTrend.value : '-' },
    { '항목': '최근 성장률', '값': latestTrend ? `${latestTrend.growth > 0 ? '+' : ''}${latestTrend.growth}%` : '-' },
    { '항목': '평균 성장률', '값': `${avgGrowth > 0 ? '+' : ''}${avgGrowth.toFixed(1)}%` },
    { '항목': '', '값': '' },
    { '항목': '=== 사업기회 ===', '값': '' },
    { '항목': '발굴 기회 수', '값': opportunities.length },
    { '항목': '높은 우선순위', '값': highPriorityCount },
    { '항목': '최고 점수 기회', '값': topOpportunity ? `${topOpportunity.title} (${topOpportunity.score}점)` : '-' },
  ];

  return summary;
}

/**
 * 요약 시트 컬럼 설정
 */
export const summaryColumns: ColumnConfig[] = [
  { key: '항목', header: '항목', width: 25 },
  { key: '값', header: '값', width: 40 },
];

/**
 * 시장 분석 Excel 시트 생성
 *
 * Minu Find 서비스의 시장 분석 데이터를 Excel 시트로 변환합니다.
 *
 * @param data - 시장 분석 데이터
 * @returns SheetConfig 배열 (4개 시트: 요약, 경쟁사 분석, 트렌드 분석, 사업기회)
 *
 * @example
 * ```typescript
 * const data: MarketAnalysisData = {
 *   competitors: [
 *     { name: '경쟁사A', marketShare: 30, strengths: ['기술력'], weaknesses: ['가격'], score: 85 },
 *   ],
 *   trends: [
 *     { month: '2025-01', value: 1000000, growth: 5.2 },
 *   ],
 *   opportunities: [
 *     { id: 'OPP-001', title: '신규 시장 진출', score: 90, priority: 'high', rationale: '...' },
 *   ],
 * };
 *
 * const sheets = generateMarketAnalysisSheets(data);
 * // sheets를 useXlsxExport의 옵션으로 전달
 * ```
 */
export function generateMarketAnalysisSheets(data: MarketAnalysisData): SheetConfig[] {
  return [
    {
      name: '요약',
      data: generateSummary(data),
      columns: summaryColumns,
    },
    {
      name: '경쟁사 분석',
      data: transformCompetitors(data.competitors),
      columns: competitorColumns,
    },
    {
      name: '트렌드 분석',
      data: transformTrends(data.trends),
      columns: trendColumns,
    },
    {
      name: '사업기회',
      data: transformOpportunities(data.opportunities),
      columns: opportunityColumns,
    },
  ];
}

// 편의를 위한 alias
export { generateMarketAnalysisSheets as generateMarketAnalysisSheet };

export default generateMarketAnalysisSheets;
