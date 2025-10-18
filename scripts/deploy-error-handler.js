#!/usr/bin/env node

/**
 * Deploy Error Handler
 * 
 * 배포 실패 시 에러로그를 수집하고 분석하는 스크립트
 * - GitHub Actions 로그에서 에러 추출
 * - Vercel 배포 로그 수집
 * - 빌드/린트/타입 에러 파싱
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 설정
const CONFIG = {
  maxRetries: 3,
  logDir: 'logs',
  backupDir: 'backups',
  errorTypes: {
    BUILD: 'build',
    LINT: 'lint', 
    TYPE: 'type',
    IMPORT: 'import',
    RUNTIME: 'runtime'
  }
};

// 에러 패턴 정의
const ERROR_PATTERNS = {
  // 빌드 에러
  build: [
    /Module not found: Can't resolve '([^']+)'/,
    /Cannot find module '([^']+)'/,
    /Error: Cannot resolve module '([^']+)'/
  ],
  
  // 린트 에러
  lint: [
    /'([^']+)' is defined but never used/,
    /Missing semicolon/,
    /Unexpected console\.log/,
    /'([^']+)' is assigned a value but never used/
  ],
  
  // 타입 에러
  type: [
    /Type '([^']+)' is not assignable to type '([^']+)'/,
    /Property '([^']+)' does not exist on type '([^']+)'/,
    /Object is possibly 'null' or 'undefined'/,
    /Type '([^']+)' is missing the following properties/
  ],
  
  // Import 에러
  import: [
    /Cannot find module '([^']+)' or its corresponding type declarations/,
    /Module '([^']+)' has no exported member '([^']+)'/,
    /Import '([^']+)' conflicts with local value/
  ]
};

class DeployErrorHandler {
  constructor() {
    this.errors = [];
    this.fixableErrors = [];
    this.nonFixableErrors = [];
    this.ensureDirectories();
  }

  /**
   * 필요한 디렉토리들을 생성합니다.
   */
  ensureDirectories() {
    [CONFIG.logDir, CONFIG.backupDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * GitHub Actions 로그에서 에러를 추출합니다.
   */
  async extractGitHubActionsErrors() {
    console.log('🔍 GitHub Actions 로그에서 에러 추출 중...');
    
    try {
      // 최근 워크플로우 실행 로그 가져오기
      const workflows = await this.getRecentWorkflows();
      
      for (const workflow of workflows) {
        const logs = await this.getWorkflowLogs(workflow.id);
        this.parseLogs(logs, 'github-actions');
      }
    } catch (error) {
      console.error('❌ GitHub Actions 로그 추출 실패:', error.message);
    }
  }

  /**
   * 최근 워크플로우 실행 목록을 가져옵니다.
   */
  async getRecentWorkflows() {
    try {
      const output = execSync('gh run list --limit 5 --json databaseId,name,conclusion', {
        encoding: 'utf-8'
      });
      return JSON.parse(output);
    } catch (error) {
      console.warn('⚠️ GitHub CLI를 사용할 수 없습니다. 로컬 로그를 분석합니다.');
      return [];
    }
  }

  /**
   * 워크플로우 로그를 가져옵니다.
   */
  async getWorkflowLogs(workflowId) {
    try {
      const output = execSync(`gh run view ${workflowId} --log`, {
        encoding: 'utf-8'
      });
      return output;
    } catch (error) {
      console.warn(`⚠️ 워크플로우 ${workflowId} 로그를 가져올 수 없습니다.`);
      return '';
    }
  }

  /**
   * 로컬 빌드 에러를 체크합니다.
   */
  async checkLocalBuildErrors() {
    console.log('🔍 로컬 빌드 에러 체크 중...');
    
    try {
      // 빌드 실행
      execSync('npm run build', { stdio: 'pipe' });
      console.log('✅ 로컬 빌드 성공');
    } catch (error) {
      console.log('❌ 로컬 빌드 실패');
      this.parseLogs(error.stdout + error.stderr, 'local-build');
    }
  }

  /**
   * 린트 에러를 체크합니다.
   */
  async checkLintErrors() {
    console.log('🔍 린트 에러 체크 중...');
    
    try {
      execSync('npm run lint', { stdio: 'pipe' });
      console.log('✅ 린트 체크 통과');
    } catch (error) {
      console.log('❌ 린트 에러 발견');
      this.parseLogs(error.stdout + error.stderr, 'lint');
    }
  }

  /**
   * 타입 체크 에러를 확인합니다.
   */
  async checkTypeErrors() {
    console.log('🔍 타입 체크 중...');
    
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      console.log('✅ 타입 체크 통과');
    } catch (error) {
      console.log('❌ 타입 에러 발견');
      this.parseLogs(error.stdout + error.stderr, 'type-check');
    }
  }

  /**
   * 로그를 파싱하여 에러를 추출합니다.
   */
  parseLogs(logs, source) {
    const lines = logs.split('\n');
    
    lines.forEach((line, index) => {
      // 각 에러 타입별로 패턴 매칭
      Object.entries(ERROR_PATTERNS).forEach(([type, patterns]) => {
        patterns.forEach(pattern => {
          const match = line.match(pattern);
          if (match) {
            const error = {
              type,
              source,
              line: index + 1,
              message: line.trim(),
              pattern: pattern.toString(),
              match: match,
              timestamp: new Date().toISOString()
            };
            
            this.errors.push(error);
            this.categorizeError(error);
          }
        });
      });
    });
  }

  /**
   * 에러를 수정 가능/불가능으로 분류합니다.
   */
  categorizeError(error) {
    const fixableTypes = ['lint', 'import'];
    const fixablePatterns = [
      /is defined but never used/,
      /Missing semicolon/,
      /Cannot find module/,
      /Module not found/
    ];

    const isFixable = fixableTypes.includes(error.type) || 
                     fixablePatterns.some(pattern => pattern.test(error.message));

    if (isFixable) {
      this.fixableErrors.push(error);
    } else {
      this.nonFixableErrors.push(error);
    }
  }

  /**
   * 에러 분석 결과를 생성합니다.
   */
  generateAnalysisReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalErrors: this.errors.length,
      fixableErrors: this.fixableErrors.length,
      nonFixableErrors: this.nonFixableErrors.length,
      errorsByType: this.groupErrorsByType(),
      fixableErrors: this.fixableErrors,
      nonFixableErrors: this.nonFixableErrors,
      recommendations: this.generateRecommendations()
    };

    // 리포트 저장
    const reportPath = path.join(CONFIG.logDir, `error-analysis-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 에러 분석 리포트 생성: ${reportPath}`);
    return report;
  }

  /**
   * 에러를 타입별로 그룹화합니다.
   */
  groupErrorsByType() {
    const grouped = {};
    this.errors.forEach(error => {
      if (!grouped[error.type]) {
        grouped[error.type] = [];
      }
      grouped[error.type].push(error);
    });
    return grouped;
  }

  /**
   * 수정 권장사항을 생성합니다.
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.fixableErrors.length > 0) {
      recommendations.push({
        type: 'auto-fix',
        message: `${this.fixableErrors.length}개의 에러를 자동 수정할 수 있습니다.`,
        action: 'npm run deploy:fix'
      });
    }

    if (this.nonFixableErrors.length > 0) {
      recommendations.push({
        type: 'manual-review',
        message: `${this.nonFixableErrors.length}개의 에러는 수동 검토가 필요합니다.`,
        action: '개발자 검토 필요'
      });
    }

    return recommendations;
  }

  /**
   * 메인 실행 함수
   */
  async run() {
    console.log('🤖 배포 에러 핸들러 시작');
    console.log('========================\n');

    // 1. GitHub Actions 에러 추출
    await this.extractGitHubActionsErrors();

    // 2. 로컬 빌드 에러 체크
    await this.checkLocalBuildErrors();

    // 3. 린트 에러 체크
    await this.checkLintErrors();

    // 4. 타입 에러 체크
    await this.checkTypeErrors();

    // 5. 분석 리포트 생성
    const report = this.generateAnalysisReport();

    // 6. 결과 출력
    this.printSummary(report);

    return report;
  }

  /**
   * 요약 정보를 출력합니다.
   */
  printSummary(report) {
    console.log('\n📊 에러 분석 결과');
    console.log('==================');
    console.log(`총 에러 수: ${report.totalErrors}`);
    console.log(`자동 수정 가능: ${report.fixableErrors}개`);
    console.log(`수동 검토 필요: ${report.nonFixableErrors}개`);
    
    if (report.fixableErrors > 0) {
      console.log('\n💡 권장사항:');
      console.log('   npm run deploy:fix  # 자동 수정 실행');
    }
    
    if (report.nonFixableErrors > 0) {
      console.log('\n⚠️  수동 검토가 필요한 에러:');
      report.nonFixableErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.message}`);
      });
    }
  }
}

// CLI 인터페이스
if (require.main === module) {
  const handler = new DeployErrorHandler();
  handler.run().catch(console.error);
}

module.exports = DeployErrorHandler;
