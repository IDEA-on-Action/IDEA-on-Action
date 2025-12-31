/**
 * A2UI Accordion 컴포넌트
 * AI 에이전트가 접이식 패널을 렌더링할 수 있게 해주는 컴포넌트
 */

import type { ReactNode } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

/** 아코디언 아이템 정의 */
export interface A2UIAccordionItemDef {
  /** 아이템 고유 ID */
  id: string;
  /** 트리거 제목 */
  title: string;
  /** 내용 텍스트 (children이 없을 때 사용) */
  content?: string;
}

export interface A2UIAccordionProps {
  /** 아코디언 아이템 배열 */
  items: A2UIAccordionItemDef[];
  /** 타입: single(하나만 열림), multiple(여러 개 열림) */
  type?: 'single' | 'multiple';
  /** 기본 열린 아이템 ID (single: string, multiple: string[]) */
  defaultValue?: string | string[];
  /** 모두 닫을 수 있는지 여부 (type='single'일 때만) */
  collapsible?: boolean;
  /** 렌더링된 자식 컴포넌트 (아이템별 content 대신 사용) */
  renderedChildren?: ReactNode;
  /** 아이템별 렌더링된 자식 맵 */
  renderedItemChildren?: Map<string, ReactNode>;
}

interface Props extends A2UIAccordionProps {
  className?: string;
}

export function A2UIAccordion({
  items,
  type = 'single',
  defaultValue,
  collapsible = true,
  renderedItemChildren,
  className,
}: Props) {
  if (!items || items.length === 0) {
    return null;
  }

  // single 타입
  if (type === 'single') {
    return (
      <Accordion
        type="single"
        defaultValue={typeof defaultValue === 'string' ? defaultValue : defaultValue?.[0]}
        collapsible={collapsible}
        className={cn('w-full', className)}
      >
        {items.map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger>{item.title}</AccordionTrigger>
            <AccordionContent>
              {renderedItemChildren?.get(item.id) || item.content || ''}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  }

  // multiple 타입
  return (
    <Accordion
      type="multiple"
      defaultValue={Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []}
      className={cn('w-full', className)}
    >
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionContent>
            {renderedItemChildren?.get(item.id) || item.content || ''}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
