import { Helmet } from "react-helmet-async";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, GitBranch, Users, Home } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePortfolioItemBySlug } from "@/hooks/cms/usePortfolioItems";

/**
 * PortfolioDetail - 포트폴리오 상세 페이지
 *
 * /projects/:slug 라우트에서 사용
 * portfolio_items 테이블의 PortfolioItem 데이터를 표시
 */
const PortfolioDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: item, isLoading, error } = usePortfolioItemBySlug(slug || '');

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
  if (error || !item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="glass-card p-12 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">프로젝트를 찾을 수 없습니다</h2>
          <p className="text-muted-foreground mb-6">
            요청하신 프로젝트가 존재하지 않거나 삭제되었습니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/projects"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              프로젝트로 돌아가기
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

  // 프로젝트 타입 라벨
  const projectTypeLabels: Record<string, string> = {
    mvp: "MVP",
    fullstack: "풀스택",
    design: "디자인",
    operations: "운영",
  };

  return (
    <>
      <Helmet>
        <title>{item.title} - Portfolio - IDEA on Action</title>
        <meta name="description" content={item.summary} />
        <meta property="og:title" content={`${item.title} - IDEA on Action`} />
        <meta property="og:description" content={item.summary} />
        <meta property="og:type" content="article" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <section className="relative py-12 px-4 border-b">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center gap-3 mb-6">
              <Link
                to="/projects"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                프로젝트로 돌아가기
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
                  <h1 className="text-4xl md:text-5xl font-bold">{item.title}</h1>
                  <p className="text-xl text-muted-foreground">{item.summary}</p>
                </div>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {projectTypeLabels[item.project_type] || item.project_type}
                </Badge>
              </div>

              {/* Quick Links */}
              <div className="flex flex-wrap items-center gap-3">
                {item.github_url && (
                  <a
                    href={item.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 glass-card rounded-md hover:bg-muted/50 transition-colors text-sm font-semibold"
                  >
                    <GitBranch className="w-4 h-4" />
                    GitHub
                  </a>
                )}
                {item.project_url && (
                  <a
                    href={item.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-semibold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Live Demo
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
                    {item.description || item.summary}
                  </p>
                </Card>

                {/* Tech Stack */}
                {item.tech_stack && item.tech_stack.length > 0 && (
                  <Card className="glass-card p-8">
                    <h2 className="text-2xl font-bold mb-6">기술 스택</h2>
                    <div className="flex flex-wrap gap-2">
                      {item.tech_stack.map((tech, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-6">
                {/* Project Info */}
                <Card className="glass-card p-6 space-y-4">
                  <h3 className="text-xl font-bold">프로젝트 정보</h3>

                  {item.client_name && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">클라이언트</span>
                      </div>
                      <span className="font-semibold">{item.client_name}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">프로젝트 타입</span>
                    <Badge variant="outline">
                      {projectTypeLabels[item.project_type] || item.project_type}
                    </Badge>
                  </div>

                  {item.featured && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">상태</span>
                      <Badge variant="default">Featured</Badge>
                    </div>
                  )}
                </Card>

                {/* Images */}
                {item.images && item.images.length > 0 && (
                  <Card className="glass-card p-6 space-y-4">
                    <h3 className="text-xl font-bold">갤러리</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {item.images.slice(0, 4).map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`${item.title} 이미지 ${index + 1}`}
                          className="w-full h-24 object-cover rounded-md"
                        />
                      ))}
                    </div>
                  </Card>
                )}
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
            <Link
              to="/connect/inquiry"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
            >
              프로젝트 제안하기
            </Link>
          </div>
        </section>
      </div>
    </>
  );
};

export default PortfolioDetail;
