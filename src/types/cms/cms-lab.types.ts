/**
 * CMS Lab Item Type Definitions
 * Based on cms_lab_items table (20251120000002_create_cms_lab_items.sql)
 */

// =====================================================
// ENUMS
// =====================================================

export type LabStatus = 'open' | 'in_progress' | 'completed' | 'closed';
export type LabDifficulty = 'beginner' | 'intermediate' | 'advanced';

// =====================================================
// JSONB STRUCTURES
// =====================================================

/**
 * Lab applicant structure (JSONB array)
 */
export interface LabApplicant {
  user_id: string;
  name: string;
  applied_at: string; // ISO 8601
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
}

// =====================================================
// DATABASE TABLE
// =====================================================

/**
 * CMS Lab Item (Bounty)
 * Table: public.cms_lab_items
 */
export interface CMSLabItem {
  id: string; // UUID
  slug: string; // unique
  title: string;
  status: LabStatus;
  description: string; // Markdown
  difficulty: LabDifficulty;
  reward?: string | null; // "$500", "10% equity", etc.
  skills_required: string[]; // ["React", "TypeScript"]
  github_url?: string | null;
  applicants: LabApplicant[]; // JSONB array
  contributors: string[]; // Array of names
  tags: string[]; // Array of tag slugs
  is_published: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  created_by?: string | null; // UUID
  updated_by?: string | null; // UUID
}

// =====================================================
// INSERT & UPDATE TYPES
// =====================================================

export type CMSLabItemInsert = Omit<CMSLabItem, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>;
export type CMSLabItemUpdate = Partial<CMSLabItemInsert>;

// =====================================================
// FORM TYPES
// =====================================================

/**
 * Lab form values for React Hook Form (Zod schema)
 */
export interface LabFormValues {
  title: string;
  slug: string;
  status: LabStatus;
  description: string; // Markdown
  difficulty: LabDifficulty;
  reward?: string; // Optional reward
  skills_required: string[]; // MultiSelect
  github_url?: string; // URL
  contributors: string[]; // Display only
  tags: string[]; // MultiSelect from tags table
  is_published: boolean;
}

// =====================================================
// FILTERS
// =====================================================

export interface LabFilters {
  status?: LabStatus;
  difficulty?: LabDifficulty;
  is_published?: boolean;
  skills?: string[];
  tags?: string[];
}
