/**
 * IssueList 컴포넌트
 *
 * Central Hub 대시보드용 이슈 목록 컴포넌트
 * 서비스별, 상태별 필터링 및 상태 변경 기능 제공
 *
 * @module components/central-hub/IssueList
 */

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

import { useServiceIssues, useUpdateIssueStatus } from '@/hooks/useServiceIssues';
import type {
  ServiceId,
  ServiceIssue,
  IssueStatus,
  IssueSeverity,
} from '@/types/central-hub.types';
import { cn } from '@/lib/utils';

// ============================================================================
// 타입 정의
// ============================================================================

interface IssueListProps {
  /** 상태 필터 (기본값: 'all') */
  statusFilter?: IssueStatus | 'all';
  /** 서비스 필터 (기본값: 'all') */
  serviceFilter?: ServiceId | 'all';
  /** 최대 높이 (기본값: 'h-[400px]') */
  maxHeight?: string;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ============================================================================
// 상수 정의
// ============================================================================

/** 심각도 우선순위 (낮을수록 높은 우선순위) */
const SEVERITY_PRIORITY: Record<IssueSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** 심각도별 테두리 색상 */
const SEVERITY_BORDER_COLORS: Record<IssueSeverity, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-blue-500',
};

/** 심각도별 배지 스타일 */
const SEVERITY_BADGE_STYLES: Record<IssueSeverity, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

