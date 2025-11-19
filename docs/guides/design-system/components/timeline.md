# Timeline Component

## Overview

The Timeline component displays events or milestones in chronological order, perfect for roadmaps, activity logs, and progress tracking.

## Import

```tsx
import {
  Timeline,
  TimelineItem,
  TimelineDot,
  TimelineContent,
  TimelineConnector,
} from "@/components/ui/timeline";
```

## Components

### Timeline (Root)

The root container for timeline items.

**Props:**
- `orientation?: "vertical" | "horizontal"` - Layout direction (default: "vertical")

### TimelineItem

Individual timeline entry.

**Props:**
- `status?: "completed" | "in_progress" | "pending"` - Visual state
- `isLast?: boolean` - Hides connector line for last item

### TimelineDot

Visual indicator (dot or icon) for each timeline item.

**Props:**
- `status?: "completed" | "in_progress" | "pending"` - Color variant
- `icon?: React.ReactNode` - Custom icon (overrides default)

**Default Appearance:**
- `completed`: Green background
- `in_progress`: Blue background (can use animated icon)
- `pending`: Gray background

### TimelineContent

Content area for each timeline item.

**Props:**
- `date?: string | Date` - Event date (formatted automatically)
- `title: string` - Event title (required)
- `description?: string` - Event description
- `children?: React.ReactNode` - Additional content

### TimelineConnector

Connecting line between timeline items (used internally).

**Props:**
- `status?: "completed" | "in_progress" | "pending"` - Line color

---

## Basic Usage

### Simple Timeline

```tsx
<Timeline>
  <TimelineItem status="completed">
    <TimelineDot status="completed">
      <CheckCircle2 className="w-4 h-4" />
    </TimelineDot>
    <TimelineContent
      date="2025-01-15"
      title="프로젝트 시작"
      description="초기 기획 및 설계 완료"
    />
  </TimelineItem>

  <TimelineItem status="in_progress">
    <TimelineDot status="in_progress">
      <Clock className="w-4 h-4 animate-pulse" />
    </TimelineDot>
    <TimelineContent
      date="2025-02-20"
      title="개발 진행 중"
      description="핵심 기능 구현 중"
    />
  </TimelineItem>

  <TimelineItem status="pending" isLast>
    <TimelineDot status="pending">
      <Calendar className="w-4 h-4" />
    </TimelineDot>
    <TimelineContent
      date="2025-03-30"
      title="배포 예정"
      description="프로덕션 배포"
    />
  </TimelineItem>
</Timeline>
```

### With Custom Content

```tsx
<Timeline>
  <TimelineItem status="completed">
    <TimelineDot status="completed">
      <CheckCircle2 className="w-4 h-4" />
    </TimelineDot>
    <TimelineContent
      date={new Date("2025-01-15")}
      title="Phase 1 완료"
    >
      <Badge variant="default" className="mb-2">완료</Badge>
      <ul className="space-y-1 text-sm">
        <li>• 디자인 시스템 구축</li>
        <li>• 인증 시스템 구현</li>
        <li>• E2E 테스트 작성</li>
      </ul>
    </TimelineContent>
  </TimelineItem>

  <TimelineItem status="in_progress" isLast>
    <TimelineDot status="in_progress">
      <Clock className="w-4 h-4 animate-pulse" />
    </TimelineDot>
    <TimelineContent
      date="2025-02-20"
      title="Phase 2 진행 중"
    >
      <Badge variant="secondary" className="mb-2">진행중</Badge>
      <Progress value={65} className="h-2" />
      <p className="text-sm text-muted-foreground mt-2">65% 완료</p>
    </TimelineContent>
  </TimelineItem>
</Timeline>
```

### Roadmap Example

```tsx
import { Timeline, TimelineItem, TimelineDot, TimelineContent } from "@/components/ui/timeline";
import { CheckCircle2, Clock, Calendar } from "lucide-react";

function RoadmapTimeline({ milestones }: { milestones: Milestone[] }) {
  return (
    <Timeline>
      {milestones.map((milestone, index) => (
        <TimelineItem
          key={milestone.id}
          status={milestone.status}
          isLast={index === milestones.length - 1}
        >
          <TimelineDot status={milestone.status}>
            {milestone.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
            {milestone.status === 'in-progress' && <Clock className="w-4 h-4 animate-pulse" />}
            {milestone.status === 'planned' && <Calendar className="w-4 h-4" />}
          </TimelineDot>
          <TimelineContent
            date={milestone.dueDate}
            title={milestone.title}
          >
            <Badge variant={getStatusBadgeVariant(milestone.status)}>
              {getStatusLabel(milestone.status)}
            </Badge>
            {milestone.tasks && (
              <ul className="space-y-2 mt-3">
                {milestone.tasks.map((task, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            )}
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
```

