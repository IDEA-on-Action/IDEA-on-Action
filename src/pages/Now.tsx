import { Helmet } from "react-helmet-async";
import { Clock, FileText, Lightbulb, Rocket, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLogs } from "@/hooks/useLogs";
import { PageLayout, HeroSection, Section } from "@/components/layouts";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared";

const Now = () => {
  const { data: logsData, isLoading, error } = useLogs();

  const typeIcons = {
    release: Rocket,
    learning: Lightbulb,
    decision: TrendingUp
  };

  const typeLabels = {
    release: "릴리스",
    learning: "학습",
    decision: "의사결정"
  };

  const typeVariants: Record<string, "default" | "secondary" | "outline"> = {
    release: "default",
    learning: "secondary",
    decision: "outline"
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  const sortedLogs = logsData || [];

  return (
    <>
      <Helmet>
        <title>Now - 최근 활동 - IDEA on Action</title>
        <meta
          name="description"
          content="IDEA on Action의 최근 활동을 확인하세요. 릴리스, 학습, 의사결정 과정을 투명하게 공개합니다."
        />
        <meta property="og:title" content="Now - IDEA on Action" />
        <meta property="og:description" content="최근 활동을 투명하게 공개합니다" />
        <meta property="og:type" content="website" />
      </Helmet>

      <PageLayout>
        <HeroSection
          badge={{ icon: Clock, text: "실시간 업데이트" }}
          title="Now"
          description="지금 이 순간, 우리가 하고 있는 일들"
        />

        <Section maxWidth="4xl">
          {sortedLogs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="활동 내역이 없습니다"
              description="아직 등록된 활동이 없습니다."
            />
          ) : (
            <div className="space-y-6">
              {sortedLogs.map((log, index) => {
                const IconComponent = typeIcons[log.type as keyof typeof typeIcons] || FileText;

                return (
                  <Card
                    key={log.id}
                    className="glass-card p-6 hover-lift"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-xl font-bold flex-1">{log.title}</h3>
                          <Badge variant={typeVariants[log.type]}>
                            {typeLabels[log.type as keyof typeof typeLabels]}
                          </Badge>
                        </div>

                        <p className="text-foreground/80 leading-relaxed">
                          {log.content}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(log.created_at).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          {log.tags && log.tags.length > 0 && (
                            <>
                              <span>•</span>
                              <div className="flex flex-wrap gap-1">
                                {log.tags.map((tag, tagIndex) => (
                                  <Badge key={tagIndex} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Section>

        <Section variant="gradient" maxWidth="4xl">
          <div className="text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">주간 리캡 구독하기</h2>
            <p className="text-lg text-foreground/80">
              매주 일요일, 한 주간의 활동을 요약해서 보내드립니다.
            </p>
            <p className="text-sm text-muted-foreground">
              Sprint 2에서 Newsletter 기능이 추가됩니다.
            </p>
          </div>
        </Section>
      </PageLayout>
    </>
  );
};

export default Now;
