-- Create bounties table for Lab page
CREATE TABLE IF NOT EXISTS public.bounties (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in-progress', 'done', 'pending')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('초급', '중급', '고급')),
  reward INT NOT NULL CHECK (reward >= 0),
  estimated_hours INT CHECK (estimated_hours > 0),
  skills_required TEXT[] DEFAULT '{}',
  deliverables TEXT[] DEFAULT '{}',
  deadline DATE,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  applicants UUID[] DEFAULT '{}',
  project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_bounties_status ON public.bounties(status);
CREATE INDEX idx_bounties_difficulty ON public.bounties(difficulty);
CREATE INDEX idx_bounties_deadline ON public.bounties(deadline);
CREATE INDEX idx_bounties_assignee_id ON public.bounties(assignee_id);
CREATE INDEX idx_bounties_project_id ON public.bounties(project_id);
CREATE INDEX idx_bounties_skills ON public.bounties USING GIN(skills_required);

-- Enable RLS
ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public: Read all bounties
CREATE POLICY "Bounties are viewable by everyone"
  ON public.bounties
  FOR SELECT
  USING (true);

-- Authenticated: Apply to bounties (update applicants array)
CREATE POLICY "Authenticated users can apply to bounties"
  ON public.bounties
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admin: Full CRUD
CREATE POLICY "Admins can insert bounties"
  ON public.bounties
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

CREATE POLICY "Admins can update bounties"
  ON public.bounties
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

CREATE POLICY "Admins can delete bounties"
  ON public.bounties
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
CREATE OR REPLACE FUNCTION update_bounties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bounties_updated_at
  BEFORE UPDATE ON public.bounties
  FOR EACH ROW
  EXECUTE FUNCTION update_bounties_updated_at();

-- Helper function: Apply to bounty
CREATE OR REPLACE FUNCTION apply_to_bounty(bounty_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  UPDATE public.bounties
  SET applicants = array_append(applicants, current_user_id)
  WHERE id = bounty_id
  AND NOT (current_user_id = ANY(applicants));

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE public.bounties IS 'Bounty programs for Lab page (Version 2.0)';
COMMENT ON COLUMN public.bounties.difficulty IS 'Difficulty level: 초급, 중급, 고급';
COMMENT ON COLUMN public.bounties.reward IS 'Reward amount in KRW';
COMMENT ON COLUMN public.bounties.applicants IS 'Array of user IDs who applied';
