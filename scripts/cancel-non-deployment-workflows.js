#!/usr/bin/env node

/**
 * GitHub Actions 실행 중인 워크플로우 취소 스크립트
 * 
 * 배포 워크플로우(Deploy to Production, Deploy to Staging)를 제외하고
 * 나머지 실행 중인 워크플로우를 모두 취소합니다.
 */

import https from 'https';
import { execSync } from 'child_process';

// 배포 워크플로우 이름 (제외할 워크플로우)
const DEPLOYMENT_WORKFLOWS = [
  'Deploy to Production',
  'Deploy to Staging'
];

// GitHub API 기본 설정
const GITHUB_API_BASE = 'https://api.github.com';
let GITHUB_TOKEN = process.env.GITHUB_TOKEN;
let REPO_OWNER = '';
let REPO_NAME = '';

/**
 * GitHub 리포지토리 정보 가져오기
 */
function getRepoInfo() {
  try {
    // git remote에서 리포지토리 정보 추출
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf-8' }).trim();
    
    // https://github.com/owner/repo.git 또는 git@github.com:owner/repo.git 형식
    const match = remoteUrl.match(/(?:github\.com[/:])([^/]+)\/([^/]+?)(?:\.git)?$/);
    
    if (match) {
      REPO_OWNER = match[1];
      REPO_NAME = match[2].replace('.git', '');
      console.log(`📦 리포지토리: ${REPO_OWNER}/${REPO_NAME}`);
      return true;
    }
    
    throw new Error('리포지토리 정보를 찾을 수 없습니다.');
  } catch (error) {
    console.error('❌ 리포지토리 정보를 가져올 수 없습니다:', error.message);
    return false;
  }
}

/**
 * GitHub Token 확인
 */
function checkGitHubToken() {
  if (!GITHUB_TOKEN) {
    // GitHub CLI에서 토큰 가져오기 시도
    try {
      GITHUB_TOKEN = execSync('gh auth token', { encoding: 'utf-8' }).trim();
      console.log('✅ GitHub CLI에서 토큰을 가져왔습니다.');
    } catch (error) {
      console.error('❌ GitHub Token이 필요합니다.');
      console.error('다음 중 하나를 설정해주세요:');
      console.error('  1. GITHUB_TOKEN 환경 변수 설정');
      console.error('  2. GitHub CLI 설치 및 로그인: gh auth login');
      process.exit(1);
    }
  } else {
    console.log('✅ GitHub Token이 설정되어 있습니다.');
  }
}

/**
 * HTTP 요청 헬퍼 함수
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Actions-Cancel-Script',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * 실행 중인 워크플로우 실행 목록 가져오기
 */
async function getRunningWorkflowRuns() {
  const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?status=in_progress&per_page=100`;
  
  try {
    const response = await makeRequest(url);
    return response.workflow_runs || [];
  } catch (error) {
    console.error('❌ 실행 중인 워크플로우를 가져오는 중 오류 발생:', error.message);
    throw error;
  }
}

/**
 * 워크플로우 실행 취소
 */
async function cancelWorkflowRun(runId) {
  const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs/${runId}/cancel`;
  
  try {
    await makeRequest(url, { method: 'POST' });
    return true;
  } catch (error) {
    console.error(`❌ 워크플로우 실행 ${runId} 취소 중 오류 발생:`, error.message);
    return false;
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('🚀 GitHub Actions 워크플로우 취소 스크립트 시작\n');

  // 리포지토리 정보 확인
  if (!getRepoInfo()) {
    process.exit(1);
  }

  // GitHub Token 확인
  checkGitHubToken();

  console.log('\n📋 실행 중인 워크플로우 조회 중...\n');

  try {
    // 실행 중인 워크플로우 목록 가져오기
    const runningRuns = await getRunningWorkflowRuns();

    if (runningRuns.length === 0) {
      console.log('✅ 실행 중인 워크플로우가 없습니다.');
      return;
    }

    console.log(`📊 총 ${runningRuns.length}개의 실행 중인 워크플로우를 찾았습니다.\n`);

    // 배포 워크플로우 제외 필터링
    const runsToCancel = runningRuns.filter(run => {
      const workflowName = run.name || run.workflow_id?.toString() || 'Unknown';
      const isDeployment = DEPLOYMENT_WORKFLOWS.some(deployName => 
        workflowName.includes(deployName)
      );
      
      if (isDeployment) {
        console.log(`⏭️  배포 워크플로우 제외: ${workflowName} (Run ID: ${run.id})`);
        return false;
      }
      
      return true;
    });

    if (runsToCancel.length === 0) {
      console.log('\n✅ 취소할 워크플로우가 없습니다. (모두 배포 워크플로우입니다)');
      return;
    }

    console.log(`\n🛑 ${runsToCancel.length}개의 워크플로우를 취소합니다:\n`);

    // 각 워크플로우 취소
    let successCount = 0;
    let failCount = 0;

    for (const run of runsToCancel) {
      const workflowName = run.name || run.workflow_id?.toString() || 'Unknown';
      const runId = run.id;
      const branch = run.head_branch || 'unknown';
      const commit = run.head_sha?.substring(0, 7) || 'unknown';

      console.log(`   취소 중: ${workflowName} (${branch}@${commit})...`);

      const success = await cancelWorkflowRun(runId);
      
      if (success) {
        console.log(`   ✅ 취소 완료: ${workflowName} (Run ID: ${runId})\n`);
        successCount++;
      } else {
        console.log(`   ❌ 취소 실패: ${workflowName} (Run ID: ${runId})\n`);
        failCount++;
      }

      // API Rate Limit 방지를 위한 짧은 대기
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 결과 요약
    console.log('\n' + '='.repeat(50));
    console.log('📊 취소 결과 요약:');
    console.log(`   ✅ 성공: ${successCount}개`);
    console.log(`   ❌ 실패: ${failCount}개`);
    console.log(`   ⏭️  제외 (배포): ${runningRuns.length - runsToCancel.length}개`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
main().catch((error) => {
  console.error('❌ 예상치 못한 오류:', error);
  process.exit(1);
});




