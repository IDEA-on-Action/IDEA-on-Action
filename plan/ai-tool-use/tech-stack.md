# AI Tool Use 기술 스택

> **작성일**: 2025-11-25
> **버전**: 1.0.0
> **상태**: Draft

---

## 📋 개요

AI Tool Use 기능 구현에 사용되는 기술 스택, 라이브러리, 도구를 정의하고 선택 이유를 설명합니다.

---

## 🎯 핵심 기술 스택

### Backend (Supabase Edge Functions)

| 기술 | 버전 | 용도 | 선택 이유 |
|------|------|------|-----------|
| **Deno** | 1.40+ | 런타임 | Supabase Edge Functions 표준 런타임 |
| **TypeScript** | 5.x | 언어 | 타입 안전성, 기존 프로젝트 일관성 |
| **Supabase Client** | 2.x | DB 연동 | RLS 자동 적용, 타입 안전 쿼리 |
| **Anthropic SDK** | - | Claude API | 없음 (fetch 직접 사용) |

**Deno 선택 이유**:
- Supabase Edge Functions는 Deno 전용
- TypeScript 네이티브 지원
- 보안 샌드박스 (파일 시스템 접근 제한)
- 빠른 콜드 스타트 (평균 50ms)

**Anthropic SDK 미사용 이유**:
- Deno 환경에서 npm 패키지 사용 복잡도 증가
- fetch API만으로 충분히 구현 가능
- 번들 크기 최소화 (Edge Functions 제약)

---

### Frontend (React)

| 기술 | 버전 | 용도 | 선택 이유 |
|------|------|------|-----------|
| **React** | 18.x | UI 프레임워크 | 기존 프로젝트 스택 |
| **TypeScript** | 5.x | 언어 | 타입 안전성 |
| **React Query** | 4.x | 상태 관리 | 서버 상태 캐싱, 자동 리프레시 |
| **Vite** | 5.x | 빌드 도구 | 빠른 HMR, 기존 프로젝트 설정 |

**React Query 사용 이유**:
- 비동기 상태 관리 단순화
- 자동 재시도, 캐싱 지원
- 낙관적 업데이트 용이
- 기존 프로젝트에서 이미 사용 중

---

## 🔧 개발 도구

### 코드 품질

| 도구 | 버전 | 용도 | 설정 |
|------|------|------|------|
| **ESLint** | 8.x | 린트 | `.eslintrc.json` (strict) |
| **Prettier** | 3.x | 포매터 | `.prettierrc` (2 spaces) |
| **TypeScript Compiler** | 5.x | 타입 체크 | `tsconfig.json` (strict mode) |

**ESLint 규칙**:
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "no-console": ["warn", { "allow": ["error", "warn"] }]
  }
}
```

---

### 테스트

| 도구 | 버전 | 용도 | 설정 |
|------|------|------|------|
| **Playwright** | 1.40+ | E2E 테스트 | `playwright.config.ts` |
| **Vitest** | 1.x | 유닛 테스트 | `vitest.config.ts` |
| **MSW** | 2.x | API 모킹 | Service Worker 기반 |

**Playwright 선택 이유**:
- 크로스 브라우저 테스트 (Chromium, Firefox, WebKit)
- 네트워크 인터셉트 기능 (도구 실행 모킹)
- 스크린샷, 비디오 녹화 지원
- 기존 프로젝트에서 사용 중 (172개 E2E 테스트)

**Vitest 선택 이유**:
- Vite 네이티브 통합
- Jest 호환 API (마이그레이션 용이)
- 빠른 실행 속도 (ESM 기반)

---

## 📚 주요 라이브러리

### 데이터 검증

| 라이브러리 | 버전 | 용도 | 선택 이유 |
|-----------|------|------|-----------|
| **Zod** | 3.x | 스키마 검증 | TypeScript 네이티브, 런타임 검증 |

**Zod 사용 예시**:
```typescript
import { z } from 'zod';

const IssuesToolInputSchema = z.object({
  service_id: z.enum(['minu-find', 'minu-frame', 'minu-build', 'minu-keep']).optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  limit: z.number().min(1).max(100).default(20)
});

