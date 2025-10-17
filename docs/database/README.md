# 📊 Database Documentation

> VIBE WORKING 프로젝트 Supabase 데이터베이스 문서

**최종 업데이트**: 2025-10-17
**스키마 버전**: 1.0.0
**마이그레이션 상태**: Phase 8-12 준비 완료

---

## 📁 문서 구조

```
docs/database/
├── README.md                             # 이 파일 (문서 인덱스)
├── current-schema.json                   # 현재 스키마 (자동 생성)
├── schema-analysis-report.md             # 스키마 분석 리포트
├── migration-guide.md                    # 마이그레이션 실행 가이드
├── extract-schema.sql                    # 스키마 추출 SQL
└── migrations/
    ├── 001-schema-cleanup-and-improvement.sql  # 메인 마이그레이션
    └── 002-insert-sample-services.sql          # 샘플 데이터
```

---

## 🚀 빠른 시작

### 1. 현재 스키마 확인

```bash
# 자동 스키마 추출 (Node.js 스크립트)
cd d:\GitHub\idea-on-action
node scripts/extract-schema.js

# 결과 확인
cat docs/database/current-schema.json
```

### 2. 마이그레이션 실행

**전제 조건**:
- ✅ Supabase 백업 생성
- ✅ Owner/Admin 권한

**실행 순서**:
1. `migration-guide.md` 읽기
2. `001-schema-cleanup-and-improvement.sql` 실행
3. `002-insert-sample-services.sql` 실행
4. 검증 및 테스트

**자세한 가이드**: [migration-guide.md](./migration-guide.md)

---

## 📊 데이터베이스 스키마 개요

### Phase 8: Services & Categories (현재)

**핵심 테이블**:
- `services` - 서비스 정보 (11개 컬럼)
- `service_categories` - 서비스 카테고리 (8개 컬럼)

**샘플 데이터**:
- AI 워크플로우 자동화 도구
- 스마트 데이터 분석 플랫폼
- 비즈니스 컨설팅 패키지

### Phase 9: E-commerce (준비 완료)

**테이블**:
- `carts` - 장바구니
- `orders` - 주문
- `order_items` - 주문 상품
- `payments` - 결제

### Phase 10: Authentication (준비 완료)

**테이블**:
- `user_profiles` - 사용자 프로필
- `user_roles` - 사용자 역할 (RBAC)

### Phase 11: Content Management (이미 구축됨)

**테이블**:
- `posts` - 블로그 게시글 (6개 샘플 데이터)

### Phase 12: Advanced Features (준비 완료)

**테이블**:
- `chat_messages` - AI 챗봇 대화
- `analytics_events` - 분석 이벤트

---

## 🔗 관계도 (ERD)

```
┌─────────────────┐
│ service_        │
│ categories      │
│ (카테고리)      │
└────────┬────────┘
         │ 1
         │
         │ N
┌────────▼────────┐        ┌─────────────┐
│ services        │───────▶│ order_items │
│ (서비스)        │        │ (주문상품)  │
└─────────────────┘        └──────┬──────┘
                                  │
                           ┌──────▼──────┐
                           │ orders      │
                           │ (주문)      │
                           └──────┬──────┘
                                  │
                           ┌──────▼──────┐
                           │ payments    │
                           │ (결제)      │
                           └─────────────┘

┌─────────────────┐
│ auth.users      │
│ (Supabase Auth) │
└────┬───────┬────┘
     │       │
     │       └──────┐
     │              │
     ▼              ▼
┌────────────┐  ┌───────────┐
│user_profiles│ │user_roles │
│(프로필)     │ │(역할)     │
└────────────┘  └───────────┘

┌─────────────────┐
│ posts           │
│ (블로그)        │
└─────────────────┘
```

---

## 🔒 보안 (RLS 정책)

### services 테이블
- **Public**: `status = 'active'` 서비스만 조회
- **Admin**: 모든 CRUD 작업 허용

### service_categories 테이블
- **Public**: `is_active = true` 카테고리만 조회
- **Admin**: 모든 CRUD 작업 허용

### carts 테이블
- **User**: 본인 장바구니만 관리

### orders 테이블
- **User**: 본인 주문만 조회 및 생성
- **Admin**: 모든 주문 관리

### posts 테이블
- **Public**: `status = 'published'` 게시글만 조회
- **Author**: 본인 게시글 관리
- **Admin**: 모든 게시글 관리

---

## 📝 주요 문서

### 분석 및 계획
- [schema-analysis-report.md](./schema-analysis-report.md) - 스키마 분석 리포트
  - 현재 상태 분석
  - 로드맵 요구사항 매핑
  - 개선 방향 제시

### 실행 가이드
- [migration-guide.md](./migration-guide.md) - 마이그레이션 실행 가이드
  - 단계별 실행 방법
  - 문제 해결 가이드
  - 검증 체크리스트

### SQL 파일
- [extract-schema.sql](./extract-schema.sql) - 스키마 추출 쿼리
- [migrations/001-schema-cleanup-and-improvement.sql](./migrations/001-schema-cleanup-and-improvement.sql) - 메인 마이그레이션
- [migrations/002-insert-sample-services.sql](./migrations/002-insert-sample-services.sql) - 샘플 데이터

---

## 🛠️ TypeScript 타입

**파일**: `src/types/database.ts`

### 주요 타입

