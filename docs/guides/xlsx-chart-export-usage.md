# xlsx 차트 내보내기 사용 가이드

Excel 파일과 차트 이미지를 ZIP 파일로 함께 내보내는 기능 사용법

---

## 개요

SheetJS(xlsx)는 이미지 삽입을 지원하지 않기 때문에, 차트 이미지를 별도의 PNG 파일로 생성하고 Excel 파일과 함께 ZIP으로 묶어서 다운로드하는 방식으로 구현했습니다.

### 패키지
- `jszip` (v3.10.1) - ZIP 파일 생성
- `@types/jszip` - TypeScript 타입 정의

---

## 기본 사용법

### 1. Canvas 참조 생성

차트 라이브러리(Recharts, Chart.js 등)에서 생성한 Canvas 요소에 대한 참조를 생성합니다.

```typescript
import { useRef } from 'react';

function MyComponent() {
  const chartRef1 = useRef<HTMLCanvasElement>(null);
  const chartRef2 = useRef<HTMLCanvasElement>(null);

  return (
    <div>
      {/* Recharts 예시 */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          {/* chart components */}
        </LineChart>
      </ResponsiveContainer>

      {/* Canvas를 직접 사용하는 경우 */}
      <canvas ref={chartRef1} width={800} height={400} />
    </div>
  );
}
```

### 2. ExportButton 컴포넌트 사용

가장 간단한 방법은 `ExportButton` 컴포넌트를 사용하는 것입니다.

```typescript
import { ExportButton } from '@/components/skills/ExportButton';
import { useRef } from 'react';

function MyDashboard() {
  const chartRef1 = useRef<HTMLCanvasElement>(null);
  const chartRef2 = useRef<HTMLCanvasElement>(null);

  return (
    <div>
      {/* 차트들 렌더링 */}

      {/* Excel + 차트 내보내기 버튼 */}
      <ExportButton
        includeCharts={true}
        chartRefs={[chartRef1, chartRef2]}
        options={{
          filename: 'my-report.xlsx',
          dateRange: {
            from: new Date('2025-01-01'),
            to: new Date(),
          },
        }}
      />
    </div>
  );
}
```

### 3. useXlsxExport 훅 직접 사용

더 세밀한 제어가 필요한 경우 훅을 직접 사용할 수 있습니다.

```typescript
import { useXlsxExport } from '@/skills/xlsx/useXlsxExport';
import { useRef } from 'react';

function MyDashboard() {
  const { exportToExcel, isExporting, progress, error } = useXlsxExport();
  const chartRef1 = useRef<HTMLCanvasElement>(null);
  const chartRef2 = useRef<HTMLCanvasElement>(null);

  const handleExport = async () => {
    await exportToExcel({
      filename: 'my-report.xlsx',
      includeCharts: true,
      chartRefs: [chartRef1, chartRef2],
      dateRange: {
        from: new Date('2025-01-01'),
        to: new Date(),
      },
    });
  };

  return (
    <div>
      {/* 차트들 렌더링 */}

      <button onClick={handleExport} disabled={isExporting}>
        {isExporting ? `${progress}% 내보내는 중...` : 'Excel + 차트 내보내기'}
      </button>

      {error && <p className="text-red-500">{error.message}</p>}
    </div>
  );
}
```

---

## Recharts 통합 예시

Recharts는 SVG를 생성하므로, Canvas로 변환하는 과정이 필요합니다.

### 방법 1: html2canvas 사용 (권장하지 않음)

```typescript
// html2canvas는 번들 크기가 크고 느리므로 권장하지 않음
```

### 방법 2: recharts-to-png 사용

```bash
npm install recharts-to-png
```

```typescript
import { useCurrentPng } from 'recharts-to-png';
import { LineChart, Line } from 'recharts';

function MyChart() {
  const [getPng, { ref }] = useCurrentPng();

  const handleDownload = async () => {
    const png = await getPng();
    // PNG를 Canvas로 변환하여 사용
  };

  return (
    <LineChart data={data} ref={ref}>
      <Line type="monotone" dataKey="value" />
    </LineChart>
  );
}
```

### 방법 3: Canvas 차트 라이브러리 사용 (권장)

Chart.js, D3 등 Canvas 기반 라이브러리를 사용하면 더 간단합니다.

---

## 고급 사용법

### 1. 차트 이름 커스터마이징

차트 파일명을 커스터마이징하려면 `ChartExportConfig`를 직접 생성합니다.

