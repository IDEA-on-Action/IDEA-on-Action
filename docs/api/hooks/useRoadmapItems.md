# useRoadmapItems API Documentation

## Overview

React Query hooks for managing Roadmap Items in the CMS. Roadmap items represent quarterly goals, features, and milestones with status tracking and progress indicators.

**Purpose**: CRUD operations and filtering for roadmap planning
**Location**: Used in admin roadmap management and public roadmap pages
**Dependencies**: React Query, Supabase client, custom query utilities

## Import

```typescript
import {
  useRoadmapItems,
  useRoadmapItem,
  useRoadmapItemsByCategory,
  useRoadmapItemsByStatus,
  usePublishedRoadmapItems,
  useCreateRoadmapItem,
  useUpdateRoadmapItem,
  useDeleteRoadmapItem
} from '@/hooks/useRoadmapItems';
```

## Type Definitions

```typescript
interface RoadmapItem {
  id: string;
  title: string;
  description?: string;
  category: 'service' | 'platform' | 'internal';
  status: 'planned' | 'in-progress' | 'completed' | 'on-hold';
  progress: number; // 0-100
  priority: number;
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  tags: string[];
  published: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

type RoadmapItemInsert = Omit<RoadmapItem, 'id' | 'created_at' | 'updated_at'>;
type RoadmapItemUpdate = Partial<Omit<RoadmapItem, 'id' | 'created_at' | 'updated_at'>>;
```

## API Reference

### Query Hooks

#### useRoadmapItems()

Fetches all roadmap items sorted by priority (high to low), then creation date.

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | RoadmapItem[] | All roadmap items |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |
| refetch | () => void | Manually refetch data |

**Cache Settings**:
- Query Key: `['roadmap-items']`
- Stale Time: 5 minutes

**Example**:
```typescript
const { data: roadmapItems, isLoading } = useRoadmapItems();

return (
  <div>
    {roadmapItems.map(item => (
      <RoadmapCard key={item.id} item={item} />
    ))}
  </div>
);
```

---

#### useRoadmapItem(id)

Fetches a single roadmap item by ID.

**Parameters**:
- `id: string` - UUID of the roadmap item

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | RoadmapItem \| null | Roadmap item or null if not found |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Notes**:
- Query is disabled if `id` is empty
- Returns fallback value `null` if not found

**Example**:
```typescript
const { data: item } = useRoadmapItem(itemId);

if (!item) return <NotFound />;
return <RoadmapDetail item={item} />;
```

---

#### useRoadmapItemsByCategory(category?)

Fetches roadmap items filtered by category.

**Parameters**:
- `category?: 'service' | 'platform' | 'internal'` - Optional category filter

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | RoadmapItem[] | Filtered roadmap items |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Example**:
```typescript
const { data: serviceItems } = useRoadmapItemsByCategory('service');
const { data: allItems } = useRoadmapItemsByCategory(); // No filter
```

---

#### useRoadmapItemsByStatus(status?)

Fetches roadmap items filtered by status.

**Parameters**:
- `status?: 'planned' | 'in-progress' | 'completed' | 'on-hold'` - Optional status filter

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | RoadmapItem[] | Filtered roadmap items |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Example**:
```typescript
const { data: inProgressItems } = useRoadmapItemsByStatus('in-progress');
const { data: completedItems } = useRoadmapItemsByStatus('completed');
```

---

#### usePublishedRoadmapItems()

Fetches only published roadmap items (for public-facing pages).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | RoadmapItem[] | Published roadmap items only |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Cache Settings**:
- Query Key: `['roadmap-items', 'published']`
- Stale Time: 5 minutes

**Example**:
```typescript
// Public roadmap page
const { data: publicRoadmap } = usePublishedRoadmapItems();

return <PublicRoadmapView items={publicRoadmap} />;
```

---

### Mutation Hooks

#### useCreateRoadmapItem()

