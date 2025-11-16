# usePortfolioItems API Documentation

## Overview

React Query hooks for managing Portfolio Items in the CMS. Portfolio items showcase completed projects with case study details, client information, tech stack, and outcomes.

**Purpose**: CRUD operations and filtering for portfolio management
**Location**: Admin portfolio pages and public portfolio showcase
**Dependencies**: React Query, Supabase client, custom query utilities

## Import

```typescript
import {
  usePortfolioItems,
  usePortfolioItem,
  usePortfolioItemBySlug,
  usePortfolioItemsByType,
  useFeaturedPortfolioItems,
  usePublishedPortfolioItems,
  useCreatePortfolioItem,
  useUpdatePortfolioItem,
  useDeletePortfolioItem
} from '@/hooks/usePortfolioItems';
```

## Type Definitions

```typescript
interface PortfolioItem {
  id: string;
  slug: string; // Unique URL-friendly identifier
  title: string;
  summary: string;
  description?: string;
  client_name?: string;
  client_logo?: string;
  project_type: 'mvp' | 'fullstack' | 'design' | 'operations';
  thumbnail?: string;
  images: string[]; // Array of image URLs
  tech_stack: string[]; // Array of technology names
  project_url?: string;
  github_url?: string;
  duration?: string;
  team_size?: number;
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  challenges?: string; // Markdown
  solutions?: string; // Markdown
  outcomes?: string; // Markdown
  testimonial: PortfolioTestimonial;
  featured: boolean; // Pin to top
  published: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

interface PortfolioTestimonial {
  author?: string;
  role?: string;
  company?: string;
  content?: string;
  avatar?: string;
}

type PortfolioItemInsert = Omit<PortfolioItem, 'id' | 'created_at' | 'updated_at'>;
type PortfolioItemUpdate = Partial<Omit<PortfolioItem, 'id' | 'created_at' | 'updated_at'>>;
```

## API Reference

### Query Hooks

#### usePortfolioItems()

Fetches all portfolio items sorted by creation date (newest first).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | PortfolioItem[] | All portfolio items |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |
| refetch | () => void | Manually refetch data |

**Cache Settings**:
- Query Key: `['portfolio_items']`
- Stale Time: 5 minutes

**Example**:
```typescript
const { data: portfolioItems, isLoading } = usePortfolioItems();

return (
  <div className="grid grid-cols-3 gap-4">
    {portfolioItems.map(item => (
      <PortfolioCard key={item.id} item={item} />
    ))}
  </div>
);
```

---

#### usePortfolioItem(id)

Fetches a single portfolio item by ID.

**Parameters**:
- `id: string` - UUID of the portfolio item

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | PortfolioItem \| null | Portfolio item or null if not found |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Notes**:
- Query is disabled if `id` is empty
- Returns fallback value `null` if not found

**Example**:
```typescript
const { data: item } = usePortfolioItem(itemId);

if (!item) return <NotFound />;
return <PortfolioDetail item={item} />;
```

---

#### usePortfolioItemBySlug(slug)

Fetches a single portfolio item by its slug (preferred for public pages).

**Parameters**:
- `slug: string` - Unique URL slug

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | PortfolioItem \| null | Portfolio item or null if not found |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Cache Settings**:
- Query Key: `['portfolio_items', 'slug', slug]`
- Stale Time: 5 minutes

**Example**:
```typescript
// Public portfolio detail page
const { slug } = useParams();
const { data: item } = usePortfolioItemBySlug(slug);

if (!item) return <NotFound />;
return <PortfolioDetailPage item={item} />;
```

---

#### usePortfolioItemsByType(projectType?)

Fetches portfolio items filtered by project type.

**Parameters**:
- `projectType?: 'mvp' | 'fullstack' | 'design' | 'operations'` - Optional type filter

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | PortfolioItem[] | Filtered portfolio items |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Example**:
```typescript
const { data: mvpProjects } = usePortfolioItemsByType('mvp');
const { data: designProjects } = usePortfolioItemsByType('design');
const { data: allProjects } = usePortfolioItemsByType(); // No filter
```

---

#### useFeaturedPortfolioItems()

Fetches only featured portfolio items (pinned to top).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | PortfolioItem[] | Featured portfolio items only |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Cache Settings**:
- Query Key: `['portfolio_items', 'featured']`
- Stale Time: 5 minutes

