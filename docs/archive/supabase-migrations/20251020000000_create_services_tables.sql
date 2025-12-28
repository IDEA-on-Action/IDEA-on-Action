-- Phase 8: Services & Categories Tables
-- Migration: 20251020000000_create_services_tables.sql
-- Author: Claude AI
-- Date: 2025-10-20
-- Description: Core service catalog tables for VIBE WORKING

-- =====================================================
-- 0. PREREQUISITES
-- =====================================================
-- Ensure pgcrypto extension is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- =====================================================
-- 1. SERVICE_CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- Lucide icon name (e.g., 'Zap', 'Brain', 'TrendingUp')
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.service_categories IS 'Service categories for organizing offerings';
COMMENT ON COLUMN public.service_categories.slug IS 'URL-friendly identifier (lowercase, hyphenated)';
COMMENT ON COLUMN public.service_categories.icon IS 'Lucide icon name for UI display';
COMMENT ON COLUMN public.service_categories.display_order IS 'Sort order for category display (lower = higher priority)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_service_categories_slug ON public.service_categories(slug);
CREATE INDEX IF NOT EXISTS idx_service_categories_active ON public.service_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_service_categories_display_order ON public.service_categories(display_order);

-- =====================================================
-- 2. SERVICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,

  -- Pricing
  price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),

  -- Media
  image_url TEXT, -- Primary featured image
  images JSONB DEFAULT '[]', -- Array of additional image URLs: ["url1", "url2", ...]

  -- Features & Metrics
  features JSONB DEFAULT '[]', -- Array of feature objects: [{ icon, title, description }, ...]
  metrics JSONB DEFAULT '{}', -- Service metrics: { users: 1000, satisfaction: 95, ... }

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.services IS 'Services offered by VIBE WORKING';
COMMENT ON COLUMN public.services.price IS 'Service price in KRW (Korean Won)';
COMMENT ON COLUMN public.services.images IS 'JSONB array of image URLs for gallery display';
COMMENT ON COLUMN public.services.features IS 'JSONB array of feature objects: [{ icon, title, description }, ...]';
COMMENT ON COLUMN public.services.metrics IS 'JSONB object with service metrics: { users, satisfaction, completion, revenue }';
COMMENT ON COLUMN public.services.status IS 'active (public), draft (hidden), or archived (discontinued)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON public.services(status);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON public.services(created_at DESC);

-- Partial index for active services (most common query)
CREATE INDEX IF NOT EXISTS idx_services_active
  ON public.services(created_at DESC)
  WHERE status = 'active';

-- =====================================================
-- 3. RLS POLICIES - Service Categories
-- =====================================================
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can view active categories
CREATE POLICY "Active categories are viewable by everyone"
  ON public.service_categories FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Authenticated users can view all categories (including inactive)
CREATE POLICY "Authenticated users can view all categories"
  ON public.service_categories FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify categories
CREATE POLICY "Admins can insert categories"
  ON public.service_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@ideaonaction.local'
    )
  );

CREATE POLICY "Admins can update categories"
  ON public.service_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@ideaonaction.local'
    )
  );

CREATE POLICY "Admins can delete categories"
  ON public.service_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@ideaonaction.local'
    )
  );

-- =====================================================
-- 4. RLS POLICIES - Services
-- =====================================================
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Everyone can view active services
CREATE POLICY "Active services are viewable by everyone"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- Authenticated users can view all services (including drafts)
CREATE POLICY "Authenticated users can view all services"
  ON public.services FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify services
CREATE POLICY "Admins can insert services"
  ON public.services FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@ideaonaction.local'
    )
  );

CREATE POLICY "Admins can update services"
  ON public.services FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@ideaonaction.local'
    )
  );

CREATE POLICY "Admins can delete services"
  ON public.services FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@ideaonaction.local'
    )
  );

-- =====================================================
-- 5. TRIGGERS (Auto-update timestamps)
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_service_categories_updated_at
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. SAMPLE DATA (Categories) - Development Only
-- =====================================================
INSERT INTO public.service_categories (name, slug, description, icon, display_order, is_active) VALUES
  ('AI 솔루션', 'ai-solutions', 'AI 기반 자동화 및 분석 솔루션', 'Brain', 10, true),
  ('데이터 분석', 'data-analytics', '빅데이터 분석 및 시각화 서비스', 'TrendingUp', 20, true),
  ('컨설팅', 'consulting', '비즈니스 컨설팅 및 전략 수립', 'Briefcase', 30, true),
  ('교육 & 트레이닝', 'education-training', 'AI 및 데이터 분석 교육 프로그램', 'GraduationCap', 40, true)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 7. SAMPLE DATA (Services) - Development Only
-- =====================================================
DO $$
DECLARE
  ai_category_id UUID;
  analytics_category_id UUID;
  consulting_category_id UUID;
