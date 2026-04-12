-- Phase 4 polish: add onboarding_completed flag to profiles
-- Used by the OnboardingModal to show only on first sign-in.
-- Apply via `supabase db push`. Safe to re-run.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
