# Audit Log System 사용 가이드

> v2.36.0 Sprint 4: 운영 모니터링 및 감사 추적 시스템

## 개요

Audit Log 시스템은 애플리케이션의 모든 중요 이벤트를 추적하고 기록하는 고도화된 감사 추적 시스템입니다.

## 주요 기능

- ✅ 이벤트 타입별 분류 (user.login, subscription.created 등)
- ✅ 변경 내역 추적 (이전 값 → 새 값)
- ✅ 액터(행위자) 구분 (user, admin, system, service)
- ✅ 리소스별 변경 이력 조회
- ✅ 실시간 로그 스트림
- ✅ 통계 및 분석 기능
- ✅ JSON/CSV 내보내기
- ✅ 페이지네이션 및 필터링

## 파일 구조

```
src/
├── types/audit.types.ts              # 타입 정의
├── lib/audit/audit-logger.ts         # 로깅 유틸리티
├── hooks/useAuditLogs.ts             # React 훅
└── components/admin/AuditLogViewer.tsx  # 관리자 UI

supabase/migrations/
└── 20251209100003_create_audit_log.sql  # DB 스키마
```

## 데이터베이스 스키마

### `audit_log` 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | 로그 ID |
| `event_type` | VARCHAR(100) | 이벤트 타입 (예: user.login) |
| `action` | VARCHAR(50) | 액션 (create, update, delete 등) |
| `actor_id` | UUID | 행위자 사용자 ID |
| `actor_type` | VARCHAR(50) | 행위자 타입 (user, admin, system, service) |
| `resource_type` | VARCHAR(100) | 리소스 타입 (subscription, payment 등) |
| `resource_id` | UUID | 리소스 ID |
| `changes` | JSONB | 변경 내역 |
| `metadata` | JSONB | 추가 메타데이터 |
| `ip_address` | INET | IP 주소 |
| `user_agent` | TEXT | User Agent |
| `session_id` | UUID | 세션 ID |
| `created_at` | TIMESTAMPTZ | 생성 시간 |

## 사용 방법

### 1. 간단한 이벤트 로깅

```typescript
import { logAuditEvent } from '@/lib/audit/audit-logger';

// 기본 로깅
await logAuditEvent({
  event_type: 'user.login',
  action: 'login',
  metadata: { method: 'email' }
});
```

### 2. 빌더 패턴 사용

```typescript
import { AuditLogBuilder } from '@/lib/audit/audit-logger';

// 빌더 패턴으로 상세 로깅
await new AuditLogBuilder('subscription.created', 'create')
  .actor(userId, 'user')
  .resource('subscription', subscriptionId)
  .metadata({ plan: 'Pro', amount: 50000 })
  .log();
```

### 3. 편의 함수 사용

```typescript
import {
  logUserLogin,
  logUserLogout,
  logSubscriptionCreated,
  logPaymentSucceeded,
} from '@/lib/audit/audit-logger';

// 로그인 이벤트
await logUserLogin(userId, { method: 'email', provider: 'supabase' });

// 구독 생성 이벤트
await logSubscriptionCreated(userId, subscriptionId, {
  plan: 'Pro',
  amount: 50000
});

// 결제 성공 이벤트
await logPaymentSucceeded(userId, paymentId, {
  amount: 50000,
  method: 'card',
  orderId: 'ORD-12345'
});
```

### 4. 변경 내역 추적

```typescript
import { logResourceUpdated } from '@/lib/audit/audit-logger';

// 리소스 수정 시 변경사항 기록
await logResourceUpdated(
  'subscription',
  subscriptionId,
  {
    plan: { old: 'Basic', new: 'Pro' },
    price: { old: 10000, new: 50000 }
  },
  userId
);
```

### 5. React 훅 사용

```typescript
import { useAuditLogs } from '@/hooks/useAuditLogs';

function MyComponent() {
  // 기본 조회
  const { data, isLoading } = useAuditLogs(
    {
      event_type: 'user.login',
      start_date: '2025-12-01',
      end_date: '2025-12-31'
    },
    { page: 0, pageSize: 50 }
  );

  // 사용자별 히스토리
  const { data: history } = useUserAuditHistory(userId, 50);

  // 리소스별 히스토리
  const { data: resourceHistory } = useResourceAuditHistory(
    'subscription',
    subscriptionId
  );

  // 통계 조회
  const { data: stats } = useAuditStatistics(
    '2025-12-01',
    '2025-12-31'
  );

  return <div>{/* ... */}</div>;
}
```

### 6. 관리자 UI 컴포넌트

```typescript
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';

function AdminDashboard() {
  return (
    <div>
      <h1>관리자 대시보드</h1>
      <AuditLogViewer />
    </div>
  );
}
```

