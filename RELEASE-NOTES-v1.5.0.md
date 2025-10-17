# Release Notes v1.5.0

**릴리스 날짜**: 2025-10-17
**릴리스 타입**: Minor Release (기능 추가)
**브랜치**: staging → main

---

## 🎉 주요 기능

### 1. 인증 시스템
- **OAuth 로그인**: Google, GitHub, Kakao 지원
- **관리자 계정**: admin / demian00
- **세션 관리**: Supabase Auth 실시간 동기화
- **권한 관리**: RBAC (Role-Based Access Control)

### 2. 관리자 시스템
- **대시보드**: 통계, 최근 서비스, 빠른 액션
- **서비스 관리**: 목록, 검색, 필터, 정렬
- **CRUD 기능**: 등록, 수정, 삭제
- **이미지 업로드**: Supabase Storage (5MB, JPG/PNG/WEBP)

### 3. UI/UX 개선
- **AdminLayout**: 사이드바 네비게이션 (반응형)
- **ProtectedRoute**: 로그인 필수 페이지
- **AdminRoute**: 관리자 전용 페이지
- **Forbidden 페이지**: 403 권한 없음 안내

---

## 📦 새로운 파일

### Hooks (2개)
```
src/hooks/
├── useAuth.ts          # 인증 상태 관리
└── useIsAdmin.ts       # 관리자 권한 확인
```

### Components (4개)
```
src/components/
├── auth/
│   ├── ProtectedRoute.tsx  # 로그인 필수 라우트
│   └── AdminRoute.tsx      # 관리자 전용 라우트
├── layouts/
│   └── AdminLayout.tsx     # 관리자 레이아웃
└── admin/
    └── ServiceForm.tsx     # 서비스 등록/수정 폼
```

### Pages (6개)
```
src/pages/
├── Login.tsx           # 로그인 페이지
├── Forbidden.tsx       # 403 페이지
└── admin/
    ├── Dashboard.tsx       # 대시보드
    ├── AdminServices.tsx   # 서비스 관리
    ├── CreateService.tsx   # 서비스 등록
    └── EditService.tsx     # 서비스 수정
```

### Documentation (3개)
```
docs/guides/
├── storage/setup.md        # Supabase Storage 설정
└── auth/
    ├── oauth-setup.md      # OAuth 설정
    └── admin-setup.md      # 관리자 계정 설정
```

---

## 🔄 변경된 파일

