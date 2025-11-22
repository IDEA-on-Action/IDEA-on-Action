import { useMemo } from "react";
import PageLayout from "@/components/layouts/PageLayout";
import Section from "@/components/layouts/Section";
import PlanComparisonTable from "@/components/services-platform/PlanComparisonTable";
import FAQSection from "@/components/services-platform/FAQSection";
import CTASection from "@/components/services-platform/CTASection";
import { SEO } from "@/components/shared/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { minuFindService } from "@/data/services/minu-find";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMySubscriptions } from "@/hooks/useSubscriptions";
import { useMinuSubscription } from "@/hooks/useMCPClient";
import { cn } from "@/lib/utils";
import type { MonthlyPlan } from "@/types/services";
import type { SubscriptionWithPlan } from "@/types/subscription.types";

// =====================================================
// MCP 클라이언트 타입 및 폴백 훅
// =====================================================

/**
 * MCP 구독 정보 타입 (폴백 호환)
 * MCP 서버 또는 Supabase 폴백에서 반환하는 구독 데이터의 통일된 형태
 */
interface MCPSubscriptionInfo {
  planName: string;         // 현재 구독 중인 플랜 이름 (예: "Basic", "Pro", "Enterprise")
  status: string;           // 구독 상태 (예: "active", "trial", "cancelled")
  expiresAt?: string;       // 구독 만료일 (ISO 8601 형식)
  features?: string[];      // 이용 가능한 기능 목록
}

/**
 * Supabase 구독 데이터를 MCP 형태로 변환하는 폴백 훅
 *
 * MCP 서버 연결 실패 시 Supabase useMySubscriptions 훅의 데이터를
 * MCPSubscriptionInfo 형태로 변환하여 일관된 인터페이스를 제공합니다.
 */
function useFallbackSubscription(
  subscriptions: SubscriptionWithPlan[] | undefined
): MCPSubscriptionInfo | null {
  return useMemo(() => {
    if (!subscriptions) return null;

    // Minu Find 서비스에 대한 구독만 필터링
    const found = subscriptions.find(
      (sub) =>
        sub.service?.slug === "find" ||
        sub.service?.id === "minu-find" ||
        sub.service?.title?.includes("Minu Find")
    );

    if (!found) return null;

    // SubscriptionWithPlan을 MCPSubscriptionInfo 형태로 변환
    return {
      planName: found.plan?.plan_name || "Unknown",
      status: found.status || "unknown",
      expiresAt: found.current_period_end || undefined,
      features: found.plan?.features
        ? Object.keys(found.plan.features)
        : undefined,
    };
  }, [subscriptions]);
}

/**
 * 플랜 상태 타입
 * 각 플랜에 대한 사용자의 구독 상태를 나타냄
 */
type PlanStatus = "current" | "upgrade" | "downgrade" | "available";

/**
 * 플랜 상태 계산 함수
 *
 * @param planName - 비교할 플랜 이름
 * @param currentPlan - 현재 구독 중인 플랜 이름 (없으면 null)
 * @returns 플랜 상태
 */
function getPlanStatus(planName: string, currentPlan: string | null): PlanStatus {
  if (!currentPlan) return "available";
  if (planName === currentPlan) return "current";

  // 플랜 순서: Basic < Pro < Enterprise
  const planOrder = ["Basic", "Pro", "Enterprise"];
  const currentIndex = planOrder.indexOf(currentPlan);
  const targetIndex = planOrder.indexOf(planName);

  if (currentIndex === -1 || targetIndex === -1) return "available";

  return targetIndex > currentIndex ? "upgrade" : "downgrade";
}

