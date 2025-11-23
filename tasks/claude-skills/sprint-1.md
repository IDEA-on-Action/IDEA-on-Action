# Sprint 1: xlsx Skill 통합

> Excel 내보내기 기본 기능 구현

**시작일**: 2025-11-23
**완료일**: 2025-11-23
**예상 소요**: 8시간 (1일)
**실제 소요**: 3시간
**관련 명세**: [spec/claude-skills/requirements.md](../../spec/claude-skills/requirements.md)
**관련 설계**: [plan/claude-skills/architecture.md](../../plan/claude-skills/architecture.md)
**선행 조건**: Central Hub Phase 2 완료 ✅

---

## 목표

1. xlsx 패키지 설치 및 TypeScript 타입 정의 ✅
2. useXlsxExport 훅 구현 ✅
3. ExportButton 컴포넌트 구현 ✅
4. 이벤트/이슈/KPI 시트 생성 기능 ✅
5. E2E 테스트 작성 ✅

---

## 작업 목록

### TASK-CS-001: xlsx 패키지 설치 및 설정 ✅

**예상 시간**: 30분
**상태**: ✅ 완료

**작업 내용**:

```bash
# 패키지 설치
npm install xlsx
```

```typescript
// vite.config.ts - 번들 최적화 추가
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'xlsx-skill': ['xlsx'],
        },
      },
    },
  },
});
```

**완료 조건**:
- [ ] xlsx 패키지 설치 완료
- [ ] 빌드 성공 확인
- [ ] 번들 크기 증가량 확인 (예상: ~100KB gzip)

---

### TASK-CS-002: TypeScript 타입 정의

**예상 시간**: 1시간
**상태**: ⏳ 대기
**의존성**: TASK-CS-001

**작업 내용**:

```typescript
// src/types/skills.types.ts

export type SkillType = 'xlsx' | 'docx' | 'pptx' | 'pdf';

export interface SkillsConfig {
  supabaseClient: SupabaseClient;
  userId: string;
  serviceId?: ServiceId;
  onError?: (error: SkillError) => void;
  onProgress?: (progress: number) => void;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface SheetConfig {
  name: string;
  data: Record<string, unknown>[];
  columns?: ColumnConfig[];
}

export interface ColumnConfig {
  key: string;
  header: string;
  width?: number;
  format?: 'text' | 'number' | 'date' | 'currency';
}

export interface UseXlsxExportOptions {
  filename?: string;
  dateRange?: DateRange;
  sheets?: SheetConfig[];
  includeCharts?: boolean;
}

export interface UseXlsxExportResult {
  exportToExcel: (options?: UseXlsxExportOptions) => Promise<void>;
  isExporting: boolean;
  progress: number;
  error: SkillError | null;
}

export interface SkillError {
  code: string;
  message: string;
  details?: unknown;
}

// 시트별 데이터 타입
export interface EventSheetRow {
  id: string;
  service: string;
  eventType: string;
  projectId: string | null;
  userId: string | null;
  createdAt: string;
  payload: string;
}

export interface IssueSheetRow {
  id: string;
  service: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  assigneeId: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface KPISheetRow {
  metric: string;
  value: number | string;
  change: string;
  period: string;
}
```

**완료 조건**:
- [ ] skills.types.ts 파일 생성
- [ ] TypeScript 컴파일 에러 없음
- [ ] 기존 central-hub.types.ts와 호환 확인

---

### TASK-CS-003: useXlsxExport 훅 구현

**예상 시간**: 2시간
**상태**: ⏳ 대기
**의존성**: TASK-CS-002

**작업 내용**:

