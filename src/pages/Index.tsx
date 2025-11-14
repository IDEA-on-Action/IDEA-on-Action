import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Features from "@/components/Features";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { Sparkles, Rocket, Target, Code, Zap, ArrowRight, Calendar, TrendingUp, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLogs } from "@/hooks/useLogs";
import { useRoadmap } from "@/hooks/useRoadmap";
import { useProjects } from "@/hooks/useProjects";
import { useBounties } from "@/hooks/useBounties";
import { Link } from "react-router-dom";
import { analytics } from "@/lib/analytics";

const Index = () => {
  // Version 2.0 데이터 훅
  const { data: logs } = useLogs();
  const { data: roadmapData } = useRoadmap();
  const { data: projects } = useProjects();
  const { data: bounties } = useBounties();

  // GA4: 홈 페이지 조회 이벤트
  useEffect(() => {
    analytics.viewHome();
  }, []);

  // 최근 로그 3개
  const recentLogs = logs?.slice(0, 3) || [];

  // 현재 분기 로드맵 (첫 번째 항목)
  const currentRoadmap = roadmapData?.[0];

  // 추천 프로젝트 3개 (진행 중 + 출시된 프로젝트 우선)
  const highlightProjects = projects
    ?.filter(p => p.status === 'in-progress' || p.status === 'launched')
    ?.slice(0, 3) || [];

  // 활성 바운티 3개 (open 상태만)
  const openBounties = bounties
    ?.filter(b => b.status === 'open')
    ?.slice(0, 3) || [];

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'release': return <Rocket className="w-5 h-5" />;
      case 'learning': return <Code className="w-5 h-5" />;
      case 'decision': return <Zap className="w-5 h-5" />;
      default: return <Sparkles className="w-5 h-5" />;
    }
  };

  const getLogBadgeVariant = (type: string) => {
    switch (type) {
      case 'release': return 'default';
      case 'learning': return 'secondary';
      case 'decision': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'in-progress': return 'secondary';
      case 'launched': return 'default';
      case 'validate': return 'outline';
      default: return 'outline';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  return (
    <div className="min-h-screen gradient-bg text-foreground">
      <Helmet>
        <title>IDEA on Action - 아이디어 실험실 & 커뮤니티형 프로덕트 스튜디오</title>
        <meta
          name="description"
          content="생각을 멈추지 않고, 행동으로 옮기는 회사. 아이디어 실험실이자 커뮤니티형 프로덕트 스튜디오로, 투명한 개발 과정과 커뮤니티 참여를 통해 혁신적인 프로젝트를 만들어갑니다."
        />
        <meta name="keywords" content="아이디어 실험실, 프로덕트 스튜디오, 커뮤니티, 오픈 소스, 투명한 개발, 로드맵, 포트폴리오, 바운티, IDEA on Action" />

        {/* Open Graph */}
        <meta property="og:title" content="IDEA on Action - 아이디어 실험실 & 커뮤니티형 프로덕트 스튜디오" />
        <meta property="og:description" content="투명한 개발 과정과 커뮤니티 참여를 통해 혁신적인 프로젝트를 만들어갑니다" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.ideaonaction.ai/" />
        <meta property="og:image" content="https://www.ideaonaction.ai/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="IDEA on Action - 아이디어 실험실" />
        <meta name="twitter:description" content="투명한 개발 과정과 커뮤니티 참여를 통해 혁신적인 프로젝트를 만들어갑니다" />
        <meta name="twitter:image" content="https://www.ideaonaction.ai/og-image.png" />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "IDEA on Action",
            "alternateName": "생각과행동",
            "url": "https://www.ideaonaction.ai",
            "logo": "https://www.ideaonaction.ai/logo-full.png",
            "description": "아이디어 실험실이자 커뮤니티형 프로덕트 스튜디오",
            "founder": {
              "@type": "Person",
              "name": "서민원",
              "jobTitle": "대표"
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "email": "sinclairseo@gmail.com",
              "contactType": "customer service"
            },
            "sameAs": [
              "https://github.com/IDEA-on-Action"
            ]
          })}
        </script>
      </Helmet>
      <Header />
      <main>
        <Hero />

        {/* Now Highlight - 최근 활동 */}
        {recentLogs.length > 0 && (
          <section className="py-20 px-4">
            <div className="container mx-auto max-w-6xl">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-4">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">최근 활동</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  지금 이 순간, 우리가 하고 있는 일들
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  실시간으로 업데이트되는 프로젝트 활동을 확인하세요
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3 mb-8">
                {recentLogs.map((log) => (
                  <Card key={log.id} className="glass-card p-6 hover-lift">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {getLogIcon(log.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getLogBadgeVariant(log.type)}>
                            {log.type === 'release' ? '릴리스' : log.type === 'learning' ? '학습' : '결정'}
                          </Badge>
                        </div>
                        <h3 className="font-semibold mb-2 line-clamp-2">{log.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{log.content}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="text-center">
                <Link to="/now">
                  <Button variant="outline" className="gap-2">
                    모든 활동 보기
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Roadmap Progress - 현재 분기 */}
        {currentRoadmap && (
          <section className="py-20 px-4 bg-muted/50">
            <div className="container mx-auto max-w-4xl">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-4">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">로드맵</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  우리의 여정
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  투명하게 공개되는 로드맵으로 함께 성장합니다
                </p>
              </div>

              <Card className="glass-card p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{currentRoadmap.quarter}</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{currentRoadmap.theme}</h3>
                    {currentRoadmap.description && (
                      <p className="text-muted-foreground">{currentRoadmap.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-primary">{currentRoadmap.progress}%</div>
                    <div className="text-sm text-muted-foreground">진행률</div>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">전체 진행률</span>
                    <span className="font-semibold">{currentRoadmap.progress}%</span>
                  </div>
                  <Progress value={currentRoadmap.progress} className="h-2" />
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-4">
                    {currentRoadmap.owner && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">담당자:</span>
                        <span className="text-sm font-medium">{currentRoadmap.owner}</span>
                      </div>
                    )}
                    {currentRoadmap.risk_level && (
                      <Badge variant={currentRoadmap.risk_level === 'high' ? 'destructive' : 'secondary'}>
                        위험도: {currentRoadmap.risk_level === 'high' ? '높음' : currentRoadmap.risk_level === 'medium' ? '중간' : '낮음'}
                      </Badge>
                    )}
                  </div>
                  <Link to="/roadmap">
                    <Button variant="outline" size="sm" className="gap-2">
                      자세히 보기
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </section>
        )}

        {/* Portfolio Highlight - 추천 프로젝트 */}
        {highlightProjects.length > 0 && (
          <section className="py-20 px-4">
            <div className="container mx-auto max-w-6xl">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-4">
                  <Code className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">포트폴리오</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  아이디어부터 출시까지, 전 과정을 투명하게 공개합니다
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  현재 진행 중인 프로젝트와 결과물을 확인하세요
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3 mb-8">
                {highlightProjects.map((project) => (
                  <Link key={project.id} to={`/portfolio/${project.slug}`}>
                    <Card className="glass-card p-6 hover-lift h-full">
                      <div className="flex items-start justify-between mb-4">
                        <Badge variant={getStatusBadgeVariant(project.status)}>
                          {project.status === 'in-progress' ? '진행중' : '출시'}
                        </Badge>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">{project.metrics.progress}%</div>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-2 line-clamp-2">{project.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{project.summary}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-4">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          <span>{project.metrics.contributors} 기여자</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Code className="w-4 h-4" />
                          <span>{project.metrics.commits} 커밋</span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>

              <div className="text-center">
                <Link to="/portfolio">
                  <Button variant="outline" className="gap-2">
                    전체 포트폴리오 보기
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Open Bounty - 활성 바운티 */}
        {openBounties.length > 0 && (
          <section className="py-20 px-4 bg-muted/50">
            <div className="container mx-auto max-w-6xl">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-4">
                  <Award className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">바운티</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  함께 만들어가고 싶으신가요?
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  아이디어를 실험하고, 보상을 받으며 성장하세요
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3 mb-8">
                {openBounties.map((bounty) => (
                  <Card key={bounty.id} className="glass-card p-6 hover-lift">
                    <div className="flex items-start justify-between mb-4">
                      <Badge variant="secondary">모집중</Badge>
                      <div className="text-right">
                        <div className="text-xl font-bold text-primary">{formatCurrency(bounty.reward)}</div>
                        <div className="text-xs text-muted-foreground">보상</div>
                      </div>
                    </div>
                    <h3 className="font-bold mb-2 line-clamp-2">{bounty.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{bounty.description}</p>
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">{bounty.difficulty}</Badge>
                        {bounty.estimated_hours && (
                          <span className="text-muted-foreground">~{bounty.estimated_hours}시간</span>
                        )}
                      </div>
                      {bounty.deadline && (
                        <span className="text-sm text-muted-foreground">
                          {new Date(bounty.deadline).toLocaleDateString('ko-KR')}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              <div className="text-center">
                <Link to="/lab">
                  <Button variant="outline" className="gap-2">
                    모든 바운티 보기
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        <Services />
        <Features />
        <About />
        <Contact />

        {/* Newsletter CTA Section */}
        <section className="py-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10"></div>
          <div className="container mx-auto max-w-4xl relative">
            <div className="glass-card p-8 md:p-12 text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Stay Connected</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                최신 소식을 받아보세요
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                새로운 프로젝트, 인사이트, 그리고 업데이트를 가장 먼저 확인하세요.
              </p>
              <div className="flex justify-center pt-4">
                <NewsletterForm
                  variant="inline"
                  placeholder="이메일 주소"
                  buttonText="구독"
                  location="home_inline"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                언제든지 구독을 취소할 수 있습니다. 개인정보는 안전하게 보호됩니다.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
