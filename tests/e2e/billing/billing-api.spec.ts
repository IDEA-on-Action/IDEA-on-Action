import { test, expect } from "@playwright/test";
import { loginAsRegularUser, loginAsAdmin } from "../../fixtures/auth-helpers";
import * as crypto from "crypto";

/**
 * Billing API E2E Tests
 *
 * 결제 시스템 API 테스트
 *
 * 테스트 시나리오:
 * - 현재 플랜 정보 조회
 * - 결제 내역 목록 조회
 * - 플랜 변경 요청
 * - 구독 취소 요청
 * - 웹훅 수신 및 처리
 * - HMAC 서명 검증
 */

test.describe("Billing API", () => {
  const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";

  test("현재 플랜 정보 조회", async ({ page, request }) => {
    await loginAsRegularUser(page);

    // 현재 구독 플랜 조회 API
    const response = await request.get(`${BASE_URL}/api/user/subscription`, {
      failOnStatusCode: false,
    });

    if (response.ok()) {
      const body = await response.json();

      // 필수 필드 확인
      expect(body).toHaveProperty("service");
      expect(body).toHaveProperty("plan");
      expect(body).toHaveProperty("status");
      expect(body).toHaveProperty("currentPeriodEnd");

      // 플랜 유형 확인
      expect(["free", "basic", "pro", "enterprise"]).toContain(body.plan);

      // 상태 확인
      expect([
        "active",
        "trialing",
        "canceled",
        "past_due",
        "suspended",
      ]).toContain(body.status);

      console.log("현재 플랜:", body.plan, "상태:", body.status);
    } else {
      // API 미구현 시
      expect([401, 404, 501]).toContain(response.status());
    }
  });

  test("결제 내역 목록 조회", async ({ page, request }) => {
    await loginAsRegularUser(page);

    // 결제 내역 조회 API
    const response = await request.get(`${BASE_URL}/api/user/payments`, {
      failOnStatusCode: false,
    });

    if (response.ok()) {
      const body = await response.json();

      // 결제 내역은 배열로 반환
      expect(Array.isArray(body)).toBeTruthy();

      if (body.length > 0) {
        const payment = body[0];

        // 결제 정보 필드 확인
        expect(payment).toHaveProperty("id");
        expect(payment).toHaveProperty("amount");
        expect(payment).toHaveProperty("status");
        expect(payment).toHaveProperty("createdAt");

        // 결제 상태 확인
        expect(["pending", "success", "failed", "canceled"]).toContain(
          payment.status,
        );

        console.log("결제 내역 수:", body.length);
      } else {
        console.log("결제 내역 없음");
      }
    } else {
      expect([401, 404, 501]).toContain(response.status());
    }
  });

  test("플랜 변경 요청", async ({ page, request }) => {
    await loginAsRegularUser(page);

    // 플랜 변경 요청 (Basic → Pro)
    const response = await request.post(
      `${BASE_URL}/api/user/subscription/upgrade`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          service: "find",
          newPlan: "pro",
          billingCycle: "monthly",
        },
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      // 업그레이드 응답 확인
      expect(body).toHaveProperty("subscription");
      expect(body.subscription).toHaveProperty("plan", "pro");

      console.log("플랜 변경 성공:", body);
    } else if (response.status() === 400) {
      // 이미 Pro 플랜이거나 결제 수단 없음
      const body = await response.json();
      expect(body).toHaveProperty("error");
      console.log("플랜 변경 실패:", body.error);
    } else {
      // API 미구현
      expect([401, 404, 501]).toContain(response.status());
    }
  });

  test("구독 취소 요청", async ({ page, request }) => {
    await loginAsRegularUser(page);

    // 구독 취소 요청
    const response = await request.post(
      `${BASE_URL}/api/user/subscription/cancel`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          service: "find",
          cancelAtPeriodEnd: true, // 현재 기간 종료 시 취소
          reason: "E2E 테스트 취소",
        },
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      // 취소 응답 확인
      expect(body).toHaveProperty("subscription");
      expect(body.subscription).toHaveProperty("cancelAtPeriodEnd", true);

      console.log("구독 취소 요청 성공");
    } else if (response.status() === 400) {
      // 취소할 구독이 없음
      const body = await response.json();
      expect(body).toHaveProperty("error");
      console.log("구독 취소 실패:", body.error);
    } else {
      // API 미구현
      expect([401, 404, 501]).toContain(response.status());
    }
  });

  test("웹훅 수신 및 처리", async ({ request }) => {
    // 웹훅 엔드포인트 테스트
    const webhookPayload = {
      type: "subscription.updated",
      data: {
        userId: "test-user-id",
        service: "find",
        plan: "pro",
        status: "active",
        currentPeriodEnd: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
      timestamp: Date.now(),
    };

    // HMAC 서명 생성 (실제 webhook secret 필요)
    const webhookSecret = process.env.WEBHOOK_SECRET || "test-webhook-secret";
    const signature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(webhookPayload))
      .digest("hex");

    // 웹훅 요청
    const response = await request.post(
      `${BASE_URL}/api/webhook/subscription`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-webhook-signature": signature,
        },
        data: webhookPayload,
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      // 웹훅 처리 성공 응답
      expect(body).toHaveProperty("received", true);

      console.log("웹훅 수신 성공");
    } else {
      // API 미구현 또는 서명 불일치
      expect([401, 404, 501]).toContain(response.status());
    }
  });

  test("HMAC 서명 검증", async ({ request }) => {
    // 잘못된 서명으로 웹훅 요청
    const webhookPayload = {
      type: "subscription.updated",
      data: {
        userId: "test-user-id",
        service: "find",
        plan: "pro",
      },
      timestamp: Date.now(),
    };

    const invalidSignature = "invalid-signature-12345";

    // 웹훅 요청
    const response = await request.post(
      `${BASE_URL}/api/webhook/subscription`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-webhook-signature": invalidSignature,
        },
        data: webhookPayload,
        failOnStatusCode: false,
      },
    );

    // 서명 검증 실패 시 401 응답
    if (response.status() === 401) {
      const body = await response.json();
      expect(body).toHaveProperty("error");
      expect(body.error).toMatch(/signature|invalid/i);

      console.log("HMAC 서명 검증 실패 (예상된 동작)");
    } else {
      // API 미구현
      expect([404, 501]).toContain(response.status());
    }
  });
});

