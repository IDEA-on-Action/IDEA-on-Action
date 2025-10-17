# Phase 9: 전자상거래 기능 구현 계획

**계획 수립일**: 2025-10-17
**예상 시작**: 2025-10-20
**예상 완료**: 2025-11-03 (2주)
**버전**: v2.0.0 (Major Release)

---

## 📋 개요

서비스 판매를 위한 전자상거래 기능을 구현합니다.
장바구니, 주문 관리, 결제 게이트웨이 통합이 포함됩니다.

---

## 🎯 목표

### 비즈니스 목표
1. 서비스 온라인 판매 시작
2. 자동화된 주문 관리 시스템
3. 안전한 결제 처리

### 기술 목표
1. 장바구니 시스템 (로컬 + DB 동기화)
2. 주문 생성 및 상태 관리
3. 결제 게이트웨이 통합 (카카오페이, 토스페이먼츠)
4. 주문 내역 조회

---

## 🗓️ 일정

### Week 1 (2025-10-20 ~ 10-26)
- **Day 1-2**: 장바구니 시스템
- **Day 3-4**: 주문 관리 시스템
- **Day 5**: 주문 내역 페이지

### Week 2 (2025-10-27 ~ 11-03)
- **Day 1-3**: 결제 게이트웨이 통합 (카카오페이)
- **Day 4**: 결제 게이트웨이 통합 (토스페이먼츠)
- **Day 5**: 테스트 및 문서화
- **Day 6-7**: 배포 및 검증

---

## 📊 기술 스택

### 상태 관리
- **Zustand** 또는 **Jotai** - 전역 장바구니 상태
- **React Query** - 서버 상태 (주문, 결제)

### 결제
- **카카오페이** - 카카오 결제
- **토스페이먼츠** - 신용카드, 계좌이체, 간편결제

### 폼 관리
- **React Hook Form** - 주문 폼
- **Zod** - 검증

---

## 🛠️ 구현 단계

## Step 1: 장바구니 시스템 (Day 1-2)

### 1.1 Zustand Store 생성
**파일**: `src/stores/cartStore.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartItem {
  service_id: string
  service: Service
  quantity: number
  price: number
}

interface CartStore {
  items: CartItem[]
  addItem: (service: Service) => void
  removeItem: (serviceId: string) => void
  updateQuantity: (serviceId: string, quantity: number) => void
  clearCart: () => void
  total: number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (service) => {
        // 구현
      },
      removeItem: (serviceId) => {
        // 구현
      },
      updateQuantity: (serviceId, quantity) => {
        // 구현
      },
      clearCart: () => set({ items: [] }),
      get total() {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      },
    }),
    { name: 'cart-storage' }
  )
)
```

### 1.2 Cart 컴포넌트
**파일**: `src/components/cart/Cart.tsx`

- Sheet (사이드바) UI
- CartItem 목록
- 총액 표시
- "주문하기" 버튼

### 1.3 Header 통합
**파일**: `src/components/Header.tsx`

- 장바구니 아이콘 + 개수 배지
- 클릭 시 Cart Sheet 열기

### 1.4 서비스 상세 페이지 통합
**파일**: `src/pages/ServiceDetail.tsx`

- "장바구니에 추가" 버튼
- 수량 선택 UI

---

## Step 2: 주문 관리 시스템 (Day 3-4)

### 2.1 주문 폼
**파일**: `src/pages/Checkout.tsx`

**폼 필드**:
```typescript
interface CheckoutForm {
  // 배송 정보
  recipient_name: string
  recipient_phone: string
  recipient_email: string

  // 주소
  postal_code: string
  address: string
  address_detail: string

  // 요청사항
  delivery_memo?: string

  // 결제 방법
  payment_method: 'kakao' | 'toss' | 'card' | 'bank'
}
```

**UI 구성**:
1. 주문 상품 요약
2. 배송 정보 입력
3. 결제 수단 선택
4. 최종 금액 표시
5. "결제하기" 버튼

### 2.2 주문 생성 Hook
**파일**: `src/hooks/useCreateOrder.ts`

