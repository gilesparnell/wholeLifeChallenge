-- WLC hotfix: gate the handle_new_user trigger on the allowed_emails whitelist
--
-- The trigger `on_auth_user_created` on `auth.users` was originally created
-- out-of-band via the Supabase dashboard. Migration
-- 20260412000007_rls_security_audit_fixes.sql captured the function body in
-- source and pinned its search_path, but left the trigger unconditionally
-- inserting a profile row for every new auth user — including non-whitelisted
-- Google accounts that the client immediately signs out. That orphan row
-- footprint was flagged by the RLS audit note alongside 000007 and deferred
-- to a follow-up.
--
-- This migration is that follow-up. It redefines `handle_new_user` to only
-- insert a profile row if the user's email is on `public.allowed_emails`,
-- mirroring the client-side check in `src/lib/profiles.js :: isEmailAllowed`
-- and the `allowed_emails_self_check` RLS policy
-- (20260412000002_case_insensitive_allowed_emails.sql). All three use
-- `lower(email)` for case-insensitive match, so behaviour is consistent.
--
-- Orphan rows that already exist are NOT cleaned up here — a separate audit
-- pass will review them first. This migration only prevents new ones.
--
-- Safe to re-run: CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS.

-- Bounded lock wait so a stuck concurrent signup can't wedge the deploy.
SET LOCAL lock_timeout = '2s';

-- ------------------------------------------------------------
-- Function: handle_new_user
-- SECURITY DEFINER so the insert bypasses profiles RLS (the profile row
-- belongs to NEW.id and there is no authenticated context inside an
-- AFTER INSERT trigger on auth.users).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  -- Only create a profile row if the user's email is on the whitelist.
  -- Mirrors src/lib/profiles.js :: isEmailAllowed and the
  -- allowed_emails_self_check RLS policy — case-insensitive match.
  IF EXISTS (
    SELECT 1 FROM public.allowed_emails
    WHERE lower(email) = lower(NEW.email)
  ) THEN
    INSERT INTO public.profiles (id, display_name, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    -- Observability: record every non-whitelisted signup attempt so ops
    -- can audit them in Supabase logs. This is not an error — the client
    -- will sign the user out a moment later.
    RAISE LOG 'handle_new_user: skipping profile row for non-whitelisted email %', NEW.email;
  END IF;
  RETURN NEW;
END;
$function$;

-- ------------------------------------------------------------
-- Trigger: on_auth_user_created
-- Recreate to guarantee it points at the updated function.
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
