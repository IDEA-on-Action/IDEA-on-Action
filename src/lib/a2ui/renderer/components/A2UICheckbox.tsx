/**
 * A2UI Checkbox 컴포넌트
 * 체크박스
 */

import { useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { A2UIActionHandler } from '../../types';
import { useA2UIFormField } from '../../context';

export interface A2UICheckboxProps {
  /** 레이블 */
  label?: string;
  /** 설명 */
  description?: string;
  /** 현재 값 */
  checked?: boolean;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 데이터 바인딩 경로 */
  bind?: string;
  /** 변경 시 액션 */
  onChange?: {
    action: string;
    data?: Record<string, unknown>;
  };
}

interface Props extends A2UICheckboxProps {
  className?: string;
  onAction?: A2UIActionHandler;
}

export function A2UICheckbox({
  label,
  description,
  checked,
  disabled = false,
  bind,
  onChange,
  className,
  onAction,
}: Props) {
  // Context에서 바인딩된 값과 setter 가져오기
  const { value: boundValue, onChange: setBoundValue } = useA2UIFormField(bind);

  // 바인딩된 값 > 직접 전달된 값 > false
  const currentValue = (boundValue as boolean) ?? checked ?? false;

  const handleChange = useCallback(
    (newValue: boolean) => {
      // Context에 값 저장 (데이터 바인딩)
      setBoundValue(newValue);

      // 액션 핸들러 호출
      if (onChange && onAction) {
        onAction({
          action: onChange.action,
          data: {
            ...onChange.data,
            value: newValue,
            bind,
          },
        });
      }
    },
    [onChange, onAction, bind, setBoundValue]
  );

  const checkboxId = `a2ui-checkbox-${bind || Math.random().toString(36).slice(2)}`;

  return (
    <div className={cn('flex items-start space-x-3', className)}>
      <Checkbox
        id={checkboxId}
        checked={currentValue}
        onCheckedChange={handleChange}
        disabled={disabled}
      />
      <div className="grid gap-1.5 leading-none">
        {label && (
          <Label
            htmlFor={checkboxId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </Label>
        )}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
