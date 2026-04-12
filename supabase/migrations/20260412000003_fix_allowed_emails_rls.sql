-- Phase 4 fix: allowed_emails RLS policy was querying auth.users directly,
-- which the `authenticated` role doesn't have permission to read.
-- Switch to reading the email from the JWT via auth.jwt() ->> 'email'.
-- Apply after 20260412_001 and 20260412_002. Safe to re-run.

DROP POLICY IF EXISTS "allowed_emails_self_check" ON public.allowed_emails;

CREATE POLICY "allowed_emails_self_check" ON public.allowed_emails
FOR SELECT TO authenticated
USING (lower(email) = lower(auth.jwt() ->> 'email'));
