#!/bin/bash
# =============================================================================
# Compass Navigator MCP Server - 배포 스크립트
# =============================================================================
# 프로덕션 배포를 위한 자동화 스크립트
# 이미지 빌드, 컨테이너 시작, 헬스체크, 롤백 기능 포함
# =============================================================================

set -e  # 에러 발생 시 스크립트 중단

# -----------------------------------------------------------------------------
# 설정 변수
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
COMPOSE_PROD_FILE="$PROJECT_DIR/docker-compose.prod.yml"
SERVICE_NAME="mcp-server"
IMAGE_NAME="compass-mcp-server"
BACKUP_TAG="backup-$(date +%Y%m%d%H%M%S)"
HEALTH_CHECK_URL="http://localhost:3001/health"
MAX_HEALTH_RETRIES=30
HEALTH_RETRY_INTERVAL=2

# 색상 정의 (출력 가독성 향상)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# 유틸리티 함수
# -----------------------------------------------------------------------------

# 로그 출력 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# 사용법 출력
usage() {
    echo "사용법: $0 [명령어] [옵션]"
    echo ""
    echo "명령어:"
    echo "  build       이미지 빌드"
    echo "  start       컨테이너 시작 (프로덕션 모드)"
    echo "  stop        컨테이너 중지"
    echo "  restart     컨테이너 재시작"
    echo "  deploy      전체 배포 (빌드 + 시작 + 헬스체크)"
    echo "  rollback    이전 버전으로 롤백"
    echo "  status      컨테이너 상태 확인"
    echo "  logs        컨테이너 로그 확인"
    echo "  health      헬스체크 수행"
    echo "  clean       미사용 이미지 정리"
    echo ""
    echo "옵션:"
    echo "  --dev       개발 모드 사용 (docker-compose.yml만 사용)"
    echo "  --no-cache  빌드 시 캐시 사용 안 함"
    echo "  -h, --help  도움말 출력"
    echo ""
    echo "예시:"
    echo "  $0 deploy              # 전체 배포 (프로덕션)"
    echo "  $0 deploy --dev        # 개발 모드 배포"
    echo "  $0 build --no-cache    # 캐시 없이 빌드"
    echo "  $0 rollback            # 롤백"
}

# -----------------------------------------------------------------------------
# 핵심 함수
# -----------------------------------------------------------------------------

# 환경 확인
check_environment() {
    log_info "환경 확인 중..."

    # Docker 설치 확인
    if ! command -v docker &> /dev/null; then
        log_error "Docker가 설치되지 않았습니다."
        exit 1
    fi

    # Docker Compose 확인
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose가 설치되지 않았습니다."
        exit 1
    fi

    # .env 파일 확인
    if [[ ! -f "$PROJECT_DIR/.env" ]]; then
        log_warning ".env 파일이 없습니다. .env.example을 복사해주세요."
        log_info "cp $PROJECT_DIR/.env.example $PROJECT_DIR/.env"
    fi

    log_success "환경 확인 완료"
}

# 이미지 빌드
build_image() {
    local no_cache=$1
    log_info "Docker 이미지 빌드 중..."

    cd "$PROJECT_DIR"

    local build_args=""
    if [[ "$no_cache" == "true" ]]; then
        build_args="--no-cache"
        log_info "캐시 없이 빌드합니다."
    fi

    # 현재 이미지 백업 (있는 경우)
    if docker images "$IMAGE_NAME:latest" --format "{{.ID}}" | grep -q .; then
        log_info "현재 이미지를 백업합니다: $IMAGE_NAME:$BACKUP_TAG"
        docker tag "$IMAGE_NAME:latest" "$IMAGE_NAME:$BACKUP_TAG" 2>/dev/null || true
    fi

    # 이미지 빌드
    if [[ "$DEV_MODE" == "true" ]]; then
        docker compose -f "$COMPOSE_FILE" build $build_args
    else
        docker compose -f "$COMPOSE_FILE" -f "$COMPOSE_PROD_FILE" build $build_args
    fi

    log_success "이미지 빌드 완료"
}

# 컨테이너 시작
start_container() {
    log_info "컨테이너 시작 중..."

    cd "$PROJECT_DIR"

    if [[ "$DEV_MODE" == "true" ]]; then
        docker compose -f "$COMPOSE_FILE" up -d
    else
        docker compose -f "$COMPOSE_FILE" -f "$COMPOSE_PROD_FILE" up -d
    fi

    log_success "컨테이너 시작됨"
}

# 컨테이너 중지
stop_container() {
    log_info "컨테이너 중지 중..."

    cd "$PROJECT_DIR"

    if [[ "$DEV_MODE" == "true" ]]; then
        docker compose -f "$COMPOSE_FILE" down
    else
        docker compose -f "$COMPOSE_FILE" -f "$COMPOSE_PROD_FILE" down
    fi

    log_success "컨테이너 중지됨"
}

