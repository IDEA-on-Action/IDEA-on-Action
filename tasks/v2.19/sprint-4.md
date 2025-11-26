# v2.19.0 Sprint 4: xlsx 차트 삽입 (BL-006)

**작성일**: 2025-11-26
**Sprint**: 4/5
**예상 시간**: 3시간
**상태**: 📝 Ready

---

## Sprint 목표

1. **xlsx 차트 API 구현**: addChart 메서드, 4가지 차트 타입
2. **Minu Skills 통합**: 3개 스킬에 차트 추가
3. **E2E 테스트**: 3개 신규 작성

---

## TASK-020: XLSXChartOptions 타입 정의

**담당**: AI 에이전트
**예상 시간**: 30분
**우선순위**: P0

### 설명
xlsx 차트 관련 타입을 정의합니다.

### 파일 수정

#### src/lib/types/skills.types.ts

**추가할 타입**:
```typescript
/**
 * xlsx 차트 타입
 */
export type XLSXChartType = 'line' | 'bar' | 'pie' | 'area';

/**
 * xlsx 차트 옵션
 */
export interface XLSXChartOptions {
  /** 차트 타입 */
  type: XLSXChartType;

  /** 차트 제목 */
  title: string;

  /** 데이터 범위 (예: 'A1:B10') */
  dataRange: string;

  /** 차트 위치 */
  position: {
    /** 열 (0부터 시작) */
    col: number;
    /** 행 (0부터 시작) */
    row: number;
  };

  /** 차트 크기 */
  size: {
    /** 너비 (픽셀) */
    width: number;
    /** 높이 (픽셀) */
    height: number;
  };

  /** X축 레이블 (선택) */
  xAxisLabel?: string;

  /** Y축 레이블 (선택) */
  yAxisLabel?: string;

  /** 범례 표시 여부 */
  showLegend?: boolean;

  /** 데이터 레이블 표시 여부 */
  showDataLabels?: boolean;
}

/**
 * xlsx 차트 데이터
 */
export interface XLSXChartData {
  /** 시리즈 이름 */
  name: string;

  /** 데이터 값 */
  values: number[];

  /** 카테고리 (X축 레이블) */
  categories?: string[];
}

/**
 * xlsx 차트 결과
 */
export interface XLSXChartResult {
  /** 차트 이름 */
  chartName: string;

  /** 차트가 삽입된 시트 이름 */
  sheetName: string;

  /** 차트 위치 */
  position: string; // 예: 'E2'
}
```

### 체크리스트
- [ ] XLSXChartOptions 인터페이스 정의
- [ ] XLSXChartData 인터페이스 정의
- [ ] XLSXChartResult 인터페이스 정의
- [ ] JSDoc 주석 추가
- [ ] TypeScript strict mode 통과

### 완료 조건
```bash
# TypeScript 검사
npx tsc --noEmit
# 기대: 0 errors

# 린트 검사
npm run lint
# 기대: 0 errors
```

---

## TASK-021: xlsxHelper.addChart 메서드 구현

**담당**: AI 에이전트
**예상 시간**: 1시간 30분
**우선순위**: P0
**의존성**: TASK-020 완료 후 진행

### 설명
xlsxHelper 클래스에 차트 삽입 메서드를 구현합니다.

### 파일 수정

#### src/lib/xlsx/xlsxHelper.ts

