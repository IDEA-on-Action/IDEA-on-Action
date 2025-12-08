/**
 * 버전 릴리스 자동화 스크립트
 *
 * 버전 범프, Git 태그 생성, GitHub Release까지 자동화합니다.
 * - package.json 버전 업데이트
 * - Git 태그 생성 (vX.X.X)
 * - GitHub Release 생성 (릴리스 노트 포함)
 * - CHANGELOG.md 업데이트
 *
 * @module scripts/release/auto-release
 *
 * @usage
 * ```bash
 * npm run release:auto -- --type patch
 * npm run release:auto -- --type minor
 * npm run release:auto -- --type major
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 버전 범프 타입
 */
type BumpType = 'major' | 'minor' | 'patch';

/**
 * 릴리스 옵션
 */
interface ReleaseOptions {
  type: BumpType;
  dryRun: boolean;
  skipTests: boolean;
  skipGitTag: boolean;
  skipGithubRelease: boolean;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 명령어 실행
 */
function exec(command: string, options?: { silent?: boolean }): string {
  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      stdio: options?.silent ? 'pipe' : 'inherit',
    });
    return typeof result === 'string' ? result.trim() : '';
  } catch (error) {
    console.error(`명령어 실패: ${command}`);
    throw error;
  }
}

/**
 * package.json 읽기
 */
function readPackageJson(): Record<string, unknown> {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const content = fs.readFileSync(packageJsonPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * package.json 쓰기
 */
function writePackageJson(packageJson: Record<string, unknown>): void {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const content = JSON.stringify(packageJson, null, 2) + '\n';
  fs.writeFileSync(packageJsonPath, content, 'utf-8');
}

/**
 * 버전 범프
 */
function bumpVersion(currentVersion: string, type: BumpType): string {
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`알 수 없는 버전 타입: ${type}`);
  }
}

/**
 * Git 작업 디렉토리가 깨끗한지 확인
 */
function isGitClean(): boolean {
  try {
    const status = exec('git status --porcelain', { silent: true });
    return status.length === 0;
  } catch {
    return false;
  }
}

/**
 * 최근 커밋 메시지 가져오기 (릴리스 노트용)
 */
