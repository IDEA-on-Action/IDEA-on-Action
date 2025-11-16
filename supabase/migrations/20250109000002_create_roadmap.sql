-- Create roadmap table
CREATE TABLE IF NOT EXISTS public.roadmap (
  id BIGSERIAL PRIMARY KEY,
  quarter TEXT NOT NULL UNIQUE,
  theme TEXT NOT NULL,
  description TEXT,
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  milestones JSONB DEFAULT '[]',
  kpis JSONB DEFAULT '{}',
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  owner TEXT,
  related_projects TEXT[] DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_roadmap_quarter ON public.roadmap(quarter);
CREATE INDEX idx_roadmap_progress ON public.roadmap(progress);
CREATE INDEX idx_roadmap_risk_level ON public.roadmap(risk_level);

-- Enable RLS
ALTER TABLE public.roadmap ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public: Read all roadmap items
CREATE POLICY "Roadmap is viewable by everyone"
  ON public.roadmap
  FOR SELECT
  USING (true);

-- Admin: Full CRUD
-- Note: Using is_admin_user() function to avoid dependency on user_roles table
CREATE POLICY "Admins can insert roadmap"
  ON public.roadmap
  FOR INSERT
  WITH CHECK (
    public.is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can update roadmap"
  ON public.roadmap
  FOR UPDATE
  USING (
    public.is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can delete roadmap"
  ON public.roadmap
  FOR DELETE
  USING (
    public.is_admin_user(auth.uid())
  );

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_roadmap_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roadmap_updated_at
  BEFORE UPDATE ON public.roadmap
  FOR EACH ROW
  EXECUTE FUNCTION update_roadmap_updated_at();

-- Comments
COMMENT ON TABLE public.roadmap IS 'Quarterly roadmap for Version 2.0';
COMMENT ON COLUMN public.roadmap.quarter IS 'Format: "2025 Q4"';
COMMENT ON COLUMN public.roadmap.milestones IS 'JSON array: [{title, status, dueDate}]';
COMMENT ON COLUMN public.roadmap.kpis IS 'JSON: {metric1, metric2, ...}';
