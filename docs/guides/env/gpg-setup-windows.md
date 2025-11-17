# Windows에서 GPG 설치 및 환경 변수 암호화 가이드

## 문제 상황
Windows PowerShell에서 `gpg` 명령어를 인식하지 못하는 경우, GPG를 설치하거나 대안을 사용해야 합니다.

## 방법 1: GPG 설치 (권장)

### 옵션 A: Gpg4win 설치 (GUI 포함)

1. **Gpg4win 다운로드**
   - 공식 사이트: https://www.gpg4win.org/
   - 또는 Chocolatey 사용: `choco install gpg4win`

2. **설치 후 확인**
   ```powershell
   gpg --version
   ```

3. **사용 방법**
   ```powershell
   # .env.local 파일 암호화
   gpg --symmetric --cipher-algo AES256 .env.local
   
   # 복호화
   gpg --decrypt .env.local.gpg > .env.local
   ```

### 옵션 B: Git for Windows에 포함된 GPG 사용

Git for Windows를 설치했다면 GPG가 포함되어 있을 수 있습니다:

```powershell
# Git 설치 경로 확인
where git

# GPG 경로 확인
where gpg

# 없다면 Git for Windows 재설치 또는 Gpg4win 설치
```

## 방법 2: dotenv-vault 사용 (대안, 권장)

프로젝트에 이미 `dotenv-vault`가 설정되어 있습니다. GPG 없이도 안전하게 환경 변수를 암호화할 수 있습니다.

### 초기 설정

```powershell
# 1. .env.local 파일 생성 (필요한 경우)
# VITE_SUPABASE_URL=your-url
# VITE_SUPABASE_ANON_KEY=your-key

# 2. dotenv-vault 초기화
npm run env:vault:new

# 3. 암호화된 .env.vault 파일 생성
npm run env:vault:push
```

### 사용 방법

```powershell
# 암호화된 환경 변수 가져오기
npm run env:vault:pull
```

### 장점
- ✅ GPG 설치 불필요
- ✅ Git에 안전하게 커밋 가능 (.env.vault)
- ✅ 팀 협업에 적합
- ✅ CI/CD 파이프라인에서 사용 가능

## 방법 3: 프로젝트 백업 스크립트 사용

프로젝트에 이미 백업 스크립트가 있습니다:

```powershell
# 백업 (GPG가 없으면 일반 백업만 생성)
npm run env:backup

# 복원
npm run env:restore
```

## 현재 필요한 환경 변수

`.env.local` 파일에 다음 변수들이 필요합니다:

```env
# Supabase 설정
VITE_SUPABASE_URL=https://zykjdneewbzyazfukzyg.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# 기타 필요한 환경 변수
# ...
```

## 빠른 해결 방법

### 1단계: .env.local 파일 생성

```powershell
# .env.local 파일 생성
New-Item -Path .env.local -ItemType File -Force
```

### 2단계: 환경 변수 추가

```powershell
# 편집기로 열기
notepad .env.local
```

다음 내용 추가:
```env
VITE_SUPABASE_URL=https://zykjdneewbzyazfukzyg.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3단계: dotenv-vault로 암호화 (권장)

```powershell
npm run env:vault:new
npm run env:vault:push
```

## 참고사항

- `.env.local` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다.
- `.env.vault` 파일은 암호화되어 있어 Git에 안전하게 커밋할 수 있습니다.
- 프로덕션 환경에서는 환경 변수를 서버 설정에서 관리하세요.



