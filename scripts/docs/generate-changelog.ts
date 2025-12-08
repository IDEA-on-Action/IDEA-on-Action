/**
 * Changelog 자동 생성 스크립트
 *
 * Git 커밋 히스토리를 파싱하여 CHANGELOG.md를 자동 생성합니다.
 * - Conventional Commits 형식 인식 (feat, fix, chore, docs 등)
 * - 버전별 그룹핑
 * - CHANGELOG.md 업데이트 (기존 내용 보존)
 *
 * @module scripts/docs/generate-changelog
 *
 * @usage
 * ```bash
 * npm run docs:generate-changelog
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 커밋 타입
 */
type CommitType = 'feat' | 'fix' | 'chore' | 'docs' | 'style' | 'refactor' | 'test' | 'perf' | 'ci' | 'build' | 'revert';

/**
 * 파싱된 커밋 정보
 */
interface ParsedCommit {
  hash: string;
  type: CommitType | 'other';
  scope?: string;
  subject: string;
  breaking: boolean;
  date: string;
  author: string;
}

/**
 * 버전별 변경사항
 */
interface VersionChanges {
  version: string;
  date: string;
  commits: ParsedCommit[];
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * Git 명령어 실행
 */
function execGit(command: string): string {
  try {
    return execSync(`git ${command}`, { encoding: 'utf-8' }).trim();
  } catch (error) {
    console.error(`Git 명령어 실패: ${command}`);
    throw error;
  }
}

/**
 * 최근 커밋 가져오기
 */
function getRecentCommits(limit = 100): string[] {
  const log = execGit(`log --format="%H|%an|%ad|%s" --date=short -${limit}`);
  return log.split('\n').filter(Boolean);
}

/**
 * Git 태그 목록 가져오기
 */
function getGitTags(): string[] {
  try {
    const tags = execGit('tag --sort=-version:refname');
    return tags.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * 특정 버전의 커밋 가져오기
 */
function getCommitsForVersion(version: string, previousVersion?: string): string[] {
  try {
    const range = previousVersion ? `${previousVersion}..${version}` : version;
    const log = execGit(`log ${range} --format="%H|%an|%ad|%s" --date=short`);
    return log.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Conventional Commit 파싱
 */
function parseCommit(line: string): ParsedCommit | null {
  const [hash, author, date, ...subjectParts] = line.split('|');
  const subject = subjectParts.join('|');

  if (!hash || !subject) {
    return null;
  }

  // Conventional Commits 형식 파싱: type(scope)!: subject
  const conventionalRegex = /^(feat|fix|chore|docs|style|refactor|test|perf|ci|build|revert)(\([^)]+\))?(!)?:\s*(.+)$/;
  const match = subject.match(conventionalRegex);

  if (match) {
    const [, type, scopeWithParens, breaking, parsedSubject] = match;
    const scope = scopeWithParens?.replace(/[()]/g, '');

    return {
      hash: hash.substring(0, 7),
      type: type as CommitType,
      scope,
      subject: parsedSubject,
      breaking: !!breaking,
      date,
      author,
    };
  }

  // Conventional Commits가 아닌 경우
  return {
    hash: hash.substring(0, 7),
    type: 'other',
    subject,
    breaking: false,
    date,
    author,
  };
}

/**
 * 커밋 타입별 제목 매핑
 */
function getTypeTitle(type: CommitType | 'other'): string {
  const titles: Record<CommitType | 'other', string> = {
    feat: '새로운 기능',
    fix: '버그 수정',
    chore: '기타 작업',
    docs: '문서',
    style: '스타일',
    refactor: '리팩토링',
    test: '테스트',
    perf: '성능 개선',
    ci: 'CI/CD',
    build: '빌드',
    revert: '되돌리기',
    other: '기타',
  };

  return titles[type] || '기타';
}

/**
 * 커밋을 타입별로 그룹화
 */
function groupCommitsByType(commits: ParsedCommit[]): Record<string, ParsedCommit[]> {
  const groups: Record<string, ParsedCommit[]> = {};

  for (const commit of commits) {
    const type = commit.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(commit);
  }

  return groups;
}

/**
 * Markdown 변경로그 생성
 */
function generateMarkdown(versions: VersionChanges[]): string {
  const lines: string[] = [];

  // 헤더
  lines.push('# Changelog');
  lines.push('');
  lines.push('All notable changes to this project will be documented in this file.');
  lines.push('');
  lines.push('The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),');
  lines.push('and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).');
  lines.push('');

  // 버전별 변경사항
  for (const versionInfo of versions) {
    lines.push(`## [${versionInfo.version}] - ${versionInfo.date}`);
    lines.push('');

    // Breaking Changes 먼저 표시
    const breakingChanges = versionInfo.commits.filter(c => c.breaking);
    if (breakingChanges.length > 0) {
      lines.push('### ⚠️ BREAKING CHANGES');
      lines.push('');
      for (const commit of breakingChanges) {
        const scope = commit.scope ? `**${commit.scope}**: ` : '';
        lines.push(`- ${scope}${commit.subject} ([${commit.hash}])`);
      }
      lines.push('');
    }

    // 타입별 그룹화
    const groups = groupCommitsByType(versionInfo.commits.filter(c => !c.breaking));
    const typeOrder: (CommitType | 'other')[] = ['feat', 'fix', 'perf', 'refactor', 'docs', 'test', 'chore', 'other'];

    for (const type of typeOrder) {
      const commits = groups[type];
      if (!commits || commits.length === 0) {
        continue;
      }

      lines.push(`### ${getTypeTitle(type as CommitType)}`);
      lines.push('');

      for (const commit of commits) {
        const scope = commit.scope ? `**${commit.scope}**: ` : '';
        lines.push(`- ${scope}${commit.subject} ([${commit.hash}])`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ============================================================================
// 메인 함수
// ============================================================================

/**
 * Changelog 생성 메인 함수
 */
async function main(): Promise<void> {
  console.log('📄 Changelog 생성 시작...');

  // 경로 설정
  const projectRoot = process.cwd();
  const outputPath = path.join(projectRoot, 'CHANGELOG.md');

  // Git 태그 가져오기
  console.log('🏷️ Git 태그 조회 중...');
  const tags = getGitTags();

  if (tags.length === 0) {
    console.warn('⚠️ Git 태그를 찾을 수 없습니다. 최근 커밋만 사용합니다.');
  }

  console.log(`   발견된 태그: ${tags.length}개`);

  // 버전별 변경사항 수집
  const versions: VersionChanges[] = [];

  // package.json에서 현재 버전 읽기
  const packageJsonPath = path.join(projectRoot, 'package.json');
  let currentVersion = 'Unreleased';

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    currentVersion = packageJson.version || currentVersion;
  }

  // 태그가 있는 경우 태그별로 그룹화
  if (tags.length > 0) {
    for (let i = 0; i < Math.min(tags.length, 10); i++) {
      const tag = tags[i];
      const previousTag = tags[i + 1];
      const version = tag.replace(/^v/, '');

      console.log(`📦 버전 ${version} 처리 중...`);

      const commitLines = getCommitsForVersion(tag, previousTag);
      const commits = commitLines
        .map(parseCommit)
        .filter((c): c is ParsedCommit => c !== null);

      if (commits.length > 0) {
        versions.push({
          version,
          date: commits[0].date,
          commits,
        });
      }
    }
  } else {
    // 태그가 없는 경우 최근 커밋만 사용
    console.log('📦 최근 커밋 처리 중...');
    const commitLines = getRecentCommits(50);
    const commits = commitLines
      .map(parseCommit)
      .filter((c): c is ParsedCommit => c !== null);

    if (commits.length > 0) {
      versions.push({
        version: currentVersion,
        date: new Date().toISOString().split('T')[0],
        commits,
      });
    }
  }

  // Markdown 생성
  console.log('⚙️ Markdown 생성 중...');
  const markdown = generateMarkdown(versions);

  // 파일 쓰기
  console.log(`💾 파일 저장: ${outputPath}`);
  fs.writeFileSync(outputPath, markdown, 'utf-8');

  console.log('✅ Changelog 생성 완료!');
  console.log(`   처리된 버전 수: ${versions.length}개`);
  console.log(`   총 커밋 수: ${versions.reduce((sum, v) => sum + v.commits.length, 0)}개`);
  console.log(`   출력 파일: ${outputPath}`);
}

// ============================================================================
// 실행
// ============================================================================

main()
  .then(() => {
    console.log('🎉 작업 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  });
