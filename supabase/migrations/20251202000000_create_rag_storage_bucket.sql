-- ============================================================================
-- RAG 문서 Storage 버킷 생성
--
-- 파일: 20251202000000_create_rag_storage_bucket.sql
-- 작성일: 2025-12-02
-- 버전: 2.30.0
--
-- 목적:
-- - RAG 시스템용 문서 파일 저장 버킷 생성
-- - PDF, TXT, MD 파일 업로드 지원
-- - RLS 정책 설정 (사용자별 접근 제어)
-- ============================================================================

-- 트랜잭션 시작
BEGIN;

-- ============================================================================
-- 1. 기존 정책 삭제 (충돌 방지)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own and public documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all rag documents" ON storage.objects;

-- ============================================================================
-- 2. Storage 버킷 생성
-- ============================================================================

-- rag-documents 버킷 생성 (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rag-documents',
  'rag-documents',
  false, -- 비공개 (RLS로 접근 제어)
  10485760, -- 10MB 파일 크기 제한
  ARRAY[
    'text/plain',
    'text/markdown',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- .docx
    'application/msword' -- .doc
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- 3. RLS 정책 생성
-- ============================================================================

-- 정책 1: 사용자는 자신의 문서와 공개 문서 조회 가능
CREATE POLICY "Users can view own and public rag documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'rag-documents'
  AND (
    -- 자신의 문서
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- 공개 문서 (public/ 폴더)
    (storage.foldername(name))[1] = 'public'
  )
);

-- 정책 2: 사용자는 자신의 폴더에만 업로드 가능
CREATE POLICY "Users can upload own rag documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rag-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 정책 3: 사용자는 자신의 문서만 업데이트 가능
CREATE POLICY "Users can update own rag documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'rag-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 정책 4: 사용자는 자신의 문서만 삭제 가능
CREATE POLICY "Users can delete own rag documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'rag-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 정책 5: 관리자는 모든 문서 관리 가능
CREATE POLICY "Admins can manage all rag documents"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'rag-documents'
  AND EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  )
);

-- 정책 6: 서비스 역할은 모든 작업 가능 (Edge Function용)
CREATE POLICY "Service role full access rag documents"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'rag-documents')
WITH CHECK (bucket_id = 'rag-documents');

-- ============================================================================
-- 4. 정책 코멘트
-- ============================================================================

COMMENT ON POLICY "Users can view own and public rag documents" ON storage.objects IS
  'RAG: 사용자는 자신의 문서와 공개 문서 조회 가능';

COMMENT ON POLICY "Users can upload own rag documents" ON storage.objects IS
  'RAG: 사용자는 자신의 폴더에만 업로드 가능';

COMMENT ON POLICY "Users can update own rag documents" ON storage.objects IS
  'RAG: 사용자는 자신의 문서만 업데이트 가능';

COMMENT ON POLICY "Users can delete own rag documents" ON storage.objects IS
  'RAG: 사용자는 자신의 문서만 삭제 가능';

COMMENT ON POLICY "Admins can manage all rag documents" ON storage.objects IS
  'RAG: 관리자는 모든 문서 관리 가능';

COMMENT ON POLICY "Service role full access rag documents" ON storage.objects IS
  'RAG: 서비스 역할은 모든 작업 가능 (Edge Function용)';

-- ============================================================================
-- 마이그레이션 완료
-- ============================================================================

COMMIT;

-- 마이그레이션 확인
DO $$
BEGIN
  RAISE NOTICE 'RAG 문서 Storage 버킷 생성 완료';
  RAISE NOTICE '- 버킷 ID: rag-documents';
  RAISE NOTICE '- 파일 크기 제한: 10MB';
  RAISE NOTICE '- 허용 타입: text/plain, text/markdown, application/pdf, .docx, .doc';
  RAISE NOTICE '- RLS 정책 6개 적용됨';
END $$;
