# Minu 통합 React 훅 가이드

> **작성일**: 2025-11-27
> **버전**: 1.0.0
> **상태**: ✅ 구현 완료

---

## 📋 개요

IDEA on Action 프로젝트의 Minu 서비스 통합을 위한 4개의 React 훅을 제공합니다.

### 생성된 훅

| 훅 파일 | 용도 | 주요 기능 |
|--------|------|-----------|
| `useCanAccess.ts` | 기능 접근 권한 확인 | 플랜별 기능 제한 확인, Free 플랜 폴백 |
| `useSubscriptionUsage.ts` | 구독 사용량 조회 | 사용량 조회, 증가, 초기화 |
| `useOAuthClient.ts` | OAuth 인증 | PKCE 인증, 토큰 자동 갱신 |
| `useBillingPortal.ts` | 결제 포털 관리 | 플랜 조회, 결제 수단, 인보이스 |

---

## 🔑 1. useCanAccess - 기능 접근 권한 확인

### 개요
사용자의 구독 플랜에 따라 특정 기능 접근 가능 여부를 확인합니다.

### 주요 기능
- ✅ Free 플랜 기본 제한 적용
- ✅ 활성 구독 조회 및 features 파싱
- ✅ React Query 5분 캐싱
- ✅ 로그인하지 않은 사용자 처리

### 사용 예시

```tsx
import { useCanAccess, useHasAccess } from '@/hooks/useCanAccess'

function AIChatWidget() {
  const { canAccess, remaining, limit, isLoading } = useCanAccess('ai_chat_messages')

  if (isLoading) return <Spinner />

  if (!canAccess) {
    return (
      <UpgradePrompt
        feature="AI 채팅"
        message={`메시지 한도 ${limit}개를 모두 사용하셨습니다.`}
      />
    )
  }

  return (
    <div>
      <ChatWindow />
      <p className="text-sm text-muted-foreground">
        남은 메시지: {remaining} / {limit}
      </p>
    </div>
  )
}

// 간단한 boolean 확인
function ExportButton() {
  const canExport = useHasAccess('document_export')

  return (
    <Button disabled={!canExport}>
      {canExport ? '문서 내보내기' : '플랜 업그레이드 필요'}
    </Button>
  )
}
```

### Free 플랜 기본 제한

```typescript
const FREE_PLAN_LIMITS: Record<string, number | null> = {
  'ai_chat_messages': 10,        // AI 채팅 메시지 10개
  'document_export': 5,          // 문서 내보내기 5회
  'project_count': 1,            // 프로젝트 1개
  'team_members': 1,             // 팀 멤버 1명
  'storage_mb': 100,             // 저장공간 100MB
  'api_calls': null,             // API 호출 무제한
}
```

---

## 📊 2. useSubscriptionUsage - 구독 사용량 조회

### 개요
현재 사용자의 구독 사용량을 조회하고, 사용량을 증가시키는 mutation을 제공합니다.

### 주요 기능
- ✅ 플랜별 사용량 조회
- ✅ 사용량 증가 mutation
- ✅ 관리자용 사용량 초기화
- ✅ React Query 1분 캐싱

### 사용 예시

```tsx
import { useSubscriptionUsage, useIncrementUsage } from '@/hooks/useSubscriptionUsage'

function UsageDashboard() {
  const { usage, totalUsed, isLoading } = useSubscriptionUsage()

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-4">
      <h3>사용량 현황</h3>
      {usage.map((item) => (
        <div key={item.feature_key}>
          <div className="flex justify-between">
            <span>{item.feature_name}</span>
            <span>{item.used_count} / {item.limit_value || '무제한'}</span>
          </div>
          <Progress value={item.percentage} className="mt-2" />
        </div>
      ))}
      <p className="text-sm text-muted-foreground">
        총 사용량: {totalUsed}
      </p>
    </div>
  )
}

function AIChatButton() {
  const { incrementUsage, isLoading } = useIncrementUsage()

  const handleSendMessage = async () => {
    // 사용량 증가
    await incrementUsage({ feature_key: 'ai_chat_messages' })

    // 메시지 전송 로직...
  }

  return (
    <Button onClick={handleSendMessage} disabled={isLoading}>
      메시지 전송
    </Button>
  )
}
```

### UsageData 타입

