# Sprint 3: docx Skill 통합

> Word 문서 생성 기능 및 RFP 템플릿 구현

**시작일**: 2025-11-27 (예정)
**예상 소요**: 16시간 (2일)
**관련 명세**: [spec/claude-skills/requirements.md](../../spec/claude-skills/requirements.md)
**관련 설계**: [plan/claude-skills/architecture.md](../../plan/claude-skills/architecture.md)
**선행 조건**: Sprint 2 (대시보드) 완료

---

## 목표

1. docx 패키지 설치 및 설정
2. TemplateEngine 구현
3. useDocxGenerate 훅 구현
4. RFP 템플릿 3종 구현 (정부 SI, 스타트업, 엔터프라이즈)
5. 보고서 템플릿 2종 구현 (주간, 월간)
6. RFPWizard 컴포넌트 구현
7. DB 템플릿 테이블 생성
8. E2E 테스트 작성

---

## 작업 목록

### TASK-CS-017: docx 패키지 설치 및 설정

**예상 시간**: 30분
**상태**: ⏳ 대기

**작업 내용**:

```bash
# 패키지 설치
npm install docx
```

```typescript
// vite.config.ts - 번들 최적화 추가
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'xlsx-skill': ['xlsx'],
          'docx-skill': ['docx'],
        },
      },
    },
  },
});
```

**완료 조건**:
- [ ] docx 패키지 설치 완료
- [ ] 빌드 성공 확인
- [ ] 번들 크기 확인 (예상: ~60KB gzip 추가)

---

### TASK-CS-018: TypeScript 타입 확장

**예상 시간**: 1시간
**상태**: ⏳ 대기
**의존성**: TASK-CS-017

**작업 내용**:

```typescript
// src/types/docx.types.ts

export type TemplateType =
  | 'rfp-government'
  | 'rfp-startup'
  | 'rfp-enterprise'
  | 'weekly-report'
  | 'monthly-report'
  | 'incident-report';

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  templateType: TemplateType;
  serviceId: ServiceId | 'hub';
  content: TemplateContent;
  variables: VariableDefinition[];
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateContent {
  sections: TemplateSection[];
  styles?: DocumentStyles;
  header?: HeaderConfig;
  footer?: FooterConfig;
}

export interface TemplateSection {
  id: string;
  type: 'heading' | 'paragraph' | 'table' | 'list' | 'image';
  content: string | TableConfig | ListConfig;
  style?: SectionStyle;
  variables?: string[]; // 이 섹션에서 사용하는 변수 목록
}

export interface VariableDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'table';
  required: boolean;
  defaultValue?: unknown;
  options?: string[]; // select 타입용
  validation?: ValidationRule;
}

export interface ValidationRule {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  message?: string;
}

export interface UseDocxGenerateOptions {
  template: TemplateType | DocumentTemplate;
  variables: Record<string, unknown>;
  outputFilename?: string;
}

export interface UseDocxGenerateResult {
  generateDocument: (options: UseDocxGenerateOptions) => Promise<void>;
  isGenerating: boolean;
  progress: number;
  error: SkillError | null;
}

// RFP 전용 타입
export interface RFPVariables {
  projectName: string;
  clientName: string;
  projectOverview: string;
  objectives: string[];
  functionalRequirements: Requirement[];
  nonFunctionalRequirements: Requirement[];
  timeline: TimelineItem[];
  budget?: string;
  evaluationCriteria: EvaluationCriterion[];
  contactInfo: ContactInfo;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  priority: 'must' | 'should' | 'could' | 'wont';
  category?: string;
}

export interface TimelineItem {
  phase: string;
  startDate: string;
  endDate: string;
  milestones: string[];
}

export interface EvaluationCriterion {
  category: string;
  weight: number;
  description: string;
}

export interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
}
```

**완료 조건**:
- [ ] docx.types.ts 파일 생성
- [ ] skills.types.ts와 통합
- [ ] TypeScript 컴파일 에러 없음

---

### TASK-CS-019: TemplateEngine 구현

