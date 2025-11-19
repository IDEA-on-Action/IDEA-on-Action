import { cn } from "@/lib/utils";

interface SkipToContentProps {
  targetId?: string;
  className?: string;
}

/**
 * SkipToContent Component
 *
 * WCAG 2.1 Guideline 2.4.1 - Bypass Blocks
 * Provides a "Skip to main content" link that appears on Tab key focus.
 * This allows keyboard users to bypass repetitive navigation elements.
 *
 * @example
 * <SkipToContent targetId="main-content" />
 *
 * @see https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html
 */
export function SkipToContent({
  targetId = "main-content",
  className
}: SkipToContentProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);

    if (target) {
      // Move focus to the target element
      target.focus();

      // Scroll to the target element
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={cn(
        // Position absolutely at the top-left
        "absolute top-0 left-0 z-50",
        // Hide visually by default (off-screen)
        "-translate-x-full",
        // Show when focused (on Tab key)
        "focus:translate-x-0",
        // Styling
        "bg-primary text-primary-foreground",
        "px-4 py-2 m-2 rounded-md",
        "font-medium text-sm",
        // Focus ring (WCAG 2.1 - Focus Visible)
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        // Smooth transition
        "transition-transform duration-200 ease-in-out",
        // Custom className override
        className
      )}
    >
      본문으로 바로가기
    </a>
  );
}
