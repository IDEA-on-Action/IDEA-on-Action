/**
 * AdminRoadmap - Roadmap Management List Page
 *
 * Full-featured CMS roadmap management interface with:
 * - DataTable with 9 columns
 * - Search & filters (quarter, risk_level)
 * - CRUD operations with modals
 * - Statistics cards (Total, In Progress, Completed, Avg Progress)
 * - Loading/error/empty states
 * - Responsive design
 *
 * CMS Phase 2 - AdminRoadmap
 */

import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Plus,
  Search,
  Loader2,
  Pencil,
  Trash2,
  Calendar,
  Target,
  TrendingUp,
} from 'lucide-react';
import { DataTable } from '@/components/admin/ui/DataTable';
import { useCRUD } from '@/hooks/useCRUD';
import type { CMSRoadmapItem } from '@/types/cms.types';
import { ColumnDef } from '@tanstack/react-table';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RoadmapForm } from '@/components/admin/forms/RoadmapForm';
import { toast } from 'sonner';

// =====================================================
// STATISTICS CARD COMPONENT
// =====================================================

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
}

function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function AdminRoadmap() {
  const roadmapCRUD = useCRUD<CMSRoadmapItem>({
    table: 'cms_roadmap_items',
    queryKey: 'cms-roadmap',
    orderBy: { column: 'start_date', ascending: false },
  });

  const { data: roadmapResponse, isLoading } = roadmapCRUD.useList();
  const createMutation = roadmapCRUD.useCreate();
  const updateMutation = roadmapCRUD.useUpdate();
  const deleteMutation = roadmapCRUD.useDelete();

  const [search, setSearch] = useState('');
  const [quarterFilter, setQuarterFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [editItem, setEditItem] = useState<CMSRoadmapItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Extract items from paginated response
  const roadmapItems = useMemo(() => roadmapResponse?.data || [], [roadmapResponse?.data]);

  // Filter roadmap items
  const filteredItems = useMemo(() => {
    return roadmapItems.filter((item) => {
      const matchesSearch =
        !search ||
        item.theme.toLowerCase().includes(search.toLowerCase()) ||
        item.goal.toLowerCase().includes(search.toLowerCase());
      const matchesQuarter =
        quarterFilter === 'all' || item.quarter === quarterFilter;
      const matchesRisk = riskFilter === 'all' || item.risk_level === riskFilter;
      return matchesSearch && matchesQuarter && matchesRisk;
    });
  }, [roadmapItems, search, quarterFilter, riskFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredItems.length;
    const inProgress = filteredItems.filter(
      (item) => item.progress > 0 && item.progress < 100
    ).length;
    const completed = filteredItems.filter((item) => item.progress === 100).length;
    const avgProgress =
      total > 0
        ? Math.round(
            filteredItems.reduce((sum, item) => sum + item.progress, 0) / total
          )
        : 0;

    return { total, inProgress, completed, avgProgress };
  }, [filteredItems]);

  // Extract unique quarters for filter
  const uniqueQuarters = useMemo(() => {
    const quarters = new Set(roadmapItems.map((item) => item.quarter));
    return Array.from(quarters).sort();
  }, [roadmapItems]);

  // Open form for creating new item
  const handleCreate = () => {
    setEditItem(null);
    setIsFormOpen(true);
  };

  // Open form for editing item
  const handleEdit = (item: CMSRoadmapItem) => {
    setEditItem(item);
    setIsFormOpen(true);
  };

  // Submit form (create or update)
  const handleSubmit = async (values: Partial<CMSRoadmapItem>) => {
    try {
      if (editItem) {
        await updateMutation.mutateAsync({
          id: editItem.id,
          values,
        });
        toast.success('Roadmap item updated successfully');
      } else {
        await createMutation.mutateAsync(values as Omit<CMSRoadmapItem, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>);
        toast.success('Roadmap item created successfully');
      }
      setIsFormOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to save roadmap item: ${message}`);
    }
  };

  // Delete roadmap item
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Roadmap item deleted successfully');
      setDeleteId(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to delete roadmap item: ${message}`);
    }
  };

  // Format date
  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get risk level badge
  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'low':
        return <Badge className="bg-green-600">Low</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-600">Medium</Badge>;
      case 'high':
        return <Badge className="bg-red-600">High</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  // DataTable columns
  const columns: ColumnDef<CMSRoadmapItem>[] = [
    {
      accessorKey: 'theme',
      header: 'Theme',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.theme}</div>
          <div className="text-sm text-muted-foreground truncate max-w-xs">
            {row.original.goal}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'quarter',
      header: 'Quarter',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.quarter}</Badge>
      ),
    },
    {
      accessorKey: 'progress',
      header: 'Progress',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${row.original.progress}%` }}
            />
          </div>
          <span className="text-sm font-medium">{row.original.progress}%</span>
        </div>
      ),
    },
    {
      accessorKey: 'risk_level',
      header: 'Risk',
      cell: ({ row }) => getRiskBadge(row.original.risk_level),
    },
    {
      accessorKey: 'milestones',
      header: 'Milestones',
      cell: ({ row }) => {
        const milestones = row.original.milestones || [];
        const completed = milestones.filter((m) => m.completed).length;
        return (
          <span className="text-sm">
            {completed}/{milestones.length}
          </span>
        );
      },
    },
    {
      accessorKey: 'is_published',
      header: 'Published',
      cell: ({ row }) =>
        row.original.is_published ? (
          <Badge className="bg-green-600">Published</Badge>
        ) : (
          <Badge variant="secondary">Draft</Badge>
        ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-sm">{formatDate(row.original.created_at)}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(row.original.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Roadmap Management | IDEA on Action</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Roadmap Management</h1>
            <p className="text-muted-foreground">
              Manage quarterly roadmap items with milestones and KPIs
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Roadmap Item
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Phases"
            value={stats.total}
            icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
            description="All roadmap items"
          />
          <StatCard
            title="In Progress"
            value={stats.inProgress}
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            description="Currently active"
          />
          <StatCard
            title="Completed"
            value={stats.completed}
            icon={<Target className="h-4 w-4 text-muted-foreground" />}
            description="100% progress"
          />
          <StatCard
            title="Avg Progress"
            value={`${stats.avgProgress}%`}
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            description="Average completion"
          />
        </div>

        {/* Filters & Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by theme or goal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={quarterFilter} onValueChange={setQuarterFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Quarters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quarters</SelectItem>
              {uniqueQuarters.map((quarter) => (
                <SelectItem key={quarter} value={quarter}>
                  {quarter}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Risk Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk Levels</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* DataTable */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredItems.length > 0 ? (
          <DataTable
            columns={columns}
            data={filteredItems}
            searchable
            searchPlaceholder="Search roadmap items..."
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center border rounded-lg">
            <p className="text-muted-foreground">No roadmap items found</p>
            <Button onClick={handleCreate} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create First Roadmap Item
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Form */}
      <RoadmapForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editingItem={editItem}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Roadmap Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this roadmap item? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
