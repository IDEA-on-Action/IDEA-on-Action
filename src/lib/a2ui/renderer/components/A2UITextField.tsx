/**
 * A2UI TextField 컴포넌트
 * 텍스트 입력 필드
 */

import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { A2UIActionHandler } from '../../types';
import { useA2UIFormField } from '../../context';

export interface A2UITextFieldProps {
  /** 레이블 */
  label?: string;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 현재 값 */
  value?: string;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 필수 여부 */
  required?: boolean;
  /** 입력 타입 */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  /** 데이터 바인딩 경로 */
  bind?: string;
  /** 변경 시 액션 */
  onChange?: {
    action: string;
    data?: Record<string, unknown>;
  };
}

interface Props extends A2UITextFieldProps {
  className?: string;
  onAction?: A2UIActionHandler;
}

export function A2UITextField({
  label,
  placeholder,
  value,
  disabled = false,
  required = false,
  type = 'text',
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
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

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

  const inputId = `a2ui-textfield-${bind || Math.random().toString(36).slice(2)}`;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={inputId}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Input
        id={inputId}
        type={type}
        placeholder={placeholder}
        value={currentValue}
        disabled={disabled}
        required={required}
        onChange={handleChange}
      />
    </div>
  );
}
