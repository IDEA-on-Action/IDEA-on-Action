-- Create work_with_us_inquiries table for Work with Us page
-- Sprint 2: Supabase Integration & Community

CREATE TABLE IF NOT EXISTS public.work_with_us_inquiries (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  package TEXT NOT NULL CHECK (package IN ('MVP', 'Growth', 'Custom')),
  budget TEXT CHECK (budget IN ('under-10m', '10m-30m', '30m-50m', 'over-50m', 'flexible')),
  brief TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'in-progress', 'rejected', 'completed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_work_inquiries_status ON public.work_with_us_inquiries(status);
CREATE INDEX idx_work_inquiries_package ON public.work_with_us_inquiries(package);
CREATE INDEX idx_work_inquiries_created_at ON public.work_with_us_inquiries(created_at DESC);
CREATE INDEX idx_work_inquiries_email ON public.work_with_us_inquiries(email);

-- Enable RLS
ALTER TABLE public.work_with_us_inquiries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public: Anyone can insert inquiries
CREATE POLICY "Anyone can submit work inquiries"
  ON public.work_with_us_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admin: Read all inquiries
CREATE POLICY "Admins can view work inquiries"
  ON public.work_with_us_inquiries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role_id IN (
        SELECT id FROM public.roles WHERE name = 'admin'
      )
    )
  );

-- Admin: Update inquiries (status, admin_notes)
CREATE POLICY "Admins can update work inquiries"
  ON public.work_with_us_inquiries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role_id IN (
        SELECT id FROM public.roles WHERE name = 'admin'
      )
    )
  );

-- Admin: Delete inquiries
CREATE POLICY "Admins can delete work inquiries"
  ON public.work_with_us_inquiries
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role_id IN (
        SELECT id FROM public.roles WHERE name = 'admin'
      )
    )
  );

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_work_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_inquiries_updated_at
  BEFORE UPDATE ON public.work_with_us_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_work_inquiries_updated_at();

-- Comments
COMMENT ON TABLE public.work_with_us_inquiries IS 'Work with Us inquiries for Version 2.0';
COMMENT ON COLUMN public.work_with_us_inquiries.package IS 'Package type: MVP, Growth, Custom';
COMMENT ON COLUMN public.work_with_us_inquiries.budget IS 'Budget range: under-10m, 10m-30m, 30m-50m, over-50m, flexible';
COMMENT ON COLUMN public.work_with_us_inquiries.status IS 'Inquiry status: pending, contacted, in-progress, rejected, completed';
COMMENT ON COLUMN public.work_with_us_inquiries.admin_notes IS 'Internal notes from admin team';
