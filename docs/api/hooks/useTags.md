# useTags API Documentation

## Overview

React Query hooks for managing global Tags in the CMS. Tags are reusable labels used across all content types (roadmap, portfolio, lab, blog) with automatic usage count tracking.

**Purpose**: CRUD operations and filtering for tag management
**Location**: Admin tag management and content tagging UI
**Dependencies**: React Query, Supabase client, custom query utilities

## Import

```typescript
import {
  useTags,
  useTag,
  useTagBySlug,
  usePopularTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  useIncrementTagUsage
} from '@/hooks/cms/useTags';
```

## Type Definitions

```typescript
interface Tag {
  id: string;
  name: string; // Unique tag name
  slug: string; // Unique URL-friendly identifier
  usage_count: number; // Cached count of tag associations
  created_at: string;
}

type TagInsert = Omit<Tag, 'id' | 'created_at'>;
type TagUpdate = Partial<Omit<Tag, 'id' | 'created_at'>>;
```

## API Reference

### Query Hooks

#### useTags()

Fetches all tags sorted by usage count (most used first), then creation date.

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | Tag[] | All tags |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |
| refetch | () => void | Manually refetch data |

**Cache Settings**:
- Query Key: `['tags']`
- Stale Time: 10 minutes

**Sorting**:
- Primary: `usage_count` DESC (most used first)
- Secondary: `created_at` DESC (newest first)

**Example**:
```typescript
const { data: tags, isLoading } = useTags();

return (
  <div className="tag-cloud">
    {tags.map(tag => (
      <TagBadge key={tag.id} tag={tag} />
    ))}
  </div>
);
```

---

#### useTag(id)

Fetches a single tag by ID.

**Parameters**:
- `id: string` - UUID of the tag

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | Tag \| null | Tag or null if not found |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Notes**:
- Query is disabled if `id` is empty
- Returns fallback value `null` if not found

**Example**:
```typescript
const { data: tag } = useTag(tagId);

if (!tag) return <NotFound />;
return <TagDetail tag={tag} />;
```

---

#### useTagBySlug(slug)

Fetches a single tag by its slug (preferred for public pages).

**Parameters**:
- `slug: string` - Unique URL slug

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | Tag \| null | Tag or null if not found |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Cache Settings**:
- Query Key: `['tags', 'slug', slug]`
- Stale Time: 10 minutes

**Example**:
```typescript
// Public tag page
const { slug } = useParams();
const { data: tag } = useTagBySlug(slug);

if (!tag) return <NotFound />;
return <TagContentList tag={tag} />;
```

---

#### usePopularTags(limit?)

Fetches the most popular tags by usage count.

**Parameters**:
- `limit?: number` - Maximum number of tags to return (default: 10)

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | Tag[] | Top N popular tags |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Cache Settings**:
- Query Key: `['tags', 'popular', limit]`
- Stale Time: 10 minutes

**Example**:
```typescript
// Sidebar popular tags widget
const { data: popularTags } = usePopularTags(5);

return (
  <aside>
    <h3>Popular Tags</h3>
    {popularTags.map(tag => (
      <TagLink key={tag.id} tag={tag} showCount />
    ))}
  </aside>
);
```

---

### Mutation Hooks

#### useCreateTag()