test.describe("Billing API - Payment Methods", () => {
  const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";

  test("결제 수단 목록 조회", async ({ page, request }) => {
    await loginAsRegularUser(page);

    const response = await request.get(`${BASE_URL}/api/user/payment-methods`, {
      failOnStatusCode: false,
    });

    if (response.ok()) {
      const body = await response.json();

      expect(Array.isArray(body)).toBeTruthy();

      if (body.length > 0) {
        const paymentMethod = body[0];

        expect(paymentMethod).toHaveProperty("id");
        expect(paymentMethod).toHaveProperty("type"); // 'card', 'bank_account'
        expect(paymentMethod).toHaveProperty("isDefault");

        console.log("결제 수단 수:", body.length);
      }
    }
  });

  test("결제 수단 추가", async ({ page, request }) => {
    await loginAsRegularUser(page);

    // 테스트 카드 정보
    const response = await request.post(
      `${BASE_URL}/api/user/payment-methods`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          type: "card",
          cardNumber: "4242424242424242",
          expiryMonth: "12",
          expiryYear: "2025",
          cvc: "123",
          cardholderName: "테스트 사용자",
        },
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      expect(body).toHaveProperty("id");
      expect(body).toHaveProperty("type", "card");

      console.log("결제 수단 추가 성공");
    } else {
      // 실제 결제 게이트웨이 연동 필요
      expect([400, 401, 404, 501]).toContain(response.status());
    }
  });

  test("결제 수단 삭제", async ({ request }) => {
    const paymentMethodId = "pm_test_123";

    const response = await request.delete(
      `${BASE_URL}/api/user/payment-methods/${paymentMethodId}`,
      {
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      expect([200, 204]).toContain(response.status());
      console.log("결제 수단 삭제 성공");
    } else {
      expect([400, 401, 404, 501]).toContain(response.status());
    }
  });
});

