# 환경 변수 빠른 설정 가이드

## 현재 문제
- ❌ Supabase credentials missing
- ❌ GPG가 설치되어 있지 않음

## 즉시 해결 방법

### 방법 1: .env.local 파일 직접 생성 (가장 빠름)

```powershell
# PowerShell에서 실행
@"
VITE_SUPABASE_URL=https://zykjdneewbzyazfukzyg.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
"@ | Out-File -FilePath .env.local -Encoding utf8
```

**주의**: `your-anon-key-here`를 실제 Supabase Anon Key로 교체하세요.

### 방법 2: dotenv-vault 사용 (권장)

```powershell
# 1. .env.local 파일 생성 (위 방법 1 사용)

# 2. dotenv-vault 초기화
npm run env:vault:new

# 3. 암호화
npm run env:vault:push
```

## Supabase 키 확인 방법

1. Supabase 대시보드 접속: https://supabase.com/dashboard
2. 프로젝트 선택
3. Settings > API 메뉴로 이동
4. 다음 정보 확인:
   - **Project URL**: `VITE_SUPABASE_URL`에 사용
   - **anon public key**: `VITE_SUPABASE_ANON_KEY`에 사용

## 확인

```powershell
# 개발 서버 실행하여 확인
npm run dev
```

에러가 사라지면 성공입니다!



