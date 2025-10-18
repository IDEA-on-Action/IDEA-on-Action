#!/usr/bin/env node

/**
 * Sub-Agent Templates
 * 
 * Sub-Agent에서 사용할 수 있는 다양한 템플릿들을 제공합니다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES 모듈에서 __dirname 사용을 위한 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 템플릿 디렉토리
const TEMPLATES_DIR = path.join(__dirname, 'templates');

// 컴포넌트 템플릿
const COMPONENT_TEMPLATE = `import React from 'react';

// Types
interface {{ComponentName}}Props {
  className?: string;
}

// Constants
const {{COMPONENT_NAME}}_CONSTANTS = {
  // 상수 정의
} as const;

const {{ComponentName}} = ({ className = "" }: {{ComponentName}}Props) => {
  return (
    <div className={\`{{component-class}} \${className}\`}>
      {/* 컴포넌트 내용 */}
    </div>
  );
};

export default {{ComponentName}};
`;

// 테스트 템플릿
const TEST_TEMPLATE = `import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import {{ComponentName}} from '@/components/{{ComponentName}}';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('{{ComponentName}} Component', () => {
  it('renders without crashing', () => {
    render(<{{ComponentName}} />);
    expect(screen.getByRole('{{role}}')).toBeInTheDocument();
  });

  it('meets accessibility standards', async () => {
    const { container } = render(<{{ComponentName}} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
`;

// 문서 템플릿
const DOCS_TEMPLATE = `# {{ComponentName}} Component

{{component-description}}

## 개요

{{ComponentName}} 컴포넌트는 {{component-purpose}}을 담당하는 컴포넌트입니다.

## Props

\`\`\`typescript
interface {{ComponentName}}Props {
  className?: string; // 추가 CSS 클래스
}
\`\`\`

### Props 설명

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`className\` | \`string\` | \`""\` | 컴포넌트에 추가할 CSS 클래스 |

## 사용 예시

### 기본 사용법

\`\`\`tsx
import {{ComponentName}} from '@/components/{{ComponentName}}';

function App() {
  return (
    <div>
      <{{ComponentName}} />
    </div>
  );
}
\`\`\`

## 주요 기능

### 1. 기능 1
- 설명 1
- 설명 2

### 2. 기능 2
- 설명 1
- 설명 2

## 접근성 고려사항

### 1. 키보드 네비게이션
- 모든 요소가 키보드로 접근 가능
- Tab 순서가 논리적으로 구성

### 2. 스크린 리더 지원
- 적절한 ARIA 라벨 제공
- 시맨틱 HTML 구조

## 테스트

### 단위 테스트

\`\`\`bash
npm run test:unit {{ComponentName}}.test.tsx
\`\`\`

## 브라우저 지원

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 변경 이력

### v1.0.0
- 초기 구현
- 기본 기능 추가
- 테스트 코드 작성
- 문서 작성
`;

class SubAgentTemplates {
  constructor() {
    this.ensureTemplatesDir();
  }

  /**
   * 템플릿 디렉토리를 생성합니다.
   */
  ensureTemplatesDir() {
    if (!fs.existsSync(TEMPLATES_DIR)) {
      fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
    }
  }

  /**
   * 컴포넌트 템플릿을 생성합니다.
   */
  generateComponentTemplate(componentName) {
    const template = COMPONENT_TEMPLATE
      .replace(/{{ComponentName}}/g, componentName)
      .replace(/{{COMPONENT_NAME}}/g, componentName.toUpperCase())
      .replace(/{{component-class}}/g, this.kebabCase(componentName));

    const filePath = path.join(TEMPLATES_DIR, `${componentName}.tsx`);
    fs.writeFileSync(filePath, template);
    console.log(`✅ 컴포넌트 템플릿 생성: ${filePath}`);
  }

  /**
   * 테스트 템플릿을 생성합니다.
   */
  generateTestTemplate(componentName) {
    const template = TEST_TEMPLATE
      .replace(/{{ComponentName}}/g, componentName)
      .replace(/{{role}}/g, this.getDefaultRole(componentName));

    const filePath = path.join(TEMPLATES_DIR, `${componentName}.test.tsx`);
    fs.writeFileSync(filePath, template);
    console.log(`✅ 테스트 템플릿 생성: ${filePath}`);
  }

  /**
   * 문서 템플릿을 생성합니다.
   */
  generateDocsTemplate(componentName, description = '') {
    const template = DOCS_TEMPLATE
      .replace(/{{ComponentName}}/g, componentName)
      .replace(/{{component-description}}/g, description)
      .replace(/{{component-purpose}}/g, this.getComponentPurpose(componentName));

    const filePath = path.join(TEMPLATES_DIR, `${componentName}.md`);
    fs.writeFileSync(filePath, template);
    console.log(`✅ 문서 템플릿 생성: ${filePath}`);
  }

  /**
   * 모든 템플릿을 생성합니다.
   */
  generateAllTemplates(componentName, description = '') {
    console.log(`\n📦 ${componentName} 컴포넌트 템플릿 생성 중...`);
    
    this.generateComponentTemplate(componentName);
    this.generateTestTemplate(componentName);
    this.generateDocsTemplate(componentName, description);
    
    console.log(`\n✅ ${componentName} 컴포넌트 템플릿이 모두 생성되었습니다!`);
  }

  /**
   * 컴포넌트 목록에 대한 템플릿을 생성합니다.
   */
  generateTemplatesForComponents(components) {
    console.log('\n🚀 여러 컴포넌트 템플릿 생성 중...');
    
    components.forEach(({ name, description }) => {
      this.generateAllTemplates(name, description);
    });
    
    console.log('\n✅ 모든 컴포넌트 템플릿이 생성되었습니다!');
  }

  /**
   * 템플릿을 실제 파일로 복사합니다.
   */
  copyTemplateToProject(componentName, targetDir) {
    const templates = [
      { source: `${componentName}.tsx`, target: `${targetDir}/components/${componentName}.tsx` },
      { source: `${componentName}.test.tsx`, target: `${targetDir}/tests/unit/components/${componentName}.test.tsx` },
      { source: `${componentName}.md`, target: `${targetDir}/docs/components/${componentName}.md` }
    ];

    templates.forEach(({ source, target }) => {
      const sourcePath = path.join(TEMPLATES_DIR, source);
      const targetPath = path.join(process.cwd(), target);
      
      if (fs.existsSync(sourcePath)) {
        // 대상 디렉토리 생성
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`✅ ${source} → ${target}`);
      }
    });
  }

  /**
   * 케밥 케이스로 변환합니다.
   */
  kebabCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
  }

  /**
   * 기본 역할을 가져옵니다.
   */
  getDefaultRole(componentName) {
    const roleMap = {
      'Hero': 'banner',
      'Header': 'banner',
      'Footer': 'contentinfo',
      'Features': 'region',
      'Services': 'region',
      'Button': 'button',
      'Input': 'textbox',
      'Card': 'article'
    };
    
    return roleMap[componentName] || 'region';
  }

  /**
   * 컴포넌트 목적을 가져옵니다.
   */
  getComponentPurpose(componentName) {
    const purposeMap = {
      'Hero': '메인 히어로 섹션을 담당',
      'Header': '네비게이션 헤더를 담당',
      'Footer': '사이트 푸터를 담당',
      'Features': '기능 소개 섹션을 담당',
      'Services': '서비스 소개 섹션을 담당',
      'Button': '버튼 UI를 담당',
      'Input': '입력 필드를 담당',
      'Card': '카드 UI를 담당'
    };
    
    return purposeMap[componentName] || 'UI 컴포넌트를 담당';
  }

  /**
   * 템플릿 목록을 표시합니다.
   */
  listTemplates() {
    console.log('\n📋 사용 가능한 템플릿:');
    
    if (!fs.existsSync(TEMPLATES_DIR)) {
      console.log('❌ 템플릿 디렉토리가 없습니다.');
      return;
    }
    
    const files = fs.readdirSync(TEMPLATES_DIR);
    const components = [...new Set(files.map(file => file.split('.')[0]))];
    
    components.forEach(component => {
      console.log(`\n📦 ${component}:`);
      console.log(`  - 컴포넌트: ${component}.tsx`);
      console.log(`  - 테스트: ${component}.test.tsx`);
      console.log(`  - 문서: ${component}.md`);
    });
  }

  /**
   * 템플릿을 정리합니다.
   */
  cleanTemplates() {
    if (fs.existsSync(TEMPLATES_DIR)) {
      fs.rmSync(TEMPLATES_DIR, { recursive: true, force: true });
      console.log('✅ 템플릿 디렉토리가 정리되었습니다.');
    }
  }
}

// CLI 인터페이스
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('sub-agent-templates.js')) {
  const templates = new SubAgentTemplates();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📖 Sub-Agent Templates 사용법:');
    console.log('  node scripts/sub-agent-templates.js <command> [options]');
    console.log('');
    console.log('명령어:');
    console.log('  generate <componentName> [description]  - 컴포넌트 템플릿 생성');
    console.log('  list                                    - 템플릿 목록 표시');
    console.log('  clean                                   - 템플릿 정리');
    console.log('  copy <componentName> <targetDir>         - 템플릿을 프로젝트로 복사');
    process.exit(0);
  }
  
  const command = args[0];
  
  switch (command) {
    case 'generate':
      if (args.length < 2) {
        console.log('❌ 컴포넌트 이름을 입력해주세요.');
        process.exit(1);
      }
      const componentName = args[1];
      const description = args[2] || '';
      templates.generateAllTemplates(componentName, description);
      break;
      
    case 'list':
      templates.listTemplates();
      break;
      
    case 'clean':
      templates.cleanTemplates();
      break;
      
    case 'copy':
      if (args.length < 3) {
        console.log('❌ 컴포넌트 이름과 대상 디렉토리를 입력해주세요.');
        process.exit(1);
      }
      const compName = args[1];
      const targetDir = args[2];
      templates.copyTemplateToProject(compName, targetDir);
      break;
      
    default:
      console.log('❌ 알 수 없는 명령어입니다.');
  }
}

// 문서 현행화 템플릿
const DOC_MAINTENANCE_TEMPLATE = {
  name: "문서 현행화 에이전트",
  description: "작업 완료 후 문서 자동 현행화",
  prompt: `최근 커밋을 분석하여 프로젝트 문서를 자동으로 업데이트하세요.

1. **Changelog 업데이트** (docs/project/changelog.md)
   - 최근 커밋 메시지를 분석
   - [Unreleased] 섹션에 변경사항 추가
   - Keep a Changelog 형식 준수

2. **CLAUDE.md 슬림화** (CLAUDE.md)
   - 파일 크기가 30KB 초과 시:
     - 오래된 섹션을 docs/archive/CLAUDE-sections-{날짜}.md로 이동
     - CLAUDE.md에 요약 + 링크만 남김
     - 목표: 20KB 이하로 축소

3. **project-todo.md 정리** (project-todo.md)
   - 완료된 항목(✅)을 docs/archive/completed-tasks-{날짜}.md로 이동
   - 진행 중/예정 작업만 유지
   - 목표: 15KB 이하로 축소

4. **문서 일관성 검증**
   - package.json, CLAUDE.md, project-todo.md의 버전 일치 확인
   - 마지막 업데이트 날짜 현행화
   - 불일치 발견 시 자동 수정

5. **실행 명령어**
   \`\`\`bash
   npm run doc:check    # 검사만 (Dry run)
   npm run doc:update   # 실제 업데이트
   \`\`\`
`,
  config: {
    maxCLAUDESize: 30000,  // 30KB
    maxTodoSize: 15000,     // 15KB
    archiveThreshold: 90,   // 90일
  }
};

export default SubAgentTemplates;
export { DOC_MAINTENANCE_TEMPLATE };
