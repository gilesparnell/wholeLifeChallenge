-- Phase 1 hardening: address Supabase Security Advisor findings
--
-- 1. ERROR — `security_definer_view` on public.leaderboard
--    Replace the view with a SECURITY DEFINER RPC function that returns
--    only the columns we want exposed. Functions are audit-clean; views
--    are flagged.
--
-- 2. WARN — `function_search_path_mutable` on three functions
--    Recreate each with an immutable `SET search_path = public, pg_catalog`
--    so search_path injection attacks can't change their behaviour.
--
-- 3. auth_leaked_password_protection — NOT APPLICABLE. We use Google
--    OAuth only; Supabase's leaked-password check requires email/password
--    auth. Documented here for the audit trail.
--
-- Apply via `supabase db push`. Safe to re-run.

-- ============================================================
-- 1. leaderboard view → get_leaderboard RPC function
-- ============================================================

DROP VIEW IF EXISTS public.leaderboard;

CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  total_score integer,
  current_streak integer,
  days_active integer,
  cumulative_by_day jsonb
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
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
    AND status = 'active'
  ORDER BY total_score DESC;
$$;

-- Only authenticated users can call it. Explicitly revoke from both
-- anon and PUBLIC roles — Supabase's anon role is granted at project
-- setup so REVOKE FROM PUBLIC alone is not enough.
REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_leaderboard() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;

COMMENT ON FUNCTION public.get_leaderboard() IS
  'Returns leaderboard rows for opted-in active users. SECURITY DEFINER so it can read profiles without exposing email/last_login_at columns.';

-- ============================================================
-- 2. Pin search_path on helper functions
-- ============================================================

-- touch_updated_at: trigger that sets NEW.updated_at = now()
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- is_admin: helper used in RLS policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  );
$$;

-- handle_new_user: legacy auto-profile-creation trigger from an older
-- Supabase template. Kept for now (the client's upsertProfile also runs,
-- so this is idempotent-ish). Marked for review — see the hardening plan.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
