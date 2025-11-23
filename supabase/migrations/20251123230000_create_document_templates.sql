-- Claude Skills: Document Templates Table
-- Migration: 20251123230000_create_document_templates.sql
-- Author: Claude AI
-- Date: 2025-11-23
-- Description: 문서 템플릿을 저장하는 테이블 생성

-- =====================================================
-- 1. DOCUMENT_TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('rfp', 'report', 'proposal', 'contract')),
  category VARCHAR(50) NOT NULL,
  description TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  variables TEXT[] DEFAULT '{}',
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES
-- =====================================================
-- 타입별 조회 최적화
CREATE INDEX idx_document_templates_type ON public.document_templates(type);

-- 카테고리별 조회 최적화
CREATE INDEX idx_document_templates_category ON public.document_templates(category);

-- 활성 템플릿 필터링 최적화
CREATE INDEX idx_document_templates_is_active ON public.document_templates(is_active);

-- 타입+카테고리별 기본 템플릿 유니크 제약 (is_default가 true인 경우에만)
CREATE UNIQUE INDEX idx_document_templates_default
  ON public.document_templates(type, category)
  WHERE is_default = true;

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 활성 템플릿 조회 가능
CREATE POLICY "Anyone can view active templates"
  ON public.document_templates FOR SELECT
  USING (is_active = true);

-- 관리자만 템플릿 관리 가능 (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage templates"
  ON public.document_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- =====================================================
-- 4. TRIGGERS
-- =====================================================
-- updated_at 자동 업데이트 트리거 (기존 함수 재사용)
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. COMMENTS
-- =====================================================
COMMENT ON TABLE public.document_templates IS '문서 템플릿 저장 테이블';
COMMENT ON COLUMN public.document_templates.id IS '템플릿 고유 ID';
COMMENT ON COLUMN public.document_templates.name IS '템플릿 이름';
COMMENT ON COLUMN public.document_templates.type IS '템플릿 유형: rfp (제안요청서), report (보고서), proposal (제안서), contract (계약서)';
COMMENT ON COLUMN public.document_templates.category IS '세부 카테고리: government, startup, enterprise, weekly, monthly 등';
COMMENT ON COLUMN public.document_templates.description IS '템플릿 설명';
COMMENT ON COLUMN public.document_templates.content IS '템플릿 구조 JSON (섹션, 필드, 스타일 정의)';
COMMENT ON COLUMN public.document_templates.variables IS '템플릿 변수 목록 (예: {company_name}, {project_title})';
COMMENT ON COLUMN public.document_templates.version IS '템플릿 버전';
COMMENT ON COLUMN public.document_templates.is_active IS '활성화 여부';
COMMENT ON COLUMN public.document_templates.is_default IS '해당 타입/카테고리의 기본 템플릿 여부';
COMMENT ON COLUMN public.document_templates.created_by IS '생성자 ID';
COMMENT ON COLUMN public.document_templates.created_at IS '생성 시간';
COMMENT ON COLUMN public.document_templates.updated_at IS '수정 시간';

-- =====================================================
-- 6. SAMPLE TEMPLATES (개발용)
-- =====================================================
INSERT INTO public.document_templates (name, type, category, description, content, variables, is_default) VALUES
-- RFP 템플릿
(
  '정부기관 RFP 템플릿',
  'rfp',
  'government',
  '공공기관 프로젝트 제안요청서 표준 양식',
  '{
    "sections": [
      {"id": "overview", "title": "사업 개요", "required": true},
      {"id": "scope", "title": "사업 범위", "required": true},
      {"id": "requirements", "title": "요구사항", "required": true},
      {"id": "schedule", "title": "추진 일정", "required": true},
      {"id": "budget", "title": "예산", "required": true},
      {"id": "evaluation", "title": "평가 기준", "required": true}
    ],
    "metadata": {"format": "docx", "pages": "10-20"}
  }',
  ARRAY['company_name', 'project_title', 'budget_amount', 'deadline', 'contact_person'],
  true
),
(
  '스타트업 RFP 템플릿',
  'rfp',
  'startup',
  '스타트업 협업 프로젝트 간소화 양식',
  '{
    "sections": [
      {"id": "problem", "title": "문제 정의", "required": true},
      {"id": "solution", "title": "해결 방안", "required": true},
      {"id": "timeline", "title": "일정", "required": true},
      {"id": "budget", "title": "예산", "required": false}
    ],
    "metadata": {"format": "docx", "pages": "5-10"}
  }',
  ARRAY['company_name', 'project_title', 'timeline', 'contact_email'],
  true
),
-- 보고서 템플릿
(
  '주간 업무 보고서',
  'report',
  'weekly',
  '주간 업무 진행 현황 보고서',
  '{
    "sections": [
      {"id": "summary", "title": "주간 요약", "required": true},
      {"id": "completed", "title": "완료된 작업", "required": true},
      {"id": "in_progress", "title": "진행 중인 작업", "required": true},
      {"id": "issues", "title": "이슈 및 리스크", "required": false},
      {"id": "next_week", "title": "다음 주 계획", "required": true}
    ],
    "metadata": {"format": "xlsx", "sheets": 1}
  }',
  ARRAY['report_date', 'author', 'department', 'project_name'],
  true
),
(
  '월간 KPI 보고서',
  'report',
  'monthly',
  '월간 KPI 성과 보고서',
  '{
    "sections": [
      {"id": "executive_summary", "title": "경영진 요약", "required": true},
      {"id": "kpi_metrics", "title": "KPI 지표", "required": true},
      {"id": "trends", "title": "트렌드 분석", "required": true},
      {"id": "recommendations", "title": "권고사항", "required": false}
    ],
    "metadata": {"format": "xlsx", "sheets": 4}
  }',
  ARRAY['report_month', 'author', 'department', 'target_kpis'],
  true
),
-- 제안서 템플릿
(
  '기업 프로젝트 제안서',
  'proposal',
  'enterprise',
  '대기업 프로젝트 제안서 양식',
  '{
    "sections": [
      {"id": "introduction", "title": "회사 소개", "required": true},
      {"id": "understanding", "title": "과제 이해", "required": true},
      {"id": "approach", "title": "수행 방안", "required": true},
      {"id": "team", "title": "투입 인력", "required": true},
      {"id": "schedule", "title": "추진 일정", "required": true},
      {"id": "pricing", "title": "가격 제안", "required": true}
    ],
    "metadata": {"format": "docx", "pages": "20-50"}
  }',
  ARRAY['client_name', 'project_title', 'submission_date', 'valid_until'],
  true
)
ON CONFLICT DO NOTHING;
