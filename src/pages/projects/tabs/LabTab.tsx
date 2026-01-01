import { Link } from "react-router-dom";
import { FlaskConical, DollarSign, Clock, Target, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared";
import type { Bounty } from '@/types/shared/v2';

/**
 * LabTab Props
 */
export interface LabTabProps {
  /** 필터링된 바운티 목록 */
  items: Bounty[];
  /** 검색 쿼리가 있는지 여부 */
  hasSearchQuery?: boolean;
  /** 선택된 태그가 있는지 여부 */
  hasSelectedTag?: boolean;
  /** "실험실 더보기" 링크 표시 여부 */
  showMoreLink?: boolean;
}

/**
 * 바운티 상태 라벨 매핑
 */
const statusLabels: Record<Bounty["status"], string> = {
  open: "모집중",
  assigned: "진행중",
  "in-progress": "작업중",
  done: "완료",
  pending: "대기",
};

/**
 * 바운티 상태별 Badge variant 매핑
 */
const statusVariants: Record<Bounty["status"], "default" | "secondary" | "outline" | "destructive"> = {
  open: "default",
  assigned: "secondary",
  "in-progress": "secondary",
  done: "outline",
  pending: "outline",
};

/**
 * 난이도별 색상 클래스 매핑
 */
const difficultyColors: Record<string, string> = {
  "초급": "text-green-600",
  "중급": "text-yellow-600",
  "고급": "text-red-600",
};

/**
 * Bounty Card Component (내부용)
 */
function BountyCard({ bounty }: { bounty: Bounty }) {
  return (
    <Card className="glass-card p-6 space-y-4 hover-lift">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl font-bold flex-1">{bounty.title}</h3>
        <Badge variant={statusVariants[bounty.status]}>
          {statusLabels[bounty.status]}
        </Badge>
      </div>

      {/* Description */}
      <p className="text-sm text-foreground/70 leading-relaxed line-clamp-3">
        {bounty.description}
      </p>

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
            <Target className={`w-4 h-4 ${difficultyColors[bounty.difficulty] || ""}`} />
            <span className={difficultyColors[bounty.difficulty] || ""}>
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

      {/* Deadline */}
      {bounty.deadline && (
        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm text-muted-foreground">마감일</span>
          <span className="font-semibold">
            {new Date(bounty.deadline).toLocaleDateString("ko-KR")}
          </span>
        </div>
      )}
    </Card>
  );
}

/**
 * LabTab - 실험실/바운티 탭 컴포넌트
 *
 * 바운티 목록을 표시하고 실험실 페이지로 이동하는 링크를 제공합니다.
 *
 * @example
 * ```tsx
 * <LabTab
 *   items={filteredBounties}
 *   hasSearchQuery={!!debouncedSearch}
 *   hasSelectedTag={!!selectedTag}
 *   showMoreLink
 * />
 * ```
 */
export function LabTab({
  items,
  hasSearchQuery,
  hasSelectedTag,
  showMoreLink = true,
}: LabTabProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={FlaskConical}
        title="실험중인 프로젝트가 없습니다"
        description={
          hasSearchQuery || hasSelectedTag
            ? "검색 조건에 맞는 바운티가 없습니다."
            : "현재 모집 중인 바운티가 없습니다."
        }
      />
    );
  }

  return (
    <>
      <div className="grid md:grid-cols-2 gap-6">
        {items.map((bounty) => (
          <BountyCard key={bounty.id} bounty={bounty} />
        ))}
      </div>
      {showMoreLink && (
        <div className="mt-8 text-center">
          <Link to="/lab">
            <Button variant="outline" className="gap-2">
              <FlaskConical className="w-4 h-4" />
              실험실 더보기
            </Button>
          </Link>
        </div>
      )}
    </>
  );
}

export default LabTab;
