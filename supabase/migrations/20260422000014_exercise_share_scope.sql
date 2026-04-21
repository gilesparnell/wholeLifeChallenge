-- WLC 0.17.0 — Opt-in sharing of exercise + mobility activity
--
-- Extends the 0.16.0 sharing scheme with a third scope, 'exercise'.
-- Changes (all additive / non-destructive):
--   1. Broaden the entry_shares scope CHECK to include 'exercise'.
--   2. Add a new curated view `shared_exercise_entries` exposing
--      (owner_id, owner_name, date, exercise, mobilize) — same gating
--      shape as shared_journal_entries / shared_wellness_entries.
--
-- Companion boolean `share_exercise_all` lives on profiles.preferences
-- (already typed by sanitisePreferences in the app code — no schema
-- change needed for the preferences blob).
--
-- Idempotent. Safe to re-run. Apply via Supabase Dashboard → SQL
-- Editor → New Query. Verification queries at the bottom.
--
-- IMPORTANT: apply the 0.16.0 migration (20260421000013_*.sql) FIRST.
-- This migration assumes entry_shares, shared_*_entries, and
-- list_shareable_profiles already exist.

-- ============================================================
-- 1. Broaden the scope CHECK to include 'exercise'
-- ============================================================
DO $$ BEGIN
  ALTER TABLE public.entry_shares
    DROP CONSTRAINT IF EXISTS entry_shares_scope_check;
  ALTER TABLE public.entry_shares
    ADD CONSTRAINT entry_shares_scope_check
    CHECK (scope IN ('wellness', 'journal', 'exercise'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update scope check: %', SQLERRM;
END $$;

-- ============================================================
-- 2. shared_exercise_entries curated view
-- Mirrors the shape of shared_journal_entries / shared_wellness_entries.
-- Exposes ONLY exercise + mobilize columns; nutrition / hydration /
-- sleep / reflections stay private under the 'exercise' scope.
-- ============================================================
CREATE OR REPLACE VIEW public.shared_exercise_entries AS
SELECT
  de.user_id      AS owner_id,
  p.display_name  AS owner_name,
  de.date,
  de.exercise,
  de.mobilize
FROM public.daily_entries de
JOIN public.profiles p ON p.id = de.user_id
WHERE
  de.user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.entry_shares s
    WHERE s.owner_id = de.user_id
      AND s.viewer_id = auth.uid()
      AND s.scope = 'exercise'
  )
  OR COALESCE((p.preferences ->> 'share_exercise_all')::boolean, false) = true;

GRANT SELECT ON public.shared_exercise_entries TO authenticated;

-- ============================================================
-- Verification (run AFTER apply to confirm)
-- ============================================================
-- -- Scope CHECK now allows 'exercise':
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'public.entry_shares'::regclass
--     AND conname = 'entry_shares_scope_check';
--
-- -- New view exists and is readable:
-- SELECT viewname FROM pg_views
--   WHERE schemaname = 'public' AND viewname = 'shared_exercise_entries';
--
-- -- End-to-end sanity (returns own rows at minimum):
-- SELECT owner_id, owner_name, date FROM public.shared_exercise_entries LIMIT 5;
