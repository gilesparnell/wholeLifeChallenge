-- Add per-user preferences JSONB column to profiles
--
-- Drives the "My Preferences" screen. Stores a subset of admin config
-- keys that standard users can override for themselves (water target,
-- water tap increment, sleep target). Non-personalisable keys never
-- land here — see PERSONALISABLE_KEYS + sanitisePreferences in
-- src/lib/adminConfig.js for the gating logic.
--
-- Idempotent: safe to re-run. Default '{}'::jsonb means zero downtime
-- and no backfill is needed.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'preferences'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN preferences jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.preferences IS
  'Per-user preference overrides (hydration target, hydration increment, sleep target). Merged over admin config at read time by getEffectiveConfig().';

-- Verification query (paste separately after apply):
--   SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'preferences';
