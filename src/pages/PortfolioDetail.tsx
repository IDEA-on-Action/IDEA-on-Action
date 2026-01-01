import { Helmet } from "react-helmet-async";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Github, Calendar, TrendingUp, Users, GitBranch, TestTube, Target, Check, Home } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useProject } from "@/hooks/projects/useProjects";

const PortfolioDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: project, isLoading, error } = useProject(slug || '');

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">프로젝트를 불러오는 중...</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-4 h-4" />
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // Error or not found
  if (error || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="glass-card p-12 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">프로젝트를 찾을 수 없습니다</h2>
          <p className="text-muted-foreground mb-6">
            요청하신 프로젝트가 존재하지 않거나 삭제되었습니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/portfolio"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              포트폴리오로 돌아가기
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-md hover:bg-muted transition-colors font-semibold"
            >
              <Home className="w-4 h-4" />
              홈으로 돌아가기
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
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

  return (
    <>
      <Helmet>
        <title>{project.title} - Portfolio - IDEA on Action</title>
        <meta name="description" content={project.summary} />
        <meta property="og:title" content={`${project.title} - IDEA on Action`} />
        <meta property="og:description" content={project.summary} />
        <meta property="og:type" content="article" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <section className="relative py-12 px-4 border-b">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center gap-3 mb-6">
              <Link
                to="/portfolio"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                포트폴리오로 돌아가기
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Home className="w-4 h-4" />
                홈
              </Link>
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <h1 className="text-4xl md:text-5xl font-bold">{project.title}</h1>
                  <p className="text-xl text-muted-foreground">{project.summary}</p>
                </div>
                <Badge variant={statusVariants[project.status]} className="text-sm px-3 py-1">
                  {statusLabels[project.status]}
                </Badge>
              </div>

              {/* Quick Links */}
              <div className="flex flex-wrap items-center gap-3">
                {project.links.github && (
                  <a
                    href={project.links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 glass-card rounded-md hover:bg-muted/50 transition-colors text-sm font-semibold"
                  >
                    <Github className="w-4 h-4" />
                    GitHub
                  </a>
                )}
                {project.links.demo && (
                  <a
                    href={project.links.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-semibold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Live Demo
                  </a>
                )}
                {project.links.docs && (
                  <a
                    href={project.links.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 glass-card rounded-md hover:bg-muted/50 transition-colors text-sm font-semibold"
                  >
                    문서
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Column - Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Description */}
                <Card className="glass-card p-8">
                  <h2 className="text-2xl font-bold mb-4">프로젝트 소개</h2>
                  <p className="text-foreground/80 leading-relaxed whitespace-pre-line">
                    {project.description}
                  </p>
                </Card>

                {/* Highlights */}
                {project.highlights && project.highlights.length > 0 && (
                  <Card className="glass-card p-8">
                    <h2 className="text-2xl font-bold mb-6">주요 특징</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      {project.highlights.map((highlight, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-sm text-foreground/80">{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Tech Stack */}
                {project.tech && (
                  <Card className="glass-card p-8">
                    <h2 className="text-2xl font-bold mb-6">기술 스택</h2>
                    <div className="space-y-6">
                      {project.tech.frontend && (
                        <div>
                          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Frontend</h3>
                          <div className="flex flex-wrap gap-2">
                            {project.tech.frontend.map((tech, index) => (
                              <Badge key={index} variant="secondary">{tech}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {project.tech.backend && (
                        <div>
                          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Backend</h3>
                          <div className="flex flex-wrap gap-2">
                            {project.tech.backend.map((tech, index) => (
                              <Badge key={index} variant="secondary">{tech}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {project.tech.testing && (
                        <div>
                          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Testing</h3>
                          <div className="flex flex-wrap gap-2">
                            {project.tech.testing.map((tech, index) => (
                              <Badge key={index} variant="secondary">{tech}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {project.tech.deployment && (
                        <div>
                          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Deployment</h3>
                          <div className="flex flex-wrap gap-2">
                            {project.tech.deployment.map((tech, index) => (
                              <Badge key={index} variant="secondary">{tech}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-6">
                {/* Metrics */}
                <Card className="glass-card p-6 space-y-6">
                  <h3 className="text-xl font-bold">프로젝트 지표</h3>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">진행률</span>
                      </div>
                      <span className="text-2xl font-bold">{project.metrics.progress}%</span>
                    </div>
                    <Progress value={project.metrics.progress} className="h-2" />
                  </div>

                  {/* Other Metrics */}
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">기여자</span>
                      </div>
                      <span className="font-bold">{project.metrics.contributors}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">커밋</span>
                      </div>
                      <span className="font-bold">{project.metrics.commits}</span>
                    </div>
                    {project.metrics.tests > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TestTube className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">테스트</span>
                        </div>
                        <span className="font-bold">{project.metrics.tests}</span>
                      </div>
                    )}
                    {project.metrics.coverage > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">커버리지</span>
                        </div>
                        <span className="font-bold">{project.metrics.coverage}%</span>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Timeline */}
                {project.timeline && (
                  <Card className="glass-card p-6 space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      타임라인
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">시작일</span>
                        <span className="font-semibold">
                          {new Date(project.timeline.started).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      {project.timeline.launched && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">출시일</span>
                          <span className="font-semibold">
                            {new Date(project.timeline.launched).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">최근 업데이트</span>
                        <span className="font-semibold">
                          {new Date(project.timeline.updated).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Tags */}
                <Card className="glass-card p-6 space-y-4">
                  <h3 className="text-xl font-bold">태그</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Card>

                {/* Category */}
                <Card className="glass-card p-6">
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase">카테고리</h3>
                  <Badge variant="default" className="text-sm">
                    {project.category}
                  </Badge>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 bg-gradient-to-r from-primary/10 to-secondary/10">
          <div className="container mx-auto max-w-4xl text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">비슷한 프로젝트가 필요하신가요?</h2>
            <p className="text-lg text-foreground/80">
              함께 만들어갈 수 있습니다.
            </p>
            <a
              href="/work-with-us"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
            >
              프로젝트 제안하기
            </a>
          </div>
        </section>
      </div>
    </>
  );
};

export default PortfolioDetail;