# 헬스체크 수행
health_check() {
    log_info "헬스체크 수행 중... (최대 ${MAX_HEALTH_RETRIES}회 시도)"

    local retry_count=0

    while [[ $retry_count -lt $MAX_HEALTH_RETRIES ]]; do
        if curl -s -f "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            log_success "헬스체크 성공! 서버가 정상 작동 중입니다."
            return 0
        fi

        retry_count=$((retry_count + 1))
        log_info "헬스체크 시도 $retry_count/$MAX_HEALTH_RETRIES... 대기 중"
        sleep $HEALTH_RETRY_INTERVAL
    done

    log_error "헬스체크 실패! 서버가 응답하지 않습니다."
    return 1
}

# 롤백 수행
rollback() {
    log_warning "롤백 수행 중..."

    # 최신 백업 이미지 찾기
    local backup_image=$(docker images "$IMAGE_NAME:backup-*" --format "{{.Tag}}" | sort -r | head -1)

    if [[ -z "$backup_image" ]]; then
        log_error "백업 이미지를 찾을 수 없습니다."
        exit 1
    fi

    log_info "백업 이미지로 롤백: $IMAGE_NAME:$backup_image"

    # 현재 컨테이너 중지
    stop_container

    # 백업 이미지를 latest로 태그
    docker tag "$IMAGE_NAME:$backup_image" "$IMAGE_NAME:latest"

    # 컨테이너 재시작
    start_container

    # 헬스체크
    if health_check; then
        log_success "롤백 완료!"
    else
        log_error "롤백 후에도 헬스체크 실패. 수동 확인이 필요합니다."
        exit 1
    fi
}

# 컨테이너 상태 확인
show_status() {
    log_info "컨테이너 상태:"

    cd "$PROJECT_DIR"

    if [[ "$DEV_MODE" == "true" ]]; then
        docker compose -f "$COMPOSE_FILE" ps
    else
        docker compose -f "$COMPOSE_FILE" -f "$COMPOSE_PROD_FILE" ps
    fi

    echo ""
    log_info "리소스 사용량:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" 2>/dev/null | grep "$SERVICE_NAME" || echo "컨테이너가 실행 중이 아닙니다."
}

# 로그 확인
show_logs() {
    log_info "컨테이너 로그 (최근 100줄):"

    cd "$PROJECT_DIR"

    if [[ "$DEV_MODE" == "true" ]]; then
        docker compose -f "$COMPOSE_FILE" logs --tail=100 -f
    else
        docker compose -f "$COMPOSE_FILE" -f "$COMPOSE_PROD_FILE" logs --tail=100 -f
    fi
}

# 미사용 이미지 정리
clean_images() {
    log_info "미사용 이미지 정리 중..."

    # 오래된 백업 이미지 정리 (최근 3개만 유지)
    docker images "$IMAGE_NAME:backup-*" --format "{{.Tag}}" | sort -r | tail -n +4 | while read tag; do
        log_info "삭제: $IMAGE_NAME:$tag"
        docker rmi "$IMAGE_NAME:$tag" 2>/dev/null || true
    done

    # dangling 이미지 정리
    docker image prune -f

    log_success "정리 완료"
}

# 전체 배포
deploy() {
    local no_cache=$1

    log_info "=========================================="
    log_info "MCP Server 배포 시작"
    log_info "=========================================="

    check_environment
    build_image "$no_cache"

    # 기존 컨테이너 중지 (있는 경우)
    stop_container 2>/dev/null || true

    start_container

    # 헬스체크
    if health_check; then
        log_success "=========================================="
        log_success "배포 완료!"
        log_success "=========================================="
        show_status
    else
        log_error "헬스체크 실패! 롤백을 시도합니다..."
        rollback
    fi
}

# -----------------------------------------------------------------------------
# 메인 로직
# -----------------------------------------------------------------------------

# 옵션 파싱
DEV_MODE="false"
NO_CACHE="false"
COMMAND=""

while [[ $# -gt 0 ]]; do
    case $1 in
        build|start|stop|restart|deploy|rollback|status|logs|health|clean)
            COMMAND=$1
            shift
            ;;
        --dev)
            DEV_MODE="true"
            shift
            ;;
        --no-cache)
            NO_CACHE="true"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "알 수 없는 옵션: $1"
            usage
            exit 1
            ;;
    esac
done

# 명령어가 없으면 사용법 출력
if [[ -z "$COMMAND" ]]; then
    usage
    exit 1
fi

# 개발 모드 표시
if [[ "$DEV_MODE" == "true" ]]; then
    log_info "개발 모드로 실행합니다."
fi

# 명령어 실행
case $COMMAND in
    build)
        check_environment
        build_image "$NO_CACHE"
        ;;
    start)
        check_environment
        start_container
        ;;
    stop)
        stop_container
        ;;
    restart)
        stop_container
        start_container
        ;;
    deploy)
        deploy "$NO_CACHE"
        ;;
    rollback)
        rollback
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    health)
        health_check
        ;;
    clean)
        clean_images
        ;;
esac
