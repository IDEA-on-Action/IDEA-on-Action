# CSV Export 날짜 범위 필터 UI 구현 계획

**작성일**: 2025-11-22
**버전**: v2.3.3
**작성자**: Claude (AI 개발자)
**상태**: 📋 구현 계획 (미구현)

---

## 📋 목차

1. [개요](#1-개요)
2. [기술 스택 선택](#2-기술-스택-선택)
3. [UI 디자인](#3-ui-디자인)
4. [상태 관리](#4-상태-관리)
5. [파일 수정 계획](#5-파일-수정-계획)
6. [테스트 계획](#6-테스트-계획)
7. [접근성](#7-접근성)
8. [성능 고려사항](#8-성능-고려사항)
9. [롤백 계획](#9-롤백-계획)
10. [다음 단계](#10-다음-단계)

---

## 1. 개요

### 1.1 필요성

AdminNewsletter 페이지의 CSV Export 기능은 현재 **검색**(이메일)과 **상태 필터**(pending/confirmed/unsubscribed)만 지원합니다. 관리자가 특정 기간의 구독자만 내보내고 싶을 때 수동으로 CSV를 필터링해야 하는 불편함이 있습니다.

**현재 문제점**:
- 최근 1주일/1개월 구독자만 내보낼 수 없음
- 특정 기간 (예: 2025-11-01 ~ 2025-11-15) 필터링 불가
- 데이터 분석 시 수동 작업 필요

**해결 방안**:
- 날짜 범위 필터 UI 추가 (시작일, 종료일)
- Preset 버튼 제공 (최근 1주일, 1개월, 3개월, 전체)
- 기존 필터(검색, 상태)와 조합 가능

### 1.2 사용자 시나리오

**시나리오 1: 최근 1주일 구독자 분석**
```
1. 관리자가 AdminNewsletter 페이지 접속
2. "날짜 범위 선택" 버튼 클릭
3. "최근 1주일" Preset 버튼 클릭
4. "적용" 버튼 클릭
5. CSV Export 버튼 클릭
→ 최근 7일간 구독한 사용자만 CSV로 다운로드
```

**시나리오 2: 특정 캠페인 기간 구독자 분석**
```
1. 날짜 범위 선택 Popover 열기
2. 시작일: 2025-11-01 선택
3. 종료일: 2025-11-15 선택
4. "적용" 버튼 클릭
5. 상태 필터: "Confirmed" 선택
6. CSV Export 버튼 클릭
→ 해당 기간의 확인 완료 구독자만 다운로드
```

**시나리오 3: 전체 구독자 내보내기 (기존 동작)**
```
1. 날짜 범위 선택하지 않음 (또는 "전체" Preset)
2. CSV Export 버튼 클릭
→ 모든 구독자 다운로드 (기존 동작 유지)
```

### 1.3 기존 필터와의 통합

**필터 조합 예시**:
- 검색 + 날짜: `test@` + 최근 1개월
- 상태 + 날짜: Confirmed + 2025-11-01 ~ 2025-11-15
- 검색 + 상태 + 날짜: `gmail.com` + Pending + 최근 1주일

**백엔드 지원 현황**:
- ✅ `useExportNewsletterCSV` 훅은 이미 `dateFrom`, `dateTo` 파라미터 지원 (Line 343-348)
- ✅ Supabase 쿼리에 `.gte('subscribed_at', dateFrom)`, `.lte('subscribed_at', dateTo)` 적용
- ✅ 추가 백엔드 작업 불필요

---

## 2. 기술 스택 선택

### 2.1 Option 1: React Day Picker (경량)

**패키지**: `react-day-picker` v8.10.1 (이미 설치됨 ✅)

**장점**:
- ✅ 경량 (~50 KB gzip)
- ✅ Tailwind CSS 스타일링 용이
- ✅ 접근성 우수 (ARIA 완전 지원)
- ✅ TypeScript 타입 완벽 지원
- ✅ 커스터마이징 유연함

**단점**:
- ⚠️ 날짜 범위 선택 시 두 개의 Calendar 컴포넌트 필요
- ⚠️ Preset 버튼은 직접 구현 필요

**설치**: 이미 설치됨 (`package.json` Line 96)

**사용 예시**:
```tsx
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

<DayPicker
  mode="single"
  selected={dateFrom}
  onSelect={setDateFrom}
  disabled={(date) => date > new Date()}
/>
```

### 2.2 Option 2: shadcn/ui Calendar + Popover (권장 ⭐)

**패키지**: shadcn/ui 내장 (이미 설치됨 ✅)

**장점**:
- ✅ 프로젝트 디자인 시스템과 완벽히 통합
- ✅ `Calendar.tsx`, `Popover.tsx` 이미 존재 (확인 완료)
- ✅ Radix UI 기반 (접근성 보장)
- ✅ Tailwind CSS 기본 스타일 제공
- ✅ TypeScript 타입 완벽 지원
- ✅ 추가 패키지 설치 불필요

**단점**:
- ⚠️ 날짜 범위 선택 커스텀 로직 필요 (두 개의 Calendar 컴포넌트 관리)
- ⚠️ Preset 버튼은 직접 구현 필요

**설치**: 이미 설치됨 (확인 완료)

**사용 예시**:
```tsx
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

<Popover>
  <PopoverTrigger asChild>
    <Button>날짜 선택</Button>
  </PopoverTrigger>
  <PopoverContent>
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
    />
  </PopoverContent>
</Popover>
```

### 2.3 Option 3: Material UI DateRangePicker (❌ 권장하지 않음)

**패키지**: `@mui/x-date-pickers-pro`

**장점**:
- ✅ 날짜 범위 선택 기본 지원
- ✅ 기능 완전함 (Preset, validation, i18n)

**단점**:
- ❌ 무거움 (~300 KB gzip)
- ❌ Pro 라이선스 필요 (상업용)
- ❌ 디자인 시스템 불일치 (Material Design vs shadcn/ui)
- ❌ 번들 크기 증가 (현재 338 kB → 600+ kB)

**설치**: 권장하지 않음

### 2.4 최종 권장 사항

**✅ Option 2: shadcn/ui Calendar + Popover**

**이유**:
1. 프로젝트 디자인 시스템과 100% 일치
2. 이미 설치된 컴포넌트 재사용 (번들 크기 증가 최소화)
3. Radix UI 기반으로 접근성 보장
4. 날짜 범위 선택 로직만 추가하면 됨 (복잡도 낮음)
5. `date-fns` 패키지 이미 설치됨 (v3.6.0, Line 85)

**구현 전략**:
- `DateRangePicker.tsx` 신규 컴포넌트 작성
- 기존 `Calendar.tsx`, `Popover.tsx` 재사용
- `date-fns`의 `subDays`, `subMonths` 함수로 Preset 구현

---

## 3. UI 디자인

### 3.1 레이아웃 (ASCII Art)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Newsletter Subscribers                                              │
│                                                                     │
│ ┌──────────────────┐  ┌────────────┐  ┌──────────────┐  ┌────────┐ │
│ │ [🔍] 이메일 검색  │  │ [▼] 상태   │  │ [📅] 날짜 범위 │  │ [CSV] │ │
│ └──────────────────┘  └────────────┘  └──────────────┘  └────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ 📅 날짜 범위 선택                      [x] 닫기                │  │
│ ├───────────────────────────────────────────────────────────────┤  │
│ │                                                               │  │
│ │  ┌──────────────────┐         ┌──────────────────┐           │  │
│ │  │  시작 날짜        │    ~    │   종료 날짜       │           │  │
│ │  │                  │         │                  │           │  │
│ │  │  [Calendar UI]   │         │  [Calendar UI]   │           │  │
│ │  │                  │         │                  │           │  │
│ │  │  2025-11-15      │         │  2025-11-22      │           │  │
│ │  └──────────────────┘         └──────────────────┘           │  │
│ │                                                               │  │
│ │  빠른 선택:                                                     │  │
│ │  [최근 1주일] [최근 1개월] [최근 3개월] [전체]                   │  │
│ │                                                               │  │
│ │                                [초기화]  [적용]                │  │
│ └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 컴포넌트 구조

```tsx
// DateRangePicker.tsx (신규 컴포넌트)
interface DateRangePickerProps {
  value: { from: Date | null; to: Date | null };
  onChange: (range: { from: Date | null; to: Date | null }) => void;
  disabled?: boolean;
}

export function DateRangePicker({ value, onChange, disabled }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState(value);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRangeDisplay(value)}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
          {/* 두 개의 Calendar 컴포넌트 */}
          <div className="flex gap-2">
            <div>
              <p className="text-sm font-medium mb-2">시작 날짜</p>
              <Calendar
                mode="single"
                selected={tempRange.from}
                onSelect={(date) => setTempRange({ ...tempRange, from: date })}
                disabled={(date) => date > new Date() || (tempRange.to && date > tempRange.to)}
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-2">종료 날짜</p>
              <Calendar
                mode="single"
                selected={tempRange.to}
                onSelect={(date) => setTempRange({ ...tempRange, to: date })}
                disabled={(date) => date > new Date() || (tempRange.from && date < tempRange.from)}
              />
            </div>
          </div>

          {/* Preset 버튼 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">빠른 선택</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setPreset('week')}>
                최근 1주일
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPreset('month')}>
                최근 1개월
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPreset('3months')}>
                최근 3개월
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPreset('all')}>
                전체
              </Button>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleReset}>
              초기화
            </Button>
            <Button onClick={handleApply}>
              적용
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### 3.3 디스플레이 형식

**버튼 텍스트** (날짜 범위 선택 전):
```
📅 날짜 범위 선택
```

**버튼 텍스트** (날짜 범위 선택 후):
```
📅 2025-11-15 ~ 2025-11-22
```

**버튼 텍스트** (Preset 사용 시):
```
📅 최근 1주일 (2025-11-15 ~ 2025-11-22)
```

**CSV 다운로드 Toast** (날짜 필터 적용 시):
```
✅ 12명의 구독자 데이터를 내보냈습니다 (2025-11-01 ~ 2025-11-15)
```

### 3.4 반응형 디자인

**Desktop (>= 768px)**:
```
┌────────────┬────────────┬────────────┬────────┐
│   검색     │    상태    │  날짜 범위  │  CSV   │
└────────────┴────────────┴────────────┴────────┘
```

**Mobile (< 768px)**:
```
┌──────────────────────────────────────┐
│             검색                     │
├──────────────────────────────────────┤
│      상태        │    날짜 범위       │
├──────────────────────────────────────┤
│             CSV Export               │
└──────────────────────────────────────┘
```

**Popover 크기 조정**:
- Desktop: 두 개의 Calendar 나란히 표시 (600px)
- Mobile: 두 개의 Calendar 세로로 배치 (300px)

---

## 4. 상태 관리

### 4.1 React State

**DateRangePicker 내부 상태**:
```tsx
// 임시 상태 (적용 전)
const [tempRange, setTempRange] = useState<{
  from: Date | null;
  to: Date | null;
}>({
  from: null,
  to: null
});

// Popover 열림 상태
const [isOpen, setIsOpen] = useState(false);

// Preset 라벨 (선택적)
const [presetLabel, setPresetLabel] = useState<string | null>(null);
```

**AdminNewsletter 페이지 상태**:
```tsx
// 적용된 날짜 범위
const [dateRange, setDateRange] = useState<{
  from: Date | null;
  to: Date | null;
}>({
  from: null,
  to: null
});
```

### 4.2 Preset 함수

```tsx
// date-fns 함수 사용
import { subDays, subMonths, startOfDay, endOfDay } from 'date-fns';

const setPreset = (preset: 'week' | 'month' | '3months' | 'all') => {
  const now = new Date();
  const presets = {
    week: {
      from: startOfDay(subDays(now, 7)),
      to: endOfDay(now),
      label: '최근 1주일'
    },
    month: {
      from: startOfDay(subMonths(now, 1)),
      to: endOfDay(now),
      label: '최근 1개월'
    },
    '3months': {
      from: startOfDay(subMonths(now, 3)),
      to: endOfDay(now),
      label: '최근 3개월'
    },
    all: {
      from: null,
      to: null,
      label: null
    }
  };

  const selected = presets[preset];
  setTempRange({ from: selected.from, to: selected.to });
  setPresetLabel(selected.label);
};
```

### 4.3 Validation

**날짜 범위 검증 규칙**:
1. ✅ 시작일은 종료일보다 과거여야 함
2. ✅ 미래 날짜 선택 불가 (구독일은 과거만 존재)
3. ✅ 시작일만 선택 시 종료일은 오늘로 자동 설정
4. ✅ 종료일만 선택 시 시작일은 null (전체 ~ 종료일)

```tsx
// Validation 함수
const validateDateRange = (range: { from: Date | null; to: Date | null }): boolean => {
  if (!range.from && !range.to) return true; // 전체 선택 허용
  if (range.from && range.to && range.from > range.to) return false; // 시작일 > 종료일
  if (range.from && range.from > new Date()) return false; // 미래 날짜
  if (range.to && range.to > new Date()) return false; // 미래 날짜
  return true;
};
```

### 4.4 CSV Export 통합

```tsx
const { mutate: exportCSV, isPending } = useExportNewsletterCSV();

const handleExport = () => {
  exportCSV({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    dateFrom: dateRange.from ? dateRange.from.toISOString() : undefined,
    dateTo: dateRange.to ? dateRange.to.toISOString() : undefined
  });
};
```

### 4.5 상태 초기화

**초기화 시나리오**:
1. "초기화" 버튼 클릭 → 날짜 범위 null로 설정
2. "전체" Preset 클릭 → 날짜 범위 null로 설정
3. Popover 닫을 때 적용 안 한 경우 → tempRange 버림

```tsx
const handleReset = () => {
  setTempRange({ from: null, to: null });
  setPresetLabel(null);
};

const handleCancel = () => {
  setTempRange(value); // 이전 값으로 복원
  setIsOpen(false);
};
```

---

## 5. 파일 수정 계획

### 5.1 파일 1: DateRangePicker.tsx (신규, 250줄)

**위치**: `src/components/ui/date-range-picker.tsx`

**내용**:
```tsx
/**
 * DateRangePicker
 *
 * 날짜 범위 선택 컴포넌트
 * - 시작일/종료일 선택 (두 개의 Calendar)
 * - Preset 버튼 (최근 1주일, 1개월, 3개월, 전체)
 * - 적용/초기화 버튼
 *
 * @example
 * ```tsx
 * <DateRangePicker
 *   value={{ from: new Date('2025-11-15'), to: new Date('2025-11-22') }}
 *   onChange={(range) => setDateRange(range)}
 * />
 * ```
 */

import { useState } from 'react';
import { subDays, subMonths, startOfDay, endOfDay, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// TypeScript 타입
interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  disabled?: boolean;
}

export function DateRangePicker({ value, onChange, disabled }: DateRangePickerProps) {
  // ... 구현 코드 (250줄)
}

// 헬퍼 함수들
function formatDateRangeDisplay(range: DateRange): string { ... }
function validateDateRange(range: DateRange): boolean { ... }
```

**기능**:
- ✅ 두 개의 Calendar 컴포넌트 (시작일, 종료일)
- ✅ Preset 버튼 4개 (1주일, 1개월, 3개월, 전체)
- ✅ 적용/초기화 버튼
- ✅ 날짜 validation (시작일 <= 종료일, 미래 날짜 불가)
- ✅ 반응형 디자인 (Desktop: 나란히, Mobile: 세로)
- ✅ 접근성 (aria-label, 키보드 네비게이션)

### 5.2 파일 2: AdminNewsletter.tsx (수정, +60줄)

**위치**: `src/pages/admin/AdminNewsletter.tsx`

**수정 내용**:

**1) Import 추가** (Line 24):
```tsx
import { DateRangePicker } from '@/components/ui/date-range-picker';
```

**2) State 추가** (Line 110):
```tsx
const [dateRange, setDateRange] = useState<{
  from: Date | null;
  to: Date | null;
}>({
  from: null,
  to: null
});
```

**3) 필터 섹션 수정** (Line 300-333, +30줄):
```tsx
<div className="flex flex-col sm:flex-row gap-4 mb-6">
  {/* 기존 검색 Input */}
  <div className="relative flex-1">...</div>

  {/* 기존 상태 Select */}
  <Select>...</Select>

  {/* 신규: 날짜 범위 Picker */}
  <DateRangePicker
    value={dateRange}
    onChange={(range) => {
      setDateRange(range);
      setCurrentPage(1); // 페이지 초기화
    }}
  />
</div>
```

**4) CSV Export 버튼 수정** (Line 197):
```tsx
<Button
  variant="outline"
  onClick={() => exportCSV.mutateAsync({
    status: statusFilter,
    search: search || undefined,
    dateFrom: dateRange.from ? dateRange.from.toISOString() : undefined,
    dateTo: dateRange.to ? dateRange.to.toISOString() : undefined
  })}
  disabled={exportCSV.isPending || subscribers.length === 0}
>
  ...
</Button>
```

**5) useNewsletterSubscribers 훅 수정** (Line 118-126, +2줄):
```tsx
const { data: subscribersResponse, isLoading: subscribersLoading } =
  useNewsletterSubscribers({
    status: statusFilter,
    search: search || undefined,
    dateFrom: dateRange.from ? dateRange.from.toISOString() : undefined,
    dateTo: dateRange.to ? dateRange.to.toISOString() : undefined,
    limit: itemsPerPage,
    offset: (currentPage - 1) * itemsPerPage,
    orderBy: 'subscribed_at',
    orderDirection: 'desc',
  });
```

**변경 통계**:
- 추가: +60줄
- 삭제: 0줄
- 수정: 3개 섹션 (필터, CSV 버튼, 훅)

### 5.3 파일 3: useNewsletterAdmin.ts (확인, 0줄)

**위치**: `src/hooks/useNewsletterAdmin.ts`

**현재 상태**: ✅ 이미 dateFrom, dateTo 지원 (Line 56-61, 343-348)

**코드 확인**:
```tsx
// useNewsletterSubscribers 훅 (Line 56-61)
if (filters?.dateFrom) {
  query = query.gte('subscribed_at', filters.dateFrom);
}
if (filters?.dateTo) {
  query = query.lte('subscribed_at', filters.dateTo);
}

// useExportNewsletterCSV 훅 (Line 343-348)
if (filters?.dateFrom) {
  query = query.gte('subscribed_at', filters.dateFrom);
}
if (filters?.dateTo) {
  query = query.lte('subscribed_at', filters.dateTo);
}
```

**결론**: ✅ 코드 수정 불필요 (이미 완벽히 지원)

### 5.4 파일 4: package.json (확인, 0줄)

**위치**: `package.json`

**현재 상태**: ✅ 모든 필수 패키지 이미 설치됨

**확인 항목**:
- ✅ `react-day-picker`: v8.10.1 (Line 96)
- ✅ `date-fns`: v3.6.0 (Line 85)
- ✅ shadcn/ui Calendar, Popover 컴포넌트 존재

**결론**: ✅ 패키지 설치 불필요

### 5.5 파일 5: types/newsletter.types.ts (확인, 0줄)

**위치**: `src/types/newsletter.types.ts`

**확인 항목**: `NewsletterFilters` 인터페이스에 `dateFrom`, `dateTo` 타입 정의 확인 필요

**예상 코드**:
```tsx
export interface NewsletterFilters {
  status?: NewsletterStatus | 'all';
  search?: string;
  dateFrom?: string; // ISO 8601 형식
  dateTo?: string;   // ISO 8601 형식
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}
```

**결론**: ✅ 타입 정의 확인만 필요 (수정 불필요)

---

## 6. 테스트 계획

### 6.1 Unit 테스트 (5개)

**파일**: `src/components/ui/__tests__/date-range-picker.test.tsx`

**테스트 케이스**:

```tsx
describe('DateRangePicker', () => {
  test('렌더링: 버튼 텍스트 "날짜 범위 선택"', () => {
    render(<DateRangePicker value={{ from: null, to: null }} onChange={vi.fn()} />);
    expect(screen.getByText(/날짜 범위 선택/)).toBeInTheDocument();
  });

  test('Preset 버튼 클릭: "최근 1주일" → 7일 전 ~ 오늘', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ from: null, to: null }} onChange={onChange} />);

    fireEvent.click(screen.getByText(/날짜 범위 선택/));
    fireEvent.click(screen.getByText(/최근 1주일/));
    fireEvent.click(screen.getByText(/적용/));

    expect(onChange).toHaveBeenCalledWith({
      from: expect.any(Date), // 7일 전
      to: expect.any(Date)    // 오늘
    });
  });

  test('Validation: 시작일 > 종료일 → 에러 표시', () => {
    render(<DateRangePicker value={{ from: new Date('2025-11-22'), to: new Date('2025-11-15') }} onChange={vi.fn()} />);
    expect(screen.getByText(/시작일은 종료일보다 과거여야/)).toBeInTheDocument();
  });

  test('초기화 버튼: 날짜 범위 null로 설정', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ from: new Date(), to: new Date() }} onChange={onChange} />);

    fireEvent.click(screen.getByText(/날짜 범위/));
    fireEvent.click(screen.getByText(/초기화/));
    fireEvent.click(screen.getByText(/적용/));

    expect(onChange).toHaveBeenCalledWith({ from: null, to: null });
  });

  test('Disabled 상태: 버튼 클릭 불가', () => {
    render(<DateRangePicker value={{ from: null, to: null }} onChange={vi.fn()} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### 6.2 E2E 테스트 (3개 추가)

**파일**: `tests/e2e/admin-newsletter.spec.ts`

**테스트 케이스**:

```typescript
test.describe('AdminNewsletter - CSV Export 날짜 필터', () => {
  test('날짜 범위 선택 후 CSV Export', async ({ page }) => {
    // Given: 관리자 로그인
    await loginAsAdmin(page);
    await page.goto('/admin/newsletter');

    // When: 날짜 범위 선택 (2025-11-15 ~ 2025-11-22)
    await page.getByRole('button', { name: /날짜 범위 선택/ }).click();
    await page.getByLabel('시작 날짜').fill('2025-11-15');
    await page.getByLabel('종료 날짜').fill('2025-11-22');
    await page.getByRole('button', { name: /적용/ }).click();

    // Then: CSV Export 버튼 활성화 확인
    const exportButton = page.getByRole('button', { name: /CSV 내보내기/ });
    await expect(exportButton).toBeEnabled();

    // When: CSV Export 클릭
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    const download = await downloadPromise;

    // Then: 파일명 확인
    expect(download.suggestedFilename()).toMatch(/newsletter-subscribers-\d{4}-\d{2}-\d{2}\.csv/);

    // Then: Toast 알림 확인
    await expect(page.getByText(/명의 구독자 데이터를 내보냈습니다/)).toBeVisible();
  });

  test('Preset 버튼 사용 후 CSV Export', async ({ page }) => {
    // Given: 관리자 로그인
    await loginAsAdmin(page);
    await page.goto('/admin/newsletter');

    // When: "최근 1주일" Preset 클릭
    await page.getByRole('button', { name: /날짜 범위 선택/ }).click();
    await page.getByRole('button', { name: /최근 1주일/ }).click();
    await page.getByRole('button', { name: /적용/ }).click();

    // Then: 버튼 텍스트 변경 확인
    await expect(page.getByRole('button', { name: /최근 1주일/ })).toBeVisible();

    // When: CSV Export
    await page.getByRole('button', { name: /CSV 내보내기/ }).click();

    // Then: 성공 Toast 확인
    await expect(page.getByText(/명의 구독자 데이터를 내보냈습니다/)).toBeVisible();
  });

  test('날짜 필터 + 상태 필터 조합', async ({ page }) => {
    // Given: 관리자 로그인
    await loginAsAdmin(page);
    await page.goto('/admin/newsletter');

    // When: 상태 필터 "Confirmed" 선택
    await page.getByRole('combobox', { name: /상태/ }).selectOption('confirmed');

    // When: 날짜 범위 "최근 1개월" 선택
    await page.getByRole('button', { name: /날짜 범위 선택/ }).click();
    await page.getByRole('button', { name: /최근 1개월/ }).click();
    await page.getByRole('button', { name: /적용/ }).click();

    // Then: 필터 적용 확인 (구독자 목록 갱신)
    await page.waitForLoadState('networkidle');

    // When: CSV Export
    await page.getByRole('button', { name: /CSV 내보내기/ }).click();

    // Then: Toast 확인
    await expect(page.getByText(/구독자 데이터를 내보냈습니다/)).toBeVisible();
  });
});
```

### 6.3 수동 테스트 시나리오

**시나리오 1: 최근 1주일 구독자 Export**
```
1. AdminNewsletter 페이지 접속
2. "날짜 범위 선택" 버튼 클릭
3. "최근 1주일" Preset 버튼 클릭
4. "적용" 버튼 클릭
5. CSV Export 버튼 클릭
6. ✅ 파일명: newsletter-subscribers-2025-11-22.csv
7. ✅ CSV 내용: 최근 7일간 구독자만 포함
8. ✅ Toast: "X명의 구독자 데이터를 내보냈습니다 (2025-11-15 ~ 2025-11-22)"
```

**시나리오 2: 특정 기간 구독자 Export**
```
1. "날짜 범위 선택" Popover 열기
2. 시작일 Calendar에서 2025-11-01 클릭
3. 종료일 Calendar에서 2025-11-15 클릭
4. "적용" 버튼 클릭
5. ✅ 버튼 텍스트: "📅 2025-11-01 ~ 2025-11-15"
6. CSV Export 버튼 클릭
7. ✅ CSV 내용: 해당 기간 구독자만 포함
```

**시나리오 3: 날짜 + 상태 필터 조합**
```
1. 상태 필터: "Confirmed" 선택
2. 날짜 범위: "최근 1개월" Preset 선택
3. CSV Export 클릭
4. ✅ CSV 내용: 최근 1개월의 Confirmed 구독자만
```

**시나리오 4: 날짜 필터 초기화**
```
1. 날짜 범위 선택 (예: 최근 1주일)
2. "날짜 범위 선택" 버튼 재클릭
3. "초기화" 버튼 클릭
4. ✅ 버튼 텍스트: "📅 날짜 범위 선택"
5. CSV Export 클릭
6. ✅ CSV 내용: 전체 구독자 (날짜 필터 없음)
```

---

## 7. 접근성

### 7.1 ARIA 속성

**DateRangePicker 버튼**:
```tsx
<Button
  aria-label="날짜 범위 선택"
  aria-expanded={isOpen}
  aria-haspopup="dialog"
>
  날짜 범위 선택
</Button>
```

**Calendar 컴포넌트**:
```tsx
<Calendar
  aria-label="시작 날짜 선택"
  aria-describedby="date-range-description"
/>

<p id="date-range-description" className="sr-only">
  시작 날짜를 선택하세요. 종료 날짜보다 과거여야 합니다.
</p>
```

**Popover**:
```tsx
<PopoverContent
  role="dialog"
  aria-labelledby="date-range-title"
  aria-modal="true"
>
  <h3 id="date-range-title" className="sr-only">날짜 범위 선택</h3>
  ...
</PopoverContent>
```

### 7.2 키보드 네비게이션

**지원 단축키**:
- `Enter` / `Space`: Popover 열기
- `Escape`: Popover 닫기
- `Tab`: 포커스 이동 (시작일 → 종료일 → Preset 버튼 → 적용 → 초기화)
- `Arrow keys`: Calendar 내 날짜 선택

**Focus Trap**:
```tsx
// Popover 열릴 때 첫 번째 Calendar에 포커스
useEffect(() => {
  if (isOpen) {
    startDateCalendarRef.current?.focus();
  }
}, [isOpen]);
```

### 7.3 스크린 리더 지원

**날짜 선택 안내**:
```tsx
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {tempRange.from && tempRange.to
    ? `선택된 기간: ${format(tempRange.from, 'yyyy년 M월 d일')} ~ ${format(tempRange.to, 'yyyy년 M월 d일')}`
    : '날짜 범위를 선택하세요'}
</div>
```

**Preset 버튼 안내**:
```tsx
<Button
  aria-label="최근 1주일 구독자 (오늘부터 7일 전까지)"
  onClick={() => setPreset('week')}
>
  최근 1주일
</Button>
```

### 7.4 WCAG 2.1 AA 준수

**색상 대비**: ✅ 4.5:1 이상
- 버튼 텍스트: #000 on #FFF (21:1)
- Disabled 버튼: #A0A0A0 on #FFF (4.6:1)

**터치 타겟 크기**: ✅ 44px × 44px 이상
- Preset 버튼: `size="sm"` (40px) → `min-h-11` 클래스 추가 (44px)
- Calendar 날짜 셀: 기본 44px

**포커스 표시**: ✅ 명확한 outline
- `focus-visible:ring-2 focus-visible:ring-ring`
- Calendar: shadcn/ui 기본 포커스 스타일

---

## 8. 성능 고려사항

### 8.1 번들 크기 영향

**추가 패키지 크기**:
- `react-day-picker`: 이미 설치됨 (0 KB 추가)
- `date-fns`: 이미 설치됨 (0 KB 추가)
- `DateRangePicker.tsx`: ~5 KB gzip (컴포넌트 코드)

**Tree Shaking**:
```tsx
// date-fns 필요한 함수만 import (Tree Shaking 지원)
import { subDays, subMonths, startOfDay, endOfDay, format } from 'date-fns';
```

**번들 크기 예상**:
- Before: 338 kB gzip
- After: 343 kB gzip (+5 kB, **+1.5%**)
- ✅ 허용 범위 (목표: 400 kB 이하)

### 8.2 렌더링 최적화

**useMemo로 Preset 계산 캐싱**:
```tsx
const presetOptions = useMemo(() => ({
  week: {
    from: startOfDay(subDays(new Date(), 7)),
    to: endOfDay(new Date()),
    label: '최근 1주일'
  },
  month: {
    from: startOfDay(subMonths(new Date(), 1)),
    to: endOfDay(new Date()),
    label: '최근 1개월'
  },
  // ...
}), []);
```

**useCallback로 핸들러 메모이제이션**:
```tsx
const handleApply = useCallback(() => {
  if (validateDateRange(tempRange)) {
    onChange(tempRange);
    setIsOpen(false);
  }
}, [tempRange, onChange]);
```

**React.memo로 컴포넌트 최적화**:
```tsx
export const DateRangePicker = React.memo(({ value, onChange, disabled }: DateRangePickerProps) => {
  // ...
}, (prevProps, nextProps) => {
  return (
    prevProps.value.from === nextProps.value.from &&
    prevProps.value.to === nextProps.value.to &&
    prevProps.disabled === nextProps.disabled
  );
});
```

### 8.3 네트워크 요청 최적화

**디바운싱 (선택적)**:
```tsx
// 날짜 범위 변경 시 즉시 쿼리하지 않고 "적용" 버튼 클릭 시에만 쿼리
// (이미 "적용" 버튼 패턴이므로 디바운싱 불필요)
```

**React Query 캐싱**:
```tsx
// useNewsletterSubscribers 훅은 이미 staleTime: 30초 설정됨
// 동일한 필터 조합으로 재조회 시 캐시 활용
```

### 8.4 메모리 관리

**date-fns 인스턴스 재사용**:
```tsx
// ❌ 매번 새 Date 객체 생성
const now = new Date();
const preset = { from: subDays(new Date(), 7), to: new Date() };

// ✅ now 변수 재사용
const now = new Date();
const preset = { from: subDays(now, 7), to: now };
```

**Popover 닫힐 때 임시 상태 정리**:
```tsx
useEffect(() => {
  if (!isOpen) {
    // Popover 닫힐 때 메모리 정리 (필요시)
    setTempRange(value);
  }
}, [isOpen, value]);
```

---

## 9. 롤백 계획

### 9.1 롤백 시나리오

**시나리오 1: 날짜 필터 UI 완전 제거**
```bash
# 1. DateRangePicker 컴포넌트 삭제
rm src/components/ui/date-range-picker.tsx

# 2. AdminNewsletter.tsx 수정 롤백
git checkout HEAD -- src/pages/admin/AdminNewsletter.tsx

# 3. 빌드 & 배포
npm run build
vercel --prod
```

**시나리오 2: 백엔드 날짜 필터 비활성화 (UI 유지)**
```tsx
// useNewsletterAdmin.ts에서 dateFrom, dateTo 파라미터 무시
if (filters?.dateFrom) {
  // query = query.gte('subscribed_at', filters.dateFrom); // 주석 처리
}
if (filters?.dateTo) {
  // query = query.lte('subscribed_at', filters.dateTo); // 주석 처리
}
```

**시나리오 3: Feature Flag로 점진적 롤백**
```tsx
// AdminNewsletter.tsx
const ENABLE_DATE_FILTER = false; // Feature flag

{ENABLE_DATE_FILTER && (
  <DateRangePicker ... />
)}
```

### 9.2 데이터 영향

**데이터베이스**: ✅ 영향 없음 (UI 변경만)

**CSV 파일**: ✅ 기존 CSV Export 동작 유지 (날짜 필터 null일 때)

**사용자 데이터**: ✅ 영향 없음 (읽기 전용 기능)

### 9.3 롤백 체크리스트

- [ ] DateRangePicker 컴포넌트 파일 삭제
- [ ] AdminNewsletter.tsx Import 제거
- [ ] AdminNewsletter.tsx dateRange 상태 제거
- [ ] AdminNewsletter.tsx 필터 섹션 레이아웃 원복
- [ ] CSV Export 버튼 onClick 원복
- [ ] useNewsletterSubscribers 훅 호출 원복
- [ ] 빌드 검증 (TypeScript 0 errors)
- [ ] E2E 테스트 실행 (기존 테스트 통과 확인)
- [ ] 프로덕션 배포

### 9.4 모니터링

**배포 후 확인사항** (1시간 이내):
- [ ] Sentry 에러 로그 확인 (DateRangePicker 관련)
- [ ] CSV Export 성공률 확인 (Google Analytics Event)
- [ ] AdminNewsletter 페이지 로딩 시간 (Lighthouse)
- [ ] 사용자 피드백 확인 (Discord, Email)

**롤백 트리거**:
- ❌ CSV Export 실패율 > 5%
- ❌ 페이지 로딩 시간 > 3초
- ❌ Sentry 에러 > 10건/시간
- ❌ 사용자 불편 신고 > 3건

---

## 10. 다음 단계

### 10.1 Phase 1: 기본 구현 (2시간)

**작업 내용**:
1. ✅ shadcn/ui Calendar, Popover 설치 확인 (이미 설치됨)
2. ✅ DateRangePicker 컴포넌트 작성 (250줄)
   - 두 개의 Calendar 컴포넌트
   - 날짜 범위 validation
   - 적용/초기화 버튼
3. ✅ AdminNewsletter.tsx 통합
   - Import 추가
   - dateRange 상태 추가
   - 필터 섹션 레이아웃 수정

**검증**:
```bash
npm run build        # TypeScript 0 errors
npm run lint         # ESLint PASS
npm run dev          # 로컬 테스트
```

### 10.2 Phase 2: Preset 버튼 (1시간)

**작업 내용**:
1. ✅ 4개 Preset 함수 구현
   - `setPreset('week')`: 최근 1주일
   - `setPreset('month')`: 최근 1개월
   - `setPreset('3months')`: 최근 3개월
   - `setPreset('all')`: 전체 (null)
2. ✅ Preset 버튼 UI 추가
   - 4개 버튼 (size="sm", variant="outline")
   - 클릭 시 tempRange 업데이트
3. ✅ Preset 라벨 표시
   - 버튼 텍스트: "최근 1주일 (2025-11-15 ~ 2025-11-22)"

**검증**:
```bash
# 수동 테스트
1. "최근 1주일" 클릭 → 날짜 범위 확인
2. "적용" 클릭 → 구독자 목록 갱신 확인
3. CSV Export → 파일 내용 확인
```

### 10.3 Phase 3: CSV Export 통합 (30분)

**작업 내용**:
1. ✅ exportCSV mutation에 dateFrom, dateTo 전달
2. ✅ Toast 알림 메시지 수정
   - Before: "X명의 구독자 데이터를 내보냈습니다"
   - After: "X명의 구독자 데이터를 내보냈습니다 (2025-11-01 ~ 2025-11-15)"
3. ✅ CSV 파일명에 날짜 범위 포함 (선택적)
   - Before: `newsletter-subscribers-2025-11-22.csv`
   - After: `newsletter-subscribers-2025-11-01-to-2025-11-15.csv`

**검증**:
```bash
# CSV Export 테스트
1. 날짜 범위 선택 (최근 1주일)
2. CSV Export 클릭
3. 파일 열기 → 날짜 범위 확인
4. Toast 알림 확인
```

### 10.4 Phase 4: 테스트 (1시간)

**작업 내용**:
1. ✅ E2E 테스트 3개 추가
   - `tests/e2e/admin-newsletter.spec.ts`
   - 날짜 범위 선택 + CSV Export
   - Preset 버튼 + CSV Export
   - 날짜 + 상태 필터 조합
2. ✅ 수동 테스트 4개 시나리오
   - 최근 1주일, 특정 기간, 조합, 초기화
3. ✅ 접근성 검증
   - 키보드 네비게이션
   - 스크린 리더 (NVDA, JAWS)
   - WCAG 2.1 AA 색상 대비

**검증**:
```bash
npm run test:e2e     # E2E 테스트 실행
npm run lighthouse   # 접근성 점수 확인
```

### 10.5 Phase 5: 문서화 (30분)

**작업 내용**:
1. ✅ Admin Newsletter 가이드 업데이트
   - `docs/guides/newsletter/admin-newsletter-guide.md`
   - CSV Export 날짜 필터 섹션 추가
   - 스크린샷 3개 (날짜 범위 선택, Preset, CSV Export)
2. ✅ CSV Export 구현 요약 업데이트
   - `docs/guides/newsletter/csv-export-implementation-summary.md`
   - 날짜 필터 기능 설명 추가
   - 코드 예시 추가
3. ✅ CLAUDE.md 업데이트
   - "최신 업데이트" 섹션에 날짜 필터 추가
   - 버전: v2.3.3

**검증**:
```bash
# 문서 확인
- [ ] 스크린샷 3개 생성 완료
- [ ] Markdown 렌더링 확인
- [ ] 링크 정상 작동 확인
```

### 10.6 총 예상 시간

| Phase | 작업 내용 | 예상 시간 |
|-------|---------|----------|
| Phase 1 | 기본 구현 (DateRangePicker, 통합) | 2시간 |
| Phase 2 | Preset 버튼 (4개 함수 + UI) | 1시간 |
| Phase 3 | CSV Export 통합 (Toast, 파일명) | 30분 |
| Phase 4 | 테스트 (E2E 3개 + 수동 4개) | 1시간 |
| Phase 5 | 문서화 (3개 가이드 업데이트) | 30분 |
| **합계** | | **5시간** |

### 10.7 우선순위

**High Priority** (필수):
- ✅ Phase 1: 기본 구현 (2시간)
- ✅ Phase 2: Preset 버튼 (1시간)
- ✅ Phase 3: CSV Export 통합 (30분)

**Medium Priority** (권장):
- ⚠️ Phase 4: E2E 테스트 3개 (1시간)
- ⚠️ Phase 5: 문서화 (30분)

**Low Priority** (선택):
- ⏸️ 반응형 디자인 추가 최적화 (Mobile Popover 크기 조정)
- ⏸️ CSV 파일명에 날짜 범위 포함
- ⏸️ Feature Flag 추가 (점진적 롤아웃)

### 10.8 배포 계획

**배포 시나리오 1: 전체 배포** (권장)
```bash
# 1. 모든 Phase 완료 (5시간)
# 2. 빌드 검증
npm run build
npm run test:e2e

# 3. Git 커밋
git add .
git commit -m "feat(newsletter): add date range filter to CSV export

- Add DateRangePicker component (250 lines)
- Integrate with AdminNewsletter page
- Add 4 preset buttons (week, month, 3months, all)
- Update CSV export mutation to include dateFrom, dateTo
- Add E2E tests (3 scenarios)
- Update documentation (3 guides)

Closes #XXX"

# 4. 프로덕션 배포
git push origin main
vercel --prod
```

**배포 시나리오 2: 단계별 배포**
```bash
# Step 1: 기본 구현만 먼저 배포 (Phase 1-3, 3시간)
git commit -m "feat(newsletter): add basic date range filter"
vercel --prod

# Step 2: 1주일 후 테스트 & 문서화 추가 (Phase 4-5, 1.5시간)
git commit -m "test(newsletter): add E2E tests for date filter"
git commit -m "docs(newsletter): update CSV export guides"
vercel --prod
```

### 10.9 성공 기준

**기능 동작**:
- ✅ 날짜 범위 선택 Popover 정상 작동
- ✅ Preset 버튼 4개 정상 작동
- ✅ CSV Export에 dateFrom, dateTo 정상 전달
- ✅ 필터 조합 (검색 + 상태 + 날짜) 정상 작동

**성능**:
- ✅ 번들 크기 증가 < 10 KB gzip
- ✅ 페이지 로딩 시간 < 2초
- ✅ CSV Export 속도 변화 없음

**품질**:
- ✅ TypeScript 0 errors
- ✅ ESLint 0 warnings
- ✅ E2E 테스트 100% 통과
- ✅ WCAG 2.1 AA 준수

**사용자 만족도**:
- ✅ 관리자 피드백 긍정적
- ✅ CSV Export 실패율 < 1%
- ✅ 사용자 불편 신고 0건

---

## 📝 결론

본 문서는 AdminNewsletter 페이지의 CSV Export 기능에 **날짜 범위 필터 UI**를 추가하는 구현 계획입니다.

**핵심 결정사항**:
1. ✅ **shadcn/ui Calendar + Popover** 사용 (이미 설치됨, 디자인 시스템 일치)
2. ✅ **DateRangePicker 컴포넌트** 신규 작성 (250줄, 재사용 가능)
3. ✅ **Preset 버튼 4개** 제공 (최근 1주일, 1개월, 3개월, 전체)
4. ✅ **백엔드 수정 불필요** (useExportNewsletterCSV 이미 지원)
5. ✅ **총 작업 시간**: 5시간 (기본 구현 3시간 + 테스트/문서 2시간)

**다음 작업**:
- Phase 1: DateRangePicker 컴포넌트 작성 (2시간)
- Phase 2: AdminNewsletter 통합 (1시간)
- Phase 3: CSV Export 통합 (30분)
- Phase 4: E2E 테스트 (1시간)
- Phase 5: 문서화 (30분)

**예상 결과**:
- ✅ 관리자가 특정 기간 구독자만 CSV Export 가능
- ✅ 번들 크기 증가 < 5 KB gzip (+1.5%)
- ✅ WCAG 2.1 AA 접근성 준수
- ✅ 프로덕션 배포 준비 완료

---

**문서 작성 완료**: 2025-11-22
**총 분량**: ~4,200단어 (13.5 KB)
**상태**: ✅ 구현 계획 완료 (코드 작성 대기)
