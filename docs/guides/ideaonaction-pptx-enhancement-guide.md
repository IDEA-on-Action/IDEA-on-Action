# PowerPoint 고도화 구현 가이드

> BL-011: pptx 고도화 - 마스터 슬라이드, 이미지 슬라이드, 차트 개선

**작성일**: 2025-11-27
**버전**: 2.20.0

---

## 📋 개요

PowerPoint 생성 기능을 고도화하여 더 풍부한 프레젠테이션 제작을 지원합니다.

### 주요 개선사항

1. **마스터 슬라이드 템플릿** - 브랜드 일관성 유지
2. **이미지 슬라이드** - URL/Base64 이미지 지원, 4가지 레이아웃
3. **차트 개선** - 범례/데이터 레이블 제어, 색상 팔레트 확장
4. **새로운 슬라이드 타입** - image, comparison, quote

---

## 🎨 1. 마스터 슬라이드 템플릿

### 개요

IDEA on Action 브랜드 마스터 슬라이드를 정의하여 모든 슬라이드에 일관된 디자인을 적용합니다.

### 마스터 타입

#### IDEA_BRAND (일반 슬라이드용)
- 흰색 배경
- 상단 진한 남색 바 (#0F172A)
- 하단 로고 및 페이지 번호

#### IDEA_TITLE (제목 슬라이드용)
- 진한 남색 배경 (#0F172A)
- 중앙 정렬
- 하단 로고

### 사용 예시

```typescript
import PptxGenJS from 'pptxgenjs';
import { applyAllBrandMasters } from '@/skills/pptx/masters';

const pptx = new PptxGenJS();

// 모든 브랜드 마스터 적용
applyAllBrandMasters(pptx);

// 일반 슬라이드
const slide1 = pptx.addSlide({ masterName: 'IDEA_BRAND' });

// 제목 슬라이드
const slide2 = pptx.addSlide({ masterName: 'IDEA_TITLE' });
```

### 함수 API

```typescript
/**
 * 일반 슬라이드 마스터 적용
 */
applyBrandMaster(pptx: PptxGenJS): void

/**
 * 제목 슬라이드 마스터 적용
 */
applyTitleMaster(pptx: PptxGenJS): void

/**
 * 모든 마스터 적용 (추천)
 */
applyAllBrandMasters(pptx: PptxGenJS): void
```

---

## 🖼️ 2. 이미지 슬라이드

### 개요

이미지를 포함한 슬라이드를 생성합니다. URL 또는 Base64 형식 모두 지원합니다.

### 레이아웃

| 레이아웃 | 설명 | 이미지 크기 |
|---------|------|------------|
| `full` | 전체 화면 | 12 × 5 inch |
| `left` | 왼쪽 정렬 | 5.5 × 4 inch |
| `right` | 오른쪽 정렬 | 5.5 × 4 inch |
| `center` | 중앙 정렬 | 9 × 4.5 inch |

### 사용 예시

```typescript
import { usePptxGenerate } from '@/skills/pptx';

const { generatePresentation } = usePptxGenerate();

await generatePresentation({
  slides: [
    {
      type: 'image',
      title: '제품 스크린샷',
      imageUrl: 'https://example.com/screenshot.png',
      imageLayout: 'center',
      caption: '그림 1. 메인 화면',
    },
    {
      type: 'image',
      title: '비포/애프터',
      imageBase64: 'data:image/png;base64,...',
      imageLayout: 'left',
    },
  ],
  filename: 'product-demo.pptx',
});
```

### SlideContent 타입

```typescript
interface SlideContent {
  type: 'image';
  title?: string;
  imageUrl?: string;           // URL 형식 이미지
  imageBase64?: string;         // Base64 형식 이미지
  imageLayout?: 'full' | 'left' | 'right' | 'center';
  caption?: string;             // 이미지 하단 캡션
  notes?: string;
}
```

---

## 📊 3. 차트 슬라이드 개선

### 개선사항

1. **범례 표시 제어** - `showLegend` 옵션
2. **데이터 레이블 제어** - `showDataLabels` 옵션
3. **색상 팔레트 확장** - 10개 브랜드 색상
4. **순환 색상** - 데이터가 많아도 자동 순환

### 브랜드 색상 팔레트

```typescript
const colorPalette = [
  '3B82F6',  // Blue 500 (Primary)
  '10B981',  // Emerald 500
  'F59E0B',  // Amber 500
  'EF4444',  // Red 500
  '8B5CF6',  // Violet 500
  '06B6D4',  // Cyan 500
  'F97316',  // Orange 500
  '84CC16',  // Lime 500
  'EC4899',  // Pink 500
  '14B8A6',  // Teal 500
];
```

### 사용 예시

```typescript
await generatePresentation({
  slides: [
    {
      type: 'chart',
      title: '월별 매출 현황',
      chartData: {
        type: 'bar',
        labels: ['1월', '2월', '3월', '4월'],
        values: [100, 120, 90, 150],
        seriesName: '매출 (억원)',
      },
      showLegend: true,        // 범례 표시 (기본값)
      showDataLabels: true,    // 데이터 레이블 표시
    },
    {
      type: 'chart',
      title: '시장 점유율',
      chartData: {
        type: 'pie',
        labels: ['우리', '경쟁사A', '경쟁사B', '기타'],
        values: [35, 25, 20, 20],
      },
      showLegend: true,
      showDataLabels: false,   // 파이 차트에서는 불필요
    },
  ],
  filename: 'sales-report.pptx',
});
```

### SlideContent 타입

```typescript
interface SlideContent {
  type: 'chart';
  title?: string;
  chartData: ChartData;
  showLegend?: boolean;        // 범례 표시 (기본: true)
  showDataLabels?: boolean;    // 데이터 레이블 (기본: false)
  notes?: string;
}
```

---

## 🆕 4. 새로운 슬라이드 타입

### comparison (비교 슬라이드)

`twoColumn` 슬라이드와 동일하게 동작하지만, 의미론적으로 비교 목적임을 명시합니다.

```typescript
{
  type: 'comparison',
  title: '기존 vs 개선',
  leftTitle: '기존',
  leftContent: ['느린 속도', '복잡한 UI', '높은 비용'],
  rightTitle: '개선',
  rightContent: ['빠른 속도', '직관적 UI', '합리적 가격'],
}
```

### quote (인용문 슬라이드)

인용문을 강조하는 슬라이드입니다.

```typescript
{
  type: 'quote',
  title: '고객 후기',
  quoteText: '이 제품 덕분에 업무 효율이 2배 늘었습니다.',
  quoteAuthor: '김철수, ABC 회사 대표',
}
```

---

## 📦 5. 전체 슬라이드 타입

| 타입 | 설명 | 주요 속성 |
|-----|------|----------|
| `title` | 표지 슬라이드 | title, subtitle |
| `content` | 내용 슬라이드 | title, content[] |
| `twoColumn` | 2단 레이아웃 | leftContent, rightContent |
| `chart` | 차트 슬라이드 | chartData, showLegend, showDataLabels |
| `image` ✨ | 이미지 슬라이드 | imageUrl, imageLayout, caption |
| `comparison` ✨ | 비교 슬라이드 | leftContent, rightContent |
| `quote` ✨ | 인용문 슬라이드 | quoteText, quoteAuthor |

---

## 💡 6. 실전 예제

### 제품 소개 프레젠테이션

```typescript
import { usePptxGenerate } from '@/skills/pptx';

function ProductIntroPresentation() {
  const { generatePresentation, isGenerating } = usePptxGenerate();

  const handleGenerate = async () => {
    await generatePresentation({
      slides: [
        // 표지
        {
          type: 'title',
          title: '신제품 소개',
          subtitle: 'IDEA on Action | 2025.11',
        },
        // 목차
        {
          type: 'content',
          title: '목차',
          content: [
            '1. 제품 개요',
            '2. 주요 기능',
            '3. 시장 분석',
            '4. 가격 정책',
          ],
        },
        // 제품 스크린샷
        {
          type: 'image',
          title: '제품 화면',
          imageUrl: 'https://cdn.example.com/product-screenshot.png',
          imageLayout: 'center',
          caption: '그림 1. 메인 대시보드',
        },
        // 비교
        {
          type: 'comparison',
          title: '기존 vs 신제품',
          leftTitle: '기존 솔루션',
          leftContent: ['복잡한 설치', '느린 응답', '높은 가격'],
          rightTitle: '우리 제품',
          rightContent: ['간편한 설치', '빠른 응답', '합리적 가격'],
        },
        // 차트
        {
          type: 'chart',
          title: '시장 점유율',
          chartData: {
            type: 'pie',
            labels: ['우리 제품', '경쟁사 A', '경쟁사 B', '기타'],
            values: [40, 30, 20, 10],
          },
          showLegend: true,
          showDataLabels: true,
        },
        // 고객 후기
        {
          type: 'quote',
          title: '고객 후기',
          quoteText: '설치하고 바로 사용할 수 있어서 너무 좋았습니다.',
          quoteAuthor: '김철수, ABC 회사',
        },
        // 마무리
        {
          type: 'title',
          title: '감사합니다',
          subtitle: 'Q&A',
        },
      ],
      filename: 'product-intro.pptx',
      metadata: {
        title: '신제품 소개',
        author: 'IDEA on Action',
        company: '생각과행동',
        subject: '제품 소개서',
      },
    });
  };

  return (
    <button onClick={handleGenerate} disabled={isGenerating}>
      {isGenerating ? '생성 중...' : '프레젠테이션 생성'}
    </button>
  );
}
```

---

## 🔧 7. 파일 구조

```
src/skills/pptx/
├── masters/              # 마스터 슬라이드
│   ├── brandMaster.ts    # IDEA on Action 브랜드 마스터
│   └── index.ts
├── templates/            # 슬라이드 템플릿
│   ├── titleSlide.ts
│   ├── contentSlide.ts
│   ├── twoColumnSlide.ts
│   ├── chartSlide.ts     # ✨ 개선
│   ├── imageSlide.ts     # ✨ 신규
│   └── index.ts
├── usePptxGenerate.ts    # ✨ 확장
└── index.ts

src/types/
└── pptx.types.ts         # ✨ 타입 확장
```

---

## 📚 8. API 레퍼런스

### usePptxGenerate

```typescript
function usePptxGenerate(): UsePptxGenerateReturn {
  generatePresentation: (options: PptxGenerateOptions) => Promise<PptxGenerateResult>;
  isGenerating: boolean;
  progress: number;
  error: SkillError | null;
  reset: () => void;
}
```

### PptxGenerateOptions

```typescript
interface PptxGenerateOptions {
  slides: SlideContent[];
  filename: string;
  metadata?: Partial<PresentationMetadata>;
  styles?: PptxStyleOptions;
}
```

### SlideContent (확장)

```typescript
interface SlideContent {
  type: 'title' | 'content' | 'twoColumn' | 'chart' | 'image' | 'comparison' | 'quote';
  title?: string;
  subtitle?: string;
  content?: string[];
  leftContent?: string[];
  rightContent?: string[];
  leftTitle?: string;
  rightTitle?: string;
  chartData?: ChartData;
  imageUrl?: string;           // ✨ 신규
  imageBase64?: string;         // ✨ 신규
  imageLayout?: ImageLayout;    // ✨ 신규
  caption?: string;             // ✨ 신규
  quoteText?: string;           // ✨ 신규
  quoteAuthor?: string;         // ✨ 신규
  showLegend?: boolean;         // ✨ 신규
  showDataLabels?: boolean;     // ✨ 신규
  notes?: string;
}
```

---

## ✅ 9. 체크리스트

### 구현 완료
- [x] 마스터 슬라이드 템플릿 (IDEA_BRAND, IDEA_TITLE)
- [x] 이미지 슬라이드 템플릿 (4가지 레이아웃)
- [x] 차트 슬라이드 개선 (범례/레이블 제어)
- [x] 타입 정의 확장 (image, comparison, quote)
- [x] usePptxGenerate 훅 확장
- [x] 색상 팔레트 확장 (10개)

### 테스트 권장
- [ ] 이미지 URL 로딩 테스트
- [ ] 이미지 Base64 테스트
- [ ] 다양한 차트 타입 테스트
- [ ] 마스터 슬라이드 적용 테스트
- [ ] 전체 슬라이드 타입 조합 테스트

---

## 🔍 10. 트러블슈팅

### 이미지가 표시되지 않아요
- **원인**: CORS 정책 또는 잘못된 이미지 URL
- **해결**: Base64로 인코딩하여 사용하거나, CORS 허용된 CDN 사용

### 차트 색상이 이상해요
- **원인**: 커스텀 색상 지정 시 브랜드 팔레트 무시
- **해결**: `chartData.color` 대신 자동 색상 팔레트 사용

### 마스터 슬라이드가 적용되지 않아요
- **원인**: `usePptxGenerate.ts`에서 마스터 적용이 주석 처리됨
- **해결**: 260줄의 `applyAllBrandMasters(pptx);` 주석 해제

---

## 📖 11. 참고 자료

- **pptxgenjs 공식 문서**: https://gitbrent.github.io/PptxGenJS/
- **IDEA on Action 디자인 가이드**: `docs/guides/design-system/`
- **기존 pptx 구현**: `src/skills/pptx/`

---

**작성**: Claude (AI Assistant)
**검토 필요**: 이미지 URL CORS 정책, 브랜드 색상 최종 확정
