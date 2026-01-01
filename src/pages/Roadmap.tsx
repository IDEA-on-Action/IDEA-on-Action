import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, TrendingUp, Users, AlertCircle, FlaskConical, Briefcase, CheckCircle2, Target, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Timeline,
  TimelineItem,
  TimelineDot,
  TimelineContent,
} from "@/components/ui/timeline";
import { useRoadmap } from "@/hooks/projects/useRoadmap";
import { PageLayout, HeroSection, Section } from "@/components/layouts";
import { NextStepsCTA } from "@/components/common/NextStepsCTA";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared";
import { useIsAdmin } from "@/hooks/auth/useIsAdmin";
import { analytics } from "@/lib/analytics";
import {
  getUserFriendlyTheme,
  getKPIUserBenefits,
  getStabilityBadge,
  getProgressDescription,
  getRoadmapHighlights,
} from "@/lib/roadmap-transforms";

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
                {roadmapData.map((item, index) => (
                  <TabsTrigger
                    key={item.id ?? `quarter-tab-${index}`}
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

              {roadmapData.map((quarter, quarterIndex) => {
                const userFriendlyTheme = getUserFriendlyTheme(quarter.theme);
                const userBenefits = getKPIUserBenefits(quarter.kpis || {});
                const stabilityBadge = getStabilityBadge(quarter.risk_level);
                const progressDesc = getProgressDescription(quarter.progress);
                const highlights = getRoadmapHighlights(quarter);

                return (
                <TabsContent key={quarter.id ?? `quarter-panel-${quarterIndex}`} value={quarter.quarter} className="mt-8 space-y-8">
                  {/* Quarter Overview */}
                  <Card className="glass-card p-8">
                    <div className="space-y-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3 flex-1">
                          {/* User-friendly theme */}
                          <div className="space-y-1">
                            <h2 className="text-3xl font-bold">{userFriendlyTheme}</h2>
                            {userFriendlyTheme !== quarter.theme && (
                              <p className="text-sm text-muted-foreground">
                                {quarter.theme}
                              </p>
                            )}
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
                          {/* Stability Badge */}
                          <Badge variant={stabilityBadge.variant} className="whitespace-nowrap">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {stabilityBadge.label}
                          </Badge>
                          {quarter.owner && (
                            <Badge variant="outline">
                              <Users className="w-3 h-3 mr-1" />
                              {quarter.owner}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* User Benefits Section */}
                      {userBenefits.length > 0 && (
                        <div className="space-y-3 pt-4 border-t">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Target className="w-5 h-5 text-primary" />
                            사용자 혜택
                          </h3>
                          <ul className="grid md:grid-cols-2 gap-2">
                          {userBenefits.map((benefit, index) => (
                              <li key={`${quarter.id ?? `quarter-${quarterIndex}`}-benefit-${index}`} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Highlights */}
                      {highlights.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {highlights.map((highlight, index) => (
                            <Badge key={`${quarter.id ?? `quarter-${quarterIndex}`}-highlight-${index}`} variant="secondary">
                              {highlight}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold">전체 진행률</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{progressDesc}</span>
                            <span className="font-bold">{quarter.progress}%</span>
                          </div>
                        </div>
                        <Progress value={quarter.progress} className="h-2" />
                      </div>

                      {/* Collapsible Technical Details */}
                      {quarter.kpis && Object.keys(quarter.kpis).length > 0 && (
                        <Accordion type="single" collapsible className="pt-2">
                          <AccordionItem value="tech-details" className="border-none">
                            <AccordionTrigger className="text-sm text-muted-foreground hover:text-foreground">
                              기술 상세 보기 (KPIs)
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                                {Object.entries(quarter.kpis).map(([key, value]) => (
                                  <div key={`${quarter.id ?? `quarter-${quarterIndex}`}-kpi-${key}`} className="space-y-1">
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
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>
                  </Card>

                  {/* Milestones Timeline */}
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                      <TrendingUp className="w-6 h-6 text-primary" />
                      마일스톤
                    </h3>

                    {quarter.milestones && quarter.milestones.length > 0 ? (
                      <Card className="glass-card p-8">
                        <Timeline>
                          {quarter.milestones.map((milestone, milestoneIndex) => (
                            <TimelineItem
                              key={milestone.id ?? `${quarter.id ?? `quarter-${quarterIndex}`}-milestone-${milestoneIndex}`}
                              status={milestone.status}
                              isLast={milestoneIndex === quarter.milestones!.length - 1}
                            >
                              <TimelineDot status={milestone.status}>
                                {milestone.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                                {milestone.status === 'in-progress' && <Clock className="w-4 h-4 animate-pulse" />}
                                {milestone.status === 'planned' && <Calendar className="w-4 h-4" />}
                              </TimelineDot>
                              <TimelineContent
                                date={milestone.dueDate}
                                title={milestone.title}
                              >
                                <div className="flex items-center gap-2 mb-3">
                                  <Badge variant={getStatusBadgeVariant(milestone.status)}>
                                    {getStatusLabel(milestone.status)}
                                  </Badge>
                                </div>
                                {milestone.tasks && milestone.tasks.length > 0 && (
                                  <ul className="space-y-2">
                                    {milestone.tasks.map((task, taskIndex) => (
                                      <li
                                        key={`${milestone.id ?? `${quarter.id ?? `quarter-${quarterIndex}`}-milestone-${milestoneIndex}`}-task-${taskIndex}`}
                                        className="text-sm text-foreground/70 flex items-start gap-2"
                                      >
                                        <span className="text-primary mt-1">•</span>
                                        <span>{task}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </TimelineContent>
                            </TimelineItem>
                          ))}
                        </Timeline>
                      </Card>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        등록된 마일스톤이 없습니다.
                      </div>
                    )}
                  </div>
                </TabsContent>
              );
            })}
            </Tabs>
        </Section>

        <NextStepsCTA
          title="함께 만들어가고 싶으신가요?"
          description="로드맵의 일부가 되어 함께 성장하세요"
          primaryCTA={{
            label: "바운티 참여하기",
            href: "/lab",
            icon: FlaskConical,
            description: "실제 프로젝트에 기여하고 보상을 받으세요"
          }}
          secondaryCTA={{
            label: "결과물 보기",
            href: "/portfolio",
            icon: Briefcase,
            variant: "outline",
            description: "완성된 프로젝트와 성과를 확인하세요"
          }}
          variant="gradient"
        />
      </PageLayout>
    </>
  );
};

export default Roadmap;

