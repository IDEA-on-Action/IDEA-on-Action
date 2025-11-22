# Sprint 4: 실시간 동기화

> Phase 4 - GitHub 연동, 진척률 자동화, 릴리즈 알림

**시작일**: 2025-12-15 (예정)
**종료일**: 2025-12-28 (예정)
**소요 기간**: 2주
**의존성**: Sprint 2, 3 완료

---

## 스프린트 목표

1. GitHub API 연동 (커밋, 이슈, 릴리즈)
2. 프로젝트 진척률 자동 계산
3. 릴리즈 감지 및 Changelog 자동 업데이트
4. 통합 테스트 및 최종 검증

---

## Week 1: GitHub 연동

### TASK-026: GitHub API 서비스 생성
**예상 시간**: 3시간
**담당**: Agent 1
**의존성**: 없음

**생성할 파일**:
```
src/lib/github-api.ts
```

**구현 내용**:
```typescript
// src/lib/github-api.ts
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: import.meta.env.VITE_GITHUB_TOKEN,
});

export async function getRepoStats(owner: string, repo: string) {
  const [repoData, commits, contributors] = await Promise.all([
    octokit.repos.get({ owner, repo }),
    octokit.repos.listCommits({ owner, repo, per_page: 1 }),
    octokit.repos.listContributors({ owner, repo }),
  ]);

  return {
    stars: repoData.data.stargazers_count,
    forks: repoData.data.forks_count,
    openIssues: repoData.data.open_issues_count,
    // commit count는 header에서 가져옴
    commits: parseInt(commits.headers.link?.match(/page=(\d+)>; rel="last"/)?.[1] || '0'),
    contributors: contributors.data.length,
    lastUpdated: new Date(repoData.data.updated_at),
  };
}

export async function getLatestRelease(owner: string, repo: string) {
  try {
    const { data } = await octokit.repos.getLatestRelease({ owner, repo });
    return {
      version: data.tag_name,
      name: data.name,
      body: data.body,
      publishedAt: new Date(data.published_at),
      htmlUrl: data.html_url,
    };
  } catch {
    return null; // 릴리즈 없음
  }
}

export async function getReleases(owner: string, repo: string, limit = 10) {
  const { data } = await octokit.repos.listReleases({
    owner,
    repo,
    per_page: limit,
  });
  return data.map(release => ({
    version: release.tag_name,
    name: release.name,
    body: release.body,
    publishedAt: new Date(release.published_at),
    htmlUrl: release.html_url,
  }));
}
```

**완료 기준**:
- [ ] GitHub API 서비스 생성
- [ ] Rate Limit 처리
- [ ] 에러 핸들링

---

### TASK-027: useGitHubStats 훅 생성
**예상 시간**: 2시간
**담당**: Agent 1
**의존성**: TASK-026

**생성할 파일**:
```
src/hooks/useGitHubStats.ts
```

**구현 내용**:
```typescript
export function useGitHubStats(repoUrl: string | null) {
  return useQuery({
    queryKey: ['github-stats', repoUrl],
    queryFn: async () => {
      if (!repoUrl) return null;

      // URL 파싱: https://github.com/owner/repo
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) return null;

      const [, owner, repo] = match;
      return getRepoStats(owner, repo);
    },
    enabled: !!repoUrl,
    staleTime: 60 * 60 * 1000, // 1시간
    gcTime: 24 * 60 * 60 * 1000, // 24시간
  });
}

export function useGitHubReleases(repoUrl: string | null, limit = 10) {
  return useQuery({
    queryKey: ['github-releases', repoUrl, limit],
    queryFn: async () => {
      if (!repoUrl) return [];

      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) return [];

      const [, owner, repo] = match;
      return getReleases(owner, repo, limit);
    },
    enabled: !!repoUrl,
    staleTime: 30 * 60 * 1000, // 30분
  });
}
```

**완료 기준**:
- [ ] useGitHubStats 훅 생성
- [ ] useGitHubReleases 훅 생성
- [ ] React Query 캐싱 적용

---

### TASK-028: github_stats_cache 테이블 마이그레이션
**예상 시간**: 1시간
**담당**: Agent 3
**의존성**: 없음

