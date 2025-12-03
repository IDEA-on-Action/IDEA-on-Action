import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

describe("DateRangePicker", () => {
  it("플레이스홀더 텍스트가 올바르게 표시되어야 한다", () => {
    render(<DateRangePicker placeholder="기간 선택" />);
    expect(screen.getByText("기간 선택")).toBeInTheDocument();
  });

  it("커스텀 플레이스홀더가 없을 때 기본 텍스트가 표시되어야 한다", () => {
    render(<DateRangePicker />);
    expect(screen.getByText("날짜 범위 선택")).toBeInTheDocument();
  });

  it("선택된 날짜 범위가 올바르게 표시되어야 한다", () => {
    const dateRange: DateRange = {
      from: new Date(2025, 0, 1),
      to: new Date(2025, 0, 7),
    };
    render(<DateRangePicker value={dateRange} />);
    expect(screen.getByText(/2025년 01월 01일.*2025년 01월 07일/)).toBeInTheDocument();
  });

  it("disabled 상태일 때 버튼이 비활성화되어야 한다", () => {
    render(<DateRangePicker disabled />);
    const button = screen.getByRole("button", { name: /날짜 범위 선택/ });
    expect(button).toBeDisabled();
  });

  it("onChange 핸들러가 올바르게 호출되어야 한다", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<DateRangePicker onChange={handleChange} />);

    const button = screen.getByRole("button", { name: /날짜 범위 선택/ });
    await user.click(button);

    // 프리셋 버튼 클릭 (오늘)
    const todayButton = await screen.findByText("오늘");
    await user.click(todayButton);

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalled();
      const calledWith = handleChange.mock.calls[0][0] as DateRange;
      expect(calledWith.from).toBeDefined();
      expect(calledWith.to).toBeDefined();
    });
  });

  it("프리셋 버튼이 표시되어야 한다", async () => {
    const user = userEvent.setup();
    render(<DateRangePicker showPresets />);

    const button = screen.getByRole("button", { name: /날짜 범위 선택/ });
    await user.click(button);

    expect(await screen.findByText("오늘")).toBeInTheDocument();
    expect(screen.getByText("지난 7일")).toBeInTheDocument();
    expect(screen.getByText("지난 30일")).toBeInTheDocument();
    expect(screen.getByText("이번 달")).toBeInTheDocument();
    expect(screen.getByText("지난 달")).toBeInTheDocument();
  });

  it("프리셋 버튼이 숨겨질 수 있어야 한다", async () => {
    const user = userEvent.setup();
    render(<DateRangePicker showPresets={false} />);

    const button = screen.getByRole("button", { name: /날짜 범위 선택/ });
    await user.click(button);

    await waitFor(() => {
      expect(screen.queryByText("오늘")).not.toBeInTheDocument();
      expect(screen.queryByText("지난 7일")).not.toBeInTheDocument();
    });
  });

  it("외부 value prop이 변경되면 내부 상태가 업데이트되어야 한다", () => {
    const initialRange: DateRange = {
      from: new Date(2025, 0, 1),
      to: new Date(2025, 0, 7),
    };
    const { rerender } = render(<DateRangePicker value={initialRange} />);
    expect(screen.getByText(/2025년 01월 01일.*2025년 01월 07일/)).toBeInTheDocument();

    const newRange: DateRange = {
      from: new Date(2025, 1, 1),
      to: new Date(2025, 1, 7),
    };
    rerender(<DateRangePicker value={newRange} />);
    expect(screen.getByText(/2025년 02월 01일.*2025년 02월 07일/)).toBeInTheDocument();
  });

  it("시작일만 선택된 경우 종료일 없이 표시되어야 한다", () => {
    const dateRange: DateRange = {
      from: new Date(2025, 0, 1),
    };
    render(<DateRangePicker value={dateRange} />);
    expect(screen.getByText("2025년 01월 01일")).toBeInTheDocument();
  });
});