type IssuesToolInput = z.infer<typeof IssuesToolInputSchema>;
```

**선택 이유**:
- JSON Schema보다 TypeScript 친화적
- 자동 타입 추론 (`z.infer<>`)
- 에러 메시지 커스터마이징 용이
- 번들 크기 작음 (10KB gzipped)

---

### 날짜 처리

| 라이브러리 | 버전 | 용도 | 선택 이유 |
|-----------|------|------|-----------|
| **date-fns** | 3.x | 날짜 파싱/포매팅 | Tree-shakable, 타임존 지원 |

**date-fns 선택 이유**:
- Moment.js보다 가벼움 (전체 번들 크기 작음)
- Immutable (사이드 이펙트 없음)
- TypeScript 지원
- 기존 프로젝트에서 사용 중

**사용 예시**:
```typescript
import { parseISO, formatISO, subDays } from 'date-fns';

// "최근 7일" 파싱
const fromDate = formatISO(subDays(new Date(), 7));
```

---

## 🗄️ 데이터베이스

### Supabase PostgreSQL

| 버전 | 확장 | 용도 |
|------|------|------|
| **PostgreSQL** | 15.x | 관계형 DB |
| **pgvector** | 0.5.x | 벡터 검색 (향후) |
| **pg_stat_statements** | 1.10 | 쿼리 성능 모니터링 |

**기존 테이블 활용**:
- `service_issues` (이미 생성됨)
- `service_events` (이미 생성됨)
- `service_health` (이미 생성됨)
- `projects` (이미 생성됨)
- `profiles` (이미 생성됨)
- `claude_usage_logs` (확장 필요)
- `claude_rate_limits` (기존 사용)

**신규 테이블**:
```sql
-- 도구 실행 로그 (선택적)
CREATE TABLE IF NOT EXISTS tool_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  tool_name TEXT NOT NULL,
  input JSONB,
  output JSONB,
  execution_time_ms INTEGER,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_tool_logs_user ON tool_execution_logs(user_id);
CREATE INDEX idx_tool_logs_tool ON tool_execution_logs(tool_name);
CREATE INDEX idx_tool_logs_created ON tool_execution_logs(created_at DESC);
```

---

## 🔐 보안 도구

### JWT 검증

| 도구 | 버전 | 용도 | 선택 이유 |
|------|------|------|-----------|
| **Supabase Auth** | 2.x | JWT 발급/검증 | 통합 인증 시스템 |

**JWT 검증 흐름**:
```typescript
// Supabase Client를 사용자 토큰으로 초기화
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!, // NOT Service Role Key
  {
    global: {
      headers: { Authorization: req.headers.get('Authorization')! }
    }
  }
);

// RLS 자동 적용
const { data, error } = await supabase
  .from('service_issues')
  .select('*'); // 사용자가 접근 가능한 데이터만 조회
```

---

### Rate Limiting

| 도구 | 버전 | 용도 | 선택 이유 |
|------|------|------|-----------|
| **Custom (DB 기반)** | - | 요청 제한 | Supabase 테이블로 구현 |

**기존 구현 활용**:
- `supabase/functions/claude-ai/rate-limiter.ts` 이미 존재
- `claude_rate_limits` 테이블 사용
- 사용자별 분당 20회 제한

---

## 📊 모니터링 도구

### 로깅

| 도구 | 버전 | 용도 | 선택 이유 |
|------|------|------|-----------|
| **Supabase Logs** | - | Edge Function 로그 | 내장 기능 |
| **Custom Logger** | - | 구조화된 로그 | JSON 형식 |

**로그 구조**:
```typescript
interface ToolExecutionLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  event: 'tool_start' | 'tool_success' | 'tool_error';
  user_id: string;
  tool_name: string;
  input: Record<string, unknown>;
  duration_ms?: number;
  error?: string;
  request_id: string;
}
```

---

### 성능 모니터링

| 도구 | 버전 | 용도 | 선택 이유 |
|------|------|------|-----------|
| **Supabase Dashboard** | - | DB 쿼리 성능 | 내장 기능 |
| **Custom Metrics** | - | 도구별 지표 | DB 테이블 |

**측정 지표**:
- 도구별 평균 실행 시간
- 도구별 에러율
- 도구별 사용 빈도
- P50, P95, P99 레이턴시

---

## 🎨 UI 컴포넌트

### shadcn/ui

| 컴포넌트 | 용도 | 커스터마이징 |
|---------|------|-------------|
| `<Button>` | 메시지 전송 | 로딩 상태 추가 |
| `<Card>` | 도구 실행 결과 표시 | Tool 아이콘 추가 |
| `<Badge>` | 도구 이름 표시 | 색상 매핑 |
| `<Skeleton>` | 로딩 중 | 애니메이션 |
| `<Alert>` | 에러 메시지 | 도구 에러 스타일 |

**shadcn/ui 선택 이유**:
- Radix UI 기반 (접근성 우수)
- Tailwind CSS 통합
- 커스터마이징 용이
- 기존 프로젝트에서 사용 중 (48개 컴포넌트)

---

## 🚀 배포 도구

### CI/CD

| 도구 | 용도 | 설정 파일 |
|------|------|----------|
| **GitHub Actions** | 자동 배포 | `.github/workflows/deploy.yml` |
| **Supabase CLI** | 마이그레이션 | `supabase/config.toml` |

**배포 워크플로우**:
```yaml
name: Deploy Tool Use

