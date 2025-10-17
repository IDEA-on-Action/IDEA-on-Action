# Supabase Schema 분석 리포트

> **작성일**: 2025-10-17
> **분석 대상**: VIBE WORKING 프로젝트 Supabase 데이터베이스
> **목적**: Phase 8-12 로드맵 기반 스키마 최적화

---

## 📊 현재 스키마 현황

### 발견된 테이블 (총 14개)

| 테이블명 | 행 수 | 상태 | Phase 매핑 | 비고 |
|---------|------|------|-----------|------|
| `services` | 0 | ❌ 비어있음 | Phase 8 | ⭐ 핵심 테이블, 구조 파악 필요 |
| `service_categories` | 4 | ✅ 데이터 있음 | Phase 8 | 구조 확인 완료 |
| `carts` | 0 | ❌ 비어있음 | Phase 9 | 구조 파악 필요 |
| `orders` | 0 | ❌ 비어있음 | Phase 9 | 구조 파악 필요 |
| `order_items` | 0 | ❌ 비어있음 | Phase 9 | 구조 파악 필요 |
| `payments` | 0 | ❌ 비어있음 | Phase 9 | 구조 파악 필요 |
| `user_profiles` | 0 | ❌ 비어있음 | Phase 10 | 구조 파악 필요 |
| `user_roles` | 0 | ❌ 비어있음 | Phase 10 | 구조 파악 필요 |
| `posts` | 6 | ✅ 데이터 있음 | Phase 11 | 구조 확인 완료 |
| `post_tags` | 0 | ❌ 비어있음 | Phase 11 | ⚠️ posts에 tags 컬럼 존재 (중복) |
| `gallery` | 0 | ❌ 비어있음 | Phase 8? | ⚠️ 목적 불명확 |
| `metrics` | 0 | ❌ 비어있음 | Phase 8? | ⚠️ 목적 불명확 |
| `chat_messages` | 0 | ❌ 비어있음 | Phase 12 | 유지 (미래용) |
| `analytics_events` | 0 | ❌ 비어있음 | Phase 12 | 유지 (미래용) |

---

## 🔍 상세 분석

### ✅ 1. service_categories (정상)

**현재 구조** (샘플 데이터 기반):
```typescript
interface ServiceCategory {
  id: string              // UUID
  name: string            // "AI 솔루션"
  slug: string            // "ai-solutions"
  description: string     // "AI 기반 비즈니스 솔루션"
  display_order: number   // 1
  created_at: string      // ISO timestamp
}
```

**평가**:
- ✅ 구조 양호
- ✅ Phase 8 요구사항 충족
- ✅ 샘플 데이터 4개 존재
- 💡 개선 제안: `icon` 컬럼 추가 (UI용)

**액션**: 유지 + 소폭 개선

---

### ⭐ 2. services (핵심 - 구조 파악 필요)

**문제점**:
- ❌ 데이터 없음 (0행)
- ❌ 컬럼 구조 불명

**Phase 8 요구사항**:
```typescript
interface Service {
  id: string
  title: string
  description: string
  category_id: string           // FK → service_categories
  price: number
  image_url: string             // 메인 이미지
  images?: string[]             // 갤러리 (JSONB or array)
  features?: Feature[]          // 기능 목록 (JSONB)
  metrics?: {                   // 통계 (JSONB)
    users?: number
    satisfaction?: number
  }
  status: 'active' | 'draft' | 'archived'
  created_at: string
  updated_at: string
}
```

**액션**:
1. Supabase SQL Editor에서 스키마 확인 필요
2. 누락된 컬럼 추가
3. 인덱스 설정 (category_id, status)

---

### ✅ 3. posts (정상 - Phase 11용)

**현재 구조**:
```typescript
interface Post {
  id: string
  author_id: string | null
  title: string
  slug: string
  content: string
  status: 'draft' | 'published'
  published_at: string
  created_at: string
  updated_at: string
  excerpt: string
  featured_image_url: string
  tags: string[]              // ⚠️ JSONB 배열
  categories: string[]        // ⚠️ JSONB 배열
}
```

