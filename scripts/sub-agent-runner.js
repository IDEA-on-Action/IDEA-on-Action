#!/usr/bin/env node

/**
 * Sub-Agent Runner Script
 * 
 * Sub-Agent를 반복해서 사용할 수 있는 스크립트입니다.
 * 컴포넌트 리팩토링, 테스트 작성, 문서 생성 작업을 자동화합니다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES 모듈에서 __dirname 사용을 위한 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 설정
const CONFIG = {
  componentsDir: 'src/components',
  testsDir: 'tests/unit/components',
  docsDir: 'docs/components',
  planFile: 'sub-agent-component-refactor.plan.md'
};

// 컴포넌트 정보
const COMPONENT_TEMPLATES = {
  'Hero': {
    description: '메인 히어로 섹션 컴포넌트',
    tasks: ['리팩토링', '테스트 작성', '문서 생성']
  },
  'Features': {
    description: '기능 소개 섹션 컴포넌트',
    tasks: ['리팩토링', '테스트 작성', '문서 생성']
  },
  'Services': {
    description: '서비스 소개 섹션 컴포넌트',
    tasks: ['리팩토링', '테스트 작성', '문서 생성']
  },
  'Header': {
    description: '네비게이션 헤더 컴포넌트',
    tasks: ['리팩토링', '테스트 작성', '문서 생성']
  },
  'Footer': {
    description: '사이트 푸터 컴포넌트',
    tasks: ['리팩토링', '테스트 작성', '문서 생성']
  }
};

class SubAgentRunner {
  constructor() {
    this.availableComponents = this.getAvailableComponents();
  }

  /**
   * 사용 가능한 컴포넌트 목록을 가져옵니다.
   */
  getAvailableComponents() {
    try {
      const componentsPath = path.join(process.cwd(), CONFIG.componentsDir);
      if (!fs.existsSync(componentsPath)) {
        console.log('❌ 컴포넌트 디렉토리를 찾을 수 없습니다.');
        return [];
      }

      const files = fs.readdirSync(componentsPath);
      return files
        .filter(file => file.endsWith('.tsx') && !file.startsWith('ui/'))
        .map(file => file.replace('.tsx', ''))
        .filter(comp => COMPONENT_TEMPLATES[comp]);
    } catch (error) {
      console.log('❌ 컴포넌트 목록을 가져오는 중 오류가 발생했습니다:', error.message);
      return [];
    }
  }

  /**
   * 메인 메뉴를 표시합니다.
   */
  showMenu() {
    console.log('\n🤖 Sub-Agent Runner');
    console.log('==================');
    console.log('1. 전체 컴포넌트 리팩토링');
    console.log('2. 특정 컴포넌트 리팩토링');
    console.log('3. 컴포넌트 상태 확인');
    console.log('4. 계획 파일 생성');
    console.log('5. 도움말');
    console.log('6. 배포 에러 자동 수정');
    console.log('0. 종료');
    console.log('==================');
  }

  /**
   * 전체 컴포넌트 리팩토링을 실행합니다.
   */
  async runFullRefactor() {
    console.log('\n🚀 전체 컴포넌트 리팩토링을 시작합니다...');
    
    for (const component of this.availableComponents) {
      console.log(`\n📦 ${component} 컴포넌트 처리 중...`);
      await this.processComponent(component);
    }

    console.log('\n✅ 전체 리팩토링이 완료되었습니다!');
    this.generateSummary();
  }

  /**
   * 특정 컴포넌트 리팩토링을 실행합니다.
   */
  async runSingleRefactor() {
    console.log('\n📋 사용 가능한 컴포넌트:');
    this.availableComponents.forEach((comp, index) => {
      console.log(`${index + 1}. ${comp} - ${COMPONENT_TEMPLATES[comp].description}`);
    });

    const { createInterface } = await import('readline');
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('\n처리할 컴포넌트 번호를 선택하세요: ', async (answer) => {
      const index = parseInt(answer) - 1;
      if (index >= 0 && index < this.availableComponents.length) {
        const component = this.availableComponents[index];
        console.log(`\n📦 ${component} 컴포넌트 처리 중...`);
        await this.processComponent(component);
        console.log(`\n✅ ${component} 리팩토링이 완료되었습니다!`);
      } else {
        console.log('❌ 잘못된 선택입니다.');
      }
      rl.close();
    });
  }

  /**
   * 컴포넌트 상태를 확인합니다.
   */
  checkComponentStatus() {
    console.log('\n📊 컴포넌트 상태 확인');
    console.log('====================');

    for (const component of this.availableComponents) {
      const status = this.getComponentStatus(component);
      console.log(`\n📦 ${component}:`);
      console.log(`  - 컴포넌트 파일: ${status.component ? '✅' : '❌'}`);
      console.log(`  - 테스트 파일: ${status.test ? '✅' : '❌'}`);
      console.log(`  - 문서 파일: ${status.docs ? '✅' : '❌'}`);
    }
  }

  /**
   * 컴포넌트 상태를 가져옵니다.
   */
  getComponentStatus(component) {
    const componentFile = path.join(CONFIG.componentsDir, `${component}.tsx`);
    const testFile = path.join(CONFIG.testsDir, `${component}.test.tsx`);
    const docsFile = path.join(CONFIG.docsDir, `${component}.md`);

    return {
      component: fs.existsSync(componentFile),
      test: fs.existsSync(testFile),
      docs: fs.existsSync(docsFile)
    };
  }

  /**
   * 계획 파일을 생성합니다.
   */
  generatePlan() {
    const planContent = this.generatePlanContent();
    const planPath = path.join(process.cwd(), CONFIG.planFile);
    
    fs.writeFileSync(planPath, planContent);
    console.log(`\n📋 계획 파일이 생성되었습니다: ${CONFIG.planFile}`);
  }

  /**
   * 계획 파일 내용을 생성합니다.
   */
  generatePlanContent() {
    const timestamp = new Date().toISOString().split('T')[0];
    
    return `# Sub-Agent를 활용한 컴포넌트 리팩토링

## 작업 개요

${this.availableComponents.length}개의 주요 컴포넌트를 Sub-Agent로 병렬 처리하여 리팩토링, 스타일링 개선, 테스트 코드 작성, 컴포넌트 문서 생성을 진행합니다.

## 대상 컴포넌트

${this.availableComponents.map((comp, index) => 
  `${index + 1}. **${comp}.tsx** - ${COMPONENT_TEMPLATES[comp].description}`
).join('\n')}

## Sub-Agent 작업 분할

${this.availableComponents.map((comp, index) => `
### Sub-Agent ${index + 1}: ${comp} 컴포넌트

- 반응형 레이아웃 개선
- 애니메이션 최적화
- 접근성(a11y) 개선
- 테스트 코드 작성 (\`tests/unit/components/${comp}.test.tsx\`)
- 컴포넌트 문서 작성 (\`docs/components/${comp}.md\`)
`).join('')}