on:
  push:
    branches: [main]
    paths:
      - 'supabase/functions/claude-ai/**'
      - 'src/hooks/ai/**'

jobs:
  deploy-functions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase functions deploy claude-ai

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - run: npm run deploy
```

---

## 📦 의존성 관리

### Frontend (package.json)

**신규 추가**:
```json
{
  "dependencies": {
    "zod": "^3.22.0",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "msw": "^2.0.0"
  }
}
```

**이미 설치된 패키지 활용**:
- `@supabase/supabase-js`: 2.x
- `react-query`: 4.x
- `react`: 18.x
- `typescript`: 5.x

---

### Backend (Deno)

**import_map.json**:
```json
{
  "imports": {
    "supabase": "https://esm.sh/@supabase/supabase-js@2",
    "zod": "https://esm.sh/zod@3",
    "date-fns": "https://esm.sh/date-fns@3"
  }
}
```

**Deno 모듈 캐싱**:
- 첫 배포 시 자동 다운로드
- 이후 캐시 사용 (빠른 콜드 스타트)

---

## 🔄 버전 관리 전략

### Semantic Versioning

| 버전 변경 | 조건 | 예시 |
|----------|------|------|
| **Major (X.0.0)** | 도구 API 변경 (Breaking) | 입력 스키마 변경 |
| **Minor (0.X.0)** | 새 도구 추가 | 6번째 도구 추가 |
| **Patch (0.0.X)** | 버그 수정, 성능 개선 | 쿼리 최적화 |

**현재 버전**: 1.0.0 (MVP 릴리스)

---

## 🎯 기술 선택 기준

### 평가 매트릭스

| 기술 | 성능 | 안정성 | 커뮤니티 | 학습 곡선 | 총점 |
|------|------|--------|---------|----------|------|
| Deno | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 16/20 |
| Supabase | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 19/20 |
| Zod | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 19/20 |
| React Query | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 19/20 |

---

## 📝 기술 부채 관리

### 알려진 제약사항

1. **Deno npm 호환성**: 일부 npm 패키지 사용 불가
   - **대응**: ESM 버전 또는 Deno 네이티브 라이브러리 사용

2. **Edge Functions 타임아웃**: 최대 60초
   - **대응**: 도구 실행 10초 제한, 복잡한 쿼리는 분할

3. **Claude API Rate Limit**: 분당 50회 (Tier 1)
   - **대응**: 사용자별 분당 20회 제한, 업그레이드 안내

---

## 🔮 향후 기술 로드맵

### Phase 2 (2개월 후)

- **캐싱 레이어**: Redis 또는 Upstash 도입 (헬스 체크 캐싱)
- **벡터 검색**: pgvector로 유사 이슈 검색
- **GraphQL**: 복잡한 조인 쿼리 최적화

### Phase 3 (6개월 후)

- **실시간 구독**: Supabase Realtime으로 이벤트 스트림
- **AI 에이전트**: 여러 도구 자동 조합 (LangChain)
- **멀티모달**: 이미지, 파일 업로드 지원 (Vision API)

---

**작성자**: Claude (AI Developer)
**리뷰어**: 서민원
**승인일**: TBD
