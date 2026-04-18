# Decisions log

Project-local, tactical decisions made during in-flight plan work. Newest at the top. Promote to a cross-project ADR only when impact extends beyond this repo.

Each entry: date (Australia/Sydney), one-line title, 2–4 sentence rationale, links to relevant files/PRs.

---

## 2026-04-19 — Activity push notifications are opt-out, not opt-in

The v0.12.0 "Someone special" notifications plan originally had `notificationsEnabled` default to `false` (opt-in). User asked during `/ce-work-beta` kickoff to flip the default to `true` with the ability to opt out. Rationale: the whitelisted group is 4 people who already know each other and the whole point of the feature is social accountability by default; opt-in would leave most users never discovering it. Browser Notification permission is still gesture-sourced and requested from the `/preferences` toggle — the default flip only affects the app-layer preference, not the browser-level gate. See `docs/plans/2026-04-19-001-feat-activity-push-notifications-beta-plan.md` R5 + Unit 3.

---

## 2026-04-17 — Stop autonomous run instead of speculating on next work unit

No plan file in `docs/plans/` has a next concretely-scoped unit: the rescoped production-hardening plan's remaining items are gated on a user decision to widen the 4-user whitelist, the v3 UX plan is marked complete, and the 0.11.0 preferences/Progress plan shipped in PR #26. Rather than invent work — which would violate both the session rules ("stop instead of making speculative changes") and the global compute-efficiency rules (no need-satisfying work to justify) — this run wrote a handoff capturing the state and exited. See `docs/handoff/handoff.md` for the decision options presented back to the user.
