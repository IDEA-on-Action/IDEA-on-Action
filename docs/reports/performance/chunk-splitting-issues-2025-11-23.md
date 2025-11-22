# Vite Chunk Splitting Issues - React 의존성 문제

**Date**: 2025-11-23
**Status**: ✅ 해결 완료
**영향**: 프로덕션 사이트 로딩 실패 → 정상 복구

---

## 요약

Vite의 `manualChunks` 설정으로 vendor 라이브러리를 분리할 때, **React에 의존하는 라이브러리**들을 별도 청크로 분리하면 모듈 초기화 순서 문제가 발생합니다.

### 핵심 원인

```
React 모듈 로드 순서:
1. index.js (React 포함) 로드 시작
2. vendor-*.js (React 의존 라이브러리) 로드 시작  ← 병렬 로딩
3. vendor-*.js가 React.Component 접근 시도       ← 에러! React 아직 초기화 안됨
4. index.js 로드 완료 (React 초기화)             ← 너무 늦음
```

---

## 발생한 에러 목록

### 1. vendor-charts (recharts + d3)

```
Uncaught ReferenceError: Cannot access 'S' before initialization
    at vendor-charts-C4EkfgKp.js:9:16763
```

**원인**: recharts와 d3-* 라이브러리 간 복잡한 순환 참조

### 2. vendor-editor (TipTap + Prosemirror)

```
Uncaught TypeError: Cannot read properties of undefined (reading 'useSyncExternalStore')
    at vendor-editor-BIMUHK4r.js:108:139
```

**원인**: TipTap이 React 18의 `useSyncExternalStore` 훅 사용

### 3. vendor-sentry (Sentry React SDK)

```
Uncaught TypeError: Cannot read properties of undefined (reading 'Component')
    at vendor-sentry-Cv5-SWPg.js:29:32036
```

**원인**: Sentry React SDK가 `React.Component` 클래스 상속

---

## 해결 방법

### 비활성화된 청크

`vite.config.ts`에서 다음 청크 분리를 비활성화:

```typescript
// ❌ 비활성화됨 - React 의존성 문제
// vendor-charts (recharts + d3-*)
// vendor-editor (TipTap + Prosemirror)
// vendor-sentry (Sentry React SDK)

// ✅ 정상 작동 - React 의존성 없음
// vendor-markdown (remark + rehype)
// vendor-auth (otpauth + qrcode)
```

### 변경 내용

**Before** (문제 발생):
```typescript
if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
  return 'vendor-charts';
}

if (id.includes('node_modules/@tiptap') || id.includes('node_modules/prosemirror')) {
  return 'vendor-editor';
}

if (id.includes('node_modules/@sentry')) {
  return 'vendor-sentry';
}
```

**After** (해결):
```typescript
// 1. Recharts - DISABLED due to circular dependency issues
// recharts + d3-* libraries have complex internal dependencies
// that cause "Cannot access 'X' before initialization" errors
// if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
//   return 'vendor-charts';
// }

// 3. TipTap Editor - DISABLED due to React dependency issues
// TipTap/Prosemirror uses React's useSyncExternalStore internally
// if (id.includes('node_modules/@tiptap') || id.includes('node_modules/prosemirror')) {
//   return 'vendor-editor';
// }

// 4. Sentry - DISABLED due to React dependency issues
// Sentry React SDK uses React.Component internally
// if (id.includes('node_modules/@sentry')) {
//   return 'vendor-sentry';
// }
```

---

## 안전하게 분리 가능한 라이브러리

| 라이브러리 | React 의존성 | 분리 가능 | 비고 |
|-----------|-------------|----------|------|
| remark/rehype | ❌ | ✅ | Markdown 파싱 (순수 JS) |
| otpauth | ❌ | ✅ | OTP 생성 (순수 JS) |
| qrcode | ❌ | ✅ | QR 코드 생성 (순수 JS) |
| recharts | ✅ | ❌ | React 컴포넌트 |
| @tiptap/* | ✅ | ❌ | React 훅 사용 |
| @sentry/react | ✅ | ❌ | React.Component 상속 |
| react-hook-form | ✅ | ❌ | React 훅 |
| @tanstack/react-query | ✅ | ❌ | React 훅 |

---

## 청크 분리 시 체크리스트

새로운 라이브러리를 별도 청크로 분리하기 전에 확인:

- [ ] 라이브러리가 React를 import 하는가?
- [ ] `React.Component`, `React.createElement` 사용하는가?
- [ ] React 훅 (`useState`, `useEffect`, `useSyncExternalStore` 등) 사용하는가?
- [ ] `react`, `react-dom`을 peerDependencies로 가지는가?

**하나라도 해당되면 별도 청크로 분리하지 않는 것이 안전합니다.**

---

## 번들 크기 영향

### Before (청크 분리 시도)
```
vendor-charts:   ~100 kB gzip
vendor-editor:   ~170 kB gzip
vendor-sentry:   ~105 kB gzip
index.js:        ~300 kB gzip
```

### After (메인 번들에 포함)
```
vendor-markdown: ~108 kB gzip (분리 유지)
vendor-auth:     ~18 kB gzip (분리 유지)
pages-admin:     ~920 kB gzip (admin 전용)
index.js:        ~600 kB gzip (recharts+tiptap+sentry 포함)
```

**트레이드오프**: 초기 로딩 시 ~300 kB 추가 로드 vs 런타임 에러 방지

---

## 대안적 해결 방법 (미래 고려사항)

### 1. React를 별도 청크로 분리하지 않기
현재 이미 이 방식 사용 중. React/ReactDOM은 `index.js`에 포함.

### 2. 동적 import 사용
Admin 페이지에서만 사용하는 라이브러리는 이미 `pages-admin` 청크로 분리됨.

### 3. ES Module 로딩 순서 제어
Vite의 `optimizeDeps.include`로 선로딩 강제 가능하나, 복잡성 증가.

### 4. 라이브러리 교체
- recharts → lightweight-charts (React 의존성 없음)
- Sentry → 별도 SDK 없이 fetch API로 직접 전송

---

## 관련 커밋

- `16da2df` - fix: vendor-charts 청크 분리로 인한 순환 참조 에러 수정
- `848e2a5` - fix: vendor-editor 청크 분리로 인한 React 의존성 에러 수정
- `035266b` - fix: vendor-sentry 청크 분리로 인한 React 의존성 에러 수정

---

## 참고 자료

- [Vite Rollup Manual Chunks](https://rollupjs.org/configuration-options/#output-manualchunks)
- [React 18 useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- [Sentry React SDK](https://docs.sentry.io/platforms/javascript/guides/react/)

---

**Generated**: 2025-11-23
**Author**: Claude AI
**Status**: 프로덕션 복구 완료
