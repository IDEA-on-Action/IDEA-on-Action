/**
 * EnhancedFilter 컴포넌트
 *
 * Central Hub 대시보드용 고급 필터링 UI
 * 서비스, 날짜 범위, 심각도, 상태, 검색 필터를 통합 제공합니다.
 *
 * @module components/central-hub/EnhancedFilter
 */

import { useState, useCallback, useMemo } from 'react';
import { Search, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import type {
  ServiceId,
  IssueSeverity,
  IssueStatus,
} from '@/types/services/central-hub.types';
import { SERVICE_INFO } from '@/types/services/central-hub.types';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 고급 필터 값
 */
export interface EnhancedFilterValue {
  /** 서비스 멀티 선택 */
  services: ServiceId[];
  /** 날짜 범위 */
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  /** 심각도 멀티 선택 (이슈 필터링용) */
  severity?: IssueSeverity[];
  /** 상태 멀티 선택 (이슈 필터링용) */
  status?: IssueStatus[];
  /** 텍스트 검색 쿼리 */
  searchQuery?: string;
}

/**
 * EnhancedFilter 컴포넌트 Props
 */
export interface EnhancedFilterProps {
  /** 현재 필터 값 */
  value: EnhancedFilterValue;
  /** 필터 값 변경 콜백 */
  onChange: (value: EnhancedFilterValue) => void;
  /** 추가 CSS 클래스 */
  className?: string;
  /** 컴팩트 모드 (모바일 등) */
  compact?: boolean;
}

// ============================================================================
// 상수
// ============================================================================

const ALL_SERVICES: ServiceId[] = ['minu-find', 'minu-frame', 'minu-build', 'minu-keep'];

const ALL_SEVERITIES: IssueSeverity[] = ['critical', 'high', 'medium', 'low'];

const ALL_STATUSES: IssueStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 심각도 한글 라벨
 */
function getSeverityLabel(severity: IssueSeverity): string {
  const labels: Record<IssueSeverity, string> = {
    critical: '심각',
    high: '높음',
    medium: '보통',
    low: '낮음',
  };
  return labels[severity];
}

/**
 * 심각도 배지 색상
 */
function getSeverityBadgeClass(severity: IssueSeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800';
  }
}

/**
 * 상태 한글 라벨
 */
function getStatusLabel(status: IssueStatus): string {
  const labels: Record<IssueStatus, string> = {
    open: '열림',
    in_progress: '진행중',
    resolved: '해결됨',
    closed: '닫힘',
  };
  return labels[status];
}

/**
 * 상태 배지 색상
 */
function getStatusBadgeClass(status: IssueStatus): string {
  switch (status) {
    case 'open':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    case 'resolved':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
    case 'closed':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800';
  }
}

/**
 * 기본 필터 값
 */
const DEFAULT_FILTER_VALUE: EnhancedFilterValue = {
  services: [],
  dateRange: {
    from: undefined,
    to: undefined,
  },
  severity: undefined,
  status: undefined,
  searchQuery: undefined,
};

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/**
 * EnhancedFilter
 *
 * Central Hub 대시보드의 고급 필터링 UI를 제공하는 컴포넌트입니다.
 *
 * 기능:
 * - 서비스 멀티 선택
 * - 날짜 범위 선택
 * - 심각도 멀티 선택
 * - 상태 멀티 선택
 * - 텍스트 검색
 * - 필터 초기화
 *
 * @param value - 현재 필터 값
 * @param onChange - 필터 값 변경 콜백
 * @param className - 추가 CSS 클래스
 * @param compact - 컴팩트 모드 (기본값: false)
 */
