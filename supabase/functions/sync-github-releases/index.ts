/**
 * GitHub 릴리즈 동기화 Edge Function
 *
 * GitHub API를 통해 프로젝트의 릴리즈를 감지하고
 * changelog_entries 테이블에 자동으로 기록합니다.
 *
 * Cron으로 1시간마다 실행되거나, 수동으로 호출할 수 있습니다.
 *
 * @endpoint POST /functions/v1/sync-github-releases
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS 헤더
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// GitHub API를 사용하여 최신 릴리즈 조회
async function getLatestRelease(owner: string, repo: string, token?: string) {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "IDEA-on-Action-Bot",
  };

  if (token) {
    headers["Authorization"] = `token ${token}`;
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
    { headers }
  );

  if (response.status === 404) {
    return null; // 릴리즈 없음
  }

  if (!response.ok) {
    throw new Error(`GitHub API 오류: ${response.status}`);
  }

  return await response.json();
}

// 릴리즈 본문에서 변경 사항 파싱
function parseReleaseBody(body: string | null): object[] {
  if (!body) return [];

  const changes: object[] = [];
  const lines = body.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // "- " 또는 "* "로 시작하는 항목 파싱
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const text = trimmed.slice(2).trim();

      // 변경 유형 추론
      let type = "other";
      const lowerText = text.toLowerCase();

      if (lowerText.includes("feat") || lowerText.includes("feature") || lowerText.includes("add")) {
        type = "feature";
      } else if (lowerText.includes("fix") || lowerText.includes("bug")) {
        type = "fix";
      } else if (lowerText.includes("breaking") || lowerText.includes("removed")) {
        type = "breaking";
      } else if (lowerText.includes("improve") || lowerText.includes("update") || lowerText.includes("enhance")) {
        type = "improvement";
      } else if (lowerText.includes("deprecat")) {
        type = "deprecated";
      }

      changes.push({ type, description: text });
    }
  }

  return changes;
}

// GitHub URL에서 owner/repo 추출
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;

  const repo = match[2].replace(/\.git$/, "");
  return { owner: match[1], repo };
}

/**
 * 관리자에게 새 릴리즈 알림 전송
 *
 * 앱 내 알림(notifications 테이블)과 선택적으로 Slack 웹훅을 사용합니다.
 */
async function sendReleaseNotification(
  supabase: ReturnType<typeof createClient>,
  project: { id: string; title: string },
  release: { tag_name: string; name: string; html_url: string }
) {
  // 1. 앱 내 알림 (notifications 테이블에 저장)
  try {
    // 모든 관리자 조회
    const { data: admins } = await supabase
      .from("admins")
      .select("user_id");

    if (admins && admins.length > 0) {
      // 각 관리자에게 알림 생성
      const notifications = admins.map((admin) => ({
        user_id: admin.user_id,
        type: "release",
        title: `새 릴리즈: ${project.title} ${release.tag_name}`,
        message: release.name || `${project.title}의 새 버전이 출시되었습니다.`,
        link: release.html_url,
        read: false,
      }));

      await supabase.from("notifications").insert(notifications);
      console.log(`알림 전송 완료: ${admins.length}명의 관리자`);
    }
  } catch (error) {
    console.error("앱 내 알림 전송 오류:", error);
  }

  // 2. Slack 웹훅 (환경 변수가 설정된 경우)
  const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
  if (slackWebhookUrl) {
    try {
      await fetch(slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚀 새 릴리즈: ${project.title} ${release.tag_name}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*${project.title}* \`${release.tag_name}\`\n${release.name || "새 버전이 출시되었습니다."}\n<${release.html_url}|GitHub에서 보기>`,
              },
            },
          ],
        }),
      });
      console.log("Slack 알림 전송 완료");
    } catch (error) {
      console.error("Slack 알림 전송 오류:", error);
    }
  }
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const githubToken = Deno.env.get("GITHUB_TOKEN");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // GitHub URL이 있는 프로젝트 조회
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, title, slug, links")
      .not("links->github", "is", null);

    if (projectsError) {
      throw new Error(`프로젝트 조회 오류: ${projectsError.message}`);
    }

    const results = {
      processed: 0,
      newReleases: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // 각 프로젝트의 GitHub 릴리즈 확인
    for (const project of projects || []) {
      results.processed++;

      const githubUrl = project.links?.github;
      if (!githubUrl) {
        results.skipped++;
        continue;
      }

      const parsed = parseGitHubUrl(githubUrl);
      if (!parsed) {
        results.errors.push(`${project.title}: 유효하지 않은 GitHub URL`);
        continue;
      }

      try {
        const release = await getLatestRelease(parsed.owner, parsed.repo, githubToken);

        if (!release) {
          results.skipped++;
          continue;
        }

        // 이미 기록된 릴리즈인지 확인
        const { data: existing } = await supabase
          .from("changelog_entries")
          .select("id")
          .eq("github_release_url", release.html_url)
          .single();

        if (existing) {
          results.skipped++;
          continue;
        }

        // 새 릴리즈 기록
        const { error: insertError } = await supabase
          .from("changelog_entries")
          .insert({
            version: release.tag_name,
            title: release.name || `${project.title} ${release.tag_name}`,
            description: release.body,
            project_id: project.id,
            github_release_url: release.html_url,
            released_at: release.published_at || release.created_at,
            changes: parseReleaseBody(release.body),
          });

        if (insertError) {
          results.errors.push(`${project.title}: ${insertError.message}`);
        } else {
          results.newReleases++;
          console.log(`새 릴리즈 감지: ${project.title} ${release.tag_name}`);

          // 관리자에게 알림 전송
          await sendReleaseNotification(supabase, project, release);
        }
      } catch (error) {
        results.errors.push(`${project.title}: ${(error as Error).message}`);
      }
    }

    // 결과 반환
    return new Response(
      JSON.stringify({
        success: true,
        message: `처리 완료: ${results.newReleases}개 새 릴리즈, ${results.skipped}개 스킵`,
        ...results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Edge Function 오류:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
