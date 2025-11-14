import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Activity, Briefcase, Award, Users, TrendingUp, GitBranch, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageLayout } from "@/components/layouts/PageLayout";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ActivityTrendChart } from "@/components/status/ActivityTrendChart";
import { useProjects } from "@/hooks/useProjects";
import { useBounties } from "@/hooks/useBounties";
import { useLogs } from "@/hooks/useLogs";
import { useNewsletterStats } from "@/hooks/useNewsletter";
import { analytics } from "@/lib/analytics";

const Status = () => {
  const { data: projectsData, isLoading: projectsLoading, error: projectsError } = useProjects();
  const { data: bountiesData, isLoading: bountiesLoading, error: bountiesError } = useBounties();
  const { data: logsData, isLoading: logsLoading, error: logsError } = useLogs(20);
  const { data: newsletterStats, isLoading: newsletterLoading } = useNewsletterStats();

  // Loading state
  if (projectsLoading || bountiesLoading || logsLoading || newsletterLoading) {
    return (
      <PageLayout>
        <LoadingState />
      </PageLayout>
    );
  }

  // Error state
  if (projectsError || bountiesError || logsError) {
    const error = projectsError || bountiesError || logsError;
    return (
      <PageLayout>
        <ErrorState
          error={error}
          title="데이터 로드 실패"
        />
      </PageLayout>
    );
  }

  const projects = projectsData || [];
  const bounties = bountiesData || [];
  const logs = logsData || [];

  // Calculate metrics
  const totalProjects = projects.length;
  const inProgressProjects = projects.filter(p => p.status === "in-progress").length;
  const launchedProjects = projects.filter(p => p.status === "launched").length;

  const totalBounties = bounties.length;
  const openBounties = bounties.filter(b => b.status === "open").length;
  const completedBounties = bounties.filter(b => b.status === "done").length;
  const bountyCompletionRate = totalBounties > 0 ? (completedBounties / totalBounties) * 100 : 0;

  const totalCommits = projects.reduce((sum, p) => sum + p.metrics.commits, 0);
  const totalContributors = projects.reduce((sum, p) => sum + p.metrics.contributors, 0);
  const totalTests = projects.reduce((sum, p) => sum + p.metrics.tests, 0);

  const recentActivities = logs.slice(0, 5);
  const weeklyActivityCount = logs.filter(log => {
    const logDate = new Date(log.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return logDate >= weekAgo;
  }).length;

  return (
    <PageLayout>
      <Helmet>
        <title>Status - 오픈 메트릭스 - IDEA on Action</title>
        <meta
          name="description"
          content="IDEA on Action의 활동 지표를 실시간으로 확인하세요. 프로젝트 수, 커밋, 바운티 완료율 등 모든 지표를 투명하게 공개합니다."
        />
        <meta property="og:title" content="Status - IDEA on Action" />
        <meta property="og:description" content="오픈 메트릭스 - 모든 활동을 투명하게 공개합니다" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative py-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10"></div>
          <div className="container mx-auto max-w-6xl relative">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-4">
                <Activity className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm font-semibold">Live Metrics</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
                Status
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                모든 활동을 투명하게 공개합니다
              </p>
            </div>
          </div>
        </section>

        {/* Key Metrics */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
              {/* Total Projects */}
              <Card className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Briefcase className="w-8 h-8 text-primary" />
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-4xl font-bold">{totalProjects}</div>
                  <div className="text-sm text-muted-foreground mt-1">총 프로젝트</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-green-600">{launchedProjects} 출시</span>
                  <span>•</span>
                  <span className="text-secondary">{inProgressProjects} 진행중</span>
                </div>
              </Card>

              {/* Bounty Completion Rate */}
              <Card className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Award className="w-8 h-8 text-secondary" />
                  <span className="text-2xl font-bold">{bountyCompletionRate.toFixed(0)}%</span>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-2">바운티 완료율</div>
                  <Progress value={bountyCompletionRate} className="h-2" />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{completedBounties} 완료</span>
                  <span>•</span>
                  <span>{openBounties} 모집중</span>
                </div>
              </Card>

              {/* Total Commits */}
              <Card className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <GitBranch className="w-8 h-8 text-accent" />
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-4xl font-bold">{totalCommits.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground mt-1">총 커밋</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {totalTests.toLocaleString()} 테스트 케이스
                </div>
              </Card>

              {/* Contributors */}
              <Card className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Users className="w-8 h-8 text-green-600" />
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-4xl font-bold">{totalContributors}</div>
                  <div className="text-sm text-muted-foreground mt-1">기여자</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  주간 활동 {weeklyActivityCount}건
                </div>
              </Card>

              {/* Newsletter Subscribers */}
              <Card className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Mail className="w-8 h-8 text-primary" />
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-4xl font-bold">{newsletterStats?.confirmed || 0}</div>
                  <div className="text-sm text-muted-foreground mt-1">구독자</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{newsletterStats?.pending || 0} 대기</span>
                  <span>•</span>
                  <span>{newsletterStats?.total || 0} 전체</span>
                </div>
              </Card>
            </div>

            {/* Projects Overview */}
            <div className="grid lg:grid-cols-2 gap-8 mb-12">
              <Card className="glass-card p-8 space-y-6">
                <h2 className="text-2xl font-bold">프로젝트 현황</h2>
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div key={project.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{project.title}</span>
                        <span className="text-muted-foreground">{project.metrics.progress}%</span>
                      </div>
                      <Progress value={project.metrics.progress} className="h-1.5" />
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{project.metrics.commits} 커밋</span>
                        <span>•</span>
                        <span>{project.metrics.contributors} 기여자</span>
                        <span>•</span>
                        <span>{project.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="glass-card p-8 space-y-6">
                <h2 className="text-2xl font-bold">최근 활동</h2>
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="space-y-2 pb-4 border-b last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm flex-1">{activity.title}</h3>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(activity.created_at).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/70 line-clamp-2">{activity.content}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Activity Trend Chart */}
            <div className="mb-12">
              <ActivityTrendChart logs={logs} />
            </div>

            {/* Tech Stack Stats */}
            <Card className="glass-card p-8">
              <h2 className="text-2xl font-bold mb-6">기술 스택 사용 현황</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <h3 className="font-semibold text-muted-foreground text-sm uppercase">Frontend</h3>
                  <div className="space-y-2">
                    {["React", "TypeScript", "Vite", "Tailwind CSS"].map((tech) => (
                      <div key={tech} className="flex items-center justify-between text-sm">
                        <span>{tech}</span>
                        <span className="font-bold text-primary">{projects.filter(p =>
                          p.tech?.frontend?.includes(tech)
                        ).length}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold text-muted-foreground text-sm uppercase">Backend</h3>
                  <div className="space-y-2">
                    {["Supabase", "PostgreSQL", "Node.js"].map((tech) => (
                      <div key={tech} className="flex items-center justify-between text-sm">
                        <span>{tech}</span>
                        <span className="font-bold text-secondary">{projects.filter(p =>
                          p.tech?.backend?.includes(tech)
                        ).length}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold text-muted-foreground text-sm uppercase">Testing</h3>
                  <div className="space-y-2">
                    {["Playwright", "Vitest", "Lighthouse"].map((tech) => (
                      <div key={tech} className="flex items-center justify-between text-sm">
                        <span>{tech}</span>
                        <span className="font-bold text-accent">{projects.filter(p =>
                          p.tech?.testing?.includes(tech)
                        ).length}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 bg-gradient-to-r from-primary/10 to-secondary/10">
          <div className="container mx-auto max-w-4xl text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">함께 성장하고 싶으신가요?</h2>
            <p className="text-lg text-foreground/80">
              투명한 지표는 함께 만들어갈 때 더 의미있습니다.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                to="/lab"
                className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
                onClick={() => analytics.clickCTA("status_cta", "바운티 참여하기", "/lab")}
              >
                바운티 참여하기
              </Link>
              <Link
                to="/work-with-us"
                className="px-6 py-3 glass-card rounded-md hover:bg-muted/50 transition-colors font-semibold"
                onClick={() => analytics.clickCTA("status_cta", "협업 제안하기", "/work-with-us")}
              >
                협업 제안하기
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
};

export default Status;