export function EnhancedFilter({
  value,
  onChange,
  className,
  compact = false,
}: EnhancedFilterProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  // 활성화된 필터 수 계산
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (value.services.length > 0) count++;
    if (value.dateRange.from || value.dateRange.to) count++;
    if (value.severity && value.severity.length > 0) count++;
    if (value.status && value.status.length > 0) count++;
    if (value.searchQuery && value.searchQuery.trim().length > 0) count++;
    return count;
  }, [value]);

  // 서비스 토글
  const toggleService = useCallback(
    (serviceId: ServiceId) => {
      const current = value.services || [];
      const updated = current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId];

      onChange({ ...value, services: updated });
    },
    [value, onChange]
  );

  // 심각도 토글
  const toggleSeverity = useCallback(
    (severity: IssueSeverity) => {
      const current = value.severity || [];
      const updated = current.includes(severity)
        ? current.filter((s) => s !== severity)
        : [...current, severity];

      onChange({
        ...value,
        severity: updated.length === 0 ? undefined : updated,
      });
    },
    [value, onChange]
  );

  // 상태 토글
  const toggleStatus = useCallback(
    (status: IssueStatus) => {
      const current = value.status || [];
      const updated = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status];

      onChange({
        ...value,
        status: updated.length === 0 ? undefined : updated,
      });
    },
    [value, onChange]
  );

  // 날짜 범위 변경
  const handleDateRangeChange = useCallback(
    (range: DateRange | undefined) => {
      onChange({
        ...value,
        dateRange: {
          from: range?.from,
          to: range?.to,
        },
      });
    },
    [value, onChange]
  );

  // 검색 쿼리 변경
  const handleSearchChange = useCallback(
    (query: string) => {
      onChange({
        ...value,
        searchQuery: query.trim().length === 0 ? undefined : query,
      });
    },
    [value, onChange]
  );

  // 필터 초기화
  const resetFilters = useCallback(() => {
    onChange(DEFAULT_FILTER_VALUE);
  }, [onChange]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* 검색 바 & 초기화 버튼 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="이벤트 또는 이슈 검색..."
            value={value.searchQuery || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
            aria-label="검색 입력"
          />
          {value.searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSearchChange('')}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
              aria-label="검색어 지우기"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* 초기화 버튼 */}
        {activeFilterCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="gap-2"
            aria-label="필터 초기화"
          >
            <X className="h-4 w-4" />
            초기화
          </Button>
        )}

        {/* 컴팩트 모드에서 확장/축소 버튼 */}
        {compact && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-2"
            aria-label={isExpanded ? '필터 숨기기' : '필터 보기'}
          >
            <Filter className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1 text-xs">
                {activeFilterCount}
              </Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* 필터 패널 */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <div className="space-y-4 rounded-lg border bg-card p-4">
            {/* 서비스 필터 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">서비스</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ALL_SERVICES.map((serviceId) => {
                  const serviceInfo = SERVICE_INFO[serviceId];
                  const isSelected = value.services.includes(serviceId);

                  return (
                    <div
                      key={serviceId}
                      className={cn(
                        'flex items-center gap-2 rounded-md border p-2 transition-colors',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <Checkbox
                        id={`service-${serviceId}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleService(serviceId)}
                        aria-label={`${serviceInfo.name} 선택`}
                      />
                      <Label
                        htmlFor={`service-${serviceId}`}
                        className="cursor-pointer text-sm font-medium"
                      >
                        {serviceInfo.name}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* 날짜 범위 필터 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">기간</Label>
              <DateRangePicker
                date={{
                  from: value.dateRange.from,
                  to: value.dateRange.to,
                }}
                onDateChange={handleDateRangeChange}
                placeholder="전체 기간"
                disableFutureDates
              />
            </div>

            <Separator />

            {/* 심각도 필터 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">심각도 (이슈)</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ALL_SEVERITIES.map((severity) => {
                  const isSelected = value.severity?.includes(severity);

                  return (
                    <div
                      key={severity}
                      className={cn(
                        'flex items-center gap-2 rounded-md border p-2 transition-colors',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <Checkbox
                        id={`severity-${severity}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleSeverity(severity)}
                        aria-label={`${getSeverityLabel(severity)} 심각도 선택`}
                      />
                      <Label
                        htmlFor={`severity-${severity}`}
                        className="cursor-pointer text-sm"
                      >
                        <Badge
                          variant="outline"
                          className={cn('text-xs', getSeverityBadgeClass(severity))}
                        >
                          {getSeverityLabel(severity)}
                        </Badge>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* 상태 필터 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">상태 (이슈)</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ALL_STATUSES.map((status) => {
                  const isSelected = value.status?.includes(status);

                  return (
                    <div
                      key={status}
                      className={cn(
                        'flex items-center gap-2 rounded-md border p-2 transition-colors',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <Checkbox
                        id={`status-${status}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleStatus(status)}
                        aria-label={`${getStatusLabel(status)} 상태 선택`}
                      />
                      <Label
                        htmlFor={`status-${status}`}
                        className="cursor-pointer text-sm"
                      >
                        <Badge
                          variant="outline"
                          className={cn('text-xs', getStatusBadgeClass(status))}
                        >
                          {getStatusLabel(status)}
                        </Badge>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* 활성 필터 요약 */}
      {activeFilterCount > 0 && !isExpanded && (
        <div className="flex flex-wrap gap-2">
          {value.services.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              서비스: {value.services.length}개
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onChange({ ...value, services: [] })}
              />
            </Badge>
          )}
          {(value.dateRange.from || value.dateRange.to) && (
            <Badge variant="secondary" className="gap-1">
              날짜 범위
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  onChange({ ...value, dateRange: { from: undefined, to: undefined } })
                }
              />
            </Badge>
          )}
          {value.severity && value.severity.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              심각도: {value.severity.length}개
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onChange({ ...value, severity: undefined })}
              />
            </Badge>
          )}
          {value.status && value.status.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              상태: {value.status.length}개
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onChange({ ...value, status: undefined })}
              />
            </Badge>
          )}
          {value.searchQuery && (
            <Badge variant="secondary" className="gap-1">
              검색: {value.searchQuery}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onChange({ ...value, searchQuery: undefined })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

EnhancedFilter.displayName = 'EnhancedFilter';

export default EnhancedFilter;
