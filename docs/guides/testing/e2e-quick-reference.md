# E2E 테스트 빠른 참조 가이드

**1페이지 핵심 명령어 모음**

---

## 🚀 실행 명령어

### 기본 실행
```bash
npm run test:e2e                    # 모든 E2E 테스트 (Headless)
npm run test:e2e -- --ui            # UI 모드 (인터랙티브)
npm run test:e2e -- --headed        # 브라우저 표시
```

### Admin 테스트
```bash
# 전체 Admin 테스트 (215개)
npm run test:e2e -- tests/e2e/admin/

# CMS Phase 4 테스트만 (177개)
npm run test:e2e -- tests/e2e/admin/admin-portfolio.spec.ts tests/e2e/admin/admin-lab.spec.ts tests/e2e/admin/admin-team.spec.ts tests/e2e/admin/admin-blog-categories.spec.ts tests/e2e/admin/admin-tags.spec.ts tests/e2e/admin/admin-users.spec.ts

# 특정 파일
npm run test:e2e -- tests/e2e/admin/admin-portfolio.spec.ts

# 특정 테스트 (이름 필터)
npm run test:e2e -- -g "should create new portfolio"
```

### 디버그
```bash
npm run test:e2e -- tests/e2e/admin/admin-portfolio.spec.ts --debug
npm run test:e2e -- tests/e2e/admin/admin-portfolio.spec.ts --headed --workers=1
```

---

## 🔧 사전 준비 (3단계)

### 1. Supabase 실행
```bash
supabase start                      # Docker Desktop 필요
supabase status                     # 상태 확인
```

### 2. 개발 서버 실행
```bash
npm run dev                         # http://localhost:5173
```

### 3. 테스트 사용자 생성
```sql
-- Supabase Studio (http://localhost:54323) > SQL Editor
INSERT INTO admins (email, role, name)
VALUES ('admin@ideaonaction.local', 'super_admin', 'Test Admin')
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';
```

---

## 🐛 트러블슈팅 (5초 해결)

### "Connection refused"
```bash
npm run dev                         # 개발 서버 재시작
curl http://localhost:5173          # 확인
```

### "Timeout exceeded"
```bash
supabase stop && supabase start     # DB 재시작
```

### "Unauthorized"
```sql
-- admin@ideaonaction.local 권한 확인
SELECT * FROM admins WHERE email = 'admin@ideaonaction.local';

-- 권한 부여
UPDATE admins SET role = 'super_admin' WHERE email = 'admin@ideaonaction.local';
```

### "Element not found"
```bash
npm run test:e2e -- tests/e2e/admin/admin-portfolio.spec.ts --debug
# 브라우저 DevTools로 셀렉터 확인
```

### BlogCategories 실패
```bash
supabase db reset                   # 마이그레이션 재적용
```

---

## 📊 리포트 확인

```bash
npx playwright show-report          # HTML 리포트 열기
```

**리포트 내용**:
- 스크린샷 (실패 시)
- 에러 메시지
- 실행 시간 통계
- 네트워크 로그

---

## 🎯 주요 테스트 파일 (215개)

| 파일 | 테스트 수 | 실행 시간 |
|------|----------|----------|
| admin-portfolio.spec.ts | 46 | ~1.2분 |
| admin-lab.spec.ts | 37 | ~58초 |
| admin-team.spec.ts | 28 | ~45초 |
| admin-blog-categories.spec.ts | 24 | ~38초 |
| admin-tags.spec.ts | 24 | ~38초 |
| admin-users.spec.ts | 18 | ~29초 |
| **전체** | **215** | **~4.3분** |

---

## 💡 유용한 옵션

```bash
--workers=1                         # 순차 실행 (디버깅)
--workers=4                         # 병렬 실행 (기본값)
--retries=2                         # 재시도 2번
--project=chromium                  # 특정 브라우저
--screenshot=only-on-failure        # 실패 시 스크린샷
--video=retain-on-failure           # 실패 시 비디오
```

---

## 📚 관련 문서

- **상세 가이드**: `docs/guides/testing/e2e-test-guide.md`
- **Playwright 문서**: https://playwright.dev/
- **Admin 가이드**: `docs/guides/cms/admin-guide.md`

---

**마지막 업데이트**: 2025-11-16
**Playwright 버전**: ^1.40.0
