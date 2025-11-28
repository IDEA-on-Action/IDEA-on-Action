# Supabase Staging 프로젝트 설정 가이드

> Closed Beta를 위한 Supabase Staging 환경 구축 단계별 가이드

**작성일**: 2025-11-28
**예상 소요 시간**: 30분

---

## 1. Staging 프로젝트 생성

### Step 1: Supabase Dashboard 접속
1. https://supabase.com/dashboard 접속
2. **New Project** 클릭

### Step 2: 프로젝트 정보 입력

| 항목 | 값 |
|------|-----|
| **Name** | `idea-on-action-staging` |
| **Database Password** | (강력한 비밀번호) |
| **Region** | `Northeast Asia (Seoul)` |
| **Pricing Plan** | `Free` |

### Step 3: 프로젝트 정보 복사

Settings > API에서:
```
Project URL: https://[PROJECT_REF].supabase.co
anon key: eyJhbGci...
```

---

## 2. 마이그레이션 적용

```bash
# 프로젝트 연결
supabase link --project-ref [STAGING_PROJECT_REF]

# 마이그레이션 적용
supabase db push

# 상태 확인
supabase db status
```

---

## 3. 환경 변수 설정

### .env.staging 업데이트
```bash
VITE_SUPABASE_URL=https://[STAGING_REF].supabase.co
VITE_SUPABASE_ANON_KEY=[STAGING_ANON_KEY]
VITE_ENV=staging
```

### 검증
```bash
node scripts/validate-env.js
```

---

## 4. 시드 데이터 적용

```bash
supabase db execute -f scripts/seed-staging.sql
```

---

## 5. Vercel 연동

Settings > Environment Variables > **Preview** 환경:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | Staging URL |
| `VITE_SUPABASE_ANON_KEY` | Staging Key |
| `VITE_ENV` | `staging` |

---

## 6. 테스트 사용자 생성

Dashboard > Authentication > Users > Add User:

| Email | 용도 |
|-------|------|
| `staging-admin@ideaonaction.ai` | 관리자 테스트 |
| `staging-user@ideaonaction.ai` | 일반 사용자 |

---

## 검증 체크리스트

- [ ] Supabase 프로젝트 생성 완료
- [ ] 마이그레이션 적용 완료
- [ ] .env.staging 업데이트
- [ ] Vercel 환경 변수 설정
- [ ] 시드 데이터 적용
- [ ] 테스트 사용자 생성
- [ ] https://staging-ideaonaction.vercel.app 접속 확인

---

## 관련 문서

- [spec/closed-beta/README.md](../../spec/closed-beta/README.md)
- [환경 변수 관리](env-management.md)
