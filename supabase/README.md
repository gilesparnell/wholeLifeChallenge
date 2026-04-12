# Supabase migrations

SQL migrations for the WLC tracker. Use the Supabase CLI to apply.

## Setup (one-time)

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref lnnvwbqmpgusjoplvjjt
```

## Applying migrations

From the project root:

```bash
supabase db push
```

This applies all migration files in `supabase/migrations/` that haven't been applied to the remote database yet.

To check status:

```bash
supabase migration list
```

Each migration is idempotent (uses `IF NOT EXISTS` / `DROP POLICY IF EXISTS`) so re-running is safe.

## File naming

Migration files must use the format:

```
YYYYMMDDHHMMSS_short_name.sql
```

The CLI parses the leading 14 digits as a version number. Use leading zeros if you don't have a real timestamp (e.g. `20260412000005_…`).

## Migrations applied

| File | What it does |
|------|--------------|
| `20260412000001_profiles_and_allowed_emails.sql` | Creates `profiles`, `allowed_emails`, RLS policies, `is_admin()` helper, seeds `giles@parnellsystems.com` |
| `20260412000002_case_insensitive_allowed_emails.sql` | Lowercase the seed row + case-insensitive RLS check |
| `20260412000003_fix_allowed_emails_rls.sql` | RLS policy uses `auth.jwt() ->> 'email'` instead of querying `auth.users` (which `authenticated` can't read) |
| `20260412000004_leaderboard.sql` | Adds `leaderboard_visible`, `total_score`, `current_streak`, `days_active` columns + public `leaderboard` view |

## Bootstrap admin

After `giles@parnellsystems.com` signs in for the first time, promote them to admin:

```sql
UPDATE public.profiles SET role = 'admin'
WHERE email = 'giles@parnellsystems.com';
```

This needs to happen once. After that, the admin UI can promote other users.
