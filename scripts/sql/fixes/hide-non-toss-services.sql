-- Hide non-essential services for Toss Payments review
-- Keep only 4 main development services visible
-- Note: status column only allows 'active', 'draft', 'archived'

-- Archive services (not for Toss review)
UPDATE services
SET status = 'archived', updated_at = NOW()
WHERE id IN (
  '0d19cee7-2c4a-416b-b6eb-21d527adf857', -- 비즈니스 컨설팅 패키지
  '33b02dd7-cc99-451c-aeef-42db34dd3cd7', -- AI 워크플로우 자동화 도구
  '45da60d6-8012-4b97-a7f9-64516135773d', -- 스마트 데이터 분석 플랫폼
  'bbece0b3-4b03-4574-b206-6431bbd4d856', -- 디자인 시스템 구축 - 스탠다드 패키지 (중복)
  'c00c4695-bb02-4aad-b7cd-e07dead6bf2a', -- MVP 개발 서비스 - 스탠다드 패키지 (중복)
  'bad6c273-e983-4450-8e1b-949ca88ed3de', -- 엔터프라이즈급 풀스택 개발 - 2인 팀 (중복)
  '66180f4e-d530-4fdb-a764-0b1fd97e044d'  -- 웹 애플리케이션 운영 관리 - Standard 플랜 (중복)
);

-- Ensure 4 main services are active
UPDATE services
SET status = 'active', updated_at = NOW()
WHERE slug IN ('mvp', 'fullstack', 'design', 'operations');

-- Verify results
SELECT id, title, slug, status
FROM services
ORDER BY
  CASE
    WHEN slug IN ('mvp', 'fullstack', 'design', 'operations') THEN 0
    ELSE 1
  END,
  title;
