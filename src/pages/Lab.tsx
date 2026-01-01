import { Helmet } from "react-helmet-async";
import { useEffect } from "react";
import { Beaker, Award, Clock, Target, Users, DollarSign, Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBounties } from "@/hooks/projects/useBounties";
import { PageLayout, HeroSection, Section } from "@/components/layouts";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared";
import { analytics } from "@/lib/analytics";

const Lab = () => {
  const { data: bountiesData, isLoading, error } = useBounties();
  const statusLabels = {
    open: "모집중",
    assigned: "진행중",
    done: "완료",
    pending: "대기"
  };

  const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    open: "default",
    assigned: "secondary",
    done: "outline",
    pending: "outline"
  };

  const difficultyColors = {
    "초급": "text-green-600",
    "중급": "text-yellow-600",
    "고급": "text-red-600"
  };

  // GA4: Lab 페이지 조회 이벤트
  useEffect(() => {
    // Lab 페이지 방문 시 커뮤니티 참여 이벤트로 트래킹
    analytics.joinCommunity("view", "bounties");
  }, []);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  const bounties = bountiesData || [];

  return (
    <>
      <Helmet>
        <title>Lab - 실험실 & 바운티 - IDEA on Action</title>
        <meta
          name="description"
          content="IDEA on Action 실험실에 오신 것을 환영합니다. 흥미로운 실험과 바운티 프로그램에 참여하세요."
        />
        <meta property="og:title" content="Lab - IDEA on Action" />
        <meta property="og:description" content="실험실 & 바운티 프로그램" />
        <meta property="og:type" content="website" />
      </Helmet>

      <PageLayout>
        <HeroSection
          badge={{ icon: Beaker, text: "Experiments & Bounties" }}
          title="Lab"
          description="아이디어를 실험하고, 보상을 받으며 성장하세요"
        />

        <Section variant="muted" className="py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="glass-card p-4 text-center">
              <div className="text-3xl font-bold text-primary">{bounties.length}</div>
              <div className="text-sm text-muted-foreground mt-1">총 바운티</div>
            </Card>
            <Card className="glass-card p-4 text-center">
              <div className="text-3xl font-bold text-green-600">
                {bounties.filter(b => b.status === "open").length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">모집중</div>
            </Card>
            <Card className="glass-card p-4 text-center">
              <div className="text-3xl font-bold text-secondary">
                {bounties.filter(b => b.status === "assigned").length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">진행중</div>
            </Card>
            <Card className="glass-card p-4 text-center">
              <div className="text-3xl font-bold text-accent">
                {bounties.reduce((sum, b) => sum + b.reward, 0).toLocaleString()}원
              </div>
              <div className="text-sm text-muted-foreground mt-1">총 보상금</div>
            </Card>
          </div>
        </Section>

        <Section>
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">바운티 프로그램</h2>
            <p className="text-muted-foreground">
              스킬을 발휘하고 보상을 받으세요. 모든 기여는 가치있습니다.
            </p>
          </div>

          {bounties.length === 0 ? (
            <EmptyState
              icon={Package}
              title="바운티가 없습니다"
              description="아직 등록된 바운티가 없습니다."
            />
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {bounties.map((bounty, index) => (
                <Card
                  key={bounty.id}
                  className="glass-card p-6 space-y-4 hover-lift"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-xl font-bold flex-1">{bounty.title}</h3>
                    <Badge variant={statusVariants[bounty.status]}>
                      {statusLabels[bounty.status as keyof typeof statusLabels]}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-foreground/70 leading-relaxed">
                    {bounty.description}
                  </p>

                  {/* Meta Info */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-primary" />
                        <span className="font-bold text-lg">
                          {bounty.reward.toLocaleString()}원
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>~{bounty.estimated_hours}시간</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Target className={`w-4 h-4 ${difficultyColors[bounty.difficulty as keyof typeof difficultyColors]}`} />
                        <span className={difficultyColors[bounty.difficulty as keyof typeof difficultyColors]}>
                          {bounty.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{(bounty.applicants?.length || 0)}명 신청</span>
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  {bounty.skills_required && bounty.skills_required.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {bounty.skills_required.map((skill, skillIndex) => (
                        <Badge key={skillIndex} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Deadline */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-sm text-muted-foreground">마감일</span>
                    <span className="font-semibold">
                      {new Date(bounty.deadline).toLocaleDateString('ko-KR')}
                    </span>
                  </div>

                  {/* CTA */}
                  {bounty.status === "open" && (
                    <button
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
                      disabled
                    >
                      신청하기 (Sprint 2에서 활성화)
                    </button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </Section>

        <Section variant="muted">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">어떻게 참여하나요?</h2>
            <p className="text-muted-foreground">간단한 4단계로 시작하세요</p>
          </div>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                {
                  icon: Target,
                  title: "1. 바운티 선택",
                  description: "관심있는 바운티를 찾아보세요"
                },
                {
                  icon: Users,
                  title: "2. 신청하기",
                  description: "스킬과 경험을 공유하세요"
                },
                {
                  icon: Beaker,
                  title: "3. 작업 시작",
                  description: "요구사항에 맞춰 개발하세요"
                },
                {
                  icon: Award,
                  title: "4. 보상 받기",
                  description: "검수 완료 후 보상을 받습니다"
                }
              ].map((step, index) => (
                <Card key={index} className="glass-card p-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold">{step.title}</h3>
                  <p className="text-sm text-foreground/70">{step.description}</p>
                </Card>
              ))}
            </div>
        </Section>

        <Section variant="gradient" maxWidth="4xl">
          <div className="text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">준비되셨나요?</h2>
            <p className="text-lg text-foreground/80">
              지금 바로 첫 바운티에 도전하세요!
            </p>
            <a
              href="/work-with-us"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
            >
              문의하기
            </a>
          </div>
        </Section>
      </PageLayout>
    </>
  );
};

export default Lab;
