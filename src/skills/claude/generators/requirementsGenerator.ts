/**
 * Minu Frame - 요구사항 작성 보조 생성기
 *
 * Claude AI를 활용하여 사용자 스토리를 기능 요구사항으로 변환하고,
 * 비기능 요구사항을 자동으로 제안하며, MoSCoW 우선순위를 분류합니다.
 *
 * @module skills/claude/generators/requirementsGenerator
 */

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * MoSCoW 우선순위
 */
export type MoSCoWPriority = 'must' | 'should' | 'could' | 'wont';

/**
 * 요구사항 카테고리
 */
export type RequirementCategory =
  | 'functional'      // 기능 요구사항
  | 'non_functional'  // 비기능 요구사항
  | 'constraint'      // 제약사항
  | 'assumption';     // 가정

/**
 * 비기능 요구사항 유형
 */
export type NonFunctionalType =
  | 'performance'     // 성능
  | 'security'        // 보안
  | 'scalability'     // 확장성
  | 'usability'       // 사용성
  | 'reliability'     // 신뢰성
  | 'maintainability' // 유지보수성
  | 'accessibility'   // 접근성
  | 'compliance';     // 규정 준수

/**
 * 사용자 스토리 입력
 */
export interface UserStoryInput {
  /** 스토리 ID */
  id: string;
  /** 스토리 제목 */
  title: string;
  /** 역할 (As a...) */
  asA: string;
  /** 원하는 기능 (I want...) */
  iWant: string;
  /** 목적 (So that...) */
  soThat: string;
  /** 인수 조건 */
  acceptanceCriteria?: string[];
  /** 추가 컨텍스트 */
  context?: string;
}

/**
 * 기능 요구사항
 */
export interface FunctionalRequirement {
  /** 요구사항 ID */
  id: string;
  /** 원본 스토리 ID */
  storyId: string;
  /** 요구사항 제목 */
  title: string;
  /** 상세 설명 */
  description: string;
  /** 우선순위 */
  priority: MoSCoWPriority;
  /** 인수 조건 */
  acceptanceCriteria: string[];
  /** 예상 복잡도 (1-5) */
  complexity: number;
  /** 의존성 */
  dependencies?: string[];
}

/**
 * 비기능 요구사항
 */
export interface NonFunctionalRequirement {
  /** 요구사항 ID */
  id: string;
  /** 유형 */
  type: NonFunctionalType;
  /** 요구사항 제목 */
  title: string;
  /** 상세 설명 */
  description: string;
  /** 측정 가능한 기준 */
  measurableCriteria: string;
  /** 우선순위 */
  priority: MoSCoWPriority;
  /** 적용 범위 */
  scope: 'global' | 'specific';
  /** 관련 기능 요구사항 ID (scope가 specific인 경우) */
  relatedRequirements?: string[];
}

/**
 * 요구사항 분석 결과
 */
export interface RequirementsAnalysisResult {
  /** 기능 요구사항 목록 */
  functionalRequirements: FunctionalRequirement[];
  /** 비기능 요구사항 목록 */
  nonFunctionalRequirements: NonFunctionalRequirement[];
  /** 분석 요약 */
  summary: AnalysisSummary;
  /** 위험 요소 */
  risks: RiskItem[];
  /** 추가 권장사항 */
  recommendations: string[];
}

/**
 * 분석 요약
 */
export interface AnalysisSummary {
  /** 총 기능 요구사항 수 */
  totalFunctional: number;
  /** 총 비기능 요구사항 수 */
  totalNonFunctional: number;
  /** 우선순위별 분포 */
  priorityDistribution: Record<MoSCoWPriority, number>;
  /** 예상 총 복잡도 */
  totalComplexity: number;
  /** 주요 위험 수 */
  highRiskCount: number;
}

/**
 * 위험 항목
 */
export interface RiskItem {
  /** 위험 ID */
  id: string;
  /** 위험 제목 */
  title: string;
  /** 설명 */
  description: string;
  /** 심각도 */
  severity: 'high' | 'medium' | 'low';
  /** 완화 방안 */
  mitigation: string;
  /** 관련 요구사항 ID */
  relatedRequirements: string[];
}

/**
 * 요구사항 분석 옵션
 */
export interface RequirementsAnalysisOptions {
  /** 프로젝트 도메인 */
  domain?: string;
  /** 기술 스택 */
  techStack?: string[];
  /** 규정 준수 요구사항 (GDPR, WCAG 등) */
  complianceRequirements?: string[];
  /** 성능 목표 */
  performanceTargets?: {
    responseTime?: string;
    throughput?: string;
    availability?: string;
  };
  /** 자동 비기능 요구사항 생성 여부 */
  autoGenerateNFR?: boolean;
  /** 언어 */
  language?: 'ko' | 'en';
}

