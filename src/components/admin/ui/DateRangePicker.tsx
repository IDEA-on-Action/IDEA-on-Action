/**
 * DateRangePicker Component
 * Date range selector with calendar popover and quick presets
 */

import React, { useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, startOfToday } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  disableFutureDates?: boolean;
  className?: string;
}

type Preset = {
  label: string;
  getValue: () => DateRange;
};

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Pick a date range',
  disabled = false,
  disableFutureDates = false,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Presets
  const presets: Preset[] = [
    {
      label: 'Today',
      getValue: () => {
        const today = startOfToday();
        return { from: today, to: today };
      },
    },
    {
      label: 'Last 7 days',
      getValue: () => ({
        from: subDays(new Date(), 6),
        to: new Date(),
      }),
    },
    {
      label: 'Last 30 days',
      getValue: () => ({
        from: subDays(new Date(), 29),
        to: new Date(),
      }),
    },
    {
      label: 'This month',
      getValue: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      }),
    },
  ];

  const handlePresetClick = (preset: Preset) => {
    onChange(preset.getValue());
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(undefined);
  };

  const formatDateRange = (range: DateRange | undefined): string => {
    if (!range?.from) return placeholder;
    if (!range.to) return format(range.from, 'LLL dd, y');
    return `${format(range.from, 'LLL dd, y')} - ${format(range.to, 'LLL dd, y')}`;
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Presets */}
            <div className="border-r p-2 space-y-1">
              <div className="text-xs font-medium text-muted-foreground px-2 py-1">Presets</div>
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start font-normal"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Calendar */}
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={value?.from}
                selected={value}
                onSelect={onChange}
                numberOfMonths={2}
                disabled={disableFutureDates ? { after: new Date() } : false}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear button */}
      {value && !disabled && (
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={handleClear}
          aria-label="Clear date range"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