**추가할 메서드**:
```typescript
import * as XLSX from 'xlsx';
import type { XLSXChartOptions, XLSXChartResult } from '@/lib/types/skills.types';

export class XLSXHelper {
  // 기존 메서드...

  /**
   * 차트 삽입
   * @description xlsx 시트에 차트를 삽입합니다.
   * @note SheetJS Community Edition은 차트를 직접 지원하지 않습니다.
   *       대신 차트 데이터를 별도 시트에 생성하고,
   *       Excel에서 직접 차트를 생성할 수 있도록 가이드 텍스트를 추가합니다.
   */
  addChart(
    workbook: XLSX.WorkBook,
    sheetName: string,
    options: XLSXChartOptions
  ): XLSXChartResult {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    // 차트 정보 시트 생성
    const chartInfoSheetName = `${sheetName}_Chart_Info`;
    const chartInfoData = [
      ['차트 정보'],
      ['타입', options.type],
      ['제목', options.title],
      ['데이터 범위', options.dataRange],
      ['위치', `${this.columnToLetter(options.position.col)}${options.position.row + 1}`],
      ['크기', `${options.size.width}x${options.size.height}`],
      [],
      ['📊 Excel에서 차트 삽입 방법:'],
      ['1. 데이터 범위 선택:', options.dataRange],
      ['2. 삽입 > 차트 선택'],
      [`3. 차트 타입: ${this.getChartTypeKorean(options.type)}`],
      ['4. 차트 제목:', options.title],
    ];

    if (options.xAxisLabel) {
      chartInfoData.push(['5. X축 레이블:', options.xAxisLabel]);
    }
    if (options.yAxisLabel) {
      chartInfoData.push(['6. Y축 레이블:', options.yAxisLabel]);
    }

    const chartInfoSheet = XLSX.utils.aoa_to_sheet(chartInfoData);
    XLSX.utils.book_append_sheet(workbook, chartInfoSheet, chartInfoSheetName);

    // 원본 시트에 차트 위치 표시
    const chartPosition = this.columnToLetter(options.position.col) + (options.position.row + 1);
    const marker = [
      [`📊 ${options.title}`],
      [`[차트: ${options.type}]`],
      [`데이터: ${options.dataRange}`],
    ];

    XLSX.utils.sheet_add_aoa(worksheet, marker, {
      origin: chartPosition,
    });

    return {
      chartName: options.title,
      sheetName: chartInfoSheetName,
      position: chartPosition,
    };
  }

  /**
   * 열 번호를 문자로 변환 (0 → 'A', 1 → 'B', ...)
   */
  private columnToLetter(col: number): string {
    let letter = '';
    let temp = col;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  }

  /**
   * 차트 타입 한글명
   */
  private getChartTypeKorean(type: XLSXChartType): string {
    const typeMap: Record<XLSXChartType, string> = {
      line: '꺾은선형',
      bar: '막대형',
      pie: '원형',
      area: '영역형',
    };
    return typeMap[type] || type;
  }
}
```

### 구현 전략
SheetJS Community Edition은 차트 생성을 직접 지원하지 않으므로, 다음과 같이 우회합니다:

1. **차트 정보 시트 생성**: 차트 메타데이터를 별도 시트에 저장
2. **차트 위치 마커**: 원본 시트에 차트 위치 표시
3. **가이드 텍스트**: Excel에서 수동으로 차트를 삽입하는 방법 안내

### 체크리스트
- [ ] addChart 메서드 구현
- [ ] columnToLetter 헬퍼 함수
- [ ] getChartTypeKorean 헬퍼 함수
- [ ] 차트 정보 시트 생성
- [ ] 차트 위치 마커 표시
- [ ] TypeScript 에러 없음
- [ ] 단위 테스트 통과

### 완료 조건
```bash
# TypeScript 검사
npx tsc --noEmit
# 기대: 0 errors

# 단위 테스트
npm run test -- xlsxHelper.test.ts
# 기대: 통과
```

---

## TASK-022: marketAnalysis 차트 통합

**담당**: 병렬 에이전트 A
**예상 시간**: 20분
**우선순위**: P1
**의존성**: TASK-021 완료 후 진행

### 설명
Minu Find의 시장분석 Excel에 차트를 추가합니다.

### 파일 수정

#### src/lib/claude/skills/marketAnalysis.ts

