/**
 * AdminTags - Tag Management List Page
 *
 * Full-featured CMS tag management interface with:
 * - DataTable with 6 columns (Name, Slug, Category, Usage, Description, Created)
 * - Search & advanced filters
 * - CRUD operations with modals
 * - Statistics cards (Total, Unused, Popular, Total Uses)
 * - Category filter (general, technical, business)
 * - Usage count filter (0회, 1-10회, 10+회)
 * - Loading/error/empty states
 * - Responsive design
 *
 * CMS Phase 2 - AdminTags
 */

import { useState, useMemo } from 'react';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { DataTable } from '@/components/admin/ui/DataTable';
import { useCRUD } from '@/hooks/useCRUD';
import type { CMSTag, TagCategory } from '@/types/cms.types';
import { formatRelativeTime } from '@/lib/cms-utils';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TagForm } from '@/components/admin/forms/TagForm';

export default function AdminTags() {
  // =====================================================
  // STATE
  // =====================================================

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{
    category?: TagCategory;
    usageRange?: 'unused' | 'low' | 'high';
  }>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CMSTag | null>(null);

  // =====================================================
  // CRUD HOOK
  // =====================================================

  const tagCRUD = useCRUD<CMSTag>({
    table: 'cms_tags',
    queryKey: 'cms-tags',
    select: '*',
    orderBy: { column: 'usage_count', ascending: false }, // Most used first
  });

  const { data: response, isLoading, refetch } = tagCRUD.useList({
    search: searchQuery,
    searchColumns: ['name', 'slug', 'description'],
    filters: {
      ...(filters.category && { category: filters.category }),
    },
  });

  const createMutation = tagCRUD.useCreate();
  const updateMutation = tagCRUD.useUpdate();
  const deleteMutation = tagCRUD.useDelete();

  // Apply client-side usage range filter (since it's a range, not exact match)
  const items = useMemo(() => {
    let filtered = response?.data || [];

    if (filters.usageRange) {
      filtered = filtered.filter(tag => {
        if (filters.usageRange === 'unused') return tag.usage_count === 0;
        if (filters.usageRange === 'low') return tag.usage_count > 0 && tag.usage_count <= 10;
        if (filters.usageRange === 'high') return tag.usage_count > 10;
        return true;
      });
    }

    return filtered;
  }, [response?.data, filters.usageRange]);

  // =====================================================
  // STATISTICS
  // =====================================================

  const stats = useMemo(() => {
    const all = response?.data || [];
    return {
      total: all.length,
      unused: all.filter(t => t.usage_count === 0).length,
      popular: all.filter(t => t.usage_count >= 10).length,
      totalUses: all.reduce((sum, t) => sum + t.usage_count, 0),
    };
  }, [response?.data]);

  // =====================================================
  // BADGE HELPERS
  // =====================================================

  const getCategoryBadge = (category: TagCategory) => {
    const colors: Record<TagCategory, string> = {
      general: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      technical: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
      business: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    };
    return <Badge className={colors[category]}>{category}</Badge>;
  };

  const getUsageBadge = (count: number) => {
    if (count === 0) {
      return <Badge variant="secondary">미사용</Badge>;
    }
    if (count >= 10) {
      return <Badge variant="default" className="bg-green-600">{count}</Badge>;
    }
    return <Badge variant="outline">{count}</Badge>;
  };

  // =====================================================
  // DATATABLE COLUMNS
  // =====================================================

  const columns: ColumnDef<CMSTag>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex flex-col max-w-md">
          <button
            onClick={() => handleEdit(row.original)}
            className="font-medium text-left hover:underline"
          >
            {row.original.name}
          </button>
          {row.original.description && (
            <span className="text-sm text-muted-foreground truncate">
              {row.original.description}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
      cell: ({ row }) => (
        <code className="text-sm bg-muted px-2 py-1 rounded">{row.original.slug}</code>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => getCategoryBadge(row.original.category),
    },
    {
      accessorKey: 'usage_count',
      header: 'Usage',
      cell: ({ row }) => getUsageBadge(row.original.usage_count),
    },
    {
      accessorKey: 'is_active',
      header: 'Active',
      cell: ({ row }) => (
        <span className="text-center">{row.original.is_active ? '✓' : '✗'}</span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => formatRelativeTime(row.original.created_at),
    },
  ];

  // =====================================================
  // CRUD HANDLERS
  // =====================================================

  const handleCreate = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: CMSTag) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Tag deleted successfully');
    } catch (error) {
      console.error('[AdminTags] Delete error:', error);
    }
  };

  const handleFormSubmit = async (values: Partial<CMSTag>) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          values,
        });
      } else {
        await createMutation.mutateAsync(values);
      }

      setIsFormOpen(false);
      setEditingItem(null);
      refetch();
    } catch (error) {
      console.error('[AdminTags] Form submit error:', error);
      throw error;
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tags</h1>
            <p className="text-muted-foreground">Manage global tags across all content</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Tag
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Unused
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.unused}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Popular (10+ uses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.popular}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Uses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalUses}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={filters.category || 'all'}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                category: value === 'all' ? undefined : (value as TagCategory),
              }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.usageRange || 'all'}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                usageRange: value === 'all' ? undefined : (value as 'unused' | 'low' | 'high'),
              }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Usage</SelectItem>
              <SelectItem value="unused">Unused (0)</SelectItem>
              <SelectItem value="low">Low (1-10)</SelectItem>
              <SelectItem value="high">High (10+)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* DataTable */}
        <DataTable
          columns={columns}
          data={items}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="No tags found"
          emptyDescription="Create your first tag to get started"
        />
      </div>

      {/* Create/Edit Form Modal */}
      <TagForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingItem(null);
        }}
        editingItem={editingItem}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
}
