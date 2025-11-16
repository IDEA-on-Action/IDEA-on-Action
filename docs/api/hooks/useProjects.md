# useProjects API Documentation

## Overview

React Query hooks for managing Project entities in the CMS. Projects represent work items in the IDEA on Action system with status tracking, tech stack, and timeline information.

**Purpose**: CRUD operations and querying for projects
**Location**: Used in admin project management pages and public project listings
**Dependencies**: React Query, Supabase client, custom query utilities

## Import

```typescript
import {
  useProjects,
  useProject,
  useProjectsByStatus,
  useProjectsByCategory,
  useCreateProject,
  useUpdateProject,
  useDeleteProject
} from '@/hooks/useProjects';
```

## Type Definitions

```typescript
interface Project {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description?: string;
  status: 'backlog' | 'in-progress' | 'validate' | 'launched';
  category: string;
  image?: string;
  tags: string[];
  metrics: ProjectMetrics;
  tech: ProjectTech;
  links: ProjectLinks;
  timeline: ProjectTimeline;
  highlights?: string[];
  created_at: string;
  updated_at: string;
}

interface ProjectMetrics {
  progress: number;
  contributors: number;
  commits: number;
  tests: number;
  coverage?: number;
}

interface ProjectTech {
  frontend?: string[];
  backend?: string[] | null;
  testing?: string[] | null;
  deployment?: string[];
}

interface ProjectLinks {
  github?: string;
  demo?: string | null;
  docs?: string | null;
}

interface ProjectTimeline {
  started: string;
  launched?: string | null;
  updated: string;
}
```

## API Reference

### Query Hooks

#### useProjects()

Fetches all projects sorted by creation date (newest first).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | Project[] | Array of all projects |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |
| refetch | () => void | Manually refetch data |

**Cache Settings**:
- Query Key: `['projects']`
- Stale Time: 5 minutes

**Example**:
```typescript
const { data: projects, isLoading, error } = useProjects();

if (isLoading) return <Spinner />;
if (error) return <ErrorAlert error={error} />;

return (
  <div>
    {projects.map(project => (
      <ProjectCard key={project.id} project={project} />
    ))}
  </div>
);
```

---

#### useProject(slug)

Fetches a single project by its slug.

**Parameters**:
- `slug: string` - Unique project slug

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | Project \| null | Project object or null if not found |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Notes**:
- Query is disabled if slug is empty
- Returns fallback value `null` if not found

**Example**:
```typescript
const { data: project } = useProject('idea-on-action-homepage');

if (!project) return <NotFound />;

return <ProjectDetail project={project} />;
```

---

#### useProjectsByStatus(status?)

Fetches projects filtered by status, or all projects if status is undefined.

**Parameters**:
- `status?: 'backlog' | 'in-progress' | 'validate' | 'launched'` - Optional status filter

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | Project[] | Filtered projects array |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Example**:
```typescript
const { data: launchedProjects } = useProjectsByStatus('launched');
const { data: allProjects } = useProjectsByStatus(); // No filter
```

---

#### useProjectsByCategory(category?)

Fetches projects filtered by category, or all projects if category is undefined.

**Parameters**:
- `category?: string` - Optional category filter

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | Project[] | Filtered projects array |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Example**:
```typescript
const { data: serviceProjects } = useProjectsByCategory('service');
```

---

### Mutation Hooks

#### useCreateProject()