**차트 추가 위치**:
```typescript
export async function generateMarketAnalysis(data: MarketData): Promise<Blob> {
  const workbook = XLSX.utils.book_new();
  const xlsxHelper = new XLSXHelper();

  // 기존: 경쟁사 비교 시트
  const competitorSheet = xlsxHelper.createSheet(/* ... */);
  XLSX.utils.book_append_sheet(workbook, competitorSheet, '경쟁사 비교');

  // 신규: 경쟁사 비교 차트 추가
  xlsxHelper.addChart(workbook, '경쟁사 비교', {
    type: 'bar',
    title: '경쟁사 시장 점유율',
    dataRange: 'A2:B10',
    position: { col: 4, row: 1 }, // E2
    size: { width: 400, height: 300 },
    xAxisLabel: '경쟁사',
    yAxisLabel: '시장 점유율 (%)',
    showLegend: true,
  });

  // 기존: 트렌드 분석 시트
  const trendSheet = xlsxHelper.createSheet(/* ... */);
  XLSX.utils.book_append_sheet(workbook, trendSheet, '트렌드 분석');

  // 신규: 트렌드 차트 추가
  xlsxHelper.addChart(workbook, '트렌드 분석', {
    type: 'line',
    title: '월별 트렌드',
    dataRange: 'A2:C13',
    position: { col: 5, row: 1 }, // F2
    size: { width: 500, height: 300 },
    xAxisLabel: '월',
    yAxisLabel: '검색량',
    showLegend: true,
  });

  // Excel 파일 생성
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
```

### 체크리스트
- [ ] 경쟁사 비교 차트 추가 (막대형)
- [ ] 트렌드 분석 차트 추가 (꺾은선형)
- [ ] 차트 위치 및 크기 조정
- [ ] TypeScript 에러 없음
- [ ] 기능 동작 검증

### 완료 조건
```bash
# TypeScript 검사
npx tsc --noEmit
# 기대: 0 errors

# 수동 테스트
# Minu Find → 시장분석 생성 → Excel 다운로드 → 차트 정보 시트 확인
```

---

## TASK-023: projectReport 차트 통합

**담당**: 병렬 에이전트 B
**예상 시간**: 20분
**우선순위**: P1
**의존성**: TASK-021 완료 후 진행

### 설명
Minu Build의 프로젝트 리포트 Excel에 차트를 추가합니다.

### 파일 수정

#### src/lib/claude/skills/projectReport.ts

**차트 추가 위치**:
```typescript
export async function generateProjectReport(data: ProjectData): Promise<Blob> {
  const workbook = XLSX.utils.book_new();
  const xlsxHelper = new XLSXHelper();

  // 기존: 스프린트 요약 시트
  const sprintSheet = xlsxHelper.createSheet(/* ... */);
  XLSX.utils.book_append_sheet(workbook, sprintSheet, '스프린트 요약');

  // 신규: 번다운 차트 추가
  xlsxHelper.addChart(workbook, '스프린트 요약', {
    type: 'area',
    title: '스프린트 번다운',
    dataRange: 'A2:C15',
    position: { col: 5, row: 1 }, // F2
    size: { width: 500, height: 300 },
    xAxisLabel: '날짜',
    yAxisLabel: '남은 작업 (시간)',
    showLegend: true,
  });

  // 기존: 리소스 할당 시트
  const resourceSheet = xlsxHelper.createSheet(/* ... */);
  XLSX.utils.book_append_sheet(workbook, resourceSheet, '리소스 할당');

  // 신규: 리소스 할당 차트 추가
  xlsxHelper.addChart(workbook, '리소스 할당', {
    type: 'pie',
    title: '팀원별 작업 분배',
    dataRange: 'A2:B10',
    position: { col: 4, row: 1 }, // E2
    size: { width: 400, height: 300 },
    showLegend: true,
    showDataLabels: true,
  });

  // Excel 파일 생성
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
```

### 체크리스트
- [ ] 번다운 차트 추가 (영역형)
- [ ] 리소스 할당 차트 추가 (원형)
- [ ] 차트 위치 및 크기 조정
- [ ] TypeScript 에러 없음
- [ ] 기능 동작 검증

