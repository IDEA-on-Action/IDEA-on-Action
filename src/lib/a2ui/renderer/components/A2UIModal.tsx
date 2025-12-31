/**
 * A2UI Modal 컴포넌트
 * AI 에이전트가 모달 다이얼로그를 렌더링할 수 있게 해주는 컴포넌트
 */

import { useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { A2UIActionHandler, A2UIAction } from '../../types';

export interface A2UIModalProps {
  /** 모달 제목 */
  title: string;
  /** 모달 설명 */
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
  /** 모달 크기 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 렌더링된 자식 컴포넌트 */
  renderedChildren?: ReactNode;
}

interface Props extends A2UIModalProps {
  className?: string;
  onAction?: A2UIActionHandler;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function A2UIModal({
  title,
  description,
  triggerText,
  triggerVariant = 'default',
  content,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  size = 'md',
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
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerText && (
        <DialogTrigger asChild>
          <Button variant={triggerVariant}>{triggerText}</Button>
        </DialogTrigger>
      )}
      <DialogContent className={cn(sizeStyles[size], className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {/* 내용 영역 */}
        {(renderedChildren || content) && (
          <div className="py-4">
            {renderedChildren || content}
          </div>
        )}

        {/* 푸터 버튼 */}
        {hasFooter && (
          <DialogFooter>
            {cancelText && (
              <Button variant="outline" onClick={handleCancel}>
                {cancelText}
              </Button>
            )}
            {confirmText && (
              <Button onClick={handleConfirm}>
                {confirmText}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
