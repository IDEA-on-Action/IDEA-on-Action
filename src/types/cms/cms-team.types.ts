/**
 * CMS Team Members - Additional Types
 *
 * Extends base TeamMember type from cms.types.ts
 * with CMS-specific fields matching cms_team_members table
 */

import { BaseEntity } from '@/hooks/useCRUD';

/**
 * Social links structure (JSONB field)
 */
export interface CMSTeamSocialLinks {
  github?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
}

/**
 * CMS Team Member (cms_team_members table)
 */
export interface CMSTeamMember extends BaseEntity {
  name: string;
  role: string;
  bio?: string | null;
  avatar_url?: string | null;
  skills: string[];
  social_links: CMSTeamSocialLinks;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

/**
 * Insert type (omit auto-generated fields)
 */
export type CMSTeamMemberInsert = Omit<CMSTeamMember, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>;

/**
 * Update type (partial fields)
 */
export type CMSTeamMemberUpdate = Partial<CMSTeamMemberInsert>;

/**
 * Filter options
 */
export interface CMSTeamMemberFilters {
  is_active?: boolean;
  role?: string;
  skills?: string[];
}

/**
 * Form values for React Hook Form
 */
export interface TeamFormValues {
  name: string;
  role: string;
  bio?: string;
  avatar_url?: string;
  skills: string[];
  social_links: CMSTeamSocialLinks;
  display_order: number;
  is_active: boolean;
}
