# Reports

프로젝트의 성능, 리팩토링, 최적화 관련 분석 보고서를 보관합니다.

## 폴더 구조

### performance/
프론트엔드 성능 관련 분석 보고서
- 번들 크기 분석
- 런타임 성능 개선
- PWA 캐시 최적화
- Lighthouse 성능 측정

### refactoring/
코드 리팩토링 관련 보고서
- Phase별 리팩토링 요약
- 코드 품질 개선 기록
- TypeScript 타입 개선
- ESLint 에러 수정

## 보고서 작성 가이드

### 파일명 규칙
```
{type}-{description}-YYYY-MM-DD.md
```

예시:
- `bundle-optimization-report-2025-11-15.md`
- `phase4-dependencies-cleanup-2025-11-16.md`

### 필수 포함 사항
- 작업 목표
- 변경 사항 요약
- Before/After 비교 (수치, 코드)
- 빌드 통계
- 교훈 및 개선 사항

## 최근 보고서

### Performance
- `chunk-splitting-issues-2025-11-23.md` - Vite 청크 분리 시 React 의존성 문제 해결 ⭐ 신규
- `admin-chunk-separation-report.md` - Admin 코드 분리 (번들 38% 감소)

### Refactoring
- `final-summary-phase1-5-2025-11-16.md` - Phase 1-5 전체 요약 (1일 완료)
- `phase5-selective-optimization-2025-11-16.md` - 선택적 최적화 (초기 번들 32% 감소)
- `phase4-dependencies-cleanup-2025-11-16.md` - Dependencies 정리 (13개 라이브러리 제거)
- `phase3-parallel-summary-2025-11-16.md` - Vite Bundle 최적화 (vendor-react 89% 감소)
- `bundle-optimization-report-2025-11-15.md` - 번들 최적화 Phase 3
- `useSearch-test-typescript-cleanup.md` - TypeScript 타입 개선

## 관련 문서
- [프로젝트 로드맵](../project/roadmap.md)
- [변경 로그](../project/changelog.md)
- [테스트 가이드](../guides/testing/)