```typescript
// 서비스
export interface Service {
  id: string
  title: string
  description: string | null
  category_id: string | null
  price: number
  image_url: string | null
  images: string[]
  features: ServiceFeature[]
  metrics: ServiceMetrics | null
  status: 'active' | 'draft' | 'archived'
  created_at: string
  updated_at: string
}

// 카테고리
export interface ServiceCategory {
  id: string
  name: string
  slug: string
  description: string | null
  display_order: number
  icon: string | null
  is_active: boolean
  created_at: string
  updated_at: string | null
}

// INSERT/UPDATE 헬퍼
export type ServiceInsert = Omit<Service, 'id' | 'created_at' | 'updated_at'>
export type ServiceUpdate = Partial<Omit<Service, 'id' | 'created_at'>>
```

### 사용 예시

```typescript
import { Service, ServiceInsert } from '@/types/database'
import { supabase } from '@/lib/supabase'

// 조회
const { data: services } = await supabase
  .from('services')
  .select('*, category:service_categories(*)')
  .eq('status', 'active')

// 삽입
const newService: ServiceInsert = {
  title: 'New Service',
  description: 'Description',
  category_id: 'uuid',
  price: 100000,
  // ...
}

await supabase.from('services').insert(newService)
```

---

## 📈 마이그레이션 히스토리

### v1.0.0 (2025-10-17)
- **001-schema-cleanup-and-improvement.sql**
  - ❌ `post_tags` 삭제 (중복)
  - ✅ `services` 테이블 구조 완성 (11개 컬럼)
  - ✅ `service_categories` 개선 (icon, is_active 추가)
  - ✅ Phase 9-10 테이블 검증 및 개선
  - ✅ RLS 정책 10개 설정
  - ✅ 인덱스 최적화

- **002-insert-sample-services.sql**
  - ✅ 샘플 서비스 3개 삽입
  - ✅ 각 서비스에 features 5개, images 3개 포함
  - ✅ 메트릭 데이터 포함

---

## 🔍 쿼리 예시

### 서비스 목록 조회 (카테고리 포함)

```sql
SELECT
  s.id,
  s.title,
  s.description,
  s.price,
  s.image_url,
  sc.name AS category_name,
  sc.icon AS category_icon,
  jsonb_array_length(s.features) AS feature_count,
  s.metrics->>'users' AS total_users
FROM services s
LEFT JOIN service_categories sc ON s.category_id = sc.id
WHERE s.status = 'active'
ORDER BY s.created_at DESC;
```

### 카테고리별 서비스 수

```sql
SELECT
  sc.name,
  sc.slug,
  sc.icon,
  COUNT(s.id) AS service_count
FROM service_categories sc
LEFT JOIN services s ON s.category_id = sc.id AND s.status = 'active'
WHERE sc.is_active = true
GROUP BY sc.id, sc.name, sc.slug, sc.icon
ORDER BY sc.display_order;
```

### 주문 내역 (상품 및 결제 정보 포함)

```sql
SELECT
  o.id,
  o.total_amount,
  o.status AS order_status,
  p.status AS payment_status,
  p.provider AS payment_provider,
  json_agg(
    json_build_object(
      'service', s.title,
      'quantity', oi.quantity,
      'unit_price', oi.unit_price
    )
  ) AS items
FROM orders o
LEFT JOIN payments p ON p.order_id = o.id
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN services s ON s.id = oi.service_id
WHERE o.user_id = auth.uid()
GROUP BY o.id, p.id
ORDER BY o.created_at DESC;
```

---

## 🧪 테스트

### RLS 정책 테스트

```bash
# Supabase SQL Editor에서 "Run as anon" 선택 후 실행

-- ✅ 성공 (public은 active만 조회)
SELECT * FROM services WHERE status = 'active';

-- ❌ 실패 (draft는 조회 불가)
SELECT * FROM services WHERE status = 'draft';

-- ✅ 성공 (카테고리 조회)
SELECT * FROM service_categories WHERE is_active = true;
```

### 외래 키 제약 테스트

```sql
-- ✅ 성공 (유효한 category_id)
INSERT INTO services (title, category_id, price)
VALUES ('Test Service', (SELECT id FROM service_categories LIMIT 1), 100000);

-- ❌ 실패 (존재하지 않는 category_id)
INSERT INTO services (title, category_id, price)
VALUES ('Test Service', 'invalid-uuid', 100000);
-- ERROR: insert or update on table "services" violates foreign key constraint
```

---

## 📞 지원 및 문의

### 문서 관련
- **GitHub**: [IdeaonAction-Homepage](https://github.com/IDEA-on-Action/IdeaonAction-Homepage)
- **Issues**: [GitHub Issues](https://github.com/IDEA-on-Action/IdeaonAction-Homepage/issues)

### Supabase 관련
- **Dashboard**: https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg
- **Docs**: https://supabase.com/docs

### 프로젝트 관련
- **담당자**: 서민원 (sinclairseo@gmail.com)
- **전화**: 010-4904-2671

---

## 🔗 관련 문서

- [프로젝트 메인 문서](../../CLAUDE.md)
- [프로젝트 로드맵](../project/roadmap.md)
- [Phase 8 TODO](../../project-todo.md)
- [TypeScript 타입 정의](../../src/types/database.ts)

---

**데이터베이스 스키마 최적화 완료! Phase 8 개발 준비 완료 🚀**