```typescript
// src/skills/xlsx/useXlsxExport.ts

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useSupabase } from '@/hooks/useSupabase';
import type {
  UseXlsxExportOptions,
  UseXlsxExportResult,
  SheetConfig,
  SkillError
} from '@/types/skills.types';

export function useXlsxExport(): UseXlsxExportResult {
  const { supabase, user } = useSupabase();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<SkillError | null>(null);

  const exportToExcel = useCallback(async (options?: UseXlsxExportOptions) => {
    if (!user) {
      setError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' });
      return;
    }

    setIsExporting(true);
    setProgress(0);
    setError(null);

    try {
      // 1. 데이터 로딩 (30%)
      setProgress(10);
      const sheets = options?.sheets || await fetchDefaultSheets(supabase, options?.dateRange);
      setProgress(30);

      // 2. 워크북 생성 (60%)
      const workbook = XLSX.utils.book_new();

      for (let i = 0; i < sheets.length; i++) {
        const sheet = sheets[i];
        const worksheet = XLSX.utils.json_to_sheet(sheet.data);

        // 컬럼 너비 설정
        if (sheet.columns) {
          worksheet['!cols'] = sheet.columns.map(col => ({ wch: col.width || 15 }));
        }

        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
        setProgress(30 + Math.floor((i + 1) / sheets.length * 30));
      }
      setProgress(60);

      // 3. 파일 생성 (80%)
      const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      setProgress(80);

      // 4. 다운로드 (100%)
      const filename = options?.filename || generateFilename();
      downloadBlob(blob, filename);
      setProgress(100);

    } catch (err) {
      setError({
        code: 'EXPORT_FAILED',
        message: 'Excel 내보내기에 실패했습니다.',
        details: err,
      });
    } finally {
      setIsExporting(false);
    }
  }, [supabase, user]);

  return { exportToExcel, isExporting, progress, error };
}

// 기본 시트 데이터 로딩
async function fetchDefaultSheets(
  supabase: SupabaseClient,
  dateRange?: DateRange
): Promise<SheetConfig[]> {
  const [eventsResult, issuesResult, healthResult] = await Promise.all([
    fetchEvents(supabase, dateRange),
    fetchIssues(supabase, dateRange),
    fetchHealth(supabase),
  ]);

  return [
    { name: '이벤트 로그', data: eventsResult, columns: eventColumns },
    { name: '이슈 현황', data: issuesResult, columns: issueColumns },
    { name: '서비스 헬스', data: healthResult, columns: healthColumns },
    { name: 'KPI 요약', data: calculateKPI(eventsResult, issuesResult), columns: kpiColumns },
  ];
}

// 파일명 생성
function generateFilename(): string {
  const date = new Date().toISOString().split('T')[0];
  return `central-hub-report-${date}.xlsx`;
}

// Blob 다운로드
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
- [ ] useXlsxExport 훅 구현 완료
- [ ] 로딩 상태 및 진행률 표시 정상 작동
- [ ] 에러 핸들링 정상 작동
- [ ] 메모리 정리 (URL.revokeObjectURL) 확인

---

### TASK-CS-004: ExportButton 컴포넌트 구현

**예상 시간**: 1시간
**상태**: ⏳ 대기
**의존성**: TASK-CS-003

**작업 내용**:

```typescript
// src/components/skills/ExportButton.tsx

import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useXlsxExport } from '@/skills/xlsx/useXlsxExport';
import type { UseXlsxExportOptions } from '@/types/skills.types';

interface ExportButtonProps {
  options?: UseXlsxExportOptions;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  children?: React.ReactNode;
}

export function ExportButton({
  options,
  variant = 'outline',
  size = 'default',
  children,
}: ExportButtonProps) {
  const { exportToExcel, isExporting, progress, error } = useXlsxExport();

  const handleClick = async () => {
    await exportToExcel(options);
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isExporting}
      >
        {isExporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {progress}% 내보내는 중...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            {children || 'Excel 내보내기'}
          </>
        )}
      </Button>

      {error && (
        <span className="text-sm text-destructive">
          {error.message}
        </span>
      )}
    </div>
  );
}
```

**완료 조건**:
- [ ] ExportButton 컴포넌트 구현 완료
- [ ] 로딩 중 진행률 표시
- [ ] 에러 메시지 표시
- [ ] 비활성화 상태 정상 작동

---

### TASK-CS-005: 이벤트 시트 생성 함수

**예상 시간**: 1시간
**상태**: ⏳ 대기
**의존성**: TASK-CS-003

**작업 내용**:

```typescript
// src/skills/xlsx/generators/eventsSheet.ts

import type { ServiceEvent } from '@/types/central-hub.types';
import type { EventSheetRow, DateRange, ColumnConfig } from '@/types/skills.types';
import { SERVICE_INFO } from '@/types/central-hub.types';

export const eventColumns: ColumnConfig[] = [
  { key: 'id', header: 'ID', width: 36 },
  { key: 'service', header: '서비스', width: 15 },
  { key: 'eventType', header: '이벤트 유형', width: 20 },
  { key: 'projectId', header: '프로젝트 ID', width: 36 },
  { key: 'userId', header: '사용자 ID', width: 36 },
  { key: 'createdAt', header: '생성일시', width: 20 },
  { key: 'payload', header: '페이로드', width: 50 },
];

