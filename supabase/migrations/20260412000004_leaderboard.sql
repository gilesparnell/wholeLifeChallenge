-- Phase 4 Tier 2: leaderboard
-- Adds opt-in flag + denormalised stats columns to profiles, and a view
-- that exposes only opted-in users to authenticated readers.
-- Apply after 20260412_001..003. Safe to re-run.

-- ------------------------------------------------------------
-- New columns on profiles
-- ------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS leaderboard_visible boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_score integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS days_active integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS profiles_leaderboard_idx
  ON public.profiles (leaderboard_visible, total_score DESC)
  WHERE leaderboard_visible = true AND status = 'active';

-- ------------------------------------------------------------
-- Public leaderboard view
-- Exposes only the columns we want public, only for opted-in active users.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  id,
  display_name,
  avatar_url,
  total_score,
  current_streak,
  days_active
FROM public.profiles
WHERE leaderboard_visible = true
  AND status = 'active';

-- Allow any authenticated user to read the view
GRANT SELECT ON public.leaderboard TO authenticated;

-- ------------------------------------------------------------
-- Allow users to update their own leaderboard_visible flag
-- (the existing profiles_self_update policy already permits self-updates,
-- so no extra policy is needed — just ensuring the WITH CHECK passes.)
-- ------------------------------------------------------------
