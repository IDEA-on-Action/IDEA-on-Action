import { useState, useMemo, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Briefcase,
  Rocket,
  FlaskConical,
  Calendar,
  Search,
  TrendingUp,
  Users,
  ExternalLink,
  Github,
  Clock,
  Target,
  DollarSign,
  X,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PageLayout, HeroSection, Section } from "@/components/layouts";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared";
import { usePublishedPortfolioItems } from '@/hooks/cms/usePortfolioItems';
import { useBounties } from "@/hooks/projects/useBounties";
import { usePublishedRoadmapItems } from "@/hooks/projects/useRoadmapItems";
import { useDebounce } from "@/hooks/useDebounce";
import type { PortfolioItem, Bounty, RoadmapItem } from '@/types/shared/v2';

type TabValue = "in-progress" | "released" | "lab" | "roadmap";

const TAB_CONFIG = {
  "in-progress": { label: "진행중", icon: TrendingUp },
  released: { label: "출시됨", icon: Rocket },
  lab: { label: "실험중", icon: FlaskConical },
  roadmap: { label: "로드맵", icon: Calendar },
} as const;

export default function ProjectsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabValue) || "in-progress";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Data fetching hooks
  const {
    data: portfolioItems,
    isLoading: isPortfolioLoading,
    error: portfolioError,
  } = usePublishedPortfolioItems();
  const { data: bounties, isLoading: isBountiesLoading, error: bountiesError } = useBounties();
  const {
    data: roadmapItems,
    isLoading: isRoadmapLoading,
    error: roadmapError,
  } = usePublishedRoadmapItems();

  // Derived data
  const inProgressItems = useMemo(() => {
    return (portfolioItems || []).filter(
      (item) => item.project_type === "mvp" || item.project_type === "fullstack"
    );
  }, [portfolioItems]);

  const releasedItems = useMemo(() => {
    return (portfolioItems || []).filter((item) => item.published && item.end_date);
  }, [portfolioItems]);

  const openBounties = useMemo(() => {
    return (bounties || []).filter((b) => b.status === "open" || b.status === "assigned");
  }, [bounties]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    (portfolioItems || []).forEach((item) => {
      item.tech_stack?.forEach((tag) => tags.add(tag));
    });
    (bounties || []).forEach((bounty) => {
      bounty.skills_required?.forEach((skill) => tags.add(skill));
    });
    (roadmapItems || []).forEach((item) => {
      item.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).slice(0, 15);
  }, [portfolioItems, bounties, roadmapItems]);

  // Filter function
  const filterItems = useCallback(
    <T extends { title: string }>(
      items: T[],
      getSearchableText: (item: T) => string,
      getItemTags: (item: T) => string[]
    ): T[] => {
      return items.filter((item) => {
        const matchesSearch =
          !debouncedSearch ||
          getSearchableText(item).toLowerCase().includes(debouncedSearch.toLowerCase());
        const matchesTag = !selectedTag || getItemTags(item).includes(selectedTag);
        return matchesSearch && matchesTag;
      });
    },
    [debouncedSearch, selectedTag]
  );

  // Filtered data
  const filteredInProgress = useMemo(
    () =>
      filterItems(
        inProgressItems,
        (item) => `${item.title} ${item.summary} ${item.tech_stack?.join(" ")}`,
        (item) => item.tech_stack || []
      ),
    [filterItems, inProgressItems]
  );

  const filteredReleased = useMemo(
    () =>
      filterItems(
        releasedItems,
        (item) => `${item.title} ${item.summary} ${item.tech_stack?.join(" ")}`,
        (item) => item.tech_stack || []
      ),
    [filterItems, releasedItems]
  );

  const filteredBounties = useMemo(
    () =>
      filterItems(
        openBounties,
        (item) => `${item.title} ${item.description} ${item.skills_required?.join(" ")}`,
        (item) => item.skills_required || []
      ),
    [filterItems, openBounties]
  );

  const filteredRoadmap = useMemo(
    () =>
      filterItems(
        roadmapItems || [],
        (item) => `${item.title} ${item.description} ${item.tags?.join(" ")}`,
        (item) => item.tags || []
      ),
    [filterItems, roadmapItems]
  );

  // Statistics
  const stats = useMemo(
    () => ({
      total: (portfolioItems?.length || 0) + (bounties?.length || 0) + (roadmapItems?.length || 0),
      inProgress: inProgressItems.length,
      released: releasedItems.length,
      lab: openBounties.length,
      roadmap: (roadmapItems || []).filter((r) => r.status === "planned" || r.status === "in-progress")
        .length,
    }),
    [portfolioItems, bounties, roadmapItems, inProgressItems, releasedItems, openBounties]
  );

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
    setSelectedTag(null);
    setSearchQuery("");
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? null : tag);
  };

  // Loading state
  const isLoading = isPortfolioLoading || isBountiesLoading || isRoadmapLoading;
  const error = portfolioError || bountiesError || roadmapError;

  if (isLoading) {
    return (
      <PageLayout>
        <LoadingState />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <ErrorState error={error} />
      </PageLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>프로젝트 - IDEA on Action</title>
        <meta
          name="description"
          content="IDEA on Action에서 진행하는 프로젝트들을 둘러보세요. 진행중, 출시됨, 실험중, 로드맵을 한눈에 확인할 수 있습니다."
        />
        <meta property="og:title" content="프로젝트 - IDEA on Action" />
        <meta property="og:description" content="우리가 만들고 있는 것들" />
        <meta property="og:type" content="website" />
      </Helmet>

      <PageLayout>
        <HeroSection
          badge={{ icon: Briefcase, text: `${stats.total}개 항목` }}
          title="프로젝트"
          description="우리가 만들고 있는 것들"
        />

        {/* Statistics Section */}
        <Section variant="muted" className="py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="glass-card p-4 text-center">
              <div className="text-3xl font-bold text-secondary">{stats.inProgress}</div>
              <div className="text-sm text-muted-foreground mt-1">진행중</div>
            </Card>
            <Card className="glass-card p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.released}</div>
              <div className="text-sm text-muted-foreground mt-1">출시됨</div>
            </Card>
            <Card className="glass-card p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{stats.lab}</div>
              <div className="text-sm text-muted-foreground mt-1">실험중</div>
            </Card>
            <Card className="glass-card p-4 text-center">
              <div className="text-3xl font-bold text-accent">{stats.roadmap}</div>
              <div className="text-sm text-muted-foreground mt-1">계획됨</div>
            </Card>
          </div>
        </Section>

        {/* Search and Filter Section */}
        <Section className="pb-0">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="프로젝트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {selectedTag && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTag(null)}
                className="flex items-center gap-2"
              >
                <X className="w-3 h-3" />
                필터 초기화
              </Button>
            )}
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => handleTagClick(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </Section>

        {/* Tab Content */}
        <Section className="pt-4">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-2 bg-transparent h-auto">
              {(Object.entries(TAB_CONFIG) as [TabValue, (typeof TAB_CONFIG)[TabValue]][]).map(
                ([key, config]) => (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="glass-card data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2"
                  >
                    <config.icon className="w-4 h-4" />
                    {config.label}
                  </TabsTrigger>
                )
              )}
            </TabsList>

            {/* In Progress Tab */}
            <TabsContent value="in-progress">
              {filteredInProgress.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="진행중인 프로젝트가 없습니다"
                  description={
                    debouncedSearch || selectedTag
                      ? "검색 조건에 맞는 프로젝트가 없습니다."
                      : "현재 진행 중인 프로젝트가 없습니다."
                  }
                />
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredInProgress.map((item) => (
                    <PortfolioCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Released Tab */}
            <TabsContent value="released">
              {filteredReleased.length === 0 ? (
                <EmptyState
                  icon={Rocket}
                  title="출시된 프로젝트가 없습니다"
                  description={
                    debouncedSearch || selectedTag
                      ? "검색 조건에 맞는 프로젝트가 없습니다."
                      : "아직 출시된 프로젝트가 없습니다."
                  }
                />
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredReleased.map((item) => (
                    <PortfolioCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Lab Tab */}
            <TabsContent value="lab">
              {filteredBounties.length === 0 ? (
                <EmptyState
                  icon={FlaskConical}
                  title="실험중인 프로젝트가 없습니다"
                  description={
                    debouncedSearch || selectedTag
                      ? "검색 조건에 맞는 바운티가 없습니다."
                      : "현재 모집 중인 바운티가 없습니다."
                  }
                />
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {filteredBounties.map((bounty) => (
                    <BountyCard key={bounty.id} bounty={bounty} />
                  ))}
                </div>
              )}
              <div className="mt-8 text-center">
                <Link to="/lab">
                  <Button variant="outline" className="gap-2">
                    <FlaskConical className="w-4 h-4" />
                    실험실 더보기
                  </Button>
                </Link>
              </div>
            </TabsContent>

            {/* Roadmap Tab */}
            <TabsContent value="roadmap">
              {filteredRoadmap.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="로드맵 항목이 없습니다"
                  description={
                    debouncedSearch || selectedTag
                      ? "검색 조건에 맞는 로드맵이 없습니다."
                      : "등록된 로드맵이 없습니다."
                  }
                />
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRoadmap.map((item) => (
                    <RoadmapCard key={item.id} item={item} />
                  ))}
                </div>
              )}
              <div className="mt-8 text-center">
                <Link to="/roadmap">
                  <Button variant="outline" className="gap-2">
                    <Calendar className="w-4 h-4" />
                    전체 로드맵 보기
                  </Button>
                </Link>
              </div>
            </TabsContent>
          </Tabs>
        </Section>
      </PageLayout>
    </>
  );
}

// Portfolio Card Component
function PortfolioCard({ item }: { item: PortfolioItem }) {
  const projectTypeLabels: Record<PortfolioItem["project_type"], string> = {
    mvp: "MVP",
    fullstack: "풀스택",
    design: "디자인",
    operations: "운영",
  };

  return (
    <Link to={`/projects/${item.slug}`}>
      <Card className="glass-card p-6 space-y-4 hover-lift h-full flex flex-col cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-xl font-bold line-clamp-2 flex-1">{item.title}</h3>
          <Badge variant="secondary">{projectTypeLabels[item.project_type]}</Badge>
        </div>

        {/* Summary */}
        <p className="text-sm text-foreground/70 line-clamp-3 flex-1">{item.summary}</p>

        {/* Tech Stack */}
        {item.tech_stack && item.tech_stack.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {item.tech_stack.slice(0, 4).map((tech, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tech}
              </Badge>
            ))}
            {item.tech_stack.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{item.tech_stack.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
          {item.client_name && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{item.client_name}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            {item.github_url && (
              <Github className="w-4 h-4 hover:text-foreground transition-colors" />
            )}
            {item.project_url && (
              <ExternalLink className="w-4 h-4 hover:text-foreground transition-colors" />
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

// Bounty Card Component
function BountyCard({ bounty }: { bounty: Bounty }) {
  const statusLabels = {
    open: "모집중",
    assigned: "진행중",
    "in-progress": "작업중",
    done: "완료",
    pending: "대기",
  };

  const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    open: "default",
    assigned: "secondary",
    "in-progress": "secondary",
    done: "outline",
    pending: "outline",
  };

  const difficultyColors = {
    초급: "text-green-600",
    중급: "text-yellow-600",
    고급: "text-red-600",
  };

  return (
    <Card className="glass-card p-6 space-y-4 hover-lift">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl font-bold flex-1">{bounty.title}</h3>
        <Badge variant={statusVariants[bounty.status]}>{statusLabels[bounty.status]}</Badge>
      </div>

      {/* Description */}
      <p className="text-sm text-foreground/70 leading-relaxed line-clamp-3">{bounty.description}</p>

      {/* Meta Info */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="font-bold text-lg">{bounty.reward.toLocaleString()}원</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>~{bounty.estimated_hours}시간</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Target
              className={`w-4 h-4 ${difficultyColors[bounty.difficulty as keyof typeof difficultyColors]}`}
            />
            <span className={difficultyColors[bounty.difficulty as keyof typeof difficultyColors]}>
              {bounty.difficulty}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{bounty.applicants?.length || 0}명 신청</span>
          </div>
        </div>
      </div>

      {/* Skills */}
      {bounty.skills_required && bounty.skills_required.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {bounty.skills_required.slice(0, 4).map((skill, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
          {bounty.skills_required.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{bounty.skills_required.length - 4}
            </Badge>
          )}
        </div>
      )}
    </Card>
  );
}

// Roadmap Card Component
function RoadmapCard({ item }: { item: RoadmapItem }) {
  const statusLabels = {
    planned: "계획됨",
    "in-progress": "진행중",
    completed: "완료",
    "on-hold": "보류",
  };

  const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    planned: "outline",
    "in-progress": "secondary",
    completed: "default",
    "on-hold": "destructive",
  };

  const categoryLabels = {
    service: "서비스",
    platform: "플랫폼",
    internal: "내부",
  };

  return (
    <Card className="glass-card p-6 space-y-4 hover-lift">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xl font-bold line-clamp-2 flex-1">{item.title}</h3>
        <Badge variant={statusVariants[item.status]}>{statusLabels[item.status]}</Badge>
      </div>

      {/* Description */}
      {item.description && (
        <p className="text-sm text-foreground/70 line-clamp-3">{item.description}</p>
      )}

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">진행률</span>
          <span className="font-bold">{item.progress}%</span>
        </div>
        <Progress value={item.progress} className="h-2" />
      </div>

      {/* Category and Tags */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{categoryLabels[item.category]}</Badge>
        {item.tags?.slice(0, 3).map((tag, index) => (
          <Badge key={index} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>

      {/* Timeline */}
      {(item.start_date || item.end_date) && (
        <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>
              {item.start_date
                ? new Date(item.start_date).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "short",
                  })
                : ""}
              {item.start_date && item.end_date && " - "}
              {item.end_date
                ? new Date(item.end_date).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "short",
                  })
                : ""}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