export async function fetchEvents(
  supabase: SupabaseClient,
  dateRange?: DateRange
): Promise<EventSheetRow[]> {
  let query = supabase
    .from('service_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.from.toISOString())
      .lte('created_at', dateRange.to.toISOString());
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data as ServiceEvent[]).map(event => ({
    id: event.id,
    service: SERVICE_INFO[event.service_id]?.name || event.service_id,
    eventType: event.event_type,
    projectId: event.project_id,
    userId: event.user_id,
    createdAt: new Date(event.created_at).toLocaleString('ko-KR'),
    payload: JSON.stringify(event.payload),
  }));
}
```

**완료 조건**:
- [ ] 이벤트 데이터 조회 정상 작동
- [ ] 날짜 필터 정상 적용
- [ ] 서비스명 한글 변환 확인
- [ ] 1,000건 제한 확인

---

### TASK-CS-006: 이슈 시트 생성 함수

**예상 시간**: 1시간
**상태**: ⏳ 대기
**의존성**: TASK-CS-003

**작업 내용**:

```typescript
// src/skills/xlsx/generators/issuesSheet.ts

import type { ServiceIssue } from '@/types/central-hub.types';
import type { IssueSheetRow, DateRange, ColumnConfig } from '@/types/skills.types';
import { SERVICE_INFO, SEVERITY_LABELS, STATUS_LABELS } from '@/types/central-hub.types';

export const issueColumns: ColumnConfig[] = [
  { key: 'id', header: 'ID', width: 36 },
  { key: 'service', header: '서비스', width: 15 },
  { key: 'severity', header: '심각도', width: 10 },
  { key: 'title', header: '제목', width: 40 },
  { key: 'description', header: '설명', width: 60 },
  { key: 'status', header: '상태', width: 12 },
  { key: 'assigneeId', header: '담당자', width: 36 },
  { key: 'resolvedAt', header: '해결일시', width: 20 },
  { key: 'createdAt', header: '생성일시', width: 20 },
];

export async function fetchIssues(
  supabase: SupabaseClient,
  dateRange?: DateRange
): Promise<IssueSheetRow[]> {
  let query = supabase
    .from('service_issues')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.from.toISOString())
      .lte('created_at', dateRange.to.toISOString());
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data as ServiceIssue[]).map(issue => ({
    id: issue.id,
    service: SERVICE_INFO[issue.service_id]?.name || issue.service_id,
    severity: SEVERITY_LABELS[issue.severity] || issue.severity,
    title: issue.title,
    description: issue.description || '',
    status: STATUS_LABELS[issue.status] || issue.status,
    assigneeId: issue.assignee_id,
    resolvedAt: issue.resolved_at
      ? new Date(issue.resolved_at).toLocaleString('ko-KR')
      : '',
    createdAt: new Date(issue.created_at).toLocaleString('ko-KR'),
  }));
}
```

**완료 조건**:
- [ ] 이슈 데이터 조회 정상 작동
- [ ] 심각도/상태 한글 라벨 변환
- [ ] 날짜 형식 한국어 로케일 적용

---

### TASK-CS-007: KPI 요약 시트 생성 함수

**예상 시간**: 1시간
**상태**: ⏳ 대기
**의존성**: TASK-CS-005, TASK-CS-006

**작업 내용**:

```typescript
// src/skills/xlsx/generators/kpiSheet.ts

import type { EventSheetRow, IssueSheetRow, KPISheetRow, ColumnConfig } from '@/types/skills.types';

export const kpiColumns: ColumnConfig[] = [
  { key: 'metric', header: '지표', width: 30 },
  { key: 'value', header: '값', width: 15 },
  { key: 'change', header: '변화', width: 15 },
  { key: 'period', header: '기간', width: 20 },
];

