-- Seed Sample Data for Sprint 2
-- Tables: projects, roadmap, logs, bounties, newsletter_subscriptions, work_with_us_inquiries
-- 각 테이블당 3개씩 (총 18개 레코드)

-- ================================================
-- 1. Projects (3개)
-- ================================================

INSERT INTO public.projects (id, slug, title, summary, description, status, category, tags, metrics, links)
VALUES
  (
    'project-homepage-v2',
    'homepage-v2',
    'Homepage v2.0 리뉴얼',
    '아이디어 실험실이자 커뮤니티형 프로덕트 스튜디오로 진화',
    '정적 소개 페이지를 넘어 Roadmap, Portfolio, Now, Lab, Community가 상호작용하는 동적 플랫폼으로 확장. Supabase 연동, Giscus 댓글, Newsletter 구독 기능 추가.',
    'in-progress',
    'Web Development',
    ARRAY['React', 'TypeScript', 'Supabase', 'Giscus'],
    '{"progress": 60, "contributors": 1, "commits": 45}'::jsonb,
    '{"github": "https://github.com/IDEA-on-Action/idea-on-action", "demo": "https://www.ideaonaction.ai"}'::jsonb
  ),
  (
    'project-weekly-recap',
    'weekly-recap',
    'Weekly Recap 자동화',
    '주간 활동 요약 자동 생성 및 발행 시스템',
    'Supabase Function과 GitHub Actions Cron을 활용하여 매주 월요일 자동으로 프로젝트 활동을 요약하고 Newsletter로 발송하는 시스템.',
    'launched',
    'Automation',
    ARRAY['Supabase', 'PostgreSQL', 'GitHub Actions'],
    '{"progress": 100, "contributors": 1, "commits": 12, "users": 50}'::jsonb,
    '{"github": "https://github.com/IDEA-on-Action/idea-on-action", "documentation": "https://www.ideaonaction.ai/docs/weekly-recap"}'::jsonb
  ),
  (
    'project-og-image-generator',
    'og-image-generator',
    'OG Image 자동 생성',
    'Playwright로 Open Graph 이미지 자동 생성',
    '소셜 미디어 공유 시 표시되는 OG Image를 Playwright를 사용하여 HTML 템플릿에서 자동으로 생성하는 스크립트.',
    'backlog',
    'Tooling',
    ARRAY['Playwright', 'Node.js', 'HTML'],
    '{"progress": 20, "contributors": 1, "commits": 3}'::jsonb,
    '{"github": "https://github.com/IDEA-on-Action/idea-on-action/tree/main/scripts"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- 2. Roadmap (3개 - 2025 Q1, Q2, Q3)
-- ================================================

INSERT INTO public.roadmap (quarter, theme, description, progress, milestones, kpis, risk_level, owner, related_projects, start_date, end_date)
VALUES
  (
    '2025 Q1',
    'Structure & Static Data',
    'Home 페이지 강화, SEO 최적화, Weekly Recap 자동화',
    100,
    '[
      {"title": "RLS 정책 수정", "status": "completed", "dueDate": "2025-01-11"},
      {"title": "Home 페이지 4개 섹션 추가", "status": "completed", "dueDate": "2025-01-13"},
      {"title": "SEO 최적화 (OG, JSON-LD)", "status": "completed", "dueDate": "2025-01-13"},
      {"title": "Weekly Recap 자동화", "status": "completed", "dueDate": "2025-01-14"}
    ]'::jsonb,
    '{"lighthouse_score": 90, "deployments": 5, "commits": 50}'::jsonb,
    'low',
    'Sinclair Seo',
    ARRAY['project-homepage-v2', 'project-weekly-recap'],
    '2025-01-09',
    '2025-01-14'
  ),
  (
    '2025 Q2',
    'Supabase Integration & Community',
    '데이터베이스 연동, Giscus 댓글, Work with Us 폼 구현',
    60,
    '[
      {"title": "Supabase 스키마 검증", "status": "in-progress", "dueDate": "2025-01-14"},
      {"title": "Dynamic Pages (Portfolio, Roadmap, Now, Lab)", "status": "pending", "dueDate": "2025-01-15"},
      {"title": "Giscus 통합 (Community, Blog)", "status": "pending", "dueDate": "2025-01-16"},
      {"title": "Work with Us + Newsletter 폼", "status": "pending", "dueDate": "2025-01-17"}
    ]'::jsonb,
    '{"pages_migrated": 2, "data_tables": 6, "tests_passing": 25}'::jsonb,
    'medium',
    'Sinclair Seo',
    ARRAY['project-homepage-v2'],
    '2025-01-14',
    '2025-01-18'
  ),
  (
    '2025 Q3',
    'Automation & Open Metrics',
    'Status 페이지, 이벤트 트래킹, SEO 최종 점검',
    0,
    '[
      {"title": "Status 페이지 Open Metrics", "status": "pending", "dueDate": "2025-01-20"},
      {"title": "GA4 이벤트 트래킹 (15개)", "status": "pending", "dueDate": "2025-01-21"},
      {"title": "SEO 최종 점검 (Sitemap, robots.txt)", "status": "pending", "dueDate": "2025-01-22"}
    ]'::jsonb,
    '{"events_tracked": 0, "metrics_exposed": 0}'::jsonb,
    'low',
    'Sinclair Seo',
    ARRAY['project-homepage-v2'],
    '2025-01-19',
    '2025-01-23'
  )
ON CONFLICT (quarter) DO NOTHING;

-- ================================================
-- 3. Logs (3개 - release, learning, decision)
-- ================================================

