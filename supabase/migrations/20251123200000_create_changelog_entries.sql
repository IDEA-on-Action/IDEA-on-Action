-- =============================================================================
-- TASK-018: changelog_entries ?뚯씠釉??앹꽦
-- ?꾨줈?앺듃 蹂寃?濡쒓렇 諛?由대━???명듃 愿由?-- =============================================================================

-- changelog_entries ?뚯씠釉??앹꽦
-- ?꾨줈?앺듃蹂?踰꾩쟾 由대━???덉뒪?좊━瑜?愿由ы빀?덈떎.
CREATE TABLE IF NOT EXISTS public.changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 踰꾩쟾 ?뺣낫
  version TEXT NOT NULL,                    -- 踰꾩쟾 踰덊샇 (?? 1.0.0, 2.1.0-beta)
  title TEXT NOT NULL,                      -- 由대━???쒕ぉ
  description TEXT,                         -- 由대━???ㅻ챸

  -- 蹂寃??ы빆 (JSON 諛곗뿴)
  -- ?뺤떇: [{type: 'feature'|'fix'|'breaking'|'improvement'|'deprecated', description: '...'}]
  changes JSONB DEFAULT '[]'::jsonb,

  -- ?곌? ?뺣낫
  project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  github_release_url TEXT,                  -- GitHub 由대━??留곹겕

  -- ??꾩뒪?ы봽
  released_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- ?묒꽦??  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ?뚯씠釉?肄붾찘??COMMENT ON TABLE public.changelog_entries IS '?꾨줈?앺듃 蹂寃?濡쒓렇 諛?由대━???명듃';
COMMENT ON COLUMN public.changelog_entries.version IS '踰꾩쟾 踰덊샇 (?? 1.0.0, 2.1.0-beta)';
COMMENT ON COLUMN public.changelog_entries.title IS '由대━???쒕ぉ';
COMMENT ON COLUMN public.changelog_entries.description IS '由대━???ㅻ챸 (?곸꽭 ?댁슜)';
COMMENT ON COLUMN public.changelog_entries.changes IS '蹂寃??ы빆 JSON 諛곗뿴 [{type, description}]';
COMMENT ON COLUMN public.changelog_entries.project_id IS '?곌? ?꾨줈?앺듃 ID (?좏깮)';
COMMENT ON COLUMN public.changelog_entries.github_release_url IS 'GitHub 由대━???섏씠吏 URL';
COMMENT ON COLUMN public.changelog_entries.released_at IS '由대━???쇱떆';
COMMENT ON COLUMN public.changelog_entries.created_by IS '?묒꽦??(愿由ъ옄)';

-- =============================================================================
-- ?몃뜳???앹꽦
-- =============================================================================

-- 由대━???좎쭨 湲곗? ?대┝李⑥닚 ?뺣젹???몃뜳??CREATE INDEX IF NOT EXISTS idx_changelog_released_at
  ON public.changelog_entries(released_at DESC);

-- ?꾨줈?앺듃蹂?蹂寃?濡쒓렇 議고쉶???몃뜳??CREATE INDEX IF NOT EXISTS idx_changelog_project_id
  ON public.changelog_entries(project_id);

-- 踰꾩쟾 寃?됱슜 ?몃뜳??CREATE INDEX IF NOT EXISTS idx_changelog_version
  ON public.changelog_entries(version);

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;

-- 怨듦컻 ?쎄린 ?뺤콉: 紐⑤뱺 ?ъ슜?먭? 蹂寃?濡쒓렇瑜?議고쉶?????덉쓬
CREATE POLICY "changelog_select_public"
  ON public.changelog_entries
  FOR SELECT
  USING (true);

-- 愿由ъ옄 INSERT ?뺤콉
CREATE POLICY "changelog_insert_admin"
  ON public.changelog_entries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
    )
  );

-- 愿由ъ옄 UPDATE ?뺤콉
CREATE POLICY "changelog_update_admin"
  ON public.changelog_entries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
    )
  );

-- 愿由ъ옄 DELETE ?뺤콉
CREATE POLICY "changelog_delete_admin"
  ON public.changelog_entries
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- ?몃━嫄? updated_at ?먮룞 ?낅뜲?댄듃
-- =============================================================================

CREATE TRIGGER update_changelog_entries_updated_at
  BEFORE UPDATE ON public.changelog_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 留덉씠洹몃젅?댁뀡 ?꾨즺 濡쒓렇
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'TASK-018: changelog_entries ?뚯씠釉??앹꽦 ?꾨즺';
  RAISE NOTICE '- ?뚯씠釉? public.changelog_entries';
  RAISE NOTICE '- ?몃뜳?? idx_changelog_released_at, idx_changelog_project_id, idx_changelog_version';
  RAISE NOTICE '- RLS: 怨듦컻 ?쎄린, 愿由ъ옄 ?곌린';
  RAISE NOTICE '- ?몃━嫄? update_changelog_entries_updated_at';
END $$;

