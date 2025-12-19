---
name: commit-helper
description: Git 커밋 메시지 생성 시 사용. commit, 커밋 키워드에 자동 활성화.
allowed-tools: Bash, Read
---

# Commit Message Helper

## 커밋 메시지 형식

```
<type>: <subject>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

## Type 종류

| Type | 설명 |
|------|------|
| feat | 새로운 기능 |
| fix | 버그 수정 |
| docs | 문서 변경 |
| refactor | 리팩토링 |
| test | 테스트 추가/수정 |
| chore | 빌드/설정 변경 |
| perf | 성능 개선 |
| style | 코드 스타일 변경 |

## 작성 규칙

- 한글로 작성
- 제목: 50자 이내
- What과 Why 설명 (How는 X)
- 현재형 동사 사용

## 예시

```
feat: 사용자 로그인 기능 추가

Google OAuth 연동을 통한 소셜 로그인 구현
- 로그인/로그아웃 플로우 완성
- 세션 관리 훅 추가

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

## 명령어

```bash
# 변경 사항 확인
git diff --staged

# 커밋 생성 (HEREDOC 사용)
git commit -m "$(cat <<'EOF'
커밋 메시지
EOF
)"
```
