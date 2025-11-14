-- Create logs table for activity feed (Now page)
CREATE TABLE IF NOT EXISTS public.logs (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('release', 'learning', 'decision')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_logs_type ON public.logs(type);
CREATE INDEX idx_logs_created_at ON public.logs(created_at DESC);
CREATE INDEX idx_logs_project_id ON public.logs(project_id);
CREATE INDEX idx_logs_author_id ON public.logs(author_id);
CREATE INDEX idx_logs_tags ON public.logs USING GIN(tags);

-- Enable RLS
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public: Read all logs
CREATE POLICY "Logs are viewable by everyone"
  ON public.logs
  FOR SELECT
  USING (true);

-- Admin: Full CRUD
CREATE POLICY "Admins can insert logs"
  ON public.logs
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

CREATE POLICY "Admins can update logs"
  ON public.logs
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

CREATE POLICY "Admins can delete logs"
  ON public.logs
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
CREATE OR REPLACE FUNCTION update_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER logs_updated_at
  BEFORE UPDATE ON public.logs
  FOR EACH ROW
  EXECUTE FUNCTION update_logs_updated_at();

-- Comments
COMMENT ON TABLE public.logs IS 'Activity logs for Now page (Version 2.0)';
COMMENT ON COLUMN public.logs.type IS 'Log type: release, learning, decision';
COMMENT ON COLUMN public.logs.metadata IS 'JSON: {version, url, etc.}';