export function calculateKPI(
  events: EventSheetRow[],
  issues: IssueSheetRow[]
): KPISheetRow[] {
  const today = new Date();
  const period = `${today.getFullYear()}년 ${today.getMonth() + 1}월`;

  // 이벤트 통계
  const totalEvents = events.length;
  const eventsByType = events.reduce((acc, e) => {
    acc[e.eventType] = (acc[e.eventType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 이슈 통계
  const totalIssues = issues.length;
  const openIssues = issues.filter(i => i.status !== '해결됨').length;
  const criticalIssues = issues.filter(i => i.severity === '치명적').length;
  const resolvedIssues = issues.filter(i => i.status === '해결됨').length;
  const resolutionRate = totalIssues > 0
    ? Math.round((resolvedIssues / totalIssues) * 100)
    : 0;

  return [
    { metric: '총 이벤트 수', value: totalEvents, change: '-', period },
    { metric: '총 이슈 수', value: totalIssues, change: '-', period },
    { metric: '미해결 이슈', value: openIssues, change: '-', period },
    { metric: '치명적 이슈', value: criticalIssues, change: '-', period },
    { metric: '이슈 해결률', value: `${resolutionRate}%`, change: '-', period },
    { metric: '', value: '', change: '', period: '' },
    { metric: '=== 이벤트 유형별 ===', value: '', change: '', period: '' },
    ...Object.entries(eventsByType).map(([type, count]) => ({
      metric: type,
      value: count,
      change: '-',
      period,
    })),
  ];
}
```

**완료 조건**:
- [ ] KPI 계산 로직 정상 작동
- [ ] 이벤트 유형별 집계 확인
- [ ] 이슈 해결률 계산 확인

---

### TASK-CS-008: E2E 테스트 작성

**예상 시간**: 1시간
**상태**: ⏳ 대기
**의존성**: TASK-CS-004 ~ TASK-CS-007

**작업 내용**:

```typescript
// tests/e2e/skills/xlsx-export.spec.ts

import { test, expect } from '@playwright/test';

test.describe('xlsx Skill - Excel 내보내기', () => {
  test.beforeEach(async ({ page }) => {
    // 관리자 로그인
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_ADMIN_EMAIL!);
    await page.fill('[name="password"]', process.env.TEST_ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
  });

  test('Excel 내보내기 버튼이 표시됨', async ({ page }) => {
    await page.goto('/admin/central-hub');
    await expect(page.getByRole('button', { name: /Excel 내보내기/i })).toBeVisible();
  });

  test('Excel 파일이 다운로드됨', async ({ page }) => {
    await page.goto('/admin/central-hub');

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Excel 내보내기")');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/central-hub-report-.*\.xlsx$/);
  });

  test('진행률이 표시됨', async ({ page }) => {
    await page.goto('/admin/central-hub');
    await page.click('button:has-text("Excel 내보내기")');

    // 진행률 표시 확인
    await expect(page.getByText(/%.*내보내는 중/)).toBeVisible();
  });

  test('비인증 사용자는 내보내기 불가', async ({ page }) => {
    // 로그아웃
    await page.goto('/logout');
    await page.goto('/admin/central-hub');

    // 리다이렉트 또는 에러 확인
    await expect(page).toHaveURL(/\/login/);
  });

  test('날짜 필터가 적용됨', async ({ page }) => {
    await page.goto('/admin/central-hub');

    // 날짜 필터 설정
    await page.fill('[name="dateFrom"]', '2025-11-01');
    await page.fill('[name="dateTo"]', '2025-11-23');

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Excel 내보내기")');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('xlsx');
  });
});
```

**완료 조건**:
- [ ] E2E 테스트 5개 작성
- [ ] 모든 테스트 통과
- [ ] CI/CD 파이프라인에 테스트 추가

---

## 검증 계획

### 단위 테스트
- [ ] useXlsxExport 훅 로직 테스트
- [ ] 데이터 변환 함수 테스트
- [ ] KPI 계산 함수 테스트

### 통합 테스트
- [ ] Supabase 연동 테스트
- [ ] 파일 생성 및 다운로드 테스트

### 성능 테스트
- [ ] 1,000행 데이터 3초 이내 생성 확인
- [ ] 메모리 사용량 모니터링

---

## 완료 조건

- [ ] xlsx 패키지 설치 및 빌드 성공
- [ ] useXlsxExport 훅 구현 완료
- [ ] ExportButton 컴포넌트 구현 완료
- [ ] 4개 시트 (이벤트, 이슈, 헬스, KPI) 생성 완료
- [ ] E2E 테스트 5개 통과
- [ ] 1,000행 데이터 3초 이내 생성
- [ ] 빌드 시간 증가 10초 이내

---

## 다음 Sprint

[Sprint 2: frontend-design Skill + 대시보드](sprint-2.md)

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-23 | 초기 작성 | Claude |
