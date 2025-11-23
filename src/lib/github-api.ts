/**
 * GitHub API 서비스
 *
 * GitHub REST API를 사용하여 저장소 통계, 릴리즈 정보를 조회합니다.
 * Rate Limit: 인증된 요청 5,000/시간, 미인증 60/시간
 *
 * @see https://docs.github.com/en/rest
 */

import { Octokit } from '@octokit/rest';

// GitHub API 클라이언트 인스턴스 (Lazy Initialization)
// 모듈 로딩 시점이 아닌 실제 사용 시점에 초기화하여 앱 크래시 방지
let octokitInstance: Octokit | null = null;

/**
 * Octokit 인스턴스를 반환합니다 (Lazy Initialization)
 * 첫 호출 시에만 인스턴스를 생성하고, 이후에는 캐시된 인스턴스를 반환합니다.
 */
function getOctokit(): Octokit {
  if (!octokitInstance) {
    octokitInstance = new Octokit({
      auth: import.meta.env.VITE_GITHUB_TOKEN || undefined,
    });
  }
  return octokitInstance;
}

/**
 * GitHub 저장소 통계 타입
 */
export interface GitHubRepoStats {
  stars: number;
  forks: number;
  openIssues: number;
  commits: number;
  contributors: number;
  lastUpdated: Date;
  language: string | null;
  defaultBranch: string;
}

/**
 * GitHub 릴리즈 정보 타입
 */
export interface GitHubRelease {
  version: string;
  name: string | null;
  body: string | null;
  publishedAt: Date;
  htmlUrl: string;
  isDraft: boolean;
  isPrerelease: boolean;
}

/**
 * GitHub URL에서 owner와 repo를 추출
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return null;

  // .git 확장자 제거
  const repo = match[2].replace(/\.git$/, '');
  return { owner: match[1], repo };
}

/**
 * 저장소 통계 조회
 *
 * @param owner - 저장소 소유자
 * @param repo - 저장소 이름
 * @returns 저장소 통계 정보
 */
export async function getRepoStats(owner: string, repo: string): Promise<GitHubRepoStats> {
  try {
    const octokit = getOctokit();
    const [repoData, contributors] = await Promise.all([
      octokit.repos.get({ owner, repo }),
      octokit.repos.listContributors({ owner, repo, per_page: 100 }),
    ]);

    // 커밋 수 가져오기 (마지막 페이지 번호로 추정)
    let commitCount = 0;
    try {
      const commits = await octokit.repos.listCommits({ owner, repo, per_page: 1 });
      const linkHeader = commits.headers.link;
      if (linkHeader) {
        const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
        commitCount = lastPageMatch ? parseInt(lastPageMatch[1], 10) : 1;
      } else {
        commitCount = commits.data.length;
      }
    } catch {
      // 커밋 조회 실패 시 0으로 설정
      commitCount = 0;
    }

    return {
      stars: repoData.data.stargazers_count,
      forks: repoData.data.forks_count,
      openIssues: repoData.data.open_issues_count,
      commits: commitCount,
      contributors: contributors.data.length,
      lastUpdated: new Date(repoData.data.updated_at),
      language: repoData.data.language,
      defaultBranch: repoData.data.default_branch,
    };
  } catch (error) {
    console.error('[GitHub API] getRepoStats 오류:', error);
    throw error;
  }
}

/**
 * 최신 릴리즈 조회
 *
 * @param owner - 저장소 소유자
 * @param repo - 저장소 이름
 * @returns 최신 릴리즈 정보 또는 null
 */
export async function getLatestRelease(owner: string, repo: string): Promise<GitHubRelease | null> {
  try {
    const octokit = getOctokit();
    const { data } = await octokit.repos.getLatestRelease({ owner, repo });

    return {
      version: data.tag_name,
      name: data.name,
      body: data.body,
      publishedAt: new Date(data.published_at || data.created_at),
      htmlUrl: data.html_url,
      isDraft: data.draft,
      isPrerelease: data.prerelease,
    };
  } catch (error) {
    // 릴리즈가 없는 경우 404 에러 발생
    if ((error as { status?: number }).status === 404) {
      return null;
    }
    console.error('[GitHub API] getLatestRelease 오류:', error);
    throw error;
  }
}

/**
 * 릴리즈 목록 조회
 *
 * @param owner - 저장소 소유자
 * @param repo - 저장소 이름
 * @param limit - 조회할 릴리즈 수 (기본값: 10)
 * @returns 릴리즈 목록
 */
export async function getReleases(
  owner: string,
  repo: string,
  limit = 10
): Promise<GitHubRelease[]> {
  try {
    const octokit = getOctokit();
    const { data } = await octokit.repos.listReleases({
      owner,
      repo,
      per_page: limit,
    });

    return data.map((release) => ({
      version: release.tag_name,
      name: release.name,
      body: release.body,
      publishedAt: new Date(release.published_at || release.created_at),
      htmlUrl: release.html_url,
      isDraft: release.draft,
      isPrerelease: release.prerelease,
    }));
  } catch (error) {
    console.error('[GitHub API] getReleases 오류:', error);
    throw error;
  }
}

/**
 * Rate Limit 상태 조회
 *
 * @returns Rate Limit 정보
 */
export async function getRateLimit(): Promise<{
  limit: number;
  remaining: number;
  reset: Date;
}> {
  const octokit = getOctokit();
  const { data } = await octokit.rateLimit.get();

  return {
    limit: data.rate.limit,
    remaining: data.rate.remaining,
    reset: new Date(data.rate.reset * 1000),
  };
}
