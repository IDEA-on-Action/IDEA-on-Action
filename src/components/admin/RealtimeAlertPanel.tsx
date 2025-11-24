/**
 * RealtimeAlertPanel 컴포넌트 (Admin)
 *
 * 실시간 알림 목록을 표시하는 패널
 * 심각도별 아이콘/색상, 새 알림 하이라이트, "모두 읽음" 기능을 제공합니다.
 *
 * @module components/admin/RealtimeAlertPanel
 */

import { useState, useMemo, useCallback } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Bell,
  BellOff,
  Check,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { IssueSeverity, ServiceId } from '@/types/central-hub.types';

// ============================================================================
// 타입 정의
// ============================================================================

/** 알림 항목 */
export interface AlertItem {
  /** 고유 ID */
  id: string;
  /** 제목 */
  title: string;
  /** 상세 메시지 (선택) */
  message?: string;
  /** 심각도 */
  severity: IssueSeverity;
  /** 서비스 ID (선택) */
  serviceId?: ServiceId;
  /** 생성 시간 (ISO 문자열) */
  createdAt: string;
  /** 읽음 여부 */
  isRead: boolean;
  /** 새 알림 여부 (애니메이션용) */
  isNew?: boolean;
}

export interface RealtimeAlertPanelProps {
  /** 알림 목록 */
  alerts: AlertItem[];
  /** 최대 높이 (기본값: 'h-[400px]') */
  maxHeight?: string;
  /** "모두 읽음" 핸들러 */
  onMarkAllRead?: () => void;
  /** 개별 알림 읽음 핸들러 */
  onMarkRead?: (id: string) => void;
  /** 알림 닫기 핸들러 */
  onDismiss?: (id: string) => void;
  /** 알림 클릭 핸들러 */
  onAlertClick?: (alert: AlertItem) => void;
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ============================================================================
// 상수
// ============================================================================

/** 심각도별 설정 */
const SEVERITY_CONFIG: Record<IssueSeverity, {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  bgClass: string;
  borderClass: string;
  label: string;
}> = {
  critical: {
    icon: AlertCircle,
    iconClass: 'text-red-500',
    bgClass: 'bg-red-50 dark:bg-red-900/20',
    borderClass: 'border-l-red-500',
    label: '심각',
  },
  high: {
    icon: AlertTriangle,
    iconClass: 'text-orange-500',
    bgClass: 'bg-orange-50 dark:bg-orange-900/20',
    borderClass: 'border-l-orange-500',
    label: '높음',
  },
  medium: {
    icon: Info,
    iconClass: 'text-yellow-500',
    bgClass: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderClass: 'border-l-yellow-500',
    label: '중간',
  },
  low: {
    icon: CheckCircle,
    iconClass: 'text-green-500',
    bgClass: 'bg-green-50 dark:bg-green-900/20',
    borderClass: 'border-l-green-500',
    label: '낮음',
  },
};

/** 서비스별 표시 이름 */
const SERVICE_NAMES: Record<ServiceId, string> = {
  'minu-find': 'Minu Find',
  'minu-frame': 'Minu Frame',
  'minu-build': 'Minu Build',
  'minu-keep': 'Minu Keep',
};

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 상대 시간 포맷 (방금, 5분 전, 1시간 전 등)
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;

  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

// ============================================================================
// 서브 컴포넌트
// ============================================================================

/**
 * 빈 상태 표시
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <BellOff className="h-12 w-12 mb-3 opacity-30" aria-hidden="true" />
      <p className="text-sm font-medium">알림이 없습니다</p>
      <p className="text-xs mt-1 opacity-70">새로운 알림이 여기에 표시됩니다</p>
    </div>
  );
}

/**
 * 로딩 스켈레톤
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="flex gap-3 p-3 rounded-lg border border-l-4 animate-pulse bg-muted/50"
        >
          <div className="h-5 w-5 rounded-full bg-muted-foreground/20" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-muted-foreground/20 rounded" />
            <div className="h-3 w-1/2 bg-muted-foreground/20 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 알림 아이템
 */
function AlertItemCard({
  alert,
  onMarkRead,
  onDismiss,
  onClick,
}: {
  alert: AlertItem;
  onMarkRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onClick?: (alert: AlertItem) => void;
}) {
  const config = SEVERITY_CONFIG[alert.severity];
  const SeverityIcon = config.icon;

  const handleClick = useCallback(() => {
    onClick?.(alert);
  }, [onClick, alert]);

  const handleMarkRead = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkRead?.(alert.id);
  }, [onMarkRead, alert.id]);

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss?.(alert.id);
  }, [onDismiss, alert.id]);

  return (
    <div
      className={cn(
        'relative flex gap-3 p-3 rounded-lg border border-l-4 transition-all',
        'hover:shadow-md cursor-pointer',
        config.borderClass,
        alert.isRead ? 'bg-background' : config.bgClass,
        alert.isNew && 'animate-pulse-once ring-2 ring-primary/30'
      )}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`${config.label} 알림: ${alert.title}`}
    >
      {/* 읽지 않음 표시 */}
      {!alert.isRead && (
        <span
          className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary"
          aria-label="읽지 않음"
        />
      )}

      {/* 아이콘 */}
      <SeverityIcon
        className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.iconClass)}
        aria-hidden="true"
      />

      {/* 내용 */}
      <div className="flex-1 min-w-0 pr-6">
        {/* 헤더: 서비스명 + 시간 */}
        <div className="flex items-center gap-2 mb-1">
          {alert.serviceId && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {SERVICE_NAMES[alert.serviceId]}
            </Badge>
          )}
          <Badge variant="outline" className={cn('text-xs px-1.5 py-0', config.bgClass)}>
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">
            {formatRelativeTime(alert.createdAt)}
          </span>
        </div>

        {/* 제목 */}
        <p className={cn(
          'text-sm truncate',
          !alert.isRead && 'font-medium'
        )}>
          {alert.title}
        </p>

        {/* 메시지 (있는 경우) */}
        {alert.message && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {alert.message}
          </p>
        )}
      </div>

      {/* 액션 버튼들 */}
      <div className="absolute top-2 right-8 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!alert.isRead && onMarkRead && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleMarkRead}
            aria-label="읽음으로 표시"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleDismiss}
            aria-label="알림 닫기"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/**
 * RealtimeAlertPanel
 *
 * 실시간 알림 목록을 표시하는 패널입니다.
 * 심각도별 색상/아이콘, 새 알림 하이라이트, "모두 읽음" 기능을 제공합니다.
 *
 * @example
 * ```tsx
 * <RealtimeAlertPanel
 *   alerts={alerts}
 *   onMarkAllRead={() => markAllAsRead()}
 *   onMarkRead={(id) => markAsRead(id)}
 *   onAlertClick={(alert) => openAlertDetail(alert)}
 * />
 * ```
 */
