-- Phase 9 Week 1: Cart System
-- Migration: 20251020000002_create_cart_tables.sql
-- Author: Claude AI
-- Date: 2025-10-20
-- Description: Shopping cart and cart items tables

-- =====================================================
-- 1. CARTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.carts IS 'Shopping carts (one per user)';
COMMENT ON COLUMN public.carts.user_id IS 'One cart per user enforced by UNIQUE constraint';

-- Create index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);

-- =====================================================
-- 2. CART_ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0), -- Price snapshot at time of adding
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cart_id, service_id) -- Prevent duplicate service in same cart
);

COMMENT ON TABLE public.cart_items IS 'Items in shopping carts';
COMMENT ON COLUMN public.cart_items.price IS 'Price snapshot when item was added to cart';
COMMENT ON COLUMN public.cart_items.quantity IS 'Quantity must be positive';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_service_id ON public.cart_items(service_id);

-- =====================================================
-- 3. RLS POLICIES - Carts
-- =====================================================
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cart"
  ON public.carts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own cart"
  ON public.carts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cart"
  ON public.carts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own cart"
  ON public.carts FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 4. RLS POLICIES - Cart Items
-- =====================================================
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cart items"
  ON public.cart_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_items.cart_id
        AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own cart items"
  ON public.cart_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_id
        AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own cart items"
  ON public.cart_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_items.cart_id
        AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own cart items"
  ON public.cart_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_items.cart_id
        AND carts.user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. TRIGGERS (Auto-update timestamps)
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_carts_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
