import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface FormSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * FormSection - Collapsible section wrapper for admin forms
 *
 * @example
 * ```tsx
 * <FormSection
 *   title="Basic Information"
 *   description="Essential project details"
 *   defaultOpen
 * >
 *   <Input label="Project Name" />
 *   <Textarea label="Description" />
 * </FormSection>
 * ```
 */
export function FormSection({
  title,
  description,
  defaultOpen = false,
  children,
  className,
}: FormSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("space-y-2", className)}
    >
      <div className="flex items-center justify-between space-x-4 px-4">
        <div className="flex-1 space-y-1">
          <h4 className="text-sm font-semibold leading-none">{title}</h4>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            aria-label={isOpen ? "Collapse section" : "Expand section"}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-4 px-4 py-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
