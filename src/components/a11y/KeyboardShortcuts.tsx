import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { ScreenReaderOnly } from "./ScreenReaderOnly";

interface Shortcut {
  keys: string[];
  description: string;
  category: "Navigation" | "Search" | "General";
}

const shortcuts: Shortcut[] = [
  {
    keys: ["⌘", "K"],
    description: "검색 열기",
    category: "Search",
  },
  {
    keys: ["Esc"],
    description: "다이얼로그/메뉴 닫기",
    category: "General",
  },
  {
    keys: ["Tab"],
    description: "다음 요소로 포커스 이동",
    category: "Navigation",
  },
  {
    keys: ["Shift", "Tab"],
    description: "이전 요소로 포커스 이동",
    category: "Navigation",
  },
  {
    keys: ["Enter"],
    description: "선택/실행",
    category: "General",
  },
  {
    keys: ["Space"],
    description: "체크박스/버튼 토글",
    category: "General",
  },
  {
    keys: ["?"],
    description: "키보드 단축키 도움말 열기",
    category: "General",
  },
];

/**
 * KeyboardShortcuts Component
 *
 * WCAG 2.1 Guideline 2.1.1 - Keyboard Accessible
 * Displays a dialog with keyboard shortcuts help when "?" key is pressed.
 *
 * Features:
 * - Press "?" to open the shortcuts dialog
 * - Press "Esc" to close
 * - Categorized shortcuts (Navigation, Search, General)
 * - Accessible dialog with proper ARIA attributes
 *
 * @example
 * <KeyboardShortcuts />
 *
 * @see https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html
 */
export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open dialog on "?" key (Shift + /)
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Don't trigger if user is typing in an input/textarea
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }

        e.preventDefault();
        setIsOpen(true);
      }

      // Close dialog on "Esc" key
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>키보드 단축키</DialogTitle>
          <DialogDescription>
            키보드로 사이트를 더 빠르게 탐색하세요.
          </DialogDescription>
        </DialogHeader>

        <ScreenReaderOnly as="p">
          이 다이얼로그는 키보드 단축키 목록을 보여줍니다. Escape 키를 눌러 닫을 수 있습니다.
        </ScreenReaderOnly>

        <div className="space-y-6 mt-4">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {category === "Navigation" && "네비게이션"}
                {category === "Search" && "검색"}
                {category === "General" && "일반"}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm text-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1" aria-label={`단축키: ${shortcut.keys.join(" + ")}`}>
                      {shortcut.keys.map((key, keyIndex) => (
                        <Kbd key={keyIndex}>{key}</Kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <strong>팁:</strong> Tab 키로 페이지의 모든 인터랙티브 요소를 순회할 수 있습니다.
            포커스 링이 보이면 키보드로 조작 가능합니다.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
