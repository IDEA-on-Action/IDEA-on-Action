# useLabItems API Documentation

## Overview

React Query hooks for managing Lab Items in the CMS. Lab items represent experimental projects, ideas, and community-driven initiatives with status tracking and contributor management.

**Purpose**: CRUD operations and filtering for lab experiments
**Location**: Admin lab management and public lab showcase
**Dependencies**: React Query, Supabase client, custom query utilities

## Import

```typescript
import {
  useLabItems,
  useLabItem,
  useLabItemBySlug,
  useLabItemsByCategory,
  useLabItemsByStatus,
  usePublishedLabItems,
  useCreateLabItem,
  useUpdateLabItem,
  useDeleteLabItem
} from '@/hooks/cms/useLabItems';
```

## Type Definitions

```typescript
interface LabItem {
  id: string;
  slug: string; // Unique URL-friendly identifier
  title: string;
  subtitle?: string | null;
  description: string;
  content?: string | null; // Markdown content
  category: 'experiment' | 'idea' | 'community' | 'research';
  status: 'exploring' | 'developing' | 'testing' | 'completed' | 'archived';
  tech_stack: string[]; // Array of technology names
  github_url?: string | null;
  demo_url?: string | null;
  contributors: string[]; // Array of contributor names/IDs
  start_date?: string | null; // YYYY-MM-DD
  tags: string[];
  published: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

type LabItemInsert = Omit<LabItem, 'id' | 'created_at' | 'updated_at'>;
type LabItemUpdate = Partial<Omit<LabItem, 'id' | 'created_at' | 'updated_at'>>;

type LabCategory = 'experiment' | 'idea' | 'community' | 'research';
type LabStatus = 'exploring' | 'developing' | 'testing' | 'completed' | 'archived';
```

## API Reference

### Query Hooks

#### useLabItems()

Fetches all lab items sorted by creation date (newest first).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | LabItem[] | All lab items |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |
| refetch | () => void | Manually refetch data |

**Cache Settings**:
- Query Key: `['lab_items']`
- Stale Time: 5 minutes

**Example**:
```typescript
const { data: labItems, isLoading } = useLabItems();

return (
  <div className="lab-grid">
    {labItems.map(item => (
      <LabCard key={item.id} item={item} />
    ))}
  </div>
);
```

---

#### useLabItem(id)

Fetches a single lab item by ID.

**Parameters**:
- `id: string` - UUID of the lab item

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | LabItem \| null | Lab item or null if not found |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Notes**:
- Query is disabled if `id` is empty
- Returns fallback value `null` if not found

**Example**:
```typescript
const { data: labItem } = useLabItem(itemId);

if (!labItem) return <NotFound />;
return <LabDetail item={labItem} />;
```

---

#### useLabItemBySlug(slug)

Fetches a single lab item by its slug (preferred for public pages).

**Parameters**:
- `slug: string` - Unique URL slug

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | LabItem \| null | Lab item or null if not found |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Cache Settings**:
- Query Key: `['lab_items', 'slug', slug]`
- Stale Time: 5 minutes

**Example**:
```typescript
// Public lab detail page
const { slug } = useParams();
const { data: item } = useLabItemBySlug(slug);

if (!item) return <NotFound />;
return <LabDetailPage item={item} />;
```

---

#### useLabItemsByCategory(category?)

Fetches lab items filtered by category.

**Parameters**:
- `category?: LabCategory` - Optional category filter

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | LabItem[] | Filtered lab items |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Example**:
```typescript
const { data: experiments } = useLabItemsByCategory('experiment');
const { data: ideas } = useLabItemsByCategory('idea');
const { data: allItems } = useLabItemsByCategory(); // No filter
```

---

#### useLabItemsByStatus(status?)

Fetches lab items filtered by status.

**Parameters**:
- `status?: LabStatus` - Optional status filter

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | LabItem[] | Filtered lab items |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Example**:
```typescript
const { data: developingItems } = useLabItemsByStatus('developing');
const { data: completedItems } = useLabItemsByStatus('completed');
```

---

#### usePublishedLabItems()

