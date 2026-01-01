import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import {
  Sparkles,
  Rocket,
  Code,
  Zap,
  ArrowRight,
  TrendingUp,
  Briefcase,
  Layers,
  Search,
  FileText,
  Wrench,
  Settings,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLogs } from "@/hooks/analytics/useLogs";
import { useProjects } from "@/hooks/projects/useProjects";
import { useBlogPosts } from "@/hooks/cms/useBlogPosts";
import { Link } from "react-router-dom";
import { analytics } from "@/lib/analytics";
import { generateOrganizationSchema, generateWebSiteSchema, injectJsonLd } from "@/lib/json-ld";

// 서비스 카테고리 데이터
const SERVICE_CATEGORIES = [
  {
    id: "development",
    title: "Development Services",
    description: "프로젝트 기반 개발 서비스",
    icon: Briefcase,
    services: ["MVP 개발", "풀스택 개발", "디자인 시스템", "운영 관리"],
    href: "/services",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    id: "minu",
    title: "Minu Platform",
    description: "SaaS 기반 프로젝트 관리",
    icon: Layers,
    services: [
      { name: "Minu Find", icon: Search, desc: "사업기회 탐색" },
      { name: "Minu Frame", icon: FileText, desc: "문제정의 & RFP" },
      { name: "Minu Build", icon: Wrench, desc: "프로젝트 진행" },
      { name: "Minu Keep", icon: Settings, desc: "운영/유지보수" },
    ],
    href: "/services/minu-find",
    gradient: "from-violet-500/20 to-purple-500/20",
  },
];