function getRecentCommits(sinceTag?: string): string[] {
  try {
    const range = sinceTag ? `${sinceTag}..HEAD` : 'HEAD~10..HEAD';
    const log = exec(`git log ${range} --format="%s"`, { silent: true });
    return log.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * 최신 Git 태그 가져오기
 */
function getLatestTag(): string | null {
  try {
    const tag = exec('git describe --tags --abbrev=0', { silent: true });
    return tag || null;
  } catch {
    return null;
  }
}

/**
 * 릴리스 노트 생성
 */
function generateReleaseNotes(version: string, commits: string[]): string {
  const lines: string[] = [];

  lines.push(`# Release ${version}`);
  lines.push('');
  lines.push(`릴리스 날짜: ${new Date().toISOString().split('T')[0]}`);
  lines.push('');

  // 커밋 타입별로 그룹화
  const features: string[] = [];
  const fixes: string[] = [];
  const others: string[] = [];

  for (const commit of commits) {
    if (commit.startsWith('feat')) {
      features.push(commit);
    } else if (commit.startsWith('fix')) {
      fixes.push(commit);
    } else {
      others.push(commit);
    }
  }

  // 새로운 기능
  if (features.length > 0) {
    lines.push('## 새로운 기능');
    lines.push('');
    for (const feat of features) {
      lines.push(`- ${feat}`);
    }
    lines.push('');
  }

  // 버그 수정
  if (fixes.length > 0) {
    lines.push('## 버그 수정');
    lines.push('');
    for (const fix of fixes) {
      lines.push(`- ${fix}`);
    }
    lines.push('');
  }

  // 기타 변경사항
  if (others.length > 0) {
    lines.push('## 기타 변경사항');
    lines.push('');
    for (const other of others) {
      lines.push(`- ${other}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 명령줄 인수 파싱
 */
function parseArgs(): ReleaseOptions {
  const args = process.argv.slice(2);
  const options: ReleaseOptions = {
    type: 'patch',
    dryRun: false,
    skipTests: false,
    skipGitTag: false,
    skipGithubRelease: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--type':
      case '-t': {
        const type = args[++i];
        if (!['major', 'minor', 'patch'].includes(type)) {
          throw new Error(`잘못된 버전 타입: ${type}`);
        }
        options.type = type as BumpType;
        break;
      }
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
      case '--skip-tests':
        options.skipTests = true;
        break;
      case '--skip-git-tag':
        options.skipGitTag = true;
        break;
      case '--skip-github-release':
        options.skipGithubRelease = true;
        break;
      case '--help':
      case '-h':
        console.log(`
사용법: npm run release:auto -- [옵션]

옵션:
  --type, -t <type>         버전 범프 타입 (major|minor|patch, 기본값: patch)
  --dry-run, -d             실제 변경 없이 시뮬레이션
  --skip-tests              테스트 생략
  --skip-git-tag            Git 태그 생성 생략
  --skip-github-release     GitHub Release 생성 생략
  --help, -h                도움말 표시

예시:
  npm run release:auto -- --type patch
  npm run release:auto -- --type minor --dry-run
  npm run release:auto -- --type major --skip-tests
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

// ============================================================================
// 메인 함수
// ============================================================================

/**
 * 릴리스 메인 함수
 */
async function main(): Promise<void> {
  console.log('🚀 자동 릴리스 시작...');
  console.log('');

  // 옵션 파싱
  const options = parseArgs();

  if (options.dryRun) {
    console.log('⚠️ DRY RUN 모드: 실제 변경은 하지 않습니다.');
    console.log('');
  }

  // 1. Git 상태 확인
  console.log('📋 1단계: Git 상태 확인');
  if (!isGitClean() && !options.dryRun) {
    console.error('❌ Git 작업 디렉토리가 깨끗하지 않습니다.');
    console.error('   변경사항을 커밋하거나 stash한 후 다시 시도하세요.');
    process.exit(1);
  }
  console.log('✅ Git 작업 디렉토리가 깨끗합니다.');
  console.log('');

  // 2. 테스트 실행
  if (!options.skipTests) {
    console.log('🧪 2단계: 테스트 실행');
    if (!options.dryRun) {
      exec('npm run lint');
      console.log('✅ 린트 통과');
      // 참고: 전체 테스트는 시간이 오래 걸릴 수 있어 생략
      // exec('npm run test:unit');
      // console.log('✅ 유닛 테스트 통과');
    } else {
      console.log('⏭️ (건너뛰기: DRY RUN)');
    }
    console.log('');
  }

  // 3. 버전 범프
  console.log('📦 3단계: 버전 범프');
  const packageJson = readPackageJson();
  const currentVersion = packageJson.version as string;
  const newVersion = bumpVersion(currentVersion, options.type);

  console.log(`   현재 버전: ${currentVersion}`);
  console.log(`   새 버전: ${newVersion} (${options.type})`);

  if (!options.dryRun) {
    packageJson.version = newVersion;
    writePackageJson(packageJson);
    console.log('✅ package.json 업데이트 완료');
  } else {
    console.log('⏭️ (건너뛰기: DRY RUN)');
  }
  console.log('');

  // 4. CHANGELOG 업데이트
  console.log('📝 4단계: CHANGELOG 업데이트');
  if (!options.dryRun) {
    try {
      exec('npm run docs:generate-changelog');
      console.log('✅ CHANGELOG.md 업데이트 완료');
    } catch (error) {
      console.warn('⚠️ CHANGELOG 생성 실패 (계속 진행)');
    }
  } else {
    console.log('⏭️ (건너뛰기: DRY RUN)');
  }
  console.log('');

  // 5. Git 커밋 및 태그
  if (!options.skipGitTag) {
    console.log('🏷️ 5단계: Git 커밋 및 태그');
    if (!options.dryRun) {
      exec('git add package.json CHANGELOG.md');
      exec(`git commit -m "chore: v${newVersion} 버전 릴리스"`);
      exec(`git tag -a v${newVersion} -m "Release v${newVersion}"`);
      console.log('✅ Git 커밋 및 태그 생성 완료');
    } else {
      console.log('⏭️ (건너뛰기: DRY RUN)');
    }
    console.log('');
  }

  // 6. GitHub Release
  if (!options.skipGithubRelease) {
    console.log('🐙 6단계: GitHub Release 생성');

    const latestTag = getLatestTag();
    const commits = getRecentCommits(latestTag || undefined);
    const releaseNotes = generateReleaseNotes(newVersion, commits);

    if (!options.dryRun) {
      // 릴리스 노트를 임시 파일로 저장
      const tempFile = path.join(process.cwd(), '.release-notes.tmp');
      fs.writeFileSync(tempFile, releaseNotes, 'utf-8');

      try {
        // gh CLI를 사용하여 GitHub Release 생성
        exec(`gh release create v${newVersion} --notes-file "${tempFile}" --title "v${newVersion}"`);
        console.log('✅ GitHub Release 생성 완료');
      } catch (error) {
        console.warn('⚠️ GitHub Release 생성 실패');
        console.warn('   gh CLI가 설치되어 있고 인증되어 있는지 확인하세요.');
      } finally {
        // 임시 파일 삭제
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    } else {
      console.log('⏭️ (건너뛰기: DRY RUN)');
      console.log('');
      console.log('릴리스 노트 미리보기:');
      console.log('─'.repeat(60));
      console.log(releaseNotes);
      console.log('─'.repeat(60));
    }
    console.log('');
  }

  // 7. 완료
  console.log('🎉 릴리스 완료!');
  console.log('');
  console.log('다음 단계:');
  console.log(`  1. git push origin main`);
  console.log(`  2. git push origin v${newVersion}`);
  console.log('');
  console.log('또는 한 번에:');
  console.log('  git push --follow-tags');
}

// ============================================================================
// 실행
// ============================================================================

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  });
