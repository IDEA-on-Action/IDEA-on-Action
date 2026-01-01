/**
 * Audit Logs Page - Phase 10 Week 3
 */

import { useState } from 'react'
import { useAuditLogs } from '@/hooks/analytics/useAuditLogs'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollText } from 'lucide-react'
import type { AuditLogFilters } from '@/types/auth/rbac'
import { formatDistanceToNow } from 'date-fns'

export default function AuditLogs() {
  const [filters, setFilters] = useState<AuditLogFilters>({})

  const { data: logs, isLoading } = useAuditLogs(filters, 100)

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-green-500',
      update: 'bg-blue-500',
      delete: 'bg-red-500',
      login: 'bg-purple-500',
      logout: 'bg-gray-500',
    }
    return colors[action] || 'bg-gray-500'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ScrollText className="w-8 h-8" />
          Audit Logs
        </h1>
        <p className="text-muted-foreground mt-1">
          Track all user actions for security and compliance
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">User ID</label>
            <Input
              placeholder="Filter by user ID"
              value={filters.user_id || ''}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value || undefined })}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Action</label>
            <Select
              value={filters.action || 'all'}
              onValueChange={(v) => setFilters({ ...filters, action: v === 'all' ? undefined : v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Resource</label>
            <Select
              value={filters.resource || 'all'}
              onValueChange={(v) => setFilters({ ...filters, resource: v === 'all' ? undefined : v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="blog">Blog</SelectItem>
                <SelectItem value="notice">Notice</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="order">Order</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No audit logs found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Resource ID</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.user?.email || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <Badge className={getActionBadge(log.action)}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.resource}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.resource_id?.substring(0, 8) || '-'}
                  </TableCell>
                  <TableCell className="text-sm">{log.ip_address || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
