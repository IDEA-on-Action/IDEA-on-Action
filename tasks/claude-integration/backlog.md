# Claude AI 통합 - Backlog

> Sprint 1, 2 이후 구현 예정인 향후 기능 목록

**마지막 업데이트**: 2025-11-24
**관련 명세**: [spec/claude-integration/requirements.md](../../spec/claude-integration/requirements.md)
**관련 설계**: [plan/claude-integration/architecture.md](../../plan/claude-integration/architecture.md)

---

## 개요

Sprint 1, 2에서 기본 인프라와 Minu 서비스 통합이 완료된 후, 추가적으로 구현할 수 있는 고급 기능들을 정리한 백로그입니다.

---

## 우선순위 레벨

- **P0**: 필수 (다음 스프린트에 반드시 포함)
- **P1**: 높음 (2-3주 내 구현 권장)
- **P2**: 중간 (1-2개월 내 구현)
- **P3**: 낮음 (장기 로드맵)

---

## 백로그 항목

### BL-AI-001: Vision API 통합 (이미지 분석)

**우선순위**: P1
**예상 시간**: 6시간
**의존성**: Sprint 1 완료

**설명**:
Claude의 Vision 기능을 활용하여 이미지 분석 기능을 추가합니다.

**사용 사례**:
- UI/UX 디자인 시안 분석 및 피드백
- 다이어그램/플로우차트 해석
- 스크린샷 기반 버그 리포트 분석
- 와이어프레임 → 요구사항 추출

**구현 범위**:
```typescript
// src/hooks/useClaudeVision.ts

interface VisionRequest {
  image: File | string; // File 또는 base64/URL
  prompt: string;
  maxTokens?: number;
}

interface UseClaudeVisionResult {
  analyzeImage: (request: VisionRequest) => Promise<string>;
  isAnalyzing: boolean;
  error: ClaudeError | null;
}
```

**완료 조건**:
- [ ] Edge Function vision 엔드포인트 추가
- [ ] useClaudeVision 훅 구현
- [ ] 이미지 업로드 UI 컴포넌트
- [ ] 파일 크기/형식 검증 (최대 5MB, PNG/JPG/GIF/WEBP)
- [ ] E2E 테스트 5개

---

### BL-AI-002: 멀티턴 대화 컨텍스트 관리

**우선순위**: P1
**예상 시간**: 8시간
**의존성**: Sprint 1 완료

**설명**:
장기 대화 세션을 위한 컨텍스트 관리 시스템을 구현합니다.

**기능**:
- 대화 세션 저장/불러오기
- 컨텍스트 요약 (토큰 절약)
- 대화 분기 (Fork)
- 대화 내보내기 (Markdown)

**구현 범위**:
```typescript
// src/hooks/useConversationManager.ts

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  systemPrompt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    service?: MinuService;
    projectId?: string;
    tags?: string[];
  };
}

interface UseConversationManagerResult {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  createConversation: (title: string, systemPrompt?: string) => Promise<Conversation>;
  loadConversation: (id: string) => Promise<void>;
  saveConversation: () => Promise<void>;
  forkConversation: (fromMessageIndex: number) => Promise<Conversation>;
  summarizeContext: () => Promise<void>;
  exportToMarkdown: () => string;
  deleteConversation: (id: string) => Promise<void>;
}
```

**DB 스키마**:
```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  system_prompt TEXT,
  metadata JSONB DEFAULT '{}',
  parent_id UUID REFERENCES ai_conversations(id),
  fork_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**완료 조건**:
- [ ] ai_conversations 테이블 마이그레이션
- [ ] useConversationManager 훅 구현
- [ ] 대화 목록 UI
- [ ] 컨텍스트 요약 기능 (10개 이상 메시지 시 자동)
- [ ] E2E 테스트 6개

---

### BL-AI-003: 함수 호출 (Tool Use)

**우선순위**: P2
**예상 시간**: 10시간
**의존성**: Sprint 1 완료

**설명**:
Claude의 Tool Use 기능을 활용하여 AI가 시스템 함수를 호출할 수 있게 합니다.

**사용 사례**:
- "이 프로젝트의 이슈 목록을 보여줘" → 이슈 조회 함수 호출
- "다음 주 일정을 추가해줘" → 일정 생성 함수 호출
- "보고서를 PDF로 내보내줘" → PDF 생성 함수 호출

**구현 범위**:
```typescript
// src/lib/claude/tools.ts

interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
  permissions: string[]; // 필요한 권한
}

interface ToolRegistry {
  register: (tool: ToolDefinition) => void;
  unregister: (name: string) => void;
  getTools: () => ToolDefinition[];
  execute: (name: string, params: Record<string, unknown>) => Promise<unknown>;
}

// 기본 도구 예시
const defaultTools: ToolDefinition[] = [
  {
    name: 'get_project_issues',
    description: '프로젝트의 이슈 목록을 조회합니다.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: '프로젝트 ID' },
        status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'] },
        limit: { type: 'number', default: 10 },
      },
      required: ['projectId'],
    },
    handler: async (params) => {
      // Supabase 쿼리 실행
    },
    permissions: ['issues:read'],
  },
  // ...
];
```

**Edge Function 확장**:
```typescript
// Claude API 호출 시 tools 파라미터 추가
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  messages,
  tools: registeredTools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  })),
});

// Tool 호출 처리
if (response.stop_reason === 'tool_use') {
  const toolCall = response.content.find(c => c.type === 'tool_use');
  const result = await toolRegistry.execute(toolCall.name, toolCall.input);
  // 결과를 다음 메시지로 전달
}
```

**완료 조건**:
- [ ] ToolRegistry 구현
- [ ] 기본 도구 5개 정의 (이슈, 이벤트, 헬스, 사용자, 프로젝트)
- [ ] Edge Function 도구 호출 지원
- [ ] 도구 권한 검증
- [ ] E2E 테스트 8개

---

### BL-AI-004: RAG (Retrieval-Augmented Generation)

**우선순위**: P2
**예상 시간**: 16시간
**의존성**: Sprint 1 완료

**설명**:
프로젝트 문서, 과거 RFP, 보고서 등을 벡터 DB에 저장하고 AI 응답 시 참조합니다.

**기능**:
- 문서 임베딩 생성 및 저장
- 유사 문서 검색
- 컨텍스트 증강 응답 생성
- 출처 표시

**구현 범위**:
```typescript
// src/lib/claude/rag.ts

interface Document {
  id: string;
  content: string;
  metadata: {
    source: string;
    type: 'rfp' | 'report' | 'requirements' | 'manual';
    projectId?: string;
    createdAt: string;
  };
  embedding?: number[];
}

interface RAGConfig {
  embeddingModel: 'voyage-3' | 'voyage-3-lite';
  similarityThreshold: number;
  maxDocuments: number;
}

interface UseRAGResult {
  indexDocument: (doc: Document) => Promise<void>;
  searchDocuments: (query: string, limit?: number) => Promise<Document[]>;
  generateWithContext: (query: string, documents: Document[]) => Promise<string>;
  isIndexing: boolean;
  isSearching: boolean;
}
```

**DB 스키마 (pgvector)**:
```sql
-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1024), -- Voyage-3 차원
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON document_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**완료 조건**:
- [ ] pgvector 확장 설정
- [ ] document_embeddings 테이블 마이그레이션
- [ ] Voyage API 연동 (임베딩 생성)
- [ ] useRAG 훅 구현
- [ ] 문서 업로드 UI
- [ ] 검색 결과 표시 UI
- [ ] E2E 테스트 6개

---

### BL-AI-005: 프롬프트 템플릿 관리

**우선순위**: P1
**예상 시간**: 4시간
**의존성**: Sprint 1 완료

**설명**:
자주 사용하는 프롬프트를 템플릿으로 저장하고 관리합니다.

**기능**:
- 프롬프트 템플릿 CRUD
- 변수 치환 ({{변수명}})
- 템플릿 공유 (팀 내)
- 사용 통계

**구현 범위**:
```typescript
// src/types/prompt-template.types.ts

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'rfp' | 'requirements' | 'plan' | 'report' | 'custom';
  systemPrompt: string;
  userPromptTemplate: string;
  variables: TemplateVariable[];
  isPublic: boolean;
  createdBy: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TemplateVariable {
  name: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  description: string;
  required: boolean;
  defaultValue?: string;
  options?: string[]; // select 타입용
}

interface UsePromptTemplatesResult {
  templates: PromptTemplate[];
  createTemplate: (template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => Promise<PromptTemplate>;
  updateTemplate: (id: string, updates: Partial<PromptTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  applyTemplate: (id: string, variables: Record<string, string>) => string;
  duplicateTemplate: (id: string) => Promise<PromptTemplate>;
}
```