// ============================================================================
// 상수 정의
// ============================================================================

/**
 * MoSCoW 우선순위 라벨
 */
export const MOSCOW_LABELS: Record<MoSCoWPriority, string> = {
  must: '필수 (Must Have)',
  should: '권장 (Should Have)',
  could: '선택 (Could Have)',
  wont: '제외 (Won\'t Have)',
};

/**
 * 비기능 요구사항 유형 라벨
 */
export const NFR_TYPE_LABELS: Record<NonFunctionalType, string> = {
  performance: '성능',
  security: '보안',
  scalability: '확장성',
  usability: '사용성',
  reliability: '신뢰성',
  maintainability: '유지보수성',
  accessibility: '접근성',
  compliance: '규정 준수',
};

/**
 * 기본 비기능 요구사항 템플릿
 */
export const DEFAULT_NFR_TEMPLATES: Record<NonFunctionalType, Partial<NonFunctionalRequirement>> = {
  performance: {
    title: '시스템 응답 시간',
    description: '사용자 요청에 대한 시스템 응답 시간 요구사항',
    measurableCriteria: '모든 API 응답 시간 < 200ms (P95)',
    priority: 'should',
    scope: 'global',
  },
  security: {
    title: '데이터 암호화',
    description: '민감한 데이터의 암호화 및 보호',
    measurableCriteria: '전송 중 TLS 1.3, 저장 시 AES-256 암호화',
    priority: 'must',
    scope: 'global',
  },
  scalability: {
    title: '동시 사용자 처리',
    description: '시스템의 동시 접속자 처리 능력',
    measurableCriteria: '최소 1,000명 동시 접속 지원',
    priority: 'should',
    scope: 'global',
  },
  usability: {
    title: '사용자 인터페이스 일관성',
    description: 'UI/UX 디자인 일관성 및 직관성',
    measurableCriteria: 'SUS (System Usability Scale) 점수 > 70',
    priority: 'should',
    scope: 'global',
  },
  reliability: {
    title: '시스템 가용성',
    description: '시스템의 안정적인 운영 보장',
    measurableCriteria: '가용성 99.9% (월간 다운타임 < 43분)',
    priority: 'must',
    scope: 'global',
  },
  maintainability: {
    title: '코드 품질',
    description: '유지보수 가능한 코드 품질 유지',
    measurableCriteria: 'SonarQube 기술 부채 < 5%, 테스트 커버리지 > 80%',
    priority: 'should',
    scope: 'global',
  },
  accessibility: {
    title: '웹 접근성 준수',
    description: '장애인 및 고령자의 웹 접근성 보장',
    measurableCriteria: 'WCAG 2.1 AA 수준 준수',
    priority: 'should',
    scope: 'global',
  },
  compliance: {
    title: '개인정보 보호',
    description: '개인정보 보호 관련 법규 준수',
    measurableCriteria: 'GDPR, 개인정보보호법 준수',
    priority: 'must',
    scope: 'global',
  },
};

// ============================================================================
// 프롬프트 템플릿
// ============================================================================

/**
 * 요구사항 분석 시스템 프롬프트
 */
export const REQUIREMENTS_ANALYSIS_SYSTEM_PROMPT = `당신은 소프트웨어 요구사항 분석 전문가입니다.
사용자 스토리를 분석하여 명확하고 테스트 가능한 기능 요구사항으로 변환합니다.

당신의 역할:
1. 사용자 스토리를 기능 요구사항으로 변환
2. 누락된 인수 조건 식별 및 제안
3. 요구사항 간 의존성 파악
4. 잠재적 위험 요소 식별
5. MoSCoW 우선순위 분류

요구사항 작성 원칙:
- 각 요구사항은 독립적이고 테스트 가능해야 함
- 명확하고 구체적인 언어 사용
- 모호한 표현 (예: "빠른", "많은") 대신 측정 가능한 기준 제시
- 구현 방법이 아닌 "무엇을" 해야 하는지에 집중

출력 형식:
- JSON 형식으로 구조화된 결과 반환
- 한글로 작성 (코드/기술 용어 제외)`;

/**
 * 사용자 스토리 분석 프롬프트 생성
 *
 * @param stories - 사용자 스토리 목록
 * @param options - 분석 옵션
 * @returns 프롬프트 문자열
 */
