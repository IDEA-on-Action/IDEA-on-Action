-- BL-009: Generated Documents History Table
-- Migration: 20251127000001_create_generated_documents.sql
-- Author: Claude AI
-- Date: 2025-11-27
-- Description: 생성된 문서(xlsx, docx, pptx)의 이력을 관리하는 테이블

-- =====================================================
-- 1. GENERATED_DOCUMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('xlsx', 'docx', 'pptx')),
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  storage_path TEXT,
  metadata JSONB DEFAULT '{}',
  input_data JSONB DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES
-- =====================================================
-- 사용자별 조회 최적화
CREATE INDEX idx_generated_documents_user ON public.generated_documents(user_id);

-- 파일 유형별 조회 최적화
CREATE INDEX idx_generated_documents_type ON public.generated_documents(file_type);

-- 생성 날짜별 조회 최적화 (최신순)
CREATE INDEX idx_generated_documents_date ON public.generated_documents(generated_at DESC);

-- 복합 인덱스: 사용자 + 파일 유형 + 날짜
CREATE INDEX idx_generated_documents_user_type_date
  ON public.generated_documents(user_id, file_type, generated_at DESC);

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 문서만 조회 가능
CREATE POLICY "사용자는 자신의 문서만 조회"
  ON public.generated_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 사용자는 자신의 문서만 삽입 가능
CREATE POLICY "사용자는 자신의 문서만 삽입"
  ON public.generated_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 문서만 삭제 가능
CREATE POLICY "사용자는 자신의 문서만 삭제"
  ON public.generated_documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. COMMENTS
-- =====================================================
COMMENT ON TABLE public.generated_documents IS '생성된 문서 이력 테이블 (xlsx, docx, pptx)';
COMMENT ON COLUMN public.generated_documents.id IS '문서 이력 고유 ID';
COMMENT ON COLUMN public.generated_documents.user_id IS '생성한 사용자 ID';
COMMENT ON COLUMN public.generated_documents.template_id IS '사용한 템플릿 ID (선택)';
COMMENT ON COLUMN public.generated_documents.file_name IS '파일명';
COMMENT ON COLUMN public.generated_documents.file_type IS '파일 유형: xlsx, docx, pptx';
COMMENT ON COLUMN public.generated_documents.file_size IS '파일 크기 (bytes)';
COMMENT ON COLUMN public.generated_documents.storage_path IS 'Supabase Storage 경로 (선택)';
COMMENT ON COLUMN public.generated_documents.metadata IS '문서 메타데이터 (제목, 설명, 태그 등)';
COMMENT ON COLUMN public.generated_documents.input_data IS '입력 데이터 (재생성용)';
COMMENT ON COLUMN public.generated_documents.generated_at IS '생성 시간';

-- =====================================================
-- 5. STATISTICS FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_document_stats(p_user_id UUID)
RETURNS TABLE (
  file_type TEXT,
  count BIGINT,
  total_size BIGINT,
  latest_generated_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    file_type,
    COUNT(*) as count,
    COALESCE(SUM(file_size), 0) as total_size,
    MAX(generated_at) as latest_generated_at
  FROM public.generated_documents
  WHERE user_id = p_user_id
  GROUP BY file_type
  ORDER BY file_type;
$$;

COMMENT ON FUNCTION public.get_user_document_stats IS '사용자별 문서 생성 통계';
