# Analytics & Quality Scripts

분석 및 품질 관리 스크립트 모음

## 📁 스크립트 목록

### 접근성 분석
- `analyze-a11y.cjs` - 접근성(a11y) 분석
- `check-color-contrast.cjs` - 색상 대비 검사 (WCAG 준수)

### 문서 & 코드 분석
- `check-docs-size.js` - 문서 크기 분석
- `filter-claude-images.js` - Claude API 이미지 필터링 (5MB 제한)

### 추적 & 태그
- `verify-google-tags.js` - Google Analytics/GTM 태그 검증

## 🚀 사용법

### 접근성 분석
```bash
node scripts/analytics/analyze-a11y.cjs
```

### 색상 대비 검사
```bash
node scripts/analytics/check-color-contrast.cjs
```

### 문서 크기 분석
```bash
node scripts/analytics/check-docs-size.js
```

### Google 태그 검증
```bash
node scripts/analytics/verify-google-tags.js
```

## 📊 출력 예시

### 접근성 분석
- WCAG 2.1 준수율
- 위반 항목 리스트
- 수정 권장사항

### 색상 대비
- AA/AAA 준수 여부
- 대비율 (contrast ratio)
- 문제 요소 위치

## 📝 참고사항

- 접근성 목표: WCAG 2.1 AA (85%+)
- 색상 대비: AA 4.5:1 이상, AAA 7:1 이상
- 자세한 가이드: `docs/guides/design-system/accessibility.md`
