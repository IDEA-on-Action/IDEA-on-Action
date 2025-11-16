# useBlogCategories API Documentation

## Overview

React Query hooks for managing Blog Categories in the CMS. Blog categories organize blog posts with color-coded labels, icons, and automatic post count tracking.

**Purpose**: CRUD operations and filtering for blog category management
**Location**: Admin blog category pages and public blog navigation
**Dependencies**: React Query, Supabase client, custom query utilities

## Import

```typescript
import {
  useBlogCategories,
  useBlogCategory,
  useBlogCategoryBySlug,
  useCreateBlogCategory,
  useUpdateBlogCategory,
  useDeleteBlogCategory,
  useUpdateCategoryPostCount
} from '@/hooks/cms/useBlogCategories';
```

## Type Definitions

```typescript
interface BlogCategory {
  id: string;
  name: string;
  slug: string; // Unique URL-friendly identifier
  description?: string | null;
  color: string; // Hex color code (default: #3b82f6)
  icon: string; // Icon name (default: folder)
  post_count: number; // Cached count of blog posts
  created_at: string;
  updated_at: string;
}

type BlogCategoryInsert = Omit<BlogCategory, 'id' | 'created_at' | 'updated_at'>;
type BlogCategoryUpdate = Partial<Omit<BlogCategory, 'id' | 'created_at' | 'updated_at'>>;
```

## API Reference

### Query Hooks

#### useBlogCategories()

Fetches all blog categories sorted by name (alphabetically).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | BlogCategory[] | All blog categories |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |
| refetch | () => void | Manually refetch data |

**Cache Settings**:
- Query Key: `['blog_categories']`
- Stale Time: 10 minutes (categories are relatively static)

**Example**:
```typescript
const { data: categories, isLoading } = useBlogCategories();

return (
  <nav>
    {categories.map(category => (
      <CategoryLink key={category.id} category={category} />
    ))}
  </nav>
);
```

---

#### useBlogCategory(id)

Fetches a single blog category by ID.

**Parameters**:
- `id: string` - UUID of the blog category

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | BlogCategory \| null | Blog category or null if not found |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Notes**:
- Query is disabled if `id` is empty
- Returns fallback value `null` if not found

**Example**:
```typescript
const { data: category } = useBlogCategory(categoryId);

if (!category) return <NotFound />;
return <CategoryDetail category={category} />;
```

---

#### useBlogCategoryBySlug(slug)

Fetches a single blog category by its slug (preferred for public pages).

**Parameters**:
- `slug: string` - Unique URL slug

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | BlogCategory \| null | Blog category or null if not found |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Cache Settings**:
- Query Key: `['blog_categories', 'slug', slug]`
- Stale Time: 10 minutes

**Example**:
```typescript
// Public category page
const { slug } = useParams();
const { data: category } = useBlogCategoryBySlug(slug);

if (!category) return <NotFound />;
return <CategoryBlogList category={category} />;
```

---

### Mutation Hooks

#### useCreateBlogCategory()