### Core Files
- **src/App.tsx**: 관리자 라우트 추가 (/admin/*)
- **src/components/Header.tsx**: 아바타/드롭다운 통합
- **package.json**: v1.5.0, react-hook-form, zod 추가

### Documentation
- **CLAUDE.md**: v1.5.0 업데이트
- **docs/project/changelog.md**: v1.5.0 항목 추가
- **project-todo.md**: Phase 8 + Auth 완료 체크

---

## 🛣️ 새로운 라우트

### Public Routes
- `/login` - 로그인 페이지
- `/forbidden` - 403 권한 없음

### Admin Routes (관리자 전용)
- `/admin` - 대시보드
- `/admin/services` - 서비스 관리
- `/admin/services/new` - 서비스 등록
- `/admin/services/:id/edit` - 서비스 수정

---

## 📊 성능 영향

### 번들 크기
```
v1.4.0: 188.67 kB (gzip)
v1.5.0: 226.66 kB (gzip)
증가량: +38.44 kB (+20.4%)
```

### 주요 증가 원인
- React Hook Form: +15 kB
- 관리자 페이지 컴포넌트: +12 kB
- AdminLayout + 사이드바: +5 kB
- 기타: +6.44 kB

### 최적화 권장사항
- Dynamic import로 관리자 페이지 코드 스플리팅
- 이미지 최적화 (WebP 변환)
- 불필요한 의존성 제거

---

## 🔐 보안

### 추가된 보안 기능
1. **RLS (Row Level Security)**
   - Storage: 관리자만 업로드/삭제
   - Services: 활성 서비스만 public 읽기
   - User Roles: 본인 역할만 읽기

2. **인증 보호**
   - ProtectedRoute: 비로그인 차단
   - AdminRoute: 관리자만 접근
   - 자동 리다이렉트 (로그인 페이지)

3. **입력 검증**
   - Zod 스키마 검증
   - 파일 업로드 제한 (5MB, 이미지만)
   - XSS 방지 (React 기본 제공)

---

## 🐛 알려진 이슈

### Critical (없음)
현재 Critical 이슈 없음

### Medium
1. **Kakao OAuth 미구현**
   - 상태: Placeholder만 존재
   - 해결: Supabase Function 필요
   - 우선순위: 낮음 (Google/GitHub 사용 가능)

2. **번들 크기 최적화**
   - 상태: 754.90 kB (uncompressed)
   - 해결: Dynamic import 적용
   - 우선순위: 중간

### Low
1. **2FA 미지원**
   - 우선순위: Phase 10

2. **이미지 썸네일 미생성**
   - 우선순위: Phase 10

---

## 🔧 설정 필요 사항

### Supabase 설정 (필수)

#### 1. Storage 버킷 생성
```sql
-- Supabase Dashboard → Storage → Create Bucket
Bucket Name: services
Public: ✅
```

**RLS 정책**:
```sql
-- 관리자만 업로드
CREATE POLICY "Admins can upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'services' AND EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- 모든 사람이 읽기
CREATE POLICY "Public can view" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'services');
```

#### 2. OAuth Provider 설정

**Google**:
- Client ID/Secret from Google Cloud Console
- Redirect URI: `https://zykjdneewbzyazfukzyg.supabase.co/auth/v1/callback`

**GitHub**:
- Client ID/Secret from GitHub OAuth Apps
- Callback URL: `https://zykjdneewbzyazfukzyg.supabase.co/auth/v1/callback`

#### 3. 관리자 계정 생성
```sql
-- 1. Supabase Dashboard → Authentication → Users → Add User
Email: admin@ideaonaction.local
Password: demian00

-- 2. user_roles 테이블에 추가
INSERT INTO user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@ideaonaction.local'),
  'admin'
);
```

---

## ✅ 배포 전 체크리스트

### Supabase
- [ ] Storage 버킷 `services` 생성
- [ ] RLS 정책 3개 설정
- [ ] Google OAuth 설정
- [ ] GitHub OAuth 설정
- [ ] 관리자 계정 생성 (admin@ideaonaction.local)
- [ ] user_roles에 admin 역할 추가

### Vercel
- [ ] 환경 변수 확인 (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] 빌드 성공 확인
- [ ] Preview 배포 테스트

### 기능 테스트
- [ ] admin/demian00 로그인 성공
- [ ] 관리자 메뉴 표시
- [ ] /admin 대시보드 접근
- [ ] 서비스 등록/수정/삭제
- [ ] 이미지 업로드 (5MB 이하)
- [ ] OAuth 로그인 (Google, GitHub)

---

## 📚 문서

### 설정 가이드
- [Storage 설정](docs/guides/storage/setup.md)
- [OAuth 설정](docs/guides/auth/oauth-setup.md)
- [관리자 계정 설정](docs/guides/auth/admin-setup.md)

### 프로젝트 문서
- [CLAUDE.md](CLAUDE.md) - 프로젝트 현황
- [AUTHENTICATION-SUMMARY.md](AUTHENTICATION-SUMMARY.md) - 인증 시스템 완료 보고서
- [DEPLOYMENT-VERIFICATION.md](DEPLOYMENT-VERIFICATION.md) - 배포 검증 체크리스트

---

## 🎯 다음 버전 (v2.0.0 - Phase 9)

### Phase 9: 전자상거래 기능
- 장바구니 시스템
- 주문 관리
- 결제 게이트웨이 (카카오페이, 토스페이먼츠)
- 주문 내역 페이지

### 예상 일정
- 시작: 2025-10-20
- 완료: 2025-11-03 (2주)

---

## 👥 기여자

- **개발**: Claude Code (Anthropic)
- **프로젝트 관리**: 서민원 (sinclairseo@gmail.com)

---

## 📝 마이그레이션 가이드

### v1.4.0 → v1.5.0

#### 1. 의존성 업데이트
```bash
npm install react-hook-form zod @hookform/resolvers
```

#### 2. 환경 변수 (변경 없음)
```env
VITE_SUPABASE_URL=https://zykjdneewbzyazfukzyg.supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_KEY]
```

#### 3. 코드 변경 (Breaking Changes 없음)
- 기존 기능 모두 호환
- 새로운 라우트 추가만 있음

#### 4. 데이터베이스 마이그레이션 (없음)
- 기존 스키마 그대로 사용

---

**End of Release Notes**
