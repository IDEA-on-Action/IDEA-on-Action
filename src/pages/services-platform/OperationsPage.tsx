import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/layouts/PageLayout";
import Section from "@/components/layouts/Section";
import PlanComparisonTable from "@/components/services-platform/PlanComparisonTable";
import FAQSection from "@/components/services-platform/FAQSection";
import CTASection from "@/components/services-platform/CTASection";
import { SEO } from "@/components/shared/SEO";
import { Badge } from "@/components/ui/badge";
import { operationsManagementService } from "@/data/services/operations-management";
import { useAuth } from "@/hooks/useAuth";
import { useAddToCart } from "@/hooks/payments/useCart";
import { useServiceBySlug } from "@/hooks/useServices";
import { CheckCircle2, Activity, Shield, TrendingUp, Clock } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import type { MonthlyPlan } from "@/types/services";

export default function OperationsPage() {
  const service = operationsManagementService;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { mutate: addToCart, isPending: isAddingToCart } = useAddToCart();

  // slug로 데이터베이스 서비스 조회
  const { data: dbService } = useServiceBySlug(service.slug);

  // 장바구니 담기 핸들러
  const handleAddToCart = (plan: MonthlyPlan) => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!dbService) {
      toast({
        title: "오류",
        description: "서비스 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
      return;
    }

    addToCart({
      serviceId: dbService.id, // UUID from database
      quantity: 1,
      price: plan.price,
      packageName: plan.name, // 플랜 이름 추가
    });
  };

  // 최저 가격 계산
  const lowestMonthlyPrice = service.pricing.monthly?.[0]?.price || 0;

  return (
    <PageLayout>
      <SEO
        title={service.title}
        description={service.description}
        keywords={['운영 관리', '서버 관리', '모니터링', 'DevOps', '인프라 관리', 'SLA', '24/7 지원']}
        canonical="/services/operations"
        ogType="service"
        service={{
          name: service.title,
          description: service.description,
          price: lowestMonthlyPrice,
          priceCurrency: 'KRW',
          category: '운영 서비스'
        }}
        breadcrumbs={[
          { name: '홈', url: '/' },
          { name: '서비스', url: '/services' },
          { name: service.title, url: '/services/operations' }
        ]}
      />

      {/* Hero */}
      <section className="text-center py-12 space-y-4">
        <h1 className="text-4xl font-bold">{service.title}</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          {service.subtitle}
        </p>
      </section>

      {/* Service Overview */}
      <Section title="서비스 개요">
        <p className="text-lg text-center max-w-3xl mx-auto">
          {service.description}
        </p>
      </Section>

      {/* Features */}
      <Section title="제공 내용">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {service.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Tech Stack */}
      {service.techStack && (
        <Section title="사용 도구">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {service.techStack.monitoring && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Monitoring</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {service.techStack.monitoring.map((tech) => (
                    <Badge key={tech} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {service.techStack.infrastructure && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Infrastructure</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {service.techStack.infrastructure.map((tech) => (
                    <Badge key={tech} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {service.techStack.database && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Database</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {service.techStack.database.map((tech) => (
                    <Badge key={tech} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {service.techStack.cicd && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">CI/CD</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {service.techStack.cicd.map((tech) => (
                    <Badge key={tech} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Pricing Plans */}
      <Section title="가격 정책">
        {service.pricing.monthly && (
          <div className="max-w-5xl mx-auto">
            <PlanComparisonTable
              plans={service.pricing.monthly}
              onAddToCart={handleAddToCart}
              isAddingToCart={isAddingToCart}
            />
            {service.pricing.annualDiscount && (
              <p className="text-center text-sm text-accent font-semibold mt-6">
                ✨ 연간 계약 시 2개월 무료 (12개월 → 10개월 가격)
              </p>
            )}
          </div>
        )}
      </Section>

      {/* SLA Table */}
      <Section title="SLA (Service Level Agreement)">
        <div className="max-w-4xl mx-auto overflow-x-auto">
          <table className="w-full border-collapse border border-border">
            <thead className="bg-muted">
              <tr>
                <th className="border border-border px-4 py-2 text-left">플랜</th>
                <th className="border border-border px-4 py-2 text-left">가동률</th>
                <th className="border border-border px-4 py-2 text-left">장애 대응</th>
                <th className="border border-border px-4 py-2 text-left">기술 지원</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border px-4 py-2 font-semibold">Basic</td>
                <td className="border border-border px-4 py-2">99.5% (월 3.6시간)</td>
                <td className="border border-border px-4 py-2">영업시간 내 4시간</td>
                <td className="border border-border px-4 py-2">월 5시간</td>
              </tr>
              <tr>
                <td className="border border-border px-4 py-2 font-semibold">Standard</td>
                <td className="border border-border px-4 py-2">99.9% (월 43분)</td>
                <td className="border border-border px-4 py-2">24시간 이내</td>
                <td className="border border-border px-4 py-2">월 10시간</td>
              </tr>
              <tr>
                <td className="border border-border px-4 py-2 font-semibold">Premium</td>
                <td className="border border-border px-4 py-2">99.95% (월 22분)</td>
                <td className="border border-border px-4 py-2">30분 이내</td>
                <td className="border border-border px-4 py-2">월 20시간</td>
              </tr>
            </tbody>
          </table>
          <p className="text-sm text-muted-foreground mt-4">
            ※ SLA 미달 시 크레딧 보상: 1-4시간 10%, 4-24시간 25%, 24시간 이상 50%
          </p>
        </div>
      </Section>

      {/* Payment Method */}
      {service.paymentMethod && (
        <Section title="결제 방식">
          <div className="max-w-2xl mx-auto glass-card p-6 rounded-lg">
            <p className="text-muted-foreground text-center">
              {service.paymentMethod.monthly}
            </p>
          </div>
        </Section>
      )}

      {/* Process */}
      {service.process && (
        <Section title="운영 프로세스">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              {service.process.map((step) => (
                <div
                  key={step.step}
                  className="flex gap-4 items-start glass-card p-6 rounded-lg"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
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

      {/* Deliverables */}
      {service.deliverables && (
        <Section title="제공 리포트">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {service.deliverables.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Key Benefits */}
      <Section title="운영 관리 서비스의 장점">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="glass-card p-6 rounded-lg text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">비즈니스 연속성</h3>
            <p className="text-sm text-muted-foreground">
              24/7 모니터링과 즉각적인 장애 대응으로 서비스 중단 최소화
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">보안 강화</h3>
            <p className="text-sm text-muted-foreground">
              정기 보안 패치 및 취약점 스캔으로 시스템 안전성 확보
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">지속적 개선</h3>
            <p className="text-sm text-muted-foreground">
              성능 분석 및 개선 제안으로 서비스 품질 향상
            </p>
          </div>
        </div>
      </Section>

      {/* Refund Policy */}
      {service.refundPolicy && (
        <Section title="환불 정책">
          <div className="max-w-2xl mx-auto glass-card p-6 rounded-lg">
            <p className="text-muted-foreground">{service.refundPolicy.description}</p>
            <p className="text-sm text-muted-foreground pt-3 border-t mt-3">
              ※ 자세한 내용은{" "}
              <a href={service.refundPolicy.link} className="text-primary hover:underline">
                환불 정책
              </a>{" "}
              페이지를 참조해주세요.
            </p>
          </div>
        </Section>
      )}

      {/* FAQ */}
      {service.faq && <FAQSection faqs={service.faq} />}

      {/* CTA */}
      <CTASection
        primary={{ label: "상담 신청하기", href: "/work-with-us" }}
        secondary={{
          label: "플랜 비교하기",
          href: "/pricing",
        }}
      />
    </PageLayout>
  );
}
