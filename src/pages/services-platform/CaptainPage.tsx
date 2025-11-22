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
import { compassCaptainService } from "@/data/services/compass-captain";
import { useAuth } from "@/hooks/useAuth";
import { useMySubscriptions } from "@/hooks/useSubscriptions";
import { cn } from "@/lib/utils";
import type { MonthlyPlan } from "@/types/services";
import type { SubscriptionWithPlan } from "@/types/subscription.types";
import {
  CheckCircle2,
  AlertCircle,
  Ship,
  Kanban,
  GanttChart,
  Users,
  MessageSquare,
  BarChart3,
  Clock,
} from "lucide-react";

// =====================================================
// MCP 클라이언트 타입 및 훅 (폴백 지원)
// =====================================================

/**
 * MCP 구독 정보 타입
 * MCP 서버에서 반환하는 구독 데이터 형태
 */
interface MCPSubscriptionInfo {
  planName: string;         // 현재 구독 중인 플랜 이름 (예: "Basic", "Pro", "Enterprise")
  status: string;           // 구독 상태 (예: "active", "trial", "cancelled")
  expiresAt?: string;       // 구독 만료일 (ISO 8601 형식)
  features?: string[];      // 이용 가능한 기능 목록
}

/**
 * useMCPClient 훅 폴백 구현
 *
 * 실제 MCP 클라이언트 훅이 구현되기 전까지 사용하는 폴백 함수
 * Supabase useMySubscriptions 훅의 데이터를 MCP 형태로 변환
 */