**마이그레이션 파일**:
```sql
-- 20251215000000_create_github_stats_cache.sql

CREATE TABLE github_stats_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_url TEXT NOT NULL UNIQUE,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  open_issues INTEGER DEFAULT 0,
  commits INTEGER DEFAULT 0,
  contributors INTEGER DEFAULT 0,
  last_release_version TEXT,
  last_release_date TIMESTAMPTZ,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
);

CREATE INDEX idx_github_cache_repo_url ON github_stats_cache(repo_url);
CREATE INDEX idx_github_cache_expires ON github_stats_cache(expires_at);

-- RLS
ALTER TABLE github_stats_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "github_cache_select_public"
  ON github_stats_cache FOR SELECT
  USING (true);
```

**완료 기준**:
- [ ] 마이그레이션 파일 생성
- [ ] 로컬 DB 테스트

---

### TASK-029: ProjectCard에 GitHub 정보 연동
**예상 시간**: 2시간
**담당**: Agent 2
**의존성**: TASK-027

**수정할 파일**:
```
src/pages/projects/components/ProjectCard.tsx
```

**구현 내용**:
```typescript
export function ProjectCard({ project, showGitHub = true }: Props) {
  const { data: githubStats } = useGitHubStats(
    showGitHub ? project.github_repo_url : null
  );

  return (
    <Card>
      {/* 기존 내용 */}

      {/* GitHub 정보 */}
      {githubStats && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span title="커밋">
            <GitCommit className="h-4 w-4 inline mr-1" />
            {githubStats.commits}
          </span>
          <span title="기여자">
            <Users className="h-4 w-4 inline mr-1" />
            {githubStats.contributors}
          </span>
          <span title="스타">
            <Star className="h-4 w-4 inline mr-1" />
            {githubStats.stars}
          </span>
        </div>
      )}
    </Card>
  );
}
```

**완료 기준**:
- [ ] GitHub 정보 표시
- [ ] 로딩 상태 처리
- [ ] 에러 시 graceful 처리

---

## Week 2: 진척률 & 릴리즈 알림

### TASK-030: 진척률 자동 계산 로직
**예상 시간**: 3시간
**담당**: Agent 1
**의존성**: TASK-027

**설명**:
마일스톤 기반 진척률 자동 계산

**구현 방식**:
1. projects 테이블에 milestones JSONB 컬럼 추가
2. 마일스톤 완료 비율로 진척률 계산
3. Edge Function으로 주기적 업데이트 (선택적)

**마이그레이션**:
```sql
-- projects 테이블 확장
ALTER TABLE projects ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT '[]'::jsonb;
-- [{name: '기획', completed: true}, {name: '개발', completed: false}, ...]

-- 진척률 계산 함수
CREATE OR REPLACE FUNCTION calculate_project_progress(project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total INTEGER;
  completed INTEGER;
BEGIN
  SELECT
    jsonb_array_length(milestones),
    (SELECT COUNT(*) FROM jsonb_array_elements(milestones) m WHERE (m->>'completed')::boolean)
  INTO total, completed
  FROM projects WHERE id = project_id;

  IF total = 0 THEN RETURN 0; END IF;
  RETURN (completed * 100 / total);
END;
$$ LANGUAGE plpgsql;
```

**완료 기준**:
- [ ] 마일스톤 컬럼 추가
- [ ] 진척률 계산 함수 생성
- [ ] 프로젝트 카드에 반영

---

### TASK-031: GitHub Release 감지 Edge Function
**예상 시간**: 4시간
**담당**: Agent 2
**의존성**: TASK-026, TASK-018

**생성할 파일**:
```
supabase/functions/sync-github-releases/index.ts
```

**구현 내용**:
```typescript
// Cron으로 1시간마다 실행 또는 Webhook
import { createClient } from '@supabase/supabase-js';
import { getLatestRelease } from './github-api';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // GitHub URL이 있는 프로젝트 조회
  const { data: projects } = await supabase
    .from('projects')
    .select('id, github_repo_url, title')
    .not('github_repo_url', 'is', null);

  for (const project of projects || []) {
    const match = project.github_repo_url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) continue;

    const [, owner, repo] = match;
    const release = await getLatestRelease(owner, repo);

    if (!release) continue;

    // 이미 기록된 릴리즈인지 확인
    const { data: existing } = await supabase
      .from('changelog_entries')
      .select('id')
      .eq('github_release_url', release.htmlUrl)
      .single();

    if (existing) continue;

    // 새 릴리즈 기록
    await supabase.from('changelog_entries').insert({
      version: release.version,
      title: release.name || `${project.title} ${release.version}`,
      description: release.body,
      project_id: project.id,
      github_release_url: release.htmlUrl,
      released_at: release.publishedAt,
      changes: parseReleaseBody(release.body), // Markdown 파싱
    });
  }

  return new Response(JSON.stringify({ success: true }));
});

function parseReleaseBody(body: string | null): object[] {
  if (!body) return [];

  const changes: object[] = [];
  const lines = body.split('\n');

  for (const line of lines) {
    if (line.startsWith('- ')) {
      const text = line.slice(2);
      let type = 'other';
      if (text.toLowerCase().includes('feat')) type = 'feature';
      if (text.toLowerCase().includes('fix')) type = 'fix';
      if (text.toLowerCase().includes('breaking')) type = 'breaking';

      changes.push({ type, description: text });
    }
  }

  return changes;
}
```

