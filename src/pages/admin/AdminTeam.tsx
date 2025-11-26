/**
 * AdminTeam - Team Members Management Page
 *
 * Full-featured CMS team management interface with:
 * - DataTable with all columns (avatar, name, role, skills, social links, display_order, is_active)
 * - Search by name and role
 * - Filter by role (founder, developer, designer, community)
 * - CRUD operations with modal
 * - Responsive design
 * - Loading/error/empty states
 *
 * CMS Phase 2 - Agent 3
 */

import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Search, Github, Linkedin, Twitter, Globe, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useCRUD } from '@/hooks/useCRUD';
import { useDebounce } from '@/hooks/useDebounce';
import type { CMSTeamMember } from '@/types/cms-team.types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { TeamForm } from '@/components/admin/forms/TeamForm';

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function AdminTeam() {
  // CRUD hooks
  const teamCRUD = useCRUD<CMSTeamMember>({
    table: 'cms_team_members',
    queryKey: 'cms-team',
    orderBy: { column: 'display_order', ascending: false },
  });

  const { data: response, isLoading } = teamCRUD.useList();
  const createMutation = teamCRUD.useCreate();
  const updateMutation = teamCRUD.useUpdate();
  const deleteMutation = teamCRUD.useDelete();

  // Local state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [editItem, setEditItem] = useState<CMSTeamMember | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  // Data from response
  const teamMembers = useMemo(() => response?.data || [], [response?.data]);

  // Filter team members
  const filteredMembers = useMemo(() => {
    return teamMembers.filter((member) => {
      // Search filter (name or role)
      const matchesSearch =
        !debouncedSearch ||
        member.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        member.role.toLowerCase().includes(debouncedSearch.toLowerCase());

      // Role filter
      const matchesRole =
        roleFilter === 'all' ||
        member.role.toLowerCase().includes(roleFilter.toLowerCase());

      // Active filter
      const matchesActive =
        activeFilter === 'all' ||
        (activeFilter === 'active' && member.is_active) ||
        (activeFilter === 'inactive' && !member.is_active);

      return matchesSearch && matchesRole && matchesActive;
    });
  }, [teamMembers, debouncedSearch, roleFilter, activeFilter]);

  // ===================================================
  // HANDLERS
  // ===================================================

  const handleCreate = () => {
    setEditItem(null);
    setIsFormOpen(true);
  };

  const handleEdit = (member: CMSTeamMember) => {
    setEditItem(member);
    setIsFormOpen(true);
  };

  const handleSubmit = async (values: Partial<CMSTeamMember>) => {
    if (editItem) {
      await updateMutation.mutateAsync({ id: editItem.id, values });
      toast.success('팀원 수정 완료');
    } else {
      await createMutation.mutateAsync(values);
      toast.success('팀원 생성 완료');
    }
    setIsFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('팀원 삭제 완료');
      setDeleteId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      toast.error(`팀원 삭제 실패: ${message}`);
    }
  };

  const handleToggleActive = async (member: CMSTeamMember) => {
    try {
      await updateMutation.mutateAsync({
        id: member.id,
        values: { is_active: !member.is_active },
      });
      toast.success('활성 상태 변경');
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      toast.error(`상태 변경 실패: ${message}`);
    }
  };

  // ===================================================
  // UTILITIES
  // ===================================================

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <>
      <Helmet>
        <title>팀원 관리 | IDEA on Action</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">팀원 관리</h1>
            <p className="text-muted-foreground">팀원 프로필을 관리합니다</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            새 팀원 추가
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm font-medium text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm font-medium text-muted-foreground">Active</div>
            <div className="text-2xl font-bold">
              {teamMembers.filter((m) => m.is_active).length}
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm font-medium text-muted-foreground">Founders</div>
            <div className="text-2xl font-bold">
              {teamMembers.filter((m) => m.role.toLowerCase().includes('founder')).length}
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm font-medium text-muted-foreground">Developers</div>
            <div className="text-2xl font-bold">
              {teamMembers.filter((m) => m.role.toLowerCase().includes('developer')).length}
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="이름 또는 역할 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 역할</SelectItem>
              <SelectItem value="founder">Founder</SelectItem>
              <SelectItem value="developer">Developer</SelectItem>
              <SelectItem value="designer">Designer</SelectItem>
              <SelectItem value="community">Community</SelectItem>
            </SelectContent>
          </Select>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="active">활성</SelectItem>
              <SelectItem value="inactive">비활성</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredMembers && filteredMembers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>아바타</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>스킬</TableHead>
                  <TableHead>소셜</TableHead>
                  <TableHead>우선순위</TableHead>
                  <TableHead>활성</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    {/* Avatar */}
                    <TableCell>
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {getInitials(member.name)}
                        </div>
                      )}
                    </TableCell>

                    {/* Name */}
                    <TableCell className="font-medium">{member.name}</TableCell>

                    {/* Role */}
                    <TableCell>
                      <Badge variant="outline">{member.role}</Badge>
                    </TableCell>

                    {/* Skills */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {member.skills.slice(0, 3).map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {member.skills.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{member.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Social Links */}
                    <TableCell>
                      <div className="flex gap-2">
                        {member.social_links.github && (
                          <a
                            href={member.social_links.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="github"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Github className="h-4 w-4" />
                          </a>
                        )}
                        {member.social_links.linkedin && (
                          <a
                            href={member.social_links.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="linkedin"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Linkedin className="h-4 w-4" />
                          </a>
                        )}
                        {member.social_links.twitter && (
                          <a
                            href={member.social_links.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="twitter"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Twitter className="h-4 w-4" />
                          </a>
                        )}
                        {member.social_links.website && (
                          <a
                            href={member.social_links.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="website"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </TableCell>

                    {/* Display Order */}
                    <TableCell>
                      <Badge variant="outline">{member.display_order}</Badge>
                    </TableCell>

                    {/* Active */}
                    <TableCell>
                      <Switch
                        checked={member.is_active}
                        onCheckedChange={() => handleToggleActive(member)}
                      />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(member)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(member.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-muted-foreground">등록된 팀원이 없습니다</p>
              <Button onClick={handleCreate} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                첫 팀원 추가
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Form */}
      <TeamForm
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
            <AlertDialogTitle>팀원 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 팀원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
