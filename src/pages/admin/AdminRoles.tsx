/**
 * Admin Roles Management - Phase 10 Week 3
 */

import { useState } from 'react'
import { useRoles, usePermissions, useUserRoles, useAssignRole, useRevokeRole } from '@/hooks/auth/useRBAC'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Shield, UserPlus, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

export default function AdminRoles() {
  const [searchUserId, setSearchUserId] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')

  const { data: roles, isLoading: rolesLoading } = useRoles()
  const { data: permissions } = usePermissions()
  const { data: userRoles } = useUserRoles(searchUserId)
  const assignRole = useAssignRole()
  const revokeRole = useRevokeRole()
  const { toast } = useToast()

  const handleAssignRole = async () => {
    if (!searchUserId || !selectedRoleId) return

    try {
      await assignRole.mutateAsync({ userId: searchUserId, roleId: selectedRoleId })
      toast({ title: 'Success', description: 'Role assigned successfully' })
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to assign role', variant: 'destructive' })
    }
  }

  const handleRevokeRole = async (roleId: string) => {
    if (!searchUserId) return

    try {
      await revokeRole.mutateAsync({ userId: searchUserId, roleId })
      toast({ title: 'Success', description: 'Role revoked successfully' })
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to revoke role', variant: 'destructive' })
    }
  }

  const getRolePermissions = (roleId: string) => {
    return permissions?.filter(p => {
      // This is simplified - in production, query role_permissions table
      return true
    }) || []
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="w-8 h-8" />
          Role Management (RBAC)
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage user roles and permissions
        </p>
      </div>

      {/* Roles Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {rolesLoading ? (
          <div>Loading...</div>
        ) : (
          roles?.map(role => (
            <Card key={role.id}>
              <CardHeader>
                <CardTitle className="text-lg">{role.name}</CardTitle>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">
                  {getRolePermissions(role.id).length} permissions
                </Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Assign Role to User */}
      <Card>
        <CardHeader>
          <CardTitle>Assign Role to User</CardTitle>
          <CardDescription>Enter user ID and select a role</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="User ID (UUID)"
              value={searchUserId}
              onChange={(e) => setSearchUserId(e.target.value)}
              className="flex-1"
            />
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles?.map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAssignRole} disabled={!searchUserId || !selectedRoleId}>
              <UserPlus className="w-4 h-4 mr-2" />
              Assign
            </Button>
          </div>

          {/* User's Current Roles */}
          {userRoles && userRoles.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Current Roles:</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRoles.map((ur) => (
                    <TableRow key={ur.role_id}>
                      <TableCell>
                        <Badge>{ur.role?.name}</Badge>
                      </TableCell>
                      <TableCell>{new Date(ur.assigned_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeRole(ur.role_id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
