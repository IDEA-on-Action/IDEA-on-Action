/**
 * AdminLab - Lab/Bounty Management List Page
 *
 * Full-featured CMS lab bounty management interface with:
 * - DataTable with 8 columns
 * - Search & advanced filters
 * - CRUD operations with modals
 * - Applicants modal with accept/reject actions
 * - Statistics cards
 * - Loading/error/empty states
 * - Responsive design
 *
 * CMS Phase 2 - Agent 1
 */

import { useState, useMemo } from 'react';
import { Plus, RefreshCw, Search, Users } from 'lucide-react';
import { DataTable } from '@/components/admin/ui/DataTable';
import { useCRUD } from '@/hooks/useCRUD';
import type { CMSLabItem, LabStatus, LabDifficulty, LabApplicant } from '@/types/cms-lab.types';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LabForm } from '@/components/admin/forms/LabForm';

export default function AdminLab() {
  // =====================================================
  // STATE
  // =====================================================

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{
    status?: LabStatus;
    difficulty?: LabDifficulty;
    published?: boolean;
    skills?: string[];
  }>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CMSLabItem | null>(null);
  const [viewApplicantsItem, setViewApplicantsItem] = useState<CMSLabItem | null>(null);

  // =====================================================
  // CRUD HOOK
  // =====================================================

  const labCRUD = useCRUD<CMSLabItem>({
    table: 'cms_lab_items',
    queryKey: 'cms-lab',
    select: '*, created_by:admins!created_by(user_id)',
    orderBy: { column: 'created_at', ascending: false },
  });

  const { data: response, isLoading, refetch } = labCRUD.useList({
    search: searchQuery,
    searchColumns: ['title', 'description'],
    filters: {
      ...(filters.status && { status: filters.status }),
      ...(filters.difficulty && { difficulty: filters.difficulty }),
      ...(filters.published !== undefined && { is_published: filters.published }),
    },
  });

  const createMutation = labCRUD.useCreate();
  const updateMutation = labCRUD.useUpdate();
  const deleteMutation = labCRUD.useDelete();

  const items = useMemo(() => response?.data || [], [response?.data]);

  // =====================================================
  // STATISTICS
  // =====================================================

  const stats = useMemo(() => {
    return {
      total: items.length,
      open: items.filter(i => i.status === 'open').length,
      in_progress: items.filter(i => i.status === 'in_progress').length,
      completed: items.filter(i => i.status === 'completed').length,
    };
  }, [items]);

  // =====================================================
  // STATUS & DIFFICULTY BADGE HELPERS
  // =====================================================

  const getStatusBadge = (status: LabStatus) => {
    const colors: Record<LabStatus, string> = {
      open: 'bg-green-500 text-white',
      in_progress: 'bg-blue-500 text-white',
      completed: 'bg-gray-500 text-white',
      closed: 'bg-red-500 text-white',
    };
    return <Badge className={colors[status]}>{status.replace('_', ' ')}</Badge>;
  };

  const getDifficultyBadge = (difficulty: LabDifficulty) => {
    const colors: Record<LabDifficulty, string> = {
      beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
      advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    };
    return <Badge className={colors[difficulty]}>{difficulty}</Badge>;
  };

  // =====================================================
  // DATATABLE COLUMNS
  // =====================================================

  const columns: ColumnDef<CMSLabItem>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <div className="flex flex-col max-w-md">
          <button
            onClick={() => handleEdit(row.original)}
            className="font-medium text-left hover:underline"
          >
            {row.original.title}
          </button>
          <span className="text-sm text-muted-foreground truncate">
            {row.original.description?.substring(0, 100)}...
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: 'difficulty',
      header: 'Difficulty',
      cell: ({ row }) => getDifficultyBadge(row.original.difficulty),
    },
    {
      accessorKey: 'reward',
      header: 'Reward',
      cell: ({ row }) => row.original.reward || '-',
    },
    {
      accessorKey: 'skills_required',
      header: 'Skills',
      cell: ({ row }) => {
        const skills = row.original.skills_required || [];
        return (
          <div className="flex gap-1 flex-wrap max-w-xs">
            {skills.slice(0, 3).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
            {skills.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{skills.length - 3}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'applicants',
      header: 'Applicants',
      cell: ({ row }) => {
        const count = row.original.applicants?.length || 0;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewApplicantsItem(row.original)}
          >
            <Users className="h-4 w-4 mr-1" />
            {count}
          </Button>
        );
      },
    },
    {
      accessorKey: 'is_published',
      header: 'Published',
      cell: ({ row }) => (
        <span className="text-center">{row.original.is_published ? '✓' : '✗'}</span>
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

  const handleEdit = (item: CMSLabItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bounty?')) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Bounty deleted successfully');
    } catch (error) {
      console.error('[AdminLab] Delete error:', error);
    }
  };

  const handleFormSubmit = async (values: Partial<CMSLabItem>) => {
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
      console.error('[AdminLab] Form submit error:', error);
      throw error;
    }
  };

  // =====================================================
  // APPLICANTS MODAL HANDLERS
  // =====================================================

  const handleAcceptApplicant = async (index: number) => {
    if (!viewApplicantsItem) return;

    const updatedApplicants = [...viewApplicantsItem.applicants];
    updatedApplicants[index].status = 'accepted';

    try {
      await updateMutation.mutateAsync({
        id: viewApplicantsItem.id,
        values: { applicants: updatedApplicants },
      });
      toast.success('Applicant accepted');
      refetch();
      setViewApplicantsItem(null);
    } catch (error) {
      console.error('[AdminLab] Accept applicant error:', error);
    }
  };

  const handleRejectApplicant = async (index: number) => {
    if (!viewApplicantsItem) return;

    const updatedApplicants = [...viewApplicantsItem.applicants];
    updatedApplicants[index].status = 'rejected';

    try {
      await updateMutation.mutateAsync({
        id: viewApplicantsItem.id,
        values: { applicants: updatedApplicants },
      });
      toast.success('Applicant rejected');
      refetch();
      setViewApplicantsItem(null);
    } catch (error) {
      console.error('[AdminLab] Reject applicant error:', error);
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
            <h1 className="text-3xl font-bold">Lab Bounties</h1>
            <p className="text-muted-foreground">Manage community bounties and experiments</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Bounty
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Bounties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Open
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.open}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.in_progress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bounties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                status: value === 'all' ? undefined : (value as LabStatus),
              }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.difficulty || 'all'}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                difficulty: value === 'all' ? undefined : (value as LabDifficulty),
              }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulty</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={
              filters.published === undefined ? 'all' : filters.published ? 'published' : 'draft'
            }
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                published: value === 'all' ? undefined : value === 'published',
              }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
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
          emptyMessage="No bounties found"
          emptyDescription="Create your first bounty to get started"
        />
      </div>

      {/* Create/Edit Form Modal */}
      <LabForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingItem(null);
        }}
        editingItem={editingItem}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Applicants Modal */}
      <Dialog open={!!viewApplicantsItem} onOpenChange={() => setViewApplicantsItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Applicants for {viewApplicantsItem?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {viewApplicantsItem?.applicants && viewApplicantsItem.applicants.length > 0 ? (
              viewApplicantsItem.applicants.map((applicant, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded">
                  <div className="flex-1">
                    <p className="font-medium">{applicant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      User ID: {applicant.user_id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Applied: {formatRelativeTime(applicant.applied_at)}
                    </p>
                    {applicant.message && (
                      <p className="text-sm mt-1">{applicant.message}</p>
                    )}
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge
                      variant={applicant.status === 'accepted' ? 'default' : 'secondary'}
                      className={
                        applicant.status === 'accepted'
                          ? 'bg-green-600'
                          : applicant.status === 'rejected'
                            ? 'bg-red-600'
                            : ''
                      }
                    >
                      {applicant.status}
                    </Badge>
                    {applicant.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => handleAcceptApplicant(index)}>
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectApplicant(index)}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No applicants yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