```typescript
export function useCreateOrder() {
  return useMutation({
    mutationFn: async (orderData: CreateOrderData) => {
      // 1. orders 테이블에 주문 생성
      const { data: order } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: cart.total,
          status: 'pending',
          recipient_name: orderData.recipient_name,
          // ...
        })
        .select()
        .single()

      // 2. order_items 테이블에 상품 추가
      const items = cart.items.map(item => ({
        order_id: order.id,
        service_id: item.service_id,
        quantity: item.quantity,
        price: item.price,
      }))

      await supabase.from('order_items').insert(items)

      return order
    },
    onSuccess: (order) => {
      // 결제 페이지로 이동
      navigate(`/payment/${order.id}`)
    },
  })
}
```

### 2.3 주문 내역 페이지
**파일**: `src/pages/Orders.tsx`

- 주문 목록 (테이블)
- 주문 상태 필터
- 주문 상세 모달
- 결제 상태 표시

---

## Step 3: 결제 게이트웨이 (Day 1-4, Week 2)

### 3.1 카카오페이 통합
**파일**: `src/services/kakaoPayService.ts`

```typescript
export class KakaoPayService {
  private readonly apiUrl = 'https://kapi.kakao.com/v1/payment'

  async requestPayment(orderData: PaymentRequest) {
    // 1. 카카오페이 결제 준비
    const response = await fetch(`${this.apiUrl}/ready`, {
      method: 'POST',
      headers: {
        'Authorization': `KakaoAK ${process.env.KAKAO_ADMIN_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        cid: process.env.KAKAO_CID,
        partner_order_id: orderData.order_id,
        partner_user_id: orderData.user_id,
        item_name: orderData.item_name,
        quantity: orderData.quantity,
        total_amount: orderData.total_amount,
        tax_free_amount: 0,
        approval_url: `${window.location.origin}/payment/kakao/success`,
        cancel_url: `${window.location.origin}/payment/kakao/cancel`,
        fail_url: `${window.location.origin}/payment/kakao/fail`,
      }),
    })

    const data = await response.json()

    // 2. 결제 페이지로 리다이렉트
    window.location.href = data.next_redirect_pc_url
  }

  async approvePayment(pg_token: string, order_id: string) {
    // 결제 승인 API 호출
  }
}
```

**Supabase Edge Function**: `supabase/functions/kakao-payment/index.ts`
```typescript
serve(async (req) => {
  const { action, data } = await req.json()

  switch (action) {
    case 'ready':
      return await kakaoPayService.ready(data)
    case 'approve':
      return await kakaoPayService.approve(data)
    case 'cancel':
      return await kakaoPayService.cancel(data)
  }
})
```

### 3.2 토스페이먼츠 통합
**파일**: `src/services/tossPaymentService.ts`

```typescript
export class TossPaymentService {
  private readonly clientKey = process.env.TOSS_CLIENT_KEY

  async requestPayment(orderData: PaymentRequest) {
    const tossPayments = await loadTossPayments(this.clientKey)

    await tossPayments.requestPayment('카드', {
      amount: orderData.total_amount,
      orderId: orderData.order_id,
      orderName: orderData.item_name,
      customerName: orderData.customer_name,
      successUrl: `${window.location.origin}/payment/toss/success`,
      failUrl: `${window.location.origin}/payment/toss/fail`,
    })
  }

  async confirmPayment(paymentKey: string, orderId: string, amount: number) {
    // 결제 승인 API 호출 (서버 사이드)
  }
}
```

**Supabase Edge Function**: `supabase/functions/toss-payment/index.ts`

### 3.3 결제 성공/실패 페이지
**파일**: `src/pages/PaymentSuccess.tsx`, `src/pages/PaymentFail.tsx`

- 결제 결과 표시
- 주문 정보 요약
- 영수증 다운로드
- 홈/주문내역 이동 버튼

---

## Step 4: 관리자 주문 관리 (선택)

### 4.1 관리자 주문 목록
**파일**: `src/pages/admin/AdminOrders.tsx`

- 전체 주문 목록
- 상태별 필터 (대기/결제완료/배송중/완료/취소)
- 주문 상세 보기
- 상태 변경 기능

### 4.2 대시보드 통합
**파일**: `src/pages/admin/Dashboard.tsx`

- 오늘 주문 수
- 총 매출액
- 주문 상태 차트
- 최근 주문 목록

---

## 📁 파일 구조

```
src/
├── stores/
│   └── cartStore.ts              # Zustand 장바구니 스토어
│
├── components/
│   └── cart/
│       ├── Cart.tsx              # 장바구니 Sheet
│       ├── CartItem.tsx          # 장바구니 아이템
│       └── CartSummary.tsx       # 총액 요약
│
├── pages/
│   ├── Checkout.tsx              # 주문 페이지
│   ├── Orders.tsx                # 주문 내역
│   ├── PaymentSuccess.tsx        # 결제 성공
│   ├── PaymentFail.tsx           # 결제 실패
│   └── admin/
│       └── AdminOrders.tsx       # 관리자 주문 관리
│
├── services/
│   ├── kakaoPayService.ts        # 카카오페이
│   └── tossPaymentService.ts     # 토스페이먼츠
│
├── hooks/
│   ├── useCart.ts                # 장바구니 훅
│   ├── useCreateOrder.ts         # 주문 생성
│   ├── useOrders.ts              # 주문 목록
│   └── usePayment.ts             # 결제 처리
│
└── types/
    ├── cart.ts                   # 장바구니 타입
    ├── order.ts                  # 주문 타입
    └── payment.ts                # 결제 타입
