-- =============================================================================
-- EasyWord 프로젝트 포트폴리오 등록
-- 쉬운말 국어사전 - 다문화 가정 학생과 학습장애 청소년을 위한 맞춤형 단어장 서비스
-- =============================================================================

INSERT INTO portfolio_items (
  id,
  title,
  slug,
  description,
  short_description,
  client_name,
  category,
  technologies,
  featured_image,
  images,
  project_url,
  github_url,
  status,
  is_featured,
  display_order,
  completed_at,
  created_at,
  updated_at
) VALUES (
  -- UUID v4 생성 (SQLite 호환)
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
        substr(hex(randomblob(2)),2) || '-' ||
        substr('89ab', abs(random()) % 4 + 1, 1) ||
        substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),

  -- title
  '쉬운말 국어사전 (EasyWord)',

  -- slug
  'easyword',

  -- description (상세 설명)
  '다문화 가정 학생과 학습장애(난독증, 경계선 지능) 청소년을 위한 맞춤형 단어장 서비스입니다. AI가 학년별 수준에 맞는 쉬운 설명과 시각적 이미지, 일상적인 예문을 제공합니다. 주요 기능: 이미지 선택 (구글 3개 + AI 1개), 학년별 쉬운 뜻 설명 (5단계), 일상/출처 예문 생성, 난이도 분석, 다국어 지원, TTS 음성 지원.',

  -- short_description (요약)
  '학습장애 청소년을 위한 AI 기반 맞춤형 단어장 서비스',

  -- client_name
  'Minu',

  -- category
  'mvp',

  -- technologies (JSON 배열)
  '["Next.js 14","TypeScript","Tailwind CSS","shadcn/ui","Cloudflare Workers","Hono","Drizzle ORM","Cloudflare D1","Claude API","Gemini API","Google Custom Search","Naver API","Capacitor"]',

  -- featured_image (추후 업데이트 가능)
  NULL,

  -- images (JSON 배열)
  '[]',

  -- project_url
  'https://easyword.minu.best',

  -- github_url
  NULL,

  -- status
  'published',

  -- is_featured
  1,

  -- display_order
  0,

  -- completed_at (진행 중이므로 NULL)
  NULL,

  -- created_at, updated_at
  datetime('now'),
  datetime('now')
);
