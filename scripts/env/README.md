# Environment Variable Scripts

환경 변수 관리 스크립트 모음

## 📁 스크립트 목록

### 백업 & 복원
- `backup-env.js` - `.env.local` GPG 암호화 백업
- `restore-env.js` - 인터랙티브 백업 복원 (GPG/타임스탬프/dotenv-vault)
- `export-env-to-csv.js` - 1Password CSV 내보내기

### 환경 설정
- `create-env-local.ps1` - Windows 대화형 `.env.local` 생성 스크립트

## 🚀 사용법

### 백업 생성
```bash
npm run env:backup
# 또는
node scripts/env/backup-env.js
```

### 백업 복원
```bash
npm run env:restore
# 또는
node scripts/env/restore-env.js
```

### CSV 내보내기 (1Password용)
```bash
npm run env:export:csv
# 또는
node scripts/env/export-env-to-csv.js
```

### Windows에서 .env.local 생성
```powershell
.\scripts\env\create-env-local.ps1
```

## 🔐 보안

- GPG 암호화 사용 (AES256)
- CSV 파일은 자동 삭제 (평문 노출 방지)
- 1Password/Bitwarden 클라우드 백업 권장

## 📝 참고사항

- GPG 키가 필요합니다 (백업/복원)
- `.env.local`은 Git에 커밋되지 않습니다
- 자세한 가이드: `docs/guides/env-management.md`
