import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/layouts/PageLayout";
import Section from "@/components/layouts/Section";
import PricingPackage from "@/components/services-platform/PricingPackage";
import FAQSection from "@/components/services-platform/FAQSection";
import CTASection from "@/components/services-platform/CTASection";
import { SEO } from "@/components/shared/SEO";
import { Badge } from "@/components/ui/badge";
import { mvpDevelopmentService } from "@/data/services/mvp-development";
import { useAuth } from "@/hooks/useAuth";
import { useAddToCart } from "@/hooks/useCart";
import { useServiceBySlug } from "@/hooks/useServices";
import { CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Package } from "@/types/services";

export default function MVPServicePage() {
  const service = mvpDevelopmentService;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { mutate: addToCart, isPending: isAddingToCart } = useAddToCart();

  // slug로 데이터베이스 서비스 조회
  const { data: dbService } = useServiceBySlug(service.slug);

  // 장바구니 담기 핸들러
  const handleAddToCart = (pkg: Package) => {
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
      price: pkg.price,
      packageName: pkg.name, // 패키지 이름 추가
    });
  };

  // 최저 가격 계산
  const lowestPrice = service.pricing.packages?.[0]?.price || 0;

  return (
    <PageLayout>
      <SEO
        title={service.title}
        description={service.description}
        keywords={['MVP 개발', '스타트업', '프로토타입', '빠른 개발', '아이디어 검증', 'Lean Startup', '제품 개발']}
        canonical="/services/mvp"
        ogType="service"
        service={{
          name: service.title,
          description: service.description,
          price: lowestPrice,
          priceCurrency: 'KRW',
          category: 'MVP 개발'
        }}
        breadcrumbs={[
          { name: '홈', url: '/' },
          { name: '서비스', url: '/services' },
          { name: service.title, url: '/services/mvp' }
        ]}
      />

      {/* Hero */}
      <section className="text-center py-12 space-y-4">
        <h1 className="text-4xl font-bold">{service.title}</h1>
        <p className="text-xl text-muted-foreground">{service.subtitle}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {service.techStack.frontend && (
              <div>
                <h3 className="font-semibold mb-3">Frontend</h3>
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
                <h3 className="font-semibold mb-3">Backend</h3>
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
                <h3 className="font-semibold mb-3">Database</h3>
                <div className="flex flex-wrap gap-2">
                  {service.techStack.database.map((tech) => (
                    <Badge key={tech} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {service.techStack.deployment && (
              <div>
                <h3 className="font-semibold mb-3">Deployment</h3>
                <div className="flex flex-wrap gap-2">
                  {service.techStack.deployment.map((tech) => (
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

      {/* Pricing Packages */}
      <Section title="가격 정책">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {service.pricing.packages?.map((pkg) => (
            <PricingPackage
              key={pkg.name}
              package={pkg}
              onAddToCart={handleAddToCart}
              isAddingToCart={isAddingToCart}
            />
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-6">
          ※ 프로젝트 규모와 요구사항에 따라 견적이 달라질 수 있습니다.
        </p>
      </Section>

      {/* Payment Method */}
      {service.paymentMethod && (
        <Section title="결제 방식">
          <div className="max-w-2xl mx-auto glass-card p-6 rounded-lg">
            <ul className="space-y-2">
              <li>
                <strong>착수금:</strong> 계약 체결 시{" "}
                {service.paymentMethod.split?.deposit}%
              </li>
              <li>
                <strong>중간금:</strong> 개발 완료 시{" "}
                {service.paymentMethod.split?.interim}%
              </li>
              <li>
                <strong>잔금:</strong> 최종 납품 및 검수 완료 시{" "}
                {service.paymentMethod.split?.final}%
              </li>
            </ul>
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

      {/* Refund Policy */}
      {service.refundPolicy && (
        <Section title="환불 정책">
          <div className="max-w-2xl mx-auto glass-card p-6 rounded-lg space-y-3">
            <p>• {service.refundPolicy.beforeStart}</p>
            <p>• {service.refundPolicy.inProgress}</p>
            <p>• {service.refundPolicy.afterCompletion}</p>
            {service.refundPolicy.specialCases && (
              <div className="pt-3 border-t">
                <p className="font-semibold mb-2">특별 경우:</p>
                {service.refundPolicy.specialCases.map((item, index) => (
                  <p key={index} className="text-sm text-muted-foreground">
                    • {item}
                  </p>
                ))}
              </div>
            )}
            <p className="text-sm text-muted-foreground pt-3 border-t">
              ※ 자세한 내용은 <a href="/refund" className="text-primary hover:underline">환불 정책</a> 페이지를 참조해주세요.
            </p>
          </div>
        </Section>
      )}

      {/* FAQ */}
      {service.faq && <FAQSection faqs={service.faq} />}

      {/* CTA */}
      <CTASection
        primary={{ label: "상담 신청하기", href: "/work-with-us" }}
        secondary={{ label: "견적 문의하기", href: "/work-with-us?type=quote" }}
      />
    </PageLayout>
  );
}