**문제점**:
- ⚠️ `post_tags` 테이블이 별도 존재하지만 사용 안 됨
- ⚠️ `tags`와 `categories`가 JSONB로 post 테이블에 포함됨

**평가**:
- ✅ Phase 11 요구사항 충족
- ✅ 샘플 데이터 6개 존재
- 💡 정규화 vs 비정규화 선택 필요

**액션**:
- 옵션 A: `post_tags` 삭제, JSONB 유지 (현재 방식, 추천)
- 옵션 B: JSONB 제거, `post_tags` 사용 (정규화)

---

### ❌ 4. post_tags (중복 - 삭제 대상)

**문제점**:
- ❌ `posts` 테이블에 이미 `tags` JSONB 컬럼 존재
- ❌ 0행 (사용 안 함)
- ❌ 로드맵에 명시되지 않음

**액션**: 삭제

---

### ⚠️ 5. gallery (목적 불명 - 재검토 필요)

**추정 용도**:
- 옵션 A: 서비스 이미지 갤러리 (`service_images`)
- 옵션 B: 별도 포트폴리오 갤러리
- 옵션 C: 미사용 테이블

**로드맵 확인**:
- Phase 8: "이미지 갤러리 컴포넌트" 명시됨
- 하지만 `service_images` 또는 `services.images[]`로 처리 가능

**액션**:
1. Supabase에서 스키마 확인
2. 용도 파악 후 결정
   - 필요시 → `service_images`로 이름 변경
   - 불필요시 → 삭제

---

### ⚠️ 6. metrics (목적 불명 - 재검토 필요)

**추정 용도**:
- 옵션 A: 서비스별 메트릭 (`services.metrics` JSONB로 충분)
- 옵션 B: 전역 분석 메트릭
- 옵션 C: 미사용 테이블

**로드맵 확인**:
- Phase 8: "메트릭 시각화" 명시됨
- 하지만 `services.metrics` JSONB로 충분

**액션**:
1. Supabase에서 스키마 확인
2. 용도 파악 후 결정
   - 서비스 메트릭 → 삭제 (services.metrics 사용)
   - 전역 메트릭 → 유지 + 구조 정의

---

### 🔄 7. Phase 9 테이블 (전자상거래)

**테이블**: `carts`, `orders`, `order_items`, `payments`

**현재 상태**: 모두 0행 (구조만 존재)

**액션**:
1. Supabase SQL Editor로 스키마 확인
2. Phase 9 요구사항과 비교
3. 누락 컬럼 추가 (예: `orders.shipping_address` JSONB)

---

### 🔄 8. Phase 10 테이블 (인증)

**테이블**: `user_profiles`, `user_roles`

**현재 상태**: 모두 0행 (구조만 존재)

**액션**:
1. Supabase SQL Editor로 스키마 확인
2. `auth.users` 테이블과 연동 확인 (FK)
3. RBAC 구조 검증

---

### ✅ 9. Phase 12 테이블 (고급 기능)

**테이블**: `chat_messages`, `analytics_events`

**현재 상태**: 모두 0행 (구조만 존재)

**평가**: Phase 12까지 사용하지 않으므로 유지

---

## 🎯 개선 액션 플랜

### Step 1: 상세 스키마 확인 (Supabase SQL Editor)

**실행 파일**: `docs/database/extract-schema.sql`

**확인 대상**:
1. ⭐ `services` - 전체 컬럼 구조
2. ⚠️ `gallery` - 용도 및 구조
3. ⚠️ `metrics` - 용도 및 구조
4. 🔄 `carts`, `orders`, `order_items`, `payments` - Phase 9 준비 상태
5. 🔄 `user_profiles`, `user_roles` - Phase 10 준비 상태
6. 🔗 Foreign Key 관계 확인
7. 🔒 RLS 정책 확인

---

### Step 2: 불필요한 테이블 삭제