```typescript
interface UsageData {
  feature_key: string         // 예: 'ai_chat_messages'
  feature_name: string        // 예: 'AI 채팅 메시지'
  used_count: number          // 현재 사용량
  limit_value: number | null  // 제한 (null = 무제한)
  period_start: string        // 구독 시작일 (ISO 8601)
  period_end: string          // 구독 종료일 (ISO 8601)
  percentage: number          // 사용률 (0-100)
}
```

---

## 🔐 3. useOAuthClient - OAuth 인증

### 개요
Minu 서비스용 PKCE 기반 OAuth 2.0 클라이언트 훅입니다. Supabase Auth와 독립적으로 작동합니다.

### 주요 기능
- ✅ PKCE (Proof Key for Code Exchange) 인증
- ✅ 토큰 자동 갱신 (만료 5분 전)
- ✅ localStorage 토큰 관리
- ✅ CSRF 방지 (state 검증)

### 사용 예시

```tsx
import { useOAuthClient } from '@/hooks/useOAuthClient'

function MinuServicePage() {
  const {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout
  } = useOAuthClient()

  if (isLoading) return <Spinner />

  if (!isAuthenticated) {
    return (
      <div>
        <h2>Minu 서비스 로그인</h2>
        <Button onClick={() => login()}>
          Minu 계정으로 로그인
        </Button>
      </div>
    )
  }

  return (
    <div>
      <header>
        <p>환영합니다, {user?.name || user?.email}님!</p>
        <Button variant="ghost" onClick={logout}>
          로그아웃
        </Button>
      </header>
      <main>
        {/* Minu 서비스 콘텐츠 */}
      </main>
    </div>
  )
}

// OAuth 콜백 페이지
function OAuthCallbackPage() {
  const { handleCallback } = useOAuthClient()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (code && state) {
      handleCallback(code, state)
        .then(() => {
          navigate('/minu/dashboard')
        })
        .catch((error) => {
          console.error('OAuth 콜백 처리 실패:', error)
          navigate('/minu/login?error=auth_failed')
        })
    }
  }, [searchParams])

  return <Spinner />
}
```

### OAuth 흐름

```
1. 사용자가 "로그인" 버튼 클릭
   → login() 호출

2. PKCE code_verifier, code_challenge, state 생성
   → localStorage에 저장
   → OAuth 서버로 리다이렉트

3. OAuth 서버에서 인증 후 콜백 URL로 리다이렉트
   → code, state 파라미터 포함

4. handleCallback(code, state) 호출
   → state 검증 (CSRF 방지)
   → code + code_verifier로 토큰 교환
   → access_token, refresh_token 저장

5. 자동 토큰 갱신
   → 만료 5분 전에 refreshToken() 자동 호출
```

---

## 💳 4. useBillingPortal - 결제 포털 관리

### 개요
사용자의 구독 정보, 결제 수단, 인보이스를 조회하고 관리하는 훅입니다.

### 주요 기능
- ✅ 현재 플랜 조회
- ✅ 결제 수단 조회 (카드, 계좌)
- ✅ 인보이스 목록 조회
- ✅ 구독 취소 (기간 종료 시)
- ✅ 플랜 변경

### 사용 예시

```tsx
import { useBillingPortal, useDownloadInvoice } from '@/hooks/useBillingPortal'

function BillingPage() {
  const {
    currentPlan,
    nextBillingDate,
    paymentMethod,
    invoices,
    isLoading,
    openPortal,
    cancelSubscription,
    changePlan,
  } = useBillingPortal()

  const { downloadInvoice } = useDownloadInvoice()

  if (isLoading) return <Spinner />

  if (!currentPlan) {
    return (
      <EmptyState
        title="활성 구독이 없습니다"
        action={<Button href="/pricing">플랜 선택하기</Button>}
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* 현재 플랜 */}
      <Card>
        <CardHeader>
          <CardTitle>{currentPlan.plan.plan_name} 플랜</CardTitle>
          <CardDescription>
            다음 결제일: {new Date(nextBillingDate).toLocaleDateString('ko-KR')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>월 {currentPlan.plan.price.toLocaleString()}원</p>
          <div className="mt-4 space-x-2">
            <Button onClick={openPortal}>
              결제 수단 관리
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('정말 구독을 취소하시겠습니까?')) {
                  cancelSubscription()
                }
              }}
            >
              구독 취소
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 결제 수단 */}
      {paymentMethod && (
        <Card>
          <CardHeader>
            <CardTitle>결제 수단</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <span>{paymentMethod.card_type}</span>
              <span className="text-muted-foreground">
                {paymentMethod.card_number}
              </span>
              {paymentMethod.is_default && (
                <Badge>기본 결제 수단</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 인보이스 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>인보이스</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>번호</TableHead>
                <TableHead>날짜</TableHead>
                <TableHead>금액</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.invoice_number}</TableCell>
                  <TableCell>
                    {new Date(invoice.billing_date).toLocaleDateString('ko-KR')}
                  </TableCell>
                  <TableCell>
                    {invoice.amount.toLocaleString()}원
                  </TableCell>
                  <TableCell>
                    <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                      {invoice.status === 'paid' ? '결제 완료' : '대기 중'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadInvoice(invoice.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

### Invoice 타입

```typescript
interface Invoice {
  id: string
  invoice_number: string      // 예: 'INV-ABC12345'
  amount: number               // 금액 (원)
  status: 'pending' | 'paid' | 'failed' | 'cancelled'
  billing_date: string         // 청구일 (ISO 8601)
  paid_at: string | null       // 결제일 (ISO 8601)
  pdf_url: string | null       // PDF 다운로드 URL
  items: InvoiceItem[]         // 청구 항목
}

