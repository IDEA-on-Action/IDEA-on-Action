# REST API Integration Guide

IDEA on Action 프로젝트의 User/Subscription REST API Edge Functions 통합 가이드

## 개요

3개의 Edge Functions를 통해 사용자 정보, 구독 관리, 웹훅 전송 기능을 제공합니다.

### Edge Functions

| Function | 엔드포인트 | 설명 |
|----------|-----------|------|
| **user-api** | `/functions/v1/user-api/*` | 사용자 정보 및 구독 조회 |
| **subscription-api** | `/functions/v1/subscription-api/*` | 구독 기능 제한 및 사용량 관리 |
| **webhook-send** | `/functions/v1/webhook-send` | 웹훅 전송 (내부 전용) |

---

## 1. 인증 방식

모든 API는 **Bearer Token** 인증을 사용합니다.

### 사용자 토큰 (User API, Subscription API)

```typescript
// Supabase Auth 토큰 사용
const { data: { session } } = await supabase.auth.getSession()
const accessToken = session?.access_token

// API 호출
const response = await fetch('https://YOUR_PROJECT.supabase.co/functions/v1/user-api/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
})
```

### Service Role Key (Webhook Send)

```typescript
// 서버 측에서만 사용 (절대 클라이언트에 노출 금지)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const response = await fetch('https://YOUR_PROJECT.supabase.co/functions/v1/webhook-send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ ... }),
})
```

---

## 2. React 훅 생성

### 2.1. useUserProfile (GET /api/user/me)

```typescript
// src/hooks/useUserProfile.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  subscription: SubscriptionInfo | null
}

export function useUserProfile() {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-api/me`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch user profile')
      }

      return response.json() as Promise<UserProfile>
    },
    staleTime: 5 * 60 * 1000, // 5분
  })
}
```

### 2.2. useSubscriptionUsage (GET /api/subscription/usage)

```typescript
// src/hooks/useSubscriptionUsage.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface FeatureUsage {
  feature_key: string
  used_count: number
  limit: number
  remaining: number
  period_start: string
  period_end: string
}

interface UsageResponse {
  subscription_id: string
  plan_name: string
  billing_cycle: string
  current_period_start: string
  current_period_end: string
  features: FeatureUsage[]
}

