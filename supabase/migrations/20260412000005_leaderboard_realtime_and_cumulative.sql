-- Phase 4 Tier 3: realtime leaderboard + cumulative comparison
-- Adds cumulative_by_day column, exposes it via the leaderboard view, and
-- enables Realtime broadcasts on the profiles table.
-- Apply via `supabase db push`. Safe to re-run.

-- ------------------------------------------------------------
-- Add cumulative_by_day column to profiles
-- Stores an array of cumulative scores: [day1_total, day2_total, ...]
-- Used by the comparison overlay on the Progress page.
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cumulative_by_day jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ------------------------------------------------------------
-- Recreate leaderboard view to include cumulative_by_day
-- ------------------------------------------------------------
DROP VIEW IF EXISTS public.leaderboard;

CREATE VIEW public.leaderboard AS
SELECT
  id,
  display_name,
  avatar_url,
  total_score,
  current_streak,
  days_active,
  cumulative_by_day
FROM public.profiles
WHERE leaderboard_visible = true
  AND status = 'active';

GRANT SELECT ON public.leaderboard TO authenticated;

-- ------------------------------------------------------------
-- Enable Realtime on the profiles table
-- The supabase_realtime publication broadcasts changes to subscribed clients.
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;
