# 빌드 트러블슈팅 가이드

> Vite 빌드 시 발생할 수 있는 문제와 해결 방법

**작성일**: 2025-11-23
**관련 커밋**: `237b80a`, `f968dda`

---

## 목차

1. [모듈 초기화 에러](#1-모듈-초기화-에러)
2. [순환 의존성 에러](#2-순환-의존성-에러)
3. [청크 분리 전략](#3-청크-분리-전략)
4. [디버깅 가이드](#4-디버깅-가이드)

---

## 1. 모듈 초기화 에러

### 증상

프로덕션 배포 후 사이트가 검은 화면만 표시되거나, 콘솔에 다음과 같은 에러 발생:

```
Uncaught ReferenceError: Cannot access 'X' before initialization
```

### 원인

**모듈 최상위 레벨에서 외부 라이브러리 인스턴스를 즉시 생성**하는 경우 발생.

```typescript
// ❌ 문제가 되는 코드
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: import.meta.env.VITE_GITHUB_TOKEN,
});

export async function getRepoStats() {
  // octokit 사용
}
```

이 코드는 모듈이 import되는 순간 즉시 실행되어:
- 환경 변수 누락 시 에러 발생
- 라이브러리 초기화 실패 시 전체 앱 크래시
- 브라우저 환경과 Node.js 환경 차이로 인한 오류

### 해결 방법

**Lazy Initialization 패턴** 적용:

```typescript
// ✅ 올바른 코드
import { Octokit } from '@octokit/rest';

let octokitInstance: Octokit | null = null;

function getOctokit(): Octokit {
  if (!octokitInstance) {
    octokitInstance = new Octokit({
      auth: import.meta.env.VITE_GITHUB_TOKEN || undefined,
    });
  }
  return octokitInstance;
}

export async function getRepoStats() {
  const octokit = getOctokit();
  // octokit 사용
}
```

### 실제 사례: `github-api.ts` (2025-11-23)

**문제**: `@octokit/rest` 패키지를 모듈 최상위에서 초기화하여 프로덕션 사이트 크래시
**해결**: `getOctokit()` 함수로 지연 초기화 적용
**커밋**: `237b80a`

---

## 2. 순환 의존성 에러

### 증상

빌드는 성공하지만 런타임에 다음 에러 발생:

```
Uncaught ReferenceError: Cannot access 'pn' before initialization
    at pages-admin-components-*.js:18:21103
```

`pn`, `Qe`, `ot` 등의 minified 변수명은 실제 컴포넌트/함수명이 압축된 것.

### 원인

**Vite의 manualChunks 설정으로 분리된 청크 간 순환 의존성** 발생.

```typescript
// vite.config.ts
manualChunks: (id) => {
  // Admin 컴포넌트를 별도 청크로 분리
  if (id.includes('/components/admin/')) {
    return 'pages-admin-components';  // ❌ 순환 의존성 유발
  }
}
```

Admin 컴포넌트들이 다음과 같은 복잡한 의존성 구조를 가짐:
- Form 컴포넌트 → UI primitives (Button, Input)
- Editor 컴포넌트 → TipTap/Prosemirror
- Table 컴포넌트 → Tanstack Table

이들을 별도 청크로 분리하면 로딩 순서가 보장되지 않아 초기화 에러 발생.

### 해결 방법

**순환 의존성이 있는 모듈은 청크 분리하지 않음**:

```typescript
// vite.config.ts
manualChunks: (id) => {
  // ❌ 비활성화 - 순환 의존성 문제
  // Admin components have complex internal dependencies
  // if (id.includes('/components/admin/')) {
  //   return 'pages-admin-components';
  // }
}
```

### 청크 분리가 안전한 경우

다음 라이브러리들은 독립적이므로 분리 가능:
- `vendor-markdown`: react-markdown, remark, rehype 등
- `vendor-auth`: otpauth, qrcode 등

### 청크 분리가 위험한 경우

다음은 React 또는 다른 모듈과 강하게 결합되어 분리 시 문제 발생:
- `recharts` + `d3-*`: 복잡한 내부 의존성
- `@tiptap/*` + `prosemirror-*`: React의 useSyncExternalStore 사용
- `@sentry/react`: React.Component 내부 사용
- `components/admin/*`: UI primitives와 상호 의존

### 실제 사례: `pages-admin-components` (2025-11-23)

**문제**: Admin 컴포넌트 청크 분리로 인한 순환 의존성 에러
**해결**: `/components/admin/` 청크 분리 비활성화
**커밋**: `f968dda`

---

## 3. 청크 분리 전략

### 현재 설정 (2025-11-23 기준)

```typescript
// vite.config.ts - manualChunks
manualChunks: (id) => {
  // ✅ 분리 가능 (독립적)
  if (id.includes('react-markdown') || id.includes('remark-') || ...) {
    return 'vendor-markdown';
  }
  if (id.includes('otpauth') || id.includes('qrcode')) {
    return 'vendor-auth';
  }

  // ✅ Admin 페이지별 분리 (각 페이지가 독립적)
  if (id.includes('/pages/admin/Dashboard') || ...) {
    return 'pages-admin-analytics';
  }
  if (id.includes('/pages/admin/AdminBlog') || ...) {
    return 'pages-admin-blog';
  }
  // ... 기타 Admin 페이지

  // ❌ 비활성화 (순환 의존성)
  // if (id.includes('/components/admin/')) {
  //   return 'pages-admin-components';
  // }

  // ❌ 비활성화 (React 의존성)
  // if (id.includes('recharts') || id.includes('d3-')) {
  //   return 'vendor-charts';
  // }
  // if (id.includes('@tiptap') || id.includes('prosemirror')) {
  //   return 'vendor-editor';
  // }
  // if (id.includes('@sentry')) {
  //   return 'vendor-sentry';
  // }
}
```

### 청크 크기 가이드라인

| 청크 유형 | 권장 크기 (gzip) | 설명 |
|-----------|------------------|------|
| index.js | < 100 kB | 초기 로딩 번들 |
| vendor-* | < 50 kB | 지연 로딩 라이브러리 |
| pages-admin-* | < 300 kB | Admin 페이지 (지연 로딩) |

---

## 4. 디버깅 가이드

### 검은 화면 문제 디버깅

1. **브라우저 개발자 도구 열기** (F12)
2. **Console 탭 확인**: JavaScript 에러 메시지 확인
3. **Network 탭 확인**: JS 파일 로딩 상태 (특히 `index-*.js`)
4. **Application 탭**: Service Worker 상태 확인

### 순환 의존성 찾기

```bash
# Vite 빌드 로그에서 순환 의존성 경고 확인
npm run build 2>&1 | grep -i "circular"

# rollup-plugin-visualizer로 의존성 시각화
npm install --save-dev rollup-plugin-visualizer
```

### 청크 분석

빌드 후 `dist/assets/` 폴더의 청크 파일 크기 확인:

```bash
# 빌드 결과 분석
npm run build
ls -la dist/assets/*.js | sort -k5 -n
```

### Service Worker 초기화

브라우저에서 캐시 문제 발생 시:
1. 개발자 도구 → Application → Service Workers
2. "Unregister" 클릭
3. 페이지 새로고침 (Ctrl+Shift+R)

---

## 관련 문서

- [배포 가이드](./deployment-guide.md)
- [Vite 설정](../../../vite.config.ts)
- [PWA 설정](../../../vite.config.ts#L17-L220)

---

## 변경 이력

| 날짜 | 내용 | 커밋 |
|------|------|------|
| 2025-11-23 | 문서 작성 - Octokit Lazy Init, Admin 청크 순환 의존성 | `237b80a`, `f968dda` |
