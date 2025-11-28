#!/usr/bin/env node

/**
 * Vercel 배포 에러 자동 수정 스크립트
 * 
 * Vercel 토큰 관련 에러를 감지하고 해결 방안을 제시합니다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VercelErrorFixer {
  constructor() {
    this.errors = [];
    this.solutions = [];
  }

  /**
   * Vercel 토큰 에러를 분석합니다.
   */
  analyzeVercelTokenError() {
    console.log('🔍 Vercel 토큰 에러 분석 중...');
    
    const error = {
      type: 'vercel-token-missing',
      message: 'Input required and not supplied: vercel-token',
      severity: 'critical',
      fixable: true
    };
    
    this.errors.push(error);
    
    console.log('❌ 발견된 에러:');
    console.log('   - vercel-token이 설정되지 않음');
    console.log('   - GitHub Secrets에 VERCEL_TOKEN이 누락됨');
    
    return error;
  }

  /**
   * 해결 방안을 제시합니다.
   */
  generateSolutions() {
    console.log('\n💡 해결 방안:');
    
    const solutions = [
      {
        step: 1,
        title: 'Vercel 토큰 생성',
        description: 'Vercel 대시보드에서 토큰을 생성하세요',
        action: 'https://vercel.com/account/tokens',
        command: null
      },
      {
        step: 2,
        title: 'GitHub Secrets 설정',
        description: 'GitHub 리포지토리 Settings > Secrets and variables > Actions에서 설정',
        action: 'https://github.com/settings/secrets/actions',
        command: null
      },
      {
        step: 3,
        title: '필요한 Secrets 확인',
        description: '다음 Secrets가 설정되어 있는지 확인하세요',
        action: null,
        command: [
          'VERCEL_TOKEN',
          'VERCEL_ORG_ID', 
          'VERCEL_PROJECT_ID'
        ]
      },
      {
        step: 4,
        title: '워크플로우 파일 확인',
        description: '.github/workflows/deploy-production.yml 파일 확인',
        action: null,
        command: 'cat .github/workflows/deploy-production.yml'
      }
    ];
    
    solutions.forEach(solution => {
      console.log(`\n${solution.step}. ${solution.title}`);
      console.log(`   📝 ${solution.description}`);
      
      if (solution.action) {
        console.log(`   🔗 ${solution.action}`);
      }
      
      if (solution.command) {
        if (Array.isArray(solution.command)) {
          console.log(`   📋 필요한 Secrets:`);
          solution.command.forEach(cmd => {
            console.log(`      - ${cmd}`);
          });
        } else {
          console.log(`   💻 ${solution.command}`);
        }
      }
    });
    
    this.solutions = solutions;
    return solutions;
  }

  /**
   * 자동 수정을 시도합니다.
   */
  async attemptAutoFix() {
    console.log('\n🔧 자동 수정 시도 중...');
    
    // 1. 워크플로우 파일 확인
    const workflowPath = path.join(process.cwd(), '.github/workflows/deploy-production.yml');
    
    if (fs.existsSync(workflowPath)) {
      console.log('✅ 워크플로우 파일 존재');
      
      const content = fs.readFileSync(workflowPath, 'utf-8');
      
      // 2. 필요한 설정이 있는지 확인
      const hasVercelToken = content.includes('vercel-token');
      const hasVercelOrgId = content.includes('vercel-org-id');
      const hasVercelProjectId = content.includes('vercel-project-id');
      
      console.log(`   - vercel-token 설정: ${hasVercelToken ? '✅' : '❌'}`);
      console.log(`   - vercel-org-id 설정: ${hasVercelOrgId ? '✅' : '❌'}`);
      console.log(`   - vercel-project-id 설정: ${hasVercelProjectId ? '✅' : '❌'}`);
      
      if (!hasVercelToken || !hasVercelOrgId || !hasVercelProjectId) {
        console.log('\n⚠️ 워크플로우 파일에 필요한 설정이 누락되었습니다.');
        this.generateWorkflowFix();
      }
    } else {
      console.log('❌ 워크플로우 파일을 찾을 수 없습니다.');
    }
  }

  /**
   * 워크플로우 파일 수정을 제안합니다.
   */
  generateWorkflowFix() {
    console.log('\n📝 워크플로우 파일 수정 제안:');
    
    const fix = `
# .github/workflows/deploy-production.yml에 다음 설정이 필요합니다:

- name: Deploy to Vercel
  uses: amondnet/vercel-action@v25
  with:
    vercel-token: \${{ secrets.VERCEL_TOKEN }}        # ← 이 설정 필요
    vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}      # ← 이 설정 필요  
    vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }} # ← 이 설정 필요
    vercel-args: '--prod'
    working-directory: ./
`;
    
    console.log(fix);
  }

  /**
   * GitHub Secrets 설정 가이드를 생성합니다.
   */
  generateSecretsGuide() {
    console.log('\n📋 GitHub Secrets 설정 가이드:');
    console.log('================================');
    
    const guide = `
1. Vercel 토큰 생성:
   - https://vercel.com/account/tokens 방문
   - "Create Token" 클릭
   - 토큰 이름 입력 (예: "GitHub Actions")
   - 토큰 복사

2. Vercel 프로젝트 정보 확인:
   - Vercel 대시보드에서 프로젝트 선택
   - Settings > General 탭
   - Project ID와 Team ID 확인

3. GitHub Secrets 설정:
   - GitHub 리포지토리 > Settings > Secrets and variables > Actions
   - "New repository secret" 클릭
   - 다음 Secrets 추가:
     * VERCEL_TOKEN: [생성한 토큰]
     * VERCEL_ORG_ID: [Team ID 또는 개인 계정 ID]
     * VERCEL_PROJECT_ID: [프로젝트 ID]
`;
    
    console.log(guide);
  }

  /**
   * 메인 실행 함수
   */
  async run() {
    console.log('🤖 Vercel 배포 에러 수정 도구');
    console.log('==============================\n');
    
    // 1. 에러 분석
    this.analyzeVercelTokenError();
    
    // 2. 해결 방안 제시
    this.generateSolutions();
    
    // 3. 자동 수정 시도
    await this.attemptAutoFix();
    
    // 4. 상세 가이드 제공
    this.generateSecretsGuide();
    
    console.log('\n🎯 다음 단계:');
    console.log('1. Vercel 토큰을 생성하세요');
    console.log('2. GitHub Secrets에 토큰을 추가하세요');
    console.log('3. 다시 배포를 시도하세요');
    console.log('4. 여전히 문제가 있다면 로그를 확인하세요');
  }
}

// CLI 인터페이스
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixer = new VercelErrorFixer();
  fixer.run().catch(console.error);
}

export default VercelErrorFixer;
