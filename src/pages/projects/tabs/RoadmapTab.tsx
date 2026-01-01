import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared";
import type { RoadmapItem } from '@/types/shared/v2';

/**
 * RoadmapTab Props
 */
export interface RoadmapTabProps {
  /** 필터링된 로드맵 항목 목록 */
  items: RoadmapItem[];
  /** 검색 쿼리가 있는지 여부 */
  hasSearchQuery?: boolean;
  /** 선택된 태그가 있는지 여부 */
  hasSelectedTag?: boolean;
  /** "전체 로드맵 보기" 링크 표시 여부 */
  showMoreLink?: boolean;
}

/**
 * 로드맵 상태 라벨 매핑
 */
const statusLabels: Record<RoadmapItem["status"], string> = {
  planned: "계획됨",
  "in-progress": "진행중",
  completed: "완료",
  "on-hold": "보류",
};

/**
 * 로드맵 상태별 Badge variant 매핑
 */
const statusVariants: Record<RoadmapItem["status"], "default" | "secondary" | "outline" | "destructive"> = {
  planned: "outline",
  "in-progress": "secondary",
  completed: "default",
  "on-hold": "destructive",
};

/**
 * 로드맵 카테고리 라벨 매핑
 */
const categoryLabels: Record<RoadmapItem["category"], string> = {
  service: "서비스",
  platform: "플랫폼",
  internal: "내부",
};

/**
 * Roadmap Card Component (내부용)
 */
function RoadmapCard({ item }: { item: RoadmapItem }) {
  return (
    <Card className="glass-card p-6 space-y-4 hover-lift">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xl font-bold line-clamp-2 flex-1">{item.title}</h3>
        <Badge variant={statusVariants[item.status]}>
          {statusLabels[item.status]}
        </Badge>
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
        {item.tags && item.tags.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{item.tags.length - 3}
          </Badge>
        )}
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

/**
 * RoadmapTab - 로드맵 탭 컴포넌트
 *
 * 로드맵 항목을 카드 형태로 표시하고 전체 로드맵 페이지로 이동하는 링크를 제공합니다.
 *
 * @example
 * ```tsx
 * <RoadmapTab
 *   items={filteredRoadmap}
 *   hasSearchQuery={!!debouncedSearch}
 *   hasSelectedTag={!!selectedTag}
 *   showMoreLink
 * />
 * ```
 */
export function RoadmapTab({
  items,
  hasSearchQuery,
  hasSelectedTag,
  showMoreLink = true,
}: RoadmapTabProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="로드맵 항목이 없습니다"
        description={
          hasSearchQuery || hasSelectedTag
            ? "검색 조건에 맞는 로드맵이 없습니다."
            : "등록된 로드맵이 없습니다."
        }
      />
    );
  }

  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <RoadmapCard key={item.id} item={item} />
        ))}
      </div>
      {showMoreLink && (
        <div className="mt-8 text-center">
          <Link to="/roadmap">
            <Button variant="outline" className="gap-2">
              <Calendar className="w-4 h-4" />
              전체 로드맵 보기
            </Button>
          </Link>
        </div>
      )}
    </>
  );
}

export default RoadmapTab;
