import { Link } from "react-router-dom";
import PageLayout from "@/components/layouts/PageLayout";
import Section from "@/components/layouts/Section";
import { SEO } from "@/components/shared/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { minuServices } from "@/data/services";
import {
  Search,
  Frame,
  Hammer,
  Shield,
  ArrowRight,
  CheckCircle2,
  Zap,
  Users,
  TrendingUp,
  Sprout,
} from "lucide-react";

// Minu 서비스별 아이콘 매핑 (씨앗의 성장 과정)
const serviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  find: Search,      // 땅 속 작은 씨앗 - 발견
  frame: Frame,      // 씨앗에서 싹이 트는 형태 - 구조화
  build: Hammer,     // 잎이 두 장 열린 작은 식물 - 성장
  keep: Shield,      // 식물이 완전히 자리 잡은 안정된 모양 - 유지
};

// Minu 서비스별 색상 매핑 (Soft Mint 계열)
const serviceColors: Record<string, string> = {
  find: "from-teal-500 to-emerald-500",
  frame: "from-purple-500 to-violet-500",
  build: "from-amber-500 to-orange-500",
  keep: "from-blue-500 to-cyan-500",
};

export default function MinuPlatformPage() {
  return (
    <PageLayout>
      <SEO
        title="Minu 플랫폼 - 작은 시작이 만든 흐름"
        description="Minu는 프로젝트 전 과정을 가볍게 이어주는 4단계 SaaS입니다. Find로 사업기회 발굴, Frame으로 문제 정의, Build로 프로젝트 관리, Keep으로 운영까지 한 번에."
        keywords={[
          "Minu",
          "프로젝트 관리",
          "프리랜서",
          "에이전시",
          "SaaS",
          "사업기회 탐색",
          "RFP 작성 자동화",
        ]}
        canonical="/services/minu"
        ogType="product"
      />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-emerald-500/5" />
        <div className="container relative">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <Badge className="px-4 py-1.5 bg-teal-500/10 text-teal-600 border-teal-500/20">
              <Sprout className="h-3 w-3 mr-1" />
              작은 시작이 만든 흐름
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-emerald-500">
                Minu
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              작게 시작해도 괜찮다. 언제든 다시 시작할 수 있으니까.
            </p>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              <strong>Find → Frame → Build → Keep</strong><br />
              프로젝트 전 과정을 가볍게 이어주는 4단계 SaaS
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" className="bg-teal-500 hover:bg-teal-600">
                <Link to="/services/minu/find">
                  Minu Find로 시작하기
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
      <Section title="Minu 플랫폼 소개">
        <p className="text-lg text-center max-w-3xl mx-auto text-muted-foreground mb-8">
          Minu는 프로젝트 라이프사이클 전체를 커버하는 경량 SaaS 플랫폼입니다.
          각 서비스는 독립적으로 사용할 수 있으며, 함께 사용하면 더 큰 시너지를 발휘합니다.
        </p>

        {/* Platform Flow Diagram */}
        <div className="max-w-5xl mx-auto mb-16">
          <div className="relative">
            {/* Connection Line (Desktop) */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-purple-500 via-amber-500 to-blue-500 -translate-y-1/2 rounded-full opacity-20" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {minuServices.map((service, index) => {
                const Icon = serviceIcons[service.slug] || Search;
                const colorClass = serviceColors[service.slug] || "from-teal-500 to-emerald-500";
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
                          to={`/services/minu/${service.slug}`}
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
      <Section title="Minu의 핵심 가치">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mx-auto">
              <Zap className="h-8 w-8 text-teal-500" />
            </div>
            <h3 className="text-xl font-semibold">부담 없이 시작하는 경량 SaaS</h3>
            <p className="text-muted-foreground">
              과도한 힘을 주지 않고, 가볍고 자연스럽게 생각을 행동으로 이어지게 돕습니다.
            </p>
          </div>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mx-auto">
              <Users className="h-8 w-8 text-teal-500" />
            </div>
            <h3 className="text-xl font-semibold">필요할 때만 쓰는 단계별 구독</h3>
            <p className="text-muted-foreground">
              모든 팀원이 동일한 플랫폼에서 작업하여 커뮤니케이션 비용을 줄이고 생산성을 높입니다.
            </p>
          </div>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mx-auto">
              <TrendingUp className="h-8 w-8 text-teal-500" />
            </div>
            <h3 className="text-xl font-semibold">일관된 흐름 구축</h3>
            <p className="text-muted-foreground">
              생각 → 정의 → 실행 → 운영의 모든 프로젝트 데이터를 통합 분석하여 인사이트를 제공합니다.
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
                <th className="text-center py-4 px-4 font-semibold text-teal-500">
                  <Search className="h-5 w-5 inline mr-2" />
                  Find
                </th>
                <th className="text-center py-4 px-4 font-semibold text-purple-500">
                  <Frame className="h-5 w-5 inline mr-2" />
                  Frame
                </th>
                <th className="text-center py-4 px-4 font-semibold text-amber-500">
                  <Hammer className="h-5 w-5 inline mr-2" />
                  Build
                </th>
                <th className="text-center py-4 px-4 font-semibold text-blue-500">
                  <Shield className="h-5 w-5 inline mr-2" />
                  Keep
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 px-4">사업기회 발굴</td>
                <td className="text-center py-3 px-4">
                  <CheckCircle2 className="h-5 w-5 text-teal-500 mx-auto" />
                </td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">-</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">문제 정의 & RFP</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">
                  <CheckCircle2 className="h-5 w-5 text-purple-500 mx-auto" />
                </td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">-</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">프로젝트 관리</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">
                  <CheckCircle2 className="h-5 w-5 text-amber-500 mx-auto" />
                </td>
                <td className="text-center py-3 px-4">-</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">운영/유지보수</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">
                  <CheckCircle2 className="h-5 w-5 text-blue-500 mx-auto" />
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">AI 분석</td>
                <td className="text-center py-3 px-4">
                  <CheckCircle2 className="h-5 w-5 text-teal-500 mx-auto" />
                </td>
                <td className="text-center py-3 px-4">
                  <CheckCircle2 className="h-5 w-5 text-purple-500 mx-auto" />
                </td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">
                  <CheckCircle2 className="h-5 w-5 text-blue-500 mx-auto" />
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">팀 협업</td>
                <td className="text-center py-3 px-4">Enterprise</td>
                <td className="text-center py-3 px-4">Pro+</td>
                <td className="text-center py-3 px-4">
                  <CheckCircle2 className="h-5 w-5 text-amber-500 mx-auto" />
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
            {minuServices.map((service) => {
              const Icon = serviceIcons[service.slug] || Search;
              const colorClass = serviceColors[service.slug] || "from-teal-500 to-emerald-500";
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
                    <CardTitle className="text-lg">{service.name.replace("Minu ", "")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-teal-500">
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
        <div className="max-w-3xl mx-auto text-center glass-card p-12 rounded-2xl bg-gradient-to-br from-teal-500/5 to-emerald-500/5">
          <Sprout className="h-12 w-12 text-teal-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">
            작게 시작하세요. Minu가 이어드립니다.
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Minu Find로 첫 사업기회를 발굴하고, Minu 플랫폼의 가벼운 흐름을 경험해 보세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-teal-500 hover:bg-teal-600">
              <Link to="/services/minu/find">
                Minu Find 무료 체험
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