```

---

## 🗄️ 데이터베이스 (이미 존재)

### orders
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  total_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  address TEXT NOT NULL,
  address_detail TEXT,
  delivery_memo TEXT,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### order_items
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id),
  quantity INTEGER NOT NULL,
  price INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### payments
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  payment_key TEXT,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔐 보안

### 1. 결제 보안
- [ ] API Key 서버 사이드만 사용
- [ ] Supabase Edge Function으로 결제 API 호출
- [ ] 환경 변수 암호화
- [ ] HTTPS 강제

### 2. 주문 보안
- [ ] RLS 정책: 본인 주문만 조회
- [ ] 관리자만 전체 주문 조회
- [ ] 가격 검증 (서버 사이드)

### 3. 데이터 검증
- [ ] 주문 생성 시 재고 확인
- [ ] 가격 변조 방지 (DB에서 가격 조회)
- [ ] 중복 결제 방지

---

## ✅ 완료 기준

### 기능
- [ ] 장바구니 추가/삭제/수량 변경
- [ ] 주문 생성 성공
- [ ] 카카오페이 결제 성공
- [ ] 토스페이먼츠 결제 성공
- [ ] 주문 내역 조회
- [ ] 관리자 주문 관리

### 테스트
- [ ] 장바구니 동작 (로컬 스토리지 동기화)
- [ ] 주문 생성 및 저장
- [ ] 카카오페이 결제 플로우
- [ ] 토스페이먼츠 결제 플로우
- [ ] 결제 성공/실패 처리
- [ ] 주문 상태 변경

### 문서
- [ ] 결제 연동 가이드
- [ ] API 문서
- [ ] 환경 변수 설정 가이드

---

## 📊 마일스톤

### M1: 장바구니 (Day 1-2)
- [x] Zustand store
- [ ] Cart UI
- [ ] Header 통합
- [ ] 서비스 상세 통합

### M2: 주문 (Day 3-4)
- [ ] Checkout 페이지
- [ ] 주문 생성 API
- [ ] Orders 페이지

### M3: 카카오페이 (Day 1-2, Week 2)
- [ ] 카카오페이 SDK
- [ ] 결제 준비/승인
- [ ] Supabase Function
- [ ] 성공/실패 페이지

### M4: 토스페이먼츠 (Day 3-4, Week 2)
- [ ] 토스 SDK
- [ ] 결제 요청/승인
- [ ] Supabase Function

### M5: 테스트 & 배포 (Day 5-7, Week 2)
- [ ] E2E 테스트
- [ ] 문서 작성
- [ ] 배포

---

## 🚀 배포 계획

### 환경 변수 (추가)
```env
# 카카오페이
VITE_KAKAO_CID=TC0ONETIME
KAKAO_ADMIN_KEY=your_admin_key (서버만)

# 토스페이먼츠
VITE_TOSS_CLIENT_KEY=test_ck_xxx
TOSS_SECRET_KEY=test_sk_xxx (서버만)
```

### Supabase Functions 배포
```bash
supabase functions deploy kakao-payment
supabase functions deploy toss-payment
```

---

## 📝 참고 자료

- [카카오페이 개발 가이드](https://developers.kakao.com/docs/latest/ko/kakaopay/common)
- [토스페이먼츠 개발 가이드](https://docs.tosspayments.com/)
- [Zustand 문서](https://zustand-demo.pmnd.rs/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**End of Plan**
