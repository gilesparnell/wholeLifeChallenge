-- Add selfReport + bonusApplied JSONB columns to daily_entries
--
-- Both fields existed in the app's dayData shape but were never listed in
-- the Supabase round-trip (src/lib/supabaseStore.js HABIT_KEYS). Cloud
-- users lost them on every refetch — "switch to another day and back,
-- How Do You Feel values are gone". Fixed in 0.14.4.
--
-- "selfReport" holds the five 1-5 scales from the "How Do You Feel?"
-- section on CheckIn (mood, energyLevel, soreness, stressLevel,
-- sleepQuality) plus the sleepHours snapshot used by the recovery score.
-- "bonusApplied" tracks which bonuses (Indulgence, Rest Day, Night Owl,
-- Free Day) have been applied to a given day so scoring stays stable.
--
-- Idempotent: safe to re-run. Nullable + default makes this zero
-- downtime and no backfill is needed — pre-existing rows read NULL and
-- rowToEntry() falls back to the DEFAULTS map.
--
-- IMPORTANT: apply this migration BEFORE deploying 0.14.4 code. Once the
-- code is live, every save includes these columns — if they don't exist
-- yet, PostgREST returns 400 and saves fail.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_entries'
      AND column_name = 'selfReport'
  ) THEN
    ALTER TABLE public.daily_entries
      ADD COLUMN "selfReport" jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_entries'
      AND column_name = 'bonusApplied'
  ) THEN
    ALTER TABLE public.daily_entries
      ADD COLUMN "bonusApplied" jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

COMMENT ON COLUMN public.daily_entries."selfReport" IS
  '"How Do You Feel?" 1-5 self-report scales (mood, energyLevel, soreness, stressLevel, sleepQuality) + sleepHours snapshot. Feeds calculateRecoveryScore in src/lib/recovery.js.';

COMMENT ON COLUMN public.daily_entries."bonusApplied" IS
  'Which bonuses have been applied to this day: { indulgence, restDay, nightOwl, freeDay }. Set either automatically by applyAutoBonuses (on save) or manually by the user via the Activate Free Day button.';

-- Verification query (paste separately after apply):
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND table_name = 'daily_entries'
--     AND column_name IN ('selfReport', 'bonusApplied');