export function createRequirementsAnalysisPrompt(
  stories: UserStoryInput[],
  options: RequirementsAnalysisOptions = {}
): string {
  const {
    domain = '일반',
    techStack = [],
    complianceRequirements = [],
    performanceTargets = {},
    autoGenerateNFR = true,
  } = options;

  const storiesText = stories
    .map((story, index) => {
      let storyText = `
### 스토리 ${index + 1}: ${story.title}
- **ID**: ${story.id}
- **역할**: ${story.asA}
- **원하는 기능**: ${story.iWant}
- **목적**: ${story.soThat}`;

      if (story.acceptanceCriteria?.length) {
        storyText += `\n- **인수 조건**:\n${story.acceptanceCriteria.map((ac) => `  - ${ac}`).join('\n')}`;
      }

      if (story.context) {
        storyText += `\n- **추가 컨텍스트**: ${story.context}`;
      }

      return storyText;
    })
    .join('\n');

  let prompt = `## 프로젝트 정보
- **도메인**: ${domain}
- **기술 스택**: ${techStack.length > 0 ? techStack.join(', ') : '미정'}
- **규정 준수**: ${complianceRequirements.length > 0 ? complianceRequirements.join(', ') : '없음'}`;

  if (Object.keys(performanceTargets).length > 0) {
    prompt += `\n- **성능 목표**:`;
    if (performanceTargets.responseTime) {
      prompt += `\n  - 응답 시간: ${performanceTargets.responseTime}`;
    }
    if (performanceTargets.throughput) {
      prompt += `\n  - 처리량: ${performanceTargets.throughput}`;
    }
    if (performanceTargets.availability) {
      prompt += `\n  - 가용성: ${performanceTargets.availability}`;
    }
  }

  prompt += `

## 분석할 사용자 스토리
${storiesText}

## 요청 사항
1. 각 사용자 스토리를 분석하여 기능 요구사항(Functional Requirements)으로 변환해주세요.
2. 각 요구사항에 MoSCoW 우선순위를 부여해주세요.
3. 누락되었거나 모호한 인수 조건을 보완해주세요.
4. 요구사항 간 의존성을 파악해주세요.
5. 잠재적 위험 요소를 식별하고 완화 방안을 제시해주세요.`;

  if (autoGenerateNFR) {
    prompt += `
6. 프로젝트에 적합한 비기능 요구사항(Non-Functional Requirements)을 제안해주세요.
   - 성능, 보안, 확장성, 사용성, 신뢰성, 유지보수성, 접근성, 규정 준수 측면 고려`;
  }

  prompt += `

## 출력 형식
다음 JSON 형식으로 응답해주세요:
\`\`\`json
{
  "functionalRequirements": [
    {
      "id": "FR-001",
      "storyId": "US-001",
      "title": "요구사항 제목",
      "description": "상세 설명",
      "priority": "must|should|could|wont",
      "acceptanceCriteria": ["인수 조건 1", "인수 조건 2"],
      "complexity": 1-5,
      "dependencies": ["FR-002"]
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-001",
      "type": "performance|security|scalability|usability|reliability|maintainability|accessibility|compliance",
      "title": "요구사항 제목",
      "description": "상세 설명",
      "measurableCriteria": "측정 가능한 기준",
      "priority": "must|should|could|wont",
      "scope": "global|specific",
      "relatedRequirements": ["FR-001"]
    }
  ],
  "risks": [
    {
      "id": "RISK-001",
      "title": "위험 제목",
      "description": "위험 설명",
      "severity": "high|medium|low",
      "mitigation": "완화 방안",
      "relatedRequirements": ["FR-001"]
    }
  ],
  "recommendations": ["권장사항 1", "권장사항 2"]
}
\`\`\``;

  return prompt;
}

/**
 * 우선순위 분류 프롬프트 생성
 *
 * @param requirements - 요구사항 목록
 * @param constraints - 제약 조건
 * @returns 프롬프트 문자열
 */
