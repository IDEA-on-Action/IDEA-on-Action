import { Link } from "react-router-dom";
import PageLayout from "@/components/layouts/PageLayout";
import Section from "@/components/layouts/Section";
import { SEO } from "@/components/shared/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { compassServices } from "@/data/services";
import {
  Compass,
  Map,
  Ship,
  Anchor,
  ArrowRight,
  CheckCircle2,
  Zap,
  Users,
  TrendingUp,
} from "lucide-react";

// COMPASS 서비스별 아이콘 매핑
const serviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  navigator: Compass,
  cartographer: Map,
  captain: Ship,
  harbor: Anchor,
};

// COMPASS 서비스별 색상 매핑
const serviceColors: Record<string, string> = {
  navigator: "from-blue-500 to-cyan-500",
  cartographer: "from-purple-500 to-pink-500",
  captain: "from-orange-500 to-amber-500",
  harbor: "from-green-500 to-emerald-500",
};

export default function COMPASSPlatformPage() {
  return (
    <PageLayout>
      <SEO
        title="COMPASS 플랫폼 - 프로젝트 수주부터 운영까지"
        description="COMPASS는 프리랜서와 에이전시를 위한 통합 프로젝트 관리 플랫폼입니다. Navigator로 프로젝트 발굴, Cartographer로 제안서 작성, Captain으로 프로젝트 관리, Harbor로 운영까지 한 번에."
        keywords={[
          "COMPASS",
          "프로젝트 관리",
          "프리랜서",
          "에이전시",
          "SaaS",
          "프로젝트 수주",
          "제안서 자동화",
        ]}
        canonical="/services/compass"
        ogType="product"
      />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container relative">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <Badge className="px-4 py-1.5">통합 프로젝트 관리 플랫폼</Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                COMPASS
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              <strong>C</strong>ollaborative <strong>O</strong>perational{" "}
              <strong>M</strong>anagement <strong>P</strong>latform for{" "}
              <strong>A</strong>gile <strong>S</strong>trategic <strong>S</strong>olutions
            </p>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              프로젝트 수주부터 개발, 운영까지 프리랜서와 에이전시를 위한 올인원 플랫폼
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg">
                <Link to="/services/compass/navigator">
                  Navigator로 시작하기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/pricing">가격 비교하기</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Overview */}
      <Section title="COMPASS 플랫폼 소개">
        <p className="text-lg text-center max-w-3xl mx-auto text-muted-foreground mb-8">
          COMPASS는 프로젝트 라이프사이클 전체를 커버하는 통합 플랫폼입니다.
          각 서비스는 독립적으로 사용할 수 있으며, 함께 사용하면 더 큰 시너지를 발휘합니다.
        </p>

        {/* Platform Flow Diagram */}
        <div className="max-w-5xl mx-auto mb-16">
          <div className="relative">
            {/* Connection Line (Desktop) */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 via-orange-500 to-green-500 -translate-y-1/2 rounded-full opacity-20" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {compassServices.map((service, index) => {
                const Icon = serviceIcons[service.slug] || Compass;
                const colorClass = serviceColors[service.slug] || "from-primary to-accent";
                const isAvailable = service.status === "available";

                return (
                  <Card
                    key={service.id}
                    className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                      !isAvailable ? "opacity-80" : ""
                    }`}
                  >
                    {/* Step Number */}
                    <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>

                    <CardHeader>
                      {/* Icon */}
                      <div
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center mb-4`}
                      >
                        <Icon className="h-7 w-7 text-white" />
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={isAvailable ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {isAvailable ? "이용 가능" : "2026 Q1 출시 예정"}
                        </Badge>
                      </div>

                      <CardTitle className="text-xl">{service.name}</CardTitle>
                      <CardDescription>{service.subtitle}</CardDescription>
                    </CardHeader>

                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {service.description}
                      </p>
                    </CardContent>

                    <CardFooter>
                      <Button
                        asChild
                        variant={isAvailable ? "default" : "outline"}
                        className="w-full"
                        disabled={!isAvailable}
                      >
                        <Link
                          to={`/services/compass/${service.slug}`}
                          className={!isAvailable ? "pointer-events-none" : ""}
                        >
                          {isAvailable ? "자세히 보기" : "출시 알림 받기"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      {/* Integration Benefits */}
      <Section title="통합 플랫폼의 장점">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">원스톱 워크플로우</h3>
            <p className="text-muted-foreground">
              프로젝트 발굴부터 제안서 작성, 개발 관리, 운영까지 모든 단계를 하나의 플랫폼에서 관리합니다.
            </p>
          </div>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">팀 협업 강화</h3>
            <p className="text-muted-foreground">
              모든 팀원이 동일한 플랫폼에서 작업하여 커뮤니케이션 비용을 줄이고 생산성을 높입니다.
            </p>
          </div>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">데이터 기반 인사이트</h3>
            <p className="text-muted-foreground">
              모든 프로젝트 데이터를 통합 분석하여 비즈니스 개선을 위한 인사이트를 제공합니다.
            </p>
          </div>
        </div>
      </Section>

      {/* Feature Comparison */}
      <Section title="서비스별 주요 기능">
        <div className="overflow-x-auto">
          <table className="w-full max-w-5xl mx-auto border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-4 px-4 font-semibold">기능</th>
                <th className="text-center py-4 px-4 font-semibold text-blue-500">
                  <Compass className="h-5 w-5 inline mr-2" />
                  Navigator
                </th>
                <th className="text-center py-4 px-4 font-semibold text-purple-500">
                  <Map className="h-5 w-5 inline mr-2" />
                  Cartographer
                </th>
                <th className="text-center py-4 px-4 font-semibold text-orange-500">
                  <Ship className="h-5 w-5 inline mr-2" />
                  Captain
                </th>
                <th className="text-center py-4 px-4 font-semibold text-green-500">
                  <Anchor className="h-5 w-5 inline mr-2" />
                  Harbor
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 px-4">프로젝트 발굴</td>
                <td className="text-center py-3 px-4">
                  <CheckCircle2 className="h-5 w-5 text-primary mx-auto" />
                </td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">-</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">제안서 작성</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">
                  <CheckCircle2 className="h-5 w-5 text-primary mx-auto" />
                </td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">-</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">프로젝트 관리</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">
                  <CheckCircle2 className="h-5 w-5 text-primary mx-auto" />
                </td>
                <td className="text-center py-3 px-4">-</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">운영 관리</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">
                  <CheckCircle2 className="h-5 w-5 text-primary mx-auto" />
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">AI 분석</td>
                <td className="text-center py-3 px-4">
                  <CheckCircle2 className="h-5 w-5 text-primary mx-auto" />
                </td>
                <td className="text-center py-3 px-4">
                  <CheckCircle2 className="h-5 w-5 text-primary mx-auto" />
                </td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">
                  <CheckCircle2 className="h-5 w-5 text-primary mx-auto" />
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">팀 협업</td>
                <td className="text-center py-3 px-4">Enterprise</td>
                <td className="text-center py-3 px-4">Pro+</td>
                <td className="text-center py-3 px-4">
                  <CheckCircle2 className="h-5 w-5 text-primary mx-auto" />
                </td>
                <td className="text-center py-3 px-4">Pro+</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">API 연동</td>
                <td className="text-center py-3 px-4">Enterprise</td>
                <td className="text-center py-3 px-4">Enterprise</td>
                <td className="text-center py-3 px-4">Enterprise</td>
                <td className="text-center py-3 px-4">Enterprise</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Pricing Overview */}
      <Section title="가격 안내">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {compassServices.map((service) => {
              const Icon = serviceIcons[service.slug] || Compass;
              const colorClass = serviceColors[service.slug] || "from-primary to-accent";
              const lowestPrice = service.pricing.monthly?.[0]?.price || 0;
              const isAvailable = service.status === "available";

              return (
                <Card key={service.id} className="text-center">
                  <CardHeader className="pb-2">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center mx-auto mb-2`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{service.name.replace("COMPASS ", "")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">
                      {isAvailable ? (
                        <>
                          {(lowestPrice / 1000).toFixed(0)}K
                          <span className="text-base font-normal text-muted-foreground">
                            ~/월
                          </span>
                        </>
                      ) : (
                        <span className="text-lg text-muted-foreground">
                          가격 미정
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {isAvailable ? "Basic 플랜 기준" : "2026 Q1 출시"}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            ※ 연간 구독 시 20% 할인 | 번들 구독 시 추가 10% 할인
          </p>
          <div className="text-center mt-6">
            <Button asChild variant="outline" size="lg">
              <Link to="/pricing">전체 가격표 보기</Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* CTA Section */}
      <Section>
        <div className="max-w-3xl mx-auto text-center glass-card p-12 rounded-2xl">
          <h2 className="text-3xl font-bold mb-4">
            지금 바로 COMPASS와 함께 시작하세요
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Navigator로 첫 프로젝트를 발굴하고, COMPASS 플랫폼의 강력한 기능을 경험해 보세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/services/compass/navigator">
                Navigator 무료 체험
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/work-with-us">문의하기</Link>
            </Button>
          </div>
        </div>
      </Section>
    </PageLayout>
  );
}