**DB 스키마**:
```sql
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  system_prompt TEXT,
  user_prompt_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**완료 조건**:
- [ ] prompt_templates 테이블 마이그레이션
- [ ] usePromptTemplates 훅 구현
- [ ] 템플릿 목록/상세 UI
- [ ] 템플릿 에디터 UI
- [ ] 변수 입력 폼 자동 생성
- [ ] E2E 테스트 5개

---

### BL-AI-006: AI 응답 평가 및 피드백

**우선순위**: P2
**예상 시간**: 6시간
**의존성**: Sprint 2 완료

**설명**:
AI 응답에 대한 사용자 평가를 수집하여 품질 개선에 활용합니다.

**기능**:
- 응답별 좋아요/싫어요
- 상세 피드백 (텍스트)
- 응답 재생성 요청
- 평가 통계 대시보드

**구현 범위**:
```typescript
// src/types/ai-feedback.types.ts

interface AIFeedback {
  id: string;
  responseId: string;
  userId: string;
  rating: 'positive' | 'negative';
  feedbackText?: string;
  categories?: FeedbackCategory[];
  createdAt: string;
}

type FeedbackCategory =
  | 'inaccurate'
  | 'incomplete'
  | 'irrelevant'
  | 'too_long'
  | 'too_short'
  | 'formatting'
  | 'other';

interface UseAIFeedbackResult {
  submitFeedback: (feedback: Omit<AIFeedback, 'id' | 'createdAt'>) => Promise<void>;
  getFeedbackStats: (period: 'day' | 'week' | 'month') => Promise<FeedbackStats>;
}

interface FeedbackStats {
  totalResponses: number;
  positiveCount: number;
  negativeCount: number;
  positiveRate: number;
  topIssues: { category: FeedbackCategory; count: number }[];
}
```

**완료 조건**:
- [ ] ai_feedback 테이블 마이그레이션
- [ ] 피드백 버튼 UI (응답 하단)
- [ ] 피드백 모달 UI
- [ ] 피드백 통계 대시보드
- [ ] E2E 테스트 4개

---

### BL-AI-007: 배치 처리 (대량 생성)

**우선순위**: P3
**예상 시간**: 8시간
**의존성**: Sprint 2 완료

**설명**:
여러 항목에 대해 일괄적으로 AI 생성을 수행합니다.

**사용 사례**:
- 여러 프로젝트의 보고서 일괄 생성
- 요구사항 목록 일괄 분석
- 다국어 번역

**구현 범위**:
```typescript
// src/hooks/useBatchGeneration.ts

interface BatchJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  items: BatchItem[];
  completedCount: number;
  failedCount: number;
  createdAt: string;
  completedAt?: string;
}

interface BatchItem {
  id: string;
  input: Record<string, unknown>;
  output?: string;
  error?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface UseBatchGenerationResult {
  createBatchJob: (items: Omit<BatchItem, 'id' | 'status'>[]) => Promise<BatchJob>;
  getBatchJob: (id: string) => Promise<BatchJob>;
  cancelBatchJob: (id: string) => Promise<void>;
  downloadResults: (id: string) => Promise<Blob>;
}
```

**완료 조건**:
- [ ] batch_jobs 테이블 마이그레이션
- [ ] 배치 처리 Edge Function (백그라운드 실행)
- [ ] 진행 상황 실시간 표시
- [ ] 결과 다운로드 (CSV/JSON)
- [ ] E2E 테스트 4개

---

### BL-AI-008: AI 어시스턴트 채팅 위젯

**우선순위**: P1
**예상 시간**: 6시간
**의존성**: Sprint 1 완료

**설명**:
사이트 전체에서 접근 가능한 플로팅 AI 채팅 위젯을 구현합니다.

**기능**:
- 화면 우하단 플로팅 버튼
- 드래그 가능한 채팅 창
- 최소화/최대화
- 대화 기록 유지

**구현 범위**:
```typescript
// src/components/ai/AIAssistantWidget.tsx

interface AIAssistantWidgetProps {
  defaultOpen?: boolean;
  position?: 'bottom-right' | 'bottom-left';
  systemPrompt?: string;
}

export function AIAssistantWidget({
  defaultOpen = false,
  position = 'bottom-right',
  systemPrompt,
}: AIAssistantWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);