Fetches only published lab items (for public-facing pages).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | LabItem[] | Published lab items only |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Cache Settings**:
- Query Key: `['lab_items', 'published']`
- Stale Time: 5 minutes

**Example**:
```typescript
// Public lab page
const { data: publicLab } = usePublishedLabItems();

return <LabGrid items={publicLab} />;
```

---

### Mutation Hooks

#### useCreateLabItem()

Creates a new lab item (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (data: LabItemInsert) => void | Sync mutation function |
| mutateAsync | (data: LabItemInsert) => Promise<LabItem> | Async mutation function |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Input Type**:
```typescript
type LabItemInsert = {
  slug: string; // Must be unique
  title: string;
  subtitle?: string | null;
  description: string;
  content?: string | null; // Markdown
  category: LabCategory;
  status: LabStatus;
  tech_stack: string[];
  github_url?: string | null;
  demo_url?: string | null;
  contributors: string[];
  start_date?: string | null;
  tags: string[];
  published: boolean;
  created_by?: string | null;
};
```

**Side Effects**:
- Invalidates `['lab_items']` query on success

**Error Handling**:
- Throws `PostgrestError` if slug is not unique (DB constraint)
- Throws error if user lacks admin permissions

**Example**:
```typescript
const { mutateAsync: createItem, isPending } = useCreateLabItem();

const handleSubmit = async (formData: LabItemInsert) => {
  try {
    const newItem = await createItem(formData);
    toast.success('Lab item created!');
    navigate(`/lab/${newItem.slug}`);
  } catch (error) {
    if (error.message.includes('duplicate key')) {
      toast.error('Slug already exists. Choose a different slug.');
    } else {
      toast.error('Failed to create lab item');
    }
  }
};
```

---

#### useUpdateLabItem()

Updates an existing lab item (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (params) => void | Sync mutation function |
| mutateAsync | (params) => Promise<LabItem> | Async mutation function |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Input Parameters**:
```typescript
{
  id: string;
  updates: Partial<LabItem>; // All fields optional except id
}
```

**Side Effects**:
- Invalidates `['lab_items']` query
- Invalidates `['lab_items', id]` query
- Invalidates `['lab_items', 'slug', slug]` query

**Example**:
```typescript
const { mutateAsync: updateItem } = useUpdateLabItem();

// Update status
await updateItem({
  id: itemId,
  updates: { status: 'completed' }
});

// Add contributor
await updateItem({
  id: itemId,
  updates: {
    contributors: [...item.contributors, 'newContributor']
  }
});
```

---

#### useDeleteLabItem()

Deletes a lab item (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (id: string) => void | Sync mutation function |
| mutateAsync | (id: string) => Promise<string> | Async mutation function (returns deleted ID) |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Side Effects**:
- Invalidates `['lab_items']` query
- Returns the deleted item ID on success

**Example**:
```typescript
const { mutateAsync: deleteItem } = useDeleteLabItem();

const handleDelete = async (itemId: string) => {
  if (!confirm('Delete this lab item?')) return;

  try {
    await deleteItem(itemId);
    toast.success('Lab item deleted');
    navigate('/admin/lab');
  } catch (error) {
    toast.error('Failed to delete');
  }
};
```

---

## Error Handling

**Common Error Scenarios**:
1. **Duplicate slug**: Validate slug uniqueness before creation
2. **Invalid URLs**: Validate `github_url`, `demo_url` format
3. **Empty arrays**: Ensure `tech_stack`, `contributors`, `tags` are valid
4. **Invalid date**: `start_date` must be YYYY-MM-DD format
5. **Markdown content**: Validate markdown syntax in `content` field

**Slug Validation Example**:
```typescript
const validateSlug = (slug: string) => {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
};

// Before creating
if (!validateSlug(formData.slug)) {
  toast.error('Slug must be lowercase, alphanumeric, and hyphen-separated');
  return;
}
```

---

## Cache Invalidation

Query cache is automatically invalidated after mutations:

| Mutation | Invalidated Queries |
|----------|---------------------|
| Create | `['lab_items']` |
| Update | `['lab_items']`, `['lab_items', id]`, `['lab_items', 'slug', slug]` |
| Delete | `['lab_items']` |

**Note**: Published items cache is NOT automatically invalidated. Manually invalidate when toggling:

```typescript
const queryClient = useQueryClient();

// After toggling published
await updateItem({ id, updates: { published: !item.published } });
queryClient.invalidateQueries({ queryKey: ['lab_items', 'published'] });
```

---

## Best Practices

### 1. Category Icons
Map categories to visual icons:

```typescript
const categoryConfig = {
  experiment: { icon: 'flask', color: 'purple', label: 'Experiment' },
  idea: { icon: 'lightbulb', color: 'yellow', label: 'Idea' },
  community: { icon: 'users', color: 'green', label: 'Community' },
  research: { icon: 'microscope', color: 'blue', label: 'Research' }
};

const CategoryBadge = ({ category }: { category: LabCategory }) => {
  const { icon, color, label } = categoryConfig[category];
  return (
    <Badge color={color}>
      <Icon name={icon} /> {label}
    </Badge>
  );
};
```

### 2. Status Timeline
Visualize status progression:

```typescript
const statusOrder: LabStatus[] = [
  'exploring',
  'developing',
  'testing',
  'completed',
  'archived'
];

const StatusTimeline = ({ currentStatus }: { currentStatus: LabStatus }) => {
  const currentIndex = statusOrder.indexOf(currentStatus);

  return (
    <div className="status-timeline">
      {statusOrder.map((status, index) => (
        <div
          key={status}
          className={index <= currentIndex ? 'active' : 'inactive'}
        >
          {status}
        </div>
      ))}
    </div>
  );
};
```

### 3. Contributor Management
Add/remove contributors with validation:

```typescript
const ContributorInput = ({ item, onUpdate }: {
  item: LabItem;
  onUpdate: (contributors: string[]) => void;
}) => {
  const [newContributor, setNewContributor] = useState('');

  const handleAdd = () => {
    if (!newContributor.trim()) return;
    if (item.contributors.includes(newContributor)) {
      toast.error('Contributor already added');
      return;
    }
    onUpdate([...item.contributors, newContributor]);
    setNewContributor('');
  };

  const handleRemove = (contributor: string) => {
    onUpdate(item.contributors.filter(c => c !== contributor));
  };

  return (
    <div>
      <input
        value={newContributor}
        onChange={(e) => setNewContributor(e.target.value)}
        placeholder="Add contributor"
      />
      <button onClick={handleAdd}>Add</button>
      <ul>
        {item.contributors.map(c => (
          <li key={c}>
            {c}
            <button onClick={() => handleRemove(c)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

### 4. Markdown Editor Integration
Use a markdown editor for content:

```typescript
import MarkdownEditor from '@uiw/react-markdown-editor';

const LabContentEditor = ({ value, onChange }: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <MarkdownEditor
    value={value}
    onChange={onChange}
    height="500px"
  />
);

// In form
<LabContentEditor
  value={formData.content || ''}
  onChange={(content) => setFormData({ ...formData, content })}
/>
```

### 5. Tech Stack Tags
Reusable tech stack display:

```typescript
const TechStack = ({ techStack }: { techStack: string[] }) => (
  <div className="tech-stack">
    {techStack.map(tech => (
      <span key={tech} className="tech-tag">
        {tech}
      </span>
    ))}
  </div>
);
```

### 6. GitHub Integration
Display GitHub stats:

```typescript
const GitHubLink = ({ url }: { url?: string | null }) => {
  if (!url) return null;

  const repoName = url.split('github.com/')[1];

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <GithubIcon /> {repoName}
    </a>
  );
};
```

### 7. Demo URL Preview
Show live demo button:

```typescript
const DemoButton = ({ url }: { url?: string | null }) => {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="demo-button"
    >
      View Live Demo
    </a>
  );
};
```

---

## Related Documentation

- [Lab Type Definitions](d:\GitHub\idea-on-action\src\types\cms.types.ts)
- [Markdown Editor Guide](d:\GitHub\idea-on-action\docs\guides\markdown.md)
- [Admin Lab UI Guide](d:\GitHub\idea-on-action\docs\guides\cms\lab.md)
- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