INSERT INTO public.logs (type, title, content, project_id, tags)
VALUES
  (
    'release',
    'Version 2.0 Sprint 1 완료',
    'Home 페이지 강화, SEO 최적화, Weekly Recap 자동화를 완료했습니다. 9개 STEP을 통해 RLS 정책 수정, 4개 섹션 추가, OG 메타 태그 설정, GitHub Actions 워크플로우 생성을 진행했습니다.',
    'project-homepage-v2',
    ARRAY['release', 'sprint-1', 'seo', 'automation']
  ),
  (
    'learning',
    'PostgreSQL RLS 정책 디버깅',
    'Roadmap과 Newsletter 테이블에서 401 오류가 발생했습니다. 근본 원인은 `GRANT SELECT ON table TO anon` 권한 누락이었습니다. RLS 정책만으로는 부족하고, PostgreSQL GRANT 권한도 함께 설정해야 한다는 것을 배웠습니다.',
    'project-homepage-v2',
    ARRAY['learning', 'postgresql', 'rls', 'debugging']
  ),
  (
    'decision',
    'Newsletter 자체 호스팅 vs Beehiiv',
    'Newsletter 구독 시스템으로 Beehiiv를 고려했으나, 데이터 소유권과 비용 절감을 위해 Supabase 자체 호스팅을 선택했습니다. Beehiiv는 구독자 1,000명 초과 시 고려하기로 결정했습니다.',
    'project-homepage-v2',
    ARRAY['decision', 'newsletter', 'supabase']
  )
ON CONFLICT DO NOTHING;

-- ================================================
-- 4. Bounties (3개 - open, assigned, done)
-- ================================================

INSERT INTO public.bounties (title, description, status, difficulty, reward, estimated_hours, skills_required, deliverables, deadline, project_id)
VALUES
  (
    'Portfolio 페이지 E2E 테스트 작성',
    'Portfolio 목록 페이지와 상세 페이지의 Playwright E2E 테스트를 작성합니다. 로딩/에러/빈 상태, 필터링 UI, 반응형 그리드를 테스트하는 5개 시나리오가 필요합니다.',
    'open',
    '중급',
    100000,
    3,
    ARRAY['Playwright', 'TypeScript', 'E2E Testing'],
    ARRAY['portfolio.spec.ts 파일 생성', '5개 테스트 시나리오 구현', 'CI 통과 확인'],
    '2025-01-16',
    'project-homepage-v2'
  ),
  (
    'Giscus 다크 모드 자동 전환 구현',
    'useTheme 훅과 연동하여 Giscus 댓글 위젯의 테마가 사이트 다크 모드와 자동으로 동기화되도록 구현합니다. Community와 BlogPost 페이지에 적용합니다.',
    'assigned',
    '초급',
    50000,
    2,
    ARRAY['React', 'TypeScript', 'Giscus'],
    ARRAY['GiscusComments 컴포넌트 생성', 'useTheme 훅 연동', '2개 페이지 통합'],
    '2025-01-17',
    'project-homepage-v2'
  ),
  (
    'OG Image 생성 스크립트 최적화',
    'Playwright를 사용한 OG Image 생성 스크립트의 성능을 개선합니다. file:// 프로토콜 대신 setContent() 메서드를 사용하여 타임아웃 문제를 해결했습니다.',
    'done',
    '초급',
    30000,
    1,
    ARRAY['Playwright', 'Node.js'],
    ARRAY['scripts/generate-og-image.js 수정', 'public/og-image.png 생성 (1200x630px)'],
    '2025-01-14',
    'project-og-image-generator'
  )
ON CONFLICT DO NOTHING;

-- ================================================
-- 5. Newsletter Subscriptions (3개)
-- ================================================

INSERT INTO public.newsletter_subscriptions (email, status, confirmed_at, unsubscribed_at)
VALUES
  (
    'test1@example.com',
    'pending',
    NULL,
    NULL
  ),
  (
    'test2@example.com',
    'confirmed',
    NOW() - INTERVAL '2 days',
    NULL
  ),
  (
    'test3@example.com',
    'unsubscribed',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (email) DO NOTHING;

-- ================================================
-- 6. Work with Us Inquiries (3개)
-- ================================================

INSERT INTO public.work_with_us_inquiries (name, email, company, package, budget, brief, status, admin_notes)
VALUES
  (
    '김철수',
    'chulsoo@example.com',
    '스타트업 ABC',
    'MVP',
    'under-10m',
    '간단한 랜딩 페이지와 뉴스레터 구독 기능이 필요합니다. React + Supabase 스택을 사용하고 싶습니다.',
    'pending',
    NULL
  ),
  (
    '이영희',
    'younghee@example.com',
    '테크 컴퍼니 XYZ',
    'Growth',
    '10m-30m',
    '기존 웹사이트를 리뉴얼하고 싶습니다. SEO 최적화, 성능 개선, 반응형 디자인이 필요합니다. 3개월 내 완료 희망합니다.',
    'contacted',
    '2025-01-15 미팅 예정. SEO 컨설팅 포함 견적 준비 중.'
  ),
  (
    '박민수',
    'minsoo@example.com',
    NULL,
    'Custom',
    'flexible',
    'AI 챗봇 통합, 실시간 알림, 결제 시스템이 포함된 커스텀 웹 플랫폼을 개발하고 싶습니다. 예산과 일정은 유연하게 조정 가능합니다.',
    'completed',
    '프로젝트 완료 (2025-01-10). 고객 만족도 5/5. 후속 유지보수 계약 진행 중.'
  )
ON CONFLICT DO NOTHING;

-- ================================================
-- 샘플 데이터 삽입 완료
-- ================================================
-- Total: 18 records
-- - projects: 3
-- - roadmap: 3
-- - logs: 3
-- - bounties: 3
-- - newsletter_subscriptions: 3
-- - work_with_us_inquiries: 3
-- ================================================
