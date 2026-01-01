import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/layouts/PageLayout";
import Section from "@/components/layouts/Section";
import PlanComparisonTable from "@/components/services-platform/PlanComparisonTable";
import FAQSection from "@/components/services-platform/FAQSection";
import CTASection from "@/components/services-platform/CTASection";
import { SEO } from "@/components/shared/SEO";
import { Badge } from "@/components/ui/badge";
import { fullstackDevelopmentService } from "@/data/services/fullstack-development";
import { useAuth } from "@/hooks/useAuth";
import { useAddToCart } from "@/hooks/payments/useCart";
import { useServiceBySlug } from "@/hooks/useServices";
import { CheckCircle2, Code2, Server, Database, Cloud } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import type { MonthlyPlan } from "@/types/services";

export default function FullstackPage() {
  const service = fullstackDevelopmentService;
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
        keywords={['풀스택 개발', 'React', 'Node.js', 'TypeScript', '웹 개발', '앱 개발', 'API 개발', '시스템 개발']}
        canonical="/services/fullstack"
        ogType="service"
        service={{
          name: service.title,
          description: service.description,
          price: lowestMonthlyPrice,
          priceCurrency: 'KRW',
          category: '개발 서비스'
        }}
        breadcrumbs={[
          { name: '홈', url: '/' },
          { name: '서비스', url: '/services' },
          { name: service.title, url: '/services/fullstack' }
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
        <Section title="기술 스택">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {service.techStack.frontend && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Code2 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Frontend</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {service.techStack.frontend.map((tech) => (
                    <Badge key={tech} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {service.techStack.backend && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Server className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Backend</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {service.techStack.backend.map((tech) => (
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
                  <Database className="h-5 w-5 text-primary" />
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
            {service.techStack.devops && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Cloud className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">DevOps</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {service.techStack.devops.map((tech) => (
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

      {/* Pricing */}
      <Section title="가격 정책">
        {/* Hourly Pricing */}
        {service.pricing.hourly && (
          <div className="max-w-3xl mx-auto mb-8">
            <h3 className="text-xl font-semibold mb-4 text-center">
              시간 기반 계약
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-card p-6 rounded-lg">
                <h4 className="font-semibold mb-2">시니어 개발자</h4>
                <p className="text-3xl font-bold text-primary">
                  ₩{(service.pricing.hourly.seniorRate / 1000).toFixed(0)}K
                  <span className="text-lg text-muted-foreground">
                    /시간
                  </span>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  5년 이상 경력
                </p>
              </div>
              <div className="glass-card p-6 rounded-lg">
                <h4 className="font-semibold mb-2">주니어 개발자</h4>
                <p className="text-3xl font-bold text-primary">
                  ₩{(service.pricing.hourly.juniorRate / 1000).toFixed(0)}K
                  <span className="text-lg text-muted-foreground">
                    /시간
                  </span>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  2-5년 경력
                </p>
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-4">
              ※ {service.pricing.hourly.estimatedHours}
            </p>
          </div>
        )}

        {/* Monthly Pricing */}
        {service.pricing.monthly && (
          <div className="max-w-5xl mx-auto">
            <h3 className="text-xl font-semibold mb-6 text-center">
              월 단위 계약
            </h3>
            <PlanComparisonTable
              plans={service.pricing.monthly}
              onAddToCart={handleAddToCart}
              isAddingToCart={isAddingToCart}
            />
            {service.pricing.annualDiscount && (
              <p className="text-center text-sm text-accent font-semibold mt-6">
                ✨ 연간 계약 시 {service.pricing.annualDiscount}% 할인
              </p>
            )}
          </div>
        )}
      </Section>

      {/* Payment Method */}
      {service.paymentMethod && (
        <Section title="결제 방식">
          <div className="max-w-3xl mx-auto glass-card p-6 rounded-lg space-y-3">
            <div>
              <h4 className="font-semibold mb-2">시간 기반</h4>
              <p className="text-muted-foreground">{service.paymentMethod.hourly}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">월 단위 계약</h4>
              <p className="text-muted-foreground">{service.paymentMethod.monthly}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">프로젝트 단위</h4>
              <p className="text-muted-foreground">{service.paymentMethod.project}</p>
            </div>
          </div>
        </Section>
      )}

      {/* Process */}
      {service.process && (
        <Section title="진행 절차">
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
                        소요 시간: {step.duration}
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
        <Section title="납품물">
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

      {/* Quality Assurance */}
      <Section title="품질 보증">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {[
            "코드 리뷰 100%",
            "유닛 테스트 커버리지 80% 이상",
            "E2E 테스트 주요 플로우",
            "성능 테스트 리포트",
            "보안 취약점 스캔 리포트",
          ].map((item, index) => (
            <div key={index} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
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
          label: "프로젝트 문의하기",
          href: "/work-with-us?type=project",
        }}
      />
    </PageLayout>
  );
}
