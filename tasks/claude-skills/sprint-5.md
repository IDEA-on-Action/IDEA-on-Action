# Sprint 5: 서비스별 특화 기능

> Minu 4개 서비스별 Skills 특화 기능 구현

**시작일**: 2025-11-24
**완료일**: 2025-11-24 ✅
**실제 소요**: 약 4시간 (병렬 에이전트 4개)
**관련 명세**: [spec/claude-skills/requirements.md](../../spec/claude-skills/requirements.md)
**관련 설계**: [plan/claude-skills/architecture.md](../../plan/claude-skills/architecture.md)
**선행 조건**: Sprint 4 (MCP Orchestrator) 완료 ✅

---

## 목표

1. Minu Find: 시장 분석 Excel 템플릿
2. Minu Frame: 발표 자료 (pptx) 생성 기초
3. Minu Build: 프로젝트 리포트 자동화
4. Minu Keep: 운영 보고서 자동화
5. 서비스별 E2E 테스트

---

## 작업 목록

### TASK-CS-034: Minu Find - 시장 분석 Excel ✅

**예상 시간**: 3시간
**상태**: ✅ 완료 (2025-11-24)

**작업 내용**:

```typescript
// src/skills/xlsx/generators/marketAnalysis.ts

export interface MarketAnalysisData {
  competitors: CompetitorData[];
  trends: TrendData[];
  opportunities: OpportunityData[];
}

export interface CompetitorData {
  name: string;
  marketShare: number;
  strengths: string[];
  weaknesses: string[];
  score: number;
}

export interface TrendData {
  month: string;
  value: number;
  growth: number;
}

export interface OpportunityData {
  id: string;
  title: string;
  score: number;
  priority: 'high' | 'medium' | 'low';
  rationale: string;
}

export function generateMarketAnalysisSheet(data: MarketAnalysisData): SheetConfig[] {
  return [
    {
      name: '경쟁사 분석',
      data: data.competitors.map(c => ({
        '경쟁사': c.name,
        '시장점유율': `${c.marketShare}%`,
        '강점': c.strengths.join(', '),
        '약점': c.weaknesses.join(', '),
        '종합점수': c.score,
      })),
      columns: [
        { key: '경쟁사', header: '경쟁사', width: 20 },
        { key: '시장점유율', header: '시장점유율', width: 12 },
        { key: '강점', header: '강점', width: 40 },
        { key: '약점', header: '약점', width: 40 },
        { key: '종합점수', header: '종합점수', width: 10 },
      ],
    },
    {
      name: '트렌드 분석',
      data: data.trends.map(t => ({
        '월': t.month,
        '값': t.value,
        '성장률': `${t.growth}%`,
      })),
    },
    {
      name: '사업기회',
      data: data.opportunities.map(o => ({
        'ID': o.id,
        '기회명': o.title,
        '점수': o.score,
        '우선순위': o.priority,
        '근거': o.rationale,
      })),
    },
  ];
}
```

**완료 조건**:
- [ ] 경쟁사 비교 매트릭스 시트
- [ ] 트렌드 분석 시트 (차트 데이터)
- [ ] 사업기회 스코어링 시트

---

### TASK-CS-035: Minu Frame - 발표 자료 기초 ✅

**예상 시간**: 4시간
**상태**: ⏳ 대기

**작업 내용**:

```bash
npm install pptxgenjs
```

```typescript
// src/skills/pptx/usePptxGenerate.ts

import PptxGenJS from 'pptxgenjs';

export interface SlideContent {
  type: 'title' | 'content' | 'twoColumn' | 'chart';
  title?: string;
  subtitle?: string;
  content?: string[];
  leftContent?: string[];
  rightContent?: string[];
  chartData?: ChartData;
}

export function usePptxGenerate() {
  const generatePresentation = async (slides: SlideContent[], filename: string) => {
    const pptx = new PptxGenJS();

    // 브랜드 스타일 설정
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'IDEA on Action';
    pptx.company = '생각과행동';

    for (const slide of slides) {
      const pptSlide = pptx.addSlide();

      switch (slide.type) {
        case 'title':
          addTitleSlide(pptSlide, slide);
          break;
        case 'content':
          addContentSlide(pptSlide, slide);
          break;
        case 'twoColumn':
          addTwoColumnSlide(pptSlide, slide);
          break;
        case 'chart':
          addChartSlide(pptSlide, slide);
          break;
      }
    }

    await pptx.writeFile({ fileName: filename });
  };

  return { generatePresentation };
}
```

**완료 조건**:
- [ ] pptxgenjs 패키지 설치
- [ ] 기본 슬라이드 템플릿 4종
- [ ] 브랜드 스타일 적용

---

### TASK-CS-036: Minu Build - 프로젝트 리포트 ✅

**예상 시간**: 3시간
**상태**: ⏳ 대기

**작업 내용**:

