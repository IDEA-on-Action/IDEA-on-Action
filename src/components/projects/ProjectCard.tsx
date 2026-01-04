import { Link } from "react-router-dom";
import { Github, ExternalLink, Clock, Users, Star, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Project } from '@/types/shared/v2';
import { useGitHubStats, formatGitHubStatsSummary } from "@/hooks/integrations/useGitHubStats";

/**
 * 프로젝트 상태별 설정
 */
const STATUS_CONFIG = {
  "in-progress": {
    label: "진행중",
    variant: "default" as const,
    className: "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400",
  },
  "validate": {
    label: "검증",
    variant: "secondary" as const,
    className: "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400",
  },
  "launched": {
    label: "출시",
    variant: "default" as const,
    className: "bg-green-500/10 text-green-600 border-green-200 dark:bg-green-500/20 dark:text-green-400",
  },
  "backlog": {
    label: "대기",
    variant: "outline" as const,
    className: "bg-gray-500/10 text-gray-600 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400",
  },
} as const;

/**
 * 진행률에 따른 Progress Bar 색상 클래스
 */
function getProgressColorClass(progress: number): string {
  if (progress < 30) return "[&>div]:bg-red-500";
  if (progress < 70) return "[&>div]:bg-yellow-500";
  return "[&>div]:bg-green-500";
}

/**
 * ProjectCard Props
 */
export interface ProjectCardProps {
  /** 프로젝트 데이터 */
  project: Project;
  /** 진척률 Progress Bar 표시 여부 (기본값: true) */
  showProgress?: boolean;
  /** GitHub 정보 표시 여부 - Phase 4에서 연동 (기본값: false) */
  showGitHub?: boolean;
  /** 컴팩트 모드 - 홈 페이지용 축소 뷰 (기본값: false) */
  compact?: boolean;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * ProjectCard 컴포넌트
 *
 * 프로젝트를 카드 형태로 표시하며, 진척률, 상태 배지, 기술 스택 등을 포함합니다.
 * compact 모드에서는 홈 페이지 등에서 사용하기 위해 축소된 형태로 표시됩니다.
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <ProjectCard project={project} />
 *
 * // 컴팩트 모드 (홈 페이지용)
 * <ProjectCard project={project} compact />
 *
 * // 진행률 숨기기
 * <ProjectCard project={project} showProgress={false} />
 * ```
 */
export function ProjectCard({
  project,
  showProgress = true,
  showGitHub = false,
  compact = false,
  className,
}: ProjectCardProps) {
  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG["backlog"];
  const progress = project.metrics?.progress ?? 0;

  // GitHub 통계 조회 (showGitHub가 true이고 GitHub URL이 있을 때만)
  const { data: githubStats, isLoading: isLoadingGitHub } = useGitHubStats(
    showGitHub && project.links?.github ? project.links.github : null
  );

  // 기술 스택 태그 (컴팩트 모드: 최대 2개, 일반 모드: 최대 3개)
  const maxTags = compact ? 2 : 3;
  const techStack = [
    ...(project.tech?.frontend || []),
    ...(project.tech?.backend || []),
  ];
  const displayTags = techStack.slice(0, maxTags);
  const remainingTags = techStack.length - maxTags;

  return (
    <Link to={`/projects/${project.slug}`} className="block h-full">
      <Card
        className={cn(
          "h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
          "border border-border/50 hover:border-primary/30",
          "bg-card/80 backdrop-blur-sm",
          compact && "p-0",
          className
        )}
      >
        {/* 썸네일 이미지 */}
        {project.image && (
          <div
            className={cn(
              "relative overflow-hidden rounded-t-lg bg-muted",
              compact ? "h-32" : "h-40"
            )}
          >
            <img
              src={project.image}
              alt={project.title}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              loading="lazy"
            />
            {/* 상태 배지 (이미지 위) */}
            <Badge
              className={cn(
                "absolute top-2 right-2 text-xs font-medium",
                statusConfig.className
              )}
            >
              {statusConfig.label}
            </Badge>
          </div>
        )}

        <CardHeader className={cn("pb-2", compact && "p-3")}>
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "font-bold leading-tight",
                compact ? "text-base line-clamp-1" : "text-lg line-clamp-2"
              )}
            >
              {project.title}
            </h3>
            {/* 이미지가 없을 때 상태 배지 */}
            {!project.image && (
              <Badge
                className={cn(
                  "text-xs font-medium shrink-0",
                  statusConfig.className
                )}
              >
                {statusConfig.label}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className={cn("space-y-3", compact && "p-3 pt-0")}>
          {/* 요약 설명 */}
          <p
            className={cn(
              "text-sm text-muted-foreground",
              compact ? "line-clamp-2" : "line-clamp-3"
            )}
          >
            {project.summary}
          </p>

          {/* 진척률 Progress Bar */}
          {showProgress && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  진행률
                </span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress
                value={progress}
                className={cn("h-1.5", getProgressColorClass(progress))}
              />
            </div>
          )}

          {/* 비즈니스 임팩트 메트릭 (컴팩트 모드에서는 숨김) */}
          {!compact && project.impact && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
              {project.impact.users && (
                <div className="text-center">
                  <Users className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
                  <div className="text-[10px] text-muted-foreground">사용자</div>
                  <div className="text-xs font-semibold">{project.impact.users}</div>
                </div>
              )}
              {project.impact.timeSaved && (
                <div className="text-center">
                  <Clock className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
                  <div className="text-[10px] text-muted-foreground">절감</div>
                  <div className="text-xs font-semibold">{project.impact.timeSaved}</div>
                </div>
              )}
              {project.impact.satisfaction && (
                <div className="text-center">
                  <Star className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
                  <div className="text-[10px] text-muted-foreground">만족도</div>
                  <div className="text-xs font-semibold">{project.impact.satisfaction}</div>
                </div>
              )}
            </div>
          )}

          {/* 기술 스택 태그 */}
          {techStack.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {displayTags.map((tech, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-5"
                >
                  {tech}
                </Badge>
              ))}
              {remainingTags > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-5"
                >
                  +{remainingTags}
                </Badge>
              )}
            </div>
          )}

          {/* GitHub 정보 (showGitHub가 true일 때) */}
          {showGitHub && project.links?.github && (
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-3">
                <a
                  href={project.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                </a>
                {project.links.demo && (
                  <a
                    href={project.links.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Demo</span>
                  </a>
                )}
              </div>

              {/* GitHub 통계 */}
              {isLoadingGitHub ? (
                <span className="text-[10px] text-muted-foreground animate-pulse">로딩중...</span>
              ) : githubStats ? (
                <span className="text-[10px] text-muted-foreground">
                  {formatGitHubStatsSummary(githubStats)}
                </span>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default ProjectCard;