export function RealtimeAlertPanel({
  alerts,
  maxHeight = 'h-[400px]',
  onMarkAllRead,
  onMarkRead,
  onDismiss,
  onAlertClick,
  isLoading = false,
  className,
}: RealtimeAlertPanelProps) {
  // 정렬된 알림 목록 (시간순, 읽지 않은 것 우선)
  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => {
      // 읽지 않은 알림 우선
      if (!a.isRead && b.isRead) return -1;
      if (a.isRead && !b.isRead) return 1;
      // 시간순 정렬 (최신 우선)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [alerts]);

  // 읽지 않은 알림 수
  const unreadCount = useMemo(
    () => alerts.filter((a) => !a.isRead).length,
    [alerts]
  );

  // 심각도별 통계
  const severityStats = useMemo(() => {
    const stats: Record<IssueSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    alerts.forEach((a) => {
      if (!a.isRead) stats[a.severity]++;
    });
    return stats;
  }, [alerts]);

  return (
    <Card className={cn('w-full', className)} role="region" aria-label="실시간 알림 패널">
      <CardHeader className="pb-3">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-lg">실시간 알림</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5">
                {unreadCount}
              </Badge>
            )}
          </div>

          {/* 모두 읽음 버튼 */}
          {onMarkAllRead && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllRead}
              className="text-xs"
              aria-label="모든 알림 읽음으로 표시"
            >
              <Check className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              모두 읽음
            </Button>
          )}
        </div>

        {/* 심각도별 요약 (읽지 않은 알림이 있을 때만) */}
        {unreadCount > 0 && (
          <div className="flex gap-2 mt-2">
            {Object.entries(severityStats).map(([severity, count]) => {
              if (count === 0) return null;
              const config = SEVERITY_CONFIG[severity as IssueSeverity];
              return (
                <Badge
                  key={severity}
                  variant="outline"
                  className={cn('text-xs', config.bgClass)}
                >
                  {config.label}: {count}
                </Badge>
              );
            })}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea className={cn(maxHeight, 'pr-2')}>
          {/* 로딩 상태 */}
          {isLoading && <LoadingSkeleton />}

          {/* 빈 상태 */}
          {!isLoading && sortedAlerts.length === 0 && <EmptyState />}

          {/* 알림 목록 */}
          {!isLoading && sortedAlerts.length > 0 && (
            <div className="space-y-2 group">
              {sortedAlerts.map((alert) => (
                <AlertItemCard
                  key={alert.id}
                  alert={alert}
                  onMarkRead={onMarkRead}
                  onDismiss={onDismiss}
                  onClick={onAlertClick}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default RealtimeAlertPanel;