export function createPriorityClassificationPrompt(
  requirements: Array<{ id: string; title: string; description: string }>,
  constraints: {
    deadline?: string;
    budget?: string;
    teamSize?: number;
    criticalFeatures?: string[];
  } = {}
): string {
  const requirementsText = requirements
    .map((req) => `- **${req.id}**: ${req.title}\n  설명: ${req.description}`)
    .join('\n');

  let prompt = `## 우선순위 분류 요청

다음 요구사항들을 MoSCoW 방법론에 따라 분류해주세요.

### MoSCoW 기준
- **Must Have (필수)**: 프로젝트 성공에 반드시 필요, 없으면 출시 불가
- **Should Have (권장)**: 중요하지만 우회 방법 존재, 다음 릴리스 가능
- **Could Have (선택)**: 있으면 좋지만 없어도 됨, 리소스 여유 시 구현
- **Won't Have (제외)**: 이번 범위에서 제외, 향후 고려

### 제약 조건`;

  if (constraints.deadline) {
    prompt += `\n- **마감일**: ${constraints.deadline}`;
  }
  if (constraints.budget) {
    prompt += `\n- **예산**: ${constraints.budget}`;
  }
  if (constraints.teamSize) {
    prompt += `\n- **팀 규모**: ${constraints.teamSize}명`;
  }
  if (constraints.criticalFeatures?.length) {
    prompt += `\n- **핵심 기능**: ${constraints.criticalFeatures.join(', ')}`;
  }

  prompt += `

### 분류할 요구사항
${requirementsText}

### 출력 형식
\`\`\`json
{
  "classifications": [
    {
      "id": "요구사항 ID",
      "priority": "must|should|could|wont",
      "rationale": "분류 이유"
    }
  ],
  "summary": {
    "must": 개수,
    "should": 개수,
    "could": 개수,
    "wont": 개수
  }
}
\`\`\``;

  return prompt;
}

/**
 * 비기능 요구사항 제안 프롬프트 생성
 *
 * @param domain - 프로젝트 도메인
 * @param functionalRequirements - 기능 요구사항 목록
 * @param existingNFRs - 기존 비기능 요구사항
 * @returns 프롬프트 문자열
 */
export function createNFRSuggestionPrompt(
  domain: string,
  functionalRequirements: Array<{ id: string; title: string }>,
  existingNFRs: NonFunctionalType[] = []
): string {
  const frList = functionalRequirements
    .map((fr) => `- ${fr.id}: ${fr.title}`)
    .join('\n');

  const missingTypes = (Object.keys(NFR_TYPE_LABELS) as NonFunctionalType[])
    .filter((type) => !existingNFRs.includes(type));

  return `## 비기능 요구사항 제안 요청

### 프로젝트 정보
- **도메인**: ${domain}

### 기능 요구사항 목록
${frList}

### 이미 정의된 비기능 요구사항 유형
${existingNFRs.length > 0 ? existingNFRs.map((t) => NFR_TYPE_LABELS[t]).join(', ') : '없음'}

### 추가 제안이 필요한 유형
${missingTypes.map((t) => NFR_TYPE_LABELS[t]).join(', ')}

### 요청 사항
1. 프로젝트 도메인과 기능 요구사항을 고려하여 적절한 비기능 요구사항을 제안해주세요.
2. 각 요구사항에는 측정 가능한 기준을 포함해주세요.
3. 우선순위와 적용 범위를 명시해주세요.

### 출력 형식
\`\`\`json
{
  "suggestions": [
    {
      "type": "performance|security|scalability|usability|reliability|maintainability|accessibility|compliance",
      "title": "요구사항 제목",
      "description": "상세 설명",
      "measurableCriteria": "측정 가능한 기준",
      "priority": "must|should|could|wont",
      "scope": "global|specific",
      "relatedRequirements": ["FR-001"],
      "rationale": "제안 이유"
    }
  ]
}
\`\`\``;
}

// ============================================================================
// 변환 함수
// ============================================================================

/**
 * 사용자 스토리를 표준 형식 문자열로 변환
 *
 * @param story - 사용자 스토리
 * @returns 표준 형식 문자열
 *
 * @example
 * ```typescript
 * const story = {
 *   id: 'US-001',
 *   title: '로그인',
 *   asA: '등록된 사용자',
 *   iWant: '이메일과 비밀번호로 로그인',
 *   soThat: '개인화된 서비스를 이용할 수 있다'
 * };
 * const formatted = formatUserStory(story);
 * // "As a 등록된 사용자, I want 이메일과 비밀번호로 로그인, so that 개인화된 서비스를 이용할 수 있다."
 * ```
 */
export function formatUserStory(story: UserStoryInput): string {
  return `As a ${story.asA}, I want ${story.iWant}, so that ${story.soThat}.`;
}

/**
 * 분석 결과에서 요약 정보 생성
 *
 * @param result - 분석 결과
 * @returns 분석 요약
 */
