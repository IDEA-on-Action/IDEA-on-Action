/**
 * A2UI Select 컴포넌트
 * 드롭다운 선택
 */

import { useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { A2UIActionHandler } from '../../types';
import { useA2UIFormField } from '../../context';

export interface A2UISelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface A2UISelectProps {
  /** 레이블 */
  label?: string;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 현재 값 */
  value?: string;
  /** 옵션 목록 */
  options?: A2UISelectOption[];
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 필수 여부 */
  required?: boolean;
  /** 데이터 바인딩 경로 */
  bind?: string;
  /** 변경 시 액션 */
  onChange?: {
    action: string;
    data?: Record<string, unknown>;
  };
}

interface Props extends A2UISelectProps {
  className?: string;
  onAction?: A2UIActionHandler;
}

export function A2UISelect({
  label,
  placeholder = '선택하세요',
  value,
  options = [],
  disabled = false,
  required = false,
  bind,
  onChange,
  className,
  onAction,
}: Props) {
  // Context에서 바인딩된 값과 setter 가져오기
  const { value: boundValue, onChange: setBoundValue } = useA2UIFormField(bind);

  // 바인딩된 값 > 직접 전달된 값 > 빈 문자열
  const currentValue = (boundValue as string) ?? value ?? '';

  const handleChange = useCallback(
    (newValue: string) => {
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

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Select value={currentValue} onValueChange={handleChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
