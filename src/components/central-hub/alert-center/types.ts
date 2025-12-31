/**
 * AlertCenter 타입 정의
 *
 * @module components/central-hub/alert-center/types
 */

import type { StreamItem } from '@/hooks/useRealtimeEventStream';

/**
 * 그룹화 기준
 */
export type GroupByOption = 'service' | 'date' | 'severity';

/**
 * 날짜 그룹
 */
export type DateGroup = 'today' | 'yesterday' | 'this-week' | 'older';

/**
 * 알림 그룹
 */
export interface AlertGroup {
  key: string;
  label: string;
  items: StreamItem[];
  count: number;
  unreadCount: number;
}

/**
 * AlertCenter 컴포넌트 Props
 */
export interface AlertCenterProps {
  /** 최대 높이 (기본: 'h-[600px]') */
  maxHeight?: string;
  /** 그룹화 기준 (기본: 'service') */
  groupBy?: GroupByOption;
  /** 추가 CSS 클래스 */
  className?: string;
}
