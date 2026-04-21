-- WLC 0.16.0 — Opt-in sharing of wellness insights + reflection journal
--
-- Introduces:
--   1. entry_shares — join table (owner_id, viewer_id, scope) granting a
--      specific viewer access to a specific scope of the owner's
--      daily_entries. Paired with two "all active users" booleans stored
--      on profiles.preferences (share_wellness_all, share_journal_all) —
--      those are persisted via the same sanitisePreferences path as all
--      other profile prefs, no schema change needed for them.
--
--   2. shared_journal_entries / shared_wellness_entries — curated views
--      that project only the columns relevant to each scope, gated by
--      (owner = me) OR (row in entry_shares) OR (share_*_all = true).
--      Matches the existing leaderboard curated-view pattern.
--
--   3. list_shareable_profiles() — SECURITY DEFINER function that returns
--      (id, display_name) of every active profile except the caller. Used
--      by the Preferences "Sharing with specific people" checkbox list.
--      Safe because it only exposes names, which are already visible via
--      the leaderboard.
--
-- Apply via Supabase Dashboard → SQL Editor → New Query → paste all →
-- Run. Idempotent — safe to re-run. Verification queries at the bottom.

-- ============================================================
-- 1. entry_shares table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.entry_shares (
  owner_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, viewer_id, scope)
);

DO $$ BEGIN
  ALTER TABLE public.entry_shares
    DROP CONSTRAINT IF EXISTS entry_shares_scope_check;
  ALTER TABLE public.entry_shares
    ADD CONSTRAINT entry_shares_scope_check
    CHECK (scope IN ('wellness', 'journal'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add scope check: %', SQLERRM;
END $$;

-- A self-share makes no sense and would muddy the "my sharers" dropdown.
DO $$ BEGIN
  ALTER TABLE public.entry_shares
    DROP CONSTRAINT IF EXISTS entry_shares_no_self_share;
  ALTER TABLE public.entry_shares
    ADD CONSTRAINT entry_shares_no_self_share
    CHECK (owner_id <> viewer_id);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add no-self-share check: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS entry_shares_viewer_scope_idx
  ON public.entry_shares (viewer_id, scope);

-- ============================================================
-- 2. RLS on entry_shares
-- ============================================================
ALTER TABLE public.entry_shares ENABLE ROW LEVEL SECURITY;

-- Owners manage their own grants (insert / update / delete / select).
DROP POLICY IF EXISTS "entry_shares_self_manage" ON public.entry_shares;
CREATE POLICY "entry_shares_self_manage" ON public.entry_shares
FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Viewers can read rows that grant them access, so the UI can list
-- "who shares with me" without needing owner rights.
DROP POLICY IF EXISTS "entry_shares_viewer_read" ON public.entry_shares;
CREATE POLICY "entry_shares_viewer_read" ON public.entry_shares
FOR SELECT TO authenticated
USING (viewer_id = auth.uid());

-- ============================================================
-- 3. shared_journal_entries view
-- Exposes only the reflect JSONB column for reflections the caller
-- is entitled to see. Runs with definer privileges (default in PG
-- pre-15 behaviour), so it can JOIN profiles across RLS — gating
-- happens entirely in the WHERE clause.
-- ============================================================
CREATE OR REPLACE VIEW public.shared_journal_entries AS
SELECT
  de.user_id      AS owner_id,
  p.display_name  AS owner_name,
  de.date,
  de.reflect
FROM public.daily_entries de
JOIN public.profiles p ON p.id = de.user_id
WHERE
  -- self is always allowed
  de.user_id = auth.uid()
  -- explicit per-recipient grant
  OR EXISTS (
    SELECT 1 FROM public.entry_shares s
    WHERE s.owner_id = de.user_id
      AND s.viewer_id = auth.uid()
      AND s.scope = 'journal'
  )
  -- blanket opt-in on the owner's preferences
  OR COALESCE((p.preferences ->> 'share_journal_all')::boolean, false) = true;

GRANT SELECT ON public.shared_journal_entries TO authenticated;

-- ============================================================
-- 4. shared_wellness_entries view
-- Exposes sleep, wellbeing, selfReport only — exercise/mobilize/
-- nutrition/hydrate remain private under the wellness scope.
-- ============================================================
CREATE OR REPLACE VIEW public.shared_wellness_entries AS
SELECT
  de.user_id      AS owner_id,
  p.display_name  AS owner_name,
  de.date,
  de.sleep,
  de.wellbeing,
  de."selfReport"
FROM public.daily_entries de
JOIN public.profiles p ON p.id = de.user_id
WHERE
  de.user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.entry_shares s
    WHERE s.owner_id = de.user_id
      AND s.viewer_id = auth.uid()
      AND s.scope = 'wellness'
  )
  OR COALESCE((p.preferences ->> 'share_wellness_all')::boolean, false) = true;

GRANT SELECT ON public.shared_wellness_entries TO authenticated;

-- ============================================================
-- 5. list_shareable_profiles() function
-- Returns (id, display_name) of every active profile except the
-- caller. Used by the Preferences sharing UI to populate the
-- per-recipient checkbox list. SECURITY DEFINER so it works across
-- the RLS boundary — safe because only names/ids are exposed, which
-- are already visible via the leaderboard pattern.
-- ============================================================
CREATE OR REPLACE FUNCTION public.list_shareable_profiles()
RETURNS TABLE (id uuid, display_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT p.id, p.display_name
  FROM public.profiles p
  WHERE p.status = 'active'
    AND p.id <> auth.uid()
  ORDER BY p.display_name ASC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.list_shareable_profiles() FROM public;
GRANT EXECUTE ON FUNCTION public.list_shareable_profiles() TO authenticated;

-- ============================================================
-- Verification (run these AFTER apply to confirm)
-- ============================================================
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'public.entry_shares'::regclass;
--
-- SELECT policyname FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'entry_shares'
--   ORDER BY policyname;
--
-- SELECT viewname FROM pg_views
--   WHERE schemaname = 'public' AND viewname LIKE 'shared_%';
--
-- SELECT proname, prosecdef FROM pg_proc
--   WHERE proname = 'list_shareable_profiles';
--
-- -- End-to-end sanity as the caller:
-- SELECT * FROM public.list_shareable_profiles() LIMIT 5;
-- SELECT owner_id, owner_name, date FROM public.shared_journal_entries LIMIT 5;
-- SELECT owner_id, owner_name, date FROM public.shared_wellness_entries LIMIT 5;