## 이벤트 타입 예시

### 사용자 이벤트
- `user.login` - 로그인
- `user.logout` - 로그아웃
- `user.created` - 사용자 생성
- `user.updated` - 사용자 정보 수정
- `user.password_reset` - 비밀번호 재설정

### 구독 이벤트
- `subscription.created` - 구독 생성
- `subscription.updated` - 구독 수정
- `subscription.cancelled` - 구독 취소
- `subscription.renewed` - 구독 갱신

### 결제 이벤트
- `payment.succeeded` - 결제 성공
- `payment.failed` - 결제 실패
- `payment.refunded` - 환불

### 팀 이벤트
- `team.created` - 팀 생성
- `team.member_added` - 팀 멤버 추가
- `team.member_removed` - 팀 멤버 제거

### 권한 이벤트
- `permission.granted` - 권한 부여
- `permission.revoked` - 권한 회수

## 보안 정책 (RLS)

### 사용자
- 자신의 감사 로그만 조회 가능

### 관리자
- `system:audit` 권한이 있는 경우 모든 로그 조회 가능

### 시스템
- 모든 로그 삽입 가능

## 성능 최적화

### 인덱스
- `idx_audit_log_actor` - 액터 기반 검색
- `idx_audit_log_resource` - 리소스 기반 검색
- `idx_audit_log_event_type` - 이벤트 타입 검색
- `idx_audit_log_created` - 시간 기반 검색
- `idx_audit_log_actor_created` - 복합 인덱스 (액터 + 시간)

### 캐싱 전략
- 목록 조회: 30초
- 상세 조회: 60초
- 통계: 5분
- 실시간 스트림: 10초

## 내보내기

### JSON 내보내기
```typescript
const { data: logs } = useAuditLogsExport(filters);

// JSON 파일로 저장
const json = JSON.stringify(logs, null, 2);
const blob = new Blob([json], { type: 'application/json' });
// ... 다운로드 처리
```

### CSV 내보내기
```typescript
// AuditLogViewer 컴포넌트에서 CSV 버튼 클릭
// 자동으로 CSV 파일 다운로드
```

## 모범 사례

### 1. 중요 이벤트는 반드시 로깅
```typescript
// ✅ 좋은 예
await createSubscription(data);
await logSubscriptionCreated(userId, subscriptionId, { plan: data.plan });

// ❌ 나쁜 예
await createSubscription(data);
// 로깅 누락
```

### 2. 변경사항 추적
```typescript
// ✅ 좋은 예
const oldValue = await getSubscription(id);
await updateSubscription(id, newData);
await logResourceUpdated('subscription', id, {
  plan: { old: oldValue.plan, new: newData.plan }
});

// ❌ 나쁜 예
await updateSubscription(id, newData);
await logAuditEvent({ event_type: 'subscription.updated', action: 'update' });
// 변경사항 누락
```

### 3. 적절한 메타데이터 포함
```typescript
// ✅ 좋은 예
await logPaymentSucceeded(userId, paymentId, {
  amount: 50000,
  method: 'card',
  orderId: 'ORD-12345',
  plan: 'Pro'
});

// ❌ 나쁜 예
await logPaymentSucceeded(userId, paymentId);
// 중요한 컨텍스트 정보 누락
```

### 4. 에러 처리
```typescript
// ✅ 좋은 예
try {
  await someOperation();
  await logAuditEvent({ ... });
} catch (error) {
  console.error('Operation failed:', error);
  // 로깅 실패는 주 작업을 방해하지 않음
}

// ❌ 나쁜 예
await someOperation();
await logAuditEvent({ ... }); // 로깅 실패 시 작업 중단
```

## 마이그레이션 적용

```bash
# Supabase CLI 사용
supabase db push

# 또는 Supabase Dashboard에서
# SQL Editor → 마이그레이션 파일 실행
```

## 문제 해결

### RPC 함수 권한 오류
```sql
-- 권한 재부여
GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_audit_statistics TO authenticated;
```

### 테이블 접근 권한 오류
```sql
-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'audit_log';

-- 권한 재부여
GRANT SELECT ON public.audit_log TO authenticated;
GRANT INSERT ON public.audit_log TO authenticated, anon;
```

## 관련 문서

- [프로젝트 개요](../project/README.md)
- [개발 방법론](./methodology.md)
- [RBAC 시스템](./rbac-guide.md)

## 변경 이력

- **v2.36.0** (2025-12-09): 초기 구현
  - 고도화된 Audit Log 테이블 생성
  - 타입 정의 및 유틸리티 함수
  - React 훅 및 관리자 UI 컴포넌트
