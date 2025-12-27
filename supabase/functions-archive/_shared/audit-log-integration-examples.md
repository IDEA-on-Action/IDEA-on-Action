# 감사 로그 통합 예시

감사 로그를 기존 Edge Function에 통합하는 실전 예시입니다.

## 목차
1. [기본 사용법](#기본-사용법)
2. [인증 API 통합](#인증-api-통합)
3. [세션 API 통합](#세션-api-통합)
4. [사용자 API 통합](#사용자-api-통합)
5. [구독 API 통합](#구독-api-통합)
6. [권한 API 통합](#권한-api-통합)
7. [성능 측정 통합](#성능-측정-통합)
8. [에러 처리 통합](#에러-처리-통합)

---

## 기본 사용법

### 1. Import 추가

```typescript
import { logAudit, logAuditAsync } from '../_shared/audit-log.ts';
import { AUDIT_EVENTS } from '../_shared/audit-events.ts';
```

### 2. 간단한 로깅

```typescript
// 동기 로깅 (결과 필요 시)
const logId = await logAudit(supabase, {
  eventType: AUDIT_EVENTS.USER_UPDATE,
  actorId: userId,
  actorType: 'user',
  resourceType: 'user',
  resourceId: userId,
  action: 'update',
  changes: {
    before: { name: 'Old Name' },
    after: { name: 'New Name' },
  },
  status: 'success',
}, req);

// 비동기 로깅 (Fire-and-Forget, 성능 우선)
logAuditAsync(supabase, {
  eventType: AUDIT_EVENTS.USER_PROFILE_UPDATE,
  actorId: userId,
  actorType: 'user',
  action: 'update',
  status: 'success',
}, req);
```

---

## 인증 API 통합

### 로그인 성공/실패

```typescript
// oauth-token/index.ts

serve(async (req) => {
  const supabase = createClient(/* ... */);

  try {
    // 로그인 처리
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // 로그인 실패 로그
      logAuditAsync(supabase, {
        eventType: AUDIT_EVENTS.AUTH_LOGIN_FAILED,
        actorEmail: email,
        actorType: 'anonymous',
        action: 'login',
        status: 'failure',
        errorCode: error.status?.toString(),
        errorMessage: error.message,
      }, req);

      return new Response(JSON.stringify({ error: error.message }), {
        status: 401,
      });
    }

    // 로그인 성공 로그
    logAuditAsync(supabase, {
      eventType: AUDIT_EVENTS.AUTH_LOGIN,
      actorId: data.user.id,
      actorType: 'user',
      actorEmail: data.user.email,
      action: 'login',
      metadata: {
        provider: 'email',
      },
      status: 'success',
    }, req);

    return new Response(JSON.stringify(data), {
      status: 200,
    });
  } catch (err) {
    // 시스템 에러 로그
    logAuditAsync(supabase, {
      eventType: AUDIT_EVENTS.SYSTEM_ERROR,
      actorType: 'system',
      action: 'other',
      status: 'failure',
      errorMessage: err.message,
    }, req);

    throw err;
  }
});
```

### 비밀번호 재설정

```typescript
// oauth-token/index.ts - 비밀번호 재설정 엔드포인트

async function handlePasswordReset(supabase, email, req) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    logAuditAsync(supabase, {
      eventType: AUDIT_EVENTS.AUTH_PASSWORD_RESET_REQUEST,
      actorEmail: email,
      actorType: 'anonymous',
      action: 'other',
      status: 'failure',
      errorMessage: error.message,
    }, req);
    return { error };
  }

  logAuditAsync(supabase, {
    eventType: AUDIT_EVENTS.AUTH_PASSWORD_RESET_REQUEST,
    actorEmail: email,
    actorType: 'anonymous',
    action: 'other',
    status: 'success',
  }, req);

  return { success: true };
}
```

---

## 세션 API 통합

### 세션 종료

```typescript
// session-api/index.ts

async function terminateSession(supabase, userId, sessionId, req) {
  const startTime = Date.now();

  try {
    // 세션 삭제
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      logAuditAsync(supabase, {
        eventType: AUDIT_EVENTS.SESSION_TERMINATE,
        actorId: userId,
        actorType: 'user',
        resourceType: 'session',
        resourceId: sessionId,
        action: 'delete',
        status: 'failure',
        errorMessage: error.message,
        durationMs: Date.now() - startTime,
      }, req);
      throw error;
    }

    // 성공 로그
    logAuditAsync(supabase, {
      eventType: AUDIT_EVENTS.SESSION_TERMINATE,
      actorId: userId,
      actorType: 'user',
      resourceType: 'session',
      resourceId: sessionId,
      action: 'delete',
      status: 'success',
      durationMs: Date.now() - startTime,
    }, req);

    return { success: true };
  } catch (err) {
    throw err;
  }
}
```

### 전체 세션 종료

```typescript
// session-api/index.ts

async function terminateAllSessions(supabase, userId, req) {
  try {
    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', userId);

    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    // 중요 이벤트는 동기 로깅
    await logAudit(supabase, {
      eventType: AUDIT_EVENTS.SESSION_TERMINATE_ALL,
      actorId: userId,
      actorType: 'user',
      resourceType: 'session',
      action: 'delete',
      metadata: {
        terminated_count: sessions?.length || 0,
      },
      status: 'success',
    }, req);

    return { success: true };
  } catch (err) {
    throw err;
  }
}
```

---

## 사용자 API 통합

### 프로필 업데이트

```typescript
// user-api/index.ts

async function updateUserProfile(supabase, userId, updates, req) {
  // 변경 전 데이터 조회
  const { data: before } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // 업데이트 실행
  const { data: after, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    logAuditAsync(supabase, {
      eventType: AUDIT_EVENTS.PROFILE_UPDATE,
      actorId: userId,
      actorType: 'user',
      resourceType: 'profile',
      resourceId: userId,
      action: 'update',
      status: 'failure',
      errorMessage: error.message,
    }, req);
    throw error;
  }

  // 변경 사항 로깅
  logAuditAsync(supabase, {
    eventType: AUDIT_EVENTS.PROFILE_UPDATE,
    actorId: userId,
    actorType: 'user',
    resourceType: 'profile',
    resourceId: userId,
    action: 'update',
    changes: {
      before: { full_name: before?.full_name, avatar_url: before?.avatar_url },
      after: { full_name: after.full_name, avatar_url: after.avatar_url },
    },
    status: 'success',
  }, req);

  return after;
}
```

### 사용자 삭제 (중요 이벤트)

```typescript
// user-api/index.ts

async function deleteUser(supabase, adminId, targetUserId, req) {
  // 중요 이벤트는 동기 로깅
  try {
    const { data: user } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single();

    const { error } = await supabase.auth.admin.deleteUser(targetUserId);

    if (error) throw error;

    // 성공 로그
    await logAudit(supabase, {
      eventType: AUDIT_EVENTS.USER_DELETE,
      actorId: adminId,
      actorType: 'user',
      resourceType: 'user',
      resourceId: targetUserId,
      action: 'delete',
      changes: {
        before: { email: user?.email, full_name: user?.full_name },
      },
      metadata: {
        deleted_by: 'admin',
      },
      status: 'success',
    }, req);

    return { success: true };
  } catch (err) {
    // 실패 로그
    await logAudit(supabase, {
      eventType: AUDIT_EVENTS.USER_DELETE,
      actorId: adminId,
      actorType: 'user',
      resourceType: 'user',
      resourceId: targetUserId,
      action: 'delete',
      status: 'failure',
      errorMessage: err.message,
    }, req);
    throw err;
  }
}
```

---

## 구독 API 통합

### 구독 생성

```typescript
// subscription-api/index.ts

async function createSubscription(supabase, userId, planId, req) {
  const startTime = Date.now();

  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_id: planId,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    logAuditAsync(supabase, {
      eventType: AUDIT_EVENTS.SUBSCRIPTION_CREATE,
      actorId: userId,
      actorType: 'user',
      resourceType: 'subscription',
      resourceId: subscription.id,
      action: 'create',
      changes: {
        after: {
          plan_id: planId,
          status: 'active',
        },
      },
      metadata: {
        plan_id: planId,
      },
      status: 'success',
      durationMs: Date.now() - startTime,
    }, req);

    return subscription;
  } catch (err) {
    logAuditAsync(supabase, {
      eventType: AUDIT_EVENTS.SUBSCRIPTION_CREATE,
      actorId: userId,
      actorType: 'user',
      action: 'create',
      status: 'failure',
      errorMessage: err.message,
      durationMs: Date.now() - startTime,
    }, req);
    throw err;
  }
}
```

### 구독 취소

```typescript
// subscription-api/index.ts

async function cancelSubscription(supabase, userId, subscriptionId, req) {
  const { data: before } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single();

  const { data: after, error } = await supabase
    .from('subscriptions')
    .update({ status: 'canceled', cancel_at_period_end: true })
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) throw error;

  // 중요 이벤트는 동기 로깅
  await logAudit(supabase, {
    eventType: AUDIT_EVENTS.SUBSCRIPTION_CANCEL,
    actorId: userId,
    actorType: 'user',
    resourceType: 'subscription',
    resourceId: subscriptionId,
    action: 'update',
    changes: {
      before: { status: before?.status, cancel_at_period_end: before?.cancel_at_period_end },
      after: { status: after.status, cancel_at_period_end: after.cancel_at_period_end },
    },
    status: 'success',
  }, req);

  return after;
}
```

---

## 권한 API 통합

### 권한 부여

```typescript
// permission-api/index.ts

async function grantPermission(supabase, adminId, userId, permission, req) {
  try {
    const { error } = await supabase
      .from('user_permissions')
      .insert({
        user_id: userId,
        permission,
        granted_by: adminId,
      });

    if (error) throw error;

    await logAudit(supabase, {
      eventType: AUDIT_EVENTS.PERMISSION_GRANT,
      actorId: adminId,
      actorType: 'user',
      resourceType: 'user',
      resourceId: userId,
      action: 'create',
      changes: {
        after: { permission },
      },
      metadata: {
        granted_by: adminId,
        permission,
      },
      status: 'success',
    }, req);

    return { success: true };
  } catch (err) {
    await logAudit(supabase, {
      eventType: AUDIT_EVENTS.PERMISSION_GRANT,
      actorId: adminId,
      actorType: 'user',
      resourceType: 'user',
      resourceId: userId,
      action: 'create',
      status: 'failure',
      errorMessage: err.message,
    }, req);
    throw err;
  }
}
```

### 권한 거부 로깅

```typescript
// permission-api/index.ts

async function checkPermission(supabase, userId, permission, req) {
  const { data } = await supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', userId)
    .eq('permission', permission)
    .single();

  if (!data) {
    // 권한 거부 로그 (보안 감사)
    logAuditAsync(supabase, {
      eventType: AUDIT_EVENTS.PERMISSION_DENIED,
      actorId: userId,
      actorType: 'user',
      action: 'other',
      metadata: {
        permission,
        reason: 'Permission not found',
      },
      status: 'failure',
    }, req);

    return false;
  }

  return true;
}
```

---

## 성능 측정 통합

### logAuditWithTiming 사용

```typescript
import { logAuditWithTiming } from '../_shared/audit-log.ts';

// 자동으로 성능 측정 + 로깅
const result = await logAuditWithTiming(
  supabase,
  {
    eventType: AUDIT_EVENTS.DATA_EXPORT,
    actorId: userId,
    actorType: 'user',
    resourceType: 'data',
    action: 'other',
  },
  async () => {
    // 실제 작업 (성능 측정됨)
    return await exportUserData(userId);
  },
  req
);

// result에는 exportUserData의 결과가 담김
// durationMs는 자동으로 계산되어 로그에 기록됨
```

---

## 에러 처리 통합

### Try-Catch 패턴

```typescript
async function complexOperation(supabase, userId, req) {
  const startTime = Date.now();

  try {
    // 복잡한 작업
    const result = await performComplexTask(userId);

    // 성공 로그
    logAuditAsync(supabase, {
      eventType: AUDIT_EVENTS.DATA_IMPORT,
      actorId: userId,
      actorType: 'user',
      action: 'create',
      metadata: {
        records_imported: result.count,
      },
      status: 'success',
      durationMs: Date.now() - startTime,
    }, req);

    return result;
  } catch (err) {
    // 실패 로그
    logAuditAsync(supabase, {
      eventType: AUDIT_EVENTS.DATA_IMPORT,
      actorId: userId,
      actorType: 'user',
      action: 'create',
      status: 'failure',
      errorCode: err.code || 'UNKNOWN_ERROR',
      errorMessage: err.message,
      durationMs: Date.now() - startTime,
    }, req);

    throw err;
  }
}
```

---

## 모범 사례

### 1. 비동기 로깅 우선
일반적인 경우 `logAuditAsync`를 사용하여 성능 영향 최소화

```typescript
// Good
logAuditAsync(supabase, entry, req);

// Bad (불필요한 await)
await logAudit(supabase, entry, req);
```

### 2. 중요 이벤트는 동기 로깅
보안/결제/삭제 등 중요 이벤트는 `await logAudit` 사용

```typescript
// Good (중요 이벤트)
await logAudit(supabase, {
  eventType: AUDIT_EVENTS.USER_DELETE,
  // ...
}, req);
```

### 3. 민감 정보 자동 마스킹
비밀번호, 토큰 등은 자동으로 마스킹됨

```typescript
logAuditAsync(supabase, {
  changes: {
    before: { password: '123456' }, // -> '***MASKED***'
    after: { password: 'newpass' },  // -> '***MASKED***'
  },
}, req);
```

### 4. Request 객체 전달
IP, User-Agent 자동 추출을 위해 req 전달

```typescript
// Good
logAuditAsync(supabase, entry, req);

// Bad (컨텍스트 손실)
logAuditAsync(supabase, entry);
```

### 5. 에러 처리
로깅 실패가 주요 로직에 영향 주지 않도록 설계됨

```typescript
// 로깅 실패해도 API는 정상 작동
await createUser(data);
logAuditAsync(supabase, entry, req); // 실패해도 OK
```

---

## 성능 고려사항

1. **비동기 로깅**: 대부분 `logAuditAsync` 사용
2. **배치 처리**: 대량 작업 시 단일 로그로 요약
3. **인덱스 활용**: 자주 조회하는 필드는 인덱스 생성됨
4. **자동 정리**: 90일 이상 로그는 자동 삭제 (cleanup_old_audit_logs)

---

## 조회 예시

### 특정 리소스 히스토리

```typescript
import { getResourceAuditLogs } from '../_shared/audit-log.ts';

const logs = await getResourceAuditLogs(
  supabase,
  'subscription',
  subscriptionId,
  50
);
```

### 사용자 활동 조회

```typescript
import { getUserAuditLogs } from '../_shared/audit-log.ts';

const logs = await getUserAuditLogs(
  supabase,
  userId,
  100
);
```

---

## 마이그레이션 체크리스트

- [ ] 마이그레이션 실행: `supabase/migrations/20251201000005_create_audit_log.sql`
- [ ] 기존 Edge Function에 import 추가
- [ ] 주요 이벤트에 로깅 추가
- [ ] 에러 처리 시 로깅 추가
- [ ] 테스트: 로그가 정상 기록되는지 확인
- [ ] 성능 테스트: 로깅으로 인한 지연 확인 (< 10ms)
- [ ] 대시보드 확인: Supabase Table Editor에서 audit_log 확인