export default function MinuFindPage() {
  const service = minuFindService;

  // =====================================================
  // 인증 상태 확인
  // =====================================================
  const { user, loading: authLoading } = useAuth();

  // =====================================================
  // MCP 클라이언트 연동 (실제 MCP 훅 사용)
  // MCP 서버의 subscription://current 리소스를 조회합니다.
  // =====================================================
  const {
    subscription: mcpData,
    isLoading: mcpLoading,
    error: mcpError
  } = useMinuSubscription();

  // MCP 서버 연결 실패 여부 (에러가 있거나 인증된 사용자인데 데이터가 없을 때)
  const mcpFailed = !!mcpError;

  // 개발 모드에서만 MCP 연결 실패 로그 출력
  if (mcpFailed && import.meta.env.DEV) {
    console.warn('[MinuFindPage] MCP 서버 연결 실패, 폴백 사용:', mcpError);
  }

  // =====================================================
  // 폴백: MCP 실패 시 Supabase 직접 조회
  // =====================================================
  const {
    data: fallbackSubscriptions,
    isLoading: fallbackLoading,
  } = useMySubscriptions();

  // Supabase 데이터를 MCP 형태로 변환
  const fallbackData = useFallbackSubscription(fallbackSubscriptions);

  // =====================================================
  // 최종 구독 데이터 결정
  // MCP 성공 시 MCP 데이터 사용, 실패 시 폴백 데이터 사용
  // =====================================================
  const mcpSubscription = useMemo((): MCPSubscriptionInfo | null => {
    // MCP 연결 성공하고 데이터가 있으면 MCP 데이터 사용
    if (!mcpFailed && mcpData) {
      return {
        planName: mcpData.planName,
        status: mcpData.status,
        expiresAt: mcpData.validUntil,
        features: mcpData.planFeatures
          ? Object.keys(mcpData.planFeatures)
          : undefined,
      };
    }

    // MCP 실패 시 폴백 데이터 사용
    return fallbackData;
  }, [mcpFailed, mcpData, fallbackData]);

  // =====================================================
  // 로딩 및 에러 상태 계산
  // =====================================================
  // MCP 로딩 중이거나 (MCP 실패 시) 폴백 로딩 중일 때
  const isLoading = authLoading || (!!user && (mcpLoading || (mcpFailed && fallbackLoading)));

  // 사용자에게 에러를 노출하지 않음 (폴백이 있으므로)
  // MCP와 폴백 모두 실패한 경우에만 에러 표시
  const hasError = false; // 폴백이 있으므로 에러 상태를 숨김

  // 현재 플랜 이름 (구독이 없거나 비로그인이면 null)
  const currentPlanName = user && mcpSubscription?.status === "active"
    ? mcpSubscription.planName
    : null;

  // 최저 월 가격 계산
  const lowestPrice = service.pricing.monthly?.[0]?.price || 0;

  return (
    <PageLayout>
      <SEO
        title={service.title}
        description={service.description}
        keywords={['Minu Find', '사업기회 탐색', 'AI 프로젝트 매칭', '위시켓 자동화', '크몽 자동화', '프리랜서 프로젝트', 'SaaS', '프로젝트 관리']}
        canonical="/services/minu/find"
        ogType="service"
        service={{
          name: service.title,
          description: service.description,
          price: lowestPrice,
          priceCurrency: 'KRW',
          category: 'SaaS 플랫폼'
        }}
        breadcrumbs={[
          { name: '홈', url: '/' },
          { name: '서비스', url: '/services' },
          { name: 'Minu', url: '/services/minu' },
          { name: service.title, url: '/services/minu/find' }
        ]}
      />

      {/* Hero */}
      <section className="text-center py-12 space-y-4">
        <Badge>SaaS 플랫폼</Badge>
        <h1 className="text-4xl font-bold">{service.title}</h1>
        <p className="text-xl text-muted-foreground">{service.subtitle}</p>
        <p className="text-sm text-muted-foreground">작은 신호에서 사업기회를 발견합니다</p>
      </section>

      {/* Service Introduction */}
      <Section title="서비스 소개">
        <p className="text-lg text-center max-w-3xl mx-auto">
          {service.description}
        </p>
      </Section>

      {/* Key Features */}
      <Section title="주요 기능">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="glass-card p-6 rounded-lg">
            <div className="text-xl font-semibold mb-3">🔍 산업·기술 시그널 수집</div>
            <p className="text-muted-foreground">
              시장, 기술, 정책, 경쟁사 정보를 자동으로 수집하여 의미 있는 기회를 발견합니다.
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg">
            <div className="text-xl font-semibold mb-3">📊 사업기회 스코어링</div>
            <p className="text-muted-foreground">
              AI 기반 분석으로 프로젝트 난이도, 경쟁률, 수익성을 자동으로 평가합니다.
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg">
            <div className="text-xl font-semibold mb-3">🌐 플랫폼 통합 수집</div>
            <p className="text-muted-foreground">
              위시켓, 크몽, 원티드긱스, 나라장터 등 주요 플랫폼 자동 크롤링 및 중복 제거
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg">
            <div className="text-xl font-semibold mb-3">🔔 실시간 알림</div>
            <p className="text-muted-foreground">
              Slack, 이메일, SMS를 통한 조건별 실시간 알림
            </p>
          </div>
        </div>
      </Section>

      {/* Plan Comparison */}
      <Section title="플랜 비교">
        {/* 구독 상태 안내 (로그인한 사용자) */}
        {user && !isLoading && mcpSubscription && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium">
                  현재 <span className="text-primary">{mcpSubscription.planName}</span> 플랜을 이용 중입니다
                </p>
                {mcpSubscription.expiresAt && (
                  <p className="text-sm text-muted-foreground">
                    다음 결제일: {new Date(mcpSubscription.expiresAt).toLocaleDateString("ko-KR")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 에러 상태 표시 */}
        {hasError && (
          <div className="mb-6 p-4 bg-destructive/5 border border-destructive/20 rounded-lg max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">
                구독 정보를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
              </p>
            </div>
          </div>
        )}

        {/* 로딩 상태: 플랜 카드 스켈레톤 */}
        {isLoading ? (
          <PlanCardsSkeleton />
        ) : (
          <>
            {/* 플랜 카드 그리드 (구독 상태 표시 포함) */}
            <PlanCardsWithStatus
              plans={service.pricing.monthly || []}
              currentPlanName={currentPlanName}
              isLoggedIn={!!user}
            />

            {/* 기존 상세 비교 테이블 */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-center mb-4">상세 기능 비교</h3>
              {service.pricing.monthly && (
                <PlanComparisonTable plans={service.pricing.monthly} />
              )}
            </div>
          </>
        )}
      </Section>

      {/* Pricing */}
      <Section title="가격 정책">
        <div className="max-w-2xl mx-auto glass-card p-6 rounded-lg space-y-3">
          <ul className="space-y-2">
            <li>• 월 단위 구독 (자동 결제)</li>
            <li>
              • 연간 구독 시{" "}
              {service.pricing.monthly?.[0].annualDiscount || 0}% 할인
            </li>
            <li>• 30일 무료 체험 (신규 가입자)</li>
          </ul>
        </div>
      </Section>

      {/* Payment Method */}
      <Section title="결제 방식">
        <div className="max-w-2xl mx-auto glass-card p-6 rounded-lg space-y-3">
          <ul className="space-y-2">
            <li>• 신용카드 자동 결제</li>
            <li>• 매월 가입일에 자동 청구</li>
            <li>• 언제든지 취소 가능 (즉시 효력)</li>
          </ul>
        </div>
      </Section>

      {/* Refund Policy */}
      {service.refundPolicy && (
        <Section title="환불 정책">
          <div className="max-w-2xl mx-auto glass-card p-6 rounded-lg space-y-3">
            <p>• {service.refundPolicy.beforeStart}</p>
            <p>• {service.refundPolicy.inProgress}</p>
            <p>• {service.refundPolicy.afterCompletion}</p>
            <p className="text-sm text-muted-foreground pt-3 border-t">
              ※ 자세한 내용은{" "}
              <a href="/refund" className="text-primary hover:underline">
                환불 정책
              </a>{" "}
              페이지를 참조해주세요.
            </p>
          </div>
        </Section>
      )}

      {/* Service Terms */}
      <Section title="서비스 이용약관">
        <div className="max-w-2xl mx-auto glass-card p-6 rounded-lg space-y-3">
          <ul className="space-y-2">
            <li>• 14세 이상 이용 가능</li>
            <li>• 사업자 정보 등록 필요 (Enterprise 플랜)</li>
            <li>• 수집 데이터의 재판매 금지</li>
            <li>• 플랫폼 이용약관 준수 의무</li>
          </ul>
          <p className="text-sm text-muted-foreground pt-3 border-t">
            ※ 전체 이용약관은{" "}
            <a href="/terms" className="text-primary hover:underline">
              이용약관
            </a>{" "}
            페이지를 참조해주세요.
          </p>
        </div>
      </Section>

      {/* Beta Tester */}
      <Section title="베타 테스터 모집">
        <div className="max-w-2xl mx-auto glass-card p-6 rounded-lg">
          <p className="mb-4">
            현재 Minu Find는 베타 서비스 중입니다. 베타 테스터로
            참여하시면:
          </p>
          <ul className="space-y-2 mb-6">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span>6개월간 Pro 플랜 무료 이용</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span>신규 기능 우선 체험</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span>피드백 제공 시 리워드</span>
            </li>
          </ul>
        </div>
      </Section>

      {/* FAQ */}
      {service.faq && <FAQSection faqs={service.faq} />}

      {/* CTA */}
      <CTASection
        primary={{ label: "무료 체험 시작하기", href: "/signup?plan=trial" }}
        secondary={{
          label: "플랜 비교 자세히 보기",
          href: "#plan-comparison",
        }}
      />
    </PageLayout>
  );
}

// =====================================================
// 내부 컴포넌트: 플랜 카드 스켈레톤 UI
// =====================================================

/**
 * PlanCardsSkeleton
 *
 * 구독 정보 로딩 중 표시되는 스켈레톤 UI
 * 3개의 플랜 카드 형태로 로딩 애니메이션 표시
 */
function PlanCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="glass-card p-6 rounded-lg space-y-4 animate-pulse"
        >
          {/* 플랜 이름 스켈레톤 */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>

          {/* 가격 스켈레톤 */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>

          {/* 기능 목록 스켈레톤 */}
          <div className="space-y-2 pt-4 border-t">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>

          {/* 버튼 스켈레톤 */}
          <Skeleton className="h-10 w-full mt-4" />
        </div>
      ))}
    </div>
  );
}

// =====================================================
// 내부 컴포넌트: 구독 상태 표시가 포함된 플랜 카드
// =====================================================

interface PlanCardsWithStatusProps {
  plans: MonthlyPlan[];
  currentPlanName: string | null;
  isLoggedIn: boolean;
}

/**
 * PlanCardsWithStatus
 *
 * 사용자의 구독 상태에 따라 다른 UI를 표시하는 플랜 카드 컴포넌트
 */
function PlanCardsWithStatus({
  plans,
  currentPlanName,
  isLoggedIn,
}: PlanCardsWithStatusProps) {
  /**
   * 가격 포맷팅 함수
   */
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency,
    }).format(price);
  };

  /**
   * 플랜 상태에 따른 버튼 렌더링
   */
  const renderPlanButton = (plan: MonthlyPlan, status: PlanStatus) => {
    const baseClasses = "w-full mt-4";

    switch (status) {
      case "current":
        return (
          <Button variant="outline" className={baseClasses} disabled>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            현재 이용 중
          </Button>
        );

      case "upgrade":
        return (
          <Button
            className={baseClasses}
            asChild
          >
            <a href={`/subscriptions/upgrade?plan=${plan.name.toLowerCase()}`}>
              업그레이드
            </a>
          </Button>
        );

      case "downgrade":
        return (
          <Button
            variant="secondary"
            className={baseClasses}
            asChild
          >
            <a href={`/subscriptions/change?plan=${plan.name.toLowerCase()}`}>
              플랜 변경
            </a>
          </Button>
        );

      case "available":
      default:
        return (
          <Button
            className={baseClasses}
            asChild
          >
            <a href={isLoggedIn
              ? `/subscriptions/checkout?service=minu-find&plan=${plan.name.toLowerCase()}`
              : `/signup?redirect=/subscriptions/checkout?service=minu-find&plan=${plan.name.toLowerCase()}`
            }>
              시작하기
            </a>
          </Button>
        );
    }
  };

  /**
   * 플랜 상태에 따른 배지 렌더링
   */
  const renderStatusBadge = (status: PlanStatus, isRecommended?: boolean) => {
    if (status === "current") {
      return (
        <Badge variant="default" className="bg-green-600">
          이용 중
        </Badge>
      );
    }

    if (isRecommended) {
      return <Badge variant="default">추천</Badge>;
    }

    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {plans.map((plan) => {
        const status = getPlanStatus(plan.name, currentPlanName);
        const isCurrentPlan = status === "current";

        return (
          <div
            key={plan.name}
            className={cn(
              "glass-card p-6 rounded-lg relative transition-all duration-200",
              isCurrentPlan && "ring-2 ring-green-500 ring-offset-2",
              plan.recommended && !isCurrentPlan && "ring-2 ring-primary ring-offset-2"
            )}
          >
            {/* 플랜 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{plan.name}</h3>
              {renderStatusBadge(status, plan.recommended)}
            </div>

            {/* 가격 정보 */}
            <div className="mb-4">
              <div className="text-2xl font-bold text-primary">
                {formatPrice(plan.price, plan.currency)}
                <span className="text-sm font-normal text-muted-foreground">
                  /월
                </span>
              </div>
              {plan.annualDiscount && (
                <p className="text-sm text-muted-foreground">
                  연간 구독 시 {plan.annualDiscount}% 할인
                </p>
              )}
            </div>

            {/* 주요 기능 미리보기 */}
            <ul className="space-y-2 pt-4 border-t text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>플랫폼 {plan.features.platforms}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>월 {plan.features.monthlyAnalysis} 분석</span>
              </li>
              {plan.features.aiAnalysis && (
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>AI 분석 {typeof plan.features.aiAnalysis === 'string' ? plan.features.aiAnalysis : '포함'}</span>
                </li>
              )}
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>{plan.features.support} 지원</span>
              </li>
            </ul>

            {/* 액션 버튼 */}
            {renderPlanButton(plan, status)}

            {/* 현재 플랜 표시 오버레이 */}
            {isCurrentPlan && (
              <div className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-t-green-500 border-l-[40px] border-l-transparent">
                <CheckCircle2 className="absolute -top-[34px] right-[2px] h-4 w-4 text-white" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