---

## Styling Variants

### Status Colors

Each status has predefined colors:

| Status | Dot Color | Line Color | Use Case |
|--------|-----------|------------|----------|
| `completed` | Green (`bg-green-500`) | Green 30% opacity | Finished milestones |
| `in_progress` | Blue (`bg-blue-500`) | Blue 30% opacity | Active tasks |
| `pending` | Gray (`bg-gray-300`) | Gray solid | Future plans |

### Custom Icons

You can pass any Lucide icon or custom React element:

```tsx
import { Rocket, Award, Code } from "lucide-react";

<TimelineDot status="completed">
  <Rocket className="w-4 h-4" />
</TimelineDot>

<TimelineDot status="in_progress">
  <Code className="w-4 h-4 animate-pulse" />
</TimelineDot>

<TimelineDot status="pending">
  <Award className="w-4 h-4" />
</TimelineDot>
```

### Animated Icons

For in-progress items, use Tailwind's `animate-pulse`:

```tsx
<TimelineDot status="in_progress">
  <Clock className="w-4 h-4 animate-pulse" />
</TimelineDot>
```

---

## Layout Options

### Vertical Timeline (Default)

```tsx
<Timeline orientation="vertical">
  {/* Items stacked vertically */}
</Timeline>
```

**Best for:**
- Roadmaps
- Chronological history
- Activity logs

### Horizontal Timeline (Future)

```tsx
<Timeline orientation="horizontal">
  {/* Items arranged horizontally */}
</Timeline>
```

**Best for:**
- Short timelines (3-5 items)
- Progress indicators
- Stepper components

**Note:** Horizontal orientation is currently experimental. Vertical is recommended for production use.

---

## Accessibility

The Timeline component follows ARIA best practices:

- **Semantic HTML**: Uses `<time>` element for dates
- **ARIA Hidden**: Connector lines marked with `aria-hidden="true"`
- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Screen Reader**: Status and dates announced by screen readers

```tsx
<TimelineContent
  date="2025-01-15"  // Becomes <time datetime="...">
  title="프로젝트 시작"  // Becomes <h3> for proper heading hierarchy
/>
```

---

## Comparison with Other Components

### Timeline vs Accordion

| Feature | Timeline | Accordion |
|---------|----------|-----------|
| Purpose | Chronological display | Collapsible content |
| Structure | Linear, sequential | Hierarchical, expandable |
| Interaction | View only | Click to expand |
| Best for | History, roadmap | FAQs, documentation |

### Timeline vs Steps/Stepper

| Feature | Timeline | Stepper |
|---------|----------|---------|
| Navigation | None | Interactive (go to step) |
| Completion | Visual only | Validates each step |
| Direction | Past → Future | Current step focus |
| Best for | Roadmap, history | Multi-step forms |

---

## Integration with Roadmap

The Timeline component is integrated into the Roadmap page (`src/pages/Roadmap.tsx`) to display quarterly milestones:

**Before (Grid Cards):**
```tsx
<div className="grid md:grid-cols-3 gap-6">
  {milestones.map(milestone => (
    <Card>...</Card>
  ))}
</div>
```

**After (Timeline):**
```tsx
<Timeline>
  {milestones.map((milestone, index) => (
    <TimelineItem
      status={milestone.status}
      isLast={index === milestones.length - 1}
    >
      <TimelineDot status={milestone.status}>
        {/* Icon based on status */}
      </TimelineDot>
      <TimelineContent
        date={milestone.dueDate}
        title={milestone.title}
      >
        {/* Tasks, badges, etc. */}
      </TimelineContent>
    </TimelineItem>
  ))}
</Timeline>
```

**Benefits:**
- ✅ Better chronological visualization
- ✅ Clearer progress flow (past → present → future)
- ✅ Less visual clutter than grid cards
- ✅ Mobile-friendly vertical layout

---

## Future Enhancements

### Planned Features

1. **Horizontal Orientation** - Full support for horizontal timelines
2. **Interactive Mode** - Click timeline items to filter/navigate
3. **Zoom Levels** - Year/Quarter/Month/Day views
4. **Grouping** - Group items by date ranges
5. **Animations** - Smooth transitions when items update

### Customization Options

