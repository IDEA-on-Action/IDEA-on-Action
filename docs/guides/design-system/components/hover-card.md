# Hover Card Component

> **Status**: ✅ Active
> **Component**: `src/components/ui/hover-card.tsx`
> **Radix Primitive**: `@radix-ui/react-hover-card`
> **Use Case**: Display rich information on hover (user profiles, previews, etc.)

---

## Overview

The Hover Card component displays contextual information when users hover over a trigger element. It's built on Radix UI's Hover Card primitive and provides a polished, accessible experience for showing additional details.

### Key Features

- **300ms hover delay** - Prevents accidental triggers
- **Smooth animations** - Fade in/out with zoom effect
- **Smart positioning** - Auto-adjusts to viewport boundaries
- **Full accessibility** - ARIA attributes and keyboard navigation
- **Customizable content** - Supports any React elements

---

## When to Use

### ✅ Use Hover Card when:

- **User profiles** - Show bio, avatar, social links on hover
- **Content previews** - Display article/project summary before clicking
- **Contextual help** - Provide extra information without cluttering UI
- **Rich tooltips** - Need more than plain text (images, links, formatting)
- **Desktop-first features** - Primary audience uses mouse/trackpad

### ❌ Avoid Hover Card when:

- **Critical information** - Use visible UI instead (cards, accordions)
- **Mobile-only apps** - Hover doesn't exist on touch devices
- **Short text** - Use Tooltip component for simple labels
- **Interactive forms** - Use Popover for clickable content

---

## Hover Card vs Tooltip

| Feature | Hover Card | Tooltip |
|---------|------------|---------|
| **Content** | Rich (images, links, formatted text) | Plain text only |
| **Trigger** | Hover (300ms delay) | Hover (instant) |
| **Size** | Large (280-400px) | Small (auto-fit) |
| **Use Case** | Profiles, previews, contextual info | Labels, hints, shortcuts |
| **Mobile** | ⚠️ Limited (requires long-press) | ⚠️ Limited (tap once) |
| **Accessibility** | Full ARIA support | Limited (decorative) |

---

## Basic Usage

```tsx
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

<HoverCard>
  <HoverCardTrigger>Hover me</HoverCardTrigger>
  <HoverCardContent>
    <p>Rich content with images, links, etc.</p>
  </HoverCardContent>
</HoverCard>
```

---

## Examples

### 1. Team Member Profile Card

Shows avatar, bio, skills, and social links on hover.

```tsx
import { TeamMemberHoverCard } from "@/components/team/TeamMemberHoverCard";

// In About.tsx
<TeamMemberHoverCard member={teamMember}>
  <h3 className="text-xl font-bold hover:underline cursor-help">
    {teamMember.name}
  </h3>
</TeamMemberHoverCard>
```

**Features**:
- Profile photo with fallback initials
- Name, role, and bio (3-line clamp)
- Skills badges (max 5 visible)
- Social links (GitHub, LinkedIn, Twitter, Website, Email)
- 300ms hover delay for better UX

**Implementation**: `src/components/team/TeamMemberHoverCard.tsx`

---

### 2. Project Preview Card

Shows project thumbnail, description, and tech stack on hover.

```tsx
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";

<HoverCard>
  <HoverCardTrigger asChild>
    <a href={`/portfolio/${project.slug}`} className="hover:underline">
      {project.title}
    </a>
  </HoverCardTrigger>
  <HoverCardContent className="w-80">
    <div className="space-y-2">
      {/* Thumbnail */}
      <img
        src={project.thumbnail}
        alt={project.title}
        className="w-full h-40 object-cover rounded"
      />

      {/* Title & Status */}
      <div className="flex items-start justify-between">
        <h4 className="font-semibold">{project.title}</h4>
        <Badge variant="secondary">{project.status}</Badge>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-2">
        {project.description}
      </p>

      {/* Tech Stack */}
      <div className="flex flex-wrap gap-1">
        {project.techStack.slice(0, 4).map((tech) => (
          <Badge key={tech} variant="outline" className="text-xs">
            {tech}
          </Badge>
        ))}
      </div>
    </div>
  </HoverCardContent>
</HoverCard>
```

---

### 3. Custom Delay & Position

Adjust hover delay and content alignment.

```tsx
<HoverCard openDelay={500} closeDelay={100}>
  <HoverCardTrigger>Slow hover (500ms)</HoverCardTrigger>
  <HoverCardContent align="end" sideOffset={8}>
    <p>Aligned to the right, 8px offset</p>
  </HoverCardContent>
</HoverCard>
```

**Props**:
- `openDelay` (default: 300ms) - Delay before showing
- `closeDelay` (default: 100ms) - Delay before hiding
- `align` - Alignment: `start` | `center` | `end`
- `sideOffset` (default: 4px) - Distance from trigger

---

## API Reference

### HoverCard (Root)

Container component that manages hover state.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `openDelay` | `number` | 300 | Delay before showing (ms) |
| `closeDelay` | `number` | 100 | Delay before hiding (ms) |

---

### HoverCardTrigger

Element that triggers the hover card (usually wrapped with `asChild`).

```tsx
<HoverCardTrigger asChild>
  <button>Hover me</button>
</HoverCardTrigger>
```

**Note**: Use `asChild` to pass hover behavior to child element.

---

### HoverCardContent

Content container with styling and animations.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `align` | `"start" \| "center" \| "end"` | `"center"` | Horizontal alignment |
| `sideOffset` | `number` | 4 | Offset from trigger (px) |
| `className` | `string` | - | Custom Tailwind classes |

