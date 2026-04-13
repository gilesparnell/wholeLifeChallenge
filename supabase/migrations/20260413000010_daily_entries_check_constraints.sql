-- Phase 3 hardening (#17): CHECK constraints on daily_entries
--
-- Defence in depth at the DB layer. The client also validates these via
-- src/lib/dayDataValidator.js — but we want PostgREST to reject nonsense
-- values even if a buggy client (or curl) tries to bypass the JS layer.
--
-- Apply via Supabase Dashboard → SQL → New query. Safe to re-run: each
-- constraint is dropped if it exists, then re-added.
--
-- Constraints added:
--   1. daily_entries_nutrition_range
--      nutrition (int) must be NULL or 0..5
--   2. daily_entries_sleep_hours_range
--      sleep->>'hours' must be NULL or 0..24 when present
--   3. daily_entries_hydrate_current_ml_nonneg
--      hydrate->>'current_ml' must be NULL or >= 0 when present
--   4. daily_entries_hydrate_target_ml_nonneg
--      hydrate->>'target_ml' must be NULL or >= 0 when present
--
-- Verification: after applying, this insert should fail with
-- "new row for relation 'daily_entries' violates check constraint":
--   INSERT INTO public.daily_entries (user_id, date, nutrition)
--   VALUES (auth.uid(), CURRENT_DATE, 99);

-- ============================================================
-- 1. nutrition_range
-- ============================================================
DO $$ BEGIN
  ALTER TABLE public.daily_entries
    DROP CONSTRAINT IF EXISTS daily_entries_nutrition_range;
  ALTER TABLE public.daily_entries
    ADD CONSTRAINT daily_entries_nutrition_range
    CHECK (nutrition IS NULL OR (nutrition >= 0 AND nutrition <= 5));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add nutrition_range constraint: %', SQLERRM;
END $$;

-- ============================================================
-- 2. sleep_hours_range  (jsonb path)
-- ============================================================
DO $$ BEGIN
  ALTER TABLE public.daily_entries
    DROP CONSTRAINT IF EXISTS daily_entries_sleep_hours_range;
  ALTER TABLE public.daily_entries
    ADD CONSTRAINT daily_entries_sleep_hours_range
    CHECK (
      sleep IS NULL
      OR sleep->>'hours' IS NULL
      OR (
        (sleep->>'hours')::numeric >= 0
        AND (sleep->>'hours')::numeric <= 24
      )
    );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add sleep_hours_range constraint: %', SQLERRM;
END $$;

-- ============================================================
-- 3 + 4. hydrate ml non-negative  (jsonb path)
-- ============================================================
DO $$ BEGIN
  ALTER TABLE public.daily_entries
    DROP CONSTRAINT IF EXISTS daily_entries_hydrate_current_ml_nonneg;
  ALTER TABLE public.daily_entries
    ADD CONSTRAINT daily_entries_hydrate_current_ml_nonneg
    CHECK (
      hydrate IS NULL
      OR hydrate->>'current_ml' IS NULL
      OR (hydrate->>'current_ml')::numeric >= 0
    );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add hydrate_current_ml_nonneg constraint: %', SQLERRM;
END $$;

DO $$ BEGIN
  ALTER TABLE public.daily_entries
    DROP CONSTRAINT IF EXISTS daily_entries_hydrate_target_ml_nonneg;
  ALTER TABLE public.daily_entries
    ADD CONSTRAINT daily_entries_hydrate_target_ml_nonneg
    CHECK (
      hydrate IS NULL
      OR hydrate->>'target_ml' IS NULL
      OR (hydrate->>'target_ml')::numeric >= 0
    );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add hydrate_target_ml_nonneg constraint: %', SQLERRM;
END $$;

-- ============================================================
-- Inspection: list all constraints currently on daily_entries
-- ============================================================
-- SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.daily_entries'::regclass
--   AND contype = 'c';
