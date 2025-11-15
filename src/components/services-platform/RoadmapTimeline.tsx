import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TimelineItem {
  quarter: string;
  name: string;
  status: "current" | "coming-soon";
}

interface RoadmapTimelineProps {
  items: TimelineItem[];
}

export default function RoadmapTimeline({ items }: RoadmapTimelineProps) {
  return (
    <div className="relative py-8">
      {/* Timeline line */}
      <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-border -translate-y-1/2" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item, index) => (
          <div key={index} className="relative text-center">
            {/* Timeline node */}
            <div
              className={cn(
                "w-4 h-4 rounded-full mx-auto mb-4 relative z-10 border-2 border-background",
                item.status === "current"
                  ? "bg-primary"
                  : "bg-muted"
              )}
            />

            <div className="text-sm font-medium">{item.quarter}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {item.name}
            </div>
            <Badge
              variant={item.status === "current" ? "default" : "outline"}
              className="mt-2"
            >
              {item.status === "current" ? "현재" : "예정"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