**Default width**: `w-64` (256px) - Override with `className="w-80"` etc.

---

## Accessibility

### Keyboard Navigation

- **Escape** - Close hover card
- **Tab** - Move focus (card closes)
- **Shift+Tab** - Reverse focus (card closes)

### ARIA Attributes

The component automatically includes:
- `aria-label` - Descriptive label for screen readers
- `role="dialog"` - Announces as dialog
- `aria-haspopup="dialog"` - Indicates popup behavior

**Example**:

```tsx
<a
  href={member.socialLinks.github}
  aria-label={`${member.name}'s GitHub profile`}
  target="_blank"
  rel="noopener noreferrer"
>
  <Github className="h-4 w-4" />
</a>
```

---

## Mobile Behavior

⚠️ **Hover Cards have limited mobile support** - Consider alternatives:

### Option 1: Hide on Mobile

```tsx
<div className="hidden md:block">
  <HoverCard>{/* Desktop only */}</HoverCard>
</div>
```

### Option 2: Convert to Tap (Popover)

```tsx
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Mobile: Tap to open
// Desktop: Hover to open
<Popover>
  <PopoverTrigger>Tap or hover</PopoverTrigger>
  <PopoverContent>{/* Same content */}</PopoverContent>
</Popover>
```

### Option 3: Always Visible on Mobile

Show the content inline on mobile, hover card on desktop.

```tsx
{/* Mobile: Always visible */}
<div className="md:hidden">
  <Card>{/* Team member info */}</Card>
</div>

{/* Desktop: Hover card */}
<div className="hidden md:block">
  <TeamMemberHoverCard member={member}>
    <h3>{member.name}</h3>
  </TeamMemberHoverCard>
</div>
```

---

## Styling

### Custom Width

```tsx
<HoverCardContent className="w-96">
  {/* Wide content */}
</HoverCardContent>
```

### Custom Colors

```tsx
<HoverCardContent className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary">
  {/* Branded hover card */}
</HoverCardContent>
```

### Glass Effect

```tsx
<HoverCardContent className="glass-card backdrop-blur-lg">
  {/* Glassmorphism style */}
</HoverCardContent>
```

---

## Performance Tips

### 1. Avoid Heavy Content

Don't load images/data until hover:

```tsx
<HoverCard>
  <HoverCardTrigger>Hover</HoverCardTrigger>
  <HoverCardContent>
    {/* ✅ Lazy load images */}
    <img src={image} loading="lazy" />
  </HoverCardContent>
</HoverCard>
```

### 2. Limit Nested Hover Cards

Avoid hover cards inside hover cards - confuses users.

### 3. Use Memoization

Memoize expensive content calculations:

```tsx
const content = useMemo(() => (
  <HoverCardContent>
    {/* Heavy rendering */}
  </HoverCardContent>
), [dependencies]);
```

---

## Common Patterns

### Profile Card with Avatar

```tsx
<HoverCard>
  <HoverCardTrigger asChild>
    <button>@username</button>
  </HoverCardTrigger>
  <HoverCardContent className="w-80">
    <div className="flex gap-4">
      <Avatar>
        <AvatarImage src={user.avatar} />
        <AvatarFallback>{user.initials}</AvatarFallback>
      </Avatar>
      <div className="space-y-1">
        <h4 className="font-semibold">{user.name}</h4>
        <p className="text-sm text-muted-foreground">{user.bio}</p>
      </div>
    </div>
  </HoverCardContent>
</HoverCard>
```

### Link Preview

```tsx
<HoverCard>
  <HoverCardTrigger asChild>
    <a href={article.url}>{article.title}</a>
  </HoverCardTrigger>
  <HoverCardContent>
    <div className="space-y-2">
      <img src={article.thumbnail} className="rounded" />
      <h4 className="font-medium">{article.title}</h4>
      <p className="text-sm text-muted-foreground line-clamp-2">
        {article.excerpt}
      </p>
    </div>
  </HoverCardContent>
</HoverCard>
```

---

## Troubleshooting

### Hover Card Doesn't Show

**Problem**: Card doesn't appear on hover.

**Solutions**:
1. Check `asChild` prop on trigger
2. Verify parent isn't `overflow: hidden`
3. Check z-index conflicts (default: `z-50`)

---

### Content Overflows

**Problem**: Content is cut off or too wide.

**Solutions**:
1. Set custom width: `className="w-80"`
2. Add `max-w-[90vw]` for responsive width
3. Use `line-clamp-3` for long text

---

### Hover Triggers Too Fast

**Problem**: Card appears instantly (annoying).

**Solution**: Increase `openDelay`:

```tsx
<HoverCard openDelay={500}>
  {/* Slower trigger */}
</HoverCard>
```

---

## Related Components

- **[Tooltip](./tooltip.md)** - Simple text hints
- **[Popover](./popover.md)** - Click-triggered content
- **[Dialog](./dialog.md)** - Modal overlays
- **[Avatar](./avatar.md)** - User profile images

---

## References

- **Radix UI Docs**: https://www.radix-ui.com/docs/primitives/components/hover-card
- **shadcn/ui Docs**: https://ui.shadcn.com/docs/components/hover-card
- **ARIA Practices**: https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/

---

**Last Updated**: 2025-11-19
**Component Version**: 1.0.0
**Radix Version**: @radix-ui/react-hover-card@^1.1.2
