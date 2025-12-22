# Newsletter E2E 테스트 - 문제 해결

> 테스트 실패 시 대응 방법 및 트러블슈팅 가이드

**마지막 업데이트**: 2025-12-22
**관련 문서**: [메인 가이드](../run-newsletter-e2e-tests.md)

---

## 일반적인 실패 원인

### 1. 타임아웃 에러

**에러 메시지**:
```
Error: Timeout 10000ms exceeded waiting for locator('button:has-text("Export CSV")')
```

**원인**:
- 개발 서버가 느림 (빌드 중)
- 네트워크 지연 (API 호출)
- DOM 렌더링 지연 (React Query)

**해결 방법**:
```bash
# 타임아웃 증가 (30초)
npx playwright test admin-newsletter --timeout=30000
```

**예방책**:
- 개발 서버 완전히 시작된 후 테스트 실행
- `page.waitForLoadState('networkidle')` 사용

---

### 2. 로그인 실패

**에러 메시지**:
```
Error: Element not found: input[type="email"]
```

**원인**:
- Admin 계정이 없음
- 로그인 헬퍼 함수 오류
- 세션 쿠키 만료

**해결 방법**:
```sql
-- Admin 계정 확인
SELECT id, email FROM auth.users WHERE email = 'admin@ideaonaction.local';

-- Admin 역할 부여
INSERT INTO user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@ideaonaction.local'),
  'admin'
);
```

---

### 3. 데이터 없음

**에러 메시지**:
```
Error: Expected at least 1 element matching 'tbody tr', received 0
```

**해결 방법**:
```sql
-- 구독자 데이터 확인
SELECT COUNT(*) FROM user_profiles WHERE newsletter_email IS NOT NULL;

-- 데이터 생성
INSERT INTO user_profiles (user_id, newsletter_email, newsletter_subscribed, newsletter_subscribed_at)
VALUES
  (gen_random_uuid(), 'test1@example.com', true, NOW()),
  (gen_random_uuid(), 'test2@example.com', true, NOW());
```

---

### 4. 권한 에러

**에러 메시지**:
```
Error: Request failed with status code 403 Forbidden
```

**해결 방법**:
```sql
-- Admin 역할 확인
SELECT * FROM user_roles WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'admin@ideaonaction.local'
);

-- Admin 역할 부여 (없을 경우)
INSERT INTO user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@ideaonaction.local'),
  'admin'
)
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

---

### 5. 포트 충돌

**에러 메시지**:
```
Error: Port 5173 is already in use
```

**해결 방법**:
```bash
# Windows에서 포트 사용 프로세스 확인
netstat -ano | findstr :5173

# 프로세스 종료 (PID 확인 후)
taskkill /PID 12345 /F

# Supabase 재시작
supabase stop
supabase start
```

---

### 6. Selector 변경

**에러 메시지**:
```
Error: Locator('button:has-text("Export CSV")') not found
```

**해결 방법**:
```typescript
// 더 안정적인 Selector 사용
// ❌ 취약: 텍스트 기반
const btn = page.locator('button:has-text("Export CSV")');

// ✅ 강건: data-testid 기반
const btn = page.locator('[data-testid="export-csv-btn"]');
```

---

## 성능 벤치마크

```
전체 33개 테스트: ~2분 15초 (135초)
평균 테스트당:    ~4초
Parallel Workers: 3개 (기본)
```

**최적화 팁**:
```bash
# 병렬 워커 증가 (4코어: 3, 8코어: 5, 16코어: 8)
npx playwright test admin-newsletter --workers=5

# 헤드리스 모드 (20-30% 빠름)
npx playwright test admin-newsletter
```

---

## 추가 트러블슈팅

### Docker Desktop 미실행

```bash
# 1. Docker Desktop 실행 (Windows)
# 시작 메뉴 → Docker Desktop

# 2. Docker Engine 상태 확인
docker ps

# 3. Supabase 재시작
supabase stop
supabase start
```

### Playwright 브라우저 미설치

```bash
# 모든 브라우저 설치
npx playwright install

# 시스템 의존성 설치 (Linux)
npx playwright install-deps
```

### 테스트 데이터 불일치

```bash
# DB 초기화
supabase db reset

# 테스트 재실행
npx playwright test admin-newsletter
```

---

## FAQ

**Q: 테스트가 너무 느려요 (5분 이상)**
```bash
npx playwright test admin-newsletter --workers=5 --timeout=5000
```

**Q: 특정 테스트만 실행하려면?**
```bash
npx playwright test admin-newsletter -g "CSV export"
```

**Q: 헤드리스 vs 헤드 모드?**
- 헤드리스: 빠름, CI/CD 적합
- 헤드: 디버깅 쉬움, 느림

---

## 다음 단계

- [CI/CD 통합](./ci-cd.md)
- [메인 가이드](../run-newsletter-e2e-tests.md)
