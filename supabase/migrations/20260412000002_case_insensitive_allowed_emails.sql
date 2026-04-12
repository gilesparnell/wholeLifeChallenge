-- Phase 4 follow-up: make allowed_emails whitelist check case-insensitive.
-- Apply in the Supabase SQL editor after 20260412_001_profiles_and_allowed_emails.sql.
-- Safe to re-run.

-- Drop the old policy and recreate with case-insensitive comparison.
DROP POLICY IF EXISTS "allowed_emails_self_check" ON public.allowed_emails;
CREATE POLICY "allowed_emails_self_check" ON public.allowed_emails
FOR SELECT TO authenticated
USING (lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())));

-- Also normalise the seed row to lowercase, just in case.
UPDATE public.allowed_emails
SET email = lower(email)
WHERE email != lower(email);

-- Diagnostic: verify what's in auth.users and allowed_emails
-- (output of these queries tells us if there's a casing mismatch)
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;
-- SELECT id, email FROM public.allowed_emails ORDER BY created_at;
