# Collapsible Component

## Overview

The Collapsible component allows content to be expanded and collapsed, useful for organizing large forms or sections of content. It uses Radix UI's `@radix-ui/react-collapsible` primitive.

## Components

### Base Components

- `Collapsible` - Root container
- `CollapsibleTrigger` - Button that toggles the collapsed state
- `CollapsibleContent` - Content that appears/disappears

### FormSection (Wrapper)

A higher-level component that combines Collapsible with a standardized header, description, and chevron icon.

## Installation

```bash
npm install @radix-ui/react-collapsible
```

## Usage

### Basic Collapsible

```tsx
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

function Example() {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button>Toggle</button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p>This content can be expanded and collapsed</p>
      </CollapsibleContent>
    </Collapsible>
  )
}
```

### FormSection Wrapper

The `FormSection` component provides a standardized way to create collapsible form sections with a title, description, and chevron icon.

```tsx
import { FormSection } from "@/components/admin/FormSection"

function MyForm() {
  return (
    <form>
      <FormSection
        title="Basic Information"
        description="Essential project details"
        defaultOpen
      >
        <Input label="Project Name" />
        <Textarea label="Description" />
      </FormSection>

      <FormSection
        title="Advanced Settings"
        description="Optional advanced configuration"
        defaultOpen={false}
      >
        <Input label="API Key" />
        <Input label="Webhook URL" />
      </FormSection>
    </form>
  )
}
```

### Admin Form Example

Real-world example from AdminPortfolio:

```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
    {/* Section 1: Basic Information */}
    <FormSection
      title="기본 정보"
      description="프로젝트명, 요약, 클라이언트 정보를 입력하세요"
      defaultOpen
    >
      <div className="grid grid-cols-2 gap-4">
        <FormField name="slug" />
        <FormField name="title" />
      </div>
      <FormField name="summary" />
    </FormSection>

    {/* Section 2: Project Details */}
    <FormSection
      title="프로젝트 상세"
      description="이미지, 기술 스택, URL, 기간 및 팀 정보를 입력하세요"
      defaultOpen={false}
    >
      <FormField name="tech_stack" />
      <FormField name="duration" />
    </FormSection>
  </form>
</Form>
```

## FormSection Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | Required | Section heading |
| `description` | `string` | Optional | Section description |
| `defaultOpen` | `boolean` | `false` | Initial collapsed state |
| `children` | `React.ReactNode` | Required | Section content |
| `className` | `string` | Optional | Additional CSS classes |

## Accordion vs Collapsible

### When to use Accordion

- **Multiple items, single active**: Only one item can be open at a time
- **FAQ sections**: Common pattern for Q&A
- **Navigation menus**: Expand one category at a time
- **Mutually exclusive content**: Opening one closes others

### When to use Collapsible

- **Independent sections**: Multiple sections can be open simultaneously
- **Form sections**: Users may need to reference multiple sections
- **Progressive disclosure**: Show/hide details without affecting other content
- **Custom triggers**: More flexibility in trigger UI

### Comparison Table

| Feature | Accordion | Collapsible |
|---------|-----------|-------------|
| Multiple open items | ❌ (by default) | ✅ |
| Custom trigger UI | Limited | ✅ Full control |
| Keyboard navigation | ✅ Built-in | ⚠️ Manual |
| ARIA attributes | ✅ Automatic | ⚠️ Manual |
| Use case | FAQs, Menus | Forms, Details |

### Example: Same content, different components

**Accordion (FAQ):**
```tsx
<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>What is React?</AccordionTrigger>
    <AccordionContent>A JavaScript library...</AccordionContent>
  </AccordionItem>
</Accordion>
```

**Collapsible (Form Section):**
```tsx
<FormSection title="Basic Info" defaultOpen>
  <Input name="name" />
</FormSection>
```

## Accessibility

### Built-in Features

- `aria-expanded` attribute automatically managed
- Keyboard support (Space/Enter to toggle)
- Focus management

### Best Practices

1. **Meaningful trigger text**: Use clear, descriptive titles
2. **Visual indicators**: Use chevron icon to show state
3. **Default state**: Consider defaultOpen for critical sections
4. **Nested collapsibles**: Avoid deep nesting (max 2 levels)

## Styling

### Default Styles (FormSection)

- **Header**: Flexbox layout with title/description on left, trigger on right
- **Trigger**: Circular button (h-9 w-9) with hover/focus states
- **Icon**: ChevronDown with rotate-180 transition when open
- **Content**: Padding (px-4 py-4) with space-y-4 for children

### Customization

```tsx
<FormSection
  title="Custom Section"
  className="border-2 border-primary rounded-lg"
>
  <div className="bg-muted p-4">
    Custom styled content
  </div>
</FormSection>
```

## Animation

The CollapsibleContent component uses Radix UI's built-in animation:

```css
/* Automatic height animation */
[data-state='open'] { /* expanded state */ }
[data-state='closed'] { /* collapsed state */ }
```

For custom animations, add Tailwind classes:

```tsx
<CollapsibleContent className="transition-all duration-300 ease-in-out">
  Content
</CollapsibleContent>
```

## Common Patterns

### 1. All sections collapsed by default

```tsx
<FormSection title="Section 1" defaultOpen={false}>...</FormSection>
<FormSection title="Section 2" defaultOpen={false}>...</FormSection>
```

### 2. First section open, others closed

```tsx
<FormSection title="Section 1" defaultOpen>...</FormSection>
<FormSection title="Section 2" defaultOpen={false}>...</FormSection>
```

### 3. Controlled state (all open/close)

```tsx
const [openSections, setOpenSections] = useState({
  basic: true,
  details: false,
  settings: false,
})

<Collapsible
  open={openSections.basic}
  onOpenChange={(open) => setOpenSections(prev => ({ ...prev, basic: open }))}
>
  ...
</Collapsible>
```

### 4. External toggle button

```tsx
<Button onClick={() => setIsOpen(!isOpen)}>
  Toggle All Sections
</Button>
```

## Migration from Accordion

If you have existing Accordion components and want to migrate:

**Before (Accordion):**
```tsx
<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Title</AccordionTrigger>
    <AccordionContent>Content</AccordionContent>
  </AccordionItem>
</Accordion>
```

**After (FormSection):**
```tsx
<FormSection title="Title" defaultOpen>
  Content
</FormSection>
```

**Considerations:**
- Accordion enforces single-open behavior (type="single")
- Collapsible allows multiple sections open simultaneously
- Accordion has better built-in accessibility for FAQ patterns

## Related Components

- **Accordion** (`@/components/ui/accordion`) - FAQ sections, single-open behavior
- **Tabs** (`@/components/ui/tabs`) - Switch between different views
- **Sheet** (`@/components/ui/sheet`) - Slide-in panels
- **Dialog** (`@/components/ui/dialog`) - Modal overlays

## References

- [Radix UI Collapsible](https://www.radix-ui.com/primitives/docs/components/collapsible)
- [ARIA: Disclosure Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
- [FormSection Source](../../src/components/admin/FormSection.tsx)
