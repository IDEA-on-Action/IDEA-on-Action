---
name: supabase-helper
description: Supabase 마이그레이션, RLS 정책, Edge Functions 작업 시 사용. supabase, migration, RLS, Edge Function 키워드에 자동 활성화.
allowed-tools: Read, Bash, Grep, Write
---

# Supabase Helper

## 마이그레이션 작성

- 파일명: `YYYYMMDDHHMMSS_description.sql` (UTC 기준)
- 위치: `supabase/migrations/`
- RLS 정책 포함 필수

### 마이그레이션 템플릿

```sql
-- 테이블 생성
CREATE TABLE IF NOT EXISTS public.table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "policy_name" ON public.table_name
  FOR SELECT USING (auth.uid() = user_id);
```

## Edge Functions

- 위치: `supabase/functions/function-name/`
- CORS 설정: `supabase/functions/_shared/cors.ts`
- 타입: `supabase/functions/_shared/` 공유

### Edge Function 템플릿

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // 로직 구현

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
```

## 명령어

- `supabase db reset`: 로컬 DB 리셋
- `supabase db push`: 원격 마이그레이션
- `supabase functions deploy`: 함수 배포
- `supabase functions logs`: 함수 로그 확인
