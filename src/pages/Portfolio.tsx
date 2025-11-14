import { Helmet } from "react-helmet-async";
import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, GitBranch, Users, TrendingUp, ExternalLink, Github } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/useProjects";
import { PageLayout, HeroSection, Section } from "@/components/layouts";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared";
import { analytics } from "@/lib/analytics";

const Portfolio = () => {
  const { data: projectsData, isLoading, error } = useProjects();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const navigate = useNavigate();

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

  const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    "in-progress": "secondary",
    "validate": "outline",
    "launched": "default",
    "backlog": "outline"
  };

  // 모든 훅은 early return 전에 호출되어야 합니다
  const projects = projectsData || [];

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
                  {filteredProjects.map((project, index) => (
                    <div
                      key={project.id}
                      onClick={() => navigate(`/portfolio/${project.slug}`)}
                      className="cursor-pointer"
                    >
                      <Card
                        className="glass-card p-6 space-y-4 hover-lift h-full flex flex-col"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-xl font-bold line-clamp-2 flex-1">
                            {project.title}
                          </h3>
                          <Badge variant={statusVariants[project.status] || "outline"}>
                            {statusLabels[project.status as keyof typeof statusLabels] || project.status}
                          </Badge>
                        </div>

                        {/* Summary */}
                        <p className="text-sm text-foreground/70 line-clamp-3 flex-1">
                          {project.summary}
                        </p>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                          {project.tags.slice(0, 4).map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {project.tags.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{project.tags.length - 4}
                            </Badge>
                          )}
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <TrendingUp className="w-3 h-3 text-primary" />
                              <span className="text-xs text-muted-foreground">진행률</span>
                            </div>
                            <div className="font-bold">{project.metrics.progress}%</div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <GitBranch className="w-3 h-3 text-primary" />
                              <span className="text-xs text-muted-foreground">커밋</span>
                            </div>
                            <div className="font-bold">{project.metrics.commits}</div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Users className="w-3 h-3 text-primary" />
                              <span className="text-xs text-muted-foreground">기여자</span>
                            </div>
                            <div className="font-bold">{project.metrics.contributors}</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <Progress value={project.metrics.progress} className="h-1" />

                        {/* Links */}
                        <div className="flex items-center gap-3 pt-2" onClick={(e) => e.stopPropagation()}>
                          {project.links.github && (
                            <a
                              href={project.links.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                            >
                              <Github className="w-4 h-4" />
                              <span>GitHub</span>
                            </a>
                          )}
                          {project.links.demo && (
                            <a
                              href={project.links.demo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>Demo</span>
                            </a>
                          )}
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Section>

        {/* CTA Section */}
        <Section variant="gradient" maxWidth="4xl">
          <div className="text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">다음 프로젝트의 주인공은?</h2>
            <p className="text-lg text-foreground/80">
              당신의 아이디어를 함께 실현해보세요.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button asChild>
                <Link to="/work-with-us">
                  프로젝트 제안하기
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/lab">
                  바운티 참여하기
                </Link>
              </Button>
            </div>
          </div>
        </Section>
      </PageLayout>
    </>
  );
};

export default Portfolio;
