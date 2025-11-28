-- Phase 11: Blog System
-- posts 테이블 생성

-- 1. posts 테이블
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT,
  featured_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  tags TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON public.posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);

-- 3. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_posts_updated_at ON public.posts;
CREATE TRIGGER trigger_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION update_posts_updated_at();

-- 4. RLS 정책
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 공개된 게시물은 누구나 조회 가능
CREATE POLICY "Published posts are viewable by everyone"
  ON public.posts
  FOR SELECT
  USING (status = 'published');

-- 작성자는 자신의 모든 게시물 조회 가능
CREATE POLICY "Authors can view own posts"
  ON public.posts
  FOR SELECT
  USING (auth.uid() = author_id);

-- 작성자는 자신의 게시물 수정 가능
CREATE POLICY "Authors can update own posts"
  ON public.posts
  FOR UPDATE
  USING (auth.uid() = author_id);

-- 작성자는 자신의 게시물 삭제 가능
CREATE POLICY "Authors can delete own posts"
  ON public.posts
  FOR DELETE
  USING (auth.uid() = author_id);

-- 인증된 사용자는 게시물 생성 가능
CREATE POLICY "Authenticated users can create posts"
  ON public.posts
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 5. 샘플 데이터 (선택적)
INSERT INTO public.posts (title, slug, content, excerpt, status, tags, categories, published_at)
VALUES
  (
    'AI 기반 워킹 솔루션의 미래',
    'future-of-ai-working-solutions',
    '## AI가 바꾸는 업무 환경

인공지능 기술의 발전으로 업무 환경이 빠르게 변화하고 있습니다. VIBE WORKING은 이러한 변화의 최전선에서 혁신적인 솔루션을 제공합니다.

### 주요 트렌드

1. **자동화된 워크플로우**: 반복적인 작업을 AI가 처리
2. **스마트 의사결정**: 데이터 기반 인사이트 제공
3. **협업 최적화**: AI 기반 커뮤니케이션 도구

### 결론

AI 워킹 솔루션은 더 이상 선택이 아닌 필수입니다.',
    'AI 기술이 업무 환경을 어떻게 변화시키고 있는지 살펴봅니다.',
    'published',
    ARRAY['AI', '워킹솔루션', '미래기술'],
    ARRAY['기술', '트렌드'],
    NOW()
  ),
  (
    '효율적인 데이터 분석 가이드',
    'efficient-data-analysis-guide',
    '## 데이터 분석의 기초

비즈니스 성공의 핵심은 데이터에 있습니다. 이 가이드에서는 효율적인 데이터 분석 방법을 소개합니다.

### 분석 프로세스

1. 데이터 수집
2. 데이터 정제
3. 분석 및 시각화
4. 인사이트 도출

### 도구 추천

- Python + Pandas
- Tableau
- Power BI',
    '비즈니스 데이터를 효과적으로 분석하는 방법을 알아봅니다.',
    'published',
    ARRAY['데이터분석', '비즈니스인텔리전스'],
    ARRAY['가이드', '분석'],
    NOW() - INTERVAL '1 day'
  ),
  (
    '2025년 디지털 트랜스포메이션 전략',
    '2025-digital-transformation-strategy',
    '## 디지털 전환의 핵심 요소

디지털 트랜스포메이션은 단순한 기술 도입이 아닌 비즈니스 모델의 근본적인 변화입니다.

### 핵심 전략

- 클라우드 우선 접근
- 고객 경험 중심 설계
- 애자일 문화 구축

(작성 중...)',
    '2025년을 대비한 디지털 전환 전략을 수립합니다.',
    'draft',
    ARRAY['디지털트랜스포메이션', '전략'],
    ARRAY['전략', '비즈니스'],
    NULL
  );

COMMENT ON TABLE public.posts IS 'Phase 11: 블로그 게시물 테이블';
