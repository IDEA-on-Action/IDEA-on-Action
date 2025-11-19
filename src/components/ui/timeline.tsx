import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Timeline Variants
const timelineItemVariants = cva("relative pb-8 last:pb-0", {
  variants: {
    status: {
      completed: "text-foreground",
      in_progress: "text-foreground",
      pending: "text-muted-foreground",
    },
  },
  defaultVariants: {
    status: "pending",
  },
});

const timelineDotVariants = cva(
  "absolute left-0 flex h-8 w-8 items-center justify-center rounded-full border-4 border-background",
  {
    variants: {
      status: {
        completed: "bg-green-500 text-white",
        in_progress: "bg-blue-500 text-white",
        pending: "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
);

const timelineConnectorVariants = cva(
  "absolute left-4 top-8 h-full w-px -translate-x-1/2",
  {
    variants: {
      status: {
        completed: "bg-green-500/30",
        in_progress: "bg-blue-500/30",
        pending: "bg-gray-300 dark:bg-gray-600",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
);

// Timeline Root
interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal";
}

const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ className, orientation = "vertical", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative space-y-0",
          orientation === "horizontal" && "flex space-x-8 space-y-0",
          className
        )}
        {...props}
      />
    );
  }
);
Timeline.displayName = "Timeline";

// Timeline Item
interface TimelineItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof timelineItemVariants> {
  isLast?: boolean;
}

const TimelineItem = React.forwardRef<HTMLDivElement, TimelineItemProps>(
  ({ className, status, isLast, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(timelineItemVariants({ status }), className)}
        {...props}
      >
        {children}
        {!isLast && <TimelineConnector status={status} />}
      </div>
    );
  }
);
TimelineItem.displayName = "TimelineItem";

// Timeline Connector (Line)
interface TimelineConnectorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof timelineConnectorVariants> {}

const TimelineConnector = React.forwardRef<
  HTMLDivElement,
  TimelineConnectorProps
>(({ className, status, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(timelineConnectorVariants({ status }), className)}
      aria-hidden="true"
      {...props}
    />
  );
});
TimelineConnector.displayName = "TimelineConnector";

// Timeline Dot
interface TimelineDotProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof timelineDotVariants> {
  icon?: React.ReactNode;
}

const TimelineDot = React.forwardRef<HTMLDivElement, TimelineDotProps>(
  ({ className, status, icon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(timelineDotVariants({ status }), className)}
        {...props}
      >
        {icon || children}
      </div>
    );
  }
);
TimelineDot.displayName = "TimelineDot";

// Timeline Content
interface TimelineContentProps extends React.HTMLAttributes<HTMLDivElement> {
  date?: string | Date;
  title: string;
  description?: string;
}

const TimelineContent = React.forwardRef<HTMLDivElement, TimelineContentProps>(
  ({ className, date, title, description, children, ...props }, ref) => {
    const formattedDate =
      date instanceof Date
        ? date.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : date;

    return (
      <div ref={ref} className={cn("ml-12 space-y-2", className)} {...props}>
        {date && (
          <time className="text-sm text-muted-foreground">{formattedDate}</time>
        )}
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {children}
      </div>
    );
  }
);
TimelineContent.displayName = "TimelineContent";

export {
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineDot,
  TimelineContent,
  type TimelineProps,
  type TimelineItemProps,
  type TimelineConnectorProps,
  type TimelineDotProps,
  type TimelineContentProps,
};
