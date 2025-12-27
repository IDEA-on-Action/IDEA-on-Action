/**
 * Weekly Recap 핸들러
 * Cloudflare Workers Migration
 *
 * 주간 활동 요약 및 블로그 포스트 자동 발행
 *
 * @endpoint POST /cron/weekly-recap/generate - 주간 리캡 생성
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { requireAdmin } from '../../middleware/auth';

const weeklyRecap = new Hono<AppType>();

// =============================================================================
// 타입
// =============================================================================

interface WeeklyStats {
  total_logs: number;
  release_count: number;
  learning_count: number;
  decision_count: number;
  active_projects: number;
  start_date: string;
  end_date: string;
  top_tags?: Array<{ tag: string; count: number }>;
}

interface WeeklyLog {
  log_type: string;
  logs: Array<{
    title: string;
    content: string;
    created_at: string;
    tags: string[];
  }>;
}

interface ProjectActivity {
  project_title: string;
  log_count: number;
  release_count: number;
  learning_count: number;
  decision_count: number;
}

// =============================================================================
// 유틸리티
// =============================================================================

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function generateMarkdown(
  stats: WeeklyStats,
  logs: WeeklyLog[],
  projects: ProjectActivity[]
): string {
  const startDate = new Date(stats.start_date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const endDate = new Date(stats.end_date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const year = new Date(stats.end_date).getFullYear();
  const weekNumber = getWeekNumber(new Date(stats.end_date));

  let markdown = `# Weekly Recap - ${year}년 ${weekNumber}주차\n\n`;
  markdown += `> ${startDate} ~ ${endDate}\n\n`;

  // 주간 통계
  markdown += `## 📊 이번 주 통계\n\n`;
  markdown += `- **총 활동**: ${stats.total_logs}건\n`;
  markdown += `- **릴리스**: ${stats.release_count}건\n`;
  markdown += `- **학습**: ${stats.learning_count}건\n`;
  markdown += `- **결정**: ${stats.decision_count}건\n`;
  markdown += `- **활성 프로젝트**: ${stats.active_projects}개\n\n`;

  if (stats.top_tags && stats.top_tags.length > 0) {
    markdown += `**인기 태그**: ${stats.top_tags.map((t) => `#${t.tag}`).join(', ')}\n\n`;
  }

  // 프로젝트 활동
  if (projects.length > 0) {
    markdown += `## 🚀 프로젝트 활동\n\n`;
    projects.forEach((p) => {
      markdown += `### ${p.project_title}\n\n`;
      markdown += `- 총 ${p.log_count}건의 활동\n`;
      if (p.release_count > 0) markdown += `- 🎉 릴리스 ${p.release_count}건\n`;
      if (p.learning_count > 0) markdown += `- 📚 학습 ${p.learning_count}건\n`;
      if (p.decision_count > 0) markdown += `- 🤔 결정 ${p.decision_count}건\n`;
      markdown += `\n`;
    });
  }

  // 상세 로그
  if (logs.length > 0) {
    markdown += `## 📝 상세 활동\n\n`;
    logs.forEach(({ log_type, logs: logList }) => {
      const typeEmoji = log_type === 'release' ? '🎉' : log_type === 'learning' ? '📚' : '🤔';
      const typeName = log_type === 'release' ? '릴리스' : log_type === 'learning' ? '학습' : '결정';

      markdown += `### ${typeEmoji} ${typeName}\n\n`;

      logList.forEach((log) => {
        const date = new Date(log.created_at).toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric',
        });
        markdown += `#### ${log.title}\n\n`;
        markdown += `> ${date}\n\n`;
        markdown += `${log.content}\n\n`;
        if (log.tags.length > 0) {
          markdown += `**태그**: ${log.tags.map((t) => `\`${t}\``).join(', ')}\n\n`;
        }
        markdown += `---\n\n`;
      });
    });
  }

  markdown += `\n\n*📌 이 리캡은 자동으로 생성되었습니다. [IDEA on Action](https://www.ideaonaction.ai)*\n`;

  return markdown;
}

// =============================================================================
// 핸들러
// =============================================================================

/**
 * POST /generate - 주간 리캡 생성
 */
