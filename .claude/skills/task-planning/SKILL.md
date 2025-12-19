---
name: task-planning
description: 다음 작업 계획 및 우선순위 분석. 작업, 계획, 다음, next, plan, todo 키워드에 자동 활성화.
allowed-tools: Read, Grep, Glob
---

# Task Planning Skill

## 데이터 소스

### 주요 문서

| 문서 | 경로 | 용도 |
|------|------|------|
| 현재 상태 | `project-todo.md` | 진행 중 작업 |
| 컨텍스트 | `.github/SHARED_TASK_NOTES.md` | 실패/다음 우선순위 |
| 스프린트 | `tasks/*/sprint-*.md` | 상세 작업 목록 |
| 로드맵 | `docs/project/roadmap.md` | 장기 계획 |

---

## 분석 명령어

### 진행 중 작업 확인

```bash
grep -E "⏳|🚀|진행" project-todo.md
```

### 완료율 계산

```bash
grep -c "\[x\]" tasks/*/sprint-*.md
grep -c "\[ \]" tasks/*/sprint-*.md
```

### 우선순위 항목

```bash
grep -E "⭐|P0|P1|긴급" project-todo.md tasks/*/sprint-*.md
```

### 차단 사항 확인

```bash
grep -E "차단|블록|대기|의존" .github/SHARED_TASK_NOTES.md
```

### 버전 확인

```bash
grep '"version"' package.json
grep "현재 버전" CLAUDE.md
```

---

## 우선순위 결정

### P0 (즉시)
- 빌드/테스트 실패 수정
- 프로덕션 이슈
- 차단 사항 해제

### P1 (높음)
- ⭐ 표시 작업
- 현재 스프린트 목표
- 의존성 해결됨

### P2 (중간)
- 백로그 상위 항목
- 기술 부채

### P3 (낮음)
- 백로그 하위 항목
- 최적화/개선

---

## 상태 기호 해석

```
완료:    ✅ [x]
진행중:  🚀 ⏳
계획중:  📋 [ ]
대기:    ⏳
실패:    ❌
```

### 예상 시간

```
⏱️ 30분    작은 작업
⏱️ 2시간   중간 작업
⏱️ 1일     큰 작업
```

---

## 출력 템플릿

### 작업 카드

| 항목 | 값 |
|------|---|
| Task ID | Task-XX-NNN |
| 제목 | 작업명 |
| 예상 시간 | ⏱️ X시간 |
| 우선순위 | P0/P1/P2 |
| 의존성 | Task-YY |
| 상태 | 📋/🚀/✅ |

### 체크리스트 형식

```markdown
**체크리스트**:
- [ ] 항목 1
- [ ] 항목 2
- [ ] 항목 3

**관련 파일**:
- `src/path/file.ts`
```

---

## project-inspector 연계

상태 점검 결과가 있는 경우:

```
project-inspector 결과:
- 🔴 빌드 실패 → P0 작업으로 자동 승격
- 🟡 린트 경고 → P2 작업으로 추가
- 🟢 양호 → 정상 우선순위 유지
```

---

## 주의사항

1. **읽기 전용** - 이 Skill은 분석만 수행
2. **project-inspector 연계** - 상태 점검 결과 참조 가능
3. **KST 시간대** 기준
4. **한글 출력**
