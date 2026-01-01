import PageLayout from "@/components/layouts/PageLayout";
import Section from "@/components/layouts/Section";
import PlanComparisonTable from "@/components/services-platform/PlanComparisonTable";
import FAQSection from "@/components/services-platform/FAQSection";
import CTASection from "@/components/services-platform/CTASection";
import { SEO } from "@/components/shared/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { minuBuildService } from "@/data/services/minu-build";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";
import { useMCPServicePermission } from "@/hooks/useMCPPermission";
import { cn } from "@/lib/utils";
import type { MonthlyPlan } from "@/types/services";

// =====================================================
// 타입 정의
// =====================================================

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

  const planOrder = ["Basic", "Pro", "Enterprise"];
  const currentIndex = planOrder.indexOf(currentPlan);
  const targetIndex = planOrder.indexOf(planName);

  if (currentIndex === -1 || targetIndex === -1) return "available";

  return targetIndex > currentIndex ? "upgrade" : "downgrade";
}

export default function MinuBuildPage() {
  const service = minuBuildService;
  const { user } = useAuth();

  // MCP 권한 확인 (useMCPServicePermission 훅 사용)
  const { subscription, isLoading } = useMCPServicePermission('minu-build');

  // 현재 플랜 이름 (구독이 없거나 비활성 상태면 null)
  const currentPlanName = user && subscription?.status === "active"
    ? subscription.planName
    : null;

  const lowestPrice = service.pricing.monthly?.[0]?.price || 0;

  return (
    <PageLayout>
      <SEO
        title={service.title}
        description={service.description}
        keywords={['Minu Build', '프로젝트 관리', '일정 관리', '칸반 보드', '간트 차트', 'SaaS', '팀 협업']}
        canonical="/services/minu/build"
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
          { name: service.title, url: '/services/minu/build' }
        ]}
      />

      {/* Hero */}
      <section className="text-center py-12 space-y-4">
        <Badge>SaaS 플랫폼</Badge>
        <h1 className="text-4xl font-bold">{service.title}</h1>
        <p className="text-xl text-muted-foreground">{service.subtitle}</p>
        <p className="text-sm text-muted-foreground">관리 대신 본질에 집중할 수 있게 만듭니다</p>
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
            <div className="text-xl font-semibold mb-3">📊 AI 진행 요약</div>
            <p className="text-muted-foreground">
              일정, 이슈, 리스크를 자동으로 분석하고 PM/PL에게 핵심만 요약해서 전달합니다.
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg">
            <div className="text-xl font-semibold mb-3">📋 칸반 & 간트</div>
            <p className="text-muted-foreground">
              칸반 보드와 간트 차트로 프로젝트 진행 상황을 직관적으로 파악합니다.
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg">
            <div className="text-xl font-semibold mb-3">🔗 도구 연동</div>
            <p className="text-muted-foreground">
              Git, Jira 등 기존 개발 도구와 경량 연동하여 데이터를 자동으로 동기화합니다.
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg">
            <div className="text-xl font-semibold mb-3">📝 자동 보고서</div>
            <p className="text-muted-foreground">
              주간/월간 보고서를 자동 생성하여 보고 작성 시간을 절감합니다.
            </p>
          </div>
        </div>
      </Section>

      {/* Plan Comparison */}
      <Section title="플랜 비교">
        {/* 구독 상태 안내 (로그인한 사용자) */}
        {user && !isLoading && subscription && subscription.status === "active" && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium">
                  현재 <span className="text-primary">{subscription.planName}</span> 플랜을 이용 중입니다
                </p>
                {subscription.validUntil && (
                  <p className="text-sm text-muted-foreground">
                    다음 결제일: {new Date(subscription.validUntil).toLocaleDateString("ko-KR")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 플랜 카드 그리드 (구독 상태 표시 포함) */}
        <PlanCardsWithStatus
          plans={service.pricing.monthly || []}
          currentPlanName={currentPlanName}
          isLoggedIn={!!user}
          serviceSlug="minu-build"
        />

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-center mb-4">상세 기능 비교</h3>
          {service.pricing.monthly && (
            <PlanComparisonTable plans={service.pricing.monthly} />
          )}
        </div>
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
            <li>• 14일 무료 체험 (신규 가입자)</li>
          </ul>
        </div>
      </Section>

      {/* Beta Tester */}
      <Section title="베타 테스터 모집">
        <div className="max-w-2xl mx-auto glass-card p-6 rounded-lg">
          <p className="mb-4">
            현재 Minu Build는 개발 중입니다. 베타 테스터로 참여하시면:
          </p>
          <ul className="space-y-2 mb-6">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span>정식 출시 시 6개월간 Pro 플랜 무료 이용</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span>신규 기능 우선 체험</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span>기존 도구 마이그레이션 지원</span>
            </li>
          </ul>
          <Badge variant="secondary">출시 예정: 2026년 1월</Badge>
        </div>
      </Section>

      {/* FAQ */}
      {service.faq && <FAQSection faqs={service.faq} />}

      {/* CTA */}
      <CTASection
        primary={{ label: "사전 등록하기", href: "/signup?waitlist=minu-build" }}
        secondary={{
          label: "Minu Find 먼저 체험하기",
          href: "/services/minu/find",
        }}
      />
    </PageLayout>
  );
}

// =====================================================
// 내부 컴포넌트
// =====================================================

interface PlanCardsWithStatusProps {
  plans: MonthlyPlan[];
  currentPlanName: string | null;
  isLoggedIn: boolean;
  serviceSlug: string;
}

function PlanCardsWithStatus({
  plans,
  currentPlanName,
  isLoggedIn,
  serviceSlug,
}: PlanCardsWithStatusProps) {
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency,
    }).format(price);
  };

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
          <Button className={baseClasses} asChild>
            <a href={`/subscriptions/upgrade?plan=${plan.name.toLowerCase()}`}>
              업그레이드
            </a>
          </Button>
        );

      case "downgrade":
        return (
          <Button variant="secondary" className={baseClasses} asChild>
            <a href={`/subscriptions/change?plan=${plan.name.toLowerCase()}`}>
              플랜 변경
            </a>
          </Button>
        );

      case "available":
      default:
        return (
          <Button className={baseClasses} asChild>
            <a href={isLoggedIn
              ? `/subscriptions/checkout?service=${serviceSlug}&plan=${plan.name.toLowerCase()}`
              : `/signup?redirect=/subscriptions/checkout?service=${serviceSlug}&plan=${plan.name.toLowerCase()}`
            }>
              시작하기
            </a>
          </Button>
        );
    }
  };

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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{plan.name}</h3>
              {renderStatusBadge(status, plan.recommended)}
            </div>

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

            <ul className="space-y-2 pt-4 border-t text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>활성 프로젝트 {plan.features.activeProjects}</span>
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

            {renderPlanButton(plan, status)}

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
