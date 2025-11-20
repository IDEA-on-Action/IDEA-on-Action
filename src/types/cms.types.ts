/**
 * CMS TypeScript Type Definitions
 *
 * Generated from Supabase migration files (20251115170300-170307)
 *
 * Type mapping:
 * - UUID → string
 * - TEXT → string
 * - TEXT[] → string[]
 * - TIMESTAMPTZ → string (ISO 8601)
 * - BOOLEAN → boolean
 * - INTEGER → number
 * - JSONB → Record<string, any>
 * - DATE → string (YYYY-MM-DD)
 */

// =====================================================
// ENUMS
// =====================================================

/**
 * Admin role types (CMS-001)
 */
export type AdminRole = 'super_admin' | 'admin' | 'editor';

/**
 * Roadmap item categories (CMS-002)
 */
export type RoadmapCategory = 'service' | 'platform' | 'internal';

/**
 * Roadmap item status (CMS-002)
 */
export type RoadmapStatus = 'planned' | 'in-progress' | 'completed' | 'on-hold';

/**
 * Portfolio project types (CMS-003)
 */
export type PortfolioProjectType = 'mvp' | 'fullstack' | 'design' | 'operations';

/**
 * Lab item categories (CMS-004)
 */
export type LabCategory = 'experiment' | 'idea' | 'community' | 'research';

/**
 * Lab item status (CMS-004)
 */
export type LabStatus = 'exploring' | 'developing' | 'testing' | 'completed' | 'archived';

/**
 * Blog post status (CMS-005)
 */
export type BlogPostStatus = 'draft' | 'published' | 'archived';

// =====================================================
// UI TYPES - Admin Layout
// =====================================================

/**
 * Admin menu item for navigation
 * Used in AdminSidebar component
 */
export interface AdminMenuItem {
  label: string;
  path: string;
  icon: any; // LucideIcon type (imported from lucide-react)
  badge?: number;
  children?: AdminMenuItem[];
}

// =====================================================
// INTERFACES - Database Tables
// =====================================================

/**
 * Admin users with role-based permissions (CMS-001)
 * Table: public.admins
 */
