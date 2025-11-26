# xlsx 차트 삽입 기능 요구사항 (BL-006)

## 개요

Excel 리포트에 데이터 시각화를 위한 차트 이미지 삽입 기능을 추가합니다.

**버전**: 1.0.0
**작성일**: 2025-11-26
**우선순위**: P1 (High)

---

## 1. 사용자 스토리

### US-1: Excel 리포트에 트렌드 차트 포함

**As a** 관리자
**I want to** Excel 리포트에 시계열 트렌드 차트를 포함하고 싶습니다
**So that** 데이터 흐름을 시각적으로 파악할 수 있습니다

**인수 조건**:
- [ ] 이벤트/이슈 시계열 데이터를 라인 차트로 표시
- [ ] 차트가 워크시트의 지정된 위치에 삽입됨
- [ ] 차트 이미지가 선명하고 읽기 쉬움 (최소 800x400px)

---

### US-2: 상태별 분포를 파이 차트로 표시

**As a** 관리자
**I want to** 이슈/이벤트 상태별 분포를 파이 차트로 보고 싶습니다
**So that** 각 상태의 비율을 직관적으로 파악할 수 있습니다

**인수 조건**:
- [ ] 상태별 개수를 파이 차트로 시각화
- [ ] 각 섹션에 퍼센트와 레이블 표시
- [ ] 색상이 구분되고 범례 포함

---

### US-3: 여러 종류의 차트 지원

**As a** 관리자
**I want to** line, bar, pie, area 차트를 선택할 수 있습니다
**So that** 데이터 특성에 맞는 시각화를 사용할 수 있습니다

**인수 조건**:
- [ ] 4가지 차트 타입 지원 (line, bar, pie, area)
- [ ] 차트 타입별 적절한 렌더링
- [ ] 일관된 스타일과 색상 팔레트

---

## 2. 기능 요구사항

### FR-1: 차트 데이터 구조

```typescript
interface ChartDataPoint {
  label: string;      // 데이터 레이블 (예: "2025-11-26", "진행중")
  value: number;      // 데이터 값
  color?: string;     // 선택적 색상 (파이 차트용)
}

interface ChartConfig {
  type: ChartType;                              // 차트 종류
  data: ChartDataPoint[];                       // 차트 데이터
  title?: string;                               // 차트 제목
  position: { row: number; col: number };       // 삽입 위치
  size?: { width: number; height: number };     // 차트 크기
}
```

### FR-2: 차트 생성 및 삽입

**기능**:
1. Canvas API를 사용하여 차트 이미지 생성
2. 생성된 이미지를 Blob으로 변환
3. XLSX 워크시트에 이미지 삽입

**제약사항**:
- SheetJS(xlsx)는 네이티브 차트를 지원하지 않으므로 이미지로 삽입
- Canvas API는 브라우저 환경에서만 동작
- 이미지 포맷: PNG (투명 배경 지원)

### FR-3: 차트 타입별 렌더링

#### Line Chart (라인 차트)
- **용도**: 시계열 트렌드, 연속 데이터
- **요소**: 축, 그리드, 라인, 데이터 포인트
- **예시**: 일별 이벤트 수, 월별 이슈 발생 건수

#### Bar Chart (바 차트)
- **용도**: 카테고리별 비교
- **요소**: 축, 그리드, 바
- **예시**: 서비스별 이벤트 수, 심각도별 이슈 수

#### Pie Chart (파이 차트)
- **용도**: 전체 대비 비율 표시
- **요소**: 섹션, 퍼센트 레이블, 범례
- **예시**: 상태별 이슈 분포, 서비스별 이벤트 비율

#### Area Chart (영역 차트)
- **용도**: 시계열 누적 데이터
- **요소**: 축, 그리드, 채워진 영역
- **예시**: 누적 이벤트 수, 누적 이슈 해결 건수

### FR-4: 스타일 및 색상

**색상 팔레트** (IDEA on Action 브랜드):
```typescript
const CHART_COLORS = {
  primary: '#0F172A',     // 네이비 (Slate 900)
  secondary: '#3B82F6',   // 블루 (Blue 500)
  success: '#10B981',     // 그린 (Emerald 500)
  warning: '#F59E0B',     // 오렌지 (Amber 500)
  danger: '#EF4444',      // 레드 (Red 500)
  info: '#06B6D4',        // 시안 (Cyan 500)
  neutral: '#64748B',     // 그레이 (Slate 500)
};
```