weeklyRecap.post('/generate', requireAdmin, async (c) => {
  const db = c.env.DB;

  // 날짜 범위 계산 (지난 7일)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const startStr = startDate.toISOString();
  const endStr = endDate.toISOString();

  console.log(`Weekly Recap 생성: ${startStr} ~ ${endStr}`);

  // 주간 통계 계산
  const statsQuery = await db
    .prepare(
      `SELECT
         COUNT(*) as total_logs,
         SUM(CASE WHEN log_type = 'release' THEN 1 ELSE 0 END) as release_count,
         SUM(CASE WHEN log_type = 'learning' THEN 1 ELSE 0 END) as learning_count,
         SUM(CASE WHEN log_type = 'decision' THEN 1 ELSE 0 END) as decision_count,
         COUNT(DISTINCT project_id) as active_projects
       FROM activity_logs
       WHERE created_at >= ? AND created_at <= ?`
    )
    .bind(startStr, endStr)
    .first<{
      total_logs: number;
      release_count: number;
      learning_count: number;
      decision_count: number;
      active_projects: number;
    }>();

  if (!statsQuery || statsQuery.total_logs === 0) {
    return c.json({ message: '이번 주 활동이 없습니다. 리캡 생성을 건너뜁니다.' });
  }

  const stats: WeeklyStats = {
    ...statsQuery,
    start_date: startStr,
    end_date: endStr,
  };

  // 주간 로그 조회
  const logsQuery = await db
    .prepare(
      `SELECT log_type, title, content, created_at, tags
       FROM activity_logs
       WHERE created_at >= ? AND created_at <= ?
       ORDER BY log_type, created_at DESC`
    )
    .bind(startStr, endStr)
    .all<{ log_type: string; title: string; content: string; created_at: string; tags: string }>();

  // 로그 타입별 그룹핑
  const logsByType: Record<string, WeeklyLog['logs']> = {};
  for (const log of logsQuery.results || []) {
    if (!logsByType[log.log_type]) {
      logsByType[log.log_type] = [];
    }
    logsByType[log.log_type].push({
      title: log.title,
      content: log.content,
      created_at: log.created_at,
      tags: log.tags ? JSON.parse(log.tags) : [],
    });
  }
  const logs: WeeklyLog[] = Object.entries(logsByType).map(([log_type, logs]) => ({
    log_type,
    logs,
  }));

  // 프로젝트별 활동 조회
  const projectsQuery = await db
    .prepare(
      `SELECT
         p.title as project_title,
         COUNT(*) as log_count,
         SUM(CASE WHEN a.log_type = 'release' THEN 1 ELSE 0 END) as release_count,
         SUM(CASE WHEN a.log_type = 'learning' THEN 1 ELSE 0 END) as learning_count,
         SUM(CASE WHEN a.log_type = 'decision' THEN 1 ELSE 0 END) as decision_count
       FROM activity_logs a
       JOIN projects p ON a.project_id = p.id
       WHERE a.created_at >= ? AND a.created_at <= ?
       GROUP BY p.id
       ORDER BY log_count DESC`
    )
    .bind(startStr, endStr)
    .all<ProjectActivity>();

  const projects = projectsQuery.results || [];

  // Markdown 생성
  const markdown = generateMarkdown(stats, logs, projects);

  const year = endDate.getFullYear();
  const weekNumber = getWeekNumber(endDate);
  const slug = `weekly-recap-${year}-w${weekNumber}`;
  const title = `Weekly Recap - ${year}년 ${weekNumber}주차`;

  // 블로그 포스트 저장 (upsert)
  const existingPost = await db
    .prepare('SELECT id FROM posts WHERE slug = ?')
    .bind(slug)
    .first<{ id: string }>();

  if (existingPost) {
    await db
      .prepare("UPDATE posts SET body = ?, published_at = datetime('now') WHERE slug = ?")
      .bind(markdown, slug)
      .run();

    return c.json({ message: 'Weekly Recap 업데이트 완료', slug });
  }

  await db
    .prepare(
      `INSERT INTO posts (id, slug, title, body, tags, series, published_at, created_at)
       VALUES (?, ?, ?, ?, ?, 'Weekly Recap', datetime('now'), datetime('now'))`
    )
    .bind(crypto.randomUUID(), slug, title, markdown, JSON.stringify(['weekly-recap', 'automation']))
    .run();

  console.log(`Weekly Recap 생성: ${slug}`);

  return c.json({ message: 'Weekly Recap 생성 완료', slug });
});

/**
 * GET /status - 최근 리캡 상태
 */
weeklyRecap.get('/status', async (c) => {
  const db = c.env.DB;

  const recentRecaps = await db
    .prepare(
      "SELECT slug, title, published_at FROM posts WHERE series = 'Weekly Recap' ORDER BY published_at DESC LIMIT 5"
    )
    .all();

  return c.json({ recent_recaps: recentRecaps.results });
});

export default weeklyRecap;
