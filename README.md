# Whole Life Challenge Tracker

A personal challenge-tracking app built for small groups running the [Whole Life Challenge](https://www.wholelifechallenge.com). Track 7 daily habits, earn bonuses for consistency, and see how you stack up against other opted-in challengers.

**Live:** https://wholelifechallenge.parnellsystems.com/

## What it does

- **Daily check-in** for 7 habits: Nutrition, Exercise, Mobilise, Sleep, Hydrate, Well-being, Reflect (max 35 points/day)
- **Exercise & mobilise with activity type + duration** (Running, Yoga, etc. + minutes)
- **Self-reported recovery metrics** (sleep quality, energy, soreness, stress, mood) with auto-calculated recovery and strain scores
- **4 bonus types** (Indulgence, Rest Day, Night Owl, Free Day) with auto-application and a Free Day activation button
- **AI reflexion prompts** drawn from a 60-prompt bank (Marcus Aurelius through James Clear), with context-awareness based on what you did that day
- **Opt-in leaderboard** with realtime updates and cumulative score overlays on the Progress chart
- **Admin console** for whitelisted-email management, user roles, and challenge configuration
- **Light/dark theme** with FOUC prevention, system preference detection
- **Onboarding modal** for new users
- **Google OAuth** with email whitelist + dev login bypass for local testing

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vite 8 + React 19 + React Router 7 |
| Charts | Recharts (lazy-loaded) |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase Postgres with RLS |
| Realtime | Supabase Realtime |
| Error tracking | Sentry |
| Deployment | Vercel (git-integrated) |
| Testing | Vitest + @testing-library/react |

## Local development

### Prerequisites

- Node.js 22+
- npm
- Supabase CLI: `brew install supabase/tap/supabase`

### First-time setup

```bash
git clone https://github.com/gilesparnell/wholeLifeChallenge.git
cd wholeLifeChallenge
npm install
cp .env.example .env
# Edit .env — add your Supabase URL + anon key + optional Sentry DSN
npm run dev
```

The dev server runs on http://localhost:5173. If another process is using that port, Vite will try 5174.

### Dev login (no Google required)

In dev mode (`npm run dev`) the login screen shows an extra **"Dev Login"** button under a "DEV ONLY" divider. Pre-filled email: `giles@parnellsystems.com`. This bypasses Supabase auth entirely and puts a mock user in localStorage — useful for quick UI work without hitting the real database.

Note: dev login users don't persist to Supabase, so you won't see realtime updates or the leaderboard populate with fresh data.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm test` | Run the full test suite (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint across all JS/JSX |

## Database migrations

All schema changes live in `supabase/migrations/`. Apply via the CLI:

```bash
supabase login                          # one-time
supabase link --project-ref lnnvwbqmpgusjoplvjjt   # one-time, paste DB password when prompted
supabase db push                         # applies any migrations not on the remote yet
supabase migration list                  # shows local vs remote state
```

See `supabase/README.md` for the migration history and naming convention.

### Running ad-hoc SQL

```bash
# Read-only queries against the linked remote
supabase db query "SELECT * FROM public.profiles" --linked

# Security audit
supabase db advisors --linked --type security
```

## Deployment

**Production** is pinned to `master` and deploys to https://wholelifechallenge.parnellsystems.com/ via Vercel's GitHub integration. Every push to `master` auto-deploys.

**Preview deployments** happen automatically for every push on any non-master branch. Vercel comments the preview URL on each PR.

To deploy manually (bypassing git):

```bash
vercel --prod          # production deploy
vercel deploy --yes    # preview deploy
```

### Environment variables

Set via Vercel dashboard (Settings → Environment Variables) or the CLI:

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Production + Preview | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Production + Preview | Public anon key (RLS-protected) |
| `VITE_SENTRY_DSN` | Production + Preview | Optional — leave empty to disable error tracking |

## Admin tasks

### Supabase dashboard

https://supabase.com/dashboard/project/lnnvwbqmpgusjoplvjjt

Use for: running SQL queries, checking auth users, viewing RLS policies, tweaking database settings that the CLI doesn't cover (redirect URLs, OAuth providers, email templates).

### Vercel dashboard

https://vercel.com/gilesparnell-9253s-projects/whole-life-challenge

Use for: deployment history, environment variables, domains, preview deployments.

### Sentry dashboard

https://parnell-systems.sentry.io/projects/wlc-tracker/

Use for: error monitoring, release tracking, session replays.

### Adding a new user

1. Sign into the live app as the admin (`giles@parnellsystems.com`)
2. Click the shield icon top-right → `/admin`
3. Scroll to **Email Whitelist** → enter the new email → Add
4. Tell them to visit the live URL and click "Sign in with Google"

Or run SQL via the CLI:

```bash
supabase db query "INSERT INTO public.allowed_emails (email, added_by) VALUES ('name@example.com', '<your-user-id>') ON CONFLICT DO NOTHING;" --linked
```

### Promoting a user to admin

```bash
supabase db query "UPDATE public.profiles SET role = 'admin' WHERE email = 'name@example.com';" --linked
```

## Architecture quick tour

```
src/
├── App.jsx                         # Routes, providers, lazy-loaded pages
├── main.jsx                        # Sentry init, React mount
├── components/
│   ├── AuthGate.jsx                # Gate: login screen vs app
│   ├── ErrorBoundary.jsx           # Catches render errors, reports to Sentry
│   ├── Layout.jsx                  # Nav, header, theme toggle, admin icon
│   ├── OnboardingGate.jsx          # Shows OnboardingModal on first sign-in
│   ├── OnboardingModal.jsx         # 4-slide welcome
│   ├── admin/
│   │   └── AdminUsersManager.jsx   # Admin UI for users + whitelist
│   ├── habits/
│   │   ├── ExerciseCard.jsx        # Activity type + duration
│   │   ├── HydrateCard.jsx         # +ml increment buttons
│   │   └── SleepCard.jsx           # Hours input
│   └── modals/
│       └── ActivityModal.jsx       # Wellbeing + Reflect text entry
├── contexts/
│   ├── AuthContext.jsx             # Session, profile, role, isAdmin
│   ├── DataContext.jsx             # Daily entries load/save
│   └── ThemeContext.jsx            # Light/dark, persists to localStorage
├── lib/
│   ├── supabase.js                 # Supabase client singleton
│   ├── sentry.js                   # Init, reportError, identifyUser
│   ├── profiles.js                 # CRUD for profiles + allowed_emails
│   ├── supabaseStore.js            # daily_entries read/write
│   ├── scoring.js                  # scoreDay, streak calculations
│   ├── bonuses.js                  # Bonus logic + BONUS_INFO metadata
│   ├── stats.js                    # Total/rate/cumulative calculations
│   ├── leaderboard.js              # fetchLeaderboard (RPC), subscribe
│   ├── exerciseStats.js            # Weekly minutes, activity breakdown
│   ├── recovery.js                 # Recovery + strain scores
│   ├── promptBank.js               # 60 reflection prompts with tags
│   ├── habits.js                   # HABITS list + emptyDay()
│   ├── dates.js                    # Challenge dates + day index
│   ├── adminConfig.js              # Challenge rules (localStorage)
│   └── dataStore.js                # localStorage fallback for dev users
└── pages/
    ├── CheckIn.jsx                 # Main habit check-in UI
    ├── Progress.jsx                # Charts (lazy-loaded)
    ├── Journal.jsx                 # Reflections timeline
    ├── Leaderboard.jsx             # Public rankings
    ├── Info.jsx                    # WLC resource links
    └── Admin.jsx                   # /admin — admin only (lazy-loaded)
```

## Testing

```bash
npm test                   # one-shot
npm run test:watch         # watch mode
```

Tests are colocated with the modules they cover (`foo.js` + `foo.test.js`). Uses Vitest + @testing-library/react for components. Current coverage: **346 tests across 26 files**.

## Docs

- **Project docs site:** https://gilesparnell.github.io/wholeLifeChallenge/ (GitHub Pages, serves `docs/`)
- **Plans:** `docs/plans/` — feature plans and production hardening roadmap
- **Supabase:** `supabase/README.md` — migration workflow

## Operations

- **Error tracking:** Sentry captures unhandled errors in production. Check the dashboard.
- **Backups:** Daily at 03:00 UTC via GitHub Action (`.github/workflows/supabase-backup.yml`). Artefacts retained 30 days on the run page.
- **Health check:** No dedicated endpoint yet. For liveness, hit the live URL in a browser.

## Contributing

This is a personal project. Issues and PRs welcome at https://github.com/gilesparnell/wholeLifeChallenge but triage is ad-hoc.

## Licence

MIT — see `LICENSE` if present, otherwise treat as all rights reserved until licenced.
