# CMS UI Components Guide

**Created**: 2025-11-16
**Agent**: 4 (Common CMS UI Components)
**Phase**: CMS Phase 3 (Admin Features)

## Overview

This document describes 6 reusable UI components for the CMS admin panel, designed to provide a consistent and efficient user experience across all admin pages.

## Components

### 1. DataTable
**File**: `src/components/admin/ui/DataTable.tsx` (320 lines)

**Description**: Advanced data table with TanStack Table v8 integration

**Features**:
- Column sorting (asc/desc/none) with visual indicators
- Column filtering (global search input)
- Row selection (checkbox, select all)
- Pagination (10/20/50/100 per page)
- Column visibility toggle
- Row actions dropdown (Edit/Delete/View)
- Loading skeleton
- Empty state
- Mobile responsive (horizontal scroll)

**Props**:
```typescript
interface DataTableProps<T> {
  columns: ColumnDef<T>[];  // TanStack Table column definitions
  data: T[];                // Table data
  loading?: boolean;        // Show loading skeleton
  pageSize?: number;        // Default rows per page (default: 10)
  onEdit?: (row: T) => void;   // Edit handler
  onDelete?: (row: T) => void; // Delete handler
  onView?: (row: T) => void;   // View handler
  selectable?: boolean;        // Enable row selection
  onSelectionChange?: (rows: T[]) => void; // Selection callback
}
```

**Usage Example**:
```tsx
import { DataTable } from '@/components/admin/ui';
import { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<BlogPost>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
];

<DataTable
  columns={columns}
  data={posts}
  loading={isLoading}
  pageSize={20}
  onEdit={(post) => console.log('Edit:', post)}
  onDelete={(post) => console.log('Delete:', post)}
  selectable
  onSelectionChange={(selected) => console.log('Selected:', selected)}
/>
```

### 2. FormModal
**File**: `src/components/admin/ui/FormModal.tsx` (140 lines)

**Description**: Dialog wrapper for forms with keyboard shortcuts and error handling

**Features**:
- Dialog component (shadcn/ui)
- Title, description, close button
- Footer: Cancel + Submit buttons
- Loading state on submit
- Error alert display
- Keyboard shortcuts (ESC to close, Ctrl/Cmd+Enter to submit)
- Responsive (full screen on mobile)
- Prevent closing during loading

**Props**:
```typescript
interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;       // Form content
  onSubmit: () => Promise<void>;   // Submit handler
  submitLabel?: string;            // Submit button text (default: 'Save')
  cancelLabel?: string;            // Cancel button text (default: 'Cancel')
  loading?: boolean;               // Show loading state
  error?: string;                  // Error message to display
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'; // Modal size (default: 'md')
}
```

**Usage Example**:
```tsx
import { FormModal } from '@/components/admin/ui';
import { useState } from 'react';

const [isOpen, setIsOpen] = useState(false);
const [error, setError] = useState('');
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  setLoading(true);
  setError('');
  try {
    await savePost(formData);
    setIsOpen(false);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

<FormModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Create Blog Post"
  description="Fill in the details below"
  onSubmit={handleSubmit}
  loading={loading}
  error={error}
  size="lg"
>
  {/* Form fields */}
</FormModal>
```

### 3. DateRangePicker
**File**: `src/components/admin/ui/DateRangePicker.tsx` (150 lines)

**Description**: Date range selector with calendar popover and quick presets

**Features**:
- react-day-picker integration
- Start date + End date inputs
- Calendar popover (2 months view)
- Quick presets (Today, Last 7 days, Last 30 days, This month)
- Clear button
- Disable future dates option
- Dark mode support

**Props**:
```typescript
interface DateRangePickerProps {
  value?: DateRange; // { from: Date; to: Date }
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  disableFutureDates?: boolean;  // Prevent selecting future dates
  className?: string;
}
```

**Usage Example**:
```tsx
import { DateRangePicker } from '@/components/admin/ui';
import { useState } from 'react';

const [dateRange, setDateRange] = useState<DateRange>();

<DateRangePicker
  value={dateRange}
  onChange={setDateRange}
  placeholder="Select date range"
  disableFutureDates
/>
```

### 4. MultiSelect
**File**: `src/components/admin/ui/MultiSelect.tsx` (250 lines)

**Description**: Combobox with checkboxes, search, chips, and async loading

**Features**:
- Combobox with checkboxes (shadcn/ui Popover + Command)
- Search input (filter options)
- Select all / Clear all buttons
- Selected count badge
- Chips display (removable)
- Async data loading support
- Create new option (if not exists)
- Max count limit

**Props**:
```typescript
interface MultiSelectProps {
  options: { label: string; value: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  emptyText?: string;              // Empty state text
  loading?: boolean;               // Show loading spinner
  onCreate?: (value: string) => Promise<void>; // Create new option handler
  disabled?: boolean;
  maxCount?: number;               // Max selection limit
  className?: string;
}
```

**Usage Example**:
```tsx
import { MultiSelect } from '@/components/admin/ui';
import { useState } from 'react';

const [selectedTags, setSelectedTags] = useState<string[]>([]);

const tagOptions = [
  { label: 'React', value: 'react' },
  { label: 'TypeScript', value: 'typescript' },
];

const handleCreateTag = async (value: string) => {
  const newTag = await createTag(value);
  // Refresh options
};

<MultiSelect
  options={tagOptions}
  value={selectedTags}
  onChange={setSelectedTags}
  placeholder="Select tags"
  onCreate={handleCreateTag}
  maxCount={5}
/>
```