Creates a new tag (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (data: TagInsert) => void | Sync mutation function |
| mutateAsync | (data: TagInsert) => Promise<Tag> | Async mutation function |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Input Type**:
```typescript
type TagInsert = {
  name: string; // Must be unique
  slug: string; // Must be unique
  usage_count: number; // Usually starts at 0
};
```

**Side Effects**:
- Invalidates `['tags']` query on success

**Error Handling**:
- Throws `PostgrestError` if name or slug is not unique (DB constraint)
- Throws error if user lacks admin permissions

**Example**:
```typescript
const { mutateAsync: createTag, isPending } = useCreateTag();

const handleSubmit = async (formData: TagInsert) => {
  try {
    const newTag = await createTag(formData);
    toast.success(`Tag "${newTag.name}" created!`);
  } catch (error) {
    if (error.message.includes('duplicate key')) {
      toast.error('Tag name or slug already exists');
    } else {
      toast.error('Failed to create tag');
    }
  }
};
```

---

#### useUpdateTag()

Updates an existing tag (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (params) => void | Sync mutation function |
| mutateAsync | (params) => Promise<Tag> | Async mutation function |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Input Parameters**:
```typescript
{
  id: string;
  updates: Partial<Tag>; // All fields optional except id and created_at
}
```

**Side Effects**:
- Invalidates `['tags']` query
- Invalidates `['tags', id]` query
- Invalidates `['tags', 'slug', slug]` query

**Example**:
```typescript
const { mutateAsync: updateTag } = useUpdateTag();

// Rename tag
await updateTag({
  id: tagId,
  updates: {
    name: 'New Tag Name',
    slug: 'new-tag-name'
  }
});

// Manually update usage count (rarely needed)
await updateTag({
  id: tagId,
  updates: { usage_count: 42 }
});
```

---

#### useDeleteTag()

Deletes a tag (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (id: string) => void | Sync mutation function |
| mutateAsync | (id: string) => Promise<string> | Async mutation function (returns deleted ID) |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Side Effects**:
- Invalidates `['tags']` query
- Returns the deleted tag ID on success

**Error Handling**:
- May fail if content references this tag (foreign key constraint)
- Recommend removing tag associations before deleting

**Example**:
```typescript
const { mutateAsync: deleteTag } = useDeleteTag();

const handleDelete = async (tagId: string) => {
  const tag = await supabase
    .from('tags')
    .select('usage_count')
    .eq('id', tagId)
    .single();

  if (tag.data.usage_count > 0) {
    toast.error('Cannot delete tag with associations. Remove from content first.');
    return;
  }

  if (!confirm('Delete this tag?')) return;

  try {
    await deleteTag(tagId);
    toast.success('Tag deleted');
  } catch (error) {
    toast.error('Failed to delete');
  }
};
```

---

#### useIncrementTagUsage()

Increments a tag's usage count by 1 (Internal use).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (tagId: string) => void | Sync mutation function |
| mutateAsync | (tagId: string) => Promise<Tag> | Async mutation function |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Side Effects**:
- Invalidates `['tags']` query
- Invalidates `['tags', tagId]` query
- Invalidates `['tags', 'popular']` query (all limit variants)

**Implementation**:
1. Tries to call Supabase RPC `increment_tag_usage(tag_id)`
2. Falls back to manual increment if RPC doesn't exist

**Usage**:
This hook is typically called automatically when tags are associated with content.

**Example**:
```typescript
const { mutateAsync: incrementUsage } = useIncrementTagUsage();

// After adding tag to content
await createRoadmapItem({ tags: ['tag1', 'tag2'], ... });
await Promise.all(['tag1', 'tag2'].map(tagSlug => {
  // Find tag ID by slug and increment
  const tag = await supabase.from('tags').select('id').eq('slug', tagSlug).single();
  return incrementUsage(tag.data.id);
}));
```

---

## Error Handling

**Common Error Scenarios**:
1. **Duplicate name**: Tag names must be unique (case-insensitive recommended)
2. **Duplicate slug**: Slugs must be unique
3. **Tag has associations**: Cannot delete tag with usage_count > 0
4. **RPC fallback**: `increment_tag_usage` RPC may not exist (falls back to manual)

**Slug Validation Example**:
```typescript
const validateSlug = (slug: string): boolean => {
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
| Create | `['tags']` |
| Update | `['tags']`, `['tags', id]`, `['tags', 'slug', slug]` |
| Delete | `['tags']` |
| Increment Usage | `['tags']`, `['tags', id]`, `['tags', 'popular']` |

**Note**: Popular tags cache is only invalidated by `incrementUsage`. Manually invalidate after bulk operations:

```typescript
const queryClient = useQueryClient();

// After bulk tag associations
await Promise.all(tagIds.map(incrementUsage));
queryClient.invalidateQueries({ queryKey: ['tags', 'popular'] });
```

---

## Best Practices

### 1. Tag Autocomplete
Autocomplete tag input with existing tags:

```typescript
const TagInput = ({ value, onChange }: {
  value: string[];
  onChange: (tags: string[]) => void;
}) => {
  const { data: allTags } = useTags();
  const suggestions = allTags?.map(t => t.name) || [];

  return (
    <Autocomplete
      multiple
      value={value}
      options={suggestions}
      onChange={(_, newValue) => onChange(newValue)}
      renderInput={(params) => (
        <TextField {...params} label="Tags" placeholder="Add tags..." />
      )}
    />
  );
};
```

### 2. Slug Generation
Auto-generate slugs from tag names:

```typescript
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

const handleNameChange = (name: string) => {
  const autoSlug = generateSlug(name);
  setFormData({ ...formData, name, slug: autoSlug });
};
```

### 3. Tag Cloud Visualization
Display tags with size based on usage count:

```typescript
const TagCloud = () => {
  const { data: tags } = useTags();

  const maxUsage = Math.max(...(tags?.map(t => t.usage_count) || [1]));
  const minUsage = Math.min(...(tags?.map(t => t.usage_count) || [1]));

  const getFontSize = (usageCount: number) => {
    const normalized = (usageCount - minUsage) / (maxUsage - minUsage);
    return 12 + normalized * 24; // 12px to 36px
  };

  return (
    <div className="tag-cloud">
      {tags?.map(tag => (
        <Link
          key={tag.id}
          to={`/tags/${tag.slug}`}
          style={{ fontSize: `${getFontSize(tag.usage_count)}px` }}
        >
          {tag.name}
        </Link>
      ))}
    </div>
  );
};
```

### 4. Tag Badge Component
Reusable tag badge:

```typescript
const TagBadge = ({ tag, showCount = false }: {
  tag: Tag;
  showCount?: boolean;
}) => (
  <span className="tag-badge">
    #{tag.name}
    {showCount && <span className="count">({tag.usage_count})</span>}
  </span>
);
```

### 5. Popular Tags Widget
Sidebar widget for popular tags:

```typescript
const PopularTagsWidget = ({ limit = 10 }: { limit?: number }) => {
  const { data: popularTags } = usePopularTags(limit);

  return (
    <aside className="popular-tags-widget">
      <h3>Popular Tags</h3>
      <ul>
        {popularTags?.map(tag => (
          <li key={tag.id}>
            <Link to={`/tags/${tag.slug}`}>
              <TagBadge tag={tag} showCount />
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
};
```

### 6. Tag Selection UI
Multi-select tag component:

```typescript
const TagSelector = ({ selectedTags, onChange }: {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}) => {
  const { data: allTags } = useTags();

  const handleToggle = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onChange(selectedTags.filter(t => t !== tagName));
    } else {
      onChange([...selectedTags, tagName]);
    }
  };

  return (
    <div className="tag-selector">
      {allTags?.map(tag => (
        <button
          key={tag.id}
          onClick={() => handleToggle(tag.name)}
          className={selectedTags.includes(tag.name) ? 'selected' : ''}
        >
          <TagBadge tag={tag} />
        </button>
      ))}
    </div>
  );
};
```

### 7. Automatic Tag Creation
Create tags on-the-fly when adding to content:

```typescript
const useTagAssociation = () => {
  const { data: existingTags } = useTags();
  const { mutateAsync: createTag } = useCreateTag();
  const { mutateAsync: incrementUsage } = useIncrementTagUsage();

  const ensureTagsExist = async (tagNames: string[]): Promise<string[]> => {
    const tagIds: string[] = [];

    for (const name of tagNames) {
      // Check if tag exists
      let tag = existingTags?.find(t => t.name === name);

      if (!tag) {
        // Create new tag
        tag = await createTag({
          name,
          slug: generateSlug(name),
          usage_count: 0
        });
      }

      // Increment usage
      await incrementUsage(tag.id);
      tagIds.push(tag.id);
    }

    return tagIds;
  };

  return { ensureTagsExist };
};

// Usage
const handleSubmit = async (formData) => {
  const tagIds = await ensureTagsExist(formData.tagNames);
  await createRoadmapItem({ ...formData, tags: tagIds });
};
```

### 8. Tag Merge Functionality
Merge duplicate tags:

```typescript
const MergeTagsDialog = ({ sourceTag, targetTag }: {
  sourceTag: Tag;
  targetTag: Tag;
}) => {
  const { mutateAsync: deleteTag } = useDeleteTag();
  const { mutateAsync: updateTag } = useUpdateTag();

  const handleMerge = async () => {
    // Update all content using sourceTag to use targetTag
    await supabase
      .from('roadmap_items')
      .update({
        tags: sql`array_replace(tags, ${sourceTag.name}, ${targetTag.name})`
      })
      .contains('tags', [sourceTag.name]);

    // Update target tag usage count
    await updateTag({
      id: targetTag.id,
      updates: {
        usage_count: targetTag.usage_count + sourceTag.usage_count
      }
    });

    // Delete source tag
    await deleteTag(sourceTag.id);
    toast.success(`Merged "${sourceTag.name}" into "${targetTag.name}"`);
  };

  return (
    <Dialog>
      <p>Merge "{sourceTag.name}" ({sourceTag.usage_count} uses) into "{targetTag.name}" ({targetTag.usage_count} uses)?</p>
      <button onClick={handleMerge}>Merge Tags</button>
    </Dialog>
  );
};
```

---

## Related Documentation

- [Tag Type Definitions](d:\GitHub\idea-on-action\src\types\cms.types.ts)
- [Admin Tags UI Guide](d:\GitHub\idea-on-action\docs\guides\cms\tags.md)
- [Content Tagging Best Practices](d:\GitHub\idea-on-action\docs\guides\cms\tagging-strategy.md)
- [Supabase Array Operations](https://supabase.com/docs/guides/database/arrays)