**삭제 대상**:
- ❌ `post_tags` - posts.tags JSONB로 대체됨
- ❌ `gallery` (용도 불명 시)
- ❌ `metrics` (서비스 메트릭용이면 삭제)

**삭제 SQL** (Step 1 확인 후 작성):
```sql
DROP TABLE IF EXISTS post_tags;
DROP TABLE IF EXISTS gallery;    -- 조건부
DROP TABLE IF EXISTS metrics;    -- 조건부
```

---

### Step 3: services 테이블 개선

**누락 가능성 있는 컬럼**:
```sql
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES service_categories(id),
  ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metrics jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_created ON services(created_at DESC);
```

---

### Step 4: service_categories 소폭 개선

```sql
ALTER TABLE service_categories
  ADD COLUMN IF NOT EXISTS icon text,          -- 아이콘 이름 (lucide-react)
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
```

---

### Step 5: RLS (Row Level Security) 설정

**services 테이블**:
```sql
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Public: active 서비스만 조회
CREATE POLICY "Public can view active services"
  ON services FOR SELECT
  USING (status = 'active');

-- Admin: 모든 CRUD
CREATE POLICY "Admins can manage services"
  ON services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
```

---

## 📋 다음 단계 체크리스트

### 즉시 실행 (우선순위 높음)
- [ ] Supabase SQL Editor에서 `docs/database/extract-schema.sql` 실행
- [ ] 결과를 `docs/database/detailed-schema.md`에 정리
- [ ] `services` 테이블 구조 확인
- [ ] `gallery`, `metrics` 용도 확인

### 구조 개선 (Step 1 완료 후)
- [ ] 불필요 테이블 삭제 SQL 작성
- [ ] `services` 개선 SQL 작성
- [ ] `service_categories` 개선 SQL 작성
- [ ] RLS 정책 SQL 작성

### 마이그레이션 실행
- [ ] Supabase Dashboard에서 백업 생성
- [ ] 마이그레이션 SQL 실행
- [ ] 데이터 무결성 검증
- [ ] TypeScript 타입 생성

### 샘플 데이터 삽입
- [ ] 서비스 3개 (AI 도구, 워크플로우, 데이터 분석)
- [ ] 각 서비스에 이미지, 기능, 메트릭 포함

---

## 🚨 주의사항

### 데이터 보존
- ✅ `service_categories` - 4개 행 유지 필수
- ✅ `posts` - 6개 행 유지 필수
- ⚠️ `gallery`, `metrics` - Step 1 확인 후 결정

### 외래 키 제약
- `services.category_id` → `service_categories.id` (추가 예정)
- `posts.author_id` → `auth.users.id` (확인 필요)

### RLS 영향
- Public read 정책 적용 시 anon key로 조회 가능
- Admin write 정책 적용 시 인증된 admin만 수정 가능

---

## 📊 최종 스키마 목표 (Phase 8 완료 시)

### Core Tables (Phase 8)
```
services
├── id (uuid, PK)
├── title (text)
├── description (text)
├── category_id (uuid, FK)
├── price (numeric)
├── image_url (text)
├── images (jsonb)
├── features (jsonb)
├── metrics (jsonb)
├── status (text)
├── created_at (timestamptz)
└── updated_at (timestamptz)

service_categories
├── id (uuid, PK)
├── name (text)
├── slug (text, UNIQUE)
├── description (text)
├── display_order (integer)
├── icon (text) -- ⭐ NEW
├── is_active (boolean) -- ⭐ NEW
└── created_at (timestamptz)
```

### Future Tables (Phase 9+)
- ✅ `carts`, `orders`, `order_items`, `payments` (Phase 9)
- ✅ `user_profiles`, `user_roles` (Phase 10)
- ✅ `posts` (Phase 11)
- ✅ `chat_messages`, `analytics_events` (Phase 12)

### Removed Tables
- ❌ `post_tags` (중복)
- ❌ `gallery` (목적 불명 시)
- ❌ `metrics` (목적 불명 시)

---

**다음 액션**: `docs/database/extract-schema.sql` 실행 → 상세 구조 파악 🚀