**예상 시간**: 2시간
**상태**: ⏳ 대기
**의존성**: TASK-CS-018

**작업 내용**:

```typescript
// src/skills/docx/TemplateEngine.ts

import { Document, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel } from 'docx';
import type { DocumentTemplate, TemplateSection, RFPVariables } from '@/types/docx.types';

export class TemplateEngine {
  private variables: Record<string, unknown>;

  constructor(variables: Record<string, unknown>) {
    this.variables = variables;
  }

  /**
   * 템플릿의 변수를 실제 값으로 치환
   */
  replaceVariables(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = this.variables[key];
      if (value === undefined || value === null) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    });
  }

  /**
   * 섹션을 docx 요소로 변환
   */
  buildSection(section: TemplateSection): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [];

    switch (section.type) {
      case 'heading':
        elements.push(this.buildHeading(section));
        break;
      case 'paragraph':
        elements.push(this.buildParagraph(section));
        break;
      case 'table':
        elements.push(this.buildTable(section));
        break;
      case 'list':
        elements.push(...this.buildList(section));
        break;
    }

    return elements;
  }

  private buildHeading(section: TemplateSection): Paragraph {
    const level = section.style?.level || 1;
    const headingLevel = [
      HeadingLevel.HEADING_1,
      HeadingLevel.HEADING_2,
      HeadingLevel.HEADING_3,
    ][level - 1] || HeadingLevel.HEADING_1;

    return new Paragraph({
      text: this.replaceVariables(section.content as string),
      heading: headingLevel,
    });
  }

  private buildParagraph(section: TemplateSection): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text: this.replaceVariables(section.content as string),
        }),
      ],
    });
  }

  private buildTable(section: TemplateSection): Table {
    const config = section.content as TableConfig;
    const data = this.resolveTableData(config);

    return new Table({
      rows: [
        // 헤더 행
        new TableRow({
          children: config.headers.map(header =>
            new TableCell({
              children: [new Paragraph({ text: header, bold: true })],
            })
          ),
        }),
        // 데이터 행
        ...data.map(row =>
          new TableRow({
            children: row.map(cell =>
              new TableCell({
                children: [new Paragraph({ text: String(cell) })],
              })
            ),
          })
        ),
      ],
    });
  }

  private buildList(section: TemplateSection): Paragraph[] {
    const config = section.content as ListConfig;
    const items = this.resolveListItems(config);

    return items.map((item, index) =>
      new Paragraph({
        text: `${config.ordered ? `${index + 1}.` : '•'} ${item}`,
        indent: { left: 720 },
      })
    );
  }

  private resolveTableData(config: TableConfig): string[][] {
    if (config.dataVariable) {
      const data = this.variables[config.dataVariable];
      if (Array.isArray(data)) {
        return data.map(row =>
          config.columns.map(col => String(row[col] || ''))
        );
      }
    }
    return config.data || [];
  }

  private resolveListItems(config: ListConfig): string[] {
    if (config.itemsVariable) {
      const items = this.variables[config.itemsVariable];
      if (Array.isArray(items)) {
        return items.map(item => String(item));
      }
    }
    return config.items || [];
  }
}
```

**완료 조건**:
- [ ] 변수 치환 로직 구현
- [ ] 섹션 빌더 (heading, paragraph, table, list) 구현
- [ ] 배열 데이터 처리 지원

---

### TASK-CS-020: useDocxGenerate 훅 구현

**예상 시간**: 2시간
**상태**: ⏳ 대기
**의존성**: TASK-CS-019

**작업 내용**:

```typescript
// src/skills/docx/useDocxGenerate.ts

import { useState, useCallback } from 'react';
import { Document, Packer, Paragraph } from 'docx';
import { TemplateEngine } from './TemplateEngine';
import { getTemplate } from './templates';
import type { UseDocxGenerateOptions, UseDocxGenerateResult, SkillError } from '@/types';

export function useDocxGenerate(): UseDocxGenerateResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<SkillError | null>(null);

  const generateDocument = useCallback(async (options: UseDocxGenerateOptions) => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      // 1. 템플릿 로딩 (20%)
      setProgress(10);
      const template = typeof options.template === 'string'
        ? await getTemplate(options.template)
        : options.template;
      setProgress(20);

      // 2. 템플릿 엔진 초기화 (30%)
      const engine = new TemplateEngine(options.variables);
      setProgress(30);

      // 3. 문서 빌드 (70%)
      const sections = template.content.sections.flatMap(section =>
        engine.buildSection(section)
      );
      setProgress(50);

      const doc = new Document({
        sections: [{
          properties: {},
          children: sections,
        }],
      });
      setProgress(70);

      // 4. Blob 생성 (90%)
      const blob = await Packer.toBlob(doc);
      setProgress(90);

      // 5. 다운로드 (100%)
      const filename = options.outputFilename || generateFilename(template.name);
      downloadBlob(blob, filename);
      setProgress(100);

    } catch (err) {
      setError({
        code: 'DOCX_GENERATE_FAILED',
        message: 'Word 문서 생성에 실패했습니다.',
        details: err,
      });
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generateDocument, isGenerating, progress, error };
}

function generateFilename(templateName: string): string {
  const date = new Date().toISOString().split('T')[0];
  const safeName = templateName.replace(/[^a-zA-Z0-9가-힣]/g, '-');
  return `${safeName}-${date}.docx`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

**완료 조건**:
- [ ] 훅 구현 완료
- [ ] 진행률 표시 정상 작동
- [ ] 에러 핸들링 정상 작동

---

### TASK-CS-021: RFP 템플릿 3종 구현

**예상 시간**: 3시간
**상태**: ⏳ 대기
**의존성**: TASK-CS-019

**작업 내용**:

```typescript
// src/skills/docx/templates/rfp-government.ts

import type { DocumentTemplate } from '@/types/docx.types';

export const rfpGovernmentTemplate: DocumentTemplate = {
  id: 'rfp-government',
  name: '정부 SI 표준 RFP',
  description: '공공기관 시스템 구축 사업 제안요청서',
  templateType: 'rfp-government',
  serviceId: 'minu-frame',
  version: 1,
  isActive: true,
  variables: [
    { name: 'projectName', label: '사업명', type: 'text', required: true },
    { name: 'clientName', label: '발주기관', type: 'text', required: true },
    { name: 'projectOverview', label: '사업개요', type: 'textarea', required: true },
    { name: 'objectives', label: '추진목표', type: 'textarea', required: true },
    { name: 'functionalRequirements', label: '기능 요구사항', type: 'table', required: true },
    { name: 'nonFunctionalRequirements', label: '비기능 요구사항', type: 'table', required: false },
    { name: 'budget', label: '사업예산', type: 'text', required: false },
    { name: 'timeline', label: '추진일정', type: 'table', required: true },
    { name: 'evaluationCriteria', label: '평가기준', type: 'table', required: true },
  ],
  content: {
    sections: [
      { id: '1', type: 'heading', content: '{{projectName}} 제안요청서', style: { level: 1 } },
      { id: '2', type: 'paragraph', content: '발주기관: {{clientName}}' },
      { id: '3', type: 'heading', content: '1. 사업개요', style: { level: 2 } },
      { id: '4', type: 'paragraph', content: '{{projectOverview}}' },
      { id: '5', type: 'heading', content: '2. 추진목표', style: { level: 2 } },
      { id: '6', type: 'paragraph', content: '{{objectives}}' },
      { id: '7', type: 'heading', content: '3. 기능 요구사항', style: { level: 2 } },
      {
        id: '8',
        type: 'table',
        content: {
          headers: ['요구사항 ID', '요구사항명', '설명', '우선순위'],
          dataVariable: 'functionalRequirements',
          columns: ['id', 'title', 'description', 'priority'],
        }
      },
      { id: '9', type: 'heading', content: '4. 비기능 요구사항', style: { level: 2 } },
      {
        id: '10',
        type: 'table',
        content: {
          headers: ['요구사항 ID', '요구사항명', '설명', '우선순위'],
          dataVariable: 'nonFunctionalRequirements',
          columns: ['id', 'title', 'description', 'priority'],
        }
      },
      { id: '11', type: 'heading', content: '5. 추진일정', style: { level: 2 } },
      {
        id: '12',
        type: 'table',
        content: {
          headers: ['단계', '시작일', '종료일', '마일스톤'],
          dataVariable: 'timeline',
          columns: ['phase', 'startDate', 'endDate', 'milestones'],
        }
      },
      { id: '13', type: 'heading', content: '6. 사업예산', style: { level: 2 } },
      { id: '14', type: 'paragraph', content: '{{budget}}' },
      { id: '15', type: 'heading', content: '7. 평가기준', style: { level: 2 } },
      {
        id: '16',
        type: 'table',
        content: {
          headers: ['평가항목', '배점', '설명'],
          dataVariable: 'evaluationCriteria',
          columns: ['category', 'weight', 'description'],
        }
      },
    ],
  },
  createdAt: '2025-11-23',
  updatedAt: '2025-11-23',
};

