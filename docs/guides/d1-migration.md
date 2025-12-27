# Cloudflare D1 데이터 마이그레이션 가이드

> Supabase PostgreSQL에서 Cloudflare D1으로 데이터 마이그레이션

## 개요

이 가이드는 Supabase PostgreSQL 데이터를 Cloudflare D1 SQLite 데이터베이스로 마이그레이션하는 방법을 설명합니다.

### 마이그레이션 대상

- **소스**: Supabase PostgreSQL (`zykjdneewbzyazfukzyg.supabase.co`)
- **대상**: Cloudflare D1 (`idea-on-action-db`, ID: `53853270-e050-419c-be7e-446eca24d279`)
- **테이블 수**: 55개

## 사전 요구사항

### 환경변수 설정

```bash
# Supabase 서비스 롤 키 (RLS 우회)
export SUPABASE_SERVICE_KEY="your_service_role_key"

# Cloudflare 설정 (wrangler 인증 필요)
wrangler login
```

### D1 스키마 확인

D1에 테이블 스키마가 이미 생성되어 있어야 합니다:

```bash
wrangler d1 execute idea-on-action-db --config=cloudflare-workers/wrangler.toml \
  --command="SELECT name FROM sqlite_master WHERE type='table'"
```

## 마이그레이션 단계

### 1단계: 데이터 추출

Supabase에서 데이터를 추출하고 SQL 파일 생성:

```bash
# 전체 테이블 추출
SUPABASE_SERVICE_KEY=xxx npm run migrate:d1:extract

# 특정 테이블만 추출
SUPABASE_SERVICE_KEY=xxx npx tsx scripts/migrate-to-d1.ts --table=services

# DRY RUN (실제 저장 없이 테스트)
SUPABASE_SERVICE_KEY=xxx npx tsx scripts/migrate-to-d1.ts --dry-run

# 사용자 데이터 제외 (민감 정보)
SUPABASE_SERVICE_KEY=xxx npx tsx scripts/migrate-to-d1.ts --skip-users
```

### 2단계: SQL 파일 확인

생성된 SQL 파일 위치: `scripts/d1-migration/`

```
scripts/d1-migration/
  ├── _combined_migration.sql     # 통합 SQL (권장)
  ├── services_data.sql
  ├── service_categories_data.sql
  ├── blog_posts_data.sql
  └── ...
```

### 3단계: D1에 데이터 삽입

```bash
# 로컬 D1 에뮬레이터로 테스트 (권장)
npm run migrate:d1:execute -- --combined --local

# 프로덕션 D1에 실행
npm run migrate:d1:all

# 특정 테이블만 실행
npm run migrate:d1:execute -- --table=services
```

### 4단계: 검증

```bash
# 행 수 비교 검증
SUPABASE_SERVICE_KEY=xxx npx tsx scripts/d1-verify.ts

# 특정 테이블만 검증
SUPABASE_SERVICE_KEY=xxx npx tsx scripts/d1-verify.ts --table=services
```

## 데이터 변환 규칙

### PostgreSQL -> SQLite 타입 변환

| PostgreSQL | SQLite | 변환 방법 |
|------------|--------|-----------|
| UUID | TEXT | 그대로 유지 |
| TIMESTAMPTZ | TEXT | ISO 8601 형식 |
| BOOLEAN | INTEGER | 0 또는 1 |
| JSONB | TEXT | JSON 문자열 |
| NUMERIC | REAL | 그대로 유지 |
| ARRAY | TEXT | JSON 배열 문자열 |
| CITEXT | TEXT | 대소문자 구분 |

### 민감 데이터 처리

| 필드 | 처리 방법 |
|------|-----------|
| `password_hash` | 제외 (마이그레이션 안 함) |
| `access_token`, `refresh_token` | 제외 |
| `email` | 마스킹 (`t***t@domain.com`) |
| `customer_phone` | 마스킹 (`****1234`) |
| `gateway_response` | 포함 (결제 기록) |
| `billing_address` | 포함 (주문 기록) |

## 테이블 마이그레이션 순서

외래키 종속성을 고려한 순서:

1. **독립 테이블**: `service_categories`, `post_categories`, `post_tags`, `role`, `feature_flag`, `projects`, `notices`
2. **사용자**: `app_user` (민감 데이터 주의)
3. **사용자 참조**: `user_role`, `user_identity`, `user_session`
4. **서비스**: `services`, `service_category_mapping`, `service_gallery`, `service_metrics`
5. **상품**: `product`, `product_variant`
6. **주문**: `carts`, `cart_items`, `orders`, `order_items`, `payments`
7. **블로그**: `blog_posts`, `post_tag_relations`, `posts`
8. **A/B 테스트**: `ab_test_experiment`, `ab_test_assignment`, `ab_test_event`
9. **기타**: `feature_flag_override`, `rag_documents`

## 주의사항

### 대용량 테이블

- D1은 한 번에 최대 10MB SQL 실행 가능
- 대용량 테이블은 배치로 분할 (`--batch-size=100`)

### 외래키

- 마이그레이션 중 외래키 비활성화: `PRAGMA foreign_keys = OFF;`
- 마이그레이션 후 활성화: `PRAGMA foreign_keys = ON;`

### 롤백

D1은 트랜잭션 지원:

```sql
-- 테이블별 롤백
DELETE FROM services;

-- 전체 롤백 (위험!)
-- 각 테이블을 역순으로 DELETE
```

## 스크립트 옵션

### migrate-to-d1.ts

```
--dry-run         실제 저장 없이 시뮬레이션
--table=<name>    특정 테이블만 추출
--batch-size=N    배치 크기 (기본: 100)
--skip-users      사용자 데이터 제외
--output=<path>   출력 디렉토리 지정
```

### d1-execute.ts

```
--file=<path>     특정 SQL 파일 실행
--table=<name>    특정 테이블 SQL 실행
--combined        통합 SQL 실행
--all             모든 테이블 순차 실행
--local           로컬 에뮬레이터 사용
--preview         staging 환경 실행
```

### d1-verify.ts

```
--table=<name>    특정 테이블 검증
--quick           행 수만 빠르게 비교
--detailed        샘플 데이터 체크섬 비교
```

## 문제 해결

### "테이블 없음" 오류

D1에 스키마가 없는 경우:

```bash
wrangler d1 execute idea-on-action-db \
  --config=cloudflare-workers/wrangler.toml \
  --file=cloudflare-workers/migrations/0001_create_tables.sql
```

### "외래키 위반" 오류

종속성 순서를 확인하고, 필요시 개별 테이블 실행:

```bash
npx tsx scripts/d1-execute.ts --table=service_categories
npx tsx scripts/d1-execute.ts --table=services
```

### "문자열 이스케이프" 오류

특수 문자 포함 데이터 확인:

```sql
-- 문제 있는 행 찾기
SELECT id, title FROM services WHERE title LIKE "%'%";
```

## 관련 문서

- [Cloudflare D1 공식 문서](https://developers.cloudflare.com/d1/)
- [프로젝트 마이그레이션 계획](../project/cloudflare-migration-plan.md)
- [R2 스토리지 마이그레이션](./storage/r2-migration.md)