interface InvoiceItem {
  description: string          // 항목 설명
  quantity: number             // 수량
  unit_price: number           // 단가
  total: number                // 합계
}
```

---

## 🔧 환경 변수 설정

OAuth 클라이언트를 사용하려면 `.env.local` 파일에 다음 환경 변수를 추가하세요:

```env
# Minu OAuth 설정
VITE_OAUTH_CLIENT_ID=your-client-id
VITE_OAUTH_AUTHORIZE_URL=https://auth.minu.example.com/oauth/authorize
VITE_OAUTH_TOKEN_URL=https://auth.minu.example.com/oauth/token
```

---

## 📌 TODO 및 개선 사항

### useCanAccess
- [ ] 실제 usage_logs 테이블 연동
- [ ] Edge Function으로 사용량 조회 로직 이동 (RLS 보안)

### useSubscriptionUsage
- [ ] usage_logs 테이블 생성 및 마이그레이션
- [ ] Edge Function `increment-usage` 구현
- [ ] 사용량 주기별 리셋 로직 (cron job)

### useOAuthClient
- [ ] 실제 OAuth 서버 엔드포인트 연동
- [ ] Edge Function `oauth/token` 구현
- [ ] 구독 정보 조회 로직 추가

### useBillingPortal
- [ ] 토스페이먼츠 빌링키 연동
- [ ] 인보이스 PDF 생성 Edge Function
- [ ] 플랜 변경 시 일할 계산 (prorate)
- [ ] 결제 수단 추가/변경 UI

---

## 🧪 테스트 가이드

### 단위 테스트 (Vitest)

```typescript
// tests/unit/hooks/useCanAccess.test.tsx
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCanAccess } from '@/hooks/useCanAccess'

describe('useCanAccess', () => {
  it('Free 플랜 사용자는 기본 제한 적용', async () => {
    const { result } = renderHook(() => useCanAccess('ai_chat_messages'), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={new QueryClient()}>
          {children}
        </QueryClientProvider>
      ),
    })

    await waitFor(() => {
      expect(result.current.canAccess).toBe(true)
      expect(result.current.limit).toBe(10)
    })
  })
})
```

### E2E 테스트 (Playwright)

```typescript
// tests/e2e/minu-integration.spec.ts
import { test, expect } from '@playwright/test'

test('Minu 로그인 플로우', async ({ page }) => {
  await page.goto('/minu/find')

  // 로그인 버튼 클릭
  await page.click('button:has-text("Minu 로그인")')

  // OAuth 서버로 리다이렉트 확인
  await expect(page).toHaveURL(/oauth\/authorize/)

  // 로그인 후 콜백 처리
  // ... (OAuth 서버 모킹 필요)
})
```

---

## 📚 참고 자료

- [React Query 공식 문서](https://tanstack.com/query/latest/docs/react/overview)
- [OAuth 2.0 PKCE 스펙 (RFC 7636)](https://datatracker.ietf.org/doc/html/rfc7636)
- [토스페이먼츠 빌링 API](https://docs.tosspayments.com/reference/billing)
- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)

---

**작성자**: Claude (AI Assistant)
**검토자**: 서민원
**마지막 업데이트**: 2025-11-27