BEGIN
  -- Get category IDs
  SELECT id INTO ai_category_id FROM public.service_categories WHERE slug = 'ai-solutions';
  SELECT id INTO analytics_category_id FROM public.service_categories WHERE slug = 'data-analytics';
  SELECT id INTO consulting_category_id FROM public.service_categories WHERE slug = 'consulting';

  -- Service 1: AI Workflow Automation
  INSERT INTO public.services (
    title, description, category_id, price, image_url, images, features, metrics, status
  ) VALUES (
    'AI 워크플로우 자동화 도구',
    '반복적인 업무를 자동화하여 생산성을 극대화하는 AI 기반 솔루션입니다. 문서 처리, 데이터 입력, 이메일 분류 등 다양한 업무를 자동화할 수 있습니다.',
    ai_category_id,
    1500000,
    'https://images.unsplash.com/photo-1677442136019-21780ecad995',
    '["https://images.unsplash.com/photo-1677442136019-21780ecad995", "https://images.unsplash.com/photo-1620712943543-bcc4688e7485", "https://images.unsplash.com/photo-1551434678-e076c223a692"]',
    '[
      {"icon": "Zap", "title": "자동화 워크플로우", "description": "반복 업무를 AI가 자동으로 처리합니다"},
      {"icon": "Brain", "title": "지능형 분류", "description": "문서와 이메일을 자동으로 분류합니다"},
      {"icon": "Clock", "title": "시간 절약", "description": "업무 시간을 최대 70% 단축합니다"},
      {"icon": "Shield", "title": "보안 강화", "description": "엔터프라이즈급 보안으로 데이터를 보호합니다"},
      {"icon": "Users", "title": "협업 기능", "description": "팀원들과 워크플로우를 공유하고 협업합니다"}
    ]',
    '{"users": 1234, "satisfaction": 95, "completion": 87, "revenue": 150000000}',
    'active'
  ) ON CONFLICT DO NOTHING;

  -- Service 2: Smart Data Analytics
  INSERT INTO public.services (
    title, description, category_id, price, image_url, images, features, metrics, status
  ) VALUES (
    '스마트 데이터 분석 플랫폼',
    '빅데이터를 실시간으로 분석하고 시각화하여 비즈니스 인사이트를 제공하는 플랫폼입니다. AI 기반 예측 분석으로 미래 트렌드를 파악할 수 있습니다.',
    analytics_category_id,
    2000000,
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
    '["https://images.unsplash.com/photo-1551288049-bebda4e38f71", "https://images.unsplash.com/photo-1460925895917-afdab827c52f", "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3"]',
    '[
      {"icon": "BarChart3", "title": "실시간 대시보드", "description": "데이터를 실시간으로 시각화합니다"},
      {"icon": "TrendingUp", "title": "예측 분석", "description": "AI가 미래 트렌드를 예측합니다"},
      {"icon": "Database", "title": "빅데이터 처리", "description": "대용량 데이터를 빠르게 처리합니다"},
      {"icon": "FileSpreadsheet", "title": "자동 리포트", "description": "분석 리포트를 자동으로 생성합니다"},
      {"icon": "Share2", "title": "쉬운 공유", "description": "인사이트를 팀원들과 공유합니다"}
    ]',
    '{"users": 856, "satisfaction": 92, "completion": 91, "revenue": 200000000}',
    'active'
  ) ON CONFLICT DO NOTHING;

  -- Service 3: Business Consulting
  INSERT INTO public.services (
    title, description, category_id, price, image_url, images, features, metrics, status
  ) VALUES (
    '비즈니스 컨설팅 패키지',
    'AI 및 데이터 분석 전문가가 귀사의 비즈니스 전략 수립을 지원합니다. 맞춤형 솔루션으로 경쟁력을 강화하세요.',
    consulting_category_id,
    5000000,
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40',
    '["https://images.unsplash.com/photo-1454165804606-c3d57bc86b40", "https://images.unsplash.com/photo-1600880292203-757bb62b4baf", "https://images.unsplash.com/photo-1552664730-d307ca884978"]',
    '[
      {"icon": "Target", "title": "전략 수립", "description": "데이터 기반 비즈니스 전략을 수립합니다"},
      {"icon": "Users", "title": "전문가 컨설팅", "description": "10년 이상 경력의 전문가가 지원합니다"},
      {"icon": "Lightbulb", "title": "맞춤형 솔루션", "description": "귀사에 최적화된 솔루션을 제안합니다"},
      {"icon": "CheckCircle", "title": "실행 지원", "description": "전략 실행까지 함께합니다"},
      {"icon": "LineChart", "title": "성과 측정", "description": "KPI 기반으로 성과를 측정합니다"}
    ]',
    '{"users": 342, "satisfaction": 98, "completion": 94, "revenue": 500000000}',
    'active'
  ) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Sample services created successfully';
END $$;