const Index = () => {
  // Version 2.0 데이터 훅
  const { data: logs } = useLogs();
  const { data: projects } = useProjects();
  const { data: blogPosts } = useBlogPosts({
    filters: { status: 'published' },
    limit: 3,
    sortBy: 'published_at',
    sortOrder: 'desc',
  });

  // GA4: 홈 페이지 조회 이벤트
  useEffect(() => {
    analytics.viewHome();
  }, []);

  // 최근 로그 3개
  const recentLogs = logs?.slice(0, 3) || [];

  // 추천 프로젝트 3개 (진행 중 + 출시된 프로젝트 우선)
  const highlightProjects = projects
    ?.filter(p => p.status === 'in-progress' || p.status === 'launched')
    ?.slice(0, 3) || [];

  // 최신 업데이트: 블로그 포스트 또는 로그
  const latestUpdates = blogPosts && blogPosts.length > 0
    ? blogPosts.map(post => ({
        id: post.id,
        type: 'blog' as const,
        title: post.title,
        excerpt: post.excerpt || '',
        date: post.published_at || post.created_at,
        href: `/blog/${post.slug}`,
      }))
    : recentLogs.map(log => ({
        id: log.id,
        type: log.type as 'release' | 'learning' | 'decision',
        title: log.title,
        excerpt: log.content,
        date: log.created_at,
        href: '/now',
      }));

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'release': return <Rocket className="w-5 h-5" />;
      case 'learning': return <Code className="w-5 h-5" />;
      case 'decision': return <Zap className="w-5 h-5" />;
      case 'blog': return <FileText className="w-5 h-5" />;
      default: return <Sparkles className="w-5 h-5" />;
    }
  };

  const getLogBadgeVariant = (type: string) => {
    switch (type) {
      case 'release': return 'default';
      case 'learning': return 'secondary';
      case 'decision': return 'outline';
      case 'blog': return 'default';
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'release': return '릴리스';
      case 'learning': return '학습';
      case 'decision': return '결정';
      case 'blog': return '블로그';
      default: return '소식';
    }
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

        {/* JSON-LD Structured Data - Organization */}
        <script type="application/ld+json">
          {injectJsonLd(generateOrganizationSchema())}
        </script>

        {/* JSON-LD Structured Data - WebSite */}
        <script type="application/ld+json">
          {injectJsonLd(generateWebSiteSchema())}
        </script>
      </Helmet>
      <Header />
      <main id="main-content" tabIndex={-1}>
        {/* 1. Hero Section */}
        <Hero />

        {/* 2. What We Do - 서비스 요약 */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-4">
                <Briefcase className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">What We Do</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                아이디어를 현실로 만드는 <span className="bg-gradient-primary bg-clip-text text-transparent">두 가지 방법</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                프로젝트 기반 개발 서비스와 SaaS 플랫폼으로 다양한 니즈에 대응합니다
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {SERVICE_CATEGORIES.map((category) => {
                const Icon = category.icon;
                return (
                  <Card
                    key={category.id}
                    className={`glass-card p-8 hover-lift relative overflow-hidden group`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className="relative z-10">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold mb-1">{category.title}</h3>
                          <p className="text-muted-foreground">{category.description}</p>
                        </div>
                      </div>

                      {category.id === "development" ? (
                        <div className="flex flex-wrap gap-2 mb-6">
                          {category.services.map((service) => (
                            <Badge key={service as string} variant="secondary" className="text-sm">
                              {service as string}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          {(category.services as Array<{ name: string; icon: typeof Search; desc: string }>).map((service) => {
                            const ServiceIcon = service.icon;
                            return (
                              <div
                                key={service.name}
                                className="flex items-center gap-2 p-2 rounded-lg bg-background/50"
                              >
                                <ServiceIcon className="w-4 h-4 text-primary" />
                                <div>
                                  <div className="text-sm font-medium">{service.name}</div>
                                  <div className="text-xs text-muted-foreground">{service.desc}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <Link to={category.href}>
                        <Button variant="outline" className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          자세히 보기
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="text-center mt-8">
              <Link to="/services">
                <Button variant="ghost" className="gap-2">
                  모든 서비스 보기
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* 3. What We're Building - 진행중 프로젝트 */}
        {highlightProjects.length > 0 && (
          <section className="py-20 px-4 bg-muted/50">
            <div className="container mx-auto max-w-6xl">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-4">
                  <Code className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">What We're Building</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  현재 진행 중인 <span className="bg-gradient-primary bg-clip-text text-transparent">프로젝트</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  아이디어부터 출시까지, 전 과정을 투명하게 공개합니다
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
                      </div>
                      <h3 className="text-xl font-bold mb-2 line-clamp-2">{project.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{project.summary}</p>

                      {/* Progress Bar */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">진행률</span>
                          <span className="font-semibold text-primary">{project.metrics.progress}%</span>
                        </div>
                        <Progress
                          value={project.metrics.progress}
                          className="h-2"
                          aria-label={`프로젝트 진행률 ${project.metrics.progress}%`}
                        />
                      </div>

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
                    모든 프로젝트 보기
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* 4. Latest Updates - 최신 소식 */}
        {latestUpdates.length > 0 && (
          <section className="py-20 px-4">
            <div className="container mx-auto max-w-6xl">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-4">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Latest Updates</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  최신 <span className="bg-gradient-primary bg-clip-text text-transparent">소식</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  프로젝트 진행 상황과 새로운 이야기를 확인하세요
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3 mb-8">
                {latestUpdates.map((update) => (
                  <Link key={update.id} to={update.href}>
                    <Card className="glass-card p-6 hover-lift h-full">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          {getLogIcon(update.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={getLogBadgeVariant(update.type)}>
                              {getTypeLabel(update.type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(update.date).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                          <h3 className="font-semibold mb-2 line-clamp-2">{update.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{update.excerpt}</p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>

              <div className="text-center">
                <Link to={blogPosts && blogPosts.length > 0 ? "/blog" : "/now"}>
                  <Button variant="outline" className="gap-2">
                    더 많은 이야기
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* 5. Contact Section */}
        <Contact />

        {/* 6. Newsletter CTA Section */}
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
