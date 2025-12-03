import * as React from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * 선택된 날짜 범위
   */
  value?: DateRange;
  /**
   * 날짜 범위 변경 핸들러
   */
  onChange?: (date: DateRange | undefined) => void;
  /**
   * 프리셋 버튼 표시 여부
   */
  showPresets?: boolean;
  /**
   * 비활성화 여부
   */
  disabled?: boolean;
  /**
   * 플레이스홀더 텍스트
   */
  placeholder?: string;
  /**
   * 미래 날짜 비활성화 여부
   */
  disableFutureDates?: boolean;
}

export type DateRangePreset = "today" | "last7days" | "last30days" | "thisMonth" | "lastMonth";

const presets = [
  { label: "오늘", value: "today" as DateRangePreset },
  { label: "지난 7일", value: "last7days" as DateRangePreset },
  { label: "지난 30일", value: "last30days" as DateRangePreset },
  { label: "이번 달", value: "thisMonth" as DateRangePreset },
  { label: "지난 달", value: "lastMonth" as DateRangePreset },
] as const;

export function DateRangePicker({
  className,
  value,
  onChange,
  showPresets = true,
  disabled = false,
  placeholder = "날짜 범위 선택",
  disableFutureDates = false,
  ...props
}: DateRangePickerProps) {
  const [selectedRange, setSelectedRange] = React.useState<DateRange | undefined>(value);

  // Sync internal state with external prop
  React.useEffect(() => {
    setSelectedRange(value);
  }, [value]);

  const handleDateChange = React.useCallback(
    (range: DateRange | undefined) => {
      setSelectedRange(range);
      onChange?.(range);
    },
    [onChange],
  );

  const applyPreset = React.useCallback(
    (preset: DateRangePreset) => {
      const today = new Date();
      const from = new Date();
      let to = today;

      switch (preset) {
        case "today":
          from.setHours(0, 0, 0, 0);
          to = new Date(from);
          to.setHours(23, 59, 59, 999);
          break;
        case "last7days":
          from.setDate(today.getDate() - 6);
          from.setHours(0, 0, 0, 0);
          break;
        case "last30days":
          from.setDate(today.getDate() - 29);
          from.setHours(0, 0, 0, 0);
          break;
        case "thisMonth":
          from.setDate(1);
          from.setHours(0, 0, 0, 0);
          break;
        case "lastMonth":
          from.setMonth(today.getMonth() - 1);
          from.setDate(1);
          from.setHours(0, 0, 0, 0);
          to = new Date(from.getFullYear(), from.getMonth() + 1, 0);
          to.setHours(23, 59, 59, 999);
          break;
      }

      const range = { from, to };
      handleDateChange(range);
    },
    [handleDateChange],
  );

  const formatDateRange = React.useCallback((range: DateRange | undefined) => {
    if (!range) return placeholder;
    if (!range.from) return placeholder;

    if (range.to) {
      return `${format(range.from, "yyyy년 MM월 dd일", { locale: ko })} - ${format(range.to, "yyyy년 MM월 dd일", { locale: ko })}`;
    }

    return format(range.from, "yyyy년 MM월 dd일", { locale: ko });
  }, [placeholder]);

  return (
    <div className={cn("grid gap-2", className)} {...props}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date-range-picker"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !selectedRange && "text-muted-foreground",
            )}
            aria-label="날짜 범위 선택"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(selectedRange)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {showPresets && (
              <div className="flex flex-col gap-2 border-r p-3">
                <div className="text-xs font-medium text-muted-foreground mb-1">프리셋</div>
                {presets.map((preset) => (
                  <Button
                    key={preset.value}
                    variant="ghost"
                    size="sm"
                    className="justify-start font-normal"
                    onClick={() => applyPreset(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            )}
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={selectedRange?.from}
                selected={selectedRange}
                onSelect={handleDateChange}
                numberOfMonths={2}
                disabled={disableFutureDates ? { after: new Date() } : undefined}
                locale={ko}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

DateRangePicker.displayName = "DateRangePicker";
