/**
 * Minu Keep - 운영 보고서 초안 생성기
 *
 * Claude AI를 활용하여 운영 데이터를 요약하고,
 * SLA 분석, 장애 원인 분석, 다음 달 계획 초안을 생성합니다.
 *
 * @module skills/claude/generators/opsReportGenerator
 */

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * SLA 메트릭
 */
export interface SLAMetric {
  /** 메트릭 이름 */
  name: string;
  /** 목표 값 */
  target: number;
  /** 실제 값 */
  actual: number;
  /** 단위 */
  unit: '%' | 'ms' | 'count' | 'hours';
  /** 달성 여부 */
  achieved: boolean;
  /** 트렌드 (이전 대비) */
  trend: 'up' | 'down' | 'stable';
}

/**
 * 장애 기록
 */
export interface IncidentRecord {
  /** 장애 ID */
  id: string;
  /** 장애 제목 */
  title: string;
  /** 발생 시각 */
  occurredAt: string;
  /** 해결 시각 */
  resolvedAt: string | null;
  /** 심각도 */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** 영향 범위 */
  impact: string;
  /** 근본 원인 (RCA) */
  rootCause?: string;
  /** 조치 내용 */
  resolution?: string;
  /** 관련 서비스 */
  affectedServices: string[];
  /** 다운타임 (분) */
  downtimeMinutes: number;
}

/**
 * 서비스 상태 요약
 */
export interface ServiceStatusSummary {
  /** 서비스 이름 */
  serviceName: string;
  /** 가용성 (%) */
  availability: number;
  /** 평균 응답 시간 (ms) */
  avgResponseTime: number;
  /** 에러율 (%) */
  errorRate: number;
  /** 총 요청 수 */
  totalRequests: number;
  /** 성공 요청 수 */
  successfulRequests: number;
  /** 상태 */
  status: 'healthy' | 'degraded' | 'unhealthy';
}

/**
 * 개선 사항
 */
export interface ImprovementItem {
  /** ID */
  id: string;
  /** 카테고리 */
  category: 'performance' | 'reliability' | 'security' | 'cost' | 'process';
  /** 제목 */
  title: string;
  /** 설명 */
  description: string;
  /** 우선순위 */
  priority: 'high' | 'medium' | 'low';
  /** 예상 효과 */
  expectedImpact: string;
  /** 필요 리소스 */
  requiredResources: string;
  /** 상태 */
  status: 'proposed' | 'approved' | 'in_progress' | 'completed';
}

/**
 * 운영 데이터 입력
 */
export interface OperationsDataInput {
  /** 보고서 기간 */
  period: {
    startDate: string;
    endDate: string;
  };
  /** 서비스 상태 목록 */
  services: ServiceStatusSummary[];
  /** SLA 메트릭 목록 */
  slaMetrics: SLAMetric[];
  /** 장애 기록 */
  incidents: IncidentRecord[];
  /** 개선 사항 */
  improvements: ImprovementItem[];
  /** 비용 데이터 (선택) */
  costs?: {
    infrastructure: number;
    monitoring: number;
    support: number;
    total: number;
    budget: number;
    currency: string;
  };
  /** 팀 정보 (선택) */
  team?: {
    onCallRotations: number;
    escalations: number;
    avgResponseTime: number;
  };
}

/**
 * 운영 보고서 결과
 */
export interface OperationsReportResult {
  /** 보고서 제목 */
  title: string;
  /** 보고서 기간 */
  period: string;
  /** 요약 */
  executiveSummary: string;
  /** SLA 분석 */
  slaAnalysis: SLAAnalysisSection;
  /** 장애 분석 */
  incidentAnalysis: IncidentAnalysisSection;
  /** 개선 제안 */
  improvementSuggestions: ImprovementSuggestion[];
  /** 다음 달 계획 */
  nextMonthPlan: NextMonthPlan;
  /** 위험 요소 */
  risks: RiskItem[];
  /** 핵심 지표 */
  keyMetrics: KeyMetric[];
}

/**
 * SLA 분석 섹션
 */
export interface SLAAnalysisSection {
  /** 전체 달성률 */
  overallAchievementRate: number;
  /** 달성된 SLA 수 */
  achievedCount: number;
  /** 미달성 SLA 수 */
  missedCount: number;
  /** 분석 내용 */
  analysis: string;
  /** 미달성 항목 분석 */
  missedSLADetails: Array<{
    metric: string;
    gap: number;
    cause: string;
    recommendation: string;
  }>;
}