  const {
    messages,
    sendMessage,
    isStreaming,
    currentStreamText,
    clearMessages,
  } = useClaudeStreaming({
    systemPrompt: systemPrompt || DEFAULT_ASSISTANT_PROMPT,
  });

  // ...
}
```

**완료 조건**:
- [ ] AIAssistantWidget 컴포넌트 구현
- [ ] 플로팅 버튼 UI
- [ ] 채팅 창 드래그 기능
- [ ] 최소화/최대화 기능
- [ ] 로컬스토리지 대화 기록 저장
- [ ] E2E 테스트 4개

---

### BL-AI-009: AI 추천 기능

**우선순위**: P2
**예상 시간**: 8시간
**의존성**: Sprint 2, BL-AI-004 (RAG)

**설명**:
사용자 활동 및 프로젝트 데이터를 기반으로 AI 추천을 제공합니다.

**기능**:
- 다음 작업 추천
- 유사 프로젝트 추천
- 관련 문서 추천
- 리스크 알림

**구현 범위**:
```typescript
// src/hooks/useAIRecommendations.ts

interface Recommendation {
  id: string;
  type: 'task' | 'project' | 'document' | 'risk';
  title: string;
  description: string;
  relevanceScore: number;
  actionUrl?: string;
  createdAt: string;
}

interface UseAIRecommendationsResult {
  recommendations: Recommendation[];
  generateRecommendations: () => Promise<void>;
  dismissRecommendation: (id: string) => Promise<void>;
  isLoading: boolean;
}
```

**완료 조건**:
- [ ] 추천 알고리즘 구현
- [ ] 추천 카드 UI
- [ ] 대시보드 위젯
- [ ] 추천 기록 저장
- [ ] E2E 테스트 4개

---

### BL-AI-010: 다국어 번역 지원

**우선순위**: P3
**예상 시간**: 6시간
**의존성**: Sprint 1 완료

**설명**:
AI 생성 결과를 다국어로 번역합니다.

**지원 언어**:
- 한국어 (기본)
- 영어
- 일본어
- 중국어 (간체)

**구현 범위**:
```typescript
// src/hooks/useAITranslation.ts

type SupportedLanguage = 'ko' | 'en' | 'ja' | 'zh';

interface UseAITranslationResult {
  translate: (text: string, targetLanguage: SupportedLanguage) => Promise<string>;
  translateDocument: (
    document: GeneratedRFP | GeneratedProjectPlan | GeneratedOperationsReport,
    targetLanguage: SupportedLanguage
  ) => Promise<typeof document>;
  isTranslating: boolean;
  error: ClaudeError | null;
}
```

**완료 조건**:
- [ ] useAITranslation 훅 구현
- [ ] 번역 언어 선택 UI
- [ ] 문서 내보내기 시 언어 선택
- [ ] E2E 테스트 3개

---

## 우선순위 요약

### P0 (다음 스프린트)
*현재 없음*

### P1 (2-3주 내)
- BL-AI-001: Vision API 통합 (6h)
- BL-AI-002: 멀티턴 대화 컨텍스트 관리 (8h)
- BL-AI-005: 프롬프트 템플릿 관리 (4h)
- BL-AI-008: AI 어시스턴트 채팅 위젯 (6h)

**소계**: 24시간 (약 3일)

### P2 (1-2개월 내)
- BL-AI-003: 함수 호출 (Tool Use) (10h)
- BL-AI-004: RAG (16h)
- BL-AI-006: AI 응답 평가 및 피드백 (6h)
- BL-AI-009: AI 추천 기능 (8h)

**소계**: 40시간 (약 5일)

### P3 (장기)
- BL-AI-007: 배치 처리 (8h)
- BL-AI-010: 다국어 번역 (6h)

**소계**: 14시간 (약 2일)

---

## 기술 부채 및 개선사항

### 성능 최적화
- [ ] 응답 캐싱 (동일 프롬프트)
- [ ] 스트리밍 청크 크기 최적화
- [ ] 병렬 요청 처리

### 보안 강화
- [ ] 프롬프트 인젝션 방어
- [ ] 민감 정보 필터링
- [ ] 응답 검증 (유해 콘텐츠)

### 모니터링
- [ ] 응답 품질 메트릭
- [ ] 지연 시간 모니터링
- [ ] 에러율 알림

### 비용 최적화
- [ ] 모델 자동 선택 (복잡도 기반)
- [ ] 토큰 사용 예측
- [ ] 예산 알림

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-24 | 초기 작성 | Claude |
