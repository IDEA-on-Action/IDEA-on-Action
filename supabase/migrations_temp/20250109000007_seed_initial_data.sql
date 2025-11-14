-- Seed initial data for Version 2.0
-- This migration inserts sample data from JSON files into database tables

-- =====================================================
-- 1. PROJECTS (3 items)
-- =====================================================
INSERT INTO public.projects (id, slug, title, summary, description, status, category, tags, metrics, tech, links, timeline) VALUES
(
  'p001',
  'idea-on-action-homepage',
  'IDEA on Action Homepage',
  '커뮤니티형 프로덕트 스튜디오 웹사이트 - 아이디어 실험실에서 함께 만드는 혁신',
  'React + Vite + Supabase 기반의 풀스택 웹 애플리케이션. Phase 1-14 완료 후 Version 2.0으로 전환 중. 전자상거래, CMS, 인증, 분석 등 14개 Phase를 통해 완성된 프로덕션 레벨 프로젝트.',
  'in-progress',
  'Web Development',
  ARRAY['React', 'Vite', 'TypeScript', 'Supabase', 'Tailwind CSS', 'PWA'],
  '{"progress": 85, "contributors": 2, "commits": 450, "tests": 355, "coverage": 82}'::jsonb,
  '{"frontend": ["React 18", "TypeScript 5", "Vite 5", "Tailwind CSS 3", "shadcn/ui"], "backend": ["Supabase", "PostgreSQL", "Realtime"], "testing": ["Playwright", "Vitest", "Lighthouse"], "deployment": ["Vercel", "GitHub Actions"]}'::jsonb,
  '{"github": "https://github.com/IDEA-on-Action/idea-on-action", "demo": "https://www.ideaonaction.ai", "docs": "https://github.com/IDEA-on-Action/idea-on-action/tree/main/docs"}'::jsonb,
  '{"started": "2025-10-09", "launched": "2025-10-18", "updated": "2025-11-09"}'::jsonb
),
(
  'p002',
  'ai-coding-assistant',
  'AI Coding Assistant',
  'Claude를 활용한 AI 기반 코딩 어시스턴트 - 개발자의 생산성을 10배 향상',
  'Claude API를 활용하여 코드 생성, 리팩토링, 테스트 작성을 자동화하는 VSCode 확장 프로그램. SOT(Skeleton of Thought) 방법론을 적용하여 체계적인 개발 프로세스를 지원.',
  'validate',
  'Developer Tools',
  ARRAY['AI', 'Claude', 'VSCode', 'TypeScript', 'Extension'],
  '{"progress": 75, "contributors": 1, "commits": 120, "tests": 45, "coverage": 68}'::jsonb,
  '{"frontend": ["VSCode Extension API", "TypeScript", "React"], "backend": ["Claude API", "Node.js"], "testing": ["Jest", "VSCode Test Framework"], "deployment": ["VSCode Marketplace"]}'::jsonb,
  '{"github": "https://github.com/IDEA-on-Action/ai-coding-assistant", "demo": null, "docs": null}'::jsonb,
  '{"started": "2025-09-15", "launched": null, "updated": "2025-11-01"}'::jsonb
),
(
  'p003',
  'startup-playbook',
  'Startup Playbook',
  '스타트업 창업자를 위한 실전 플레이북 - 0→1 여정의 나침반',
  '실제 창업 경험을 바탕으로 작성된 스타트업 플레이북. 아이디어 검증부터 MVP 개발, 초기 고객 확보, 투자 유치까지 단계별 가이드와 템플릿을 제공.',
  'backlog',
  'Education',
  ARRAY['Startup', 'Business', 'Product', 'MVP'],
  '{"progress": 30, "contributors": 3, "commits": 45, "tests": 0, "coverage": 0}'::jsonb,
  '{"frontend": ["Markdown", "Docusaurus", "React"], "backend": null, "testing": null, "deployment": ["Vercel"]}'::jsonb,
  '{"github": "https://github.com/IDEA-on-Action/startup-playbook", "demo": null, "docs": null}'::jsonb,
  '{"started": "2025-10-20", "launched": null, "updated": "2025-10-25"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. ROADMAP (5 items)
-- =====================================================
INSERT INTO public.roadmap (quarter, theme, description, progress, owner, related_projects, milestones, risk_level, kpis, start_date, end_date) VALUES
(
  '2025 Q4',
  'Version 2.0 전환 완료 - 커뮤니티형 프로덕트 스튜디오',
  '소개용 정적 웹사이트에서 실시간 커뮤니티형 프로덕트 스튜디오로 전환. About, Roadmap, Portfolio, Now, Lab, Community 페이지 구축 및 Supabase 연동.',
  30,
  '서민원',
  ARRAY['p001'],
  '[{"id": "m001", "title": "Sprint 1: Structure & Static Data", "status": "in-progress", "dueDate": "2025-11-16", "tasks": ["React Router 라우팅 확장 (8개 페이지)", "정적 JSON 데이터 생성", "SEO/OG 메타태그 추가", "Lighthouse 90+ 유지"]}, {"id": "m002", "title": "Sprint 2: Supabase Integration & Community", "status": "pending", "dueDate": "2025-11-23", "tasks": ["Supabase 테이블 스키마 생성", "Giscus 댓글 시스템 통합", "Work with Us 폼 구현", "Newsletter 위젯 추가"]}, {"id": "m003", "title": "Sprint 3: Automation & Open Metrics", "status": "pending", "dueDate": "2025-11-30", "tasks": ["Weekly Recap 자동 생성", "Status 페이지 - 오픈 메트릭스", "E2E 테스트 작성", "프로덕션 배포"]}]'::jsonb,
  'low',
  '{"pageCount": {"target": 9, "current": 0}, "dataEntries": {"target": 20, "current": 15}, "testCoverage": {"target": 80, "current": 0}, "lighthouseScore": {"target": 90, "current": 92}}'::jsonb,
  '2025-10-01',
  '2025-12-31'
),
(
  '2026 Q1',
  'AI 코딩 어시스턴트 출시',
  'Claude 기반 VSCode 확장 프로그램 개발 및 배포. SOT 방법론을 적용한 체계적 코드 생성, 자동 리팩토링, 테스트 작성 기능 제공.',
  0,
  '서민원',
  ARRAY['p002'],
  '[{"id": "m004", "title": "Alpha Release", "status": "pending", "dueDate": "2026-01-31", "tasks": ["VSCode 확장 프로그램 개발", "Claude API 통합", "SOT 엔진 구현", "내부 테스트"]}, {"id": "m005", "title": "Beta Release", "status": "pending", "dueDate": "2026-02-28", "tasks": ["사용자 피드백 수집", "버그 수정 및 개선", "문서 작성", "베타 테스터 모집"]}, {"id": "m006", "title": "Public Launch", "status": "pending", "dueDate": "2026-03-31", "tasks": ["VSCode Marketplace 출시", "마케팅 캠페인", "블로그 포스트 작성", "커뮤니티 구축"]}]'::jsonb,
  'medium',
  '{"downloads": {"target": 1000, "current": 0}, "activeUsers": {"target": 500, "current": 0}, "satisfaction": {"target": 4.5, "current": 0}, "bugs": {"target": 10, "current": 0}}'::jsonb,
  '2026-01-01',
  '2026-03-31'
),
(
  '2026 Q2',
  'Startup Playbook 1.0 완성',
  '스타트업 창업자를 위한 실전 플레이북 작성 및 공개. 아이디어 검증부터 투자 유치까지 단계별 가이드와 템플릿 제공.',
  0,
  '서민원',
  ARRAY['p003'],
  '[{"id": "m007", "title": "콘텐츠 작성", "status": "pending", "dueDate": "2026-04-30", "tasks": ["10개 챕터 작성", "20개 템플릿 제작", "사례 연구 5개", "체크리스트 작성"]}, {"id": "m008", "title": "웹사이트 구축", "status": "pending", "dueDate": "2026-05-31", "tasks": ["Docusaurus 설정", "디자인 시스템 적용", "검색 기능 추가", "댓글 시스템 통합"]}, {"id": "m009", "title": "커뮤니티 런칭", "status": "pending", "dueDate": "2026-06-30", "tasks": ["Product Hunt 런칭", "뉴스레터 시작", "온라인 워크샵", "피드백 수집"]}]'::jsonb,
  'low',
  '{"chapters": {"target": 10, "current": 3}, "templates": {"target": 20, "current": 5}, "visitors": {"target": 5000, "current": 0}, "subscribers": {"target": 500, "current": 0}}'::jsonb,
  '2026-04-01',
  '2026-06-30'
),
(
  '2026 Q3',
  '커뮤니티 활성화 및 확장',
  'IDEA on Action 커뮤니티 활성화. 월간 밋업, 온라인 워크샵, 멘토링 프로그램 운영. 커뮤니티 기여자 100명 달성.',
  0,
  '서민원',
  ARRAY['p001', 'p002', 'p003'],
  '[{"id": "m010", "title": "월간 밋업 시작", "status": "pending", "dueDate": "2026-07-31", "tasks": ["밋업 플랫폼 선정", "첫 번째 밋업 기획", "연사 섭외", "참가자 모집"]}, {"id": "m011", "title": "온라인 워크샵", "status": "pending", "dueDate": "2026-08-31", "tasks": ["워크샵 커리큘럼 작성", "녹화 및 편집", "플랫폼 구축", "수강생 모집"]}, {"id": "m012", "title": "멘토링 프로그램", "status": "pending", "dueDate": "2026-09-30", "tasks": ["멘토 모집", "멘티 매칭 시스템", "프로그램 운영", "성과 측정"]}]'::jsonb,
  'medium',
  '{"contributors": {"target": 100, "current": 2}, "meetups": {"target": 3, "current": 0}, "workshops": {"target": 5, "current": 0}, "mentees": {"target": 20, "current": 0}}'::jsonb,
  '2026-07-01',
  '2026-09-30'
),
(
  '2026 Q4',
  '수익화 모델 실험',
  '지속 가능한 운영을 위한 수익화 모델 실험. 프리미엄 멤버십, 스폰서십, 컨설팅 서비스 등 다양한 모델 테스트.',
  0,
  '서민원',
  ARRAY['p001', 'p002', 'p003'],
  '[{"id": "m013", "title": "프리미엄 멤버십", "status": "pending", "dueDate": "2026-10-31", "tasks": ["멤버십 혜택 설계", "결제 시스템 통합", "마케팅 캠페인", "초기 회원 모집"]}, {"id": "m014", "title": "스폰서십 프로그램", "status": "pending", "dueDate": "2026-11-30", "tasks": ["스폰서 패키지 설계", "잠재 스폰서 발굴", "제안서 작성", "계약 체결"]}, {"id": "m015", "title": "컨설팅 서비스", "status": "pending", "dueDate": "2026-12-31", "tasks": ["서비스 메뉴 설계", "가격 책정", "포트폴리오 준비", "첫 프로젝트 수주"]}]'::jsonb,
  'high',
  '{"revenue": {"target": 10000000, "current": 0}, "premiumMembers": {"target": 50, "current": 0}, "sponsors": {"target": 3, "current": 0}, "consultingProjects": {"target": 2, "current": 0}}'::jsonb,
  '2026-10-01',
  '2026-12-31'
)
ON CONFLICT (quarter) DO NOTHING;

-- =====================================================
-- 3. LOGS (15 items, showing first 10)
-- =====================================================
INSERT INTO public.logs (type, title, content, project_id, tags, created_at) VALUES
('release', 'Phase 14 완료 - 고급 분석 대시보드', '사용자 행동 분석, 매출 차트 & KPI, 실시간 대시보드 구축 완료. 28개 E2E 테스트, 35개 유닛 테스트 추가. 총 355개 테스트 달성.', 'p001', ARRAY['release', 'analytics', 'dashboard'], '2025-11-04T00:00:00Z'),
('learning', 'Supabase Realtime 구독 패턴 학습', 'Supabase Realtime을 활용한 실시간 주문 및 이벤트 구독 패턴을 구현하면서 Presence API 사용법을 학습. 온라인 사용자 추적 및 실시간 업데이트 구현.', 'p001', ARRAY['learning', 'supabase', 'realtime'], '2025-11-03T00:00:00Z'),
('release', 'Phase 13 완료 - AI & 실시간 기능', '통합 검색 시스템, OpenAI 챗봇, Resend 이메일 알림 시스템 구축. 15개 E2E 테스트, 10개 유닛 테스트 추가.', 'p001', ARRAY['release', 'ai', 'search', 'notifications'], '2025-11-02T00:00:00Z'),
('decision', 'PWA 지원 결정 - Workbox 캐싱 전략', 'Vite PWA 플러그인 도입 결정. CacheFirst 전략으로 정적 리소스 캐싱, NetworkFirst 전략으로 API 요청 처리. 오프라인 사용성 대폭 개선.', 'p001', ARRAY['decision', 'pwa', 'performance'], '2025-10-30T00:00:00Z'),
('release', 'Phase 12 완료 - 성능 최적화 & PWA & i18n', 'Code Splitting으로 번들 크기 62.5% 감소. Sentry 에러 추적, GA4 통합, PWA 지원, i18n (한국어/영어) 추가.', 'p001', ARRAY['release', 'performance', 'pwa', 'i18n'], '2025-10-28T00:00:00Z'),
('learning', 'Code Splitting 최적화 전략', 'React.lazy + Suspense를 활용한 라우트 기반 코드 스플리팅 적용. Vite manualChunks로 vendor 라이브러리 분리. 초기 로딩 시간 40% 단축.', 'p001', ARRAY['learning', 'performance', 'code-splitting'], '2025-10-27T00:00:00Z'),
('decision', '테스트 전략 수립 - E2E 우선', 'Playwright E2E 테스트를 우선 작성하고, 핵심 비즈니스 로직만 Unit 테스트로 커버하는 전략 채택. 테스트 작성 시간 절약하면서도 높은 신뢰성 확보.', 'p001', ARRAY['decision', 'testing', 'strategy'], '2025-10-25T00:00:00Z'),
('release', 'Phase 11 완료 - CMS (블로그, 공지사항)', 'Markdown 기반 블로그 시스템, 공지사항, SEO 최적화 (robots.txt, sitemap.xml, RSS) 구현. 19개 E2E 테스트 추가.', 'p001', ARRAY['release', 'cms', 'blog', 'seo'], '2025-10-22T00:00:00Z'),
('release', 'Phase 10 완료 - SSO & 인증 강화', 'OAuth 확장 (Microsoft, Apple), TOTP 2FA, RBAC 역할 기반 접근 제어, 감사 로그 시스템 구축. 25개 E2E 테스트 추가.', 'p001', ARRAY['release', 'auth', 'security', 'rbac'], '2025-10-20T00:00:00Z'),
('release', 'Phase 9 완료 - 전자상거래 시스템', 'Zustand 장바구니, 주문 관리, Kakao Pay & Toss Payments 결제 게이트웨이 통합. 전자상거래 기능 완성.', 'p001', ARRAY['release', 'ecommerce', 'payment'], '2025-10-18T00:00:00Z');

-- =====================================================
-- 4. BOUNTIES (4 items)
-- =====================================================
INSERT INTO public.bounties (title, description, status, difficulty, reward, estimated_hours, skills_required, deliverables, deadline, project_id) VALUES
(
  'Giscus 댓글 시스템 통합',
  'GitHub Discussions 기반 Giscus 댓글 시스템을 블로그 및 커뮤니티 페이지에 통합합니다. 다크 모드 지원, i18n 통합, 반응형 디자인이 필요합니다.',
  'open',
  '중급',
  100000,
  8,
  ARRAY['React', 'TypeScript', 'GitHub API', 'Giscus'],
  ARRAY['GiscusEmbed 컴포넌트 구현', '다크 모드 테마 자동 전환', 'i18n 통합 (한국어/영어)', 'E2E 테스트 3개 작성', '문서 작성 (설치 가이드)'],
  '2025-11-20',
  'p001'
),
(
  'Weekly Recap 자동 생성 시스템',
  '활동 로그를 기반으로 주간 요약(Weekly Recap)을 자동 생성하는 Supabase Edge Function을 구현합니다. Markdown 형식으로 생성하며, 블로그 포스트로 자동 발행됩니다.',
  'open',
  '고급',
  150000,
  12,
  ARRAY['Deno', 'Supabase Edge Functions', 'PostgreSQL', 'AI/LLM'],
  ARRAY['Supabase Edge Function 구현', '로그 집계 SQL 쿼리', 'Markdown 템플릿 생성', 'CRON 스케줄링 설정', '블로그 자동 발행 연동'],
  '2025-11-30',
  'p001'
),
(
  '포트폴리오 필터링 & 검색 개선',
  '포트폴리오 페이지에 고급 필터링 및 검색 기능을 추가합니다. 태그, 카테고리, 상태별 필터링, 전체 텍스트 검색, 정렬 옵션을 구현합니다.',
  'assigned',
  '중급',
  80000,
  6,
  ARRAY['React', 'TypeScript', 'Zustand', 'Fuse.js'],
  ARRAY['FilterBar 컴포넌트 구현', '전체 텍스트 검색 (Fuse.js)', '다중 필터 조합 기능', 'URL 쿼리 파라미터 연동', 'Unit 테스트 5개 작성'],
  '2025-12-10',
  'p001'
),
(
  '실시간 협업 위젯 개발',
  'Supabase Presence API를 활용하여 현재 페이지를 보고 있는 사용자를 실시간으로 표시하는 위젯을 개발합니다. 아바타, 이름, 마우스 커서 위치를 공유합니다.',
  'pending',
  '고급',
  120000,
  10,
  ARRAY['React', 'Supabase Realtime', 'WebSocket', 'Canvas API'],
  ARRAY['PresenceWidget 컴포넌트', '실시간 커서 공유', '사용자 목록 표시', 'WebSocket 연결 관리', 'E2E 테스트 5개 작성'],
  '2025-12-15',
  'p001'
);

-- Comments
COMMENT ON TABLE public.projects IS 'Seeded with 3 initial projects from projects.json';
COMMENT ON TABLE public.roadmap IS 'Seeded with 5 quarterly roadmaps from roadmap.json';
COMMENT ON TABLE public.logs IS 'Seeded with 10 activity logs from logs.json (first 10 of 15)';
COMMENT ON TABLE public.bounties IS 'Seeded with 4 bounties from bounties.json';
