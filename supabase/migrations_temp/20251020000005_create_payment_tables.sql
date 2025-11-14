-- Phase 9 Week 3: Payment System
-- Migration: 20251020000004_create_payment_tables.sql
-- Author: Claude AI
-- Date: 2025-10-20
-- Description: Payment transactions and gateway integration

-- =====================================================
-- 1. PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,

  -- Payment details
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'completed', 'failed', 'cancelled', 'refunded'
  )),

  -- Payment gateway
  provider TEXT CHECK (provider IN ('kakao', 'toss', 'stripe', 'paypal')),
  provider_transaction_id TEXT, -- TID from payment gateway
  payment_method TEXT, -- 'card', 'bank_transfer', 'virtual_account', etc.

  -- Card information (masked)
  card_info JSONB, -- { cardType, cardNumber: "****1234", issuer, approveNo }

  -- Metadata
  metadata JSONB DEFAULT '{}', -- Full gateway response for debugging
  failure_reason TEXT, -- Error message if failed

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);

COMMENT ON TABLE public.payments IS 'Payment transactions via multiple gateways';
COMMENT ON COLUMN public.payments.provider IS 'Payment gateway: kakao, toss, stripe, paypal';
COMMENT ON COLUMN public.payments.provider_transaction_id IS 'Transaction ID from payment gateway (TID, paymentKey, etc.)';
COMMENT ON COLUMN public.payments.card_info IS 'Masked card info: { cardType, cardNumber: "****1234", issuer, approveNo }';
COMMENT ON COLUMN public.payments.metadata IS 'Complete gateway response for debugging and reconciliation';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON public.payments(provider);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_transaction_id ON public.payments(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- =====================================================
-- 2. RLS POLICIES - Payments
-- =====================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = payments.order_id
        AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'manager')
    )
  );

CREATE POLICY "System can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update payments"
  ON public.payments FOR UPDATE
  USING (true);

-- =====================================================
-- 3. TRIGGER - Update order payment_id after payment
-- =====================================================

-- Function to update order.payment_id when payment is completed
CREATE OR REPLACE FUNCTION public.update_order_payment_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Update order.payment_id when payment status becomes 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.orders
    SET payment_id = NEW.id
    WHERE id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_payment_id
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.update_order_payment_id();

COMMENT ON FUNCTION public.update_order_payment_id IS 'Auto-update order.payment_id when payment completes';
