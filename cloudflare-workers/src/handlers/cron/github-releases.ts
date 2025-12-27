/**
 * GitHub 릴리즈 동기화 핸들러
 * Cloudflare Workers Migration
 *
 * GitHub API로 릴리즈 감지 및 changelog_entries 저장
 *
 * @endpoint POST /cron/github-releases/sync - 릴리즈 동기화
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { requireAdmin } from '../../middleware/auth';

const githubReleases = new Hono<AppType>();

// =============================================================================
// 유틸리티
// =============================================================================

async function getLatestRelease(
  owner: string,
  repo: string,
  token?: string
): Promise<{
  tag_name: string;
  name: string;
  body: string | null;
  html_url: string;
  published_at: string;
  created_at: string;
} | null> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'IDEA-on-Action-Bot',
  };

  if (token) {
    headers.Authorization = `token ${token}`;
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, { headers });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub API 오류: ${response.status}`);

  return response.json();
}

function parseReleaseBody(body: string | null): object[] {
  if (!body) return [];

  const changes: object[] = [];
  const lines = body.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const text = trimmed.slice(2).trim();
      let type = 'other';
      const lowerText = text.toLowerCase();

      if (lowerText.includes('feat') || lowerText.includes('add')) type = 'feature';
      else if (lowerText.includes('fix') || lowerText.includes('bug')) type = 'fix';
      else if (lowerText.includes('breaking')) type = 'breaking';
      else if (lowerText.includes('improve') || lowerText.includes('update')) type = 'improvement';
      else if (lowerText.includes('deprecat')) type = 'deprecated';

      changes.push({ type, description: text });
    }
  }

  return changes;
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  const repo = match[2].replace(/\.git$/, '');
  return { owner: match[1], repo };
}

// =============================================================================
// 핸들러
// =============================================================================

/**
 * POST /sync - GitHub 릴리즈 동기화
 */
githubReleases.post('/sync', requireAdmin, async (c) => {
  const db = c.env.DB;
  const slackWebhookUrl = c.env.SLACK_WEBHOOK_URL;

  // 프로젝트 조회 (GitHub URL이 있는 것만)
  const projects = await db
    .prepare("SELECT id, title, slug, links FROM projects WHERE links IS NOT NULL")
    .all<{ id: string; title: string; slug: string; links: string }>();

  const results = {
    processed: 0,
    newReleases: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const project of projects.results || []) {
    results.processed++;

    let links: { github?: string };
    try {
      links = JSON.parse(project.links);
    } catch {
      results.skipped++;
      continue;
    }

    if (!links.github) {
      results.skipped++;
      continue;
    }

    const parsed = parseGitHubUrl(links.github);
    if (!parsed) {
      results.errors.push(`${project.title}: 유효하지 않은 GitHub URL`);
      continue;
    }

    try {
      const release = await getLatestRelease(parsed.owner, parsed.repo);
      if (!release) {
        results.skipped++;
        continue;
      }

      // 이미 기록된 릴리즈인지 확인
      const existing = await db
        .prepare('SELECT id FROM changelog_entries WHERE github_release_url = ?')
        .bind(release.html_url)
        .first();

      if (existing) {
        results.skipped++;
        continue;
      }

      // 새 릴리즈 기록
      await db
        .prepare(
          `INSERT INTO changelog_entries (id, version, title, description, project_id, github_release_url, released_at, changes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        )
        .bind(
          crypto.randomUUID(),
          release.tag_name,
          release.name || `${project.title} ${release.tag_name}`,
          release.body || null,
          project.id,
          release.html_url,
          release.published_at || release.created_at,
          JSON.stringify(parseReleaseBody(release.body))
        )
        .run();

      results.newReleases++;
      console.log(`새 릴리즈: ${project.title} ${release.tag_name}`);

      // Slack 알림
      if (slackWebhookUrl) {
        try {
          await fetch(slackWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `🚀 새 릴리즈: ${project.title} ${release.tag_name}`,
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*${project.title}* \`${release.tag_name}\`\n${release.name || '새 버전이 출시되었습니다.'}\n<${release.html_url}|GitHub에서 보기>`,
                  },
                },
              ],
            }),
          });
        } catch (slackError) {
          console.error('Slack 알림 오류:', slackError);
        }
      }
    } catch (error) {
      results.errors.push(`${project.title}: ${(error as Error).message}`);
    }
  }

  return c.json({
    success: true,
    message: `처리 완료: ${results.newReleases}개 새 릴리즈, ${results.skipped}개 스킵`,
    ...results,
  });
});

/**
 * GET /status - 동기화 상태 조회
 */
githubReleases.get('/status', async (c) => {
  const db = c.env.DB;

  const recentEntries = await db
    .prepare(
      'SELECT version, title, released_at FROM changelog_entries ORDER BY created_at DESC LIMIT 5'
    )
    .all();

  return c.json({
    recent_releases: recentEntries.results,
  });
});

export default githubReleases;
