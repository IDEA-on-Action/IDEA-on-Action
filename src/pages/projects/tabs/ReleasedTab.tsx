import { Link } from "react-router-dom";
import { Rocket, Users, Github, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared";
import type { PortfolioItem } from '@/types/shared/v2';

/**
 * ReleasedTab Props
 */
export interface ReleasedTabProps {
  /** 필터링된 출시된 프로젝트 목록 */
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
          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200">
            출시됨
          </Badge>
        </div>

        {/* Summary */}
        <p className="text-sm text-foreground/70 line-clamp-3 flex-1">{item.summary}</p>

        {/* Project Type Badge */}
        <Badge variant="secondary" className="w-fit">
          {projectTypeLabels[item.project_type]}
        </Badge>

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
          {item.end_date && (
            <span className="text-xs">
              출시: {new Date(item.end_date).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "short",
              })}
            </span>
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
 * ReleasedTab - 출시된 프로젝트 탭 컴포넌트
 *
 * Portfolio에서 published=true이고 end_date가 있는 항목을 표시합니다.
 *
 * @example
 * ```tsx
 * <ReleasedTab
 *   items={filteredReleased}
 *   hasSearchQuery={!!debouncedSearch}
 *   hasSelectedTag={!!selectedTag}
 * />
 * ```
 */
export function ReleasedTab({ items, hasSearchQuery, hasSelectedTag }: ReleasedTabProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Rocket}
        title="출시된 프로젝트가 없습니다"
        description={
          hasSearchQuery || hasSelectedTag
            ? "검색 조건에 맞는 프로젝트가 없습니다."
            : "아직 출시된 프로젝트가 없습니다."
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

export default ReleasedTab;