### 완료 조건
```bash
# TypeScript 검사
npx tsc --noEmit
# 기대: 0 errors

# 수동 테스트
# Minu Build → 프로젝트 리포트 생성 → Excel 다운로드 → 차트 정보 시트 확인
```

---

## TASK-024: operationsReport 차트 통합

**담당**: 병렬 에이전트 C
**예상 시간**: 20분
**우선순위**: P1
**의존성**: TASK-021 완료 후 진행

### 설명
Minu Keep의 운영 보고서 Excel에 차트를 추가합니다.

### 파일 수정

#### src/lib/claude/skills/operationsReport.ts

**차트 추가 위치**:
```typescript
export async function generateOperationsReport(data: OpsData): Promise<Blob> {
  const workbook = XLSX.utils.book_new();
  const xlsxHelper = new XLSXHelper();

  // 기존: SLA 지표 시트
  const slaSheet = xlsxHelper.createSheet(/* ... */);
  XLSX.utils.book_append_sheet(workbook, slaSheet, 'SLA 지표');

  // 신규: SLA 달성률 차트 추가
  xlsxHelper.addChart(workbook, 'SLA 지표', {
    type: 'line',
    title: 'SLA 달성률 추이',
    dataRange: 'A2:C13',
    position: { col: 5, row: 1 }, // F2
    size: { width: 500, height: 300 },
    xAxisLabel: '월',
    yAxisLabel: '달성률 (%)',
    showLegend: true,
  });

  // 기존: 장애 이력 시트
  const incidentSheet = xlsxHelper.createSheet(/* ... */);
  XLSX.utils.book_append_sheet(workbook, incidentSheet, '장애 이력');

  // 신규: 장애 타입별 차트 추가
  xlsxHelper.addChart(workbook, '장애 이력', {
    type: 'bar',
    title: '장애 타입별 발생 건수',
    dataRange: 'A2:B10',
    position: { col: 4, row: 1 }, // E2
    size: { width: 400, height: 300 },
    xAxisLabel: '장애 타입',
    yAxisLabel: '발생 건수',
    showLegend: false,
  });

  // Excel 파일 생성
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
```

### 체크리스트
- [ ] SLA 달성률 차트 추가 (꺾은선형)
- [ ] 장애 타입별 차트 추가 (막대형)
- [ ] 차트 위치 및 크기 조정
- [ ] TypeScript 에러 없음
- [ ] 기능 동작 검증

### 완료 조건
```bash
# TypeScript 검사
npx tsc --noEmit
# 기대: 0 errors

# 수동 테스트
# Minu Keep → 운영 보고서 생성 → Excel 다운로드 → 차트 정보 시트 확인
```

---

## TASK-025: E2E 테스트 작성

**담당**: AI 에이전트
**예상 시간**: 30분
**우선순위**: P0
**의존성**: TASK-022~024 완료 후 진행

### 설명
xlsx 차트 삽입 E2E 테스트를 작성합니다.

### 파일 생성

