/**
 * A2UI Tabs 컴포넌트
 * AI 에이전트가 탭 인터페이스를 렌더링할 수 있게 해주는 컴포넌트
 */

import type { ReactNode } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

/** 탭 아이템 정의 */
export interface A2UITabItemDef {
  /** 탭 고유 ID (value) */
  id: string;
  /** 탭 라벨 */
  label: string;
  /** 탭 내용 텍스트 (children이 없을 때 사용) */
  content?: string;
  /** 비활성화 여부 */
  disabled?: boolean;
}

export interface A2UITabsProps {
  /** 탭 아이템 배열 */
  tabs: A2UITabItemDef[];
  /** 기본 선택된 탭 ID */
  defaultValue?: string;
  /** 탭 리스트 정렬 */
  align?: 'start' | 'center' | 'end';
  /** 탭별 렌더링된 자식 맵 */
  renderedTabChildren?: Map<string, ReactNode>;
}

interface Props extends A2UITabsProps {
  className?: string;
}

export function A2UITabs({
  tabs,
  defaultValue,
  align = 'start',
  renderedTabChildren,
  className,
}: Props) {
  if (!tabs || tabs.length === 0) {
    return null;
  }

  const defaultTab = defaultValue || tabs[0]?.id;

  const alignStyles = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
  };

  return (
    <Tabs defaultValue={defaultTab} className={cn('w-full', className)}>
      <TabsList className={cn('w-full', alignStyles[align])}>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} disabled={tab.disabled}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          {renderedTabChildren?.get(tab.id) || (
            <div className="p-4">{tab.content}</div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
