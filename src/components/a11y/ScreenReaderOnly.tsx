import { cn } from "@/lib/utils";

interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * ScreenReaderOnly Component
 *
 * WCAG 2.1 Guideline 1.3.1 - Info and Relationships
 * Hides content visually while keeping it accessible to screen readers.
 * Uses Tailwind's sr-only utility class.
 *
 * Common use cases:
 * - Form labels that are visually represented by icons
 * - Additional context for screen reader users
 * - Skip navigation links
 * - Descriptive text for icon-only buttons
 *
 * @example
 * <ScreenReaderOnly>
 *   This text is only for screen readers
 * </ScreenReaderOnly>
 *
 * @example
 * <ScreenReaderOnly as="label" htmlFor="search-input">
 *   Search
 * </ScreenReaderOnly>
 *
 * @see https://tailwindcss.com/docs/screen-readers
 * @see https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html
 */
export function ScreenReaderOnly({
  children,
  className,
  as: Component = 'span'
}: ScreenReaderOnlyProps) {
  return (
    <Component
      className={cn(
        // Tailwind's sr-only utility
        // Position absolute, 1px size, hidden overflow, clip to 1px
        "sr-only",
        className
      )}
    >
      {children}
    </Component>
  );
}