### 5. ColorPicker
**File**: `src/components/admin/ui/ColorPicker.tsx` (180 lines)

**Description**: Hex color input with preset palette and copy to clipboard

**Features**:
- Color input (hex)
- Color preview swatch
- Popover with preset colors (Tailwind palette)
- Recent colors history (localStorage)
- Copy hex to clipboard button
- Validation (hex format)
- Auto contrast text color

**Props**:
```typescript
interface ColorPickerProps {
  value: string;        // Hex color (e.g., "#3b82f6")
  onChange: (color: string) => void;
  presets?: string[];   // Preset colors (default: Tailwind palette)
  disabled?: boolean;
  className?: string;
}
```

**Usage Example**:
```tsx
import { ColorPicker } from '@/components/admin/ui';
import { useState } from 'react';

const [categoryColor, setCategoryColor] = useState('#3b82f6');

<ColorPicker
  value={categoryColor}
  onChange={setCategoryColor}
  presets={['#3b82f6', '#ef4444', '#10b981']} // Custom presets
/>
```

### 6. ImageUpload
**File**: `src/components/admin/ui/ImageUpload.tsx` (280 lines)

**Description**: Drag & drop image upload with preview, validation, Supabase integration

**Features**:
- Drag & drop zone (react-dropzone)
- File input button
- Image preview (thumbnail grid)
- Progress bar during upload
- File size/type validation (5MB, jpg/png/webp)
- Multiple upload support
- Delete uploaded image
- Alt text input per image
- Error handling

**Props**:
```typescript
interface ImageUploadProps {
  value: string | string[];        // URL or array of URLs
  onChange: (urls: string | string[]) => void;
  multiple?: boolean;              // Allow multiple files
  maxSize?: number;                // Max file size in MB (default: 5)
  accept?: string;                 // Accepted MIME types (default: images)
  onUpload: (file: File) => Promise<string>; // Upload handler (returns URL)
  disabled?: boolean;
  showAltText?: boolean;           // Show alt text input
  className?: string;
}
```

**Usage Example**:
```tsx
import { ImageUpload } from '@/components/admin/ui';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const [thumbnailUrl, setThumbnailUrl] = useState('');

const uploadToSupabase = async (file: File): Promise<string> => {
  const ext = file.name.split('.').pop();
  const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
  const { data, error } = await supabase.storage
    .from('cms-images')
    .upload(filename, file);
  if (error) throw error;
  return supabase.storage.from('cms-images').getPublicUrl(filename).data.publicUrl;
};

<ImageUpload
  value={thumbnailUrl}
  onChange={setThumbnailUrl}
  onUpload={uploadToSupabase}
  maxSize={5}
  accept="image/*"
  showAltText
/>
```

## Utility Functions

**File**: `src/lib/cms-utils.ts` (150 lines)

### File Utilities
```typescript
formatFileSize(bytes: number): string
// Example: formatFileSize(1536000) => "1.5 MB"

validateFileType(file: File, accept: string): boolean
// Example: validateFileType(file, "image/*") => true
```

### Text Utilities
```typescript
generateSlug(title: string): string
// Example: generateSlug("Hello World!") => "hello-world"

truncateText(text: string, length: number): string
// Example: truncateText("Long text...", 10) => "Long text..."
```

### Date Utilities
```typescript
formatDate(dateString: string): string
// Example: formatDate("2025-01-01T00:00:00Z") => "Jan 1, 2025"

formatRelativeTime(dateString: string): string
// Example: formatRelativeTime("2025-01-01T00:00:00Z") => "2 hours ago"
```

### Color Utilities
```typescript
isValidHexColor(color: string): boolean
// Example: isValidHexColor("#3b82f6") => true

getContrastColor(hexColor: string): 'black' | 'white'
// Example: getContrastColor("#3b82f6") => "white"
```

### Other Utilities
```typescript
copyToClipboard(text: string): Promise<void>
// Example: await copyToClipboard("#3b82f6")

debounce<T>(func: T, wait: number): (...args) => void
// Example: const debouncedSearch = debounce(search, 300)
```

## Installation

Dependencies are already installed:
```bash
npm install @tanstack/react-table react-day-picker react-dropzone
```

## Import

All components are exported from a single index:
```tsx
import {
  DataTable,
  FormModal,
  DateRangePicker,
  MultiSelect,
  ColorPicker,
  ImageUpload,
} from '@/components/admin/ui';
```

## Styling

All components use:
- **shadcn/ui primitives** (Dialog, Popover, Command, etc.)
- **Tailwind CSS** for styling
- **Lucide Icons** for icons
- **Dark mode support** (via Tailwind `dark:` classes)

## Accessibility

All components follow WCAG 2.1 AA standards:
- Keyboard navigation (Tab, Enter, Escape, Arrow keys)
- ARIA labels and roles
- Focus management
- Screen reader support

## TypeScript

All components are fully typed with:
- TypeScript strict mode
- Prop interfaces exported
- Generic support (DataTable<T>)
- Type guards (cms-utils)

## Future Enhancements

Potential improvements:
1. **DataTable**: Virtual scrolling for 10,000+ rows
2. **FormModal**: Unsaved changes warning
3. **DateRangePicker**: Time picker support
4. **MultiSelect**: Virtualized list for 1,000+ options
5. **ColorPicker**: Gradient picker
6. **ImageUpload**: Crop/resize modal (react-easy-crop)

## Related Documentation

- [CMS Admin Guide](./admin-guide.md)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [TanStack Table](https://tanstack.com/table/v8)
- [react-day-picker](https://react-day-picker.js.org/)
- [react-dropzone](https://react-dropzone.js.org/)
