#!/bin/bash

# =====================================================
# Sandbox 환경 리셋 스크립트
# =====================================================
# 목적: Minu Sandbox 환경 데이터베이스 초기화
# 사용법: ./scripts/reset-sandbox.sh [sandbox-project-ref]
# 참조: plan/minu-sandbox-setup.md
# =====================================================

set -e  # 에러 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# =====================================================
# 1. 인자 확인
# =====================================================
SANDBOX_PROJECT_REF="${1:-}"

if [ -z "$SANDBOX_PROJECT_REF" ]; then
  log_error "Sandbox 프로젝트 Ref가 제공되지 않았습니다."
  echo ""
  echo "사용법: ./scripts/reset-sandbox.sh <sandbox-project-ref>"
  echo ""
  echo "예시: ./scripts/reset-sandbox.sh abc123xyz456"
  echo ""
  echo "프로젝트 Ref는 Supabase 대시보드 Settings > General에서 확인할 수 있습니다."
  exit 1
fi

log_info "Sandbox 프로젝트 Ref: $SANDBOX_PROJECT_REF"

# =====================================================
# 2. Supabase CLI 설치 확인
# =====================================================
if ! command -v supabase &> /dev/null; then
  log_error "Supabase CLI가 설치되어 있지 않습니다."
  echo ""
  echo "설치 방법:"
  echo "  npm install -g supabase"
  echo ""
  echo "또는 공식 문서 참조: https://supabase.com/docs/guides/cli"
  exit 1
fi

log_info "Supabase CLI 버전: $(supabase --version)"

# =====================================================
# 3. 사용자 확인
# =====================================================
echo ""
log_warn "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_warn "⚠️  경고: 이 작업은 Sandbox 데이터베이스를 완전히 초기화합니다."
log_warn "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "다음 작업이 수행됩니다:"
echo "  1. 모든 데이터 삭제"
echo "  2. 마이그레이션 재실행"
echo "  3. 시드 데이터 재생성 (OAuth 클라이언트, 테스트 계정)"
echo ""
read -p "계속하시겠습니까? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  log_info "작업이 취소되었습니다."
  exit 0
fi

# =====================================================
# 4. 데이터베이스 리셋
# =====================================================
log_info "🔄 Sandbox 데이터베이스 리셋 시작..."

# DB 리셋 (로컬 설정 파일 사용)
# 주의: 이 명령은 supabase/config.toml에 정의된 프로젝트에 대해 실행됩니다
log_info "마이그레이션 롤백 중..."
supabase db reset --project-ref "$SANDBOX_PROJECT_REF" --linked

if [ $? -ne 0 ]; then
  log_error "데이터베이스 리셋 실패"
  exit 1
fi

log_info "✅ 데이터베이스 리셋 완료!"

# =====================================================
# 5. 마이그레이션 재실행
# =====================================================
log_info "🔄 마이그레이션 재실행 중..."

supabase db push --project-ref "$SANDBOX_PROJECT_REF" --linked

if [ $? -ne 0 ]; then
  log_error "마이그레이션 실행 실패"
  exit 1
fi

log_info "✅ 마이그레이션 완료!"

# =====================================================
# 6. 시드 데이터 검증
# =====================================================
log_info "🔍 시드 데이터 검증 중..."

# OAuth 클라이언트 개수 확인
OAUTH_CLIENTS_COUNT=$(supabase db query \
  --project-ref "$SANDBOX_PROJECT_REF" \
  --sql "SELECT COUNT(*) FROM public.oauth_clients WHERE metadata->>'environment' = 'sandbox';" \
  --output json | jq -r '.[0].count')

# 테스트 계정 개수 확인
TEST_USERS_COUNT=$(supabase db query \
  --project-ref "$SANDBOX_PROJECT_REF" \
  --sql "SELECT COUNT(*) FROM auth.users WHERE email LIKE 'test-%@ideaonaction.ai';" \
  --output json | jq -r '.[0].count')

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "✅ Sandbox 환경 리셋 완료!"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "시드 데이터:"
echo "  - OAuth 클라이언트: $OAUTH_CLIENTS_COUNT (예상: 4개)"
echo "  - 테스트 계정: $TEST_USERS_COUNT (예상: 5개)"
echo ""
log_info "다음 단계:"
echo "  1. OAuth Client Secret 확인:"
echo "     SELECT client_id, client_secret FROM public.oauth_clients WHERE metadata->>'environment' = 'sandbox';"
echo ""
echo "  2. 테스트 계정 로그인:"
echo "     - Email: test-free@ideaonaction.ai"
echo "     - Password: Test1234!"
echo ""
echo "  3. E2E 테스트 실행:"
echo "     npm run test:e2e:sandbox"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit 0
