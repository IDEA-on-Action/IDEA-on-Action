/**
 * RBAC & Audit Log Types
 * Phase 10 Week 3
 */

export type RoleName = 'admin' | 'manager' | 'user' | 'viewer'
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage'
export type ResourceType = 'service' | 'blog' | 'notice' | 'user' | 'order' | 'system'

export interface Role {
  id: string
  name: RoleName
  description: string | null
  created_at: string
}

export interface Permission {
  id: string
  name: string
  resource: ResourceType
  action: PermissionAction
  description: string | null
  created_at: string
}

export interface UserRole {
  user_id: string
  role_id: string
  assigned_by: string | null
  assigned_at: string
}

export interface UserRoleWithDetails extends UserRole {
  role?: Role
  user?: {
    id: string
    email?: string
  }
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  resource: string
  resource_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface AuditLogWithUser extends AuditLog {
  user?: {
    id: string
    email?: string
  }
}

export interface AuditLogFilters {
  user_id?: string
  action?: string
  resource?: string
  start_date?: string
  end_date?: string
}