**완료 기준**:
- [ ] Edge Function 생성
- [ ] 릴리즈 감지 및 Changelog 저장
- [ ] 중복 방지 로직

---

### TASK-032: 관리자 알림 연동 (선택적)
**예상 시간**: 2시간
**담당**: Agent 2
**의존성**: TASK-031

**구현 옵션**:
1. 이메일 알림 (SendGrid/Resend)
2. Slack 알림 (Webhook)
3. 앱 내 알림 (기존 notifications 테이블 활용)

**Slack 예시**:
```typescript
async function sendSlackNotification(release: Release, project: Project) {
  const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
  if (!webhookUrl) return;

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `🚀 새 릴리즈: ${project.title} ${release.version}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${project.title}* ${release.version}\n${release.name}\n<${release.htmlUrl}|GitHub에서 보기>`,
          },
        },
      ],
    }),
  });
}
```

**완료 기준**:
- [ ] 알림 방식 결정
- [ ] 알림 전송 구현
- [ ] 테스트

---

### TASK-033: E2E 테스트 및 통합 테스트
**예상 시간**: 4시간
**담당**: Agent 4
**의존성**: TASK-026~032

**테스트 항목**:

1. **GitHub 연동 테스트**
   - API 호출 성공
   - 캐싱 동작
   - 에러 핸들링

2. **진척률 표시 테스트**
   - Progress Bar 렌더링
   - 마일스톤 기반 계산

3. **Changelog 자동 업데이트 테스트**
   - 신규 릴리즈 감지
   - 중복 방지

**테스트 파일**:
```
tests/e2e/projects/github-integration.spec.ts
tests/unit/hooks/useGitHubStats.test.ts
tests/unit/lib/github-api.test.ts
```

**완료 기준**:
- [ ] E2E 테스트 5개
- [ ] Unit 테스트 10개
- [ ] 전체 테스트 통과

---

## 스프린트 일정

```
Week 1:
├── Day 1-2: TASK-026, 027 (GitHub API)
├── Day 3: TASK-028 (DB), TASK-029 (카드 연동)
├── Day 4-5: 통합 및 테스트

Week 2:
├── Day 1-2: TASK-030 (진척률)
├── Day 3-4: TASK-031 (릴리즈 감지)
├── Day 5: TASK-032 (알림), TASK-033 (테스트)
```

---

## 완료 기준

### 필수
- [ ] GitHub 정보 프로젝트 카드에 표시
- [ ] 진척률 자동 계산 동작
- [ ] Changelog 수동 입력 가능

### 선택
- [ ] 릴리즈 자동 감지
- [ ] 관리자 알림
- [ ] GitHub 캐시 테이블 활용

---

## 전체 사이트 재구조화 완료 체크리스트

### Phase 1 (Sprint 1)
- [ ] 메뉴 5개 단순화
- [ ] 리디렉션 설정
- [ ] 홈 페이지 재구성

### Phase 2 (Sprint 2)
- [ ] 프로젝트 허브 통합
- [ ] 탭 기반 네비게이션
- [ ] 진척률 표시

### Phase 3 (Sprint 3)
- [ ] 이야기 허브 구축
- [ ] 뉴스레터 아카이브
- [ ] Changelog
- [ ] 함께하기 허브

### Phase 4 (Sprint 4)
- [ ] GitHub 연동
- [ ] 자동화 기능

### 최종 검증
- [ ] Lighthouse 90+
- [ ] E2E 테스트 100% 통과
- [ ] 프로덕션 배포
- [ ] SEO 검증

---

## 관련 문서

- [sprint-3.md](./sprint-3.md)
- [implementation-strategy.md](../../plan/site-restructure/implementation-strategy.md)
