/**
 * A2UI DatePicker 컴포넌트
 * 날짜 선택기
 */

import { useCallback, useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { A2UIActionHandler } from '../../types';
import { useA2UIFormField } from '../../context';

export interface A2UIDatePickerProps {
  /** 레이블 */
  label?: string;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 현재 값 (ISO 문자열) */
  value?: string;
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

interface Props extends A2UIDatePickerProps {
  className?: string;
  onAction?: A2UIActionHandler;
}

export function A2UIDatePicker({
  label,
  placeholder = '날짜 선택',
  value,
  disabled = false,
  required = false,
  bind,
  onChange,
  className,
  onAction,
}: Props) {
  const [open, setOpen] = useState(false);

  // Context에서 바인딩된 값과 setter 가져오기
  const { value: boundValue, onChange: setBoundValue } = useA2UIFormField(bind);

  // 바인딩된 값 > 직접 전달된 값
  const currentValue = (boundValue as string) ?? value;
  const date = currentValue ? new Date(currentValue) : undefined;

  const handleSelect = useCallback(
    (selectedDate: Date | undefined) => {
      const newValue = selectedDate?.toISOString() || '';

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

      setOpen(false);
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, 'PPP', { locale: ko }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            locale={ko}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
