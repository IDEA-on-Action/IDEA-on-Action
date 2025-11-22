# =============================================================================
# Compass Navigator MCP Server - PowerShell 배포 스크립트
# =============================================================================
# Windows 환경을 위한 프로덕션 배포 스크립트
# 이미지 빌드, 컨테이너 시작, 헬스체크, 롤백 기능 포함
# =============================================================================

param(
    [Parameter(Position=0)]
    [ValidateSet("build", "start", "stop", "restart", "deploy", "rollback", "status", "logs", "health", "clean", "help")]
    [string]$Command = "help",

    [switch]$Dev,
    [switch]$NoCache
)

# -----------------------------------------------------------------------------
# 설정 변수
# -----------------------------------------------------------------------------
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$ComposeFile = Join-Path $ProjectDir "docker-compose.yml"
$ComposeProdFile = Join-Path $ProjectDir "docker-compose.prod.yml"
$ServiceName = "mcp-server"
$ImageName = "compass-mcp-server"
$BackupTag = "backup-$(Get-Date -Format 'yyyyMMddHHmmss')"
$HealthCheckUrl = "http://localhost:3001/health"
$MaxHealthRetries = 30
$HealthRetryInterval = 2

# -----------------------------------------------------------------------------
# 유틸리티 함수
# -----------------------------------------------------------------------------

function Write-LogInfo {
    param([string]$Message)
    Write-Host "[INFO] $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $Message" -ForegroundColor Cyan
}

function Write-LogSuccess {
    param([string]$Message)
    Write-Host "[SUCCESS] $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $Message" -ForegroundColor Green
}

function Write-LogWarning {
    param([string]$Message)
    Write-Host "[WARNING] $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $Message" -ForegroundColor Yellow
}

function Write-LogError {
    param([string]$Message)
    Write-Host "[ERROR] $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $Message" -ForegroundColor Red
}

function Show-Usage {
    Write-Host @"
사용법: .\deploy.ps1 <명령어> [옵션]

명령어:
  build       이미지 빌드
  start       컨테이너 시작 (프로덕션 모드)
  stop        컨테이너 중지
  restart     컨테이너 재시작
  deploy      전체 배포 (빌드 + 시작 + 헬스체크)
  rollback    이전 버전으로 롤백
  status      컨테이너 상태 확인
  logs        컨테이너 로그 확인
  health      헬스체크 수행
  clean       미사용 이미지 정리
  help        도움말 출력

옵션:
  -Dev        개발 모드 사용 (docker-compose.yml만 사용)
  -NoCache    빌드 시 캐시 사용 안 함

예시:
  .\deploy.ps1 deploy              # 전체 배포 (프로덕션)
  .\deploy.ps1 deploy -Dev         # 개발 모드 배포
  .\deploy.ps1 build -NoCache      # 캐시 없이 빌드
  .\deploy.ps1 rollback            # 롤백
"@
}

# -----------------------------------------------------------------------------
# 핵심 함수
# -----------------------------------------------------------------------------

function Test-Environment {
    Write-LogInfo "환경 확인 중..."

    # Docker 설치 확인
    try {
        $null = docker version 2>&1
    }
    catch {
        Write-LogError "Docker가 설치되지 않았거나 실행 중이 아닙니다."
        exit 1
    }

    # Docker Compose 확인
    try {
        $null = docker compose version 2>&1
    }
    catch {
        Write-LogError "Docker Compose가 설치되지 않았습니다."
        exit 1
    }

    # .env 파일 확인
    $EnvFile = Join-Path $ProjectDir ".env"
    if (-not (Test-Path $EnvFile)) {
        Write-LogWarning ".env 파일이 없습니다. .env.example을 복사해주세요."
        Write-LogInfo "Copy-Item `"$ProjectDir\.env.example`" `"$EnvFile`""
    }

    Write-LogSuccess "환경 확인 완료"
}

function Build-Image {
    param([bool]$UseNoCache)

    Write-LogInfo "Docker 이미지 빌드 중..."

    Set-Location $ProjectDir

    $buildArgs = @()
    if ($UseNoCache) {
        $buildArgs += "--no-cache"
        Write-LogInfo "캐시 없이 빌드합니다."
    }

    # 현재 이미지 백업 (있는 경우)
    $existingImage = docker images "$ImageName:latest" --format "{{.ID}}" 2>$null
    if ($existingImage) {
        Write-LogInfo "현재 이미지를 백업합니다: ${ImageName}:${BackupTag}"
        docker tag "${ImageName}:latest" "${ImageName}:${BackupTag}" 2>$null
    }

    # 이미지 빌드
    if ($Dev) {
        docker compose -f $ComposeFile build @buildArgs
    }
    else {
        docker compose -f $ComposeFile -f $ComposeProdFile build @buildArgs
    }

    if ($LASTEXITCODE -ne 0) {
        Write-LogError "이미지 빌드 실패"
        exit 1
    }

    Write-LogSuccess "이미지 빌드 완료"
}

function Start-Container {
    Write-LogInfo "컨테이너 시작 중..."

    Set-Location $ProjectDir

    if ($Dev) {
        docker compose -f $ComposeFile up -d
    }
    else {
        docker compose -f $ComposeFile -f $ComposeProdFile up -d
    }

    if ($LASTEXITCODE -ne 0) {
        Write-LogError "컨테이너 시작 실패"
        exit 1
    }

    Write-LogSuccess "컨테이너 시작됨"
}

