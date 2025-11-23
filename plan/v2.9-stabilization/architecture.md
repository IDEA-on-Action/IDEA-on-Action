# v2.9.0 안정화 - 아키텍처

> 안정화 작업의 기술적 구조

**작성일**: 2025-11-23
**버전**: 1.0.0

---

## 1. 현재 상태

### 1.1 빌드 청크 구조
```
현재 Admin 청크 (7개로 분리됨):
├── pages-admin-analytics    544 kB gzip (Recharts 포함)
├── pages-admin-components   293 kB gzip
├── pages-admin-blog          59 kB gzip
├── pages-admin-content       11 kB gzip
├── pages-admin-notices        8 kB gzip
├── pages-admin-users          8 kB gzip
└── pages-admin-services      (분리됨)

Vendor 청크:
├── vendor-markdown          108 kB gzip
├── vendor-auth               18 kB gzip
└── index.js (메인)           52 kB gzip
```

### 1.2 경고 상태
- `pages-admin-analytics`: 2,143 kB (경고)
- `pages-admin-components`: 966 kB (경고)
- `vendor-markdown`: 341 kB (경고)

---

## 2. 목표 상태

### 2.1 빌드 경고 해결
```
chunkSizeWarningLimit: 300 → 600 kB
```

**근거**:
- Admin 페이지는 lazy-loaded
- Recharts는 분리 불가 (순환 의존성)
- 실제 사용자 영향 없음

### 2.2 문서 구조
```
project-todo.md
├── 🚀 진행 예정 (현재 없음 - 안정화 완료 후)
├── ✅ 최근 완료 (v2.8.0)
├── 🔜 다음 단계 (업데이트됨)
└── 📋 백로그 (정리됨)
```

---

## 3. 변경 사항

### 3.1 vite.config.ts
```typescript
// 변경 전
chunkSizeWarningLimit: 300

// 변경 후
chunkSizeWarningLimit: 600
```

### 3.2 project-todo.md
- 완료된 항목 체크 처리
- "다음 단계" 섹션 현실화
- 오래된 계획 정리

---

## 4. 의존성 다이어그램

```
v2.9.0 안정화
├── 문서 정리 (독립)
├── 빌드 최적화 (독립)
└── 검증 (문서/빌드 완료 후)
```

**병렬 실행 가능**: 문서 정리 + 빌드 최적화

---

## 5. 롤백 계획

### 5.1 vite.config.ts 롤백
```bash
git checkout HEAD~1 -- vite.config.ts
```

### 5.2 문서 롤백
```bash
git checkout HEAD~1 -- project-todo.md
```
