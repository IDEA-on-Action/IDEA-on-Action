import * as React from "react";
import { cn } from "@/lib/utils";

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

/**
 * Kbd Component
 *
 * Displays keyboard key in a styled container.
 * Used for showing keyboard shortcuts in UI.
 *
 * @example
 * <Kbd>⌘</Kbd>
 * <Kbd>K</Kbd>
 */
const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <kbd
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center",
          "px-2 py-1 min-w-[2rem]",
          "text-xs font-mono font-semibold",
          "bg-muted text-muted-foreground",
          "border border-border rounded",
          "shadow-sm",
          className
        )}
        {...props}
      >
        {children}
      </kbd>
    );
  }
);
Kbd.displayName = "Kbd";

export { Kbd };
