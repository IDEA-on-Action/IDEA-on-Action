import { Link } from "react-router-dom";
import { TrendingUp, Users, Github, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared";
import type { PortfolioItem } from '@/types/shared/v2';

/**
 * InProgressTab Props
 */
export interface InProgressTabProps {
  /** 필터링된 진행중 프로젝트 목록 */
  items: PortfolioItem[];
  /** 검색 쿼리가 있는지 여부 */
  hasSearchQuery?: boolean;
  /** 선택된 태그가 있는지 여부 */
  hasSelectedTag?: boolean;
}

/**
 * 프로젝트 타입 라벨 매핑
 */
const projectTypeLabels: Record<PortfolioItem["project_type"], string> = {
  mvp: "MVP",
  fullstack: "풀스택",
  design: "디자인",
  operations: "운영",
};

/**
 * Portfolio Card Component (내부용)
 */
function PortfolioCard({ item }: { item: PortfolioItem }) {
  return (
    <Link to={`/portfolio/${item.slug}`}>
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

/**
 * InProgressTab - 진행중인 프로젝트 탭 컴포넌트
 *
 * Portfolio에서 project_type이 'mvp' 또는 'fullstack'인 항목을 표시합니다.
 *
 * @example
 * ```tsx
 * <InProgressTab
 *   items={filteredInProgress}
 *   hasSearchQuery={!!debouncedSearch}
 *   hasSelectedTag={!!selectedTag}
 * />
 * ```
 */
export function InProgressTab({ items, hasSearchQuery, hasSelectedTag }: InProgressTabProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="진행중인 프로젝트가 없습니다"
        description={
          hasSearchQuery || hasSelectedTag
            ? "검색 조건에 맞는 프로젝트가 없습니다."
            : "현재 진행 중인 프로젝트가 없습니다."
        }
      />
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <PortfolioCard key={item.id} item={item} />
      ))}
    </div>
  );
}

export default InProgressTab;
