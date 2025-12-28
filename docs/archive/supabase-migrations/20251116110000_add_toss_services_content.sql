-- Add images and features to 4 main services for Toss Payments review
-- This migration adds sample images and features to make services presentable

-- 1. MVP 개발 서비스
UPDATE services
SET
  image_url = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
  images = '["https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800", "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800"]'::jsonb,
  features = '[
    {
      "title": "빠른 시장 검증",
      "description": "4-8주 내 MVP를 출시하여 **실제 사용자 피드백**을 빠르게 수집할 수 있습니다.\n\n- 핵심 기능 우선 개발\n- 조기 시장 진입\n- 리스크 최소화"
    },
    {
      "title": "검증된 기술 스택",
      "description": "**프로덕션 레벨**의 안정적인 기술 스택을 사용합니다.\n\n- Frontend: React, Next.js, Tailwind CSS\n- Backend: Node.js, Supabase, PostgreSQL\n- Deployment: Vercel, AWS, GCP"
    },
    {
      "title": "소스코드 & 배포",
      "description": "개발이 완료되면 **전체 소스코드**와 **배포 권한**을 이전해드립니다.\n\n- GitHub 저장소 이전\n- 배포 계정 이전\n- 4주 유지보수 지원"
    },
    {
      "title": "유지보수 지원",
      "description": "개발 완료 후 **4주간 무상 유지보수**를 제공합니다.\n\n- 버그 수정\n- 소규모 기능 개선\n- 배포 지원"
    }
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'mvp';

-- 2. Fullstack 개발 서비스
UPDATE services
SET
  image_url = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
  images = '["https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800", "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800"]'::jsonb,
  features = '[
    {
      "title": "확장 가능한 아키텍처",
      "description": "**마이크로서비스** 아키텍처로 설계하여 확장성을 보장합니다.\n\n- 독립적인 서비스 배포\n- 수평적 확장 가능\n- 고가용성 보장"
    },
    {
      "title": "프로덕션 레벨 코드",
      "description": "**엔터프라이즈급** 코드 품질을 제공합니다.\n\n- TypeScript 엄격 모드\n- 단위/통합 테스트 80%+\n- ESLint + Prettier"
    },
    {
      "title": "데이터베이스 설계",
      "description": "**정규화된 스키마**와 **인덱스 최적화**를 적용합니다.\n\n- PostgreSQL/MySQL\n- Redis 캐싱\n- 백업 및 복구 전략"
    },
    {
      "title": "API 문서화",
      "description": "**Swagger/OpenAPI** 기반 자동 문서화를 제공합니다.\n\n- RESTful API 설계\n- 인증/인가 시스템\n- 에러 핸들링"
    }
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'fullstack';

-- 3. Design System 서비스
UPDATE services
SET
  image_url = 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800',
  images = '["https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800", "https://images.unsplash.com/photo-1558655146-364adaf1fcc9?w=800"]'::jsonb,
  features = '[
    {
      "title": "일관된 브랜드 아이덴티티",
      "description": "**통일된 디자인 언어**로 브랜드 일관성을 유지합니다.\n\n- 색상 팔레트\n- 타이포그래피 시스템\n- 아이콘 라이브러리"
    },
    {
      "title": "재사용 가능한 컴포넌트",
      "description": "**50+ UI 컴포넌트**를 제공하여 개발 속도를 높입니다.\n\n- Button, Input, Card\n- Modal, Dropdown, Table\n- Form, Navigation, Layout"
    },
    {
      "title": "다크 모드 지원",
      "description": "**라이트/다크 테마**를 기본 지원합니다.\n\n- CSS 변수 기반\n- 자동 테마 전환\n- 사용자 설정 저장"
    },
    {
      "title": "접근성 보장",
      "description": "**WCAG 2.1 AA** 기준을 준수합니다.\n\n- 키보드 네비게이션\n- 스크린리더 지원\n- 색상 대비 4.5:1 이상"
    }
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'design';

-- 4. Operations 관리 서비스
UPDATE services
SET
  image_url = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
  images = '["https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800", "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800"]'::jsonb,
  features = '[
    {
      "title": "24/7 모니터링",
      "description": "**실시간 모니터링**으로 장애를 사전에 방지합니다.\n\n- Sentry 에러 추적\n- Uptime 모니터링\n- 성능 메트릭 수집"
    },
    {
      "title": "자동 배포 파이프라인",
      "description": "**CI/CD 자동화**로 배포 시간을 단축합니다.\n\n- GitHub Actions\n- 자동 테스트\n- 무중단 배포"
    },
    {
      "title": "백업 및 복구",
      "description": "**일일 자동 백업**으로 데이터를 안전하게 보호합니다.\n\n- 데이터베이스 백업\n- 파일 스토리지 백업\n- 복구 테스트"
    },
    {
      "title": "보안 업데이트",
      "description": "**정기 보안 패치**로 시스템을 안전하게 유지합니다.\n\n- 의존성 업데이트\n- 취약점 스캔\n- SSL 인증서 관리"
    }
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'operations';

-- Verify results
SELECT
  id,
  title,
  slug,
  image_url IS NOT NULL as has_image,
  jsonb_array_length(images) as image_count,
  jsonb_array_length(features) as feature_count
FROM services
WHERE slug IN ('mvp', 'fullstack', 'design', 'operations')
ORDER BY
  CASE slug
    WHEN 'mvp' THEN 1
    WHEN 'fullstack' THEN 2
    WHEN 'design' THEN 3
    WHEN 'operations' THEN 4
  END;
