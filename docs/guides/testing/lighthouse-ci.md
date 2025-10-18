# Lighthouse CI 가이드

## 📋 개요

Lighthouse CI는 Core Web Vitals와 성능, 접근성, SEO 점수를 자동으로 측정하고 검증하는 도구입니다.

**측정 항목**:
- **Performance**: 90+ (권장)
- **Accessibility**: 95+ (권장)
- **Best Practices**: 90+ (권장)
- **SEO**: 90+ (권장)

**Core Web Vitals**:
- **FCP** (First Contentful Paint): <2000ms
- **LCP** (Largest Contentful Paint): <2500ms
- **CLS** (Cumulative Layout Shift): <0.1
- **TBT** (Total Blocking Time): <300ms

---

## 🛠️ 설정

### 1. 패키지 설치

```bash
npm install --save-dev @lhci/cli
```

### 2. 설정 파일 (`lighthouserc.json`)

```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "startServerCommand": "npm run preview",
      "startServerReadyPattern": "Local:.*http://localhost:4173",
      "url": [
        "http://localhost:4173/",
        "http://localhost:4173/services",
        "http://localhost:4173/login"
      ]
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.95}],
        "categories:best-practices": ["error", {"minScore": 0.9}],
        "categories:seo": ["error", {"minScore": 0.9}],
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}],
        "largest-contentful-paint": ["error", {"maxNumericValue": 2500}],
        "cumulative-layout-shift": ["error", {"maxNumericValue": 0.1}],
        "total-blocking-time": ["error", {"maxNumericValue": 300}]
      }
    }
  }
}
```

---

## 🚀 로컬 실행

### 전체 프로세스 (빌드 → 수집 → 검증)

```bash
# 1. 프로덕션 빌드
npm run build

# 2. Lighthouse CI 실행 (자동으로 preview 서버 시작)
npm run lighthouse
```

### 단계별 실행

```bash
# 1. 빌드
npm run build

# 2. 미리보기 서버 시작 (별도 터미널)
npm run preview

# 3. 데이터 수집만 (3회 측정)
npm run lighthouse:collect

# 4. 임계값 검증만
npm run lighthouse:assert

# 5. 결과 업로드 (temporary-public-storage)
npm run lighthouse:upload
```

---

## 📊 결과 해석

### CLI 출력 예시

```
✅ Performance score: 92
✅ Accessibility score: 98
✅ Best Practices score: 95
✅ SEO score: 100

Core Web Vitals:
✅ FCP: 1234ms
✅ LCP: 1890ms
✅ CLS: 0.05
✅ TBT: 145ms
```

### 실패 예시

```
❌ Performance score: 85 (expected >= 90)
❌ LCP: 2800ms (expected < 2500ms)

Assertion failed!
```

---

## 🔄 CI/CD 통합

### GitHub Actions 워크플로우

`.github/workflows/lighthouse.yml`에서 자동 실행:

**트리거**:
- PR 생성 시 (`main`, `staging`, `develop` 브랜치)
- `main`, `staging` 브랜치 푸시 시

**단계**:
1. 코드 체크아웃
2. Node.js 20 설정
3. 의존성 설치 (`npm ci`)
4. 프로덕션 빌드
5. Lighthouse CI 실행
6. 결과를 PR 코멘트로 추가
7. 상세 리포트를 Artifacts에 업로드

### PR 코멘트 예시

```markdown
## 🔍 Lighthouse CI Results

| URL | Performance | Accessibility | Best Practices | SEO |
|-----|-------------|---------------|----------------|-----|
| / | 92 | 98 | 95 | 100 |
| /services | 90 | 97 | 93 | 98 |
| /login | 94 | 99 | 96 | 100 |

### Core Web Vitals

| URL | FCP (ms) | LCP (ms) | CLS | TBT (ms) |
|-----|----------|----------|-----|----------|
| / | 1234 | 1890 | 0.05 | 145 |
| /services | 1456 | 2100 | 0.08 | 210 |
| /login | 1123 | 1678 | 0.03 | 98 |

**Thresholds:**
- ✅ Performance: 90+ | Accessibility: 95+ | Best Practices: 90+ | SEO: 90+
- ✅ FCP: <2000ms | LCP: <2500ms | CLS: <0.1 | TBT: <300ms

[View detailed reports in artifacts](...)
```

---

## 🔧 트러블슈팅

### 1. "Server did not start" 오류

**원인**: Preview 서버가 시작되지 않음

**해결**:
```bash
# 수동으로 preview 서버 테스트
npm run build
npm run preview

# 다른 터미널에서
npm run lighthouse:collect
```

### 2. 점수가 낮게 나올 때

**Performance 점수 개선**:
- 이미지 최적화 (WebP, lazy loading)
- 코드 분할 (React.lazy, dynamic imports)
- 번들 크기 줄이기 (tree shaking, minification)

**Accessibility 점수 개선**:
- `aria-label` 추가 (아이콘 버튼, 이미지)
- `alt` 속성 추가 (모든 이미지)
- 색상 대비 개선 (WCAG AA 기준)

**Best Practices 점수 개선**:
- HTTPS 사용
- 콘솔 에러 제거
- 안전한 라이브러리 사용

**SEO 점수 개선**:
- `<meta>` 태그 추가 (description, keywords)
- `<title>` 태그 최적화
- 시맨틱 HTML 사용

### 3. CI에서만 실패하는 경우

**원인**: 환경 변수 누락

**해결**:
```bash
# GitHub Secrets 설정 확인
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

---

## 📚 추가 리소스

- [Lighthouse 공식 문서](https://developer.chrome.com/docs/lighthouse/)
- [Lighthouse CI 공식 문서](https://github.com/GoogleChrome/lighthouse-ci)
- [Core Web Vitals 가이드](https://web.dev/vitals/)
- [Performance 최적화 가이드](https://web.dev/fast/)

---

## 📝 체크리스트

**로컬 테스트**:
- [ ] `npm run build` 성공
- [ ] `npm run lighthouse` 실행
- [ ] 모든 임계값 통과
- [ ] `.lighthouseci/` 디렉토리 생성 확인

**CI/CD 통합**:
- [ ] GitHub Secrets 설정 (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] PR 생성 시 워크플로우 실행 확인
- [ ] PR 코멘트에 결과 표시 확인
- [ ] Artifacts에 리포트 업로드 확인

**임계값 조정** (필요시):
- [ ] `lighthouserc.json`의 `minScore` 값 조정
- [ ] `maxNumericValue` 값 조정 (ms 단위)
- [ ] 프로젝트 요구사항에 맞게 커스터마이징