Creates a new project (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (data: ProjectInput) => void | Sync mutation function |
| mutateAsync | (data: ProjectInput) => Promise<Project> | Async mutation function |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Input Type**:
```typescript
type ProjectInput = Omit<Project, 'id' | 'created_at' | 'updated_at'>;
```

**Side Effects**:
- Invalidates `['projects']` query on success
- Triggers toast notification (via useSupabaseMutation)

**Error Handling**:
- Throws error if user lacks admin permissions (RLS policy)
- Throws error if slug is not unique

**Example**:
```typescript
const { mutateAsync: createProject, isPending } = useCreateProject();

const handleSubmit = async (formData: ProjectInput) => {
  try {
    const newProject = await createProject(formData);
    toast.success(`Project "${newProject.title}" created!`);
    navigate(`/projects/${newProject.slug}`);
  } catch (error) {
    toast.error('Failed to create project');
  }
};
```

---

#### useUpdateProject()

Updates an existing project (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (params) => void | Sync mutation function |
| mutateAsync | (params) => Promise<Project> | Async mutation function |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Input Parameters**:
```typescript
{
  id: string;
  updates: Partial<Project>;
}
```

**Side Effects**:
- Invalidates `['projects']` query
- Invalidates `['projects', slug]` query for the updated project

**Example**:
```typescript
const { mutateAsync: updateProject } = useUpdateProject();

const handleStatusChange = async (projectId: string, newStatus: Project['status']) => {
  await updateProject({
    id: projectId,
    updates: { status: newStatus }
  });
};
```

---

#### useDeleteProject()

Deletes a project (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (id: string) => void | Sync mutation function |
| mutateAsync | (id: string) => Promise<string> | Async mutation function (returns deleted ID) |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Side Effects**:
- Invalidates `['projects']` query
- Returns the deleted project ID on success

**Error Handling**:
- Throws error if project has related dependencies (check DB constraints)
- Throws error if user lacks admin permissions

**Example**:
```typescript
const { mutateAsync: deleteProject } = useDeleteProject();

const handleDelete = async (projectId: string) => {
  if (!confirm('Are you sure?')) return;

  try {
    await deleteProject(projectId);
    toast.success('Project deleted');
    navigate('/admin/projects');
  } catch (error) {
    toast.error('Failed to delete project');
  }
};
```

---

## Error Handling

All hooks use the custom `useSupabaseQuery` and `useSupabaseMutation` wrappers which provide:

1. **Automatic Error Logging**: Errors are logged with table/operation context
2. **Sentry Integration**: Errors are captured in Sentry with breadcrumbs
3. **Fallback Values**: Query hooks return empty arrays/null instead of throwing
4. **Toast Notifications**: Mutations trigger automatic success/error toasts

**Common Error Types**:
- `PostgrestError` - Database constraint violations (unique slug, foreign keys)
- `AuthError` - User not authenticated or lacks permissions
- `NetworkError` - API request failed

**Example Error Handling**:
```typescript
const { data, error } = useProjects();

if (error) {
  console.error('Project query failed:', error.message);
  return <ErrorBoundary error={error} />;
}
```

---

## Cache Invalidation

Query cache is automatically invalidated after mutations:

| Mutation | Invalidated Queries |
|----------|---------------------|
| Create | `['projects']` |
| Update | `['projects']`, `['projects', slug]` |
| Delete | `['projects']` |

Manual invalidation:
```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: ['projects'] });
```

---

## Best Practices

### 1. Admin Permission Checks
Always verify admin status before rendering mutation UI:

```typescript
import { useIsAdmin } from '@/hooks/useIsAdmin';

const { data: isAdmin } = useIsAdmin();

if (!isAdmin) return null;

return <CreateProjectButton />;
```

### 2. Optimistic Updates
For better UX, implement optimistic updates:

```typescript
const queryClient = useQueryClient();
const { mutate } = useUpdateProject();

mutate(
  { id, updates },
  {
    onMutate: async ({ id, updates }) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: ['projects', slug] });

      // Snapshot previous value
      const previous = queryClient.getQueryData(['projects', slug]);

      // Optimistically update
      queryClient.setQueryData(['projects', slug], (old) => ({
        ...old,
        ...updates
      }));

      return { previous };
    },
    onError: (err, vars, context) => {
      // Rollback on error
      queryClient.setQueryData(['projects', slug], context.previous);
    }
  }
);
```

### 3. Slug Validation
Ensure unique slugs before creating projects:

```typescript
const validateSlug = async (slug: string) => {
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  return !data; // true if slug is available
};
```

### 4. Race Condition Prevention
Use React Query's built-in deduplication:

```typescript
// Multiple components can call useProjects() - only 1 request is made
const { data } = useProjects(); // Component A
const { data } = useProjects(); // Component B - reuses Component A's request
```

---

## Related Documentation

- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Supabase Auth & RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Project Type Definitions](d:\GitHub\idea-on-action\src\types\v2.ts)
- [Admin Dashboard Guide](d:\GitHub\idea-on-action\docs\guides\admin-dashboard.md)