/**
 * 장애 분석 섹션
 */
export interface IncidentAnalysisSection {
  /** 총 장애 수 */
  totalIncidents: number;
  /** 심각도별 분포 */
  severityDistribution: Record<string, number>;
  /** 총 다운타임 (분) */
  totalDowntimeMinutes: number;
  /** 평균 복구 시간 (분) */
  meanTimeToRecovery: number;
  /** 분석 내용 */
  analysis: string;
  /** 주요 원인 분석 */
  rootCauseAnalysis: Array<{
    category: string;
    count: number;
    percentage: number;
    preventionMeasures: string[];
  }>;
}

/**
 * 개선 제안
 */
export interface ImprovementSuggestion {
  /** 제안 ID */
  id: string;
  /** 카테고리 */
  category: string;
  /** 제목 */
  title: string;
  /** 설명 */
  description: string;
  /** 우선순위 */
  priority: 'high' | 'medium' | 'low';
  /** 예상 효과 */
  expectedBenefit: string;
  /** 필요 노력 */
  effort: 'small' | 'medium' | 'large';
  /** 예상 소요 시간 */
  estimatedDuration: string;
}

/**
 * 다음 달 계획
 */
export interface NextMonthPlan {
  /** 목표 */
  objectives: string[];
  /** 주요 작업 */
  keyTasks: Array<{
    task: string;
    owner: string;
    dueDate: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  /** 예상 위험 */
  anticipatedRisks: string[];
  /** 리소스 요구사항 */
  resourceRequirements: string[];
}

/**
 * 위험 항목
 */
export interface RiskItem {
  /** 위험 ID */
  id: string;
  /** 제목 */
  title: string;
  /** 설명 */
  description: string;
  /** 발생 가능성 */
  likelihood: 'high' | 'medium' | 'low';
  /** 영향도 */
  impact: 'high' | 'medium' | 'low';
  /** 완화 방안 */
  mitigation: string;
}

/**
 * 핵심 지표
 */
export interface KeyMetric {
  /** 지표명 */
  name: string;
  /** 현재 값 */
  value: number | string;
  /** 목표 값 */
  target?: number | string;
  /** 단위 */
  unit: string;
  /** 상태 */
  status: 'good' | 'warning' | 'critical';
  /** 변화 */
  change?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
}

/**
 * 운영 보고서 생성 옵션
 */
export interface OperationsReportOptions {
  /** 보고서 유형 */
  reportType: 'weekly' | 'monthly' | 'quarterly';
  /** 상세 수준 */
  detailLevel: 'summary' | 'detailed' | 'executive';
  /** 포함할 섹션 */
  includeSections: {
    executiveSummary: boolean;
    slaAnalysis: boolean;
    incidentAnalysis: boolean;
    improvements: boolean;
    nextMonthPlan: boolean;
    risks: boolean;
    costs: boolean;
  };
  /** 언어 */
  language: 'ko' | 'en';
  /** 대상 독자 */
  audience: 'technical' | 'management' | 'stakeholder';
}

// ============================================================================
// 상수 정의
// ============================================================================

/**
 * 보고서 유형 라벨
 */
export const REPORT_TYPE_LABELS: Record<string, string> = {
  weekly: '주간',
  monthly: '월간',
  quarterly: '분기',
};

/**
 * 심각도 라벨
 */
export const SEVERITY_LABELS: Record<string, string> = {
  critical: '치명적',
  high: '높음',
  medium: '보통',
  low: '낮음',
};

/**
 * 개선 카테고리 라벨
 */
export const IMPROVEMENT_CATEGORY_LABELS: Record<string, string> = {
  performance: '성능',
  reliability: '신뢰성',
  security: '보안',
  cost: '비용',
  process: '프로세스',
};

/**
 * 상태 라벨
 */
export const STATUS_LABELS: Record<string, string> = {
  healthy: '정상',
  degraded: '저하',
  unhealthy: '비정상',
  good: '양호',
  warning: '주의',
  critical: '위험',
};

// ============================================================================
// 프롬프트 템플릿
// ============================================================================

/**
 * 운영 보고서 시스템 프롬프트
 */
export const OPS_REPORT_SYSTEM_PROMPT = `당신은 IT 운영 전문가이자 보고서 작성 전문가입니다.
운영 데이터를 분석하여 명확하고 실행 가능한 보고서를 작성합니다.

당신의 역할:
1. 운영 데이터 분석 및 요약
2. SLA 달성률 분석 및 개선점 도출
3. 장애 패턴 분석 및 근본 원인 파악
4. 구체적이고 실행 가능한 개선 제안
5. 다음 기간 계획 수립 지원

보고서 작성 원칙:
- 데이터 기반의 객관적 분석
- 명확하고 간결한 문장
- 실행 가능한 권장 사항 제시
- 정량적 지표와 정성적 분석의 균형
- 대상 독자에 맞는 언어 수준

출력 형식:
- JSON 형식으로 구조화된 결과 반환
- 한글로 작성 (기술 용어 제외)`;

/**
 * 운영 데이터 요약 프롬프트 생성
 *
 * @param data - 운영 데이터
 * @param options - 보고서 옵션
 * @returns 프롬프트 문자열
 */
export function createOperationsReportPrompt(
  data: OperationsDataInput,
  options: Partial<OperationsReportOptions> = {}
): string {
  const {
    reportType = 'monthly',
    detailLevel = 'detailed',
    audience = 'management',
  } = options;

  // 서비스 상태 요약
  const servicesText = data.services
    .map((s) => `- ${s.serviceName}: 가용성 ${s.availability}%, 응답시간 ${s.avgResponseTime}ms, 에러율 ${s.errorRate}%`)
    .join('\n');

  // SLA 메트릭 요약
  const slaText = data.slaMetrics
    .map((m) => `- ${m.name}: 목표 ${m.target}${m.unit}, 실제 ${m.actual}${m.unit} (${m.achieved ? '달성' : '미달성'})`)
    .join('\n');

  // 장애 요약
  const incidentText = data.incidents
    .map((i) => `- [${SEVERITY_LABELS[i.severity]}] ${i.title} (${i.occurredAt}, 다운타임: ${i.downtimeMinutes}분)`)
    .join('\n');

  // 개선사항 요약
  const improvementsText = data.improvements
    .map((i) => `- [${i.status}] ${i.title} (${IMPROVEMENT_CATEGORY_LABELS[i.category]}, ${i.priority} 우선순위)`)
    .join('\n');

  let prompt = `## 운영 보고서 작성 요청

### 보고서 정보
- **유형**: ${REPORT_TYPE_LABELS[reportType]} 보고서
- **기간**: ${data.period.startDate} ~ ${data.period.endDate}
- **상세 수준**: ${detailLevel}
- **대상 독자**: ${audience}

### 서비스 상태
${servicesText || '데이터 없음'}

### SLA 메트릭
${slaText || '데이터 없음'}

### 장애 이력
${incidentText || '장애 없음'}

### 진행 중인 개선사항
${improvementsText || '없음'}`;

  // 비용 데이터 추가
  if (data.costs) {
    prompt += `

### 비용 현황
- **인프라**: ${data.costs.currency} ${data.costs.infrastructure.toLocaleString()}
- **모니터링**: ${data.costs.currency} ${data.costs.monitoring.toLocaleString()}
- **지원**: ${data.costs.currency} ${data.costs.support.toLocaleString()}
- **총계**: ${data.costs.currency} ${data.costs.total.toLocaleString()} / 예산 ${data.costs.currency} ${data.costs.budget.toLocaleString()}`;
  }

  // 팀 데이터 추가
  if (data.team) {
    prompt += `

### 팀 현황
- **On-Call 교대 횟수**: ${data.team.onCallRotations}회
- **에스컬레이션**: ${data.team.escalations}건
- **평균 응답 시간**: ${data.team.avgResponseTime}분`;
  }

  prompt += `

## 요청 사항
1. **요약 (Executive Summary)**: 핵심 내용을 3-5문장으로 요약
2. **SLA 분석**: 달성률, 미달성 항목 원인 분석, 개선 권장사항
3. **장애 분석**: 패턴 분석, 근본 원인 분류, 예방 조치
4. **개선 제안**: 우선순위별 개선 항목, 예상 효과, 필요 리소스
5. **다음 달 계획**: 목표, 주요 작업, 예상 위험
6. **위험 요소**: 현재 파악된 운영 위험과 완화 방안
7. **핵심 지표**: 경영진/이해관계자가 확인해야 할 주요 지표

## 출력 형식
\`\`\`json
{
  "title": "보고서 제목",
  "period": "보고 기간",
  "executiveSummary": "핵심 요약",
  "slaAnalysis": {
    "overallAchievementRate": 숫자,
    "achievedCount": 숫자,
    "missedCount": 숫자,
    "analysis": "분석 내용",
    "missedSLADetails": [
      {
        "metric": "메트릭명",
        "gap": 차이값,
        "cause": "원인",
        "recommendation": "권장사항"
      }
    ]
  },
  "incidentAnalysis": {
    "totalIncidents": 숫자,
    "severityDistribution": {"critical": 숫자, "high": 숫자, "medium": 숫자, "low": 숫자},
    "totalDowntimeMinutes": 숫자,
    "meanTimeToRecovery": 숫자,
    "analysis": "분석 내용",
    "rootCauseAnalysis": [
      {
        "category": "원인 분류",
        "count": 숫자,
        "percentage": 숫자,
        "preventionMeasures": ["예방 조치1", "예방 조치2"]
      }
    ]
  },
  "improvementSuggestions": [
    {
      "id": "IMP-001",
      "category": "카테고리",
      "title": "제목",
      "description": "설명",
      "priority": "high|medium|low",
      "expectedBenefit": "예상 효과",
      "effort": "small|medium|large",
      "estimatedDuration": "예상 소요 시간"
    }
  ],
  "nextMonthPlan": {
    "objectives": ["목표1", "목표2"],
    "keyTasks": [
      {
        "task": "작업 내용",
        "owner": "담당자",
        "dueDate": "마감일",
        "priority": "high|medium|low"
      }
    ],
    "anticipatedRisks": ["예상 위험1", "예상 위험2"],
    "resourceRequirements": ["리소스 요구사항1"]
  },
  "risks": [
    {
      "id": "RISK-001",
      "title": "위험 제목",
      "description": "설명",
      "likelihood": "high|medium|low",
      "impact": "high|medium|low",
      "mitigation": "완화 방안"
    }
  ],
  "keyMetrics": [
    {
      "name": "지표명",
      "value": 값,
      "target": 목표값,
      "unit": "단위",
      "status": "good|warning|critical",
      "change": {"value": 변화량, "direction": "up|down|stable"}
    }
  ]
}
\`\`\``;

  return prompt;
}

/**
 * SLA 분석 프롬프트 생성
 *
 * @param slaMetrics - SLA 메트릭 목록
 * @param period - 분석 기간
 * @returns 프롬프트 문자열
 */
export function createSLAAnalysisPrompt(
  slaMetrics: SLAMetric[],
  period: { startDate: string; endDate: string }
): string {
  const metricsText = slaMetrics
    .map((m) => {
      const status = m.achieved ? 'O' : 'X';
      const gap = m.achieved ? '-' : `${Math.abs(m.target - m.actual).toFixed(2)}${m.unit} 미달`;
      return `| ${m.name} | ${m.target}${m.unit} | ${m.actual}${m.unit} | ${status} | ${gap} | ${m.trend} |`;
    })
    .join('\n');

  return `## SLA 분석 요청

### 분석 기간
${period.startDate} ~ ${period.endDate}

### SLA 메트릭
| 메트릭 | 목표 | 실제 | 달성 | 차이 | 추세 |
|--------|------|------|------|------|------|
${metricsText}

### 요청 사항
1. 전체 SLA 달성률 계산
2. 미달성 항목에 대한 원인 분석
3. 각 미달성 항목에 대한 개선 권장사항
4. 추세 분석 및 예측

### 출력 형식
\`\`\`json
{
  "overallAchievementRate": 숫자,
  "analysis": "종합 분석",
  "missedSLADetails": [
    {
      "metric": "메트릭명",
      "gap": 차이값,
      "cause": "추정 원인",
      "recommendation": "개선 권장사항",
      "timeline": "개선 예상 시간"
    }
  ],
  "trend": "전반적인 추세 분석",
  "forecast": "다음 달 예측"
}
\`\`\``;
}

/**
 * 장애 원인 분석 프롬프트 생성
 *
 * @param incidents - 장애 기록 목록
 * @returns 프롬프트 문자열
 */
export function createIncidentAnalysisPrompt(incidents: IncidentRecord[]): string {
  if (incidents.length === 0) {
    return `## 장애 분석 요청

분석 기간 동안 발생한 장애가 없습니다.
무장애 운영에 대한 긍정적인 평가와 지속적인 모니터링 권장사항을 제공해주세요.`;
  }

  const incidentsText = incidents
    .map((i) => {
      const duration = i.resolvedAt
        ? `${i.downtimeMinutes}분`
        : '진행중';
      return `### ${i.id}: ${i.title}
- **심각도**: ${SEVERITY_LABELS[i.severity]}
- **발생**: ${i.occurredAt}
- **해결**: ${i.resolvedAt || '미해결'}
- **소요시간**: ${duration}
- **영향**: ${i.impact}
- **영향 서비스**: ${i.affectedServices.join(', ')}
- **근본원인**: ${i.rootCause || '분석 중'}
- **조치**: ${i.resolution || '진행 중'}`;
    })
    .join('\n\n');

  return `## 장애 원인 분석 요청

### 장애 목록
${incidentsText}

### 요청 사항
1. 장애 패턴 분석 (시간대, 서비스, 유형별)
2. 근본 원인 분류 및 통계
3. 각 원인별 예방 조치 제안
4. MTTR (평균 복구 시간) 분석
5. 개선 우선순위 도출

### 출력 형식
\`\`\`json
{
  "totalIncidents": 숫자,
  "totalDowntimeMinutes": 숫자,
  "meanTimeToRecovery": 숫자,
  "patternAnalysis": "패턴 분석 결과",
  "rootCauseAnalysis": [
    {
      "category": "원인 분류",
      "count": 숫자,
      "percentage": 숫자,
      "examples": ["예시1"],
      "preventionMeasures": ["예방 조치1", "예방 조치2"]
    }
  ],
  "recommendations": ["권장사항1", "권장사항2"],
  "prioritizedActions": [
    {
      "action": "조치 내용",
      "priority": "high|medium|low",
      "expectedImpact": "예상 효과",
      "effort": "small|medium|large"
    }
  ]
}
\`\`\``;
}

/**
 * 다음 달 계획 프롬프트 생성
 *
 * @param currentImprovements - 현재 개선사항
 * @param currentRisks - 현재 위험
 * @param slaGaps - SLA 미달성 항목
 * @returns 프롬프트 문자열
 */
export function createNextMonthPlanPrompt(
  currentImprovements: ImprovementItem[],
  currentRisks: Array<{ title: string; severity: string }>,
  slaGaps: Array<{ metric: string; gap: number }>
): string {
  const improvementsText = currentImprovements
    .map((i) => `- [${i.status}] ${i.title} (${i.priority})`)
    .join('\n');

  const risksText = currentRisks
    .map((r) => `- [${r.severity}] ${r.title}`)
    .join('\n');

  const slaGapsText = slaGaps
    .map((g) => `- ${g.metric}: ${g.gap} 미달`)
    .join('\n');

  return `## 다음 달 계획 수립 요청

### 현재 진행 중인 개선사항
${improvementsText || '없음'}

### 현재 파악된 위험
${risksText || '없음'}

### SLA 미달성 항목
${slaGapsText || '없음'}

### 요청 사항
1. 다음 달 목표 설정 (3-5개)
2. 주요 작업 목록 (담당자, 마감일, 우선순위 포함)
3. 예상 위험 및 대응 계획
4. 필요 리소스 파악

### 출력 형식
\`\`\`json
{
  "objectives": ["목표1", "목표2", "목표3"],
  "keyTasks": [
    {
      "task": "작업 내용",
      "owner": "담당 역할",
      "dueDate": "마감일 (주차 또는 날짜)",
      "priority": "high|medium|low",
      "dependencies": ["선행 작업"]
    }
  ],
  "anticipatedRisks": ["위험1", "위험2"],
  "contingencyPlans": [
    {
      "risk": "위험",
      "plan": "대응 계획"
    }
  ],
  "resourceRequirements": [
    {
      "type": "리소스 유형",
      "description": "설명",
      "justification": "필요 사유"
    }
  ]
}
\`\`\``;
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * SLA 달성률 계산
 *
 * @param metrics - SLA 메트릭 목록
 * @returns 달성률 (0-100)
 */
export function calculateSLAAchievementRate(metrics: SLAMetric[]): number {
  if (metrics.length === 0) return 100;

  const achievedCount = metrics.filter((m) => m.achieved).length;
  return Math.round((achievedCount / metrics.length) * 100);
}

/**
 * 평균 복구 시간 계산 (MTTR)
 *
 * @param incidents - 장애 기록 목록
 * @returns 평균 복구 시간 (분)
 */
export function calculateMTTR(incidents: IncidentRecord[]): number {
  const resolvedIncidents = incidents.filter((i) => i.resolvedAt !== null);

  if (resolvedIncidents.length === 0) return 0;

  const totalDowntime = resolvedIncidents.reduce(
    (sum, i) => sum + i.downtimeMinutes,
    0
  );

  return Math.round(totalDowntime / resolvedIncidents.length);
}

/**
 * 심각도별 장애 분포 계산
 *
 * @param incidents - 장애 기록 목록
 * @returns 심각도별 건수
 */
export function calculateSeverityDistribution(
  incidents: IncidentRecord[]
): Record<string, number> {
  const distribution: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  incidents.forEach((i) => {
    distribution[i.severity]++;
  });

  return distribution;
}

/**
 * 총 다운타임 계산
 *
 * @param incidents - 장애 기록 목록
 * @returns 총 다운타임 (분)
 */
export function calculateTotalDowntime(incidents: IncidentRecord[]): number {
  return incidents.reduce((sum, i) => sum + i.downtimeMinutes, 0);
}

/**
 * 가용성 계산
 *
 * @param totalMinutes - 전체 시간 (분)
 * @param downtimeMinutes - 다운타임 (분)
 * @returns 가용성 (%)
 */
export function calculateAvailability(
  totalMinutes: number,
  downtimeMinutes: number
): number {
  if (totalMinutes === 0) return 100;
  return Number((((totalMinutes - downtimeMinutes) / totalMinutes) * 100).toFixed(3));
}

/**
 * JSON 응답을 OperationsReportResult로 파싱
 *
 * @param jsonString - JSON 문자열
 * @returns 파싱된 보고서 결과
 * @throws {Error} 파싱 실패 시
 */
export function parseOperationsReportResponse(
  jsonString: string
): OperationsReportResult {
  // JSON 블록 추출 (```json ... ``` 형식 처리)
  const jsonMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
  const cleanJson = jsonMatch ? jsonMatch[1] : jsonString;

  try {
    const parsed = JSON.parse(cleanJson);

    // 기본값으로 결과 구성
    const result: OperationsReportResult = {
      title: parsed.title || '운영 보고서',
      period: parsed.period || '',
      executiveSummary: parsed.executiveSummary || '',
      slaAnalysis: parsed.slaAnalysis || {
        overallAchievementRate: 0,
        achievedCount: 0,
        missedCount: 0,
        analysis: '',
        missedSLADetails: [],
      },
      incidentAnalysis: parsed.incidentAnalysis || {
        totalIncidents: 0,
        severityDistribution: {},
        totalDowntimeMinutes: 0,
        meanTimeToRecovery: 0,
        analysis: '',
        rootCauseAnalysis: [],
      },
      improvementSuggestions: parsed.improvementSuggestions || [],
      nextMonthPlan: parsed.nextMonthPlan || {
        objectives: [],
        keyTasks: [],
        anticipatedRisks: [],
        resourceRequirements: [],
      },
      risks: parsed.risks || [],
      keyMetrics: parsed.keyMetrics || [],
    };

    return result;
  } catch (error) {
    throw new Error(
      `운영 보고서 응답 파싱 실패: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 월간 운영 보고서 기본 데이터 생성
 *
 * @param year - 연도
 * @param month - 월 (1-12)
 * @returns 기본 운영 데이터
 */
export function createDefaultMonthlyReportData(
  year: number,
  month: number
): Partial<OperationsDataInput> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  return {
    period: {
      startDate,
      endDate,
    },
    services: [],
    slaMetrics: [],
    incidents: [],
    improvements: [],
  };
}

export default {
  // 프롬프트 생성
  createOperationsReportPrompt,
  createSLAAnalysisPrompt,
  createIncidentAnalysisPrompt,
  createNextMonthPlanPrompt,
  // 헬퍼 함수
  calculateSLAAchievementRate,
  calculateMTTR,
  calculateSeverityDistribution,
  calculateTotalDowntime,
  calculateAvailability,
  parseOperationsReportResponse,
  createDefaultMonthlyReportData,
  // 상수
  OPS_REPORT_SYSTEM_PROMPT,
  REPORT_TYPE_LABELS,
  SEVERITY_LABELS,
  IMPROVEMENT_CATEGORY_LABELS,
  STATUS_LABELS,
};