Creates a new roadmap item (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (data: RoadmapItemInsert) => void | Sync mutation function |
| mutateAsync | (data: RoadmapItemInsert) => Promise<RoadmapItem> | Async mutation function |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Input Type**:
```typescript
type RoadmapItemInsert = {
  title: string;
  description?: string;
  category: 'service' | 'platform' | 'internal';
  status: 'planned' | 'in-progress' | 'completed' | 'on-hold';
  progress: number; // Must be 0-100
  priority: number;
  start_date?: string;
  end_date?: string;
  tags: string[];
  published: boolean;
  created_by?: string | null;
};
```

**Validation**:
- `progress` must be between 0 and 100 (throws Error if invalid)

**Side Effects**:
- Invalidates `['roadmap-items']` query on success

**Error Handling**:
- Throws `Error` if progress is not 0-100
- Throws `PostgrestError` if DB constraints violated

**Example**:
```typescript
const { mutateAsync: createItem, isPending } = useCreateRoadmapItem();

const handleCreate = async (formData: RoadmapItemInsert) => {
  try {
    const newItem = await createItem(formData);
    toast.success('Roadmap item created!');
    navigate(`/admin/roadmap/${newItem.id}`);
  } catch (error) {
    if (error.message.includes('Progress')) {
      toast.error('Progress must be between 0 and 100');
    } else {
      toast.error('Failed to create roadmap item');
    }
  }
};
```

---

#### useUpdateRoadmapItem()

Updates an existing roadmap item (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (params) => void | Sync mutation function |
| mutateAsync | (params) => Promise<RoadmapItem> | Async mutation function |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Input Parameters**:
```typescript
{
  id: string;
  updates: Partial<RoadmapItem>; // All fields optional except id
}
```

**Validation**:
- `progress` must be between 0 and 100 if provided

**Side Effects**:
- Invalidates `['roadmap-items']` query
- Invalidates `['roadmap-items', id]` query for the updated item

**Example**:
```typescript
const { mutateAsync: updateItem } = useUpdateRoadmapItem();

// Update progress
await updateItem({
  id: itemId,
  updates: { progress: 75 }
});

// Update status and progress
await updateItem({
  id: itemId,
  updates: {
    status: 'completed',
    progress: 100
  }
});
```

---

#### useDeleteRoadmapItem()

Deletes a roadmap item (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (id: string) => void | Sync mutation function |
| mutateAsync | (id: string) => Promise<string> | Async mutation function (returns deleted ID) |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Side Effects**:
- Invalidates `['roadmap-items']` query
- Returns the deleted item ID on success

**Example**:
```typescript
const { mutateAsync: deleteItem } = useDeleteRoadmapItem();

const handleDelete = async (itemId: string) => {
  if (!confirm('Delete this roadmap item?')) return;

  try {
    await deleteItem(itemId);
    toast.success('Roadmap item deleted');
  } catch (error) {
    toast.error('Failed to delete');
  }
};
```

---

## Error Handling

**Progress Validation Errors**:
```typescript
try {
  await createItem({ ...data, progress: 150 }); // Invalid!
} catch (error) {
  console.error(error.message); // "Progress must be between 0 and 100"
}
```

**Common Error Scenarios**:
1. **Progress out of range**: Validate `0 <= progress <= 100` before mutation
2. **Missing required fields**: `title`, `category`, `status`, `progress`, `priority` are required
3. **Invalid dates**: `start_date` and `end_date` must be valid YYYY-MM-DD format
4. **Permission denied**: User must have admin role (enforced by RLS)

---

## Cache Invalidation

Query cache is automatically invalidated after mutations:

| Mutation | Invalidated Queries |
|----------|---------------------|
| Create | `['roadmap-items']` |
| Update | `['roadmap-items']`, `['roadmap-items', id]` |
| Delete | `['roadmap-items']` |

**Note**: Published items cache (`['roadmap-items', 'published']`) is NOT automatically invalidated. Manually invalidate if needed:

```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// After toggling published status
await updateItem({ id, updates: { published: !item.published } });
queryClient.invalidateQueries({ queryKey: ['roadmap-items', 'published'] });
```

---

## Best Practices

### 1. Progress Bar UI
Display progress with validation:

```typescript
const ProgressBar = ({ item }: { item: RoadmapItem }) => {
  const clampedProgress = Math.max(0, Math.min(100, item.progress));

  return (
    <div className="w-full bg-gray-200 rounded">
      <div
        className="bg-blue-500 h-2 rounded"
        style={{ width: `${clampedProgress}%` }}
      />
      <span className="text-sm">{clampedProgress}%</span>
    </div>
  );
};
```

### 2. Status Badge Component
Map status to colors:

```typescript
const statusConfig = {
  'planned': { color: 'gray', label: 'Planned' },
  'in-progress': { color: 'blue', label: 'In Progress' },
  'completed': { color: 'green', label: 'Completed' },
  'on-hold': { color: 'yellow', label: 'On Hold' }
};

const StatusBadge = ({ status }: { status: RoadmapItem['status'] }) => {
  const { color, label } = statusConfig[status];
  return <Badge color={color}>{label}</Badge>;
};
```

### 3. Category Filtering UI
```typescript
const categories = ['service', 'platform', 'internal'] as const;

const CategoryFilter = () => {
  const [selected, setSelected] = useState<RoadmapItem['category']>();
  const { data: items } = useRoadmapItemsByCategory(selected);

  return (
    <>
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => setSelected(cat)}
          className={selected === cat ? 'active' : ''}
        >
          {cat}
        </button>
      ))}
    </>
  );
};
```

### 4. Date Range Validation
Ensure start_date is before end_date:

```typescript
const validateDates = (start?: string, end?: string) => {
  if (!start || !end) return true;
  return new Date(start) <= new Date(end);
};

// In form submission
if (!validateDates(formData.start_date, formData.end_date)) {
  toast.error('Start date must be before end date');
  return;
}
```

### 5. Priority Sorting
Display items by priority:

```typescript
const { data: items } = useRoadmapItems();

const sortedItems = useMemo(() => {
  return [...(items || [])].sort((a, b) => {
    // Higher priority first
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    // Then by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}, [items]);
```

---

## Related Documentation

- [Roadmap Type Definitions](d:\GitHub\idea-on-action\src\types\v2.ts)
- [CMS Type Definitions](d:\GitHub\idea-on-action\src\types\cms.types.ts)
- [Admin Roadmap UI Guide](d:\GitHub\idea-on-action\docs\guides\cms\roadmap.md)
- [React Query Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
