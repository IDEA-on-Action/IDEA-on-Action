-- =====================================================
-- Add metadata column to subscription_payments
-- =====================================================
-- Description: subscription_payments 테이블에 metadata 컬럼 추가
-- Created: 2025-11-22
-- Author: Claude & Sinclair Seo
-- =====================================================

-- Add metadata column to store full Toss Payments response
ALTER TABLE public.subscription_payments
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for metadata (for potential querying)
CREATE INDEX IF NOT EXISTS idx_subscription_payments_metadata
ON public.subscription_payments USING GIN (metadata);

-- Add comment
COMMENT ON COLUMN public.subscription_payments.metadata IS '토스페이먼츠 API 응답 전체 (JSONB)';
