// Version 2.0 Type Definitions

export interface Project {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description?: string;
  status: 'backlog' | 'in-progress' | 'validate' | 'launched';
  category: string;
  image?: string;
  tags: string[];
  metrics: ProjectMetrics;
  tech: ProjectTech;
  links: ProjectLinks;
  timeline: ProjectTimeline;
  highlights?: string[];
  // Storytelling fields (optional, DB migration pending)
  problem?: string;        // "어떤 문제를 해결했나?"
  solution?: string;       // "어떻게 해결했나?"
  impact?: ProjectImpact;  // 비즈니스 임팩트
  created_at: string;
  updated_at: string;
}

export interface ProjectImpact {
  users?: string;        // "5,000명 사용 중"
  timeSaved?: string;    // "월 100시간 절감"
  satisfaction?: string; // "4.8/5.0"
  revenue?: string;      // "월 500만원 매출" (선택)
}

export interface ProjectMetrics {
  progress: number;
  contributors: number;
  commits: number;
  tests: number;
  coverage?: number;
}

export interface ProjectTech {
  frontend?: string[];
  backend?: string[] | null;
  testing?: string[] | null;
  deployment?: string[];
}

export interface ProjectLinks {
  github?: string;
  demo?: string | null;
  docs?: string | null;
}

export interface ProjectTimeline {
  started: string;
  launched?: string | null;
  updated: string;
}

export interface Roadmap {
  id: number;
  quarter: string;
  theme: string;
  description?: string;
  progress: number;
  owner?: string;
  related_projects: string[];
  milestones: Milestone[];
  risk_level?: 'low' | 'medium' | 'high';
  kpis: Record<string, KPI>;
  start_date?: string;
  end_date?: string;
  // User-facing value fields (DB migration 20251116120000)
  user_benefits?: string[];     // ["버그 없는 서비스", "빠른 로딩"]
  stability_score?: number;     // 0-100, default 99 (99% uptime)
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  dueDate?: string;
  tasks?: string[];
}

export interface KPI {
  target: number;
  current: number;
  unit?: string;
}

export interface Log {
  id: number;
  type: 'release' | 'learning' | 'decision';
  title: string;
  content: string;
  project_id?: string | null;
  author_id?: string | null;
  tags: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Bounty {
  id: number;
  title: string;
  description: string;
  status: 'open' | 'assigned' | 'in-progress' | 'done' | 'pending';
  difficulty: '초급' | '중급' | '고급';
  reward: number;
  estimated_hours?: number;
  skills_required: string[];
  deliverables: string[];
  deadline?: string;
  assignee_id?: string | null;
  applicants: string[];
  project_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Proposal {
  id: number;
  name: string;
  email: string;
  company?: string;
  package: 'mvp' | 'consulting' | 'design' | 'other';
  budget?: string;
  message: string;
  preferred_contact?: 'email' | 'phone' | 'calendar';
  status: 'pending' | 'reviewing' | 'accepted' | 'rejected';
  phone?: string;
  user_id?: string | null;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProposalFormValues {
  name: string;
  email: string;
  company?: string;
  package: 'mvp' | 'consulting' | 'design' | 'other';
  budget?: string;
  message: string;
  preferred_contact?: 'email' | 'phone' | 'calendar';
  phone?: string;
}

// CMS Phase 1: Roadmap Items
export interface RoadmapItem {
  id: string;
  title: string;
  description?: string;
  category: 'service' | 'platform' | 'internal';
  status: 'planned' | 'in-progress' | 'completed' | 'on-hold';
  progress: number; // 0-100
  priority: number;
  start_date?: string;
  end_date?: string;
  tags: string[];
  published: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

// CMS Phase 1: Portfolio Items
export interface PortfolioItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description?: string;
  client_name?: string;
  client_logo?: string;
  project_type: 'mvp' | 'fullstack' | 'design' | 'operations';
  thumbnail?: string;
  images: string[];
  tech_stack: string[];
  project_url?: string;
  github_url?: string;
  duration?: string;
  team_size?: number;
  start_date?: string;
  end_date?: string;
  challenges?: string;
  solutions?: string;
  outcomes?: string;
  testimonial: PortfolioTestimonial;
  featured: boolean;
  published: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioTestimonial {
  author?: string;
  role?: string;
  company?: string;
  content?: string;
  avatar?: string;
}

// CMS Phase 1: Admins
export type AdminRole = 'super_admin' | 'admin' | 'editor';

export interface Admin {
  id: string;
  user_id: string;
  role: AdminRole;
  created_at: string;
  updated_at: string;
}

// Admin with user email and name (from admins table)
export interface AdminWithEmail extends Admin {
  email?: string;
  name?: string;
}