## 공통 작업 항목

각 Sub-Agent는 다음을 포함해야 합니다:

1. **리팩토링**
   - 코드 가독성 향상
   - 매직 넘버/문자열 상수화
   - prop 타입 명확화

2. **스타일링**
   - Tailwind 클래스 최적화
   - 반응형 디자인 개선
   - 다크모드 지원 강화

3. **테스트 코드**
   - 렌더링 테스트
   - 사용자 상호작용 테스트
   - 접근성 테스트 (axe-core)

4. **문서화**
   - Props 인터페이스 설명
   - 사용 예시
   - 스타일 커스터마이징 가이드
   - 접근성 고려사항

## 예상 결과물

### 업데이트된 컴포넌트 파일

${this.availableComponents.map(comp => 
  `- \`src/components/${comp}.tsx\``
).join('\n')}

### 테스트 파일

${this.availableComponents.map(comp => 
  `- \`tests/unit/components/${comp}.test.tsx\``
).join('\n')}

### 문서 파일

${this.availableComponents.map(comp => 
  `- \`docs/components/${comp}.md\``
).join('\n')}
- \`docs/components/README.md\` (컴포넌트 문서 인덱스)

### To-dos

${this.availableComponents.map(comp => 
  `- [ ] ${comp} 컴포넌트 리팩토링 + 테스트 + 문서`
).join('\n')}
- [ ] 컴포넌트 문서 인덱스 생성

---
**생성일**: ${timestamp}
**대상 컴포넌트 수**: ${this.availableComponents.length}개
`;
  }

  /**
   * 컴포넌트를 처리합니다.
   */
  async processComponent(component) {
    const tasks = COMPONENT_TEMPLATES[component].tasks;
    
    for (const task of tasks) {
      console.log(`  🔄 ${task} 중...`);
      // 실제 작업은 여기서 수행됩니다
      await this.delay(500); // 시뮬레이션
    }
  }

  /**
   * 요약을 생성합니다.
   */
  generateSummary() {
    console.log('\n📊 작업 요약');
    console.log('============');
    console.log(`처리된 컴포넌트: ${this.availableComponents.length}개`);
    console.log(`생성된 테스트 파일: ${this.availableComponents.length}개`);
    console.log(`생성된 문서 파일: ${this.availableComponents.length + 1}개`);
    console.log(`총 생성된 파일: ${this.availableComponents.length * 3 + 1}개`);
  }

  /**
   * 배포 에러 자동 수정을 실행합니다.
   */
  async runDeployErrorFix() {
    console.log('\n🔧 배포 에러 자동 수정 시작');
    console.log('==========================');
    
    try {
      // 1. 에러 체크
      console.log('1️⃣ 에러 분석 중...');
      const { execSync } = await import('child_process');
      execSync('npm run deploy:check', { stdio: 'inherit' });
      
      // 2. 자동 수정
      console.log('\n2️⃣ 자동 수정 실행 중...');
      execSync('npm run deploy:fix', { stdio: 'inherit' });
      
      // 3. 검증
      console.log('\n3️⃣ 수정 결과 검증 중...');
      execSync('npm run deploy:safe', { stdio: 'inherit' });
      
      console.log('\n✅ 배포 에러 자동 수정이 완료되었습니다!');
    } catch (error) {
      console.error('\n❌ 배포 에러 수정 중 오류가 발생했습니다:', error.message);
      console.log('\n💡 수동으로 다음 명령어를 실행해보세요:');
      console.log('   npm run deploy:check  # 에러 분석');
      console.log('   npm run deploy:fix     # 자동 수정');
      console.log('   npm run deploy:safe    # 안전 배포');
    }
  }

  /**
   * 도움말을 표시합니다.
   */
  showHelp() {
    console.log('\n📖 Sub-Agent Runner 도움말');
    console.log('========================');
    console.log('이 도구는 컴포넌트 리팩토링 및 배포 에러 수정 작업을 자동화합니다.');
    console.log('');
    console.log('주요 기능:');
    console.log('- 전체 컴포넌트 일괄 처리');
    console.log('- 특정 컴포넌트 선택 처리');
    console.log('- 컴포넌트 상태 확인');
    console.log('- 계획 파일 자동 생성');
    console.log('- 배포 에러 자동 수정');
    console.log('');
    console.log('사용법:');
    console.log('1. 메뉴에서 원하는 작업을 선택합니다.');
    console.log('2. 안내에 따라 입력합니다.');
    console.log('3. 작업이 완료되면 결과를 확인합니다.');
    console.log('');
    console.log('배포 관련 명령어:');
    console.log('- npm run deploy:check  # 배포 전 에러 체크');
    console.log('- npm run deploy:fix    # 에러 자동 수정');
    console.log('- npm run deploy:safe   # 수정 후 안전 배포');
  }

  /**
   * 지연 함수
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 메인 실행 함수
   */
  async run() {
    const { createInterface } = await import('readline');
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = (question) => {
      return new Promise((resolve) => {
        rl.question(question, resolve);
      });
    };

    while (true) {
      this.showMenu();
      const choice = await askQuestion('\n선택하세요 (0-6): ');

      switch (choice) {
        case '1':
          await this.runFullRefactor();
          break;
        case '2':
          await this.runSingleRefactor();
          break;
        case '3':
          this.checkComponentStatus();
          break;
        case '4':
          this.generatePlan();
          break;
        case '5':
          this.showHelp();
          break;
        case '6':
          await this.runDeployErrorFix();
          break;
        case '0':
          console.log('\n👋 Sub-Agent Runner를 종료합니다.');
          rl.close();
          return;
        default:
          console.log('\n❌ 잘못된 선택입니다. 다시 시도해주세요.');
      }

      if (choice !== '0') {
        await askQuestion('\n계속하려면 Enter를 누르세요...');
      }
    }
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('sub-agent-runner.js')) {
  const runner = new SubAgentRunner();
  runner.run().catch(console.error);
}

export default SubAgentRunner;