```tsx
// Future API (not yet implemented)
<Timeline
  orientation="horizontal"
  interactive
  zoomLevel="month"
  onItemClick={(item) => console.log(item)}
>
  <TimelineGroup title="2025 Q1">
    {/* Items */}
  </TimelineGroup>
</Timeline>
```

---

## Best Practices

### Do's ✅

- Use `isLast` prop on the last item to remove connector
- Provide meaningful icons for each status
- Use `animate-pulse` for in-progress items
- Keep titles concise (1-2 lines)
- Format dates consistently (use `Date` objects)
- Limit tasks per item to 3-5 for readability

### Don'ts ❌

- Don't mix vertical and horizontal orientations
- Don't use timeline for non-chronological data
- Don't omit status when using colored dots
- Don't forget to handle empty states
- Don't nest timelines within timelines
- Don't use timeline for step-by-step forms (use Stepper instead)

---

## Examples Gallery

### Activity Log

```tsx
<Timeline>
  <TimelineItem status="completed">
    <TimelineDot status="completed">
      <User className="w-4 h-4" />
    </TimelineDot>
    <TimelineContent
      date={new Date()}
      title="사용자 로그인"
      description="admin@example.com"
    />
  </TimelineItem>

  <TimelineItem status="completed" isLast>
    <TimelineDot status="completed">
      <FileEdit className="w-4 h-4" />
    </TimelineDot>
    <TimelineContent
      date={new Date()}
      title="프로젝트 수정"
      description="MVP 프로젝트 설명 업데이트"
    />
  </TimelineItem>
</Timeline>
```

### Project History

```tsx
<Timeline>
  <TimelineItem status="completed">
    <TimelineDot status="completed">
      <GitCommit className="w-4 h-4" />
    </TimelineDot>
    <TimelineContent
      date="2025-01-15"
      title="Initial Commit"
      description="프로젝트 초기 세팅"
    />
  </TimelineItem>

  <TimelineItem status="completed" isLast>
    <TimelineDot status="completed">
      <Rocket className="w-4 h-4" />
    </TimelineDot>
    <TimelineContent
      date="2025-02-20"
      title="v1.0.0 배포"
      description="프로덕션 첫 배포"
    />
  </TimelineItem>
</Timeline>
```

---

## Technical Details

### Component Structure

```
Timeline (Root)
├── TimelineItem (Wrapper)
│   ├── TimelineDot (Visual indicator)
│   ├── TimelineContent (Text content)
│   └── TimelineConnector (Line, auto-hidden for last item)
```

### CSS Classes

The component uses Tailwind CSS with CVA (Class Variance Authority) for variant management:

- `timelineItemVariants`: Controls item spacing and text color
- `timelineDotVariants`: Controls dot size, position, and color
- `timelineConnectorVariants`: Controls line color and opacity

### File Location

- Component: `src/components/ui/timeline.tsx`
- Usage: `src/pages/Roadmap.tsx`
- Documentation: `docs/guides/design-system/components/timeline.md`

---

## Migration Guide

If you're replacing existing milestone cards with Timeline:

**Before:**
```tsx
<div className="grid md:grid-cols-3 gap-6">
  {milestones.map(milestone => (
    <Card key={milestone.id}>
      <CardHeader>
        <CardTitle>{milestone.title}</CardTitle>
        <Badge>{milestone.status}</Badge>
      </CardHeader>
      <CardContent>
        <p>{milestone.description}</p>
      </CardContent>
    </Card>
  ))}
</div>
```

**After:**
```tsx
<Timeline>
  {milestones.map((milestone, index) => (
    <TimelineItem
      key={milestone.id}
      status={milestone.status}
      isLast={index === milestones.length - 1}
    >
      <TimelineDot status={milestone.status}>
        <StatusIcon status={milestone.status} />
      </TimelineDot>
      <TimelineContent
        date={milestone.date}
        title={milestone.title}
        description={milestone.description}
      />
    </TimelineItem>
  ))}
</Timeline>
```

**Changes:**
1. Grid layout → Vertical timeline
2. Card → TimelineItem
3. Status badge → Status-based dot color
4. Date moved to TimelineContent prop

---

## Related Components

- **[Badge](./badge.md)** - Status indicators used within Timeline
- **[Card](./card.md)** - Container for Timeline (optional)
- **[Progress](./progress.md)** - Progress bars in TimelineContent
- **[Accordion](./accordion.md)** - Collapsible details in Timeline items

---

## Support

For issues or questions:
- **GitHub Issues**: [idea-on-action/issues](https://github.com/IDEA-on-Action/idea-on-action/issues)
- **Documentation**: [Design System Guide](../README.md)