**Example**:
```typescript
// Homepage featured portfolio
const { data: featuredItems } = useFeaturedPortfolioItems();

return (
  <section>
    <h2>Featured Work</h2>
    <FeaturedPortfolioCarousel items={featuredItems} />
  </section>
);
```

---

#### usePublishedPortfolioItems()

Fetches only published portfolio items (for public-facing pages).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | PortfolioItem[] | Published portfolio items only |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Cache Settings**:
- Query Key: `['portfolio_items', 'published']`
- Stale Time: 5 minutes

**Example**:
```typescript
// Public portfolio page
const { data: publicPortfolio } = usePublishedPortfolioItems();

return <PortfolioGrid items={publicPortfolio} />;
```

---

### Mutation Hooks

#### useCreatePortfolioItem()

Creates a new portfolio item (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (data: PortfolioItemInsert) => void | Sync mutation function |
| mutateAsync | (data: PortfolioItemInsert) => Promise<PortfolioItem> | Async mutation function |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Input Type**:
```typescript
type PortfolioItemInsert = {
  slug: string; // Must be unique
  title: string;
  summary: string;
  description?: string;
  client_name?: string;
  client_logo?: string;
  project_type: 'mvp' | 'fullstack' | 'design' | 'operations';
  thumbnail?: string;
  images: string[];
  tech_stack: string[];
  project_url?: string;
  github_url?: string;
  duration?: string;
  team_size?: number;
  start_date?: string;
  end_date?: string;
  challenges?: string;
  solutions?: string;
  outcomes?: string;
  testimonial: PortfolioTestimonial;
  featured: boolean;
  published: boolean;
  created_by?: string | null;
};
```

**Side Effects**:
- Invalidates `['portfolio_items']` query on success

**Error Handling**:
- Throws `PostgrestError` if slug is not unique (DB constraint)
- Throws error if user lacks admin permissions

**Example**:
```typescript
const { mutateAsync: createItem, isPending } = useCreatePortfolioItem();

const handleSubmit = async (formData: PortfolioItemInsert) => {
  try {
    const newItem = await createItem(formData);
    toast.success('Portfolio item created!');
    navigate(`/portfolio/${newItem.slug}`);
  } catch (error) {
    if (error.message.includes('duplicate key')) {
      toast.error('Slug already exists. Choose a different slug.');
    } else {
      toast.error('Failed to create portfolio item');
    }
  }
};
```

---

#### useUpdatePortfolioItem()

Updates an existing portfolio item (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (params) => void | Sync mutation function |
| mutateAsync | (params) => Promise<PortfolioItem> | Async mutation function |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Input Parameters**:
```typescript
{
  id: string;
  updates: Partial<PortfolioItem>; // All fields optional except id
}
```

**Side Effects**:
- Invalidates `['portfolio_items']` query
- Invalidates `['portfolio_items', id]` query
- Invalidates `['portfolio_items', 'slug', slug]` query

**Example**:
```typescript
const { mutateAsync: updateItem } = useUpdatePortfolioItem();

// Toggle featured status
await updateItem({
  id: itemId,
  updates: { featured: !item.featured }
});

// Update testimonial
await updateItem({
  id: itemId,
  updates: {
    testimonial: {
      author: 'John Doe',
      role: 'CEO',
      company: 'Acme Inc.',
      content: 'Outstanding work!',
      avatar: 'https://...'
    }
  }
});
```

---

#### useDeletePortfolioItem()

Deletes a portfolio item (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (id: string) => void | Sync mutation function |
| mutateAsync | (id: string) => Promise<string> | Async mutation function (returns deleted ID) |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Side Effects**:
- Invalidates `['portfolio_items']` query
- Returns the deleted item ID on success

**Example**:
```typescript
const { mutateAsync: deleteItem } = useDeletePortfolioItem();

const handleDelete = async (itemId: string) => {
  if (!confirm('Delete this portfolio item?')) return;

  try {
    await deleteItem(itemId);
    toast.success('Portfolio item deleted');
    navigate('/admin/portfolio');
  } catch (error) {
    toast.error('Failed to delete');
  }
};
```

---

## Error Handling

**Common Error Scenarios**:
1. **Duplicate slug**: Validate slug uniqueness before creation
2. **Invalid URLs**: Validate `project_url`, `github_url`, `client_logo` format
3. **Empty arrays**: Ensure `images` and `tech_stack` arrays are valid JSON
4. **Invalid dates**: `start_date` and `end_date` must be YYYY-MM-DD format
5. **Testimonial validation**: All testimonial fields are optional, but provide full object

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
| Create | `['portfolio_items']` |
| Update | `['portfolio_items']`, `['portfolio_items', id]`, `['portfolio_items', 'slug', slug]` |
| Delete | `['portfolio_items']` |

**Note**: Featured and published caches are NOT automatically invalidated. Manually invalidate when toggling:

```typescript
const queryClient = useQueryClient();

// After toggling featured
await updateItem({ id, updates: { featured: !item.featured } });
queryClient.invalidateQueries({ queryKey: ['portfolio_items', 'featured'] });

// After toggling published
await updateItem({ id, updates: { published: !item.published } });
queryClient.invalidateQueries({ queryKey: ['portfolio_items', 'published'] });
```

---

## Best Practices

### 1. Slug Generation
Auto-generate slugs from titles:

```typescript
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

const handleTitleChange = (title: string) => {
  const autoSlug = generateSlug(title);
  setFormData({ ...formData, title, slug: autoSlug });
};
```

### 2. Image Upload Integration
Integrate with Supabase Storage:

```typescript
const uploadImage = async (file: File): Promise<string> => {
  const fileName = `${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('portfolio-images')
    .upload(fileName, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('portfolio-images')
    .getPublicUrl(fileName);

  return publicUrl;
};

// In form
const handleImageUpload = async (files: File[]) => {
  const urls = await Promise.all(files.map(uploadImage));
  setFormData({ ...formData, images: [...formData.images, ...urls] });
};
```

### 3. Tech Stack Autocomplete
Use existing tags for consistency:

```typescript
const { data: allItems } = usePortfolioItems();

const existingTechStack = useMemo(() => {
  const allTech = allItems?.flatMap(item => item.tech_stack) || [];
  return Array.from(new Set(allTech)).sort();
}, [allItems]);

// In form
<TechStackInput
  value={formData.tech_stack}
  suggestions={existingTechStack}
  onChange={(tech) => setFormData({ ...formData, tech_stack: tech })}
/>
```

### 4. Project Type Badges
Visual distinction for project types:

```typescript
const projectTypeConfig = {
  mvp: { color: 'purple', label: 'MVP Development' },
  fullstack: { color: 'blue', label: 'Full Stack' },
  design: { color: 'pink', label: 'Design' },
  operations: { color: 'green', label: 'Operations' }
};

const ProjectTypeBadge = ({ type }: { type: PortfolioItem['project_type'] }) => {
  const { color, label } = projectTypeConfig[type];
  return <Badge color={color}>{label}</Badge>;
};
```

### 5. Markdown Rendering
Render markdown fields in detail pages:

```typescript
import ReactMarkdown from 'react-markdown';

const PortfolioDetailView = ({ item }: { item: PortfolioItem }) => (
  <div>
    <section>
      <h2>Challenges</h2>
      <ReactMarkdown>{item.challenges || ''}</ReactMarkdown>
    </section>
    <section>
      <h2>Solutions</h2>
      <ReactMarkdown>{item.solutions || ''}</ReactMarkdown>
    </section>
    <section>
      <h2>Outcomes</h2>
      <ReactMarkdown>{item.outcomes || ''}</ReactMarkdown>
    </section>
  </div>
);
```

### 6. Testimonial Component
Reusable testimonial display:

```typescript
const Testimonial = ({ testimonial }: { testimonial: PortfolioTestimonial }) => {
  if (!testimonial.content) return null;

  return (
    <blockquote className="testimonial">
      {testimonial.avatar && <img src={testimonial.avatar} alt={testimonial.author} />}
      <p>{testimonial.content}</p>
      <footer>
        <cite>
          {testimonial.author}
          {testimonial.role && `, ${testimonial.role}`}
          {testimonial.company && ` at ${testimonial.company}`}
        </cite>
      </footer>
    </blockquote>
  );
};
```

---

## Related Documentation

- [Portfolio Type Definitions](d:\GitHub\idea-on-action\src\types\v2.ts)
- [CMS Type Definitions](d:\GitHub\idea-on-action\src\types\cms.types.ts)
- [Image Upload Guide](d:\GitHub\idea-on-action\docs\guides\file-upload.md)
- [Markdown Rendering](d:\GitHub\idea-on-action\docs\guides\markdown.md)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
