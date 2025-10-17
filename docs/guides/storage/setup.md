# Supabase Storage 설정 가이드

**마지막 업데이트**: 2025-10-17
**버전**: 1.5.0

---

## 📋 개요

서비스 이미지 업로드를 위한 Supabase Storage 버킷 설정 가이드입니다.

---

## 🚀 설정 단계

### 1. Storage 버킷 생성

1. **Supabase Dashboard** 접속
   - URL: https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg

2. **Storage 메뉴** 클릭
   - 왼쪽 사이드바 → Storage

3. **Create Bucket** 클릭
   - Bucket Name: `services`
   - Public Bucket: ✅ **체크** (공개 URL 필요)
   - Create 버튼 클릭

### 2. RLS (Row Level Security) 정책 설정

**SQL Editor에서 실행**:

```sql
-- 1. 관리자만 업로드 가능
CREATE POLICY "Admins can upload service images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'services' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 2. 관리자만 삭제 가능
CREATE POLICY "Admins can delete service images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'services' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 3. 모든 사람이 읽기 가능 (Public)
CREATE POLICY "Public can view service images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'services');
```

### 3. 버킷 설정 확인

**Bucket Settings**:
- **File Size Limit**: 5MB (기본값)
- **Allowed MIME Types**: 설정 불필요 (코드에서 검증)
- **Public**: ✅ Enabled

---

## 🔧 코드 통합

### ServiceForm 컴포넌트에서 사용

**이미지 업로드 흐름**:
1. 사용자가 파일 선택 (input type="file")
2. 파일 검증 (크기, 형식)
3. Supabase Storage에 업로드
4. Public URL 가져오기
5. `images` 배열에 추가
6. 서비스 저장 시 DB에 저장

**코드 예시**:
```typescript
// 1. 파일명 생성 (timestamp + random)
const fileExt = file.name.split('.').pop()
const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
const filePath = `service-images/${fileName}`

// 2. Supabase Storage에 업로드
const { data, error } = await supabase.storage
  .from('services')
  .upload(filePath, file)

if (error) throw error

// 3. Public URL 가져오기
const { data: { publicUrl } } = supabase.storage
  .from('services')
  .getPublicUrl(data.path)

// 4. URL 사용
console.log(publicUrl)
// https://zykjdneewbzyazfukzyg.supabase.co/storage/v1/object/public/services/service-images/123456-abc.jpg
```

---

## ✅ 검증

### 1. 버킷 생성 확인
- Storage → `services` 버킷이 보이는가?
- Public 아이콘이 표시되는가?

### 2. RLS 정책 확인
```sql
-- 정책 목록 조회
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

예상 결과:
- `Admins can upload service images`
- `Admins can delete service images`
- `Public can view service images`

### 3. 업로드 테스트
1. 관리자 계정으로 로그인 (`admin` / `demian00`)
2. `/admin/services/new` 접속
3. 이미지 업로드 버튼 클릭
4. JPG/PNG 파일 선택 (5MB 이하)
5. 업로드 성공 메시지 확인
6. 이미지 미리보기 표시 확인

### 4. Public URL 확인
```
https://zykjdneewbzyazfukzyg.supabase.co/storage/v1/object/public/services/service-images/[파일명]
```

브라우저에서 직접 접속하여 이미지가 보이는지 확인

---

## 🐛 문제 해결

### 문제: 업로드 실패 (403 Forbidden)
**원인**: RLS 정책 미설정 또는 관리자 권한 없음

**해결**:
1. user_roles 테이블 확인:
   ```sql
   SELECT * FROM user_roles WHERE user_id = auth.uid();
   ```
2. RLS 정책 확인 (위 SQL 실행)
3. 관리자 역할 추가:
   ```sql
   INSERT INTO user_roles (user_id, role)
   VALUES (auth.uid(), 'admin');
   ```

### 문제: 업로드 성공했지만 이미지 안 보임
**원인**: Public Bucket 설정 안 됨

**해결**:
1. Storage → services → Settings
2. "Make public" 버튼 클릭
3. 또는 삭제 후 재생성 (Public 체크)

### 문제: 파일 크기 초과 (413 Payload Too Large)
**원인**: 5MB 초과 파일 업로드

**해결**:
- 클라이언트 검증 확인 (코드에서 5MB 제한)
- 이미지 압축 도구 사용 (TinyPNG, ImageOptim 등)

### 문제: CORS 에러
**원인**: Supabase 프로젝트 설정

**해결**:
1. Supabase Dashboard → Settings → API
2. "Site URL" 확인: `https://www.ideaonaction.ai`
3. "Additional URLs" 추가: `http://localhost:5173` (개발용)

---

## 📁 파일 구조

Storage에 업로드된 파일은 다음 구조로 저장됩니다:

```
services/
└── service-images/
    ├── 1729123456-abc123.jpg
    ├── 1729123457-def456.png
    └── 1729123458-ghi789.webp
```

---

## 🔒 보안 고려사항

### 1. 업로드 권한
- ✅ 관리자만 업로드 가능 (RLS 정책)
- ✅ 크기 제한 (5MB)
- ✅ 형식 제한 (JPG, PNG, WEBP)

### 2. 삭제 권한
- ✅ 관리자만 삭제 가능
- ⚠️ 현재 코드: UI에서만 제거 (Storage에는 남음)
- 📝 향후: 서비스 삭제 시 Storage 파일도 삭제

### 3. Public Access
- ✅ 읽기만 공개
- ✅ 직접 URL 접근 가능 (CDN처럼 사용)
- ⚠️ 민감한 정보는 업로드 금지

---

## 📊 용량 관리

### 현재 플랜 (Supabase Free Tier)
- Storage: 1GB
- Bandwidth: 2GB/월

### 모니터링
```sql
-- 전체 파일 크기 확인
SELECT
  bucket_id,
  COUNT(*) as file_count,
  SUM(metadata->>'size')::bigint as total_size_bytes,
  ROUND(SUM((metadata->>'size')::bigint) / 1024.0 / 1024.0, 2) as total_size_mb
FROM storage.objects
WHERE bucket_id = 'services'
GROUP BY bucket_id;
```

### 정리 작업 (필요 시)
```sql
-- 30일 이상 된 고아 파일 찾기 (services 테이블에 없는 이미지)
SELECT o.name, o.created_at
FROM storage.objects o
WHERE o.bucket_id = 'services'
  AND o.created_at < NOW() - INTERVAL '30 days'
  AND NOT EXISTS (
    SELECT 1 FROM services s
    WHERE o.name = ANY(s.images)
  );
```

---

## 🎯 다음 단계

1. ✅ Storage 버킷 생성
2. ✅ RLS 정책 설정
3. 📝 이미지 최적화 기능 추가 (Phase 10)
4. 📝 자동 썸네일 생성 (Supabase Functions)
5. 📝 CDN 연동 (Cloudflare, Vercel Edge)

---

## 📚 참고 자료

- [Supabase Storage 공식 문서](https://supabase.com/docs/guides/storage)
- [RLS 정책 가이드](https://supabase.com/docs/guides/storage/security/access-control)
- [ServiceForm.tsx](../../../src/components/admin/ServiceForm.tsx) - 업로드 코드 구현

---

**End of Guide**
