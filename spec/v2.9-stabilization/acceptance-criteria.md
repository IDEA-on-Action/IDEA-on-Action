# v2.9.0 안정화 - 수용 기준

> 각 요구사항의 완료 기준 정의

**작성일**: 2025-11-23
**버전**: 1.0.0

---

## 1. 문서 정리 (FR-001)

### AC-001-1: project-todo.md 완료 항목 업데이트
- [ ] CMS Phase 5 항목이 완료로 체크됨
- [ ] Newsletter E2E 테스트 항목이 완료로 체크됨
- [ ] CSV Export 기능 항목이 완료로 체크됨
- [ ] 미디어 라이브러리 항목이 완료로 체크됨
- [ ] 리치 텍스트 에디터 항목이 완료로 체크됨

### AC-001-2: "다음 단계" 섹션 재정의
- [ ] v2.8.0 완료 상태 반영
- [ ] 실제 남은 작업만 표시
- [ ] 우선순위가 명확히 정의됨

### AC-001-3: 오래된 계획 항목 아카이브
- [ ] 완료된 Phase 항목이 아카이브로 이동
- [ ] 백로그가 현실적으로 정리됨

---

## 2. 빌드 최적화 (FR-002)

### AC-002-1: chunkSizeWarningLimit 조정
- [ ] 빌드 시 경고 메시지 없음
- [ ] chunkSizeWarningLimit이 적절한 값으로 설정됨

### AC-002-2: vite.config.ts 주석 정리
- [ ] 오래된 주석 제거
- [ ] 현재 청크 구조에 맞는 주석 업데이트

---

## 3. 코드 품질 (FR-003)

### AC-003-1: ESLint 검토
- [ ] `npm run lint` 실행 시 에러 0개
- [ ] 경고가 합리적인 수준 (30개 이하)

### AC-003-2: TypeScript 검증
- [ ] `npx tsc --noEmit` 에러 0개

---

## 4. 최종 검증

### 빌드 검증
```bash
npm run build
# ✓ built in 30s 이내
# ✓ 경고 없음
```

### 린트 검증
```bash
npm run lint
# 0 errors
```

### Git 상태
```bash
git status
# nothing to commit, working tree clean
```

---

## 5. 완료 기준 (Definition of Done)

- [ ] 모든 AC 항목 체크됨
- [ ] 빌드 성공 (경고 없음)
- [ ] 린트 통과
- [ ] Git 커밋 완료
- [ ] 문서 동기화 완료
