-- CMS-006: Create team_members table and RLS policies
-- Purpose: Manage team member information for About page

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  avatar TEXT,
  email TEXT,
  skills TEXT[] DEFAULT '{}',
  social_links JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_team_priority ON public.team_members(priority DESC);
CREATE INDEX idx_team_active ON public.team_members(active);
CREATE INDEX idx_team_name ON public.team_members(name);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: 활성 팀원은 모든 사용자 조회 가능, 비활성은 관리자만
CREATE POLICY "Public can view active team members"
  ON public.team_members
  FOR SELECT
  USING (active = true OR auth.uid() IN (SELECT user_id FROM public.admins));

-- INSERT: 관리자만 가능
CREATE POLICY "Admins can create team members"
  ON public.team_members
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- UPDATE: 관리자만 가능
CREATE POLICY "Admins can update team members"
  ON public.team_members
  FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- DELETE: Admin 이상만 가능 (Editor 제외)
CREATE POLICY "Admins can delete team members"
  ON public.team_members
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.admins WHERE role IN ('super_admin', 'admin')
    )
  );

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_team_members_updated_at();

-- Comments
COMMENT ON TABLE public.team_members IS 'Team member information for About page';
COMMENT ON COLUMN public.team_members.social_links IS 'JSON: {github, linkedin, twitter, website}';
COMMENT ON COLUMN public.team_members.priority IS 'Display order (higher = earlier)';
COMMENT ON COLUMN public.team_members.active IS 'Hide from public page if false';

-- Grant permissions
GRANT SELECT ON public.team_members TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
