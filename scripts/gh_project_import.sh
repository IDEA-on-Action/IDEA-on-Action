#!/usr/bin/env bash
set -euo pipefail

# ====== 설정 ======
OWNER="IDEA-on-Action"               # 사용자/조직 소유자
REPO="idea-on-action"                # 대상 리포
PROJECT_NAME="IDEA-on-Action v2.0 Build"
PROJECT_DESC="Version 2.0: IA 확장 & 커뮤니티형 전환 (3 Sprint)"
LABEL_DEFAULT="v2.0"

# ====== 이슈 정의 (제목|본문|라벨|우선순위|스프린트|상태) ======
# 라벨은 콤마(,)로 구분. 담당자 지정 필요 시 '@username'을 body 맨끝에 'Assignees:'로 추가 가능.
read -r -d '' ISSUES <<'EOF'
🧭 EPIC - Version 2.0 IA & Community Transformation|**Goal:** 사이트를 커뮤니티형 구조로 전환
- About/Roadmap/Portfolio/Now/Lab/Community/Blog/Work-with-Us
- 3 Sprint 운영, KPI: 페이지 정상동작, Supabase 연동, Giscus, Metrics 자동화|epic,v2.0,planning|High|All|Backlog
[feat] Routing & Page Scaffolding|React Router 기반 페이지 구조 및 템플릿 추가|feature,structure,sprint1|High|Sprint 1|Backlog
[feat] Home 4-Block 구성|Home에 Now/Roadmap/Portfolio/Bounty 섹션 추가 (Hero 재활용)|uiux,feature,sprint1|High|Sprint 1|Backlog
[data] JSON Mock Data 구성|프로젝트/로드맵/로그/바운티 초기 JSON (/src/data) 작성|data,sprint1|Medium|Sprint 1|Backlog
[infra] Supabase Schema & Connection|Supabase 스키마 생성 및 .env 연결 테스트|infra,backend,sprint2|High|Sprint 2|Backlog
[data] Supabase CRUD API 연동|프로젝트/로그/바운티 등 데이터 CRUD 연결|backend,api,sprint2|High|Sprint 2|Backlog
[community] Giscus Comment 임베드|Community/Blog에 Giscus 추가, GitHub Discussions 연동|community,uiux,sprint2|Medium|Sprint 2|Backlog
[feat] Work with Us 폼 + Webhook|의뢰/협업 폼 제작 및 Slack/Email Webhook 알림|feature,form,sprint2|Medium|Sprint 2|Backlog
[feat] Blog & Weekly Recap 자동화|Logs → Weekly Recap 자동 초안(Supabase Function)|automation,content,sprint3|Medium|Sprint 3|Backlog
[feat] Status(Open Metrics) 페이지|프로젝트/커뮤니티/바운티 지표 시각화(/status)|feature,metrics,sprint3|Medium|Sprint 3|Backlog
[ops] Event Tracking 추가|Plausible/PostHog 이벤트 (view_home/cta_click/apply_bounty 등)|ops,analytics,sprint3|Medium|Sprint 3|Backlog
[test] Vitest 단위 테스트|컴포넌트 렌더/데이터 매퍼 테스트|test,sprint3|Low|Sprint 3|Backlog
[test] Playwright E2E 테스트|홈→포트폴리오→상세 / 폼 제출 / 댓글 작성 시나리오 자동화|test,e2e,sprint3|Low|Sprint 3|Backlog
[ops] Lighthouse CI + SEO 설정|Lighthouse CI 유지, sitemap/robots/meta/JSON-LD 설정|ops,seo,sprint3|Low|Sprint 3|Backlog
EOF

# ====== 함수 ======
json_get() { jq -r "$1"; }

ensure_tool() {
  command -v gh >/dev/null || { echo "❌ gh(https://cli.github.com) 필요"; exit 1; }
  command -v jq >/dev/null || { echo "❌ jq 필요 (brew install jq)"; exit 1; }
}

create_project() {
  echo "📦 Creating project: $PROJECT_NAME"
  local pj
  pj=$(gh project create "$PROJECT_NAME" --owner "$OWNER" --description "$PROJECT_DESC" --format json)
  echo "$pj" | json_get '.number'
}

get_field_id() {
  local project_number="$1" field_name="$2"
  gh project field-list "$project_number" --owner "$OWNER" --format json | jq -r ".[] | select(.name==\"$field_name\") | .id"
}

ensure_field() {
  local project_number="$1" field_name="$2" field_type="$3" options="$4"
  local fid
  fid=$(get_field_id "$project_number" "$field_name")
  if [[ -z "$fid" || "$fid" == "null" ]]; then
    echo "➕ Creating field: $field_name"
    if [[ "$field_type" == "single_select" ]]; then
      gh project field-create "$project_number" --owner "$OWNER" --name "$field_name" --type "$field_type" --options "$options" >/dev/null
    else
      gh project field-create "$project_number" --owner "$OWNER" --name "$field_name" --type "$field_type" >/dev/null
    fi
    fid=$(get_field_id "$project_number" "$field_name")
  fi
  echo "$fid"
}

add_issue_to_project() {
  local project_number="$1" issue_url="$2"
  gh project item-add --owner "$OWNER" --project-number "$project_number" --url "$issue_url" --format json | json_get '.id'
}

set_item_field() {
  local project_number="$1" item_id="$2" field_name="$3" value="$4"
  gh project item-edit --owner "$OWNER" --project-number "$project_number" --id "$item_id" --field "$field_name" --value "$value" >/dev/null
}

# ====== 실행 ======
ensure_tool

# 1) Project 만들기
PROJECT_NUMBER=$(create_project)
echo "✅ Project #$PROJECT_NUMBER created."

# 2) 커스텀 필드 보장 (Status는 기본 제공일 수 있으나 안전하게 생성 시도)
STATUS_ID=$(ensure_field "$PROJECT_NUMBER" "Status" "single_select" "Backlog,In Progress,Done")
SPRINT_ID=$(ensure_field "$PROJECT_NUMBER" "Sprint" "single_select" "Sprint 1,Sprint 2,Sprint 3,All")
PRIORITY_ID=$(ensure_field "$PROJECT_NUMBER" "Priority" "single_select" "High,Medium,Low")

# 3) 이슈 생성 → 프로젝트에 추가 → 필드 세팅
echo "$ISSUES" | while IFS=$'\n' read -r line; do
  [[ -z "$line" ]] && continue
  IFS='|' read -r TITLE BODY LABELS PRIORITY SPRINT STATUS <<< "$line"

  echo "📝 Creating issue: $TITLE"
  ISSUE_JSON=$(gh issue create -R "$OWNER/$REPO" --title "$TITLE" --body "$BODY" --label "$LABELS,$LABEL_DEFAULT" --json number,url)
  ISSUE_URL=$(echo "$ISSUE_JSON" | json_get '.url')

  echo "➕ Adding to project..."
  ITEM_ID=$(add_issue_to_project "$PROJECT_NUMBER" "$ISSUE_URL")

  echo "⚙️  Setting fields (Status=$STATUS, Sprint=$SPRINT, Priority=$PRIORITY)"
  set_item_field "$PROJECT_NUMBER" "$ITEM_ID" "Status" "$STATUS"
  set_item_field "$PROJECT_NUMBER" "$ITEM_ID" "Sprint" "$SPRINT"
  set_item_field "$PROJECT_NUMBER" "$ITEM_ID" "Priority" "$PRIORITY"

  echo "✅ Added: $TITLE → $ISSUE_URL"
done

echo "🎉 Done. Open your project: https://github.com/orgs/$OWNER/projects/$PROJECT_NUMBER"
