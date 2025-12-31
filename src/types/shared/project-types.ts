/**
 * Project Types TypeScript Type Definitions
 *
 * Types for hybrid project classification (portfolio, experiment, partner)
 * Created: 2025-11-25
 * Related migrations:
 * - 20251125000002_create_project_types.sql
 */

// ============================================================================
// Project Type Enum
// ============================================================================

/**
 * Project type slug values
 */
export type ProjectTypeSlug = 'portfolio' | 'experiment' | 'partner';

/**
 * Project visibility options
 */
export type ProjectVisibility = 'public' | 'private' | 'unlisted';

// ============================================================================
// Main Types
// ============================================================================

/**
 * Project type entity
 * Matches: public.project_types table
 */
export interface ProjectType {
  id: string;
  slug: ProjectTypeSlug;
  name: string;
  name_ko: string;
  description: string | null;
  description_ko: string | null;
  icon: string | null;
  color: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Project type with statistics
 * Matches: public.project_type_stats view
 */
export interface ProjectTypeStats extends Omit<ProjectType, 'description' | 'description_ko' | 'is_active' | 'created_at' | 'updated_at'> {
  total_count: number;
  published_count: number;
  featured_count: number;
  active_count: number;
}

// ============================================================================
// Extended Portfolio Item Types
// ============================================================================

/**
 * External integrations metadata for portfolio items
 */
export interface PortfolioExternalIntegrations {
  notion?: {
    synced_at?: string;
    page_url?: string;
    last_edited_by?: string;
  };
  github?: {
    synced_at?: string;
    stars?: number;
    forks?: number;
    last_commit?: string;
    open_issues?: number;
  };
}

/**
 * Extended CMS portfolio item with project type and integrations
 * Extends the base cms_portfolio_items with new columns
 */
export interface ExtendedPortfolioItem {
  id: string;
  slug: string;
  title: string;
  status: 'planning' | 'active' | 'completed' | 'on_hold';
  summary: string;
  description: string | null;

  // Project classification
  project_type_id: string | null;
  project_type?: ProjectType;

  // Visibility & showcase
  visibility: ProjectVisibility;
  is_showcase: boolean;
  is_experimental: boolean;
  is_featured: boolean;
  is_published: boolean;

  // Client info (for partner projects)
  client_name: string | null;
  client_logo_url: string | null;

  // External integrations
  notion_page_id: string | null;
  github_repo: string | null;
  external_integrations: PortfolioExternalIntegrations;

  // Existing fields
  metrics: Record<string, unknown>;
  tech_stack: string[];
  team_members: string[];
  links: {
    website?: string;
    github?: string;
    demo?: string;
    docs?: string;
  };
  timeline: {
    start?: string;
    end?: string;
    phases?: Array<{
      name: string;
      start: string;
      end: string;
    }>;
  };
  tags: string[];
  thumbnail_url: string | null;
  gallery_urls: string[];
  display_order: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

// ============================================================================
// Form/Input Types
// ============================================================================

/**
 * Create portfolio item input with project type
 */
export interface CreatePortfolioInput {
  slug: string;
  title: string;
  summary: string;
  description?: string;
  project_type_id?: string;
  visibility?: ProjectVisibility;
  is_showcase?: boolean;
  is_experimental?: boolean;
  client_name?: string;
  client_logo_url?: string;
  notion_page_id?: string;
  github_repo?: string;
  metrics?: Record<string, unknown>;
  tech_stack?: string[];
  team_members?: string[];
  links?: Record<string, string>;
  timeline?: Record<string, unknown>;
  tags?: string[];
  thumbnail_url?: string;
  gallery_urls?: string[];
}

/**
 * Update portfolio item input with project type
 */
export interface UpdatePortfolioInput {
  title?: string;
  summary?: string;
  description?: string;
  status?: 'planning' | 'active' | 'completed' | 'on_hold';
  project_type_id?: string;
  visibility?: ProjectVisibility;
  is_showcase?: boolean;
  is_experimental?: boolean;
  is_featured?: boolean;
  is_published?: boolean;
  client_name?: string;
  client_logo_url?: string;
  notion_page_id?: string;
  github_repo?: string;
  external_integrations?: PortfolioExternalIntegrations;
  metrics?: Record<string, unknown>;
  tech_stack?: string[];
  team_members?: string[];
  links?: Record<string, string>;
  timeline?: Record<string, unknown>;
  tags?: string[];
  thumbnail_url?: string;
  gallery_urls?: string[];
  display_order?: number;
}

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Portfolio list filters
 */
export interface PortfolioFilters {
  project_type_id?: string;
  project_type_slug?: ProjectTypeSlug;
  visibility?: ProjectVisibility;
  status?: string;
  is_showcase?: boolean;
  is_experimental?: boolean;
  is_featured?: boolean;
  is_published?: boolean;
  has_notion?: boolean;
  has_github?: boolean;
  tags?: string[];
  search?: string;
}

// ============================================================================
// UI/Display Constants
// ============================================================================

/**
 * Project type display info (static, for immediate UI rendering)
 */
export const PROJECT_TYPE_INFO: Record<ProjectTypeSlug, {
  name: string;
  name_ko: string;
  icon: string;
  color: string;
  description_ko: string;
}> = {
  portfolio: {
    name: 'Portfolio',
    name_ko: '포트폴리오',
    icon: 'Briefcase',
    color: 'blue',
    description_ko: '완성된 프로젝트 쇼케이스',
  },
  experiment: {
    name: 'Experiment',
    name_ko: '실험',
    icon: 'FlaskConical',
    color: 'green',
    description_ko: 'Lab에서 진행 중인 실험 프로젝트',
  },
  partner: {
    name: 'Partnership',
    name_ko: '파트너십',
    icon: 'Handshake',
    color: 'purple',
    description_ko: '외부 파트너와의 협업 프로젝트',
  },
};

/**
 * Visibility display info
 */
export const VISIBILITY_INFO: Record<ProjectVisibility, {
  label: string;
  label_ko: string;
  icon: string;
  description_ko: string;
}> = {
  public: {
    label: 'Public',
    label_ko: '공개',
    icon: 'Globe',
    description_ko: '모든 사용자가 볼 수 있음',
  },
  private: {
    label: 'Private',
    label_ko: '비공개',
    icon: 'Lock',
    description_ko: '관리자만 볼 수 있음',
  },
  unlisted: {
    label: 'Unlisted',
    label_ko: '비공개 링크',
    icon: 'Link',
    description_ko: '링크가 있는 사용자만 볼 수 있음',
  },
};
