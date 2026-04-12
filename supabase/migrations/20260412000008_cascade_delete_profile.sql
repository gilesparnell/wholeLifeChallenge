-- Phase 1 hardening: ensure deleting a profile row cascades to daily_entries
--
-- Before this migration:
--   daily_entries.user_id → auth.users(id) ON DELETE CASCADE
--   (no direct relationship to profiles)
--
-- So deleting via `deleteProfile()` in the client (which only touches
-- public.profiles) left orphaned daily_entries behind. If the same user
-- later re-signed in, the old daily_entries would be re-associated with
-- their fresh profile.
--
-- After this migration:
--   daily_entries.user_id → auth.users(id) ON DELETE CASCADE
--   + a trigger that deletes daily_entries when a profile row is deleted
--
-- We use a trigger rather than changing the FK because:
-- - daily_entries already has a valid FK to auth.users, which is the
--   source of truth for user identity
-- - adding a second FK to profiles would create unnecessary coupling
-- - a BEFORE DELETE trigger on profiles is explicit about the intent
--
-- Apply via `supabase db push`. Safe to re-run.

-- ============================================================
-- Trigger: on profile delete, purge the user's daily_entries
-- ============================================================

CREATE OR REPLACE FUNCTION public.cascade_delete_daily_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  DELETE FROM public.daily_entries WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS profiles_cascade_daily_entries ON public.profiles;
CREATE TRIGGER profiles_cascade_daily_entries
BEFORE DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.cascade_delete_daily_entries();

COMMENT ON FUNCTION public.cascade_delete_daily_entries() IS
  'Trigger function: when a profile is deleted, removes all of that user''s daily_entries so no orphan data remains.';