export interface Admin {
  id: string; // UUID
  userId: string; // UUID (FK to auth.users)
  role: AdminRole;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Quarterly roadmap items with status and progress tracking (CMS-002)
 * Table: public.roadmap_items
 */
export interface RoadmapItem {
  id: string; // UUID
  title: string;
  description: string | null;
  category: RoadmapCategory;
  status: RoadmapStatus;
  progress: number; // 0-100
  priority: number;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  tags: string[];
  published: boolean;
  createdBy: string | null; // UUID (FK to admins.user_id)
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Portfolio case studies with detailed project information (CMS-003)
 * Table: public.portfolio_items
 */
export interface PortfolioItem {
  id: string; // UUID
  slug: string; // unique
  title: string;
  summary: string;
  description: string | null;
  clientName: string | null;
  clientLogo: string | null;
  projectType: PortfolioProjectType;
  thumbnail: string | null;
  images: string[];
  techStack: string[];
  projectUrl: string | null;
  githubUrl: string | null;
  duration: string | null;
  teamSize: number | null;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  challenges: string | null;
  solutions: string | null;
  outcomes: string | null;
  testimonial: PortfolioTestimonial;
  featured: boolean;
  published: boolean;
  createdBy: string | null; // UUID (FK to admins.user_id)
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Portfolio testimonial structure (JSONB field)
 */
export interface PortfolioTestimonial {
  author?: string;
  role?: string;
  company?: string;
  content?: string;
  avatar?: string;
}

/**
 * Lab experiments and ideas with community participation (CMS-004)
 * Table: public.lab_items
 */
export interface LabItem {
  id: string; // UUID
  slug: string; // unique
  title: string;
  subtitle: string | null;
  description: string;
  content: string | null; // Markdown
  category: LabCategory;
  status: LabStatus;
  techStack: string[];
  githubUrl: string | null;
  demoUrl: string | null;
  contributors: string[];
  startDate: string | null; // YYYY-MM-DD
  tags: string[];
  published: boolean;
  createdBy: string | null; // UUID (FK to admins.user_id)
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Blog posts with Markdown support (CMS-005, extended from existing table)
 * Table: public.blog_posts
 *
 * Note: This interface includes only the NEW columns added in CMS Phase 1.
 * For the complete blog_posts type, see src/types/database.types.ts
 */
export interface BlogPostCMSExtension {
  summary?: string | null; // Short summary for SEO
  tags?: string[]; // Array of tag names
  featured?: boolean; // Pin to top
}

/**
 * Blog post categories with color and icon (CMS-007)
 * Table: public.blog_categories
 */
export interface BlogCategory {
  id: string; // UUID
  name: string;
  slug: string; // unique
  description: string | null;
  color: string; // hex color code (default: #3b82f6)
  icon: string; // icon name (default: folder)
  postCount: number; // cached count
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Team member information for About page (CMS-006)
 * Table: public.team_members
 */
export interface TeamMember {
  id: string; // UUID
  name: string;
  role: string;
  bio: string | null;
  avatar: string | null;
  email: string | null;
  skills: string[];
  socialLinks: TeamMemberSocialLinks;
  priority: number; // display order
  active: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Team member social links structure (JSONB field)
 */
export interface TeamMemberSocialLinks {
  github?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
}

/**
 * Global tags used across all content types (CMS-008)
 * Table: public.tags
 */
export interface Tag {
  id: string; // UUID
  name: string; // unique
  slug: string; // unique
  usageCount: number; // cached count
  createdAt: string; // ISO 8601
}

// =====================================================
// INSERT & UPDATE TYPES
// =====================================================

/**
 * Admin insert type (all fields except auto-generated)
 */
export type AdminInsert = Omit<Admin, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Admin update type (partial, excluding id)
 */
export type AdminUpdate = Partial<Omit<Admin, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Roadmap item insert type
 */
export type RoadmapItemInsert = Omit<RoadmapItem, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Roadmap item update type
 */
export type RoadmapItemUpdate = Partial<Omit<RoadmapItem, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Portfolio item insert type
 */
export type PortfolioItemInsert = Omit<PortfolioItem, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Portfolio item update type
 */
export type PortfolioItemUpdate = Partial<Omit<PortfolioItem, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Lab item insert type
 */
export type LabItemInsert = Omit<LabItem, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Lab item update type
 */
export type LabItemUpdate = Partial<Omit<LabItem, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Blog category insert type
 */
export type BlogCategoryInsert = Omit<BlogCategory, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Blog category update type
 */
export type BlogCategoryUpdate = Partial<Omit<BlogCategory, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Team member insert type
 */
export type TeamMemberInsert = Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Team member update type
 */
export type TeamMemberUpdate = Partial<Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Tag insert type
 */
export type TagInsert = Omit<Tag, 'id' | 'createdAt'>;

/**
 * Tag update type
 */
export type TagUpdate = Partial<Omit<Tag, 'id' | 'createdAt'>>;

// =====================================================
// HELPER TYPES
// =====================================================

/**
 * Admin with user details (joined with auth.users)
 */
export interface AdminWithUser extends Admin {
  user: {
    email: string;
    emailConfirmedAt: string | null;
    lastSignInAt: string | null;
  };
}

/**
 * Roadmap item with creator info
 */
export interface RoadmapItemWithCreator extends RoadmapItem {
  creator?: {
    userId: string;
    role: AdminRole;
  };
}

/**
 * Portfolio item with creator info
 */
export interface PortfolioItemWithCreator extends PortfolioItem {
  creator?: {
    userId: string;
    role: AdminRole;
  };
}

/**
 * Lab item with creator info
 */
export interface LabItemWithCreator extends LabItem {
  creator?: {
    userId: string;
    role: AdminRole;
  };
}

/**
 * Tag with related content counts
 */
export interface TagWithCounts extends Tag {
  roadmapCount?: number;
  portfolioCount?: number;
  labCount?: number;
  blogCount?: number;
}

// =====================================================
// QUERY FILTERS
// =====================================================

/**
 * Roadmap item filter options
 */
export interface RoadmapItemFilter {
  category?: RoadmapCategory;
  status?: RoadmapStatus;
  published?: boolean;
  tags?: string[];
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

/**
 * Portfolio item filter options
 */
export interface PortfolioItemFilter {
  projectType?: PortfolioProjectType;
  published?: boolean;
  featured?: boolean;
  techStack?: string[];
  tags?: string[];
}

/**
 * Lab item filter options
 */
export interface LabItemFilter {
  category?: LabCategory;
  status?: LabStatus;
  published?: boolean;
  tags?: string[];
  techStack?: string[];
}

/**
 * Blog category filter options
 */
export interface BlogCategoryFilter {
  slug?: string;
  minPostCount?: number;
}

/**
 * Team member filter options
 */
export interface TeamMemberFilter {
  active?: boolean;
  skills?: string[];
}

/**
 * Tag filter options
 */
export interface TagFilter {
  minUsageCount?: number;
  search?: string; // search in name
}

// =====================================================
// ADDITIONAL TYPES - Phase 2
// =====================================================

/**
 * Risk level for roadmap items
 */
export type RoadmapRiskLevel = 'low' | 'medium' | 'high';

/**
 * Portfolio status types
 */
export type PortfolioStatus = 'planning' | 'active' | 'completed' | 'on_hold';

/**
 * Lab difficulty levels
 */
export type LabDifficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * Tag category types
 */
export type TagCategory = 'general' | 'technical' | 'business';

/**
 * Activity log action types
 */
export type ActivityAction = 'create' | 'update' | 'delete' | 'publish' | 'unpublish';

// =====================================================
// JSONB FIELD TYPES
// =====================================================

/**
 * Roadmap milestone structure (used in roadmap.milestones JSONB)
 */
export interface RoadmapMilestone {
  id: string;
  title: string;
  description: string;
  due_date: string; // ISO 8601
  completed: boolean;
}

/**
 * Roadmap KPI structure (used in roadmap.kpis JSONB)
 */
export interface RoadmapKPI {
  metric: string;
  target: number;
  current: number;
  unit: string;
}

/**
 * Portfolio metrics structure (used in portfolio_items JSONB)
 */
export interface PortfolioMetrics {
  users?: number;
  time_saved?: string;
  satisfaction?: number;
  revenue?: number;
  [key: string]: number | string | undefined;
}

/**
 * Portfolio links structure (used in portfolio_items JSONB)
 */
export interface PortfolioLinks {
  live_url?: string;
  github_url?: string;
  documentation_url?: string;
  case_study_url?: string;
}

/**
 * Portfolio timeline structure (used in portfolio_items JSONB)
 */
export interface PortfolioTimeline {
  start_date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  duration_months?: number;
}

/**
 * Lab applicant structure (used in lab_items JSONB)
 */
export interface LabApplicant {
  user_id: string;
  applied_at: string; // ISO 8601
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
}

// =====================================================
// ADDITIONAL DATABASE TABLES
// =====================================================

/**
 * Media library for uploaded files (CMS-009)
 * Table: public.media_library
 */
export interface CMSMediaFile {
  id: string; // UUID
  fileName: string;
  fileSize: number; // bytes
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  caption?: string;
  uploadedBy: string; // UUID (FK to auth.users)
  tags: string[];
  metadata?: Record<string, unknown>; // JSONB (dimensions, duration, etc.)
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Activity log for audit trail (CMS-010)
 * Table: public.activity_logs
 */
export interface CMSActivityLog {
  id: string; // UUID
  userId: string; // UUID (FK to auth.users)
  action: ActivityAction;
  resourceType: string; // 'roadmap' | 'portfolio' | 'lab' | 'blog' | 'team' | 'tag'
  resourceId: string; // UUID
  resourceTitle?: string;
  details?: Record<string, unknown>; // JSONB (old/new values, etc.)
  ipAddress?: string;
  userAgent?: string;
  createdAt: string; // ISO 8601
}

// =====================================================
// INSERT & UPDATE TYPES - Phase 2
// =====================================================

/**
 * Media file insert type
 */
export type CMSMediaFileInsert = Omit<CMSMediaFile, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Media file update type
 */
export type CMSMediaFileUpdate = Partial<Omit<CMSMediaFile, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Activity log insert type
 */
export type CMSActivityLogInsert = Omit<CMSActivityLog, 'id' | 'createdAt'>;

// =====================================================
// FILTER TYPES - Extended
// =====================================================

/**
 * Base CMS filter options (common across all resources)
 */
export interface CMSFilters {
  search?: string;
  is_published?: boolean;
  created_by?: string;
  date_from?: string; // ISO 8601
  date_to?: string; // ISO 8601
}

/**
 * Extended portfolio filters
 */
export interface PortfolioFilters extends CMSFilters {
  status?: PortfolioStatus;
  is_featured?: boolean;
  tags?: string[];
  projectType?: PortfolioProjectType;
}

/**
 * Extended lab filters
 */
export interface LabFilters extends CMSFilters {
  status?: LabStatus;
  difficulty?: LabDifficulty;
  tags?: string[];
  category?: LabCategory;
}

/**
 * Media file filters
 */
export interface MediaFilters {
  mime_type?: string;
  uploaded_by?: string;
  tags?: string[];
}

// =====================================================
// FORM TYPES (React Hook Form)
// =====================================================

/**
 * Roadmap form values for React Hook Form
 */
export interface RoadmapFormValues {
  quarter: string;
  theme: string;
  goal: string;
  progress: number;
  milestones: RoadmapMilestone[];
  kpis: RoadmapKPI[];
  risk_level: RoadmapRiskLevel;
  owner: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  is_published: boolean;
}

/**
 * Portfolio form values for React Hook Form
 */
export interface PortfolioFormValues {
  slug: string;
  title: string;
  summary: string;
  description?: string;
  clientName?: string;
  projectType: PortfolioProjectType;
  thumbnail?: string;
  images: string[];
  techStack: string[];
  projectUrl?: string;
  githubUrl?: string;
  duration?: string;
  teamSize?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  challenges?: string;
  solutions?: string;
  outcomes?: string;
  testimonial: PortfolioTestimonial;
  featured: boolean;
  published: boolean;
}

/**
 * Lab form values for React Hook Form
 */
export interface LabFormValues {
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  content?: string;
  category: LabCategory;
  status: LabStatus;
  techStack: string[];
  githubUrl?: string;
  demoUrl?: string;
  contributors: string[];
  startDate?: string; // YYYY-MM-DD
  tags: string[];
  published: boolean;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

/**
 * Paginated API response wrapper
 */
export interface CMSPaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/**
 * Mutation API response wrapper
 */
export interface CMSMutationResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}
