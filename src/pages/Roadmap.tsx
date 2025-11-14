import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, TrendingUp, Users, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRoadmap } from "@/hooks/useRoadmap";
import { PageLayout, HeroSection, Section } from "@/components/layouts";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { analytics } from "@/lib/analytics";

const Roadmap = () => {
  const { data: roadmapData, isLoading, error } = useRoadmap();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const [selectedQuarter, setSelectedQuarter] = useState("");
  const navigate = useNavigate();

  // Set initial selected quarter when data loads
  useEffect(() => {
    if (roadmapData && roadmapData.length > 0 && !selectedQuarter) {
      setSelectedQuarter(roadmapData[0].quarter);
    }
  }, [roadmapData, selectedQuarter]);

  // GA4: 로드맵 조회 이벤트
  useEffect(() => {
    if (roadmapData && roadmapData.length > 0 && selectedQuarter) {
      const currentQuarter = roadmapData.find(q => q.quarter === selectedQuarter);
      analytics.viewRoadmap(selectedQuarter, currentQuarter?.theme);
    }
  }, [roadmapData, selectedQuarter]);

  const getRiskBadgeVariant = (riskLevel?: string) => {
    if (!riskLevel) return "secondary";
    if (riskLevel === "high") return "destructive";
    if (riskLevel === "medium") return "default";
    return "secondary";
  };

  const getRiskLabel = (riskLevel?: string) => {
    if (!riskLevel) return "낮음";
    if (riskLevel === "high") return "높음";
    if (riskLevel === "medium") return "중간";
    return "낮음";
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in-progress":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "완료";
      case "in-progress":
        return "진행중";
      default:
        return "예정";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <PageLayout>
        <LoadingState />
      </PageLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <PageLayout>
        <ErrorState error={error} />
      </PageLayout>
    );
  }

  // No data state
  if (!roadmapData || roadmapData.length === 0) {
    // 관리자 확인이 완료될 때까지 기다림 (로딩 중이면 버튼을 표시하지 않음)
    const showAdminButton = !isAdminLoading && isAdmin === true;

    return (
      <PageLayout>
        <HeroSection
          badge={{ icon: Calendar, text: "Roadmap" }}
          title="로드맵"
          description="분기별 목표와 진행 상황을 투명하게 공개합니다"
        />
        <Section>
          <EmptyState
            icon={Calendar}
            title="로드맵 없음"
            description={
              showAdminButton
                ? "아직 등록된 로드맵이 없습니다. 관리자 페이지에서 로드맵을 등록할 수 있습니다."
                : "아직 등록된 로드맵이 없습니다. 로드맵은 관리자에 의해 등록됩니다."
            }
            action={
              showAdminButton
                ? {
                    label: "관리자 페이지로 이동",
                    onClick: () => navigate("/admin"),
                  }
                : undefined
            }
          />
        </Section>
      </PageLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>로드맵 - IDEA on Action</title>
        <meta
          name="description"
          content="IDEA on Action의 분기별 목표와 진행 상황을 확인하세요. 투명하게 공개되는 로드맵으로 함께 성장합니다."
        />
        <meta property="og:title" content="로드맵 - IDEA on Action" />
        <meta property="og:description" content="분기별 목표와 진행 상황을 투명하게 공개합니다" />
        <meta property="og:type" content="website" />
      </Helmet>

      <PageLayout>
        <HeroSection
          badge={{ icon: Calendar, text: "Roadmap 2025-2026" }}
          title="우리의 여정"
          description="투명하게 공개되는 로드맵으로 함께 성장합니다"
        />

        {/* Roadmap Tabs */}
        <Section>
            <Tabs value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2 bg-transparent h-auto">
                {roadmapData.map((item) => (
                  <TabsTrigger
                    key={item.id}
                    value={item.quarter}
                    className="glass-card data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <div className="text-center">
                      <div className="font-bold">{item.quarter}</div>
                      <div className="text-xs opacity-80">{item.progress}%</div>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>

              {roadmapData.map((quarter) => (
                <TabsContent key={quarter.id} value={quarter.quarter} className="mt-8 space-y-8">
                  {/* Quarter Overview */}
                  <Card className="glass-card p-8">
                    <div className="space-y-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h2 className="text-3xl font-bold">{quarter.theme}</h2>
                          </div>
                          <p className="text-muted-foreground">
                            {quarter.start_date && quarter.end_date
                              ? `${new Date(quarter.start_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })} - ${new Date(quarter.end_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}`
                              : quarter.quarter}
                          </p>
                          <p className="text-foreground/80 leading-relaxed">
                            {quarter.description || ''}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {quarter.risk_level && (
                            <Badge variant={getRiskBadgeVariant(quarter.risk_level)}>
                              <AlertCircle className="w-3 h-3 mr-1" />
                              리스크: {getRiskLabel(quarter.risk_level)}
                            </Badge>
                          )}
                          {quarter.owner && (
                            <Badge variant="outline">
                              <Users className="w-3 h-3 mr-1" />
                              {quarter.owner}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold">전체 진행률</span>
                          <span className="text-muted-foreground">{quarter.progress}%</span>
                        </div>
                        <Progress value={quarter.progress} className="h-2" />
                      </div>

                      {/* KPIs */}
                      {quarter.kpis && Object.keys(quarter.kpis).length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                          {Object.entries(quarter.kpis).map(([key, value]) => (
                            <div key={key} className="space-y-1">
                              <p className="text-xs text-muted-foreground uppercase">
                                {key}
                              </p>
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold">
                                  {typeof value === 'object' && value !== null && 'current' in value
                                    ? (value as { current: number }).current
                                    : typeof value === 'number' ? value : String(value)}
                                </span>
                                {typeof value === 'object' && value !== null && 'target' in value && (
                                  <span className="text-sm text-muted-foreground">
                                    / {(value as { target: number }).target}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Milestones */}
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                      <TrendingUp className="w-6 h-6 text-primary" />
                      마일스톤
                    </h3>

                    <div className="grid md:grid-cols-3 gap-6">
                      {quarter.milestones && quarter.milestones.length > 0 ? (
                        quarter.milestones.map((milestone) => (
                        <Card
                          key={milestone.id}
                          className="glass-card p-6 space-y-4 hover-lift"
                        >
                          <div className="flex items-start justify-between">
                            <h4 className="text-lg font-bold">{milestone.title}</h4>
                            <Badge variant={getStatusBadgeVariant(milestone.status)}>
                              {getStatusLabel(milestone.status)}
                            </Badge>
                          </div>

                          {milestone.dueDate && (
                            <div className="text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4 inline mr-1" />
                              {new Date(milestone.dueDate).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          )}

                          {milestone.tasks && milestone.tasks.length > 0 && (
                            <ul className="space-y-2">
                              {milestone.tasks.map((task, index) => (
                                <li
                                  key={index}
                                  className="text-sm text-foreground/70 flex items-start gap-2"
                                >
                                  <span className="text-primary mt-1">•</span>
                                  <span>{task}</span>
                                </li>
                            ))}
                          </ul>
                          )}
                        </Card>
                        ))
                      ) : (
                        <div className="col-span-full text-center py-8 text-muted-foreground">
                          등록된 마일스톤이 없습니다.
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
        </Section>

        {/* CTA Section */}
        <Section variant="gradient" maxWidth="4xl">
          <div className="text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">함께 만들어가고 싶으신가요?</h2>
            <p className="text-lg text-foreground/80">
              로드맵의 일부가 되어 함께 성장하세요.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button asChild>
                <Link to="/lab">바운티 참여하기</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/portfolio">프로젝트 보기</Link>
              </Button>
            </div>
          </div>
        </Section>
      </PageLayout>
    </>
  );
};

export default Roadmap;

