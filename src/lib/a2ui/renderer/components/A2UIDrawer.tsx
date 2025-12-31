/**
 * A2UI Drawer 컴포넌트
 * AI 에이전트가 하단 드로어를 렌더링할 수 있게 해주는 컴포넌트
 */

import { useState, type ReactNode } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { A2UIActionHandler, A2UIAction } from '../../types';

export interface A2UIDrawerProps {
  /** 드로어 제목 */
  title: string;
  /** 드로어 설명 */
  description?: string;
  /** 트리거 버튼 텍스트 (없으면 기본 열림) */
  triggerText?: string;
  /** 트리거 버튼 variant */
  triggerVariant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  /** 내용 텍스트 (children이 없을 때 사용) */
  content?: string;
  /** 확인 버튼 텍스트 */
  confirmText?: string;
  /** 취소 버튼 텍스트 */
  cancelText?: string;
  /** 확인 버튼 클릭 액션 */
  onConfirm?: A2UIAction;
  /** 취소 버튼 클릭 액션 */
  onCancel?: A2UIAction;
  /** 렌더링된 자식 컴포넌트 */
  renderedChildren?: ReactNode;
}

interface Props extends A2UIDrawerProps {
  className?: string;
  onAction?: A2UIActionHandler;
}

export function A2UIDrawer({
  title,
  description,
  triggerText,
  triggerVariant = 'default',
  content,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  renderedChildren,
  className,
  onAction,
}: Props) {
  const [open, setOpen] = useState(!triggerText);

  const handleConfirm = () => {
    if (onConfirm && onAction) {
      onAction(onConfirm);
    }
    setOpen(false);
  };

  const handleCancel = () => {
    if (onCancel && onAction) {
      onAction(onCancel);
    }
    setOpen(false);
  };

  const hasFooter = confirmText || cancelText;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {triggerText && (
        <DrawerTrigger asChild>
          <Button variant={triggerVariant}>{triggerText}</Button>
        </DrawerTrigger>
      )}
      <DrawerContent className={cn(className)}>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>

          {/* 내용 영역 */}
          {(renderedChildren || content) && (
            <div className="p-4">
              {renderedChildren || content}
            </div>
          )}

          {/* 푸터 버튼 */}
          {hasFooter && (
            <DrawerFooter>
              {confirmText && (
                <Button onClick={handleConfirm}>
                  {confirmText}
                </Button>
              )}
              {cancelText && (
                <Button variant="outline" onClick={handleCancel}>
                  {cancelText}
                </Button>
              )}
            </DrawerFooter>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
