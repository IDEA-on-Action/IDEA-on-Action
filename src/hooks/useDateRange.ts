import { useState, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { DateRangePreset } from "@/components/ui/date-range-picker";

export interface UseDateRangeOptions {
  /**
   * 초기 날짜 범위
   */
  initialValue?: DateRange;
  /**
   * 날짜 범위 변경 시 콜백
   */
  onChange?: (range: DateRange | undefined) => void;
}

export interface UseDateRangeReturn {
  /**
   * 현재 선택된 날짜 범위
   */
  dateRange: DateRange | undefined;
  /**
   * 날짜 범위 설정
   */
  setDateRange: (range: DateRange | undefined) => void;
  /**
   * 프리셋 적용
   */
  applyPreset: (preset: DateRangePreset) => void;
  /**
   * 날짜 범위 유효성 검사
   */
  isValid: boolean;
  /**
   * 날짜 범위 초기화
   */
  reset: () => void;
}

/**
 * 날짜 범위 상태 관리 훅
 * @param options - 훅 옵션
 * @returns 날짜 범위 상태 및 관리 함수들
 */
export function useDateRange(options: UseDateRangeOptions = {}): UseDateRangeReturn {
  const { initialValue, onChange } = options;
  const [dateRange, setDateRangeState] = useState<DateRange | undefined>(initialValue);

  const setDateRange = useCallback(
    (range: DateRange | undefined) => {
      setDateRangeState(range);
      onChange?.(range);
    },
    [onChange],
  );

  const applyPreset = useCallback(
    (preset: DateRangePreset) => {
      const today = new Date();
      const from = new Date();
      let to = new Date(today);

      switch (preset) {
        case "today":
          from.setHours(0, 0, 0, 0);
          to = new Date(from);
          to.setHours(23, 59, 59, 999);
          break;
        case "last7days":
          from.setDate(today.getDate() - 6);
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          break;
        case "last30days":
          from.setDate(today.getDate() - 29);
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          break;
        case "thisMonth":
          from.setDate(1);
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          break;
        case "lastMonth":
          // 월말 날짜 문제 방지: setDate(1)을 먼저 호출
          from.setDate(1);
          from.setMonth(today.getMonth() - 1);
          from.setHours(0, 0, 0, 0);
          to = new Date(from.getFullYear(), from.getMonth() + 1, 0);
          to.setHours(23, 59, 59, 999);
          break;
      }

      const range = { from, to };
      setDateRange(range);
    },
    [setDateRange],
  );

  const isValid = useCallback(() => {
    if (!dateRange) return true;
    if (!dateRange.from) return false;
    if (!dateRange.to) return true; // 시작일만 있는 경우도 유효

    // 시작일이 종료일보다 늦으면 유효하지 않음
    return dateRange.from <= dateRange.to;
  }, [dateRange])();

  const reset = useCallback(() => {
    setDateRange(initialValue);
  }, [initialValue, setDateRange]);

  return {
    dateRange,
    setDateRange,
    applyPreset,
    isValid,
    reset,
  };
}
