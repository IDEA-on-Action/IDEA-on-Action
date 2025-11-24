/**
 * AIAssistButton 컴포넌트
 *
 * 재사용 가능한 AI 도우미 버튼
 * - 로딩 상태 표시 (스피너)
 * - 드롭다운 메뉴 (생성 옵션)
 * - 단축키 지원 (Ctrl+Shift+A)
 * - 접근성 (ARIA)
 * - 다크 모드 지원
 *
 * @module components/ai/AIAssistButton
 */

import * as React from "react";
import { Loader2, Sparkles, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AI_OPTIONS, DEFAULT_ENABLED_OPTIONS } from "./ai-options";

// ============================================================================
// Types
// ============================================================================

/**
 * AI 도우미 옵션 타입
 */
export type AIAssistOption =
  | "generateRFP"
  | "analyzeRequirements"
  | "createPlan"
  | "writeReport";

/**
 * AI 옵션 설정
 */
export interface AIOptionConfig {
  /** 옵션 ID */
  id: AIAssistOption;
  /** 표시 라벨 */
  label: string;
  /** 설명 */
  description: string;
  /** 아이콘 */
  icon: React.ComponentType<{ className?: string }>;
  /** 단축키 */
  shortcut?: string;
}

/**
 * AIAssistButton 속성
 */
export interface AIAssistButtonProps {
  /** 클릭 핸들러 (옵션 선택 시) */
  onSelect?: (option: AIAssistOption) => void | Promise<void>;
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 비활성화 상태 */
  disabled?: boolean;
  /** 활성화된 옵션 (로딩 표시용) */
  activeOption?: AIAssistOption | null;
  /** 버튼 크기 */
  size?: "default" | "sm" | "lg" | "icon";
  /** 버튼 변형 */
  variant?: "default" | "outline" | "ghost" | "secondary";
  /** 추가 클래스 */
  className?: string;
  /** 표시할 옵션 필터 */
  enabledOptions?: AIAssistOption[];
  /** 컴팩트 모드 (아이콘만 표시) */
  compact?: boolean;
  /** 툴팁 표시 여부 */
  showTooltip?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * AI 도우미 버튼 컴포넌트
 *
 * @example
 * // 기본 사용
 * <AIAssistButton onSelect={(option) => handleAIAction(option)} />
 *
 * @example
 * // 로딩 상태
 * <AIAssistButton
 *   onSelect={handleSelect}
 *   isLoading={true}
 *   activeOption="generateRFP"
 * />
 *
 * @example
 * // 특정 옵션만 활성화
 * <AIAssistButton
 *   onSelect={handleSelect}
 *   enabledOptions={["generateRFP", "analyzeRequirements"]}
 * />
 */
export const AIAssistButton = React.forwardRef<
  HTMLButtonElement,
  AIAssistButtonProps
>(
  (
    {
      onSelect,
      isLoading = false,
      disabled = false,
      activeOption = null,
      size = "default",
      variant = "default",
      className,
      enabledOptions = DEFAULT_ENABLED_OPTIONS,
      compact = false,
      showTooltip = true,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);

    // 활성화된 옵션 필터링
    const filteredOptions = React.useMemo(
      () => AI_OPTIONS.filter((option) => enabledOptions.includes(option.id)),
      [enabledOptions]
    );

    // 옵션 선택 핸들러
    const handleOptionSelect = React.useCallback(
      async (optionId: AIAssistOption) => {
        if (onSelect) {
          await onSelect(optionId);
        }
      },
      [onSelect]
    );

    // 단축키 핸들러 (Ctrl+Shift+A로 드롭다운 열기)
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        // Ctrl+Shift+A: 드롭다운 토글
        if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "a") {
          event.preventDefault();
          if (!disabled && !isLoading) {
            setIsOpen((prev) => !prev);
          }
        }

        // 드롭다운 열려있을 때 옵션 단축키
        if (isOpen && event.key) {
          const matchedOption = filteredOptions.find(
            (opt) => opt.shortcut?.toLowerCase() === event.key.toLowerCase()
          );
          if (matchedOption) {
            event.preventDefault();
            handleOptionSelect(matchedOption.id);
            setIsOpen(false);
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [disabled, isLoading, isOpen, filteredOptions, handleOptionSelect]);

    // 버튼 내용
    const buttonContent = (
      <>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        )}
        {!compact && (
          <>
            <span className="hidden sm:inline">AI 도우미</span>
            <ChevronDown className="h-3 w-3 opacity-50" aria-hidden="true" />
          </>
        )}
      </>
    );

    // 드롭다운 트리거 버튼
    const triggerButton = (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        disabled={disabled || isLoading}
        className={cn(
          "gap-2",
          // 다크 모드 지원
          "bg-gradient-to-r from-violet-600 to-purple-600",
          "hover:from-violet-700 hover:to-purple-700",
          "dark:from-violet-500 dark:to-purple-500",
          "dark:hover:from-violet-600 dark:hover:to-purple-600",
          "text-white shadow-md",
          "transition-all duration-200",
          // 로딩 상태
          isLoading && "cursor-wait opacity-80",
          className
        )}
        aria-label="AI 도우미 옵션 열기"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {buttonContent}
      </Button>
    );

    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                {triggerButton}
              </DropdownMenuTrigger>
            </TooltipTrigger>
            {showTooltip && !isOpen && (
              <TooltipContent
                side="bottom"
                className="flex items-center gap-2"
              >
                <span>AI 도우미</span>
                <div className="flex gap-0.5">
                  <Kbd>Ctrl</Kbd>
                  <Kbd>Shift</Kbd>
                  <Kbd>A</Kbd>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        <DropdownMenuContent
          align="end"
          className={cn(
            "w-64",
            // 다크 모드 지원
            "bg-white dark:bg-gray-800",
            "border-gray-200 dark:border-gray-700"
          )}
          role="menu"
          aria-label="AI 도우미 옵션"
        >
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            AI 도우미 옵션
          </div>
          <DropdownMenuSeparator />

          {filteredOptions.map((option) => {
            const Icon = option.icon;
            const isActive = activeOption === option.id && isLoading;

            return (
              <DropdownMenuItem
                key={option.id}
                onClick={() => handleOptionSelect(option.id)}
                disabled={isLoading}
                className={cn(
                  "flex flex-col items-start gap-1 py-2",
                  "cursor-pointer",
                  "focus:bg-violet-50 dark:focus:bg-violet-900/20",
                  isActive && "bg-violet-50 dark:bg-violet-900/20"
                )}
                role="menuitem"
                aria-label={option.label}
                aria-describedby={`${option.id}-description`}
              >
                <div className="flex w-full items-center gap-2">
                  {isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin text-violet-600 dark:text-violet-400" />
                  ) : (
                    <Icon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  )}
                  <span className="flex-1 font-medium">{option.label}</span>
                  {option.shortcut && (
                    <DropdownMenuShortcut>
                      <Kbd>{option.shortcut}</Kbd>
                    </DropdownMenuShortcut>
                  )}
                </div>
                <span
                  id={`${option.id}-description`}
                  className="pl-6 text-xs text-muted-foreground"
                >
                  {option.description}
                </span>
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Kbd>Ctrl</Kbd>
              <Kbd>Shift</Kbd>
              <Kbd>A</Kbd>
              <span className="ml-1">로 빠른 접근</span>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

AIAssistButton.displayName = "AIAssistButton";

export default AIAssistButton;