/** 상태별 배지 스타일 */
const STATUS_BADGE_STYLES: Record<IssueStatus, string> = {
  open: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

/** 상태별 아이콘 */
const STATUS_ICONS: Record<IssueStatus, React.ComponentType<{ className?: string }>> = {
  open: AlertCircle,
  in_progress: Clock,
  resolved: CheckCircle2,
  closed: XCircle,
};

/** 상태 레이블 */
const STATUS_LABELS: Record<IssueStatus, string> = {
  open: '열림',
  in_progress: '진행 중',
  resolved: '해결됨',
  closed: '닫힘',
};

/** 심각도 레이블 */
const SEVERITY_LABELS: Record<IssueSeverity, string> = {
  critical: '심각',
  high: '높음',
  medium: '보통',
  low: '낮음',
};

/** 서비스 레이블 */
const SERVICE_LABELS: Record<ServiceId, string> = {
  'minu-find': 'Minu Find',
  'minu-frame': 'Minu Frame',
  'minu-build': 'Minu Build',
  'minu-keep': 'Minu Keep',
};

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 이슈를 심각도순으로 정렬
 */
function sortIssuesBySeverity(issues: ServiceIssue[]): ServiceIssue[] {
  return [...issues].sort((a, b) => {
    const priorityDiff = SEVERITY_PRIORITY[a.severity] - SEVERITY_PRIORITY[b.severity];
    if (priorityDiff !== 0) return priorityDiff;
    // 같은 심각도면 생성일 기준 최신순
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/**
 * 날짜를 상대적 시간으로 포맷
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR');
}

// ============================================================================
// 서브 컴포넌트
// ============================================================================

interface IssueItemProps {
  issue: ServiceIssue;
  onStatusChange: (issueId: string, status: IssueStatus) => void;
  isUpdating: boolean;
}

function IssueItem({ issue, onStatusChange, isUpdating }: IssueItemProps) {
  const StatusIcon = STATUS_ICONS[issue.status];

  return (
    <div
      className={cn(
        'border-l-4 rounded-lg bg-white dark:bg-gray-800 p-4 shadow-sm',
        'hover:shadow-md transition-shadow duration-200',
        SEVERITY_BORDER_COLORS[issue.severity]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* 이슈 정보 */}
        <div className="flex-1 min-w-0">
          {/* 제목 행 */}
          <div className="flex items-center gap-2 mb-1">
            <StatusIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
            <h4 className="font-medium text-sm truncate">{issue.title}</h4>
          </div>

          {/* 설명 */}
          {issue.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2 pl-6">
              {issue.description}
            </p>
          )}

          {/* 메타 정보 */}
          <div className="flex flex-wrap items-center gap-2 pl-6">
            {/* 심각도 배지 */}
            <Badge
              variant="outline"
              className={cn('text-xs px-1.5 py-0', SEVERITY_BADGE_STYLES[issue.severity])}
            >
              {SEVERITY_LABELS[issue.severity]}
            </Badge>

            {/* 상태 배지 */}
            <Badge
              variant="outline"
              className={cn('text-xs px-1.5 py-0', STATUS_BADGE_STYLES[issue.status])}
            >
              {STATUS_LABELS[issue.status]}
            </Badge>

            {/* 서비스 */}
            <span className="text-xs text-muted-foreground">
              {SERVICE_LABELS[issue.service_id]}
            </span>

            {/* 구분자 */}
            <span className="text-xs text-muted-foreground">|</span>

            {/* 생성일 */}
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(issue.created_at)}
            </span>

            {/* 담당자 */}
            {issue.assigned_to && (
              <>
                <span className="text-xs text-muted-foreground">|</span>
                <span className="text-xs text-muted-foreground">
                  담당: {issue.assigned_to}
                </span>
              </>
            )}
          </div>
        </div>

        {/* 액션 메뉴 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0"
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreVertical className="h-4 w-4" />
              )}
              <span className="sr-only">이슈 메뉴 열기</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>상태 변경</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(Object.keys(STATUS_LABELS) as IssueStatus[]).map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => onStatusChange(issue.id, status)}
                disabled={issue.status === status}
                className="flex items-center gap-2"
              >
                {(() => {
                  const Icon = STATUS_ICONS[status];
                  return <Icon className="h-4 w-4" />;
                })()}
                {STATUS_LABELS[status]}
                {issue.status === status && (
                  <CheckCircle2 className="h-3 w-3 ml-auto text-green-500" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export function IssueList({
  statusFilter = 'all',
  serviceFilter = 'all',
  maxHeight = 'h-[400px]',
  className,
}: IssueListProps) {
  // 로컬 필터 상태 (prop이 변경되면 동기화)
  const [localStatusFilter, setLocalStatusFilter] = useState<IssueStatus | 'all'>(statusFilter);
  const [localServiceFilter, setLocalServiceFilter] = useState<ServiceId | 'all'>(serviceFilter);

  // 필터 적용된 쿼리
  const filters = useMemo(() => {
    const result: { service_id?: ServiceId; status?: IssueStatus } = {};
    if (localServiceFilter !== 'all') {
      result.service_id = localServiceFilter;
    }
    if (localStatusFilter !== 'all') {
      result.status = localStatusFilter;
    }
    return result;
  }, [localServiceFilter, localStatusFilter]);

  const { data: issues, isLoading, error } = useServiceIssues(filters);
  const updateStatus = useUpdateIssueStatus();

  // 이슈를 심각도순으로 정렬
  const sortedIssues = useMemo(() => {
    if (!issues) return [];
    return sortIssuesBySeverity(issues);
  }, [issues]);

  // 상태 변경 핸들러
  const handleStatusChange = (issueId: string, status: IssueStatus) => {
    updateStatus.mutate({ issueId, status });
  };

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            서비스 이슈
            {sortedIssues.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {sortedIssues.length}
              </Badge>
            )}
          </CardTitle>

          {/* 필터 컨트롤 */}
          <div className="flex items-center gap-2">
            {/* 상태 필터 */}
            <Select
              value={localStatusFilter}
              onValueChange={(value) => setLocalStatusFilter(value as IssueStatus | 'all')}
            >
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="open">열림</SelectItem>
                <SelectItem value="in_progress">진행 중</SelectItem>
                <SelectItem value="resolved">해결됨</SelectItem>
                <SelectItem value="closed">닫힘</SelectItem>
              </SelectContent>
            </Select>

            {/* 서비스 필터 */}
            <Select
              value={localServiceFilter}
              onValueChange={(value) => setLocalServiceFilter(value as ServiceId | 'all')}
            >
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="서비스" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 서비스</SelectItem>
                <SelectItem value="minu-find">Minu Find</SelectItem>
                <SelectItem value="minu-frame">Minu Frame</SelectItem>
                <SelectItem value="minu-build">Minu Build</SelectItem>
                <SelectItem value="minu-keep">Minu Keep</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">이슈 로딩 중...</span>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="flex items-center justify-center py-8 text-red-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="text-sm">이슈를 불러오는데 실패했습니다.</span>
          </div>
        )}

        {/* 빈 상태 */}
        {!isLoading && !error && sortedIssues.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mb-3 text-green-500" />
            <p className="text-sm font-medium">이슈가 없습니다</p>
            <p className="text-xs">현재 필터 조건에 맞는 이슈가 없습니다.</p>
          </div>
        )}

        {/* 이슈 목록 */}
        {!isLoading && !error && sortedIssues.length > 0 && (
          <ScrollArea className={maxHeight}>
            <div className="space-y-3 pr-4">
              {sortedIssues.map((issue) => (
                <IssueItem
                  key={issue.id}
                  issue={issue}
                  onStatusChange={handleStatusChange}
                  isUpdating={updateStatus.isPending}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default IssueList;
