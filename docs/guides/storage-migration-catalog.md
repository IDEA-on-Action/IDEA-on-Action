# Storage Migration Catalog

> Supabase Storage → Cloudflare R2 마이그레이션 대상 파일 목록

## 마이그레이션 상태

| 상태 | 설명 |
|------|------|
| ⬜ | 미시작 |
| 🔄 | 진행 중 |
| ✅ | 완료 |

---

## 인프라 (완료)

| 파일 | 상태 | 설명 |
|------|------|------|
| `cloudflare-workers/src/handlers/storage/r2.ts` | ✅ | R2 스토리지 핸들러 |
| `cloudflare-workers/wrangler.toml` | ✅ | R2 버킷 바인딩 |
| `scripts/migrate-to-r2.ts` | ✅ | 데이터 마이그레이션 스크립트 |
| `src/integrations/cloudflare/storage.ts` | ✅ | R2 클라이언트 |
| `src/lib/storage/url-rewriter.ts` | ✅ | URL 변환 유틸리티 |
| `src/hooks/useR2Storage.ts` | ✅ | R2 스토리지 훅 |
| `src/hooks/useStorageUrl.ts` | ✅ | URL 변환 훅 |

---

## 프론트엔드 파일 (Phase 5)

### 우선순위 1: 핵심 유틸리티

| 파일 | 상태 | 변경 내용 |
|------|------|----------|
| `src/lib/media-utils.ts` | ⬜ | MEDIA_BUCKET 상수, 스토리지 헬퍼 → R2 클라이언트 사용 |

### 우선순위 2: 훅

| 파일 | 상태 | 변경 내용 |
|------|------|----------|
| `src/hooks/useMediaUpload.ts` | ⬜ | supabase.storage → useR2Storage 사용 |
| `src/hooks/useMediaLibrary.ts` | ⬜ | supabase.storage → useR2Storage 사용 |
| `src/hooks/useFileUpload.ts` | ⬜ | supabase.storage → useR2Storage 사용 |
| `src/hooks/useProfile.ts` | ⬜ | avatar_url 처리 → useStorageUrl 사용 |

### 우선순위 3: 컴포넌트

| 파일 | 상태 | 변경 내용 |
|------|------|----------|
| `src/components/admin/media/MediaModal.tsx` | ⬜ | 스토리지 접근 → R2 클라이언트 |
| `src/components/admin/media/MediaItem.tsx` | ⬜ | 이미지 URL → useStorageUrl |
| `src/components/admin/ServiceForm.tsx` | ⬜ | 이미지 업로드 → useR2Storage |
| `src/components/blog/BlogPostForm.tsx` | ⬜ | 이미지 업로드 → useR2Storage |
| `src/components/ai/DocumentUploader.tsx` | ⬜ | 문서 업로드 → useR2Storage |

---

## URL 사용처 (자동 변환 대상)

이미지 URL을 표시하는 모든 컴포넌트에서 `useStorageUrl` 또는 `rewriteStorageUrl` 사용:

```typescript
// Before
<img src={item.image_url} />

// After
import { useStorageUrl } from '@/hooks/useStorageUrl';
const { url } = useStorageUrl(item.image_url);
<img src={url || ''} />
```

또는:

```typescript
// 직접 변환
import { rewriteStorageUrl } from '@/lib/storage/url-rewriter';
<img src={rewriteStorageUrl(item.image_url) || ''} />
```

---

## 마이그레이션 순서

### 1단계: 유틸리티 및 훅 (1일)

```bash
# 수정 순서
1. src/lib/media-utils.ts
2. src/hooks/useMediaUpload.ts
3. src/hooks/useMediaLibrary.ts
4. src/hooks/useFileUpload.ts
5. src/hooks/useProfile.ts
```

### 2단계: Admin 컴포넌트 (1일)

```bash
1. src/components/admin/media/MediaModal.tsx
2. src/components/admin/media/MediaItem.tsx
3. src/components/admin/ServiceForm.tsx
```

### 3단계: 사용자 컴포넌트 (1일)

```bash
1. src/components/blog/BlogPostForm.tsx
2. src/components/ai/DocumentUploader.tsx
```

### 4단계: URL 표시 컴포넌트 (1일)

모든 이미지 URL 표시 위치에 `useStorageUrl` 적용

---

## 롤백 계획

URL 리라이터가 양방향을 지원하므로, 문제 발생 시:

1. R2 → Supabase 역방향 리라이터 추가
2. 환경 변수로 스토리지 선택 (STORAGE_PROVIDER=supabase|r2)
3. 점진적 전환 지원

---

## 체크리스트

- [ ] R2 버킷 생성 및 설정
- [ ] 데이터 마이그레이션 실행 (dry-run → 실행)
- [ ] 프론트엔드 코드 변경
- [ ] 테스트 (업로드, 삭제, 조회)
- [ ] Supabase Storage 버킷 비활성화