// 유사하게 rfp-startup.ts, rfp-enterprise.ts 구현
```

**완료 조건**:
- [ ] 정부 SI RFP 템플릿 완성
- [ ] 스타트업 MVP RFP 템플릿 완성
- [ ] 엔터프라이즈 RFP 템플릿 완성
- [ ] 각 템플릿 변수 정의 완료

---

### TASK-CS-022: 보고서 템플릿 2종 구현

**예상 시간**: 2시간
**상태**: ⏳ 대기
**의존성**: TASK-CS-019

**작업 내용**:

주간 보고서 및 월간 보고서 템플릿 구현

**완료 조건**:
- [ ] 주간 보고서 템플릿 완성
- [ ] 월간 보고서 템플릿 완성

---

### TASK-CS-023: RFPWizard 컴포넌트 구현

**예상 시간**: 3시간
**상태**: ⏳ 대기
**의존성**: TASK-CS-020, TASK-CS-021

**작업 내용**:

4단계 입력 마법사 UI 구현:
1. 개요 (프로젝트명, 발주기관, 개요)
2. 요구사항 (기능/비기능 요구사항 입력)
3. 평가 기준 (평가 항목 및 배점)
4. 검토 및 생성 (미리보기 및 다운로드)

**완료 조건**:
- [ ] 4단계 마법사 UI 완성
- [ ] 단계별 유효성 검사
- [ ] 임시 저장 기능
- [ ] 최종 생성 및 다운로드

---

### TASK-CS-024: DB 템플릿 테이블 생성

**예상 시간**: 1시간
**상태**: ⏳ 대기

**작업 내용**:

```sql
-- supabase/migrations/20251127xxxxxx_create_document_templates.sql

CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL,
  service_id TEXT,
  content JSONB NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스 및 RLS 정책 추가
```

**완료 조건**:
- [ ] 마이그레이션 파일 생성
- [ ] 로컬 DB 적용 테스트
- [ ] RLS 정책 작동 확인

---

### TASK-CS-025: E2E 테스트 작성

**예상 시간**: 2시간
**상태**: ⏳ 대기
**의존성**: TASK-CS-023, TASK-CS-024

**완료 조건**:
- [ ] RFP 생성 플로우 테스트 5개
- [ ] 템플릿 선택 테스트
- [ ] 유효성 검사 테스트
- [ ] 다운로드 테스트

---

## 완료 조건

- [ ] docx 패키지 설치 및 빌드 성공
- [ ] TemplateEngine 구현 완료
- [ ] useDocxGenerate 훅 구현 완료
- [ ] RFP 템플릿 3종 완성
- [ ] 보고서 템플릿 2종 완성
- [ ] RFPWizard 4단계 완성
- [ ] DB 마이그레이션 적용
- [ ] E2E 테스트 5개 통과
- [ ] 10페이지 문서 2초 이내 생성

---

## 다음 Sprint

[Sprint 4: MCP Orchestrator](sprint-4.md)

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-23 | 초기 작성 | Claude |
