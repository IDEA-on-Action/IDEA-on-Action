-- Database Optimization Migration
-- Created at: 2025-11-29
-- Purpose: Add missing indexes for performance optimization

-- Services Table Indexes
CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON public.services(status);
CREATE INDEX IF NOT EXISTS idx_services_slug ON public.services(slug);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON public.services(created_at DESC);

-- Blog Posts Table Indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON public.blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON public.blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts(published_at DESC);

-- Orders Table Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

-- Order Items Table Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_service_id ON public.order_items(service_id);

-- Cart Items Table Indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_service_id ON public.cart_items(service_id);

-- Payments Table Indexes
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- User Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_verified ON public.user_profiles(email_verified);

-- Roadmap Items Indexes
CREATE INDEX IF NOT EXISTS idx_roadmap_items_status ON public.roadmap_items(status);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_category ON public.roadmap_items(category);

-- Portfolio Items Indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_items_slug ON public.portfolio_items(slug);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_project_type ON public.portfolio_items(project_type);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_featured ON public.portfolio_items(featured) WHERE featured = true;

-- Lab Items Indexes
CREATE INDEX IF NOT EXISTS idx_lab_items_slug ON public.lab_items(slug);
CREATE INDEX IF NOT EXISTS idx_lab_items_category ON public.lab_items(category);
CREATE INDEX IF NOT EXISTS idx_lab_items_status ON public.lab_items(status);

-- Service Packages Indexes
CREATE INDEX IF NOT EXISTS idx_service_packages_service_id ON public.service_packages(service_id);

-- Comment on migration
COMMENT ON INDEX idx_services_category_id IS 'Optimize filtering services by category';
COMMENT ON INDEX idx_blog_posts_slug IS 'Optimize blog post lookup by slug';
COMMENT ON INDEX idx_orders_user_id IS 'Optimize fetching orders for a user';
