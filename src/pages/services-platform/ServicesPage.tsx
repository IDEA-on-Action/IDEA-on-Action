import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ServiceCard from "@/components/services-platform/ServiceCard";
import RoadmapTimeline from "@/components/services-platform/RoadmapTimeline";
import PageLayout from "@/components/layouts/PageLayout";
import Section from "@/components/layouts/Section";
import { developmentServices, compassServices } from "@/data/services";

export default function ServicesPage() {
  const roadmapItems = [
    { quarter: "2025 Q4", name: "Navigator", status: "current" as const },
    {
      quarter: "2026 Q1",
      name: "Cartographer",
      status: "coming-soon" as const,
    },
    { quarter: "2026 Q1", name: "Captain", status: "coming-soon" as const },
    { quarter: "2026 Q1", name: "Harbor", status: "coming-soon" as const },
  ];

  return (
    <PageLayout>
      <Helmet>
        <title>서비스 안내 | IDEA on Action</title>
        <meta
          name="description"
          content="IDEA on Action의 소프트웨어 개발 서비스와 COMPASS 플랫폼을 소개합니다. MVP 개발, 풀스택 개발, 시스템 운영부터 프로젝트 수주 플랫폼까지."
        />
      </Helmet>

      {/* Hero Section */}
      <section className="text-center py-16 space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold">
          아이디어를 현실로 만드는 파트너
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          IDEA on Action은 프로젝트 기획부터 개발, 운영까지 전체 라이프사이클을
          지원하는 소프트웨어 개발 전문 기업입니다.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <a href="#development">개발 서비스 보기</a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#compass">플랫폼 서비스 보기</a>
          </Button>
        </div>
      </section>

      {/* Development Services Section */}
      <Section id="development" title="🛠️ 소프트웨어 개발 서비스">
        <p className="text-muted-foreground text-center mb-8">
          맞춤형 웹/앱 애플리케이션 개발부터 시스템 운영까지
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {developmentServices.map((service) => {
            // 가격 표시 로직
            let priceDisplay = "별도 견적";
            let durationDisplay: string | undefined = undefined;

            if (service.pricing.type === "package" && service.pricing.packages) {
              const firstPackage = service.pricing.packages[0];
              priceDisplay = `₩${(firstPackage.price / 1000000).toFixed(0)}M~`;
              durationDisplay = firstPackage.duration;
            } else if (service.pricing.type === "hourly" && service.pricing.monthly) {
              const firstPlan = service.pricing.monthly[0];
              priceDisplay = `₩${(firstPlan.price / 1000000).toFixed(0)}M~/월`;
              durationDisplay = "프로젝트 규모별 견적";
            } else if (service.pricing.type === "monthly" && service.pricing.monthly) {
              const firstPlan = service.pricing.monthly[0];
              priceDisplay = `₩${(firstPlan.price / 1000000).toFixed(1)}M~/월`;
              durationDisplay = "월간 구독";
            }

            return (
              <ServiceCard
                key={service.id}
                title={service.name}
                description={service.subtitle}
                price={priceDisplay}
                duration={durationDisplay}
                href={`/services/development/${service.slug}`}
                status={service.status}
                launchDate={service.launchDate}
              />
            );
          })}
        </div>
      </Section>

      {/* COMPASS Platform Section */}
      <Section id="compass" title="COMPASS 플랫폼 서비스">
        <p className="text-muted-foreground text-center mb-8">
          프로젝트 수주부터 운영까지 통합 관리 SaaS
        </p>

        <RoadmapTimeline items={roadmapItems} />

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {compassServices.map((service) => {
            const isAvailable = service.status === "available";
            const lowestPrice = service.pricing.monthly?.[0]?.price || 0;

            return (
              <div key={service.id} className="glass-card p-6 rounded-lg">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Badge className="mb-2" variant={isAvailable ? "default" : "secondary"}>
                      {isAvailable ? "현재 이용 가능" : "2026 Q1 출시 예정"}
                    </Badge>
                    <h3 className="text-xl font-bold">{service.name}</h3>
                    <p className="text-muted-foreground mt-2">
                      {service.subtitle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-6">
                  <div className="text-xl font-bold text-primary">
                    {isAvailable
                      ? `₩${(lowestPrice / 1000).toFixed(0)}K~/월`
                      : "가격 미정"}
                  </div>
                  <Button asChild variant={isAvailable ? "default" : "outline"} size="sm">
                    <a href={`/services/compass/${service.slug}`}>
                      {isAvailable ? "자세히 보기" : "알아보기"}
                    </a>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Button asChild variant="outline" size="lg">
            <a href="/services/compass">COMPASS 플랫폼 전체 보기</a>
          </Button>
        </div>
      </Section>

      {/* Trust Factors Section */}
      <Section title="왜 IDEA on Action인가?">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="glass-card p-6 rounded-lg">
            <div className="text-xl font-semibold mb-2">
              ✓ Vibe Coding 방법론
            </div>
            <p className="text-muted-foreground">
              체계적이고 효율적인 개발 프로세스
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg">
            <div className="text-xl font-semibold mb-2">
              ✓ React/TypeScript 최신 기술 스택
            </div>
            <p className="text-muted-foreground">
              검증된 최신 기술로 안정적인 서비스 구축
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg">
            <div className="text-xl font-semibold mb-2">
              ✓ SDD(Spec-Driven Development) 프로세스
            </div>
            <p className="text-muted-foreground">
              명세 기반 개발로 명확한 결과물 보장
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg">
            <div className="text-xl font-semibold mb-2">
              ✓ 투명한 프로젝트 진행 관리
            </div>
            <p className="text-muted-foreground">
              정기 보고와 함께 진행 상황을 실시간 공유
            </p>
          </div>
        </div>
      </Section>
    </PageLayout>
  );
}
