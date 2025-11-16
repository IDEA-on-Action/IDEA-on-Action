# .env.local 파일 생성 스크립트
# PowerShell에서 실행: .\scripts\create-env-local.ps1

$envFile = ".env.local"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "환경 변수 파일 생성 도구" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 기존 파일 확인
if (Test-Path $envFile) {
    Write-Host "⚠️  .env.local 파일이 이미 존재합니다." -ForegroundColor Yellow
    $overwrite = Read-Host "덮어쓰시겠습니까? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "❌ 취소되었습니다." -ForegroundColor Red
        exit
    }
    # 백업 생성
    $backupFile = "$envFile.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $envFile $backupFile
    Write-Host "✅ 기존 파일 백업: $backupFile" -ForegroundColor Green
}

Write-Host ""
Write-Host "Supabase 설정 정보를 입력하세요:" -ForegroundColor Blue
Write-Host ""

# Supabase URL 입력
$supabaseUrl = Read-Host "VITE_SUPABASE_URL (기본값: https://zykjdneewbzyazfukzyg.supabase.co)"
if ([string]::IsNullOrWhiteSpace($supabaseUrl)) {
    $supabaseUrl = "https://zykjdneewbzyazfukzyg.supabase.co"
}

# Supabase Anon Key 입력
$supabaseKey = Read-Host "VITE_SUPABASE_ANON_KEY (필수)"
if ([string]::IsNullOrWhiteSpace($supabaseKey)) {
    Write-Host "❌ VITE_SUPABASE_ANON_KEY는 필수입니다." -ForegroundColor Red
    Write-Host "   Supabase 대시보드 > Settings > API에서 확인하세요." -ForegroundColor Yellow
    exit 1
}

# Service Role Key (선택사항)
Write-Host ""
$serviceKey = Read-Host "SUPABASE_SERVICE_ROLE_KEY (선택사항, 마이그레이션용)"
if ([string]::IsNullOrWhiteSpace($serviceKey)) {
    $serviceKey = ""
}

# 파일 내용 생성
$content = @"
# Supabase 설정
VITE_SUPABASE_URL=$supabaseUrl
VITE_SUPABASE_ANON_KEY=$supabaseKey
"@

if ($serviceKey) {
    $content += "`nSUPABASE_SERVICE_ROLE_KEY=$serviceKey"
}

# 파일 저장
$content | Out-File -FilePath $envFile -Encoding utf8 -NoNewline

Write-Host ""
Write-Host "✅ .env.local 파일이 생성되었습니다!" -ForegroundColor Green
Write-Host ""
Write-Host "다음 단계:" -ForegroundColor Cyan
Write-Host "  1. dotenv-vault로 암호화: npm run env:vault:new" -ForegroundColor Yellow
Write-Host "  2. 개발 서버 실행: npm run dev" -ForegroundColor Yellow
Write-Host ""