```typescript
import { exportWithCharts } from '@/lib/skills/xlsx/chart-exporter';
import * as XLSX from 'xlsx';

async function customExport() {
  const workbook = XLSX.utils.book_new();
  // ... 워크북 생성

  const charts = [
    {
      chartId: 'revenue-chart',
      chartElement: revenueChartRef.current,
      fileName: '매출-추이-차트',
    },
    {
      chartId: 'user-chart',
      chartElement: userChartRef.current,
      fileName: '사용자-증가-차트',
    },
  ];

  const result = await exportWithCharts({
    workbook,
    fileName: '월간-리포트',
    charts,
  });

  if (result.success) {
    console.log(`${result.fileCount}개 파일 생성 (${result.zipSize} bytes)`);
  }
}
```

### 2. 에러 처리

```typescript
const result = await exportWithCharts({
  workbook,
  fileName: 'report',
  charts,
});

if (!result.success) {
  console.error('Export failed:', result.error);
  // 사용자에게 에러 메시지 표시
  toast.error(`내보내기 실패: ${result.error}`);
}
```

### 3. 진행률 표시

```typescript
function MyComponent() {
  const { exportToExcel, isExporting, progress } = useXlsxExport();

  return (
    <div>
      {isExporting && (
        <div className="progress-bar">
          <div style={{ width: `${progress}%` }} />
          <span>{progress}%</span>
        </div>
      )}

      <button onClick={() => exportToExcel({ includeCharts: true, chartRefs })}>
        내보내기
      </button>
    </div>
  );
}
```

---

## 출력 결과

### 파일 구조

```
my-report.zip
├── my-report.xlsx      (Excel 파일)
└── charts/             (차트 이미지 폴더)
    ├── chart-1.png
    ├── chart-2.png
    └── chart-3.png
```

### ZIP 파일 크기

- Excel 파일: ~50-200 KB (데이터 양에 따라 다름)
- PNG 차트 (800x400): ~30-100 KB/개
- 총 크기: ~200-500 KB (차트 3개 기준)

---

## 주의사항

### 1. Canvas 요소 확인

차트가 렌더링되기 전에 내보내기를 시도하면 실패합니다.

```typescript
// ❌ 잘못된 예시
useEffect(() => {
  exportToExcel({ includeCharts: true, chartRefs }); // 차트가 아직 렌더링되지 않음
}, []);

// ✅ 올바른 예시
const handleExport = async () => {
  if (!chartRef.current) {
    console.warn('차트가 아직 렌더링되지 않았습니다.');
    return;
  }

  await exportToExcel({ includeCharts: true, chartRefs: [chartRef] });
};
```

### 2. 빈 Canvas 처리

Canvas가 null이거나 비어있으면 자동으로 건너뜁니다.

```typescript
// chart-exporter.ts 내부에서 처리
.filter(c => c.chartElement) // null인 경우 자동 제외
```

### 3. 브라우저 호환성

- Canvas API: 모든 모던 브라우저 지원
- Blob API: IE10+ 지원
- ZIP 생성: JSZip이 IE10+ 지원

### 4. 번들 크기

- JSZip: ~97 KB (gzip: ~30 KB)
- vite.config.ts에서 `jszip-skill` 청크로 분리되어 lazy-loaded

---

## 문제 해결

### 차트가 내보내기되지 않음

1. Canvas 참조가 올바른지 확인
2. 차트가 렌더링된 후 내보내기 시도
3. 브라우저 콘솔에서 에러 확인

### ZIP 파일이 다운로드되지 않음

1. 브라우저 팝업 차단 확인
2. 파일명에 특수문자 포함 여부 확인
3. 네트워크 탭에서 다운로드 시도 확인

### Canvas to Blob 변환 실패

1. Canvas가 비어있는지 확인
2. CORS 이슈 확인 (외부 이미지 사용 시)
3. Canvas 크기가 너무 크지 않은지 확인

---

## 참고 자료

- [JSZip 공식 문서](https://stuk.github.io/jszip/)
- [SheetJS 공식 문서](https://docs.sheetjs.com/)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Recharts 공식 문서](https://recharts.org/)

---

## 관련 파일

- `src/lib/skills/xlsx/chart-exporter.ts` - 차트 내보내기 유틸리티
- `src/skills/xlsx/useXlsxExport.ts` - Excel 내보내기 훅
- `src/components/skills/ExportButton.tsx` - 내보내기 버튼 컴포넌트
- `src/types/xlsx-chart.types.ts` - 타입 정의
- `vite.config.ts` - JSZip 청크 설정

---

**작성일**: 2025-11-27
**버전**: 2.20.0
**작성자**: Claude (AI Assistant)