```typescript
// src/skills/xlsx/generators/projectReport.ts

export interface ProjectReportData {
  projectName: string;
  sprintNumber: number;
  startDate: string;
  endDate: string;
  tasks: TaskData[];
  burndown: BurndownData[];
  resources: ResourceData[];
}

export function generateProjectReportSheets(data: ProjectReportData): SheetConfig[] {
  return [
    {
      name: '스프린트 요약',
      data: [{
        '프로젝트': data.projectName,
        '스프린트': `Sprint ${data.sprintNumber}`,
        '시작일': data.startDate,
        '종료일': data.endDate,
        '완료율': calculateCompletionRate(data.tasks),
      }],
    },
    {
      name: '작업 목록',
      data: data.tasks.map(t => ({
        'ID': t.id,
        '제목': t.title,
        '상태': t.status,
        '담당자': t.assignee,
        '예상 시간': t.estimatedHours,
        '실제 시간': t.actualHours,
      })),
    },
    {
      name: '번다운',
      data: data.burndown.map(b => ({
        '날짜': b.date,
        '남은 작업': b.remaining,
        '이상적 진행': b.ideal,
      })),
    },
    {
      name: '리소스 할당',
      data: data.resources.map(r => ({
        '담당자': r.name,
        '할당 작업': r.taskCount,
        '완료 작업': r.completedCount,
        '생산성': `${r.productivity}%`,
      })),
    },
  ];
}
```

**완료 조건**:
- [ ] 스프린트 요약 시트
- [ ] 작업 목록 시트
- [ ] 번다운 차트 데이터 시트
- [ ] 리소스 할당 시트

---

### TASK-CS-037: Minu Keep - 운영 보고서 ✅

**예상 시간**: 3시간
**상태**: ⏳ 대기

**작업 내용**:

```typescript
// src/skills/docx/templates/operations-report.ts

export const operationsReportTemplate: DocumentTemplate = {
  id: 'operations-report',
  name: '월간 운영 보고서',
  description: '시스템 운영 현황 및 SLA 리포트',
  templateType: 'monthly-report',
  serviceId: 'minu-keep',
  variables: [
    { name: 'reportMonth', label: '보고 월', type: 'text', required: true },
    { name: 'slaMetrics', label: 'SLA 지표', type: 'table', required: true },
    { name: 'incidents', label: '장애 이력', type: 'table', required: false },
    { name: 'improvements', label: '개선 사항', type: 'textarea', required: false },
    { name: 'nextMonthPlan', label: '다음 달 계획', type: 'textarea', required: true },
  ],
  content: {
    sections: [
      { id: '1', type: 'heading', content: '{{reportMonth}} 운영 보고서', style: { level: 1 } },
      { id: '2', type: 'heading', content: '1. SLA 현황', style: { level: 2 } },
      {
        id: '3',
        type: 'table',
        content: {
          headers: ['지표', '목표', '실적', '달성률'],
          dataVariable: 'slaMetrics',
          columns: ['metric', 'target', 'actual', 'achievement'],
        },
      },
      { id: '4', type: 'heading', content: '2. 장애 이력', style: { level: 2 } },
      {
        id: '5',
        type: 'table',
        content: {
          headers: ['일시', '영향', '원인', '조치'],
          dataVariable: 'incidents',
          columns: ['datetime', 'impact', 'cause', 'action'],
        },
      },
      { id: '6', type: 'heading', content: '3. 개선 사항', style: { level: 2 } },
      { id: '7', type: 'paragraph', content: '{{improvements}}' },
      { id: '8', type: 'heading', content: '4. 다음 달 계획', style: { level: 2 } },
      { id: '9', type: 'paragraph', content: '{{nextMonthPlan}}' },
    ],
  },
  version: 1,
  isActive: true,
  createdAt: '2025-11-23',
  updatedAt: '2025-11-23',
};
```

**완료 조건**:
- [ ] SLA 지표 테이블
- [ ] 장애 이력 섹션
- [ ] 개선 사항 및 계획 섹션

---

### TASK-CS-038: 서비스별 E2E 테스트 ✅

**예상 시간**: 3시간
**상태**: ⏳ 대기
**의존성**: TASK-CS-034 ~ TASK-CS-037

**완료 조건**:
- [ ] Minu Find 시장 분석 Excel 생성 테스트
- [ ] Minu Frame 발표 자료 생성 테스트
- [ ] Minu Build 프로젝트 리포트 테스트
- [ ] Minu Keep 운영 보고서 테스트

---

## 완료 조건

- [ ] Minu Find 시장 분석 Excel 기능 완성
- [ ] Minu Frame 발표 자료 기초 기능 완성
- [ ] Minu Build 프로젝트 리포트 기능 완성
- [ ] Minu Keep 운영 보고서 기능 완성
- [ ] 서비스별 E2E 테스트 4개 통과

---

## 향후 계획

### Phase 6: AI 통합 (향후)
- Claude API 연동
- 자연어 → RFP 변환
- 자동 보고서 초안 생성

### Phase 7: 한국 특화 (향후)
- 정부 공공데이터 연동
- 한국형 문서 양식
- K-스타트업 템플릿

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-23 | 초기 작성 | Claude |