function useMCPSubscriptionFallback(
  subscriptions: SubscriptionWithPlan[] | undefined,
  isLoading: boolean,
  error: Error | null
): {
  data: MCPSubscriptionInfo | null;
  isLoading: boolean;
  error: Error | null;
} {
  // COMPASS Captain 서비스에 대한 구독만 필터링
  const captainSubscription = useMemo(() => {
    if (!subscriptions) return null;

    // compass-captain 서비스 ID 또는 slug로 필터링
    const found = subscriptions.find(
      (sub) =>
        sub.service?.slug === "captain" ||
        sub.service?.id === "compass-captain" ||
        sub.service?.title?.includes("Captain")
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
    } as MCPSubscriptionInfo;
  }, [subscriptions]);

  return {
    data: captainSubscription,
    isLoading,
    error,
  };
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

export default function CaptainPage() {
  const service = compassCaptainService;

  // =====================================================
  // 인증 상태 확인
  // =====================================================
  const { user, loading: authLoading } = useAuth();

  // =====================================================
  // 구독 정보 조회 (로그인한 경우에만)
  // =====================================================
  const {
    data: subscriptions,
    isLoading: subscriptionsLoading,
    error: subscriptionsError
  } = useMySubscriptions();

  // =====================================================
  // MCP 클라이언트 연동 (폴백 사용)
  //
  // TODO: 실제 useMCPClient 훅이 구현되면 아래 코드로 교체
  // const { data: mcpSubscription, isLoading: mcpLoading, error: mcpError } = useMCPClient({
  //   endpoint: 'compass/captain/subscription',
  //   userId: user?.id,
  //   enabled: !!user,
  // });
  // =====================================================
  const {
    data: mcpSubscription,
    isLoading: mcpLoading,
    error: mcpError
  } = useMCPSubscriptionFallback(
    subscriptions,
    subscriptionsLoading,
    subscriptionsError as Error | null
  );

  // =====================================================
  // 로딩 및 에러 상태 계산
  // =====================================================
  const isLoading = authLoading || (!!user && mcpLoading);
  const hasError = !!mcpError;

  // 현재 플랜 이름 (구독이 없거나 비로그인이면 null)
  const currentPlanName = user && mcpSubscription?.status === "active"
    ? mcpSubscription.planName
    : null;

  // 최저 월 가격 계산
  const lowestPrice = service.pricing.monthly?.[0]?.price || 0;
  const isComingSoon = service.status === "coming-soon";

  return (
    <PageLayout>
      <SEO
        title={service.title}
        description={service.description}
        keywords={[
          "COMPASS Captain",
          "프로젝트 관리",
          "칸반 보드",
          "간트 차트",
          "프리랜서",
          "에이전시",
          "SaaS",
          "팀 협업",
        ]}
        canonical="/services/compass/captain"
        ogType="service"
        service={{
          name: service.title,
          description: service.description,
          price: lowestPrice,
          priceCurrency: "KRW",
          category: "SaaS 플랫폼",
        }}
        breadcrumbs={[
          { name: "홈", url: "/" },
          { name: "서비스", url: "/services" },
          { name: "COMPASS", url: "/services/compass" },
          { name: service.title, url: "/services/compass/captain" },
        ]}
      />

      {/* Hero */}
      <section className="text-center py-12 space-y-4">
        {isComingSoon && (
          <Badge variant="secondary" className="mb-2">
            {service.launchDate
              ? `${new Date(service.launchDate).toLocaleDateString("ko-KR", { year: "numeric", month: "long" })} 출시 예정`
              : "출시 예정"}
          </Badge>
        )}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <Ship className="h-8 w-8 text-white" />
          </div>
        </div>
        <Badge>SaaS 플랫폼</Badge>
        <h1 className="text-4xl font-bold">{service.title}</h1>
        <p className="text-xl text-muted-foreground">{service.subtitle}</p>
      </section>

      {/* Service Introduction */}
      <Section title="서비스 소개">
        <p className="text-lg text-center max-w-3xl mx-auto">
          {service.description}
        </p>
      </Section>

      {/* Key Features */}
      <Section title="주요 기능">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="glass-card p-6 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Kanban className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-lg font-semibold">칸반 보드</span>
            </div>
            <p className="text-muted-foreground">
              드래그앤드롭으로 태스크 상태를 관리하고 워크플로우를 시각화합니다.
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <GanttChart className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-lg font-semibold">간트 차트</span>
            </div>
            <p className="text-muted-foreground">
              프로젝트 일정과 의존성을 타임라인으로 관리하고 병목을 파악합니다.
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-lg font-semibold">진행률 대시보드</span>
            </div>
            <p className="text-muted-foreground">
              실시간 프로젝트 진행 상황과 팀 워크로드를 한눈에 파악합니다.
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-lg font-semibold">팀 협업</span>
            </div>
            <p className="text-muted-foreground">
              팀원 배정, 워크로드 밸런싱, 실시간 알림으로 효율적인 협업을 지원합니다.
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-lg font-semibold">클라이언트 포털</span>
            </div>
            <p className="text-muted-foreground">
              고객에게 진행 상황을 공유하고 피드백을 실시간으로 수집합니다.
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-lg font-semibold">시간 추적</span>
            </div>
            <p className="text-muted-foreground">
              태스크별 작업 시간을 기록하고 청구서 생성에 활용합니다.
            </p>
          </div>
        </div>
      </Section>

      {/* Process */}
      {service.process && (
        <Section title="프로젝트 관리 프로세스">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              {service.process.map((step) => (
                <div
                  key={step.step}
                  className="flex gap-4 items-start glass-card p-6 rounded-lg"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                    {step.duration && (
                      <p className="text-sm text-muted-foreground mt-2">
                        주기: {step.duration}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Plan Comparison */}
      <Section title="플랜 비교">
        {/* 구독 상태 안내 (로그인한 사용자) */}
        {user && !isLoading && mcpSubscription && (
          <div className="mb-6 p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-orange-500 flex-shrink-0" />
              <div>
                <p className="font-medium">
                  현재 <span className="text-orange-500">{mcpSubscription.planName}</span> 플랜을 이용 중입니다
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
              isComingSoon={isComingSoon}
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
            <li>
              * 월 단위 구독 (자동 결제)
            </li>
            <li>
              * 연간 구독 시 {service.pricing.monthly?.[0].annualDiscount || 0}%
              할인
            </li>
            <li>* 14일 무료 체험 (신규 가입자)</li>
          </ul>
        </div>
      </Section>

      {/* Deliverables */}
      {service.deliverables && (
        <Section title="제공 기능">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {service.deliverables.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Integration Benefits */}
      <Section title="COMPASS 통합 연동">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="glass-card p-6 rounded-lg text-center">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <Ship className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="font-semibold mb-2">Navigator 연동</h3>
            <p className="text-sm text-muted-foreground">
              수주한 프로젝트를 바로 Captain으로 가져와 관리를 시작합니다.
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg text-center">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
              <Ship className="h-6 w-6 text-purple-500" />
            </div>
            <h3 className="font-semibold mb-2">Cartographer 연동</h3>
            <p className="text-sm text-muted-foreground">
              제안서 내용을 기반으로 프로젝트 구조와 마일스톤을 자동 생성합니다.
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Ship className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="font-semibold mb-2">Harbor 연동</h3>
            <p className="text-sm text-muted-foreground">
              완료된 프로젝트를 Harbor로 이관하여 운영 관리를 시작합니다.
            </p>
          </div>
        </div>
      </Section>

      {/* Refund Policy */}
      {service.refundPolicy && (
        <Section title="환불 정책">
          <div className="max-w-2xl mx-auto glass-card p-6 rounded-lg space-y-3">
            <p>* {service.refundPolicy.beforeStart}</p>
            <p>* {service.refundPolicy.inProgress}</p>
            <p>* {service.refundPolicy.afterCompletion}</p>
            <p className="text-sm text-muted-foreground pt-3 border-t">
              ※ 자세한 내용은{" "}
              <a href="/refund-policy" className="text-primary hover:underline">
                환불 정책
              </a>{" "}
              페이지를 참조해주세요.
            </p>
          </div>
        </Section>
      )}

      {/* Coming Soon Notice */}
      {isComingSoon && (
        <Section title="출시 알림 신청">
          <div className="max-w-2xl mx-auto glass-card p-6 rounded-lg">
            <p className="mb-4 text-center">
              COMPASS Captain은 현재 개발 중입니다. 출시 알림을 신청하시면 가장
              먼저 소식을 받아보실 수 있습니다.
            </p>
            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <span>출시 시 30% 얼리버드 할인</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <span>베타 테스터 우선 초대</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <span>기존 도구 마이그레이션 지원</span>
              </li>
            </ul>
          </div>
        </Section>
      )}

      {/* FAQ */}
      {service.faq && <FAQSection faqs={service.faq} />}

      {/* CTA */}
      <CTASection
        primary={
          isComingSoon
            ? { label: "출시 알림 신청하기", href: "/work-with-us?service=captain" }
            : { label: "무료 체험 시작하기", href: "/signup?plan=captain-trial" }
        }
        secondary={{
          label: "Navigator 먼저 사용해보기",
          href: "/services/compass/navigator",
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
  isComingSoon: boolean;
}

/**
 * PlanCardsWithStatus
 *
 * 사용자의 구독 상태에 따라 다른 UI를 표시하는 플랜 카드 컴포넌트
 * - 출시 예정(Coming Soon): 모든 플랜에 "출시 알림" 버튼
 * - 비로그인: 모든 플랜에 "시작하기" 버튼
 * - 로그인 + 구독 없음: 모든 플랜에 "시작하기" 버튼
 * - 로그인 + 구독 있음: 현재 플랜에 "현재 이용 중" 배지, 업그레이드 가능 플랜에 "업그레이드" 버튼
 */
function PlanCardsWithStatus({
  plans,
  currentPlanName,
  isLoggedIn,
  isComingSoon,
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

    // 출시 예정인 경우 모든 플랜에 알림 신청 버튼
    if (isComingSoon) {
      return (
        <Button variant="secondary" className={baseClasses} asChild>
          <a href={`/work-with-us?service=captain&plan=${plan.name.toLowerCase()}`}>
            출시 알림 신청
          </a>
        </Button>
      );
    }

    switch (status) {
      case "current":
        // 현재 이용 중인 플랜
        return (
          <Button variant="outline" className={baseClasses} disabled>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            현재 이용 중
          </Button>
        );

      case "upgrade":
        // 업그레이드 가능한 플랜
        return (
          <Button
            className={cn(baseClasses, "bg-orange-500 hover:bg-orange-600")}
            asChild
          >
            <a href={`/subscriptions/upgrade?service=compass-captain&plan=${plan.name.toLowerCase()}`}>
              업그레이드
            </a>
          </Button>
        );

      case "downgrade":
        // 다운그레이드 가능한 플랜
        return (
          <Button
            variant="secondary"
            className={baseClasses}
            asChild
          >
            <a href={`/subscriptions/change?service=compass-captain&plan=${plan.name.toLowerCase()}`}>
              플랜 변경
            </a>
          </Button>
        );

      case "available":
      default:
        // 비로그인 또는 구독이 없는 경우
        return (
          <Button
            className={cn(baseClasses, "bg-orange-500 hover:bg-orange-600")}
            asChild
          >
            <a href={isLoggedIn
              ? `/subscriptions/checkout?service=compass-captain&plan=${plan.name.toLowerCase()}`
              : `/signup?redirect=/subscriptions/checkout?service=compass-captain&plan=${plan.name.toLowerCase()}`
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
      return <Badge className="bg-orange-500">추천</Badge>;
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
              // 현재 이용 중인 플랜 강조
              isCurrentPlan && "ring-2 ring-green-500 ring-offset-2",
              // 추천 플랜 강조 (현재 플랜이 아닌 경우)
              plan.recommended && !isCurrentPlan && "ring-2 ring-orange-500 ring-offset-2"
            )}
          >
            {/* 플랜 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{plan.name}</h3>
              {renderStatusBadge(status, plan.recommended)}
            </div>

            {/* 가격 정보 */}
            <div className="mb-4">
              <div className="text-2xl font-bold text-orange-500">
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
                <span>프로젝트 {plan.features.activeProjects}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>팀원 {plan.features.teamMembers}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>저장공간 {plan.features.storage}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>{plan.features.support} 지원</span>
              </li>
            </ul>

            {/* 액션 버튼 */}
            {renderPlanButton(plan, status)}

            {/* 현재 플랜 표시 오버레이 (선택적) */}
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