**폰트**:
- 제목: 16px bold, Inter
- 레이블: 12px regular, Inter
- 범례: 10px regular, Inter

**기본 크기**:
- 차트: 800x400px
- 마진: 40px (상하좌우)

### FR-5: 리포트 통합

**적용 대상**:
1. **이벤트 리포트** (`eventReportWithChart.ts`)
   - 시트 1: 이벤트 로그 (테이블)
   - 시트 2: 트렌드 차트 (일별 이벤트 수)
   - 시트 3: 유형별 분포 (파이 차트)

2. **이슈 리포트** (`issueReportWithChart.ts`)
   - 시트 1: 이슈 목록 (테이블)
   - 시트 2: 심각도별 분포 (바 차트)
   - 시트 3: 상태별 분포 (파이 차트)

3. **Central Hub 통계** (`centralHubStats.ts`)
   - 시트 1: KPI 요약 (테이블)
   - 시트 2: 서비스 헬스 트렌드 (라인 차트)
   - 시트 3: 이벤트/이슈 누적 (영역 차트)

---

## 3. 비기능 요구사항

### NFR-1: 성능

- 차트 생성 시간: 1개당 **200ms 이내**
- 메모리 사용: 차트당 **5MB 이내**
- 이미지 크기: **500KB 이내** (PNG 압축)

### NFR-2: 품질

- 차트 해상도: **최소 72dpi**
- 안티앨리어싱: **활성화** (부드러운 선)
- 색상 대비: **WCAG AA 준수** (접근성)

### NFR-3: 호환성

- 브라우저: Chrome, Firefox, Safari, Edge (최신 2개 버전)
- Excel: Microsoft Excel 2016 이상, Google Sheets
- 이미지 포맷: PNG (모든 브라우저 지원)

---

## 4. 제약사항

### Technical Constraints

1. **SheetJS 한계**:
   - 네이티브 Excel 차트 생성 미지원
   - 이미지로 삽입 (`.addImage()` 사용 불가, 대안 필요)
   - 차트 데이터와 이미지 분리 저장

2. **Canvas API 의존성**:
   - 브라우저 환경 필수
   - SSR/Node.js 환경 미지원
   - 대안: `canvas` npm 패키지 (서버사이드)

3. **메모리 제약**:
   - 대량 차트 생성 시 메모리 누적
   - Blob URL 해제 필수 (`URL.revokeObjectURL()`)

### Business Constraints

1. **기존 리포트 유지**:
   - 차트가 없는 기존 리포트도 계속 지원
   - `includeCharts` 옵션으로 선택 가능

2. **데이터 무결성**:
   - 차트와 원본 데이터 일치 보장
   - 차트 생성 실패 시 리포트는 계속 진행 (경고 표시)

---

## 5. 우선순위

| Priority | Feature | Reason |
|----------|---------|--------|
| **P0** | Line Chart (라인 차트) | 트렌드 분석에 가장 많이 사용 |
| **P0** | Pie Chart (파이 차트) | 상태별 분포 표시에 필수 |
| **P1** | Bar Chart (바 차트) | 카테고리 비교에 유용 |
| **P2** | Area Chart (영역 차트) | 누적 데이터 표시 (선택) |

---

## 6. 성공 기준

### 정량적 지표

- [ ] 차트 생성 성공률: **95% 이상**
- [ ] 차트 생성 시간: **200ms 이내**
- [ ] 이미지 크기: **500KB 이내**
- [ ] E2E 테스트 통과율: **100%**

### 정성적 지표

- [ ] 차트가 Excel에서 정상 표시됨
- [ ] 색상과 레이블이 읽기 쉬움
- [ ] 기존 리포트와 스타일 일관성 유지
- [ ] 에러 핸들링이 명확함 (차트 실패 시 경고)

---

## 7. 참고 자료

- **SheetJS 문서**: https://docs.sheetjs.com/
- **Canvas API**: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **Chart.js** (참고용): https://www.chartjs.org/
- **WCAG 색상 대비**: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html

---

## 8. 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 1.0.0 | 2025-11-26 | 초기 작성 | Claude |
