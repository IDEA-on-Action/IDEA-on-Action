import { Helmet } from "react-helmet-async";
import { useState, useMemo, useEffect } from "react";
import { Briefcase, Rocket, FlaskConical } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useProjects } from "@/hooks/projects/useProjects";
import { PageLayout, HeroSection, Section } from "@/components/layouts";
import { NextStepsCTA } from "@/components/common/NextStepsCTA";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared";
import { ProjectCard } from "@/components/projects";
import { analytics } from "@/lib/analytics";

const Portfolio = () => {
  const { data: projectsData, isLoading, error } = useProjects();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // GA4: Portfolio 페이지 조회 이벤트
  useEffect(() => {
    analytics.viewPortfolio();
  }, []);

  const statusLabels = {
    "all": "전체",
    "in-progress": "진행중",
    "validate": "검증",
    "launched": "출시",
    "backlog": "대기"
  };

  // 모든 훅은 early return 전에 호출되어야 합니다
  // useMemo로 감싸서 참조 안정성 보장
  const projects = useMemo(() => projectsData || [], [projectsData]);

  const projectCounts = useMemo(() => {
    if (!projects || projects.length === 0) {
      return { total: 0, inProgress: 0, validate: 0, launched: 0, backlog: 0 };
    }
    return {
      total: projects.length,
      inProgress: projects.filter(p => p.status === "in-progress").length,
      validate: projects.filter(p => p.status === "validate").length,
      launched: projects.filter(p => p.status === "launched").length,
      backlog: projects.filter(p => p.status === "backlog").length
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (!projects || projects.length === 0) return [];
    return selectedStatus === "all"
      ? projects
      : projects.filter(p => p.status === selectedStatus);
  }, [projects, selectedStatus]);

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <>
      <Helmet>
        <title>포트폴리오 - IDEA on Action</title>
        <meta
          name="description"
          content="IDEA on Action에서 진행한 프로젝트들을 둘러보세요. 아이디어부터 출시까지 전 과정을 공개합니다."
        />
        <meta property="og:title" content="포트폴리오 - IDEA on Action" />
        <meta property="og:description" content="아이디어부터 출시까지 전 과정을 공개하는 프로젝트 포트폴리오" />
        <meta property="og:type" content="website" />
      </Helmet>

      <PageLayout>
        <HeroSection
          badge={{ icon: Briefcase, text: `${projectCounts.total}개 프로젝트` }}
          title="Portfolio"
          description="아이디어부터 출시까지, 전 과정을 투명하게 공개합니다"
        />

        {/* Stats */}
        <Section variant="muted" className="py-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="glass-card p-4 text-center">
              <div className="text-3xl font-bold text-primary">{projectCounts.total}</div>
              <div className="text-sm text-muted-foreground mt-1">전체</div>
            </Card>
            <Card className="glass-card p-4 text-center">
              <div className="text-3xl font-bold text-secondary">{projectCounts.inProgress}</div>
              <div className="text-sm text-muted-foreground mt-1">진행중</div>
            </Card>
            <Card className="glass-card p-4 text-center">
              <div className="text-3xl font-bold text-accent">{projectCounts.validate}</div>
              <div className="text-sm text-muted-foreground mt-1">검증</div>
            </Card>
            <Card className="glass-card p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{projectCounts.launched}</div>
              <div className="text-sm text-muted-foreground mt-1">출시</div>
            </Card>
            <Card className="glass-card p-4 text-center">
              <div className="text-3xl font-bold text-muted-foreground">{projectCounts.backlog}</div>
              <div className="text-sm text-muted-foreground mt-1">대기</div>
            </Card>
          </div>
        </Section>

        {/* Projects */}
        <Section>
          <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
            <TabsList className="glass-card mb-8">
              {Object.entries(statusLabels).map(([key, label]) => (
                <TabsTrigger key={key} value={key}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedStatus} className="space-y-6">
              {filteredProjects.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="프로젝트가 없습니다"
                  description="해당 상태의 프로젝트가 없습니다."
                />
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      showProgress
                      showGitHub
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Section>

        <NextStepsCTA
          title="다음 프로젝트의 주인공은?"
          description="당신의 아이디어를 함께 실현해보세요"
          primaryCTA={{
            label: "프로젝트 제안하기",
            href: "/work-with-us",
            icon: Rocket,
            description: "새로운 프로젝트를 제안하고 함께 만들어가세요"
          }}
          secondaryCTA={{
            label: "바운티 참여하기",
            href: "/lab",
            icon: FlaskConical,
            variant: "outline",
            description: "실제 프로젝트에 기여하고 보상을 받으세요"
          }}
          variant="gradient"
        />
      </PageLayout>
    </>
  );
};

export default Portfolio;
