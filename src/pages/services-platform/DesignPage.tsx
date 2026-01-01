import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/layouts/PageLayout";
import Section from "@/components/layouts/Section";
import PricingPackage from "@/components/services-platform/PricingPackage";
import FAQSection from "@/components/services-platform/FAQSection";
import CTASection from "@/components/services-platform/CTASection";
import { SEO } from "@/components/shared/SEO";
import { Badge } from "@/components/ui/badge";
import { designSystemService } from "@/data/services/design-system";
import { useAuth } from "@/hooks/auth/useAuth";
import { useAddToCart } from "@/hooks/payments/useCart";
import { useServiceBySlug } from "@/hooks/useServices";
import { CheckCircle2, Palette, FileCode, BookOpen } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import type { Package } from "@/types/services";

export default function DesignPage() {
  const service = designSystemService;
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
        keywords={['UI/UX 디자인', '디자인 시스템', 'Figma', 'React 컴포넌트', '브랜드 디자인', '웹 디자인', '앱 디자인']}
        canonical="/services/design"
        ogType="service"
        service={{
          name: service.title,
          description: service.description,
          price: lowestPrice,
          priceCurrency: 'KRW',
          category: '디자인 서비스'
        }}
        breadcrumbs={[
          { name: '홈', url: '/' },
          { name: '서비스', url: '/services' },
          { name: service.title, url: '/services/design' }
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {service.techStack.design && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Design Tools</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {service.techStack.design.map((tech) => (
                    <Badge key={tech} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {service.techStack.frontend && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileCode className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Development</h3>
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
            {service.techStack.tokens && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Design Tokens</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {service.techStack.tokens.map((tech) => (
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
            <p className="text-muted-foreground text-center">
              {service.paymentMethod.package}
            </p>
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
        <Section title="산출물">
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

      {/* Design System Benefits */}
      <Section title="디자인 시스템의 장점">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="glass-card p-6 rounded-lg text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Palette className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">일관성</h3>
            <p className="text-sm text-muted-foreground">
              모든 페이지와 컴포넌트에서 일관된 디자인 언어 사용
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileCode className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">개발 효율</h3>
            <p className="text-sm text-muted-foreground">
              재사용 가능한 컴포넌트로 개발 시간 단축
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">협업 강화</h3>
            <p className="text-sm text-muted-foreground">
              디자이너와 개발자 간 명확한 소통
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
        secondary={{ label: "포트폴리오 보기", href: "/portfolio" }}
      />
    </PageLayout>
  );
}