Creates a new blog category (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (data: BlogCategoryInsert) => void | Sync mutation function |
| mutateAsync | (data: BlogCategoryInsert) => Promise<BlogCategory> | Async mutation function |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Input Type**:
```typescript
type BlogCategoryInsert = {
  name: string;
  slug: string; // Must be unique
  description?: string | null;
  color: string; // Hex code: #RRGGBB
  icon: string; // Icon name
  post_count: number; // Usually starts at 0
};
```

**Validation**:
- `color` must match hex color format `#RRGGBB` (throws Error if invalid)

**Side Effects**:
- Invalidates `['blog_categories']` query on success

**Error Handling**:
- Throws `Error` if color is invalid hex code
- Throws `PostgrestError` if slug is not unique (DB constraint)
- Throws error if user lacks admin permissions

**Example**:
```typescript
const { mutateAsync: createCategory, isPending } = useCreateBlogCategory();

const handleSubmit = async (formData: BlogCategoryInsert) => {
  try {
    const newCategory = await createCategory(formData);
    toast.success(`Category "${newCategory.name}" created!`);
    navigate('/admin/blog/categories');
  } catch (error) {
    if (error.message.includes('Invalid hex color')) {
      toast.error('Color must be in #RRGGBB format');
    } else if (error.message.includes('duplicate key')) {
      toast.error('Slug already exists');
    } else {
      toast.error('Failed to create category');
    }
  }
};
```

---

#### useUpdateBlogCategory()

Updates an existing blog category (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (params) => void | Sync mutation function |
| mutateAsync | (params) => Promise<BlogCategory> | Async mutation function |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Input Parameters**:
```typescript
{
  id: string;
  updates: Partial<BlogCategory>; // All fields optional except id
}
```

**Validation**:
- `color` must match hex color format `#RRGGBB` if provided

**Side Effects**:
- Invalidates `['blog_categories']` query
- Invalidates `['blog_categories', id]` query
- Invalidates `['blog_categories', 'slug', slug]` query

**Example**:
```typescript
const { mutateAsync: updateCategory } = useUpdateBlogCategory();

// Update color
await updateCategory({
  id: categoryId,
  updates: { color: '#ff6b6b' }
});

// Update name and slug
await updateCategory({
  id: categoryId,
  updates: {
    name: 'New Category Name',
    slug: 'new-category-name'
  }
});
```

---

#### useDeleteBlogCategory()

Deletes a blog category (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (id: string) => void | Sync mutation function |
| mutateAsync | (id: string) => Promise<string> | Async mutation function (returns deleted ID) |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Side Effects**:
- Invalidates `['blog_categories']` query
- Returns the deleted category ID on success

**Error Handling**:
- May fail if blog posts reference this category (foreign key constraint)
- Recommend reassigning posts before deleting category

**Example**:
```typescript
const { mutateAsync: deleteCategory } = useDeleteBlogCategory();

const handleDelete = async (categoryId: string) => {
  // Check if category has posts
  const category = await supabase
    .from('blog_categories')
    .select('post_count')
    .eq('id', categoryId)
    .single();

  if (category.data.post_count > 0) {
    toast.error('Cannot delete category with posts. Reassign posts first.');
    return;
  }

  if (!confirm('Delete this category?')) return;

  try {
    await deleteCategory(categoryId);
    toast.success('Category deleted');
  } catch (error) {
    toast.error('Failed to delete');
  }
};
```

---

#### useUpdateCategoryPostCount()

Updates the cached post count for a category (Internal use).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (params) => void | Sync mutation function |
| mutateAsync | (params) => Promise<BlogCategory> | Async mutation function |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Input Parameters**:
```typescript
{
  id: string;
  count: number;
}
```

**Side Effects**:
- Invalidates `['blog_categories']` query
- Invalidates `['blog_categories', id]` query

**Usage**:
This hook is typically called automatically when blog posts are created or deleted to keep the cache in sync.

**Example**:
```typescript
const { mutateAsync: updatePostCount } = useUpdateCategoryPostCount();

// After creating a blog post
await createBlogPost({ category_id: categoryId, ... });
await updatePostCount({ id: categoryId, count: category.post_count + 1 });

// After deleting a blog post
await deleteBlogPost(postId);
await updatePostCount({ id: categoryId, count: category.post_count - 1 });
```

---

## Error Handling

**Hex Color Validation**:
```typescript
const validateHexColor = (color: string): boolean => {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
};

// Before creating/updating
if (!validateHexColor(formData.color)) {
  toast.error('Color must be in #RRGGBB format (e.g., #3b82f6)');
  return;
}
```

**Common Error Scenarios**:
1. **Invalid color format**: Use `#RRGGBB` format (e.g., `#3b82f6`)
2. **Duplicate slug**: Validate slug uniqueness before creation
3. **Category has posts**: Cannot delete category with posts (reassign first)
4. **Invalid icon name**: Ensure icon exists in your icon library

---

## Cache Invalidation

Query cache is automatically invalidated after mutations:

| Mutation | Invalidated Queries |
|----------|---------------------|
| Create | `['blog_categories']` |
| Update | `['blog_categories']`, `['blog_categories', id]`, `['blog_categories', 'slug', slug]` |
| Delete | `['blog_categories']` |
| Update Post Count | `['blog_categories']`, `['blog_categories', id]` |

---

## Best Practices

### 1. Color Picker Integration
Use a color picker for hex color input:

```typescript
import { HexColorPicker } from 'react-colorful';

const CategoryColorPicker = ({ value, onChange }: {
  value: string;
  onChange: (color: string) => void;
}) => (
  <div>
    <HexColorPicker color={value} onChange={onChange} />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      pattern="^#[0-9A-Fa-f]{6}$"
      placeholder="#3b82f6"
    />
  </div>
);
```

### 2. Category Badge Component
Reusable category badge with color and icon:

```typescript
const CategoryBadge = ({ category }: { category: BlogCategory }) => (
  <span
    className="category-badge"
    style={{
      backgroundColor: category.color,
      color: getContrastColor(category.color) // Auto-calculate text color
    }}
  >
    <Icon name={category.icon} />
    {category.name}
  </span>
);

// Helper to calculate contrast color
const getContrastColor = (hexColor: string): string => {
  const rgb = parseInt(hexColor.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return luma > 128 ? '#000000' : '#ffffff';
};
```

### 3. Icon Picker
Select icon from available icons:

```typescript
const availableIcons = [
  'folder',
  'book',
  'code',
  'briefcase',
  'lightbulb',
  'rocket',
  'heart',
  'star'
];

const IconPicker = ({ value, onChange }: {
  value: string;
  onChange: (icon: string) => void;
}) => (
  <div className="icon-picker">
    {availableIcons.map(icon => (
      <button
        key={icon}
        onClick={() => onChange(icon)}
        className={value === icon ? 'selected' : ''}
      >
        <Icon name={icon} />
      </button>
    ))}
  </div>
);
```

### 4. Slug Generation
Auto-generate slugs from category names:

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

### 5. Post Count Display
Show post count with visual indicator:

```typescript
const CategoryItem = ({ category }: { category: BlogCategory }) => (
  <div className="category-item">
    <CategoryBadge category={category} />
    <span className="post-count">
      {category.post_count} {category.post_count === 1 ? 'post' : 'posts'}
    </span>
  </div>
);
```

### 6. Category Navigation
Build category navigation menu:

```typescript
const CategoryNav = () => {
  const { data: categories } = useBlogCategories();

  return (
    <nav className="category-nav">
      <Link to="/blog">All Posts</Link>
      {categories?.map(category => (
        <Link
          key={category.id}
          to={`/blog/category/${category.slug}`}
          className="category-link"
        >
          <CategoryBadge category={category} />
          <span className="count">{category.post_count}</span>
        </Link>
      ))}
    </nav>
  );
};
```

### 7. Automatic Post Count Sync
Sync post count when blog posts are created/deleted:

```typescript
const useBlogPostMutations = () => {
  const { mutateAsync: updatePostCount } = useUpdateCategoryPostCount();

  const createPost = useCreateBlogPost({
    onSuccess: async (post) => {
      // Increment category post count
      const { data: category } = await supabase
        .from('blog_categories')
        .select('post_count')
        .eq('id', post.category_id)
        .single();

      await updatePostCount({
        id: post.category_id,
        count: category.post_count + 1
      });
    }
  });

  const deletePost = useDeleteBlogPost({
    onSuccess: async (post) => {
      // Decrement category post count
      const { data: category } = await supabase
        .from('blog_categories')
        .select('post_count')
        .eq('id', post.category_id)
        .single();

      await updatePostCount({
        id: post.category_id,
        count: Math.max(0, category.post_count - 1)
      });
    }
  });

  return { createPost, deletePost };
};
```

### 8. Category Reassignment
UI for reassigning posts before deleting category:

```typescript
const CategoryDeleteDialog = ({ category }: { category: BlogCategory }) => {
  const [newCategoryId, setNewCategoryId] = useState('');
  const { data: categories } = useBlogCategories();
  const { mutateAsync: deleteCategory } = useDeleteBlogCategory();

  const handleDelete = async () => {
    if (category.post_count > 0) {
      // Reassign posts to new category
      await supabase
        .from('blog_posts')
        .update({ category_id: newCategoryId })
        .eq('category_id', category.id);
    }

    await deleteCategory(category.id);
  };

  return (
    <Dialog>
      {category.post_count > 0 && (
        <div>
          <p>This category has {category.post_count} posts.</p>
          <select
            value={newCategoryId}
            onChange={(e) => setNewCategoryId(e.target.value)}
          >
            <option value="">Select new category</option>
            {categories
              ?.filter(c => c.id !== category.id)
              .map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
        </div>
      )}
      <button onClick={handleDelete} disabled={category.post_count > 0 && !newCategoryId}>
        Delete Category
      </button>
    </Dialog>
  );
};
```

---

## Related Documentation

- [Blog Category Type Definitions](d:\GitHub\idea-on-action\src\types\cms.types.ts)
- [Admin Blog Categories UI Guide](d:\GitHub\idea-on-action\docs\guides\cms\blog-categories.md)
- [Color Accessibility Guide](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [React Colorful](https://github.com/omgovich/react-colorful)