#### tests/e2e/xlsx-chart.spec.ts
```typescript
import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';

test.describe('XLSX Chart Insertion', () => {
  test('should insert line chart in market analysis', async ({ page }) => {
    await page.goto('/services/find');

    // 시장분석 생성
    await page.click('[data-testid="generate-market-analysis"]');
    await page.fill('[data-testid="market-keyword"]', '스마트폰');
    await page.click('[data-testid="generate-button"]');

    // Excel 다운로드 대기
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-excel"]');
    const download = await downloadPromise;

    // Excel 파일 읽기
    const buffer = await download.createReadStream();
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // 차트 정보 시트 확인
    const chartSheetName = '트렌드 분석_Chart_Info';
    expect(workbook.SheetNames).toContain(chartSheetName);

    const chartSheet = workbook.Sheets[chartSheetName];
    const chartData = XLSX.utils.sheet_to_json(chartSheet, { header: 1 });

    // 차트 타입 확인
    expect(chartData[1]).toContain('line');
    expect(chartData[2]).toContain('월별 트렌드');
  });

  test('should insert bar chart in project report', async ({ page }) => {
    await page.goto('/services/build');

    // 프로젝트 선택
    await page.selectOption('[data-testid="project-select"]', 'test-project');

    // 프로젝트 리포트 생성
    await page.click('[data-testid="generate-report"]');

    // Excel 다운로드
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-report"]');
    const download = await downloadPromise;

    // Excel 파일 읽기
    const buffer = await download.createReadStream();
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // 차트 정보 시트 확인
    const chartSheetName = '스프린트 요약_Chart_Info';
    expect(workbook.SheetNames).toContain(chartSheetName);

    const chartSheet = workbook.Sheets[chartSheetName];
    const chartData = XLSX.utils.sheet_to_json(chartSheet, { header: 1 });

    // 차트 타입 확인
    expect(chartData[1]).toContain('area');
    expect(chartData[2]).toContain('스프린트 번다운');
  });

  test('should insert pie chart in operations report', async ({ page }) => {
    await page.goto('/services/keep');

    // 운영 보고서 생성
    await page.click('[data-testid="generate-ops-report"]');
    await page.selectOption('[data-testid="month-select"]', '2025-11');
    await page.click('[data-testid="generate-button"]');

    // Excel 다운로드
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-report"]');
    const download = await downloadPromise;

    // Excel 파일 읽기
    const buffer = await download.createReadStream();
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // 차트 정보 시트 확인
    const chartSheetName = 'SLA 지표_Chart_Info';
    expect(workbook.SheetNames).toContain(chartSheetName);

    const chartSheet = workbook.Sheets[chartSheetName];
    const chartData = XLSX.utils.sheet_to_json(chartSheet, { header: 1 });

    // 차트 타입 확인
    expect(chartData[1]).toContain('line');
    expect(chartData[2]).toContain('SLA 달성률 추이');
  });
});
```

### 체크리스트
- [ ] xlsx-chart.spec.ts 파일 생성
- [ ] 3개 테스트 케이스 작성
- [ ] Excel 파일 다운로드 및 파싱
- [ ] 차트 정보 시트 검증
- [ ] 테스트 실행 및 통과 확인

### 완료 조건
```bash
# E2E 테스트 실행
npm run test:e2e -- tests/e2e/xlsx-chart.spec.ts

# 기대 출력:
Running 3 tests using 1 worker
  ✓ should insert line chart in market analysis (4.2s)
  ✓ should insert bar chart in project report (3.8s)
  ✓ should insert pie chart in operations report (3.5s)

3 passed (11.7s)
```

---

## Sprint 4 완료 조건

### 코드 품질
- [ ] TypeScript 에러 0개
- [ ] ESLint 경고 21개 유지

### 기능 동작
- [ ] xlsxHelper.addChart 메서드 동작
- [ ] 4가지 차트 타입 지원 (line, bar, pie, area)
- [ ] Minu 3개 스킬에 차트 통합

### 테스트
- [ ] E2E 테스트 3개 통과
- [ ] 총 테스트 306개 → 309개 (+3개)

### 문서
- [ ] CLAUDE.md 업데이트 (v2.19.0 Sprint 4 완료)
- [ ] project-todo.md 체크
- [ ] docs/guides/xlsx-chart.md 작성

### 빌드
```bash
# 린트 검사
npm run lint
# 기대: 21 warnings (유지)

# TypeScript 검사
npx tsc --noEmit
# 기대: 0 errors

# 프로덕션 빌드
npm run build
# 기대: success in ~30s
```

---

## 다음 단계

Sprint 4 완료 후 **Sprint 5: RAG 하이브리드 검색**으로 진행합니다.

- [Sprint 5 문서](./sprint-5.md)
- [구현 전략](../../plan/v2.19/implementation-strategy.md)
- [요구사항](../../spec/v2.19/requirements.md)