export function useSubscriptionUsage() {
  return useQuery({
    queryKey: ['subscription', 'usage'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscription-api/usage`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch subscription usage')
      }

      return response.json() as Promise<UsageResponse>
    },
    staleTime: 1 * 60 * 1000, // 1분
  })
}
```

### 2.3. useIncrementUsage (POST /api/subscription/usage/increment)

```typescript
// src/hooks/useIncrementUsage.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface IncrementUsageParams {
  feature_key: string
}

interface IncrementResponse {
  success: boolean
  feature_key: string
  used_count: number
  remaining: number
}

export function useIncrementUsage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: IncrementUsageParams) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscription-api/usage/increment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to increment usage')
      }

      return response.json() as Promise<IncrementResponse>
    },
    onSuccess: () => {
      // 사용량 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['subscription', 'usage'] })
    },
  })
}
```

### 2.4. useCanAccessFeature (GET /api/subscription/can-access)

```typescript
// src/hooks/useCanAccessFeature.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface CanAccessResponse {
  can_access: boolean
  feature_key: string
  used_count: number
  limit: number
  remaining: number
}

export function useCanAccessFeature(featureKey: string) {
  return useQuery({
    queryKey: ['subscription', 'can-access', featureKey],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscription-api/can-access?feature_key=${featureKey}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to check feature access')
      }

      return response.json() as Promise<CanAccessResponse>
    },
    staleTime: 30 * 1000, // 30초
    enabled: !!featureKey, // featureKey가 있을 때만 실행
  })
}
```

---

## 3. UI 컴포넌트 예시

### 3.1. UsageProgressBar

```typescript
// src/components/subscription/UsageProgressBar.tsx
import { useSubscriptionUsage } from '@/hooks/useSubscriptionUsage'
import { Progress } from '@/components/ui/progress'
import { Alert } from '@/components/ui/alert'

interface UsageProgressBarProps {
  featureKey: string
  title: string
}

export function UsageProgressBar({ featureKey, title }: UsageProgressBarProps) {
  const { data: usage, isLoading } = useSubscriptionUsage()

  if (isLoading) return <div>Loading...</div>

  const feature = usage?.features.find(f => f.feature_key === featureKey)

  if (!feature) return null

  const percentage = feature.limit === -1
    ? 0 // 무제한
    : (feature.used_count / feature.limit) * 100

  const isNearLimit = percentage >= 80 && feature.limit !== -1

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{title}</span>
        <span className={isNearLimit ? 'text-orange-500' : 'text-gray-600'}>
          {feature.limit === -1
            ? `${feature.used_count} (무제한)`
            : `${feature.used_count} / ${feature.limit}`
          }
        </span>
      </div>

      {feature.limit !== -1 && (
        <Progress
          value={percentage}
          className={isNearLimit ? 'bg-orange-500' : ''}
        />
      )}

      {isNearLimit && (
        <Alert variant="warning">
          사용량이 80%를 초과했습니다. 플랜 업그레이드를 고려하세요.
        </Alert>
      )}
    </div>
  )
}
```

### 3.2. FeatureGate (기능 게이트)

```typescript
// src/components/subscription/FeatureGate.tsx
import { useCanAccessFeature } from '@/hooks/useCanAccessFeature'
import { useIncrementUsage } from '@/hooks/useIncrementUsage'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

interface FeatureGateProps {
  featureKey: string
  onAccess: () => void
  children: React.ReactNode
}

export function FeatureGate({ featureKey, onAccess, children }: FeatureGateProps) {
  const { data: access, isLoading } = useCanAccessFeature(featureKey)
  const incrementUsage = useIncrementUsage()

  const handleClick = async () => {
    if (!access?.can_access) {
      alert('기능 사용 제한을 초과했습니다.')
      return
    }

    try {
      // 사용량 증가
      await incrementUsage.mutateAsync({ feature_key: featureKey })

      // 기능 실행
      onAccess()
    } catch (error) {
      console.error('Failed to increment usage:', error)
      alert('기능 실행 중 오류가 발생했습니다.')
    }
  }

  if (isLoading) return <div>Loading...</div>

  if (!access?.can_access) {
    return (
      <Alert variant="warning">
        <p>사용 가능 횟수: {access?.remaining || 0}</p>
        <Button variant="outline" disabled>
          사용 제한 초과
        </Button>
      </Alert>
    )
  }

  return (
    <div onClick={handleClick}>
      {children}
    </div>
  )
}
```

---

## 4. 웹훅 통합

### 4.1. 서버 측 웹훅 전송

```typescript
// server/webhooks/sendSubscriptionWebhook.ts
export async function sendSubscriptionWebhook(
  eventType: string,
  payload: Record<string, any>
) {
  const response = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/webhook-send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: eventType,
        payload,
        target_urls: [
          'https://api.example.com/webhooks/subscription',
        ],
      }),
    }
  )

  if (!response.ok) {
    throw new Error('Failed to send webhook')
  }

  return response.json()
}
```

### 4.2. 웹훅 수신 (Node.js/Express)

```javascript
// server/routes/webhooks.js
const crypto = require('crypto')
const express = require('express')
const router = express.Router()

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const expectedSignature = 'sha256=' + hmac.digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

router.post('/subscription', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-signature']
  const payload = req.body.toString()

  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const eventType = req.headers['x-event-type']
  const data = JSON.parse(payload)

  console.log('Received webhook:', eventType, data)

  // 이벤트 처리
  switch (eventType) {
    case 'subscription.created':
      // 구독 생성 처리
      break
    case 'subscription.cancelled':
      // 구독 취소 처리
      break
    case 'payment.succeeded':
      // 결제 성공 처리
      break
    default:
      console.log('Unknown event type:', eventType)
  }

  res.status(200).json({ received: true })
})

module.exports = router
```

---

## 5. Rate Limiting 처리

### 5.1. React Query retry 설정

```typescript
// src/lib/react-query.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // 429 Rate Limit는 재시도하지 않음
        if (error?.status === 429) return false

        // 최대 3회 재시도
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => {
        // 지수 백오프: 1초, 2초, 4초
        return Math.min(1000 * 2 ** attemptIndex, 30000)
      },
    },
  },
})
```

### 5.2. Rate Limit 에러 처리

```typescript
// src/lib/api.ts
export async function fetchWithRateLimit(url: string, options?: RequestInit) {
  const response = await fetch(url, options)

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After')
    throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds.`)
  }

  return response
}
```

---

## 6. 환경 변수

```bash
# .env.local (클라이언트)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# .env (서버)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
WEBHOOK_SECRET=your_webhook_secret
```

---

## 7. 테스트

### 7.1. 단위 테스트

```typescript
// src/hooks/__tests__/useUserProfile.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUserProfile } from '@/hooks/useUserProfile'

describe('useUserProfile', () => {
  it('should fetch user profile', async () => {
    const queryClient = new QueryClient()
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useUserProfile(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveProperty('id')
    expect(result.current.data).toHaveProperty('email')
  })
})
```

### 7.2. E2E 테스트

```typescript
// tests/e2e/subscription-api.spec.ts
import { test, expect } from '@playwright/test'

test('should display subscription usage', async ({ page }) => {
  await page.goto('http://localhost:5173/subscription')

  await page.waitForSelector('[data-testid="usage-progress-bar"]')

  const usageText = await page.textContent('[data-testid="usage-count"]')
  expect(usageText).toMatch(/\d+ \/ \d+/)
})
```

---

## 8. 배포

```bash
# Edge Functions 배포
supabase functions deploy user-api
supabase functions deploy subscription-api
supabase functions deploy webhook-send

# Secret 설정
supabase secrets set WEBHOOK_SECRET=your_secret_key

# 로그 확인
supabase functions logs user-api --tail
supabase functions logs subscription-api --tail
```

---

## 참고 문서

- [User API README](../supabase/functions/user-api/README.md)
- [Subscription API README](../supabase/functions/subscription-api/README.md)
- [Webhook Send README](../supabase/functions/webhook-send/README.md)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [React Query Docs](https://tanstack.com/query/latest)
