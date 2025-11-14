-- Create projects table for portfolio
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('backlog', 'in-progress', 'validate', 'launched')),
  category TEXT NOT NULL,
  image TEXT,
  tags TEXT[] DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  tech JSONB DEFAULT '{}',
  links JSONB DEFAULT '{}',
  timeline JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_category ON public.projects(category);
CREATE INDEX idx_projects_slug ON public.projects(slug);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public: Read all projects
CREATE POLICY "Projects are viewable by everyone"
  ON public.projects
  FOR SELECT
  USING (true);

-- Admin: Full CRUD
CREATE POLICY "Admins can insert projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role_id IN (
        SELECT id FROM public.roles WHERE name = 'admin'
      )
    )
  );

CREATE POLICY "Admins can update projects"
  ON public.projects
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

CREATE POLICY "Admins can delete projects"
  ON public.projects
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
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

-- Comments
COMMENT ON TABLE public.projects IS 'Portfolio projects for Version 2.0';
COMMENT ON COLUMN public.projects.status IS 'Project status: backlog, in-progress, validate, launched';
COMMENT ON COLUMN public.projects.metrics IS 'JSON: {progress, contributors, commits, tests}';
COMMENT ON COLUMN public.projects.tech IS 'JSON: {frontend[], backend[], testing[]}';
COMMENT ON COLUMN public.projects.links IS 'JSON: {github, demo, documentation}';