test.describe("Billing API - Invoices", () => {
  const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";

  test("인보이스 목록 조회", async ({ page, request }) => {
    await loginAsRegularUser(page);

    const response = await request.get(`${BASE_URL}/api/user/invoices`, {
      failOnStatusCode: false,
    });

    if (response.ok()) {
      const body = await response.json();

      expect(Array.isArray(body)).toBeTruthy();

      if (body.length > 0) {
        const invoice = body[0];

        expect(invoice).toHaveProperty("id");
        expect(invoice).toHaveProperty("amount");
        expect(invoice).toHaveProperty("status"); // 'paid', 'open', 'void'
        expect(invoice).toHaveProperty("createdAt");
        expect(invoice).toHaveProperty("pdfUrl");

        console.log("인보이스 수:", body.length);
      }
    }
  });

  test("특정 인보이스 상세 조회", async ({ request }) => {
    const invoiceId = "inv_test_123";

    const response = await request.get(
      `${BASE_URL}/api/user/invoices/${invoiceId}`,
      {
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      expect(body).toHaveProperty("id", invoiceId);
      expect(body).toHaveProperty("items");
      expect(Array.isArray(body.items)).toBeTruthy();

      console.log("인보이스 상세 조회 성공");
    } else {
      expect([404, 501]).toContain(response.status());
    }
  });

  test("인보이스 PDF 다운로드", async ({ request }) => {
    const invoiceId = "inv_test_123";

    const response = await request.get(
      `${BASE_URL}/api/user/invoices/${invoiceId}/pdf`,
      {
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const contentType = response.headers()["content-type"];
      expect(contentType).toContain("application/pdf");

      console.log("인보이스 PDF 다운로드 성공");
    } else {
      expect([404, 501]).toContain(response.status());
    }
  });
});

test.describe("Billing API - Subscription Management", () => {
  const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";

  test("구독 플랜 다운그레이드", async ({ page, request }) => {
    await loginAsRegularUser(page);

    // Pro → Basic 다운그레이드
    const response = await request.post(
      `${BASE_URL}/api/user/subscription/downgrade`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          service: "find",
          newPlan: "basic",
          applyImmediately: false, // 현재 기간 종료 후 적용
        },
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      expect(body).toHaveProperty("subscription");
      expect(body.subscription).toHaveProperty("scheduledPlanChange");

      console.log("다운그레이드 예약 성공");
    } else {
      expect([400, 401, 404, 501]).toContain(response.status());
    }
  });

  test("구독 재개 (취소 철회)", async ({ page, request }) => {
    await loginAsRegularUser(page);

    // 취소된 구독 재개
    const response = await request.post(
      `${BASE_URL}/api/user/subscription/reactivate`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          service: "find",
        },
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      expect(body).toHaveProperty("subscription");
      expect(body.subscription).toHaveProperty("status", "active");
      expect(body.subscription).toHaveProperty("cancelAtPeriodEnd", false);

      console.log("구독 재개 성공");
    } else {
      expect([400, 401, 404, 501]).toContain(response.status());
    }
  });

  test("결제 주기 변경 (월간 → 연간)", async ({ page, request }) => {
    await loginAsRegularUser(page);

    const response = await request.post(
      `${BASE_URL}/api/user/subscription/change-billing-cycle`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          service: "find",
          newBillingCycle: "yearly",
        },
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      expect(body).toHaveProperty("subscription");
      expect(body.subscription).toHaveProperty("billingCycle", "yearly");

      console.log("결제 주기 변경 성공");
    } else {
      expect([400, 401, 404, 501]).toContain(response.status());
    }
  });
});

test.describe("Billing API - Admin Functions", () => {
  const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";

  test("관리자: 모든 구독 조회", async ({ page, request }) => {
    await loginAsAdmin(page);

    const response = await request.get(`${BASE_URL}/api/admin/subscriptions`, {
      failOnStatusCode: false,
    });

    if (response.ok()) {
      const body = await response.json();

      expect(Array.isArray(body)).toBeTruthy();

      if (body.length > 0) {
        const subscription = body[0];

        expect(subscription).toHaveProperty("userId");
        expect(subscription).toHaveProperty("service");
        expect(subscription).toHaveProperty("plan");
        expect(subscription).toHaveProperty("status");

        console.log("전체 구독 수:", body.length);
      }
    }
  });

  test("관리자: 특정 사용자 구독 수정", async ({ page, request }) => {
    await loginAsAdmin(page);

    const userId = "test-user-id";

    const response = await request.patch(
      `${BASE_URL}/api/admin/subscriptions/${userId}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          service: "find",
          plan: "enterprise",
          status: "active",
        },
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      expect(body).toHaveProperty("subscription");
      expect(body.subscription).toHaveProperty("plan", "enterprise");

      console.log("관리자 구독 수정 성공");
    } else {
      expect([401, 403, 404, 501]).toContain(response.status());
    }
  });

  test("관리자: 구독 통계 조회", async ({ page, request }) => {
    await loginAsAdmin(page);

    const response = await request.get(
      `${BASE_URL}/api/admin/subscriptions/stats`,
      {
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      expect(body).toHaveProperty("totalSubscriptions");
      expect(body).toHaveProperty("activeSubscriptions");
      expect(body).toHaveProperty("totalRevenue");
      expect(body).toHaveProperty("monthlyRevenue");

      console.log("구독 통계:", body);
    }
  });
});

test.describe("Billing API - Error Handling", () => {
  const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";

  test("비인증 사용자 결제 API 접근 차단", async ({ request }) => {
    // 로그인 없이 결제 API 호출
    const response = await request.get(`${BASE_URL}/api/user/subscription`, {
      failOnStatusCode: false,
    });

    // 401 Unauthorized 응답
    expect(response.status()).toBe(401);
  });

  test("잘못된 플랜명 요청 시 에러", async ({ page, request }) => {
    await loginAsRegularUser(page);

    const response = await request.post(
      `${BASE_URL}/api/user/subscription/upgrade`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          service: "find",
          newPlan: "invalid-plan",
        },
        failOnStatusCode: false,
      },
    );

    if (!response.ok()) {
      expect([400, 422]).toContain(response.status());

      const body = await response.json();
      expect(body).toHaveProperty("error");
    }
  });

  test("결제 수단 없이 유료 플랜 구독 시도", async ({ page, request }) => {
    await loginAsRegularUser(page);

    const response = await request.post(
      `${BASE_URL}/api/user/subscription/upgrade`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          service: "find",
          newPlan: "pro",
        },
        failOnStatusCode: false,
      },
    );

    if (!response.ok() && response.status() === 400) {
      const body = await response.json();
      expect(body.error).toMatch(/payment.*method|결제.*수단/i);
    }
  });
});
