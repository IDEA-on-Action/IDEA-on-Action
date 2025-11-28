# 자동 배포 에러 핸들러

배포 실패 시 자동으로 에러를 분석하고 수정하여 재배포하는 시스템입니다.

## 개요

이 시스템은 다음과 같은 상황에서 자동으로 작동합니다:

1. **GitHub Actions 배포 실패** 시 자동 에러 수정 및 재배포
2. **로컬 개발 환경**에서 배포 전 에러 체크 및 수정
3. **Sub-Agent 통합**을 통한 수동 에러 수정

## 주요 기능

### 🔍 에러 분석 (deploy-error-handler.js)

- GitHub Actions 로그에서 에러 추출
- 로컬 빌드/린트/타입 에러 체크
- 에러 패턴 분석 및 분류
- 수정 가능/불가능 에러 구분

### 🔧 자동 수정 (auto-fix-errors.js)

- **미사용 import/변수 제거**
- **누락된 세미콜론 추가**
- **타입 에러 자동 수정** (null 체크, any 타입 추가)
- **ESLint 자동 수정** 적용
- **파일 백업** 및 복원 기능

### 🚀 자동 재배포

- 수정 후 자동 재빌드
- Vercel 재배포 시도
- 최대 3회 재시도 제한

## 사용 방법

### 1. npm 스크립트 사용

```bash
# 배포 전 에러 체크
npm run deploy:check

# 에러 자동 수정
npm run deploy:fix

# 수정 후 안전 배포
npm run deploy:safe
```

### 2. Sub-Agent 통합

```bash
# Sub-Agent 메뉴 실행
npm run sub-agent

# 메뉴에서 "6. 배포 에러 자동 수정" 선택
```

### 3. GitHub Actions 자동 실행

프로덕션 배포 실패 시 자동으로 실행됩니다:

```yaml
# .github/workflows/deploy-production.yml
- name: Auto Fix Deploy Errors
  if: steps.check-deploy.outputs.deploy_success == 'false'
  run: |
    npm run deploy:check
    npm run deploy:fix
    npm run build
```

## 지원되는 에러 타입

### ✅ 자동 수정 가능

#### Import/Module 에러
- `Module not found: Can't resolve '...'`
- `Cannot find module '...'`
- `Module '...' has no exported member '...'`

#### 린트 에러
- `'variable' is defined but never used`
- `Missing semicolon`
- `Unexpected console.log`

#### 타입 에러
- `Object is possibly 'null' or 'undefined'`
- `Type '...' is not assignable to type '...'`
- `Property '...' does not exist on type '...'`

### ⚠️ 분석 및 리포트만

#### 복잡한 타입 에러
- 제네릭 타입 불일치
- 복잡한 인터페이스 에러
- 함수 시그니처 불일치

#### 로직 에러
- 런타임 에러
- 비즈니스 로직 에러
- 환경 변수 누락

## 안전장치

### 🔒 백업 시스템
- 모든 수정 전 자동 백업 생성
- 수정 실패 시 자동 복원
- 백업 파일은 `backups/` 디렉토리에 저장

### 🔄 재시도 제한
- 최대 3회 재시도
- 수정 불가능한 에러는 즉시 중단
- 무한 루프 방지

### 📊 로깅
- 모든 변경사항 로그 기록
- 에러 분석 리포트 생성
- 수정 결과 요약 제공

## 파일 구조

```
scripts/
├── deploy-error-handler.js    # 에러 분석 스크립트
├── auto-fix-errors.js         # 자동 수정 스크립트
└── sub-agent-runner.js        # Sub-Agent 통합

logs/
├── error-analysis-*.json      # 에러 분석 리포트
└── deploy-logs-*.txt         # 배포 로그

backups/
├── *.ts-*.bak                # TypeScript 파일 백업
├── *.tsx-*.bak               # TSX 파일 백업
└── *.js-*.bak                # JavaScript 파일 백업
```

## 설정 옵션

### CONFIG 설정 (deploy-error-handler.js)

```javascript
const CONFIG = {
  maxRetries: 3,              // 최대 재시도 횟수
  logDir: 'logs',             // 로그 디렉토리
  backupDir: 'backups',       // 백업 디렉토리
  errorTypes: {               // 에러 타입 정의
    BUILD: 'build',
    LINT: 'lint',
    TYPE: 'type',
    IMPORT: 'import',
    RUNTIME: 'runtime'
  }
};
```

### 에러 패턴 커스터마이징

```javascript
const ERROR_PATTERNS = {
  build: [
    /Module not found: Can't resolve '([^']+)'/,
    /Cannot find module '([^']+)'/
  ],
  lint: [
    /'([^']+)' is defined but never used/,
    /Missing semicolon/
  ],
  // ... 추가 패턴
};
```

## 문제 해결

### 일반적인 문제

#### 1. 권한 오류
```bash
# 스크립트 실행 권한 부여
chmod +x scripts/deploy-error-handler.js
chmod +x scripts/auto-fix-errors.js
```

#### 2. Node.js 버전 오류
```bash
# Node.js 18+ 버전 사용
node --version
nvm use 18
```

#### 3. GitHub CLI 오류
```bash
# GitHub CLI 설치 및 로그인
npm install -g @github/cli
gh auth login
```

### 디버깅

#### 상세 로그 활성화
```bash
# 디버그 모드로 실행
DEBUG=deploy-error-handler npm run deploy:check
DEBUG=auto-fix-errors npm run deploy:fix
```

#### 로그 파일 확인
```bash
# 에러 분석 리포트 확인
ls -la logs/error-analysis-*.json

# 백업 파일 확인
ls -la backups/
```

## 제한사항

### 자동 수정 불가능한 에러
- 복잡한 비즈니스 로직 에러
- 외부 API 의존성 에러
- 환경 설정 관련 에러
- 데이터베이스 스키마 에러

### 성능 고려사항
- 대용량 프로젝트에서 처리 시간 증가
- 메모리 사용량 모니터링 필요
- 백업 파일 저장 공간 관리

## 모니터링

### 성공률 추적
```bash
# 성공한 수정 횟수 확인
grep "✅" logs/deploy-logs-*.txt | wc -l

# 실패한 수정 횟수 확인
grep "❌" logs/deploy-logs-*.txt | wc -l
```

### 에러 패턴 분석
```bash
# 가장 빈번한 에러 타입 확인
cat logs/error-analysis-*.json | jq '.errorsByType'
```

## 향후 개선 계획

### 단기 목표
- [ ] 더 많은 에러 패턴 지원
- [ ] 성능 최적화
- [ ] 실시간 모니터링 대시보드

### 장기 목표
- [ ] AI 기반 에러 수정
- [ ] 예방적 에러 감지
- [ ] 팀 협업 기능

## 기여하기

### 새로운 에러 패턴 추가
1. `ERROR_PATTERNS`에 패턴 추가
2. 테스트 케이스 작성
3. 문서 업데이트

### 자동 수정 로직 개선
1. `auto-fix-errors.js`에 로직 추가
2. 백업/복원 테스트
3. 성능 벤치마크

---

**마지막 업데이트**: 2025년 1월  
**버전**: v1.0.0  
**관리자**: IDEA on Action Team
