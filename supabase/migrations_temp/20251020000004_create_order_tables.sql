-- Phase 9 Week 2: Order System
-- Migration: 20251020000003_create_order_tables.sql
-- Author: Claude AI
-- Date: 2025-10-20
-- Description: Orders and order items tables with RPC function

-- =====================================================
-- 1. ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Order number (human-readable)
  order_number TEXT NOT NULL UNIQUE, -- Format: ORD-YYYYMMDD-XXXX

  -- Financial details
  subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  tax_amount NUMERIC(10,2) CHECK (tax_amount >= 0),
  discount_amount NUMERIC(10,2) CHECK (discount_amount >= 0),
  shipping_fee NUMERIC(10,2) CHECK (shipping_fee >= 0),
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),

  -- Order status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
  )),

  -- Shipping information
  shipping_address JSONB, -- { postcode, address, addressDetail, city, state }
  shipping_name TEXT,
  shipping_phone TEXT,
  shipping_note TEXT,

  -- Contact information
  contact_email TEXT,
  contact_phone TEXT,

  -- Payment reference
  payment_id UUID, -- Will be updated after payment completion

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

COMMENT ON TABLE public.orders IS 'Customer orders';
COMMENT ON COLUMN public.orders.order_number IS 'Human-readable order number (ORD-YYYYMMDD-XXXX)';
COMMENT ON COLUMN public.orders.status IS 'Order lifecycle: pending → confirmed → processing → shipped → delivered';
COMMENT ON COLUMN public.orders.shipping_address IS 'JSONB: { postcode, address, addressDetail, city?, state? }';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- =====================================================
-- 2. ORDER_ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,

  -- Snapshot data (preserved even if service is deleted)
  service_title TEXT NOT NULL,
  service_description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),

  -- Full service snapshot
  service_snapshot JSONB, -- Complete service data at time of order

  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.order_items IS 'Items in orders with historical snapshots';
COMMENT ON COLUMN public.order_items.service_id IS 'NULL if service was deleted, but snapshot remains';
COMMENT ON COLUMN public.order_items.service_snapshot IS 'Complete service data preserved for historical records';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_service_id ON public.order_items(service_id);

-- =====================================================
-- 3. RLS POLICIES - Orders
-- =====================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can insert own orders"
  ON public.orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pending orders"
  ON public.orders FOR UPDATE
  USING (
    user_id = auth.uid()
    AND status IN ('pending', 'confirmed')
  );

CREATE POLICY "Admins can update any order"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'manager')
    )
  );

-- =====================================================
-- 4. RLS POLICIES - Order Items
-- =====================================================
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can insert own order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_id
        AND orders.user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. TRIGGERS (Auto-update timestamps)
-- =====================================================
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to generate order number (ORD-YYYYMMDD-XXXX)
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  today TEXT;
  sequence_num INTEGER;
  order_num TEXT;
BEGIN
  today := TO_CHAR(NOW(), 'YYYYMMDD');

  -- Get count of orders today + 1
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM public.orders
  WHERE order_number LIKE 'ORD-' || today || '-%';

  -- Format: ORD-20251020-0001
  order_num := 'ORD-' || today || '-' || LPAD(sequence_num::TEXT, 4, '0');

  RETURN order_num;
END;
$$ LANGUAGE plpgsql VOLATILE;

COMMENT ON FUNCTION public.generate_order_number IS 'Generates unique order number: ORD-YYYYMMDD-XXXX';
