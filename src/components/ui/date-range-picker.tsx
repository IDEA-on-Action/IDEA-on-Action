import * as React from "react";
import { addDays, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The selected date range
   */
  date?: DateRange;
  /**
   * Callback when date range changes
   */
  onDateChange?: (date: DateRange | undefined) => void;
  /**
   * Placeholder text when no date is selected
   */
  placeholder?: string;
  /**
   * Disable future dates
   */
  disableFutureDates?: boolean;
}

const presets = [
  { label: "지난 7일", days: 7 },
  { label: "지난 30일", days: 30 },
  { label: "지난 90일", days: 90 },
  { label: "전체", days: null },
] as const;

export function DateRangePicker({
  className,
  date,
  onDateChange,
  placeholder = "날짜 범위 선택",
  disableFutureDates = false,
  ...props
}: DateRangePickerProps) {
  const [selectedRange, setSelectedRange] = React.useState<DateRange | undefined>(date);

  // Sync internal state with external prop
  React.useEffect(() => {
    setSelectedRange(date);
  }, [date]);

  const handleDateChange = React.useCallback(
    (range: DateRange | undefined) => {
      setSelectedRange(range);
      onDateChange?.(range);
    },
    [onDateChange],
  );

  const handlePresetClick = React.useCallback(
    (days: number | null) => {
      if (days === null) {
        // "전체" preset - clear date range
        handleDateChange(undefined);
      } else {
        // Calculate date range
        const to = new Date();
        const from = addDays(to, -days + 1); // Include today
        handleDateChange({ from, to });
      }
    },
    [handleDateChange],
  );

  const formatDateRange = React.useCallback((range: DateRange | undefined) => {
    if (!range) return placeholder;
    if (!range.from) return placeholder;

    if (range.to) {
      return `${format(range.from, "MMM dd, yyyy")} - ${format(range.to, "MMM dd, yyyy")}`;
    }

    return format(range.from, "MMM dd, yyyy");
  }, [placeholder]);

  return (
    <div className={cn("grid gap-2", className)} {...props}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date-range-picker"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedRange && "text-muted-foreground",
            )}
            aria-label="날짜 범위 선택"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(selectedRange)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="border-b p-3">
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetClick(preset.days)}
                  className={cn(
                    "text-xs",
                    preset.days === null && !selectedRange && "bg-primary text-primary-foreground",
                    preset.days !== null &&
                      selectedRange?.from &&
                      selectedRange?.to &&
                      Math.floor(
                        (selectedRange.to.getTime() - selectedRange.from.getTime()) / (1000 * 60 * 60 * 24),
                      ) ===
                        preset.days - 1 &&
                      "bg-primary text-primary-foreground",
                  )}
                  aria-label={`${preset.label} 선택`}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={selectedRange?.from}
            selected={selectedRange}
            onSelect={handleDateChange}
            numberOfMonths={2}
            disabled={disableFutureDates ? { after: new Date() } : undefined}
            className="p-3"
          />
          {selectedRange?.from && (
            <div className="border-t p-3 text-center text-sm text-muted-foreground">
              {selectedRange.to
                ? `${format(selectedRange.from, "PPP")} - ${format(selectedRange.to, "PPP")}`
                : format(selectedRange.from, "PPP")}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

DateRangePicker.displayName = "DateRangePicker";