function Stop-Container {
    Write-LogInfo "컨테이너 중지 중..."

    Set-Location $ProjectDir

    if ($Dev) {
        docker compose -f $ComposeFile down
    }
    else {
        docker compose -f $ComposeFile -f $ComposeProdFile down
    }

    Write-LogSuccess "컨테이너 중지됨"
}

function Test-Health {
    Write-LogInfo "헬스체크 수행 중... (최대 ${MaxHealthRetries}회 시도)"

    $retryCount = 0

    while ($retryCount -lt $MaxHealthRetries) {
        try {
            $response = Invoke-WebRequest -Uri $HealthCheckUrl -Method Get -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-LogSuccess "헬스체크 성공! 서버가 정상 작동 중입니다."
                return $true
            }
        }
        catch {
            # 요청 실패 - 재시도
        }

        $retryCount++
        Write-LogInfo "헬스체크 시도 ${retryCount}/${MaxHealthRetries}... 대기 중"
        Start-Sleep -Seconds $HealthRetryInterval
    }

    Write-LogError "헬스체크 실패! 서버가 응답하지 않습니다."
    return $false
}

function Invoke-Rollback {
    Write-LogWarning "롤백 수행 중..."

    # 최신 백업 이미지 찾기
    $backupImages = docker images "${ImageName}:backup-*" --format "{{.Tag}}" 2>$null | Sort-Object -Descending
    $backupImage = $backupImages | Select-Object -First 1

    if (-not $backupImage) {
        Write-LogError "백업 이미지를 찾을 수 없습니다."
        exit 1
    }

    Write-LogInfo "백업 이미지로 롤백: ${ImageName}:${backupImage}"

    # 현재 컨테이너 중지
    Stop-Container

    # 백업 이미지를 latest로 태그
    docker tag "${ImageName}:${backupImage}" "${ImageName}:latest"

    # 컨테이너 재시작
    Start-Container

    # 헬스체크
    if (Test-Health) {
        Write-LogSuccess "롤백 완료!"
    }
    else {
        Write-LogError "롤백 후에도 헬스체크 실패. 수동 확인이 필요합니다."
        exit 1
    }
}

function Show-Status {
    Write-LogInfo "컨테이너 상태:"

    Set-Location $ProjectDir

    if ($Dev) {
        docker compose -f $ComposeFile ps
    }
    else {
        docker compose -f $ComposeFile -f $ComposeProdFile ps
    }

    Write-Host ""
    Write-LogInfo "리소스 사용량:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" 2>$null | Select-String $ServiceName
}

function Show-Logs {
    Write-LogInfo "컨테이너 로그 (최근 100줄):"

    Set-Location $ProjectDir

    if ($Dev) {
        docker compose -f $ComposeFile logs --tail=100 -f
    }
    else {
        docker compose -f $ComposeFile -f $ComposeProdFile logs --tail=100 -f
    }
}

function Clear-Images {
    Write-LogInfo "미사용 이미지 정리 중..."

    # 오래된 백업 이미지 정리 (최근 3개만 유지)
    $backupImages = docker images "${ImageName}:backup-*" --format "{{.Tag}}" 2>$null | Sort-Object -Descending
    $imagesToDelete = $backupImages | Select-Object -Skip 3

    foreach ($tag in $imagesToDelete) {
        Write-LogInfo "삭제: ${ImageName}:${tag}"
        docker rmi "${ImageName}:${tag}" 2>$null
    }

    # dangling 이미지 정리
    docker image prune -f

    Write-LogSuccess "정리 완료"
}

function Invoke-Deploy {
    param([bool]$UseNoCache)

    Write-LogInfo "=========================================="
    Write-LogInfo "MCP Server 배포 시작"
    Write-LogInfo "=========================================="

    Test-Environment
    Build-Image -UseNoCache $UseNoCache

    # 기존 컨테이너 중지 (있는 경우)
    try { Stop-Container } catch { }

    Start-Container

    # 헬스체크
    if (Test-Health) {
        Write-LogSuccess "=========================================="
        Write-LogSuccess "배포 완료!"
        Write-LogSuccess "=========================================="
        Show-Status
    }
    else {
        Write-LogError "헬스체크 실패! 롤백을 시도합니다..."
        Invoke-Rollback
    }
}

# -----------------------------------------------------------------------------
# 메인 로직
# -----------------------------------------------------------------------------

# 개발 모드 표시
if ($Dev) {
    Write-LogInfo "개발 모드로 실행합니다."
}

# 명령어 실행
switch ($Command) {
    "build" {
        Test-Environment
        Build-Image -UseNoCache $NoCache
    }
    "start" {
        Test-Environment
        Start-Container
    }
    "stop" {
        Stop-Container
    }
    "restart" {
        Stop-Container
        Start-Container
    }
    "deploy" {
        Invoke-Deploy -UseNoCache $NoCache
    }
    "rollback" {
        Invoke-Rollback
    }
    "status" {
        Show-Status
    }
    "logs" {
        Show-Logs
    }
    "health" {
        $result = Test-Health
        if (-not $result) { exit 1 }
    }
    "clean" {
        Clear-Images
    }
    "help" {
        Show-Usage
    }
    default {
        Show-Usage
    }
}