export function generateAnalysisSummary(
  result: Pick<RequirementsAnalysisResult, 'functionalRequirements' | 'nonFunctionalRequirements' | 'risks'>
): AnalysisSummary {
  const { functionalRequirements, nonFunctionalRequirements, risks } = result;

  const priorityDistribution: Record<MoSCoWPriority, number> = {
    must: 0,
    should: 0,
    could: 0,
    wont: 0,
  };

  // 기능 요구사항 우선순위 집계
  functionalRequirements.forEach((fr) => {
    priorityDistribution[fr.priority]++;
  });

  // 비기능 요구사항 우선순위 집계
  nonFunctionalRequirements.forEach((nfr) => {
    priorityDistribution[nfr.priority]++;
  });

  // 총 복잡도 계산
  const totalComplexity = functionalRequirements.reduce(
    (sum, fr) => sum + fr.complexity,
    0
  );

  // 높은 위험 수 계산
  const highRiskCount = risks.filter((risk) => risk.severity === 'high').length;

  return {
    totalFunctional: functionalRequirements.length,
    totalNonFunctional: nonFunctionalRequirements.length,
    priorityDistribution,
    totalComplexity,
    highRiskCount,
  };
}

/**
 * JSON 응답을 RequirementsAnalysisResult로 파싱
 *
 * @param jsonString - JSON 문자열
 * @returns 파싱된 분석 결과
 * @throws {Error} 파싱 실패 시
 */
export function parseRequirementsAnalysisResponse(
  jsonString: string
): RequirementsAnalysisResult {
  // JSON 블록 추출 (```json ... ``` 형식 처리)
  const jsonMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
  const cleanJson = jsonMatch ? jsonMatch[1] : jsonString;

  try {
    const parsed = JSON.parse(cleanJson);

    // 필수 필드 검증
    if (!Array.isArray(parsed.functionalRequirements)) {
      throw new Error('functionalRequirements 필드가 없거나 배열이 아닙니다.');
    }

    // 기본값 설정
    const result: RequirementsAnalysisResult = {
      functionalRequirements: parsed.functionalRequirements || [],
      nonFunctionalRequirements: parsed.nonFunctionalRequirements || [],
      risks: parsed.risks || [],
      recommendations: parsed.recommendations || [],
      summary: generateAnalysisSummary({
        functionalRequirements: parsed.functionalRequirements || [],
        nonFunctionalRequirements: parsed.nonFunctionalRequirements || [],
        risks: parsed.risks || [],
      }),
    };

    return result;
  } catch (error) {
    throw new Error(
      `요구사항 분석 응답 파싱 실패: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 기본 비기능 요구사항 생성
 *
 * @param types - 생성할 비기능 요구사항 유형
 * @param startId - 시작 ID 번호
 * @returns 비기능 요구사항 목록
 */
export function generateDefaultNFRs(
  types: NonFunctionalType[] = ['security', 'performance', 'reliability'],
  startId: number = 1
): NonFunctionalRequirement[] {
  return types.map((type, index) => {
    const template = DEFAULT_NFR_TEMPLATES[type];
    return {
      id: `NFR-${String(startId + index).padStart(3, '0')}`,
      type,
      title: template.title || NFR_TYPE_LABELS[type],
      description: template.description || '',
      measurableCriteria: template.measurableCriteria || '',
      priority: template.priority || 'should',
      scope: template.scope || 'global',
      relatedRequirements: [],
    };
  });
}

/**
 * 요구사항 ID 생성
 *
 * @param prefix - ID 접두사 (예: 'FR', 'NFR', 'US')
 * @param index - 인덱스 번호
 * @returns 생성된 ID (예: 'FR-001')
 */
export function generateRequirementId(prefix: string, index: number): string {
  return `${prefix}-${String(index).padStart(3, '0')}`;
}

/**
 * 요구사항 복잡도 추정
 *
 * @param description - 요구사항 설명
 * @param acceptanceCriteria - 인수 조건 수
 * @param dependencies - 의존성 수
 * @returns 복잡도 (1-5)
 */
export function estimateComplexity(
  description: string,
  acceptanceCriteria: number,
  dependencies: number
): number {
  let complexity = 1;

  // 설명 길이에 따른 복잡도
  if (description.length > 500) complexity += 2;
  else if (description.length > 200) complexity += 1;

  // 인수 조건 수에 따른 복잡도
  if (acceptanceCriteria > 5) complexity += 1;

  // 의존성 수에 따른 복잡도
  if (dependencies > 2) complexity += 1;

  return Math.min(complexity, 5);
}

export default {
  // 프롬프트 생성
  createRequirementsAnalysisPrompt,
  createPriorityClassificationPrompt,
  createNFRSuggestionPrompt,
  // 변환 함수
  formatUserStory,
  generateAnalysisSummary,
  parseRequirementsAnalysisResponse,
  generateDefaultNFRs,
  generateRequirementId,
  estimateComplexity,
  // 상수
  REQUIREMENTS_ANALYSIS_SYSTEM_PROMPT,
  MOSCOW_LABELS,
  NFR_TYPE_LABELS,
  DEFAULT_NFR_TEMPLATES,
};
