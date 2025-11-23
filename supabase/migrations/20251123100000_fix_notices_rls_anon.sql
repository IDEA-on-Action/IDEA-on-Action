-- =====================================================
-- Fix notices RLS policy for anonymous users
-- 2025-11-23: 401 Unauthorized 에러 수정
--
-- 문제: anon 사용자가 공개 공지사항 조회 시 401 에러
-- 원인: user_has_permission(auth.uid(), ...) 호출 시 NULL 처리 문제
-- 해결: auth.uid() IS NOT NULL 조건 추가
-- =====================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Published notices are viewable by everyone" ON public.notices;

-- 새 정책 생성 (anon 사용자 안전 처리)
CREATE POLICY "Published notices are viewable by everyone"
  ON public.notices FOR SELECT
  TO anon, authenticated
  USING (
    -- 공개된 공지사항은 누구나 조회 가능
    status = 'published'
    -- 로그인한 사용자는 자신의 공지사항 조회 가능
    OR (auth.uid() IS NOT NULL AND author_id = auth.uid())
    -- 관리 권한이 있는 사용자는 모든 공지사항 조회 가능
    OR (auth.uid() IS NOT NULL AND public.user_has_permission(auth.uid(), 'notice:manage'))
  );

-- 정책 적용 확인을 위한 코멘트
COMMENT ON POLICY "Published notices are viewable by everyone" ON public.notices IS
  'anon 사용자도 published 상태의 공지사항을 조회할 수 있도록 수정 (2025-11-23)';
