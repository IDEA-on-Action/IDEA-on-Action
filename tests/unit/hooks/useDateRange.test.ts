import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDateRange } from "@/hooks/useDateRange";
import { DateRange } from "react-day-picker";

describe("useDateRange", () => {
  it("초기값 없이 생성할 수 있어야 한다", () => {
    const { result } = renderHook(() => useDateRange());
    expect(result.current.dateRange).toBeUndefined();
    expect(result.current.isValid).toBe(true);
  });

  it("초기값을 설정할 수 있어야 한다", () => {
    const initialValue: DateRange = {
      from: new Date(2025, 0, 1),
      to: new Date(2025, 0, 7),
    };
    const { result } = renderHook(() => useDateRange({ initialValue }));
    expect(result.current.dateRange).toEqual(initialValue);
  });

  it("날짜 범위를 설정할 수 있어야 한다", () => {
    const { result } = renderHook(() => useDateRange());
    const newRange: DateRange = {
      from: new Date(2025, 0, 1),
      to: new Date(2025, 0, 7),
    };

    act(() => {
      result.current.setDateRange(newRange);
    });

    expect(result.current.dateRange).toEqual(newRange);
  });

  it("onChange 콜백이 호출되어야 한다", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useDateRange({ onChange }));
    const newRange: DateRange = {
      from: new Date(2025, 0, 1),
      to: new Date(2025, 0, 7),
    };

    act(() => {
      result.current.setDateRange(newRange);
    });

    expect(onChange).toHaveBeenCalledWith(newRange);
  });

  it("오늘 프리셋을 적용할 수 있어야 한다", () => {
    const { result } = renderHook(() => useDateRange());

    act(() => {
      result.current.applyPreset("today");
    });

    expect(result.current.dateRange?.from).toBeDefined();
    expect(result.current.dateRange?.to).toBeDefined();

    const from = result.current.dateRange!.from!;
    const to = result.current.dateRange!.to!;

    expect(from.toDateString()).toBe(to.toDateString());
    expect(from.getHours()).toBe(0);
    expect(to.getHours()).toBe(23);
  });

  it("지난 7일 프리셋을 적용할 수 있어야 한다", () => {
    const { result } = renderHook(() => useDateRange());

    act(() => {
      result.current.applyPreset("last7days");
    });

    expect(result.current.dateRange?.from).toBeDefined();
    expect(result.current.dateRange?.to).toBeDefined();

    const from = result.current.dateRange!.from!;
    const to = result.current.dateRange!.to!;

    const daysDiff = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysDiff).toBe(6); // 7일 기간 = 6일 차이
  });

  it("지난 30일 프리셋을 적용할 수 있어야 한다", () => {
    const { result } = renderHook(() => useDateRange());

    act(() => {
      result.current.applyPreset("last30days");
    });

    expect(result.current.dateRange?.from).toBeDefined();
    expect(result.current.dateRange?.to).toBeDefined();

    const from = result.current.dateRange!.from!;
    const to = result.current.dateRange!.to!;

    const daysDiff = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysDiff).toBe(29); // 30일 기간 = 29일 차이
  });

  it("이번 달 프리셋을 적용할 수 있어야 한다", () => {
    const { result } = renderHook(() => useDateRange());

    act(() => {
      result.current.applyPreset("thisMonth");
    });

    expect(result.current.dateRange?.from).toBeDefined();
    expect(result.current.dateRange?.to).toBeDefined();

    const from = result.current.dateRange!.from!;
    const to = result.current.dateRange!.to!;

    expect(from.getDate()).toBe(1); // 월의 첫째 날
    expect(from.getMonth()).toBe(to.getMonth()); // 같은 달
  });

  it("지난 달 프리셋을 적용할 수 있어야 한다", () => {
    const { result } = renderHook(() => useDateRange());

    act(() => {
      result.current.applyPreset("lastMonth");
    });

    expect(result.current.dateRange?.from).toBeDefined();
    expect(result.current.dateRange?.to).toBeDefined();

    const from = result.current.dateRange!.from!;
    const to = result.current.dateRange!.to!;

    expect(from.getDate()).toBe(1); // 월의 첫째 날
    expect(from.getMonth()).toBe(to.getMonth()); // 같은 달

    // 지난 달은 현재 월보다 1 작거나 (1월인 경우) 11이어야 함
    const today = new Date();
    const currentMonth = today.getMonth();
    const fromMonth = from.getMonth();

    // 지난 달이 올해 또는 작년에 있을 수 있음
    if (currentMonth === 0) {
      // 1월이면 지난 달은 12월 (11)
      expect(fromMonth).toBe(11);
    } else {
      // 그 외에는 현재 월 - 1
      expect(fromMonth).toBe(currentMonth - 1);
    }
  });

  it("유효한 날짜 범위를 검증해야 한다", () => {
    const { result } = renderHook(() => useDateRange());

    const validRange: DateRange = {
      from: new Date(2025, 0, 1),
      to: new Date(2025, 0, 7),
    };

    act(() => {
      result.current.setDateRange(validRange);
    });

    expect(result.current.isValid).toBe(true);
  });

  it("무효한 날짜 범위를 검증해야 한다", () => {
    const { result } = renderHook(() => useDateRange());

    const invalidRange: DateRange = {
      from: new Date(2025, 0, 7),
      to: new Date(2025, 0, 1), // to가 from보다 이전
    };

    act(() => {
      result.current.setDateRange(invalidRange);
    });

    expect(result.current.isValid).toBe(false);
  });

  it("시작일만 있는 경우 유효해야 한다", () => {
    const { result } = renderHook(() => useDateRange());

    const partialRange: DateRange = {
      from: new Date(2025, 0, 1),
    };

    act(() => {
      result.current.setDateRange(partialRange);
    });

    expect(result.current.isValid).toBe(true);
  });

  it("reset으로 초기값으로 되돌릴 수 있어야 한다", () => {
    const initialValue: DateRange = {
      from: new Date(2025, 0, 1),
      to: new Date(2025, 0, 7),
    };
    const { result } = renderHook(() => useDateRange({ initialValue }));

    const newRange: DateRange = {
      from: new Date(2025, 1, 1),
      to: new Date(2025, 1, 7),
    };

    act(() => {
      result.current.setDateRange(newRange);
    });

    expect(result.current.dateRange).toEqual(newRange);

    act(() => {
      result.current.reset();
    });

    expect(result.current.dateRange).toEqual(initialValue);
  });

  it("초기값이 없는 경우 reset은 undefined로 설정해야 한다", () => {
    const { result } = renderHook(() => useDateRange());

    const newRange: DateRange = {
      from: new Date(2025, 0, 1),
      to: new Date(2025, 0, 7),
    };

    act(() => {
      result.current.setDateRange(newRange);
    });

    expect(result.current.dateRange).toEqual(newRange);

    act(() => {
      result.current.reset();
    });

    expect(result.current.dateRange).toBeUndefined();
  });
});
