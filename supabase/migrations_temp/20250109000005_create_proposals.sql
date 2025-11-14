-- Create proposals table for Work with Us submissions
CREATE TABLE IF NOT EXISTS public.proposals (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  package TEXT NOT NULL CHECK (package IN ('mvp', 'consulting', 'design', 'other')),
  budget TEXT,
  message TEXT NOT NULL,
  preferred_contact TEXT CHECK (preferred_contact IN ('email', 'phone', 'calendar')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'accepted', 'rejected')),
  phone TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_proposals_status ON public.proposals(status);
CREATE INDEX idx_proposals_email ON public.proposals(email);
CREATE INDEX idx_proposals_package ON public.proposals(package);
CREATE INDEX idx_proposals_created_at ON public.proposals(created_at DESC);
CREATE INDEX idx_proposals_user_id ON public.proposals(user_id);

-- Enable RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Authenticated users: Can submit proposals
CREATE POLICY "Authenticated users can insert proposals"
  ON public.proposals
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR auth.uid() IS NULL); -- Allow both authenticated and anonymous

-- Users: Can view their own proposals
CREATE POLICY "Users can view their own proposals"
  ON public.proposals
  FOR SELECT
  USING (user_id = auth.uid());

-- Admin: View all proposals
CREATE POLICY "Admins can view all proposals"
  ON public.proposals
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

-- Admin: Update proposal status
CREATE POLICY "Admins can update proposals"
  ON public.proposals
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

-- Admin: Delete proposals
CREATE POLICY "Admins can delete proposals"
  ON public.proposals
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
CREATE OR REPLACE FUNCTION update_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_proposals_updated_at();

-- Auto-assign user_id if authenticated
CREATE OR REPLACE FUNCTION set_proposal_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_proposal_user_id_trigger
  BEFORE INSERT ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION set_proposal_user_id();

-- Comments
COMMENT ON TABLE public.proposals IS 'Work with Us collaboration proposals (Version 2.0)';
COMMENT ON COLUMN public.proposals.package IS 'Service package: mvp, consulting, design, other';
COMMENT ON COLUMN public.proposals.status IS 'Proposal status: pending, reviewing, accepted, rejected';
