import { Helmet } from "react-helmet-async";
import { Rocket, Code, Palette, Mail, Calendar, Server, TrendingUp, Users, Lightbulb, FlaskConical, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkWithUsForm } from "@/components/forms/WorkWithUsForm";
import { PageLayout, HeroSection, Section } from "@/components/layouts";
import { NextStepsCTA } from "@/components/common/NextStepsCTA";
import { developmentServices } from "@/data/services";

const serviceIcons = {
  mvp: Rocket,
  fullstack: Code,
  design: Palette,
  operations: Server,
} as const;

const WorkWithUs = () => {
  // Development Services만 표시 (MVP, Fullstack, Design, Operations)
  const services = developmentServices.map((service) => ({
    ...service,
    icon: serviceIcons[service.slug as keyof typeof serviceIcons] || Rocket,
  }));

  return (
    <>
      <Helmet>
        <title>Work with Us - 협업 제안 - IDEA on Action</title>
        <meta
          name="description"
          content="IDEA on Action과 함께 프로젝트를 진행하세요. MVP 개발, 기술 컨설팅, 디자인 시스템 구축 등 다양한 협업이 가능합니다."
        />
        <meta property="og:title" content="Work with Us - IDEA on Action" />
        <meta property="og:description" content="함께 만들어갈 프로젝트를 기다립니다" />
        <meta property="og:type" content="website" />
      </Helmet>

      <PageLayout>
        <HeroSection
          badge={{ icon: Rocket, text: "Let's Build Together" }}
          title="함께 만들어가는 혁신"
          description={
            <>
              <p className="text-lg md:text-xl mb-2">전문가 팀과 커뮤니티가 함께하는 프로덕트 스튜디오</p>
              <p className="text-base text-muted-foreground">대규모 프로젝트부터 작은 기여까지, 모두가 참여할 수 있습니다</p>
            </>
          }
        />

        {/* Services */}
        <Section maxWidth="6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">개발 서비스</h2>
            <p className="text-lg text-muted-foreground mb-2">
              프로젝트 단계와 니즈에 맞는 서비스를 선택하세요
            </p>
            <p className="text-sm text-muted-foreground">
              전문가 팀이 기술 검증부터 제품 출시까지 함께합니다
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service, index) => {
                const Icon = service.icon;
                // 가격 정보 추출
                let priceDisplay = "협의";
                if (service.pricing.type === "package" && service.pricing.packages) {
                  const prices = service.pricing.packages.map(p => p.price);
                  const minPrice = Math.min(...prices);
                  const maxPrice = Math.max(...prices);
                  if (minPrice === maxPrice) {
                    priceDisplay = `₩${(minPrice / 1000000).toFixed(1)}M`;
                  } else {
                    priceDisplay = `₩${(minPrice / 1000000).toFixed(1)}M ~ ₩${(maxPrice / 1000000).toFixed(1)}M`;
                  }
                } else if (service.pricing.type === "monthly" && service.pricing.monthly) {
                  const prices = service.pricing.monthly.map(p => p.price);
                  const minPrice = Math.min(...prices);
                  const maxPrice = Math.max(...prices);
                  priceDisplay = `₩${(minPrice / 1000).toFixed(0)}K ~ ₩${(maxPrice / 1000).toFixed(0)}K/월`;
                } else if (service.pricing.type === "hourly" && service.pricing.hourly) {
                  priceDisplay = `₩${(service.pricing.hourly.juniorRate / 1000).toFixed(0)}K ~ ₩${(service.pricing.hourly.seniorRate / 1000).toFixed(0)}K/시간`;
                }

                return (
                  <Card
                    key={service.id}
                    className="glass-card p-6 space-y-4 hover-lift flex flex-col"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-1">{service.name}</h3>
                        <div className="text-sm font-semibold text-primary mb-2">{priceDisplay}</div>
                        <p className="text-xs text-foreground/70 line-clamp-2">{service.description}</p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t flex-1">
                      {service.features.slice(0, 4).map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-start gap-2">
                          <span className="text-primary mt-0.5 text-xs">✓</span>
                          <span className="text-xs text-foreground/80 line-clamp-1">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t">
                      <Link to={`/services/development/${service.slug}`}>
                        <Button variant="outline" className="w-full" size="sm">
                          자세히 보기
                        </Button>
                      </Link>
                    </div>
                  </Card>
                );
              })}
          </div>
        </Section>

        {/* 수행 사례 안내 */}
        <Section maxWidth="4xl" className="py-0">
          <Link
            to="/cases"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
          >
            <span className="font-semibold">비슷한 과업을 수행한 적이 있는지 먼저 확인해 보세요.</span>
            <span className="text-sm text-primary">수행 사례 보기 →</span>
          </Link>
        </Section>

        {/* Contact Form */}
        <Section variant="muted" maxWidth="4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">협업 제안하기</h2>
            <p className="text-lg text-muted-foreground">
              프로젝트에 대한 자세한 내용을 알려주시면 2-3일 내에 답변드리겠습니다.
            </p>
          </div>

          <Card className="glass-card p-8 md:p-12">
            <WorkWithUsForm />
          </Card>

          <div className="grid md:grid-cols-2 gap-6 mt-8 max-w-2xl mx-auto">
              <a
                href="mailto:sinclair.seo@ideaonaction.ai?subject=프로젝트 협업 문의"
                className="flex items-center justify-center gap-3 p-6 glass-card rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <Mail className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <div className="font-bold">직접 이메일 보내기</div>
                  <div className="text-sm text-muted-foreground">sinclair.seo@ideaonaction.ai</div>
                </div>
              </a>

              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Sprint 3에서 Cal.com 통합 예정입니다.');
                }}
                className="flex items-center justify-center gap-3 p-6 glass-card rounded-lg hover:bg-muted/50 transition-colors group opacity-50 cursor-not-allowed"
              >
                <Calendar className="w-6 h-6 text-secondary group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <div className="font-bold">미팅 예약</div>
                  <div className="text-sm text-muted-foreground">Coming Soon</div>
                </div>
              </a>
          </div>
        </Section>

        {/* Process */}
        <Section maxWidth="6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">협업 프로세스</h2>
            <p className="text-muted-foreground">투명하고 체계적인 프로세스로 진행합니다</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
              {[
                { step: "1", title: "문의", description: "이메일로 프로젝트 개요를 보내주세요" },
                { step: "2", title: "상담", description: "요구사항을 상세히 논의합니다" },
                { step: "3", title: "제안", description: "견적 및 일정을 제안합니다" },
                { step: "4", title: "시작", description: "계약 후 프로젝트를 시작합니다" }
              ].map((item, index) => (
                <div key={index} className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto text-2xl font-bold text-white">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-lg">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
          </div>
        </Section>

        {/* Other Ways to Participate */}
        <Section maxWidth="6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">다른 참여 방법</h2>
            <p className="text-lg text-muted-foreground">
              큰 프로젝트가 부담스럽다면? 작은 기여부터 시작해보세요
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="glass-card p-8 space-y-6 hover-lift">
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center">
                  <Lightbulb className="w-8 h-8 text-secondary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Lab 바운티 참여</h3>
                  <p className="text-muted-foreground mb-4">
                    실험적인 아이디어와 기능 구현에 참여하고 보상을 받으세요.
                    작은 기여부터 시작해 실력을 쌓을 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-start gap-3">
                  <span className="text-secondary mt-0.5">✓</span>
                  <span className="text-sm">시간 제약 없이 자유롭게 참여</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-secondary mt-0.5">✓</span>
                  <span className="text-sm">실력에 맞는 과제 선택 가능</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-secondary mt-0.5">✓</span>
                  <span className="text-sm">포트폴리오 및 레퍼런스 확보</span>
                </div>
              </div>

              <div className="pt-4">
                <Link to="/lab">
                  <Button variant="secondary" className="w-full" size="lg">
                    <Lightbulb className="w-4 h-4 mr-2" />
                    바운티 둘러보기
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="glass-card p-8 space-y-6 hover-lift">
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">커뮤니티 참여</h3>
                  <p className="text-muted-foreground mb-4">
                    디스코드 커뮤니티에서 다른 창작자들과 교류하고,
                    프로젝트 진행 상황을 공유하며 함께 성장하세요.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-start gap-3">
                  <span className="text-primary mt-0.5">✓</span>
                  <span className="text-sm">기술 논의 및 질문 답변</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary mt-0.5">✓</span>
                  <span className="text-sm">프로젝트 쇼케이스 및 피드백</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary mt-0.5">✓</span>
                  <span className="text-sm">협업 기회 발굴</span>
                </div>
              </div>

              <div className="pt-4">
                <a
                  href="https://discord.gg/ideaonaction"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" className="w-full" size="lg">
                    <Users className="w-4 h-4 mr-2" />
                    디스코드 참여하기
                  </Button>
                </a>
              </div>
            </Card>
          </div>
        </Section>

        <NextStepsCTA
          title="더 알아보고 싶으신가요?"
          description="우리의 실험과 결과물을 확인해보세요"
          primaryCTA={{
            label: "바운티 둘러보기",
            href: "/lab",
            icon: FlaskConical,
            description: "실험적인 아이디어와 기능 구현에 참여하세요"
          }}
          secondaryCTA={{
            label: "포트폴리오 보기",
            href: "/portfolio",
            icon: Briefcase,
            variant: "outline",
            description: "완성된 프로젝트와 성과를 확인하세요"
          }}
          variant="gradient"
        />
      </PageLayout>
    </>
  );
};

export default WorkWithUs;
