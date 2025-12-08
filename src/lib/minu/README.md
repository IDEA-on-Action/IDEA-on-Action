# Minu Sandbox 환경

Minu 서비스 연동을 위한 테스트 Sandbox 환경 구현체입니다.

## 개요

Minu Sandbox는 실제 Minu 서비스 API를 호출하지 않고도 다양한 시나리오를 테스트할 수 있는 환경을 제공합니다.

## 구성 요소

### 1. 설정 파일 (`src/config/minu-sandbox.ts`)

Sandbox 환경 설정 및 플랜별 제한, 테스트 사용자 정의

**주요 기능:**
- 플랜별 제한 설정 (Free, Basic, Pro, Enterprise)
- 테스트 사용자 계정 정의
- OAuth 및 API 엔드포인트 설정
- 에러 시나리오 정의

### 2. Sandbox 클라이언트 (`src/lib/minu/sandbox-client.ts`)

Minu API 호출을 시뮬레이션하는 클라이언트

**주요 기능:**
- OAuth 토큰 교환, 갱신, 폐기
- 구독 정보 조회
- 사용자 프로필 관리
- 세션 관리
- Audit Log 조회
- MCP 상태 모니터링
- 에러 시뮬레이션 (Rate Limit, Unauthorized, Network Error 등)

### 3. React Hook (`src/hooks/useMinuSandbox.ts`)

Sandbox 환경을 React 컴포넌트에서 쉽게 사용할 수 있는 훅

**주요 기능:**
- Sandbox 모드 토글
- 테스트 사용자 선택
- 에러 시나리오 설정
- 구독 정보 자동 조회
- MCP 상태 자동 모니터링 (30초마다)

## 사용법

### 기본 사용

```typescript
import { useMinuSandbox } from "@/hooks/useMinuSandbox";

function MyComponent() {
  const {
    isEnabled,
    currentUser,
    subscription,
    setTestUser,
    setErrorScenario,
  } = useMinuSandbox();

  // Pro 플랜 사용자로 전환
  const handleSelectProUser = () => {
    setTestUser("pro");
  };

  // Rate Limit 에러 시뮬레이션
  const handleSimulateRateLimit = () => {
    setErrorScenario(ErrorScenario.RATE_LIMIT);
  };

  return (
    <div>
      <h1>Sandbox 모드: {isEnabled ? "활성" : "비활성"}</h1>
      {currentUser && (
        <div>
          <p>현재 사용자: {currentUser.email}</p>
          <p>플랜: {currentUser.plan}</p>
          {subscription && (
            <p>검색 횟수 제한: {subscription.limits.searchCount}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

### Sandbox 클라이언트 직접 사용

```typescript
import { createSandboxClient, ErrorScenario } from "@/lib/minu";
import { SANDBOX_USERS } from "@/config/minu-sandbox";

// 클라이언트 생성
const client = createSandboxClient({
  errorScenario: ErrorScenario.NONE,
  mockDelay: 500, // 500ms 지연
});

// 구독 정보 조회
const subscription = await client.getSubscription("find", SANDBOX_USERS.pro);
console.log(subscription.data?.limits);

// 에러 시뮬레이션
client.setErrorScenario(ErrorScenario.RATE_LIMIT);
const result = await client.getSessions(); // 429 에러 반환
```

## 테스트 사용자

| 플랜 | 이메일 | 검색 제한 | AI 분석 | 히스토리 |
|------|--------|-----------|---------|----------|
| Free | test-free@ideaonaction.ai | 10/월 | ❌ | 1개월 |
| Basic | test-basic@ideaonaction.ai | 50/월 | ❌ | 3개월 |
| Pro | test-pro@ideaonaction.ai | 300/월 | ✅ | 6개월 |
| Enterprise | test-enterprise@ideaonaction.ai | 무제한 | ✅ | 무제한 |
| Expired | test-expired@ideaonaction.ai | - | - | - |

## 에러 시나리오

- `NONE`: 정상 응답
- `RATE_LIMIT`: 429 Too Many Requests
- `UNAUTHORIZED`: 401 Unauthorized
- `FORBIDDEN`: 403 Forbidden
- `NOT_FOUND`: 404 Not Found
- `SERVER_ERROR`: 500 Internal Server Error
- `NETWORK_ERROR`: 네트워크 연결 실패
- `TIMEOUT`: 요청 시간 초과

## 테스트

### 단위 테스트 (27개)

```bash
npm run test:unit -- src/lib/minu/sandbox-client.test.ts
```

**테스트 커버리지:**
- 클라이언트 초기화
- OAuth 인가 URL 생성
- 토큰 교환, 갱신, 폐기
- 플랜별 구독 정보 조회
- 사용자 프로필 관리
- 세션 및 Audit Log
- MCP 상태 모니터링
- 다양한 에러 시나리오

### E2E 테스트 (18개)

```bash
npm run test:e2e -- tests/e2e/minu/sandbox-integration.spec.ts
```

**테스트 시나리오:**
- Sandbox 클라이언트 초기화
- 플랜별 구독 정보 검증
- 에러 시뮬레이션
- OAuth 플로우
- 세션 및 로그 관리
- MCP 상태 모니터링
- Mock 응답 검증

## 환경 변수

```env
# Sandbox 모드 활성화
VITE_SANDBOX_ENABLED=true

# Sandbox 서버 URL
VITE_SANDBOX_URL=https://sandbox.ideaonaction.ai

# Webhook Secret (Webhook 검증용)
VITE_WEBHOOK_SECRET=your-webhook-secret
```

## 파일 구조

```
src/
├── config/
│   ├── minu-sandbox.ts      # Sandbox 설정
│   └── index.ts             # Export
├── lib/
│   └── minu/
│       ├── sandbox-client.ts       # Sandbox 클라이언트
│       ├── sandbox-client.test.ts  # 단위 테스트
│       ├── index.ts                # Export
│       └── README.md               # 이 문서
└── hooks/
    └── useMinuSandbox.ts    # React Hook

tests/
└── e2e/
    └── minu/
        ├── sandbox.spec.ts              # 기존 E2E 테스트
        ├── sandbox-integration.spec.ts  # 새로운 통합 테스트
        └── minu-test-accounts.spec.ts   # 계정별 테스트
```

## 참고 문서

- [Minu Integration Guidelines](../../../docs/guides/minu-integration-guidelines.md)
- [Minu Sandbox Setup Plan](../../../plan/minu-sandbox-setup.md)
- [CLAUDE.md](../../../CLAUDE.md)
